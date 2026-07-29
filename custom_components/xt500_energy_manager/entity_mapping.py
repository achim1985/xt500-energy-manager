"""Pure helpers for detecting original SunEnergyXT entities."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

from .const import (
    CONF_BATTERY_INPUT_POWER_ENTITY,
    CONF_BATTERY_OUTPUT_POWER_ENTITY,
    CONF_GRID_CHARGE_DAILY_ENERGY_ENTITY,
    CONF_GRID_EXPORT_DAILY_ENERGY_ENTITY,
    CONF_GRID_PORT_POWER_ENTITY,
    CONF_GRID_SETPOINT_ENTITY,
    CONF_INVERTER_SETPOINT_ENTITY,
    CONF_LOAD_DISCHARGE_LIMIT_ENTITY,
    CONF_LOAD_PORT_POWER_ENTITY,
    CONF_MAX_CHARGE_SOC_ENTITY,
    CONF_OFFGRID_DAILY_ENERGY_ENTITY,
    CONF_PV_DAILY_ENERGY_ENTITY,
    CONF_PV_POWER_ENTITY,
    CONF_SOC_ENTITY,
)

SUNENERGYXT_PLATFORM = "sunenergyxt"


@dataclass(frozen=True)
class EntityMapping:
    """Describe one original SunEnergyXT entity used by the manager."""

    config_key: str
    unique_id_suffix: str
    required: bool = True


XT500_ENTITY_MAPPINGS = (
    EntityMapping(CONF_SOC_ENTITY, "SC"),
    EntityMapping(CONF_PV_POWER_ENTITY, "PV"),
    EntityMapping(CONF_GRID_PORT_POWER_ENTITY, "GP"),
    EntityMapping(CONF_LOAD_PORT_POWER_ENTITY, "LP"),
    EntityMapping(CONF_GRID_SETPOINT_ENTITY, "GS"),
    EntityMapping(CONF_INVERTER_SETPOINT_ENTITY, "IS"),
    EntityMapping(CONF_MAX_CHARGE_SOC_ENTITY, "SA"),
    EntityMapping(CONF_LOAD_DISCHARGE_LIMIT_ENTITY, "SO", required=False),
    EntityMapping(CONF_BATTERY_INPUT_POWER_ENTITY, "IW", required=False),
    EntityMapping(CONF_BATTERY_OUTPUT_POWER_ENTITY, "OP", required=False),
    EntityMapping(CONF_PV_DAILY_ENERGY_ENTITY, "PD", required=False),
    EntityMapping(CONF_GRID_CHARGE_DAILY_ENERGY_ENTITY, "GD1", required=False),
    EntityMapping(CONF_GRID_EXPORT_DAILY_ENERGY_ENTITY, "GD2", required=False),
    EntityMapping(CONF_OFFGRID_DAILY_ENERGY_ENTITY, "LD", required=False),
)


def detect_xt500_entities(
    entries: Iterable[Any],
) -> tuple[dict[str, str], list[str], list[str]]:
    """Return detected entities plus missing and ambiguous config keys.

    Registry entries only need ``platform``, ``unique_id`` and ``entity_id``
    attributes, which keeps this helper testable without Home Assistant.
    """
    candidates: dict[str, list[str]] = {
        mapping.config_key: [] for mapping in XT500_ENTITY_MAPPINGS
    }

    for entry in entries:
        if getattr(entry, "platform", None) != SUNENERGYXT_PLATFORM:
            continue
        unique_id = str(getattr(entry, "unique_id", ""))
        entity_id = getattr(entry, "entity_id", None)
        if not entity_id:
            continue
        for mapping in XT500_ENTITY_MAPPINGS:
            if unique_id.endswith(f"_{mapping.unique_id_suffix}"):
                candidates[mapping.config_key].append(str(entity_id))

    detected: dict[str, str] = {}
    missing: list[str] = []
    ambiguous: list[str] = []
    for mapping in XT500_ENTITY_MAPPINGS:
        matches = list(dict.fromkeys(candidates[mapping.config_key]))
        if len(matches) == 1:
            detected[mapping.config_key] = matches[0]
        elif len(matches) > 1:
            ambiguous.append(mapping.config_key)
        elif mapping.required:
            missing.append(mapping.config_key)

    return detected, missing, ambiguous
