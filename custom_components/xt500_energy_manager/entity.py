"""Base entities for XT500 Energy Manager."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity

from .const import (
    CONF_BATTERY_INPUT_POWER_ENTITY,
    CONF_BATTERY_OUTPUT_POWER_ENTITY,
    CONF_GRID_PORT_POWER_ENTITY,
    CONF_GRID_POWER_ENTITY,
    CONF_LOAD_DISCHARGE_LIMIT_ENTITY,
    CONF_LOAD_PORT_POWER_ENTITY,
    CONF_MAX_CHARGE_SOC_ENTITY,
    CONF_PV_POWER_ENTITY,
    DOMAIN,
    VERSION,
)
from .runtime import XT500Runtime


class XT500Entity(Entity):
    """Entity backed by the shared production runtime."""

    _attr_has_entity_name = True

    def __init__(self, runtime: XT500Runtime, key: str) -> None:
        self.runtime = runtime
        self.key = key
        self._attr_unique_id = f"{runtime.entry.entry_id}_{key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, runtime.entry.entry_id)},
            name=runtime.entry.title,
            manufacturer="Community",
            model="XT500 energy manager",
            sw_version=VERSION,
        )

    @property
    def extra_state_attributes(self) -> dict[str, str]:
        return {
            "integration": DOMAIN,
            "xt500_key": self.key,
            "xt500_manager_id": self.runtime.entry.entry_id,
            "control_mode": (
                "production" if self.runtime.regulation_enabled else "disabled"
            ),
            "source_soc_entity": self.runtime.entry.data["soc_entity"],
            "source_grid_setpoint_entity": self.runtime.entry.data["grid_setpoint_entity"],
            "source_inverter_setpoint_entity": self.runtime.entry.data["inverter_setpoint_entity"],
            "source_max_charge_soc_entity": self.runtime.entry.data.get(
                CONF_MAX_CHARGE_SOC_ENTITY
            ),
            "source_load_discharge_limit_entity": self.runtime.entry.data.get(
                CONF_LOAD_DISCHARGE_LIMIT_ENTITY
            ),
            "source_battery_input_power_entity": self.runtime.entry.data.get(CONF_BATTERY_INPUT_POWER_ENTITY),
            "source_battery_output_power_entity": self.runtime.entry.data.get(CONF_BATTERY_OUTPUT_POWER_ENTITY),
            "source_pv_power_entity": self.runtime.entry.data.get(CONF_PV_POWER_ENTITY),
            "source_public_grid_power_entity": self.runtime.entry.data.get(CONF_GRID_POWER_ENTITY),
            "source_grid_port_power_entity": self.runtime.entry.data.get(CONF_GRID_PORT_POWER_ENTITY),
            "source_load_port_power_entity": self.runtime.entry.data.get(CONF_LOAD_PORT_POWER_ENTITY),
        }

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.runtime.async_add_listener(self.async_write_ha_state))
