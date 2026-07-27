"""XT500 Energy Manager integration."""

from __future__ import annotations

from pathlib import Path
import logging

from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.event import async_call_later

from .blueprint_sync import BlueprintSyncResult, sync_bundled_blueprint
from .const import (
    CONF_BATTERY_INPUT_POWER_ENTITY,
    CONF_BATTERY_OUTPUT_POWER_ENTITY,
    CONF_GRID_PORT_POWER_ENTITY,
    CONF_GRID_POWER_ENTITY,
    CONF_GRID_SETPOINT_ENTITY,
    CONF_INVERTER_SETPOINT_ENTITY,
    CONF_LOAD_DISCHARGE_LIMIT_ENTITY,
    CONF_LOAD_PORT_POWER_ENTITY,
    CONF_MAX_CHARGE_SOC_ENTITY,
    CONF_METER_SIGN,
    CONF_PV_POWER_ENTITY,
    CONF_SOC_ENTITY,
    DOMAIN,
    FRONTEND_URL,
    PLATFORMS,
)
from .runtime import XT500Runtime

type XT500ConfigEntry = ConfigEntry[XT500Runtime]

_LOGGER = logging.getLogger(__name__)


async def _async_reload_automations(hass: HomeAssistant) -> None:
    """Reload automations after the managed blueprint changed."""
    if hass.services.has_service("automation", "reload"):
        await hass.services.async_call("automation", "reload", blocking=True)


@callback
def _schedule_automation_reload(hass: HomeAssistant) -> None:
    """Reload after startup so existing blueprint instances use the new body."""

    @callback
    def _reload_after_delay(_now) -> None:
        hass.async_create_task(
            _async_reload_automations(hass),
            "Reload automations after XT500 blueprint update",
        )

    async_call_later(hass, 5, _reload_after_delay)


@callback
def _async_started_after_blueprint_update(
    hass: HomeAssistant, _event: Event
) -> None:
    _schedule_automation_reload(hass)


async def async_setup(hass: HomeAssistant, _config: dict) -> bool:
    """Register frontend assets and synchronize the bundled blueprint."""
    try:
        result: BlueprintSyncResult = await hass.async_add_executor_job(
            sync_bundled_blueprint, hass.config.config_dir
        )
    except (OSError, ValueError):
        _LOGGER.exception("Unable to synchronize the bundled tariff blueprint")
    else:
        if result.status == "preserved":
            _LOGGER.warning(
                "Kept manually changed tariff blueprint at %s; the bundled "
                "update was not installed",
                result.target,
            )
        elif result.changed:
            _LOGGER.info("%s at %s", result.detail, result.target)
            if hass.is_running:
                _schedule_automation_reload(hass)
            else:
                hass.bus.async_listen_once(
                    EVENT_HOMEASSISTANT_STARTED,
                    lambda event: _async_started_after_blueprint_update(
                        hass, event
                    ),
                )

    frontend_path = Path(__file__).parent / "frontend" / "xt500-energy-dashboard-strategy.js"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(FRONTEND_URL, str(frontend_path), False)]
    )
    return True


async def async_setup_entry(hass: HomeAssistant, entry: XT500ConfigEntry) -> bool:
    """Set up one XT500 energy controller."""
    runtime = XT500Runtime(hass, entry)
    entry.runtime_data = runtime
    await runtime.async_start()
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_migrate_entry(
    hass: HomeAssistant, entry: XT500ConfigEntry
) -> bool:
    """Migrate development entries to the production source schema."""
    if entry.version < 2:
        retained_keys = {
            CONF_SOC_ENTITY,
            CONF_PV_POWER_ENTITY,
            CONF_GRID_POWER_ENTITY,
            CONF_GRID_PORT_POWER_ENTITY,
            CONF_LOAD_PORT_POWER_ENTITY,
            CONF_GRID_SETPOINT_ENTITY,
            CONF_INVERTER_SETPOINT_ENTITY,
            CONF_MAX_CHARGE_SOC_ENTITY,
            CONF_LOAD_DISCHARGE_LIMIT_ENTITY,
            CONF_BATTERY_INPUT_POWER_ENTITY,
            CONF_BATTERY_OUTPUT_POWER_ENTITY,
            CONF_METER_SIGN,
        }
        hass.config_entries.async_update_entry(
            entry,
            data={
                key: value
                for key, value in entry.data.items()
                if key in retained_keys
            },
            version=2,
        )
    return True


async def _async_reload_entry(hass: HomeAssistant, entry: XT500ConfigEntry) -> None:
    """Reload after the observed source entities were changed."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: XT500ConfigEntry) -> bool:
    """Unload an XT500 energy controller."""
    if not await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        return False
    await entry.runtime_data.async_stop()
    return True
