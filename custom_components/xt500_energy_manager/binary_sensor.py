"""Binary sensor platform for XT500 Energy Manager."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from homeassistant.components.binary_sensor import BinarySensorEntity, BinarySensorEntityDescription
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import XT500ConfigEntry
from .entity import XT500Entity
from .runtime import XT500Runtime


@dataclass(frozen=True, kw_only=True)
class XT500BinaryDescription(BinarySensorEntityDescription):
    value_fn: Callable[[XT500Runtime], bool]


BINARY_SENSORS = (
    XT500BinaryDescription(key="data_valid", translation_key="data_valid", icon="mdi:database-check", value_fn=lambda r: r.data_valid),
    XT500BinaryDescription(key="cycle_due", translation_key="cycle_due", icon="mdi:battery-sync", value_fn=lambda r: r.automatic_cycle_requested),
    XT500BinaryDescription(key="charge_request", translation_key="charge_request", icon="mdi:battery-arrow-up", value_fn=lambda r: r.charge_request_active),
    XT500BinaryDescription(key="control_ready", translation_key="control_ready", icon="mdi:shield-check", value_fn=lambda r: r.control_ready),
    XT500BinaryDescription(key="feedback_ready", translation_key="feedback_ready", icon="mdi:database-sync", value_fn=lambda r: r.feedback_ready),
    XT500BinaryDescription(key="pv_release_active", translation_key="pv_release_active", icon="mdi:solar-power", value_fn=lambda r: r.pv_release_active),
)


class XT500BinarySensor(XT500Entity, BinarySensorEntity):
    def __init__(self, runtime: XT500Runtime, description: XT500BinaryDescription) -> None:
        super().__init__(runtime, description.key)
        self.entity_description = description

    @property
    def is_on(self) -> bool:
        return self.entity_description.value_fn(self.runtime)

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        attrs: dict[str, object] = dict(super().extra_state_attributes)
        if self.key == "data_valid":
            attrs["invalid_entities"] = self.runtime.invalid_entities
        return attrs


async def async_setup_entry(_hass: HomeAssistant, entry: XT500ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback) -> None:
    async_add_entities(XT500BinarySensor(entry.runtime_data, description) for description in BINARY_SENSORS)
