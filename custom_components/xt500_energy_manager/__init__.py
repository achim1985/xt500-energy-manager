"""XT500 Energy Manager integration."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

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
    DOMAIN,
    FRONTEND_URL,
    PLATFORMS,
)
from .runtime import XT500Runtime

type XT500ConfigEntry = ConfigEntry[XT500Runtime]


async def async_setup(hass: HomeAssistant, _config: dict) -> bool:
    """Register the bundled dashboard strategy as a static frontend file."""
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
