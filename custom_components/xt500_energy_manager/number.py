"""Number platform for XT500 Energy Manager."""

from __future__ import annotations

from homeassistant.components.number import NumberEntity, NumberEntityDescription, NumberMode
from homeassistant.const import UnitOfPower
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import XT500ConfigEntry
from .const import (
    SETTING_AUTO_TARGET_SOC,
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
    SETTING_MAX_GRID_OUTPUT,
    SETTING_MAX_INVERTER_OUTPUT,
    SETTING_MIN_SOC,
    SETTING_NORMAL_CHARGE_LIMIT,
    SETTING_PV_START_DELAY,
    SETTING_PV_START_POWER,
    SETTING_PV_STOP_POWER,
    SETTING_RECOVERY_STABILITY_TIME,
    SETTING_SOC_HYSTERESIS,
    SETTING_TARGET_GRID_POWER,
    SETTING_TARGET_SOC,
)
from .entity import XT500Entity
from .runtime import XT500Runtime

NUMBERS = (
    NumberEntityDescription(key=SETTING_TARGET_SOC, translation_key="target_soc", icon="mdi:battery-charging-100", native_min_value=50, native_max_value=100, native_step=1, native_unit_of_measurement="%", mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_AUTO_TARGET_SOC, translation_key="automatic_target_soc", icon="mdi:battery-check", native_min_value=50, native_max_value=100, native_step=1, native_unit_of_measurement="%", mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_NORMAL_CHARGE_LIMIT, translation_key="normal_charge_limit", icon="mdi:battery-lock", native_min_value=0, native_max_value=100, native_step=1, native_unit_of_measurement="%", mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_CHARGE_POWER, translation_key="charge_power", icon="mdi:flash", native_min_value=0, native_max_value=2400, native_step=50, native_unit_of_measurement=UnitOfPower.WATT, mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_CYCLE_INTERVAL_DAYS, translation_key="cycle_interval_days", icon="mdi:calendar-range", native_min_value=1, native_max_value=90, native_step=1, native_unit_of_measurement="d", mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_RECOVERY_STABILITY_TIME, translation_key="recovery_stability_time", icon="mdi:timer-shield-outline", native_min_value=15, native_max_value=300, native_step=5, native_unit_of_measurement="s", mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_FEEDBACK_SETTLE_TIME, translation_key="feedback_settle_time", icon="mdi:timer-cog-outline", native_min_value=1, native_max_value=30, native_step=1, native_unit_of_measurement="s", mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_CONTROL_LARGE_MAX_STEP, translation_key="control_large_max_step", icon="mdi:delta", native_min_value=50, native_max_value=2400, native_step=10, native_unit_of_measurement=UnitOfPower.WATT, mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_CONTROL_SMALL_ERROR, translation_key="control_small_error", icon="mdi:approximately-equal", native_min_value=1, native_max_value=300, native_step=1, native_unit_of_measurement=UnitOfPower.WATT, mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_CONTROL_LARGE_ERROR, translation_key="control_large_error", icon="mdi:arrow-expand-horizontal", native_min_value=10, native_max_value=1000, native_step=10, native_unit_of_measurement=UnitOfPower.WATT, mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_CONTROL_SLOW_INTERVAL, translation_key="control_slow_interval", icon="mdi:speedometer-slow", native_min_value=1, native_max_value=120, native_step=0.5, native_unit_of_measurement="s", mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_CONTROL_MEDIUM_INTERVAL, translation_key="control_medium_interval", icon="mdi:speedometer-medium", native_min_value=0.5, native_max_value=60, native_step=0.5, native_unit_of_measurement="s", mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_CONTROL_FAST_INTERVAL, translation_key="control_fast_interval", icon="mdi:speedometer", native_min_value=0.5, native_max_value=20, native_step=0.5, native_unit_of_measurement="s", mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_CONTROL_SMALL_MAX_STEP, translation_key="control_small_max_step", icon="mdi:delta", native_min_value=1, native_max_value=300, native_step=1, native_unit_of_measurement=UnitOfPower.WATT, mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_CONTROL_MEDIUM_MAX_STEP, translation_key="control_medium_max_step", icon="mdi:delta", native_min_value=10, native_max_value=1000, native_step=10, native_unit_of_measurement=UnitOfPower.WATT, mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_PV_STOP_POWER, translation_key="pv_stop_power", icon="mdi:solar-power-variant-outline", native_min_value=0, native_max_value=500, native_step=5, native_unit_of_measurement=UnitOfPower.WATT, mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_PV_START_POWER, translation_key="pv_start_power", icon="mdi:solar-power-variant", native_min_value=0, native_max_value=1000, native_step=5, native_unit_of_measurement=UnitOfPower.WATT, mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_PV_START_DELAY, translation_key="pv_start_delay", icon="mdi:timer-play-outline", native_min_value=0, native_max_value=300, native_step=5, native_unit_of_measurement="s", mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_MIN_SOC, translation_key="minimum_soc", icon="mdi:battery-low", native_min_value=1, native_max_value=40, native_step=1, native_unit_of_measurement="%", mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_SOC_HYSTERESIS, translation_key="soc_hysteresis", icon="mdi:arrow-expand-vertical", native_min_value=1, native_max_value=20, native_step=1, native_unit_of_measurement="%", mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_TARGET_GRID_POWER, translation_key="target_grid_power", icon="mdi:transmission-tower", native_min_value=-500, native_max_value=500, native_step=10, native_unit_of_measurement=UnitOfPower.WATT, mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_MAX_GRID_OUTPUT, translation_key="maximum_grid_output", icon="mdi:transmission-tower-export", native_min_value=0, native_max_value=2400, native_step=50, native_unit_of_measurement=UnitOfPower.WATT, mode=NumberMode.BOX),
    NumberEntityDescription(key=SETTING_MAX_INVERTER_OUTPUT, translation_key="maximum_inverter_output", icon="mdi:solar-power-variant", native_min_value=0, native_max_value=2400, native_step=50, native_unit_of_measurement=UnitOfPower.WATT, mode=NumberMode.BOX),
)


