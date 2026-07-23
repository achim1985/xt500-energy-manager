"""Constants for the XT500 Energy Manager integration."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "xt500_energy_manager"
PLATFORMS: Final = ("sensor", "binary_sensor", "switch", "select", "number", "button")

CONF_SOC_ENTITY: Final = "soc_entity"
CONF_PV_POWER_ENTITY: Final = "pv_power_entity"
CONF_GRID_POWER_ENTITY: Final = "grid_power_entity"
CONF_GRID_PORT_POWER_ENTITY: Final = "grid_port_power_entity"
CONF_LOAD_PORT_POWER_ENTITY: Final = "load_port_power_entity"
CONF_GRID_SETPOINT_ENTITY: Final = "grid_setpoint_entity"
CONF_INVERTER_SETPOINT_ENTITY: Final = "inverter_setpoint_entity"
CONF_MAX_CHARGE_SOC_ENTITY: Final = "max_charge_soc_entity"
CONF_BATTERY_INPUT_POWER_ENTITY: Final = "battery_input_power_entity"
CONF_BATTERY_OUTPUT_POWER_ENTITY: Final = "battery_output_power_entity"
CONF_METER_SIGN: Final = "meter_sign"

METER_IMPORT_POSITIVE: Final = "import_positive"
METER_EXPORT_POSITIVE: Final = "export_positive"
METER_SIGNS: Final = (METER_IMPORT_POSITIVE, METER_EXPORT_POSITIVE)

MODE_GRID: Final = "grid_charge"
MODE_PV_SURPLUS: Final = "pv_surplus"
MODE_PV_PRIORITY: Final = "pv_priority"
MODE_PV_GRID: Final = "pv_and_grid"
CHARGE_MODES: Final = (MODE_GRID, MODE_PV_SURPLUS, MODE_PV_PRIORITY, MODE_PV_GRID)

BASE_NORMAL: Final = "normal"
BASE_PV_SURPLUS: Final = "pv_surplus"
BASE_MODES: Final = (BASE_NORMAL, BASE_PV_SURPLUS)

SETTING_MANUAL_ACTIVE: Final = "manual_active"
SETTING_AUTO_ENABLED: Final = "automatic_enabled"
SETTING_REGULATION_ENABLED: Final = "regulation_enabled"
SETTING_AUTOMATIC_RECOVERY_ENABLED: Final = "automatic_recovery_enabled"
SETTING_RECOVERY_STABILITY_TIME: Final = "recovery_stability_time"
SETTING_FEEDBACK_SETTLE_TIME: Final = "feedback_settle_time"
SETTING_CONTROL_LARGE_MAX_STEP: Final = "control_large_max_step"
SETTING_CONTROL_SMALL_ERROR: Final = "control_small_error"
SETTING_CONTROL_LARGE_ERROR: Final = "control_large_error"
SETTING_CONTROL_SLOW_INTERVAL: Final = "control_slow_interval"
SETTING_CONTROL_MEDIUM_INTERVAL: Final = "control_medium_interval"
SETTING_CONTROL_FAST_INTERVAL: Final = "control_fast_interval"
SETTING_CONTROL_SMALL_MAX_STEP: Final = "control_small_max_step"
SETTING_CONTROL_MEDIUM_MAX_STEP: Final = "control_medium_max_step"
SETTING_PV_STOP_POWER: Final = "pv_stop_power"
SETTING_PV_START_POWER: Final = "pv_start_power"
SETTING_PV_START_DELAY: Final = "pv_start_delay"
SETTING_SHOW_ADVANCED: Final = "show_advanced"
SETTING_MANUAL_MODE: Final = "manual_mode"
SETTING_AUTO_MODE: Final = "automatic_mode"
SETTING_BASE_MODE: Final = "base_mode"
SETTING_TARGET_SOC: Final = "target_soc"
SETTING_AUTO_TARGET_SOC: Final = "automatic_target_soc"
SETTING_NORMAL_CHARGE_LIMIT: Final = "normal_charge_limit"
SETTING_CHARGE_POWER: Final = "charge_power"
SETTING_CYCLE_INTERVAL_DAYS: Final = "cycle_interval_days"
SETTING_MIN_SOC: Final = "minimum_soc"
SETTING_SOC_HYSTERESIS: Final = "soc_hysteresis"
SETTING_TARGET_GRID_POWER: Final = "target_grid_power"
SETTING_MAX_GRID_OUTPUT: Final = "maximum_grid_output"
SETTING_MAX_INVERTER_OUTPUT: Final = "maximum_inverter_output"
SETTING_LAST_FULL: Final = "last_full"
SETTING_CYCLE_REFERENCE: Final = "cycle_reference"

DEFAULT_SETTINGS: Final = {
    SETTING_REGULATION_ENABLED: True,
    SETTING_AUTOMATIC_RECOVERY_ENABLED: True,
    SETTING_RECOVERY_STABILITY_TIME: 60.0,
    SETTING_FEEDBACK_SETTLE_TIME: 5.0,
    SETTING_CONTROL_LARGE_MAX_STEP: 600.0,
    SETTING_CONTROL_SMALL_ERROR: 8.0,
    SETTING_CONTROL_LARGE_ERROR: 150.0,
    SETTING_CONTROL_SLOW_INTERVAL: 3.0,
    SETTING_CONTROL_MEDIUM_INTERVAL: 2.5,
    SETTING_CONTROL_FAST_INTERVAL: 1.0,
    SETTING_CONTROL_SMALL_MAX_STEP: 20.0,
    SETTING_CONTROL_MEDIUM_MAX_STEP: 120.0,
    SETTING_PV_STOP_POWER: 50.0,
    SETTING_PV_START_POWER: 80.0,
    SETTING_PV_START_DELAY: 30.0,
    SETTING_SHOW_ADVANCED: False,
    SETTING_MANUAL_ACTIVE: False,
    SETTING_AUTO_ENABLED: False,
    SETTING_MANUAL_MODE: MODE_PV_PRIORITY,
    SETTING_AUTO_MODE: MODE_PV_PRIORITY,
    SETTING_BASE_MODE: BASE_NORMAL,
    SETTING_TARGET_SOC: 100.0,
    SETTING_AUTO_TARGET_SOC: 100.0,
    SETTING_NORMAL_CHARGE_LIMIT: 100.0,
    SETTING_CHARGE_POWER: 2400.0,
    SETTING_CYCLE_INTERVAL_DAYS: 14.0,
    SETTING_MIN_SOC: 10.0,
    SETTING_SOC_HYSTERESIS: 5.0,
    SETTING_TARGET_GRID_POWER: 0.0,
    SETTING_MAX_GRID_OUTPUT: 2400.0,
    SETTING_MAX_INVERTER_OUTPUT: 2400.0,
    SETTING_LAST_FULL: None,
    SETTING_CYCLE_REFERENCE: None,
}

FRONTEND_URL: Final = "/xt500_energy_manager/xt500-energy-dashboard-strategy.js"
