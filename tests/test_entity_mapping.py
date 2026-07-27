"""Tests for automatic SunEnergyXT entity detection."""

from __future__ import annotations

from dataclasses import dataclass
import importlib.util
from pathlib import Path
import sys
from types import ModuleType
import unittest

ROOT = Path(__file__).parents[1]
PACKAGE = "custom_components.xt500_energy_manager"


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


if PACKAGE not in sys.modules:
    package = ModuleType(PACKAGE)
    package.__path__ = [str(ROOT / "custom_components" / "xt500_energy_manager")]
    sys.modules[PACKAGE] = package
else:
    package = sys.modules[PACKAGE]

if f"{PACKAGE}.const" not in sys.modules:
    _load_module(f"{PACKAGE}.const", Path(package.__path__[0]) / "const.py")
mapping_module = _load_module(
    f"{PACKAGE}.entity_mapping", Path(package.__path__[0]) / "entity_mapping.py"
)

from custom_components.xt500_energy_manager.const import (  # noqa: E402
    CONF_BATTERY_INPUT_POWER_ENTITY,
    CONF_BATTERY_OUTPUT_POWER_ENTITY,
    CONF_GRID_PORT_POWER_ENTITY,
    CONF_GRID_SETPOINT_ENTITY,
    CONF_INVERTER_SETPOINT_ENTITY,
    CONF_LOAD_DISCHARGE_LIMIT_ENTITY,
    CONF_LOAD_PORT_POWER_ENTITY,
    CONF_MAX_CHARGE_SOC_ENTITY,
    CONF_PV_POWER_ENTITY,
    CONF_SOC_ENTITY,
)

detect_xt500_entities = mapping_module.detect_xt500_entities


@dataclass
class RegistryEntry:
    entity_id: str
    unique_id: str
    platform: str = "sunenergyxt"


class EntityMappingTests(unittest.TestCase):
    def test_detects_original_entities_by_stable_unique_id_suffix(self):
        expected = {
            CONF_SOC_ENTITY: "sensor.xt_sc",
            CONF_PV_POWER_ENTITY: "sensor.xt_pv",
            CONF_GRID_PORT_POWER_ENTITY: "sensor.xt_gp",
            CONF_LOAD_PORT_POWER_ENTITY: "sensor.xt_lp",
            CONF_GRID_SETPOINT_ENTITY: "number.xt_gs",
            CONF_INVERTER_SETPOINT_ENTITY: "number.xt_is",
            CONF_MAX_CHARGE_SOC_ENTITY: "number.xt_sa",
            CONF_LOAD_DISCHARGE_LIMIT_ENTITY: "number.xt_so",
            CONF_BATTERY_INPUT_POWER_ENTITY: "sensor.xt_iw",
            CONF_BATTERY_OUTPUT_POWER_ENTITY: "sensor.xt_op",
        }
        entries = [
            RegistryEntry(entity_id, f"serial_123_{suffix}")
            for entity_id, suffix in (
                ("sensor.xt_sc", "SC"),
                ("sensor.xt_pv", "PV"),
                ("sensor.xt_gp", "GP"),
                ("sensor.xt_lp", "LP"),
                ("number.xt_gs", "GS"),
                ("number.xt_is", "IS"),
                ("number.xt_sa", "SA"),
                ("number.xt_so", "SO"),
                ("sensor.xt_iw", "IW"),
                ("sensor.xt_op", "OP"),
            )
        ]

        detected, missing, ambiguous = detect_xt500_entities(entries)

        self.assertEqual(expected, detected)
        self.assertEqual([], missing)
        self.assertEqual([], ambiguous)

    def test_optional_entities_may_be_missing(self):
        entries = [
            RegistryEntry(f"sensor.entity_{suffix.lower()}", f"serial_{suffix}")
            for suffix in ("SC", "PV", "GP", "LP")
        ] + [
            RegistryEntry(f"number.entity_{suffix.lower()}", f"serial_{suffix}")
            for suffix in ("GS", "IS", "SA")
        ]

        _detected, missing, ambiguous = detect_xt500_entities(entries)

        self.assertEqual([], missing)
        self.assertEqual([], ambiguous)

    def test_reports_missing_and_ambiguous_required_entities(self):
        entries = [
            RegistryEntry("sensor.first_sc", "serial_SC"),
            RegistryEntry("sensor.second_sc", "other_SC"),
        ]

        _detected, missing, ambiguous = detect_xt500_entities(entries)

        self.assertIn(CONF_SOC_ENTITY, ambiguous)
        self.assertIn(CONF_PV_POWER_ENTITY, missing)

    def test_ignores_entities_from_other_integrations(self):
        entries = [
            RegistryEntry("sensor.fake_sc", "serial_SC", platform="template")
        ]

        detected, missing, _ambiguous = detect_xt500_entities(entries)

        self.assertNotIn(CONF_SOC_ENTITY, detected)
        self.assertIn(CONF_SOC_ENTITY, missing)


if __name__ == "__main__":
    unittest.main()
