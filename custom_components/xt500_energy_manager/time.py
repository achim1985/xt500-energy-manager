"""Time platform for XT500 Energy Manager."""

from __future__ import annotations

from datetime import time

from homeassistant.components.time import TimeEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import XT500ConfigEntry
from .const import SETTING_CYCLE_CHECK_TIME
from .entity import XT500Entity
from .runtime import XT500Runtime


class XT500CycleCheckTime(XT500Entity, TimeEntity):
    """Daily local time at which an overdue automatic cycle may start."""

    _attr_translation_key = "cycle_check_time"
    _attr_icon = "mdi:clock-check-outline"

    def __init__(self, runtime: XT500Runtime) -> None:
        super().__init__(runtime, SETTING_CYCLE_CHECK_TIME)

    @property
    def native_value(self) -> time:
        return self.runtime.cycle_check_time

    async def async_set_value(self, value: time) -> None:
        self.runtime.async_set_setting(
            SETTING_CYCLE_CHECK_TIME,
            value.replace(microsecond=0).isoformat(),
        )


async def async_setup_entry(
    _hass: HomeAssistant,
    entry: XT500ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities([XT500CycleCheckTime(entry.runtime_data)])
