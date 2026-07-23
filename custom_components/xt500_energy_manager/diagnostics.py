"""Diagnostics support for XT500 Energy Manager."""

from __future__ import annotations

from dataclasses import asdict

from homeassistant.core import HomeAssistant

from . import XT500ConfigEntry


async def async_get_config_entry_diagnostics(_hass: HomeAssistant, entry: XT500ConfigEntry) -> dict:
    runtime = entry.runtime_data
    return {
        "control_mode": "production" if runtime.regulation_enabled else "disabled",
        "control_ready": runtime.control_ready,
        "control_error": runtime.control_error_message,
        "automatic_recovery": {
            "enabled": runtime.automatic_recovery_enabled,
            "status": runtime.recovery_status,
            "attempts": runtime.recovery_attempts,
            "maximum_attempts": runtime.recovery_max_attempts,
            "next_attempt": runtime.next_recovery_attempt,
            "last_success": runtime.last_recovery_success,
            "fresh_feedback_after_error": runtime.recovery_feedback_ready,
            "feedback_current": runtime.recovery_feedback_current,
        },
        "transient_write_handling": {
            "maximum_attempts_per_value": 3,
            "timeouts_since_start": runtime.transient_write_timeouts,
            "last_timeout": runtime.last_transient_write_error,
            "last_recovery": runtime.last_transient_write_recovery,
        },
        "configured_entities": dict(entry.data),
        "settings": dict(runtime.settings),
        "cycle_schedule": {
            "enabled": bool(runtime.settings["automatic_enabled"]),
            "due": runtime.cycle_due,
            "state": runtime.cycle_state,
            "manual_active": runtime.settings["cycle_manual_active"],
            "automatic_active": runtime.settings["cycle_automatic_active"],
            "check_time": runtime.settings["cycle_check_time"],
            "last_full": runtime.settings["last_full"],
            "reference": runtime.settings["cycle_reference"],
            "next_cycle": runtime.next_cycle_at,
        },
        "data_valid": runtime.data_valid,
        "adaptive_control": {
            "band": runtime.control_profile.band,
            "error_w": runtime.control_error,
            "effective_interval_s": runtime.effective_control_interval,
            "maximum_change_w": runtime.control_profile.maximum_change,
            "feedback_ready": runtime.feedback_ready,
            "pv_release_active": runtime.pv_release_active,
            "last_control_write": runtime.last_control_write,
        },
        "invalid_entities": runtime.invalid_entities,
        "result": asdict(runtime.result) if runtime.result else None,
    }
