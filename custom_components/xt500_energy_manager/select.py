"""Select platform for XT500 Energy Manager."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity, SelectEntityDescription
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import XT500ConfigEntry
from .const import (
    BASE_MODES,
    CHARGE_MODES,
    SETTING_AUTO_MODE,
    SETTING_BASE_MODE,
    SETTING_MANUAL_MODE,
)
from .entity import XT500Entity
from .runtime import XT500Runtime

SELECTS = (
    SelectEntityDescription(key=SETTING_MANUAL_MODE, translation_key="manual_mode", icon="mdi:tune", options=CHARGE_MODES),
    SelectEntityDescription(key=SETTING_AUTO_MODE, translation_key="automatic_mode", icon="mdi:tune-variant", options=CHARGE_MODES),
    SelectEntityDescription(key=SETTING_BASE_MODE, translation_key="base_mode", icon="mdi:transmission-tower-export", options=BASE_MODES),
)


class XT500Select(XT500Entity, SelectEntity):
    def __init__(self, runtime: XT500Runtime, description: SelectEntityDescription) -> None:
        super().__init__(runtime, description.key)
        self.entity_description = description

    @property
    def current_option(self) -> str:
        return str(self.runtime.settings[self.key])

    async def async_select_option(self, option: str) -> None:
        if option not in self.options:
            raise ValueError(f"Unsupported option: {option}")
        self.runtime.async_set_setting(self.key, option)


async def async_setup_entry(_hass: HomeAssistant, entry: XT500ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback) -> None:
    async_add_entities(XT500Select(entry.runtime_data, description) for description in SELECTS)