class XT500Number(XT500Entity, NumberEntity):
    def __init__(self, runtime: XT500Runtime, description: NumberEntityDescription) -> None:
        super().__init__(runtime, description.key)
        self.entity_description = description

    @property
    def native_value(self) -> float:
        return float(self.runtime.settings[self.key])

    @property
    def native_min_value(self) -> float:
        if self.key == SETTING_NORMAL_CHARGE_LIMIT:
            state = self.runtime.hass.states.get(
                self.runtime.entry.data.get("max_charge_soc_entity")
            )
            if state is not None:
                return float(state.attributes.get("min", 0))
        return float(self.entity_description.native_min_value)

    @property
    def native_max_value(self) -> float:
        if self.key == SETTING_NORMAL_CHARGE_LIMIT:
            state = self.runtime.hass.states.get(
                self.runtime.entry.data.get("max_charge_soc_entity")
            )
            if state is not None:
                return float(state.attributes.get("max", 100))
        return float(self.entity_description.native_max_value)

    @property
    def native_step(self) -> float:
        if self.key == SETTING_NORMAL_CHARGE_LIMIT:
            state = self.runtime.hass.states.get(
                self.runtime.entry.data.get("max_charge_soc_entity")
            )
            if state is not None:
                return float(state.attributes.get("step", 1) or 1)
        return float(self.entity_description.native_step)

    async def async_set_native_value(self, value: float) -> None:
        self.runtime.async_set_setting(self.key, value)


async def async_setup_entry(_hass: HomeAssistant, entry: XT500ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback) -> None:
    async_add_entities(XT500Number(entry.runtime_data, description) for description in NUMBERS)
