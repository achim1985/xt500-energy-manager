"""Production runtime for the XT500 Energy Manager."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from datetime import UTC, datetime, time, timedelta
import logging
from time import monotonic
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import Event, HomeAssistant, State, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import (
    async_call_later,
    async_track_state_change_event,
    async_track_time_change,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    CONF_BATTERY_INPUT_POWER_ENTITY,
    CONF_BATTERY_OUTPUT_POWER_ENTITY,
    CONF_GRID_PORT_POWER_ENTITY,
    CONF_GRID_POWER_ENTITY,
    CONF_GRID_SETPOINT_ENTITY,
    CONF_INVERTER_SETPOINT_ENTITY,
    CONF_LOAD_PORT_POWER_ENTITY,
    CONF_MAX_CHARGE_SOC_ENTITY,
    CONF_MIN_DISCHARGE_SOC_ENTITY,
    CONF_METER_SIGN,
    CONF_PV_POWER_ENTITY,
    CONF_SOC_ENTITY,
    DEFAULT_SETTINGS,
    DOMAIN,
    INPUT_LABELS,
    METER_EXPORT_POSITIVE,
    SETTING_AUTO_ENABLED,
    SETTING_AUTO_MODE,
    SETTING_AUTO_TARGET_SOC,
    SETTING_AUTOMATIC_RECOVERY_ENABLED,
    SETTING_BASE_MODE,
    SETTING_CHARGE_POWER,
    SETTING_CONTROL_FAST_INTERVAL,
    SETTING_CONTROL_LARGE_ERROR,
    SETTING_CONTROL_LARGE_MAX_STEP,
    SETTING_CONTROL_MEDIUM_INTERVAL,
    SETTING_CONTROL_MEDIUM_MAX_STEP,
    SETTING_CONTROL_SMALL_ERROR,
    SETTING_CONTROL_SMALL_MAX_STEP,
    SETTING_CONTROL_SLOW_INTERVAL,
    SETTING_CYCLE_REFERENCE,
    SETTING_CYCLE_AUTOMATIC_ACTIVE,
    SETTING_CYCLE_CHECK_TIME,
    SETTING_CYCLE_INTERVAL_DAYS,
    SETTING_CYCLE_MANUAL_ACTIVE,
    SETTING_FEEDBACK_SETTLE_TIME,
    SETTING_LAST_FULL,
    SETTING_MANUAL_ACTIVE,
    SETTING_MANUAL_MODE,
    SETTING_MAX_GRID_OUTPUT,
    SETTING_MAX_INVERTER_OUTPUT,
    SETTING_MIN_SOC,
    SETTING_NORMAL_CHARGE_LIMIT,
    SETTING_PV_START_DELAY,
    SETTING_PV_START_POWER,
    SETTING_PV_STOP_POWER,
    SETTING_RECOVERY_STABILITY_TIME,
    SETTING_REGULATION_ENABLED,
    SETTING_SOC_HYSTERESIS,
    SETTING_TARGET_GRID_POWER,
    SETTING_TARGET_SOC,
    SETTING_TARIFF_ACTIVE,
    SETTING_TARIFF_CHARGE_POWER,
    SETTING_TARIFF_EXPIRES_AT,
    SETTING_TARIFF_REQUEST_DURATION,
    SETTING_TARIFF_TARGET_SOC,
)
from .controller import (
    AdaptiveControlProfile,
    ControlInput,
    ControlResult,
    ControlSettings,
    calculate_control,
    cycle_is_due,
    feedback_samples_are_fresh,
    limit_setpoint_change,
    net_battery_flows,
    next_cycle_check_at,
    overall_control_error,
    RECOVERY_DELAY_MULTIPLIERS,
    recovery_delay_seconds,
    select_adaptive_control_profile,
    select_charge_limit,
    select_charge_request,
    update_pv_release,
    WRITE_RETRY_DELAY_MULTIPLIERS,
    write_retry_delay_seconds,
)

_LOGGER = logging.getLogger(__name__)
_STARTUP_STABILITY_SECONDS = 5.0
_COMMUNICATION_STABILITY_SECONDS = 15.0
_COMMUNICATION_FAILURE_SECONDS = 90.0
_RECOVERY_FEEDBACK_TIMEOUT_SECONDS = 30.0
_WRITE_MAX_ATTEMPTS = len(WRITE_RETRY_DELAY_MULTIPLIERS) + 1


class TransientCommunicationError(HomeAssistantError):
    """Signal a temporary loss of readable XT500 entities."""


class XT500Runtime:
    """Own and apply one XT500 controller configuration."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.settings: dict[str, Any] = dict(DEFAULT_SETTINGS)
        self.result: ControlResult | None = None
        self.data_valid = False
        self.charge_request_active = False
        self.active_target_soc: float | None = None
        self.desired_charge_limit: float | None = None
        self.invalid_entities: list[str] = []
        self.invalid_inputs: list[dict[str, str]] = []
        self.last_invalid_inputs: list[dict[str, str]] = []
        self.last_invalid_at: str | None = None
        self.last_inputs_recovered_at: str | None = None
        self.control_error_message: str | None = None
        self.last_control_write: str | None = None
        self.last_recovery_success: str | None = None
        self.last_transient_write_error: str | None = None
        self.last_transient_write_recovery: str | None = None
        self.transient_write_timeouts = 0
        self.communication_pause_message: str | None = None

        self._data_valid_since_monotonic: float | None = None
        self._ha_started = hass.is_running
        self._write_blocked = False
        self._communication_pause_active = False
        self._communication_pause_at: datetime | None = None
        self._communication_pause_started_monotonic: float | None = None
        self._communication_stable_since_monotonic: float | None = None
        self._communication_pause_task: asyncio.Task | None = None
        self._control_error_at: datetime | None = None
        self._recovery_attempts = 0
        self._recovery_status = "ready"
        self._recovery_stable_since_monotonic: float | None = None
        self._next_recovery_attempt: str | None = None
        self._recovery_task: asyncio.Task | None = None
        self._full_soc_latched = False
        self._low_soc_hold = False
        self._listeners: set[Callable[[], None]] = set()
        self._unsub_state: Callable[[], None] | None = None
        self._unsub_started: Callable[[], None] | None = None
        self._unsub_cycle_check: Callable[[], None] | None = None
        self._unsub_tariff_expiry: Callable[[], None] | None = None
        self._control_apply_task: asyncio.Task | None = None
        self._startup_ready_task: asyncio.Task | None = None
        self._control_apply_requested = False
        self._last_control_apply_monotonic = 0.0
        self._last_control_write_at: datetime | None = None
        self._pv_release_active = False
        self._pv_above_start_since: float | None = None
        self._pv_release_due_monotonic: float | None = None
        self._pv_release_task: asyncio.Task | None = None
        self._store = Store(hass, 1, f"{DOMAIN}.{entry.entry_id}")

    @property
    def source_entities(self) -> list[str]:
        """Return every configured source observed by this controller."""
        entities = [
            entity_id
            for key in (
                CONF_SOC_ENTITY,
                CONF_PV_POWER_ENTITY,
                CONF_GRID_POWER_ENTITY,
                CONF_GRID_PORT_POWER_ENTITY,
                CONF_LOAD_PORT_POWER_ENTITY,
                CONF_GRID_SETPOINT_ENTITY,
                CONF_INVERTER_SETPOINT_ENTITY,
                CONF_MAX_CHARGE_SOC_ENTITY,
                CONF_MIN_DISCHARGE_SOC_ENTITY,
                CONF_BATTERY_INPUT_POWER_ENTITY,
                CONF_BATTERY_OUTPUT_POWER_ENTITY,
            )
            if (entity_id := self.entry.data.get(key))
        ]
        return list(dict.fromkeys(entities))

    async def async_start(self) -> None:
        """Restore settings and begin production observation."""
        stored = await self._store.async_load()
        migrated = False
        if isinstance(stored, dict):
            self.settings.update(
                {key: stored[key] for key in DEFAULT_SETTINGS if key in stored}
            )
            if (
                SETTING_FEEDBACK_SETTLE_TIME not in stored
                and "live_write_interval" in stored
            ):
                self.settings[SETTING_FEEDBACK_SETTLE_TIME] = stored[
                    "live_write_interval"
                ]
                migrated = True
            if (
                SETTING_CONTROL_LARGE_MAX_STEP not in stored
                and "live_max_step" in stored
            ):
                self.settings[SETTING_CONTROL_LARGE_MAX_STEP] = stored[
                    "live_max_step"
                ]
                migrated = True

        charge_limit_entity = self.entry.data.get(CONF_MAX_CHARGE_SOC_ENTITY)
        if (
            (not isinstance(stored, dict) or SETTING_NORMAL_CHARGE_LIMIT not in stored)
            and charge_limit_entity
            and (current_limit := self._float_state(charge_limit_entity)) is not None
        ):
            self.settings[SETTING_NORMAL_CHARGE_LIMIT] = current_limit
            migrated = True

        if (
            bool(self.settings[SETTING_AUTO_ENABLED])
            and self._setting_datetime(SETTING_LAST_FULL) is None
            and self._setting_datetime(SETTING_CYCLE_REFERENCE) is None
        ):
            self.settings[SETTING_CYCLE_REFERENCE] = dt_util.now().isoformat()
            migrated = True

        if self._automatic_cycle_should_start_now():
            self.settings[SETTING_CYCLE_AUTOMATIC_ACTIVE] = True
            migrated = True

        if not self._tariff_request_is_valid():
            if bool(self.settings[SETTING_TARIFF_ACTIVE]) or self.settings.get(
                SETTING_TARIFF_EXPIRES_AT
            ) is not None:
                self.settings[SETTING_TARIFF_ACTIVE] = False
                self.settings[SETTING_TARIFF_EXPIRES_AT] = None
                migrated = True

        if migrated:
            await self._store.async_save(self.settings)

        self._schedule_cycle_check()
        self._schedule_tariff_expiry()
        self._unsub_state = async_track_state_change_event(
            self.hass, self.source_entities, self._async_state_changed
        )
        if not self._ha_started:
            self._unsub_started = self.hass.bus.async_listen_once(
                EVENT_HOMEASSISTANT_STARTED, self._async_home_assistant_started
            )
        self.async_calculate()
        self._schedule_startup_readiness()

    async def async_stop(self) -> None:
        """Stop all observation and writes without controlling external automations."""
        self._control_apply_requested = False
        pending_tasks = [
            task
            for task in (
                self._control_apply_task,
                self._startup_ready_task,
                self._pv_release_task,
                self._recovery_task,
                self._communication_pause_task,
            )
            if task is not None and not task.done()
        ]
        for task in pending_tasks:
            task.cancel()
        if pending_tasks:
            await asyncio.gather(*pending_tasks, return_exceptions=True)
        self._control_apply_task = None
        self._startup_ready_task = None
        self._pv_release_task = None
        self._recovery_task = None
        self._communication_pause_task = None
        if self._unsub_started:
            self._unsub_started()
            self._unsub_started = None
        if self._unsub_state:
            self._unsub_state()
            self._unsub_state = None
        if self._unsub_cycle_check:
            self._unsub_cycle_check()
            self._unsub_cycle_check = None
        if self._unsub_tariff_expiry:
            self._unsub_tariff_expiry()
            self._unsub_tariff_expiry = None

    @callback
    def _async_home_assistant_started(self, _event: Event) -> None:
        """Open the startup gate only after Home Assistant completed startup."""
        self._unsub_started = None
        self._ha_started = True
        self._data_valid_since_monotonic = monotonic() if self.data_valid else None
        self.async_calculate()
        self._schedule_startup_readiness()

    @callback
    def _schedule_startup_readiness(self) -> None:
        """Re-evaluate after inputs remained valid for the startup safety delay."""
        if (
            not self._ha_started
            or not self.data_valid
            or not self.regulation_enabled
            or self._write_blocked
            or self.control_ready
        ):
            return
        if self._startup_ready_task is None or self._startup_ready_task.done():
            self._startup_ready_task = self.hass.async_create_task(
                self._async_wait_until_ready()
            )

    async def _async_wait_until_ready(self) -> None:
        try:
            while (
                self._ha_started
                and self.data_valid
                and self.regulation_enabled
                and not self._write_blocked
                and not self.control_ready
            ):
                await asyncio.sleep(1)
            self.async_calculate()
        except asyncio.CancelledError:
            raise
        finally:
            self._startup_ready_task = None

    @callback
    def _async_state_changed(self, _event: Event) -> None:
        self.async_calculate()

    def _float_state(self, entity_id: str) -> float | None:
        state: State | None = self.hass.states.get(entity_id)
        if state is None or state.state in ("unknown", "unavailable", "none", ""):
            return None
        try:
            return float(state.state)
        except ValueError:
            return None

    def _input_issue(self, key: str, entity_id: str | None) -> dict[str, str] | None:
        """Describe why a required input cannot currently be used."""
        label = INPUT_LABELS.get(key, key)
        if not entity_id:
            return {
                "input": label,
                "entity_id": "",
                "state": "",
                "reason": "Nicht eingerichtet",
            }
        state: State | None = self.hass.states.get(entity_id)
        if state is None:
            return {
                "input": label,
                "entity_id": entity_id,
                "state": "",
                "reason": "Entität nicht gefunden",
            }
        if state.state == "unavailable":
            reason = "Entität nicht verfügbar"
        elif state.state == "unknown":
            reason = "Noch kein gültiger Messwert"
        elif state.state in ("none", ""):
            reason = "Messwert ist leer"
        else:
            try:
                float(state.state)
                return None
            except ValueError:
                reason = "Messwert ist keine Zahl"
        return {
            "input": label,
            "entity_id": entity_id,
            "state": state.state,
            "reason": reason,
        }

    @callback
    def async_calculate(self) -> None:
        """Calculate and, when ready, schedule production setpoint writes."""
        values: dict[str, float] = {}
        was_data_valid = self.data_valid
        previous_signature = tuple(
            (issue["input"], issue["entity_id"], issue["state"], issue["reason"])
            for issue in self.invalid_inputs
        )
        self.invalid_entities = []
        self.invalid_inputs = []
        for key in (
            CONF_SOC_ENTITY,
            CONF_PV_POWER_ENTITY,
            CONF_GRID_POWER_ENTITY,
            CONF_GRID_PORT_POWER_ENTITY,
            CONF_LOAD_PORT_POWER_ENTITY,
            CONF_GRID_SETPOINT_ENTITY,
            CONF_INVERTER_SETPOINT_ENTITY,
            CONF_MAX_CHARGE_SOC_ENTITY,
            CONF_MIN_DISCHARGE_SOC_ENTITY,
        ):
            entity_id = self.entry.data.get(key)
            issue = self._input_issue(key, entity_id)
            if issue is not None:
                self.invalid_entities.append(entity_id or f"missing:{key}")
                self.invalid_inputs.append(issue)
                continue
            values[key] = self._float_state(entity_id)

        self.data_valid = not self.invalid_entities
        if not self.data_valid:
            signature = tuple(
                (issue["input"], issue["entity_id"], issue["state"], issue["reason"])
                for issue in self.invalid_inputs
            )
            if signature != previous_signature:
                self.last_invalid_inputs = [dict(issue) for issue in self.invalid_inputs]
                self.last_invalid_at = datetime.now(UTC).isoformat()
                if (
                    self._ha_started
                    and (
                        was_data_valid
                        or self.result is not None
                        or self._communication_pause_active
                    )
                ):
                    _LOGGER.warning(
                        "XT500 input data invalid: %s",
                        "; ".join(
                            f"{issue['input']} ({issue['entity_id'] or 'nicht eingerichtet'}): "
                            f"{issue['reason']} [{issue['state'] or '-'}]"
                            for issue in self.invalid_inputs
                        ),
                    )
            if (
                self.regulation_enabled
                and self._ha_started
                and (self.result is not None or self._communication_pause_active)
            ):
                self._begin_communication_pause(
                    TransientCommunicationError(
                        "XT500-Eingangsdaten vorübergehend nicht lesbar"
                    )
                )
            self._data_valid_since_monotonic = None
            self._recovery_stable_since_monotonic = None
            self._next_recovery_attempt = None
            self._cancel_pv_release_timer()
            self._pv_release_active = False
            self._pv_above_start_since = None
            self.result = None
            self.charge_request_active = False
            self.active_target_soc = None
            self.desired_charge_limit = None
            self._control_apply_requested = False
            self._schedule_recovery()
            self._notify()
            return

        if not was_data_valid and self.last_invalid_at is not None:
            self.last_inputs_recovered_at = datetime.now(UTC).isoformat()
            _LOGGER.info("XT500 input data is valid again")
        if self._data_valid_since_monotonic is None:
            self._data_valid_since_monotonic = monotonic()
        self._update_full_charge(values[CONF_SOC_ENTITY])

        if not self.regulation_enabled:
            self._cancel_recovery_task()
            self._recovery_status = "disabled"
            self._cancel_pv_release_timer()
            self._pv_release_active = False
            self._pv_above_start_since = None
            self.result = None
            self.charge_request_active = False
            self.active_target_soc = None
            self.desired_charge_limit = None
            self._control_apply_requested = False
            self._notify()
            return

        self._update_pv_release(values[CONF_PV_POWER_ENTITY])

        manual_active = bool(self.settings[SETTING_MANUAL_ACTIVE])
        manual_target = float(self.settings[SETTING_TARGET_SOC])
        if manual_active and values[CONF_SOC_ENTITY] >= manual_target:
            self.settings[SETTING_MANUAL_ACTIVE] = False
            self._store.async_delay_save(lambda: self.settings, 1)
            manual_active = False

        manual_cycle_active = self.manual_cycle_requested
        automatic_cycle_active = self.automatic_cycle_requested
        tariff_active = self.tariff_request_active
        tariff_target = float(self.settings[SETTING_TARIFF_TARGET_SOC])
        if tariff_active and values[CONF_SOC_ENTITY] >= tariff_target:
            self.settings[SETTING_TARIFF_ACTIVE] = False
            self.settings[SETTING_TARIFF_EXPIRES_AT] = None
            self._cancel_tariff_expiry()
            self._store.async_delay_save(lambda: self.settings, 1)
            tariff_active = False

        charge_request = select_charge_request(
            manual_active=manual_active,
            manual_cycle_active=manual_cycle_active,
            automatic_cycle_active=automatic_cycle_active,
            tariff_active=tariff_active,
            manual_mode=self.settings[SETTING_MANUAL_MODE],
            cycle_mode=self.settings[SETTING_AUTO_MODE],
            manual_target_soc=float(self.settings[SETTING_TARGET_SOC]),
            cycle_target_soc=float(self.settings[SETTING_AUTO_TARGET_SOC]),
            tariff_target_soc=float(self.settings[SETTING_TARIFF_TARGET_SOC]),
            charge_power=float(self.settings[SETTING_CHARGE_POWER]),
            tariff_charge_power=float(self.settings[SETTING_TARIFF_CHARGE_POWER]),
        )
        self.charge_request_active = charge_request.active
        self.active_target_soc = (
            charge_request.target_soc if charge_request.active else None
        )

        charge_limit_state = self.hass.states.get(
            self.entry.data[CONF_MAX_CHARGE_SOC_ENTITY]
        )
        self.desired_charge_limit = select_charge_limit(
            normal_limit=float(self.settings[SETTING_NORMAL_CHARGE_LIMIT]),
            target_soc=charge_request.target_soc,
            charge_active=charge_request.active,
            low=float(charge_limit_state.attributes.get("min", 0)),
            high=float(charge_limit_state.attributes.get("max", 100)),
            step=float(charge_limit_state.attributes.get("step", 1) or 1),
        )

        minimum_soc = values[CONF_MIN_DISCHARGE_SOC_ENTITY]
        if float(self.settings[SETTING_MIN_SOC]) != minimum_soc:
            self.settings[SETTING_MIN_SOC] = minimum_soc
            self._store.async_delay_save(lambda: self.settings, 1)
        hysteresis = float(self.settings[SETTING_SOC_HYSTERESIS])
        if values[CONF_SOC_ENTITY] <= minimum_soc:
            self._low_soc_hold = True
        elif values[CONF_SOC_ENTITY] >= minimum_soc + hysteresis:
            self._low_soc_hold = False

        self.result = calculate_control(
            ControlInput(
                soc=values[CONF_SOC_ENTITY],
                pv_power=values[CONF_PV_POWER_ENTITY],
                grid_power=values[CONF_GRID_POWER_ENTITY],
                grid_port_power=values[CONF_GRID_PORT_POWER_ENTITY],
                load_port_power=values[CONF_LOAD_PORT_POWER_ENTITY],
                current_grid_setpoint=values[CONF_GRID_SETPOINT_ENTITY],
                current_inverter_setpoint=values[CONF_INVERTER_SETPOINT_ENTITY],
            ),
            ControlSettings(
                charge_active=charge_request.active,
                charge_source=charge_request.source,
                charge_mode=charge_request.mode,
                base_mode=self.settings[SETTING_BASE_MODE],
                target_soc=charge_request.target_soc,
                minimum_soc=minimum_soc,
                soc_hysteresis=hysteresis,
                discharge_hold=self._low_soc_hold,
                charge_power=charge_request.charge_power,
                target_grid_power=float(self.settings[SETTING_TARGET_GRID_POWER]),
                grid_limit=float(self.settings[SETTING_MAX_GRID_OUTPUT]),
                inverter_limit=float(self.settings[SETTING_MAX_INVERTER_OUTPUT]),
                meter_export_positive=(
                    self.entry.data[CONF_METER_SIGN] == METER_EXPORT_POSITIVE
                ),
                pv_release_allowed=self._pv_release_active,
            ),
        )
        if self.control_ready:
            self._request_control_apply()
        elif self._write_blocked:
            self._schedule_recovery()
        else:
            self._schedule_startup_readiness()
        self._notify()

    @callback
    def _update_full_charge(self, soc: float) -> None:
        """Record one full-charge event when SOC crosses the automatic target."""
        target = float(self.settings[SETTING_AUTO_TARGET_SOC])
        if soc >= target:
            changed = False
            if not self._full_soc_latched:
                timestamp = dt_util.now().isoformat()
                self.settings[SETTING_LAST_FULL] = timestamp
                self.settings[SETTING_CYCLE_REFERENCE] = timestamp
                self._full_soc_latched = True
                changed = True
            if bool(self.settings[SETTING_CYCLE_MANUAL_ACTIVE]) or bool(
                self.settings[SETTING_CYCLE_AUTOMATIC_ACTIVE]
            ):
                self.settings[SETTING_CYCLE_MANUAL_ACTIVE] = False
                self.settings[SETTING_CYCLE_AUTOMATIC_ACTIVE] = False
                changed = True
            if changed:
                self._store.async_delay_save(lambda: self.settings, 1)
        elif soc < target - 1:
            self._full_soc_latched = False

    @property
    def cycle_due(self) -> bool:
        """Return whether the configured full-charge interval has elapsed."""
        return cycle_is_due(
            now=dt_util.now(),
            last_full=self._setting_datetime(SETTING_LAST_FULL),
            cycle_reference=self._setting_datetime(SETTING_CYCLE_REFERENCE),
            interval_days=float(self.settings[SETTING_CYCLE_INTERVAL_DAYS]),
        )

    def _setting_datetime(self, key: str) -> datetime | None:
        """Parse one persisted scheduling timestamp."""
        value = self.settings.get(key)
        if not isinstance(value, str):
            return None
        return dt_util.parse_datetime(value)

    def _tariff_request_is_valid(self) -> bool:
        """Return whether the external tariff request is active and unexpired."""
        expires_at = self._setting_datetime(SETTING_TARIFF_EXPIRES_AT)
        return bool(self.settings[SETTING_TARIFF_ACTIVE]) and (
            expires_at is not None and expires_at > dt_util.now()
        )

    @property
    def tariff_request_active(self) -> bool:
        """Return whether a valid tariff charge request currently exists."""
        return self._tariff_request_is_valid()

    @property
    def tariff_expires_datetime(self) -> datetime | None:
        """Return the current tariff-request expiry for dashboard display."""
        if not self.tariff_request_active:
            return None
        return self._setting_datetime(SETTING_TARIFF_EXPIRES_AT)

    @callback
    def _cancel_tariff_expiry(self) -> None:
        if self._unsub_tariff_expiry:
            self._unsub_tariff_expiry()
            self._unsub_tariff_expiry = None

    @callback
    def _schedule_tariff_expiry(self) -> None:
        """Stop an external tariff request when its safety window ends."""
        self._cancel_tariff_expiry()
        expires_at = self._setting_datetime(SETTING_TARIFF_EXPIRES_AT)
        if not self.tariff_request_active or expires_at is None:
            return
        delay = max((expires_at - dt_util.now()).total_seconds(), 0.0)
        self._unsub_tariff_expiry = async_call_later(
            self.hass, delay, self._async_tariff_expired
        )

    @callback
    def _async_tariff_expired(self, _now: datetime) -> None:
        self._unsub_tariff_expiry = None
        self.settings[SETTING_TARIFF_ACTIVE] = False
        self.settings[SETTING_TARIFF_EXPIRES_AT] = None
        self._store.async_delay_save(lambda: self.settings, 1)
        self.async_calculate()

    @callback
    def async_set_tariff_active(self, active: bool) -> None:
        """Set or refresh the externally controlled tariff charge request."""
        self.settings[SETTING_TARIFF_ACTIVE] = active
        self.settings[SETTING_TARIFF_EXPIRES_AT] = (
            (
                dt_util.now()
                + timedelta(
                    minutes=max(
                        float(self.settings[SETTING_TARIFF_REQUEST_DURATION]), 1.0
                    )
                )
            ).isoformat()
            if active
            else None
        )
        self._schedule_tariff_expiry()
        self._store.async_delay_save(lambda: self.settings, 1)
        self.async_calculate()

    @property
    def next_cycle_at(self) -> str | None:
        """Return the next daily check at which a due cycle may start."""
        next_cycle = self.next_cycle_datetime
        return next_cycle.isoformat() if next_cycle is not None else None

    @property
    def next_cycle_datetime(self) -> datetime | None:
        """Return the next scheduled cycle check as a timezone-aware datetime."""
        baseline = self._setting_datetime(
            SETTING_LAST_FULL
        ) or self._setting_datetime(SETTING_CYCLE_REFERENCE)
        if baseline is None:
            return None
        return next_cycle_check_at(
            baseline=baseline,
            interval_days=float(self.settings[SETTING_CYCLE_INTERVAL_DAYS]),
            check_time=self.cycle_check_time,
        )

    def _battery_flows(self) -> tuple[float, float] | None:
        """Return actual net charge/discharge derived from original XT500 totals."""
        input_entity = self.entry.data.get(CONF_BATTERY_INPUT_POWER_ENTITY)
        output_entity = self.entry.data.get(CONF_BATTERY_OUTPUT_POWER_ENTITY)
        if not input_entity or not output_entity:
            return None
        input_power = self._float_state(input_entity)
        output_power = self._float_state(output_entity)
        if input_power is None or output_power is None:
            return None
        return net_battery_flows(input_power, output_power)

    @property
    def battery_charge_power(self) -> float | None:
        """Return actual net battery charging power."""
        flows = self._battery_flows()
        return flows[0] if flows is not None else None

    @property
    def battery_discharge_power(self) -> float | None:
        """Return actual net battery discharging power."""
        flows = self._battery_flows()
        return flows[1] if flows is not None else None

    @property
    def cycle_check_time(self) -> time:
        """Return the configured local daily cycle-check time."""
        value = self.settings.get(SETTING_CYCLE_CHECK_TIME)
        if isinstance(value, str):
            try:
                return time.fromisoformat(value)
            except ValueError:
                pass
        return time(hour=12)

    @callback
    def _schedule_cycle_check(self) -> None:
        """Schedule the persistent local-time daily cycle check."""
        if self._unsub_cycle_check:
            self._unsub_cycle_check()
        check_time = self.cycle_check_time
        self._unsub_cycle_check = async_track_time_change(
            self.hass,
            self._async_cycle_check,
            hour=check_time.hour,
            minute=check_time.minute,
            second=check_time.second,
        )

    @callback
    def _async_cycle_check(self, _now: datetime) -> None:
        """Start one due automatic cycle at the configured daily check."""
        if not self._activate_automatic_cycle_if_due():
            return
        self._store.async_delay_save(lambda: self.settings, 1)
        self.async_calculate()

    def _automatic_cycle_should_start_now(self) -> bool:
        """Return whether the first eligible daily check has already passed."""
        if (
            not bool(self.settings[SETTING_AUTO_ENABLED])
            or bool(self.settings[SETTING_CYCLE_MANUAL_ACTIVE])
            or bool(self.settings[SETTING_CYCLE_AUTOMATIC_ACTIVE])
            or not self.cycle_due
        ):
            return False
        baseline = self._setting_datetime(
            SETTING_LAST_FULL
        ) or self._setting_datetime(SETTING_CYCLE_REFERENCE)
        if baseline is None:
            return False
        scheduled = next_cycle_check_at(
            baseline=baseline,
            interval_days=float(self.settings[SETTING_CYCLE_INTERVAL_DAYS]),
            check_time=self.cycle_check_time,
        )
        return dt_util.now() >= scheduled

    @callback
    def _activate_automatic_cycle_if_due(self) -> bool:
        """Latch one automatic cycle when monitoring is enabled and due."""
        if (
            not bool(self.settings[SETTING_AUTO_ENABLED])
            or bool(self.settings[SETTING_CYCLE_MANUAL_ACTIVE])
            or bool(self.settings[SETTING_CYCLE_AUTOMATIC_ACTIVE])
            or not self.cycle_due
        ):
            return False
        self.settings[SETTING_CYCLE_AUTOMATIC_ACTIVE] = True
        return True

    @property
    def manual_cycle_requested(self) -> bool:
        """Return whether a manually started cycle currently requests charging."""
        return self.regulation_enabled and bool(
            self.settings[SETTING_CYCLE_MANUAL_ACTIVE]
        )

    @property
    def automatic_cycle_requested(self) -> bool:
        """Return whether the integration currently requests an automatic cycle."""
        return self.regulation_enabled and bool(
            self.settings[SETTING_CYCLE_AUTOMATIC_ACTIVE]
        )

    @property
    def cycle_charge_active(self) -> bool:
        """Return whether a cycle request is actively controlling the battery."""
        return (
            self.data_valid
            and not bool(self.settings[SETTING_MANUAL_ACTIVE])
            and (self.manual_cycle_requested or self.automatic_cycle_requested)
        )

    @property
    def cycle_state(self) -> str:
        """Return an explicit monitoring-versus-charging cycle state."""
        manual = bool(self.settings[SETTING_CYCLE_MANUAL_ACTIVE])
        automatic = bool(self.settings[SETTING_CYCLE_AUTOMATIC_ACTIVE])
        if manual or automatic:
            if (
                not self.regulation_enabled
                or not self.data_valid
                or bool(self.settings[SETTING_MANUAL_ACTIVE])
            ):
                return "paused"
            return "manual_active" if manual else "automatic_active"
        if not bool(self.settings[SETTING_AUTO_ENABLED]):
            return "monitoring_disabled"
        if self.cycle_due:
            return "due_waiting"
        return "monitoring"

    @property
    def regulation_enabled(self) -> bool:
        """Return whether this production controller is enabled."""
        return bool(self.settings[SETTING_REGULATION_ENABLED])

    @property
    def automatic_recovery_enabled(self) -> bool:
        """Return whether a latched write error may recover automatically."""
        return bool(self.settings[SETTING_AUTOMATIC_RECOVERY_ENABLED])

    @property
    def recovery_status(self) -> str:
        """Return the current automatic-recovery state."""
        if not self.regulation_enabled:
            return "disabled"
        if not self._write_blocked:
            return "ready"
        if not self.automatic_recovery_enabled:
            return "manual_required"
        return self._recovery_status

    @property
    def recovery_attempts(self) -> int:
        """Return the number of automatic attempts in the current error episode."""
        return self._recovery_attempts

    @property
    def recovery_max_attempts(self) -> int:
        """Return the fixed safety limit for automatic recovery attempts."""
        return len(RECOVERY_DELAY_MULTIPLIERS)

    @property
    def next_recovery_attempt(self) -> str | None:
        """Return the scheduled automatic recovery time, if any."""
        return self._next_recovery_attempt

    @property
    def control_ready(self) -> bool:
        """Return whether production writes are currently permitted."""
        return (
            self.regulation_enabled
            and self._ha_started
            and self.data_valid
            and self.result is not None
            and not self._write_blocked
            and not self._communication_pause_active
            and self._data_valid_since_monotonic is not None
            and monotonic() - self._data_valid_since_monotonic
            >= _STARTUP_STABILITY_SECONDS
        )

    @property
    def display_status(self) -> str:
        """Return the user-facing production state."""
        if not self.regulation_enabled:
            return "disabled"
        if self._communication_pause_active:
            return "communication_pause"
        if not self.data_valid or self.result is None:
            return "invalid_data"
        if self._write_blocked:
            return "control_error"
        if not self.control_ready:
            return "starting"
        return self.result.status

    @property
    def pv_release_active(self) -> bool:
        """Return whether PV-surplus output is released above the hysteresis."""
        return self._pv_release_active

    @callback
    def _update_pv_release(self, pv_power: float) -> None:
        """Update low-PV lockout and maintain its continuous-start timer."""
        now = monotonic()
        decision = update_pv_release(
            active=self._pv_release_active,
            pv_power=pv_power,
            stop_power=float(self.settings[SETTING_PV_STOP_POWER]),
            start_power=float(self.settings[SETTING_PV_START_POWER]),
            start_delay=float(self.settings[SETTING_PV_START_DELAY]),
            above_start_since=self._pv_above_start_since,
            now=now,
        )
        self._pv_release_active = decision.active
        self._pv_above_start_since = decision.above_start_since

        if decision.remaining_delay is None:
            self._cancel_pv_release_timer()
            return

        due = now + decision.remaining_delay
        if (
            self._pv_release_task is not None
            and not self._pv_release_task.done()
            and self._pv_release_due_monotonic is not None
            and abs(self._pv_release_due_monotonic - due) < 0.1
        ):
            return
        self._cancel_pv_release_timer()
        self._pv_release_due_monotonic = due
        self._pv_release_task = self.hass.async_create_task(
            self._async_pv_release_wait(decision.remaining_delay)
        )

    async def _async_pv_release_wait(self, delay: float) -> None:
        try:
            await asyncio.sleep(delay)
        except asyncio.CancelledError:
            return
        self._pv_release_task = None
        self._pv_release_due_monotonic = None
        self.async_calculate()

    @callback
    def _cancel_pv_release_timer(self) -> None:
        if self._pv_release_task is not None and not self._pv_release_task.done():
            self._pv_release_task.cancel()
        self._pv_release_task = None
        self._pv_release_due_monotonic = None

    @property
    def control_error(self) -> float:
        """Return the largest deviation used for adaptive control."""
        if self.result is None:
            return 0.0
        current_grid = self._float_state(self.entry.data[CONF_GRID_SETPOINT_ENTITY])
        current_inverter = self._float_state(
            self.entry.data[CONF_INVERTER_SETPOINT_ENTITY]
        )
        if current_grid is None or current_inverter is None:
            return 0.0
        return overall_control_error(
            public_grid_power=self.result.normalized_grid_power,
            public_grid_target=float(self.settings[SETTING_TARGET_GRID_POWER]),
            current_grid_setpoint=current_grid,
            requested_grid_setpoint=self.result.recommended_grid_setpoint,
            current_inverter_setpoint=current_inverter,
            requested_inverter_setpoint=self.result.recommended_inverter_setpoint,
        )

    @property
    def control_profile(self) -> AdaptiveControlProfile:
        """Return the adaptive response band for the latest setpoints."""
        return select_adaptive_control_profile(
            self.control_error,
            small_error=float(self.settings[SETTING_CONTROL_SMALL_ERROR]),
            large_error=float(self.settings[SETTING_CONTROL_LARGE_ERROR]),
            slow_interval=float(self.settings[SETTING_CONTROL_SLOW_INTERVAL]),
            medium_interval=float(self.settings[SETTING_CONTROL_MEDIUM_INTERVAL]),
            fast_interval=float(self.settings[SETTING_CONTROL_FAST_INTERVAL]),
            small_maximum_change=float(
                self.settings[SETTING_CONTROL_SMALL_MAX_STEP]
            ),
            medium_maximum_change=float(
                self.settings[SETTING_CONTROL_MEDIUM_MAX_STEP]
            ),
            large_maximum_change=float(
                self.settings[SETTING_CONTROL_LARGE_MAX_STEP]
            ),
        )

    @property
    def effective_control_interval(self) -> float:
        """Return adaptive interval including feedback settling time."""
        return max(
            self.control_profile.interval,
            float(self.settings[SETTING_FEEDBACK_SETTLE_TIME]),
        )

    @property
    def feedback_ready(self) -> bool:
        """Return whether both feedback sources updated after the last setpoint write."""
        return feedback_samples_are_fresh(
            self._last_control_write_at,
            self._feedback_sample_times(),
        )

    def _feedback_sample_times(self) -> tuple[datetime | None, datetime | None]:
        """Return the newest report time for both controller feedback sources."""
        samples: list[datetime | None] = []
        for key in (CONF_GRID_POWER_ENTITY, CONF_GRID_PORT_POWER_ENTITY):
            state = self.hass.states.get(self.entry.data[key])
            if state is None:
                samples.append(None)
                continue
            samples.append(
                getattr(state, "last_reported", None) or state.last_updated
            )
        return samples[0], samples[1]

    @property
    def recovery_feedback_ready(self) -> bool:
        """Return whether both feedback sources reported after the last error."""
        return feedback_samples_are_fresh(
            self._control_error_at,
            self._feedback_sample_times(),
        )

    @property
    def recovery_feedback_current(self) -> bool:
        """Return whether both recovery feedback samples are still recent."""
        max_age = max(
            float(self.settings[SETTING_RECOVERY_STABILITY_TIME]) * 1.5,
            _RECOVERY_FEEDBACK_TIMEOUT_SECONDS,
        )
        now = datetime.now(UTC)
        return all(
            sample is not None
            and 0 <= (now - sample).total_seconds() <= max_age
            for sample in self._feedback_sample_times()
        )

    async def async_set_regulation_enabled(self, enabled: bool) -> None:
        """Enable or stop all production writes."""
        self._cancel_recovery_task()
        self._clear_communication_pause()
        self._recovery_stable_since_monotonic = None
        self._next_recovery_attempt = None
        self._recovery_attempts = 0
        if not enabled:
            self._control_apply_requested = False
            if self._control_apply_task and not self._control_apply_task.done():
                self._control_apply_task.cancel()
            self._last_control_write_at = None
            self._recovery_status = "disabled"
        else:
            self._write_blocked = False
            self._control_error_at = None
            self.control_error_message = None
            self._data_valid_since_monotonic = None
            self._recovery_status = "ready"
        self.settings[SETTING_REGULATION_ENABLED] = enabled
        await self._store.async_save(self.settings)
        self.async_calculate()

    @callback
    def _cancel_recovery_task(self) -> None:
        """Cancel a pending automatic recovery without touching the master switch."""
        if self._recovery_task is not None and not self._recovery_task.done():
            self._recovery_task.cancel()
        self._recovery_task = None
        self._next_recovery_attempt = None

    @callback
    def _request_control_apply(self) -> None:
        """Coalesce state changes into one adaptive, rate-limited write task."""
        if not self.control_ready:
            return
        self._control_apply_requested = True
        if self._control_apply_task is None or self._control_apply_task.done():
            self._control_apply_task = self.hass.async_create_task(
                self._async_control_apply_loop()
            )

    async def _async_control_apply_loop(self) -> None:
        try:
            while self._control_apply_requested and self.control_ready:
                self._control_apply_requested = False
                remaining = self.effective_control_interval - (
                    monotonic() - self._last_control_apply_monotonic
                )
                if remaining > 0:
                    await asyncio.sleep(remaining)
                if not self.control_ready:
                    return
                if not self.feedback_ready:
                    return
                await self._async_apply_control_result(
                    self.control_profile.maximum_change
                )
        except asyncio.CancelledError:
            raise
        except TransientCommunicationError as err:
            _LOGGER.warning(
                "XT500 communication interrupted; production writes paused: %s",
                self._error_detail(err),
            )
            self._begin_communication_pause(err)
        except Exception as err:
            _LOGGER.exception("XT500 production write failed")
            self._begin_control_error(err)
        finally:
            self._control_apply_task = None
            if self._control_apply_requested and self.control_ready:
                self._control_apply_task = self.hass.async_create_task(
                    self._async_control_apply_loop()
                )

    @staticmethod
    def _error_detail(err: Exception) -> str:
        """Return a useful error text even for exceptions such as TimeoutError."""
        detail = str(err).strip()
        return detail if detail else type(err).__name__

    @callback
    def _begin_control_error(self, err: Exception) -> None:
        """Latch a production write error and start the guarded recovery flow."""
        self._clear_communication_pause()
        self._write_blocked = True
        self._control_error_at = datetime.now(UTC)
        self.control_error_message = f"Schreibfehler: {self._error_detail(err)}"
        self._control_apply_requested = False
        self._recovery_attempts = 0
        self._recovery_stable_since_monotonic = None
        self._next_recovery_attempt = None
        self._recovery_status = (
            "waiting_feedback"
            if self.automatic_recovery_enabled
            else "manual_required"
        )
        self._cancel_recovery_task()
        self._schedule_recovery()
        self._notify()

    @property
    def communication_pause_active(self) -> bool:
        """Return whether writes wait for stable communication."""
        return self._communication_pause_active

    @property
    def communication_pause_since(self) -> str | None:
        """Return the beginning of the current communication pause."""
        return (
            self._communication_pause_at.isoformat()
            if self._communication_pause_at is not None
            else None
        )

    @callback
    def _begin_communication_pause(self, err: Exception) -> None:
        """Pause writes for a transient outage without latching immediately."""
        if self._write_blocked or not self.regulation_enabled:
            return
        if not self._communication_pause_active:
            self._communication_pause_active = True
            self._communication_pause_at = datetime.now(UTC)
            self._communication_pause_started_monotonic = monotonic()
            self._communication_stable_since_monotonic = None
        self.communication_pause_message = self._error_detail(err)
        self._control_apply_requested = False
        self._data_valid_since_monotonic = None
        if (
            self._communication_pause_task is None
            or self._communication_pause_task.done()
        ):
            self._communication_pause_task = self.hass.async_create_task(
                self._async_monitor_communication_pause()
            )
        self._notify()

    @callback
    def _clear_communication_pause(self) -> None:
        """Clear the transient pause and cancel its watchdog when appropriate."""
        task = self._communication_pause_task
        current_task = asyncio.current_task()
        if (
            task is not None
            and not task.done()
            and task is not current_task
        ):
            task.cancel()
        if task is not current_task:
            self._communication_pause_task = None
        self._communication_pause_active = False
        self._communication_pause_at = None
        self._communication_pause_started_monotonic = None
        self._communication_stable_since_monotonic = None
        self.communication_pause_message = None

    async def _async_monitor_communication_pause(self) -> None:
        """Resume after stable fresh feedback or hard-stop a long outage."""
        current_task = asyncio.current_task()
        try:
            while (
                self._communication_pause_active
                and self.regulation_enabled
                and not self._write_blocked
            ):
                now = monotonic()
                feedback_fresh = (
                    self._communication_pause_at is not None
                    and feedback_samples_are_fresh(
                        self._communication_pause_at,
                        self._feedback_sample_times(),
                    )
                )
                if self.data_valid and self.result is not None and feedback_fresh:
                    if self._communication_stable_since_monotonic is None:
                        self._communication_stable_since_monotonic = now
                    elif (
                        now - self._communication_stable_since_monotonic
                        >= _COMMUNICATION_STABILITY_SECONDS
                    ):
                        self._clear_communication_pause()
                        self._data_valid_since_monotonic = (
                            monotonic() - _STARTUP_STABILITY_SECONDS
                        )
                        self._notify()
                        self.async_calculate()
                        return
                else:
                    self._communication_stable_since_monotonic = None

                if (
                    self._communication_pause_started_monotonic is not None
                    and now - self._communication_pause_started_monotonic
                    >= _COMMUNICATION_FAILURE_SECONDS
                ):
                    self._begin_control_error(
                        HomeAssistantError(
                            "XT500-Kommunikation länger als "
                            f"{_COMMUNICATION_FAILURE_SECONDS:g} Sekunden "
                            "nicht stabil"
                        )
                    )
                    return
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            raise
        finally:
            if self._communication_pause_task is current_task:
                self._communication_pause_task = None

    @callback
    def _schedule_recovery(self) -> None:
        """Schedule one guarded recovery attempt after stable fresh feedback."""
        if not self._write_blocked:
            self._recovery_status = "ready"
            return
        if (
            self._recovery_status == "attempting"
            and self._recovery_task is not None
            and not self._recovery_task.done()
        ):
            return
        if not self.regulation_enabled:
            self._cancel_recovery_task()
            self._recovery_status = "disabled"
            return
        if not self.automatic_recovery_enabled:
            self._cancel_recovery_task()
            self._recovery_status = "manual_required"
            return
        if self._recovery_attempts >= self.recovery_max_attempts:
            self._cancel_recovery_task()
            self._recovery_status = "exhausted"
            return
        if (
            not self._ha_started
            or not self.data_valid
            or self.result is None
        ):
            self._cancel_recovery_task()
            self._recovery_stable_since_monotonic = None
            self._recovery_status = "waiting_inputs"
            return
        if (
            not self.recovery_feedback_ready
            or not self.recovery_feedback_current
        ):
            self._cancel_recovery_task()
            self._recovery_stable_since_monotonic = None
            self._recovery_status = "waiting_feedback"
            return

        now = monotonic()
        if self._recovery_stable_since_monotonic is None:
            self._recovery_stable_since_monotonic = now
        base_delay = max(
            float(self.settings[SETTING_RECOVERY_STABILITY_TIME]),
            1.0,
        )
        delay = recovery_delay_seconds(base_delay, self._recovery_attempts)
        if delay is None:
            self._recovery_status = "exhausted"
            return
        remaining = max(
            delay - (now - self._recovery_stable_since_monotonic),
            0.0,
        )
        self._recovery_status = "waiting_stable"
        self._next_recovery_attempt = (
            dt_util.now() + timedelta(seconds=remaining)
        ).isoformat()
        if self._recovery_task is None or self._recovery_task.done():
            self._recovery_task = self.hass.async_create_task(
                self._async_recovery_wait(remaining)
            )

    async def _async_recovery_wait(self, delay: float) -> None:
        """Wait out the stability/backoff period and run one write probe."""
        current_task = asyncio.current_task()
        try:
            if delay > 0:
                await asyncio.sleep(delay)
            if (
                not self._write_blocked
                or not self.regulation_enabled
                or not self.automatic_recovery_enabled
                or not self.data_valid
                or self.result is None
                or not self.recovery_feedback_ready
                or not self.recovery_feedback_current
            ):
                return
            await self._async_attempt_recovery()
        except asyncio.CancelledError:
            raise
        finally:
            if self._recovery_task is current_task:
                self._recovery_task = None
            if self._write_blocked:
                self._schedule_recovery()

    async def _async_attempt_recovery(self) -> None:
        """Probe the unchanged inverter value and require fresh feedback."""
        self._recovery_attempts += 1
        self._recovery_status = "attempting"
        self._next_recovery_attempt = None
        self._notify()

        try:
            probe_at = await self._async_probe_control_write()
            feedback_timeout = max(
                _RECOVERY_FEEDBACK_TIMEOUT_SECONDS,
                float(self.settings[SETTING_FEEDBACK_SETTLE_TIME]) * 3,
            )
            deadline = monotonic() + feedback_timeout
            while monotonic() < deadline:
                if not self.data_valid or self.result is None:
                    raise HomeAssistantError(
                        "Eingangsdaten während des Schreibtests ungültig"
                    )
                if feedback_samples_are_fresh(
                    probe_at,
                    self._feedback_sample_times(),
                ):
                    break
                await asyncio.sleep(1)
            else:
                raise HomeAssistantError(
                    "Keine neuen Messrückmeldungen nach dem Schreibtest"
                )
        except asyncio.CancelledError:
            raise
        except Exception as err:
            _LOGGER.warning(
                "XT500 automatic recovery attempt %s/%s failed: %s",
                self._recovery_attempts,
                self.recovery_max_attempts,
                self._error_detail(err),
            )
            self._control_error_at = datetime.now(UTC)
            self.control_error_message = (
                "Automatische Wiederherstellung "
                f"{self._recovery_attempts}/{self.recovery_max_attempts} "
                f"fehlgeschlagen: {self._error_detail(err)}"
            )
            self._recovery_stable_since_monotonic = None
            self._recovery_status = (
                "exhausted"
                if self._recovery_attempts >= self.recovery_max_attempts
                else "waiting_feedback"
            )
            self._notify()
            return

        self._write_blocked = False
        self._control_error_at = None
        self.control_error_message = None
        self._recovery_stable_since_monotonic = None
        self._next_recovery_attempt = None
        self._recovery_status = "ready"
        self.last_recovery_success = dt_util.now().isoformat()
        self._data_valid_since_monotonic = (
            monotonic() - _STARTUP_STABILITY_SECONDS
        )
        self._notify()
        self.async_calculate()

    async def _async_probe_control_write(self) -> datetime:
        """Write the current inverter value unchanged as a harmless reachability probe."""
        inverter_entity = self.entry.data[CONF_INVERTER_SETPOINT_ENTITY]
        current = self._float_state(inverter_entity)
        if current is None:
            raise HomeAssistantError(
                f"Sollwert nicht lesbar: {inverter_entity}"
            )
        await self.hass.services.async_call(
            "number",
            "set_value",
            {"value": current},
            blocking=True,
            target={"entity_id": inverter_entity},
        )
        probe_at = datetime.now(UTC)
        self._last_control_write_at = probe_at
        self.last_control_write = dt_util.now().isoformat()
        self._notify()
        return probe_at

    async def _async_apply_control_result(self, maximum_change: float) -> None:
        """Write charge limit, inverter ceiling, and grid setpoint."""
        if not self.control_ready or self.result is None:
            return

        charge_limit_entity = self.entry.data[CONF_MAX_CHARGE_SOC_ENTITY]
        inverter_entity = self.entry.data[CONF_INVERTER_SETPOINT_ENTITY]
        grid_entity = self.entry.data[CONF_GRID_SETPOINT_ENTITY]
        inverter_target = self._limited_entity_target(
            inverter_entity,
            self.result.recommended_inverter_setpoint,
            maximum_change,
        )
        grid_target = self._limited_entity_target(
            grid_entity,
            self.result.recommended_grid_setpoint,
            maximum_change,
        )

        setpoint_wrote = False
        wrote = False
        for entity_id, target, is_control_setpoint in (
            (charge_limit_entity, self.desired_charge_limit, False),
            (inverter_entity, inverter_target, True),
            (grid_entity, grid_target, True),
        ):
            if target is None:
                continue
            current = self._float_state(entity_id)
            state = self.hass.states.get(entity_id)
            if current is None or state is None:
                raise TransientCommunicationError(
                    f"Sollwert vorübergehend nicht lesbar: {entity_id}"
                )
            step = float(state.attributes.get("step", 1) or 1)
            if abs(target - current) < max(step / 2, 0.5):
                continue
            await self._async_set_number_resilient(entity_id, target)
            wrote = True
            setpoint_wrote = setpoint_wrote or is_control_setpoint

        self._last_control_apply_monotonic = monotonic()
        if setpoint_wrote:
            self._last_control_write_at = datetime.now(UTC)
        if wrote:
            self.last_control_write = dt_util.now().isoformat()
            self._notify()

    async def _async_set_number_resilient(
        self,
        entity_id: str,
        target: float,
    ) -> None:
        """Retry transient SunEnergyXT timeouts before latching a control error."""
        for attempt in range(1, _WRITE_MAX_ATTEMPTS + 1):
            try:
                await self.hass.services.async_call(
                    "number",
                    "set_value",
                    {"value": target},
                    blocking=True,
                    target={"entity_id": entity_id},
                )
            except TimeoutError as err:
                self.transient_write_timeouts += 1
                self.last_transient_write_error = (
                    f"{dt_util.now().isoformat()} · {entity_id} · "
                    f"Ziel {target:g} · Versuch {attempt}/{_WRITE_MAX_ATTEMPTS}"
                )
                delay = write_retry_delay_seconds(
                    float(self.settings[SETTING_FEEDBACK_SETTLE_TIME]),
                    attempt,
                )
                if delay is None:
                    if self._float_state(entity_id) is None:
                        raise TransientCommunicationError(
                            f"Sollwert nach Zeitüberschreitungen nicht lesbar: "
                            f"{entity_id}"
                        ) from err
                    raise HomeAssistantError(
                        f"Zeitüberschreitung beim Schreiben von {target:g} "
                        f"auf {entity_id} nach {_WRITE_MAX_ATTEMPTS} Versuchen"
                    ) from err
                _LOGGER.warning(
                    "Temporary XT500 write timeout for %s target %s "
                    "(attempt %s/%s); waiting %.1f seconds for readback",
                    entity_id,
                    target,
                    attempt,
                    _WRITE_MAX_ATTEMPTS,
                    delay,
                )
                if await self._async_wait_for_entity_target(
                    entity_id,
                    target,
                    delay,
                ):
                    self.last_transient_write_recovery = (
                        f"{dt_util.now().isoformat()} · {entity_id} · "
                        "Zielwert nach Timeout zurückgelesen"
                    )
                    self._notify()
                    return
                continue
            except HomeAssistantError as err:
                if self._float_state(entity_id) is None:
                    raise TransientCommunicationError(
                        f"Sollwert vorübergehend nicht lesbar: {entity_id}"
                    ) from err
                raise

            if self._float_state(entity_id) is None:
                raise TransientCommunicationError(
                    f"Sollwert nach dem Schreiben nicht lesbar: {entity_id}"
                )
            if attempt > 1:
                self.last_transient_write_recovery = (
                    f"{dt_util.now().isoformat()} · {entity_id} · "
                    f"Schreibversuch {attempt}/{_WRITE_MAX_ATTEMPTS} erfolgreich"
                )
                self._notify()
            return

    async def _async_wait_for_entity_target(
        self,
        entity_id: str,
        target: float,
        timeout: float,
    ) -> bool:
        """Wait briefly for coordinator readback after an ambiguous timeout."""
        deadline = monotonic() + max(timeout, 0.0)
        while True:
            if self._entity_target_matches(entity_id, target):
                return True
            remaining = deadline - monotonic()
            if remaining <= 0:
                return False
            await asyncio.sleep(min(1.0, remaining))

    def _entity_target_matches(self, entity_id: str, target: float) -> bool:
        """Return whether the entity readback already reflects the target."""
        current = self._float_state(entity_id)
        state = self.hass.states.get(entity_id)
        if current is None or state is None:
            return False
        step = float(state.attributes.get("step", 1) or 1)
        return abs(target - current) < max(step / 2, 0.5)

    def _limited_entity_target(
        self, entity_id: str, requested: float, maximum_change: float
    ) -> float:
        state = self.hass.states.get(entity_id)
        current = self._float_state(entity_id)
        if state is None or current is None:
            raise TransientCommunicationError(
                f"Sollwert vorübergehend nicht lesbar: {entity_id}"
            )
        low = float(state.attributes.get("min", requested))
        high = float(state.attributes.get("max", requested))
        step = max(float(state.attributes.get("step", 1) or 1), 1)
        return limit_setpoint_change(
            current, requested, low, high, step, maximum_change
        )

    @property
    def days_since_full(self) -> float | None:
        """Return elapsed days in the current full-charge cycle."""
        baseline = self._setting_datetime(
            SETTING_LAST_FULL
        ) or self._setting_datetime(SETTING_CYCLE_REFERENCE)
        if baseline is None:
            return None
        return round(max((dt_util.now() - baseline).total_seconds(), 0) / 86400, 1)

    async def async_start_manual_cycle(self) -> None:
        """Start a cycle charge immediately with the configured cycle mode."""
        if not self.regulation_enabled:
            raise HomeAssistantError(
                "Die Regelung muss vor dem Start der Zyklusladung aktiv sein."
            )
        self.settings[SETTING_MANUAL_ACTIVE] = False
        self.settings[SETTING_CYCLE_AUTOMATIC_ACTIVE] = False
        self.settings[SETTING_CYCLE_MANUAL_ACTIVE] = True
        await self._store.async_save(self.settings)
        self.async_calculate()

    async def async_reset_cycle(self) -> None:
        """Reset elapsed cycle days and stop any current cycle charge."""
        self.settings[SETTING_LAST_FULL] = None
        self.settings[SETTING_CYCLE_REFERENCE] = dt_util.now().isoformat()
        self.settings[SETTING_CYCLE_MANUAL_ACTIVE] = False
        self.settings[SETTING_CYCLE_AUTOMATIC_ACTIVE] = False
        self._full_soc_latched = False
        await self._store.async_save(self.settings)
        self.async_calculate()

    async def async_set_system_discharge_limit(self, value: float) -> None:
        """Write the shared discharge limit through the original XT500 entity."""
        entity_id = self.entry.data[CONF_MIN_DISCHARGE_SOC_ENTITY]
        await self._async_set_number_resilient(entity_id, value)
        self.async_calculate()

    @callback
    def async_set_setting(self, key: str, value: Any) -> None:
        """Persist an integration-owned setting and recalculate."""
        self.settings[key] = value
        if (
            key == SETTING_AUTO_ENABLED
            and bool(value)
            and self._setting_datetime(SETTING_LAST_FULL) is None
            and self._setting_datetime(SETTING_CYCLE_REFERENCE) is None
        ):
            self.settings[SETTING_CYCLE_REFERENCE] = dt_util.now().isoformat()
        if key == SETTING_AUTO_ENABLED:
            if bool(value):
                if self._automatic_cycle_should_start_now():
                    self.settings[SETTING_CYCLE_AUTOMATIC_ACTIVE] = True
            else:
                self.settings[SETTING_CYCLE_AUTOMATIC_ACTIVE] = False
        elif key == SETTING_CYCLE_CHECK_TIME:
            self._schedule_cycle_check()
            if self._automatic_cycle_should_start_now():
                self.settings[SETTING_CYCLE_AUTOMATIC_ACTIVE] = True
        elif key == SETTING_TARIFF_REQUEST_DURATION and self.tariff_request_active:
            self.async_set_tariff_active(True)
            return
        self._store.async_delay_save(lambda: self.settings, 1)
        if key == SETTING_AUTOMATIC_RECOVERY_ENABLED:
            self._cancel_recovery_task()
            self._recovery_stable_since_monotonic = None
            self._next_recovery_attempt = None
            if self._write_blocked:
                if bool(value):
                    self._recovery_attempts = 0
                    self._control_error_at = datetime.now(UTC)
                    self._recovery_status = "waiting_feedback"
                else:
                    self._recovery_status = "manual_required"
        elif key == SETTING_RECOVERY_STABILITY_TIME and self._write_blocked:
            self._cancel_recovery_task()
            self._recovery_stable_since_monotonic = None
        self.async_calculate()

    @callback
    def async_add_listener(self, listener: Callable[[], None]) -> Callable[[], None]:
        self._listeners.add(listener)

        @callback
        def remove_listener() -> None:
            self._listeners.discard(listener)

        return remove_listener

    @callback
    def _notify(self) -> None:
        for listener in tuple(self._listeners):
            listener()
