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


async def async_setup_entry(_hass: HomeAssistant, entry: XT500ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback) -> None:
    async_add_entities([XT500RecalculateButton(entry.runtime_data)])
