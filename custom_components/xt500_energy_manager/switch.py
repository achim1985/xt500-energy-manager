"""Switch platform for XT500 Energy Manager."""

from __future__ import annotations

from homeassistant.components.switch import SwitchEntity, SwitchEntityDescription
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import XT500ConfigEntry
from .const import (
    SETTING_AUTO_ENABLED,
    SETTING_MANUAL_ACTIVE,
    SETTING_REGULATION_ENABLED,
    SETTING_SHOW_ADVANCED,
)
from .entity import XT500Entity
from .runtime import XT500Runtime

SWITCHES = (
    SwitchEntityDescription(key=SETTING_REGULATION_ENABLED, translation_key="regulation_enabled", icon="mdi:power"),
    SwitchEntityDescription(key=SETTING_MANUAL_ACTIVE, translation_key="manual_active", icon="mdi:battery-arrow-up"),
    SwitchEntityDescription(key=SETTING_AUTO_ENABLED, translation_key="automatic_enabled", icon="mdi:battery-sync"),
    SwitchEntityDescription(key=SETTING_SHOW_ADVANCED, translation_key="show_advanced", icon="mdi:tune-vertical"),
)


class XT500Switch(XT500Entity, SwitchEntity):
    def __init__(self, runtime: XT500Runtime, description: SwitchEntityDescription) -> None:
        super().__init__(runtime, description.key)
        self.entity_description = description

    @property
    def is_on(self) -> bool:
        return bool(self.runtime.settings[self.key])

    async def async_turn_on(self, **_kwargs) -> None:
        if self.key == SETTING_REGULATION_ENABLED:
            await self.runtime.async_set_regulation_enabled(True)
            return
        self.runtime.async_set_setting(self.key, True)

    async def async_turn_off(self, **_kwargs) -> None:
        if self.key == SETTING_REGULATION_ENABLED:
            await self.runtime.async_set_regulation_enabled(False)
            return
        self.runtime.async_set_setting(self.key, False)


async def async_setup_entry(_hass: HomeAssistant, entry: XT500ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback) -> None:
    async_add_entities(XT500Switch(entry.runtime_data, description) for description in SWITCHES)
