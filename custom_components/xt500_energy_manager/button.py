"""Button platform for XT500 Energy Manager."""

from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import XT500ConfigEntry
from .entity import XT500Entity


class XT500RecalculateButton(XT500Entity, ButtonEntity):
    _attr_translation_key = "recalculate"
    _attr_icon = "mdi:calculator-variant"

    def __init__(self, runtime) -> None:
        super().__init__(runtime, "recalculate")

    async def async_press(self) -> None:
        self.runtime.async_calculate()


class XT500CycleStartButton(XT500Entity, ButtonEntity):
    """Start one cycle charge immediately."""

    _attr_translation_key = "cycle_start"
    _attr_icon = "mdi:battery-sync"

    def __init__(self, runtime) -> None:
        super().__init__(runtime, "cycle_start")

    async def async_press(self) -> None:
        await self.runtime.async_start_manual_cycle()


class XT500CycleResetButton(XT500Entity, ButtonEntity):
    """Reset elapsed cycle days and stop a running cycle."""

    _attr_translation_key = "cycle_reset"
    _attr_icon = "mdi:calendar-refresh"

    def __init__(self, runtime) -> None:
        super().__init__(runtime, "cycle_reset")

    async def async_press(self) -> None:
        await self.runtime.async_reset_cycle()


async def async_setup_entry(_hass: HomeAssistant, entry: XT500ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback) -> None:
    runtime = entry.runtime_data
    async_add_entities(
        [
            XT500RecalculateButton(runtime),
            XT500CycleStartButton(runtime),
            XT500CycleResetButton(runtime),
        ]
    )
