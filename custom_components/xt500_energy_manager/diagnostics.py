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
        "configured_entities": dict(entry.data),
        "settings": dict(runtime.settings),
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
