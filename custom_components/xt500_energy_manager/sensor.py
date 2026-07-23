"""Sensor platform for XT500 Energy Manager."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorEntityDescription
from homeassistant.const import PERCENTAGE, UnitOfPower
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import XT500ConfigEntry
from .entity import XT500Entity
from .runtime import XT500Runtime


@dataclass(frozen=True, kw_only=True)
class XT500SensorDescription(SensorEntityDescription):
    value_fn: Callable[[XT500Runtime], Any]


STATUS_OPTIONS = (
    "disabled", "invalid_data", "starting", "control_error", "target_reached",
    "minimum_soc_hold", "normal", "pv_surplus", "manual_grid_charge",
    "manual_pv_surplus", "manual_pv_priority", "manual_pv_and_grid",
    "automatic_grid_charge", "automatic_pv_surplus", "automatic_pv_priority",
    "automatic_pv_and_grid",
)

SENSORS = (
    XT500SensorDescription(key="status", translation_key="status", icon="mdi:shield-search", device_class=SensorDeviceClass.ENUM, options=STATUS_OPTIONS, value_fn=lambda r: r.display_status),
    XT500SensorDescription(key="active_mode", translation_key="active_mode", icon="mdi:battery-sync", device_class=SensorDeviceClass.ENUM, options=("normal", "grid_charge", "pv_surplus", "pv_priority", "pv_and_grid"), value_fn=lambda r: r.result.active_mode if r.result else None),
    XT500SensorDescription(key="recommended_grid_setpoint", translation_key="recommended_grid_setpoint", icon="mdi:transmission-tower", native_unit_of_measurement=UnitOfPower.WATT, value_fn=lambda r: r.result.recommended_grid_setpoint if r.result else None),
    XT500SensorDescription(key="recommended_inverter_setpoint", translation_key="recommended_inverter_setpoint", icon="mdi:solar-power", native_unit_of_measurement=UnitOfPower.WATT, value_fn=lambda r: r.result.recommended_inverter_setpoint if r.result else None),
    XT500SensorDescription(key="estimated_home_load", translation_key="estimated_home_load", icon="mdi:home-lightning-bolt", native_unit_of_measurement=UnitOfPower.WATT, value_fn=lambda r: r.result.estimated_home_load if r.result else None),
    XT500SensorDescription(key="control_band", translation_key="control_band", icon="mdi:speedometer", device_class=SensorDeviceClass.ENUM, options=("small", "medium", "large"), value_fn=lambda r: r.control_profile.band),
    XT500SensorDescription(key="control_error", translation_key="control_error", icon="mdi:approximately-equal", native_unit_of_measurement=UnitOfPower.WATT, value_fn=lambda r: round(r.control_error, 1)),
    XT500SensorDescription(key="control_interval", translation_key="control_interval", icon="mdi:timer-sync-outline", native_unit_of_measurement="s", value_fn=lambda r: r.effective_control_interval),
    XT500SensorDescription(key="control_max_step", translation_key="control_max_step", icon="mdi:delta", native_unit_of_measurement=UnitOfPower.WATT, value_fn=lambda r: r.control_profile.maximum_change),
    XT500SensorDescription(key="active_target_soc", translation_key="active_target_soc", icon="mdi:battery-charging", native_unit_of_measurement=PERCENTAGE, value_fn=lambda r: r.active_target_soc),
    XT500SensorDescription(key="desired_charge_limit", translation_key="desired_charge_limit", icon="mdi:battery-lock", native_unit_of_measurement=PERCENTAGE, value_fn=lambda r: r.desired_charge_limit),
    XT500SensorDescription(key="days_since_full", translation_key="days_since_full", icon="mdi:calendar-clock", value_fn=lambda r: r.days_since_full),
)


class XT500Sensor(XT500Entity, SensorEntity):
    def __init__(self, runtime: XT500Runtime, description: XT500SensorDescription) -> None:
        super().__init__(runtime, description.key)
        self.entity_description = description

    @property
    def native_value(self) -> Any:
        return self.entity_description.value_fn(self.runtime)

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        attrs: dict[str, object] = dict(super().extra_state_attributes)
        if self.key == "status":
            attrs.update(
                {
                    "error": self.runtime.control_error_message,
                    "last_control_write": self.runtime.last_control_write,
                    "control_ready": self.runtime.control_ready,
                    "control_band": self.runtime.control_profile.band,
                    "control_error_w": round(self.runtime.control_error, 1),
                    "effective_interval_s": self.runtime.effective_control_interval,
                    "maximum_change_w": self.runtime.control_profile.maximum_change,
                    "feedback_ready": self.runtime.feedback_ready,
                }
            )
        return attrs


async def async_setup_entry(_hass: HomeAssistant, entry: XT500ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback) -> None:
    async_add_entities(XT500Sensor(entry.runtime_data, description) for description in SENSORS)
