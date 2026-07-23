"""Production runtime for the XT500 Energy Manager."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
import logging
from time import monotonic
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import Event, HomeAssistant, State, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_track_state_change_event
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
    CONF_METER_SIGN,
    CONF_PV_POWER_ENTITY,
    CONF_SOC_ENTITY,
    DEFAULT_SETTINGS,
    DOMAIN,
    METER_EXPORT_POSITIVE,
    SETTING_AUTO_ENABLED,
    SETTING_AUTO_MODE,
    SETTING_AUTO_TARGET_SOC,
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
    SETTING_CYCLE_INTERVAL_DAYS,
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
    SETTING_REGULATION_ENABLED,
    SETTING_SOC_HYSTERESIS,
    SETTING_TARGET_GRID_POWER,
    SETTING_TARGET_SOC,
)
from .controller import (
    AdaptiveControlProfile,
    ControlInput,
    ControlResult,
    ControlSettings,
    calculate_control,
    feedback_samples_are_fresh,
    limit_setpoint_change,
    overall_control_error,
    select_adaptive_control_profile,
    select_charge_limit,
    update_pv_release,
)

_LOGGER = logging.getLogger(__name__)
_STARTUP_STABILITY_SECONDS = 5.0


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
        self.control_error_message: str | None = None
        self.last_control_write: str | None = None

        self._data_valid_since_monotonic: float | None = None
        self._ha_started = hass.is_running
        self._write_blocked = False
        self._full_soc_latched = False
        self._low_soc_hold = False
        self._listeners: set[Callable[[], None]] = set()
        self._unsub_state: Callable[[], None] | None = None
        self._unsub_started: Callable[[], None] | None = None
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

        if migrated:
            await self._store.async_save(self.settings)

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
        for task in (
            self._control_apply_task,
            self._startup_ready_task,
            self._pv_release_task,
        ):
            if task is not None and not task.done():
                task.cancel()
        if self._unsub_started:
            self._unsub_started()
            self._unsub_started = None
        if self._unsub_state:
            self._unsub_state()
            self._unsub_state = None

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

    @callback
    def async_calculate(self) -> None:
        """Calculate and, when ready, schedule production setpoint writes."""
        values: dict[str, float] = {}
        self.invalid_entities = []
        for key in (
            CONF_SOC_ENTITY,
            CONF_PV_POWER_ENTITY,
            CONF_GRID_POWER_ENTITY,
            CONF_GRID_PORT_POWER_ENTITY,
            CONF_LOAD_PORT_POWER_ENTITY,
            CONF_GRID_SETPOINT_ENTITY,
            CONF_INVERTER_SETPOINT_ENTITY,
            CONF_MAX_CHARGE_SOC_ENTITY,
        ):
            entity_id = self.entry.data.get(key)
            if not entity_id:
                self.invalid_entities.append(f"missing:{key}")
                continue
            value = self._float_state(entity_id)
            if value is None:
                self.invalid_entities.append(entity_id)
            else:
                values[key] = value

        self.data_valid = not self.invalid_entities
        if not self.data_valid:
            self._data_valid_since_monotonic = None
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

        if self._data_valid_since_monotonic is None:
            self._data_valid_since_monotonic = monotonic()
        self._update_full_charge(values[CONF_SOC_ENTITY])

        if not self.regulation_enabled:
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

        automatic_active = self.automatic_cycle_requested
        charge_active = manual_active or automatic_active
        source = "manual" if manual_active else "automatic" if automatic_active else "none"
        mode = (
            self.settings[SETTING_MANUAL_MODE]
            if manual_active
            else self.settings[SETTING_AUTO_MODE]
        )
        target_soc = float(
            self.settings[SETTING_TARGET_SOC]
            if manual_active
            else self.settings[SETTING_AUTO_TARGET_SOC]
        )
        self.charge_request_active = charge_active
        self.active_target_soc = target_soc if charge_active else None

        charge_limit_state = self.hass.states.get(
            self.entry.data[CONF_MAX_CHARGE_SOC_ENTITY]
        )
        self.desired_charge_limit = select_charge_limit(
            normal_limit=float(self.settings[SETTING_NORMAL_CHARGE_LIMIT]),
            target_soc=target_soc,
            charge_active=charge_active,
            low=float(charge_limit_state.attributes.get("min", 0)),
            high=float(charge_limit_state.attributes.get("max", 100)),
            step=float(charge_limit_state.attributes.get("step", 1) or 1),
        )

        minimum_soc = float(self.settings[SETTING_MIN_SOC])
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
                charge_active=charge_active,
                charge_source=source,
                charge_mode=mode,
                base_mode=self.settings[SETTING_BASE_MODE],
                target_soc=target_soc,
                minimum_soc=minimum_soc,
                soc_hysteresis=hysteresis,
                discharge_hold=self._low_soc_hold,
                charge_power=float(self.settings[SETTING_CHARGE_POWER]),
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
        else:
            self._schedule_startup_readiness()
        self._notify()

    @callback
    def _update_full_charge(self, soc: float) -> None:
        """Record one full-charge event when SOC crosses the automatic target."""
        target = float(self.settings[SETTING_AUTO_TARGET_SOC])
        if soc >= target:
            if not self._full_soc_latched:
                self.settings[SETTING_LAST_FULL] = dt_util.now().isoformat()
                self._store.async_delay_save(lambda: self.settings, 1)
                self._full_soc_latched = True
        elif soc < target - 1:
            self._full_soc_latched = False

    @property
    def cycle_due(self) -> bool:
        """Return whether the configured full-charge interval has elapsed."""
        value = self.settings.get(SETTING_LAST_FULL)
        if not value:
            return True
        last_full = dt_util.parse_datetime(value)
        if last_full is None:
            return True
        return dt_util.now() >= last_full + timedelta(
            days=float(self.settings[SETTING_CYCLE_INTERVAL_DAYS])
        )

    @property
    def automatic_cycle_requested(self) -> bool:
        """Return whether the integration currently requests an automatic cycle."""
        return (
            self.regulation_enabled
            and bool(self.settings[SETTING_AUTO_ENABLED])
            and self.cycle_due
        )

    @property
    def regulation_enabled(self) -> bool:
        """Return whether this production controller is enabled."""
        return bool(self.settings[SETTING_REGULATION_ENABLED])

    @property
    def control_ready(self) -> bool:
        """Return whether production writes are currently permitted."""
        return (
            self.regulation_enabled
            and self._ha_started
            and self.data_valid
            and self.result is not None
            and not self._write_blocked
            and self._data_valid_since_monotonic is not None
            and monotonic() - self._data_valid_since_monotonic
            >= _STARTUP_STABILITY_SECONDS
        )

    @property
    def display_status(self) -> str:
        """Return the user-facing production state."""
        if not self.regulation_enabled:
            return "disabled"
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
        states = [
            self.hass.states.get(self.entry.data[key])
            for key in (CONF_GRID_POWER_ENTITY, CONF_GRID_PORT_POWER_ENTITY)
        ]
        return feedback_samples_are_fresh(
            self._last_control_write_at,
            (state.last_updated if state is not None else None for state in states),
        )

    async def async_set_regulation_enabled(self, enabled: bool) -> None:
        """Enable or stop all production writes."""
        if not enabled:
            self._control_apply_requested = False
            if self._control_apply_task and not self._control_apply_task.done():
                self._control_apply_task.cancel()
            self._last_control_write_at = None
        else:
            self._write_blocked = False
            self.control_error_message = None
            self._data_valid_since_monotonic = None
        self.settings[SETTING_REGULATION_ENABLED] = enabled
        await self._store.async_save(self.settings)
        self.async_calculate()

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
        except Exception as err:
            _LOGGER.exception("XT500 production write failed")
            self._write_blocked = True
            self.control_error_message = f"Schreibfehler: {err}"
            self._control_apply_requested = False
            self._notify()
        finally:
            self._control_apply_task = None
            if self._control_apply_requested and self.control_ready:
                self._control_apply_task = self.hass.async_create_task(
                    self._async_control_apply_loop()
                )

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
                raise HomeAssistantError(f"Sollwert nicht lesbar: {entity_id}")
            step = float(state.attributes.get("step", 1) or 1)
            if abs(target - current) < max(step / 2, 0.5):
                continue
            await self.hass.services.async_call(
                "number",
                "set_value",
                {"value": target},
                blocking=True,
                target={"entity_id": entity_id},
            )
            wrote = True
            setpoint_wrote = setpoint_wrote or is_control_setpoint

        self._last_control_apply_monotonic = monotonic()
        if setpoint_wrote:
            self._last_control_write_at = datetime.now(UTC)
        if wrote:
            self.last_control_write = dt_util.now().isoformat()
            self._notify()

    def _limited_entity_target(
        self, entity_id: str, requested: float, maximum_change: float
    ) -> float:
        state = self.hass.states.get(entity_id)
        current = self._float_state(entity_id)
        if state is None or current is None:
            raise HomeAssistantError(f"Sollwert nicht lesbar: {entity_id}")
        low = float(state.attributes.get("min", requested))
        high = float(state.attributes.get("max", requested))
        step = max(float(state.attributes.get("step", 1) or 1), 1)
        return limit_setpoint_change(
            current, requested, low, high, step, maximum_change
        )

    @property
    def days_since_full(self) -> float | None:
        """Return elapsed days since the last observed automatic target SOC."""
        value = self.settings.get(SETTING_LAST_FULL)
        if not value or (last_full := dt_util.parse_datetime(value)) is None:
            return None
        return round(max((dt_util.now() - last_full).total_seconds(), 0) / 86400, 1)

    @callback
    def async_set_setting(self, key: str, value: Any) -> None:
        """Persist an integration-owned setting and recalculate."""
        self.settings[key] = value
        self._store.async_delay_save(lambda: self.settings, 1)
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
