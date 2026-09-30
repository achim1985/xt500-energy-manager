"""Execute UI schema and sensor contracts with lightweight HA doubles."""
import ast
import json
from pathlib import Path
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).parents[1] / "custom_components/xt500_energy_manager"


def functions(filename, names, env):
    tree = ast.parse((ROOT / filename).read_text())
    nodes = [ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0)]
    nodes += [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and n.name in names]
    exec(compile(ast.fix_missing_locations(ast.Module(body=nodes, type_ignores=[])), filename, "exec"), env)


class Marker:
    def __init__(self, schema, **kwargs):
        self.schema, self.kwargs = schema, kwargs


class BaseEntity:
    def __init__(self, runtime, key):
        self.runtime, self.key = runtime, key


class GridContracts(unittest.IsolatedAsyncioTestCase):
    def test_optional_selector_and_default_in_both_flows(self):
        env = {}
        exec((ROOT / "const.py").read_text(), env)
        factory = lambda **kwargs: SimpleNamespace(**kwargs)
        selector = SimpleNamespace(
            EntitySelector=lambda config: config, EntitySelectorConfig=factory,
            DeviceSelector=lambda config: config, DeviceSelectorConfig=factory,
            BooleanSelector=lambda: "boolean", SelectSelector=lambda config: config,
            SelectSelectorConfig=factory, SelectSelectorMode=SimpleNamespace(DROPDOWN="dropdown"),
        )
        env.update(selector=selector, vol=SimpleNamespace(Required=Marker, Optional=Marker, Schema=lambda s: s))
        functions("config_flow.py", {"_entity_selector", "_external_grid_schema", "_manual_schema", "_automatic_schema"}, env)
        for name in ("_manual_schema", "_automatic_schema"):
            schema = env[name]()
            marker, value = next((k, v) for k, v in schema.items() if k.schema == "external_grid_power_entity")
            self.assertEqual(marker.kwargs, {})
            self.assertEqual((value.domain, value.device_class), ("sensor", "power"))
            invert = next(k for k in schema if k.schema == "external_grid_invert")
            self.assertIs(invert.kwargs["default"], False)
            modified = env[name]({"external_grid_invert": True})
            self.assertTrue(next(k for k in modified if k.schema == "external_grid_invert").kwargs["default"])

    async def test_optional_entities_and_energy_dashboard_metadata(self):
        env = dict(XT500Entity=BaseEntity, SensorEntity=type("Sensor", (), {}),
                   SensorDeviceClass=SimpleNamespace(ENERGY="energy", POWER="power"),
                   SensorStateClass=SimpleNamespace(TOTAL_INCREASING="total_increasing", MEASUREMENT="measurement"),
                   UnitOfEnergy=SimpleNamespace(KILO_WATT_HOUR="kWh"), UnitOfPower=SimpleNamespace(WATT="W"),
                   SENSORS=(), XT500Sensor=lambda *args: None)
        functions("sensor.py", {"XT500GridSensor", "async_setup_entry"}, env)
        energy = SimpleNamespace(power=-420, import_energy=3, export_energy=2)
        runtime = SimpleNamespace(grid_meter=SimpleNamespace(energy=energy))
        entities = []
        await env["async_setup_entry"](None, SimpleNamespace(runtime_data=runtime), lambda items: entities.extend(items))
        self.assertEqual(len(entities), 5)
        self.assertEqual([e.native_value for e in entities], [-420, 0, 420, 3, 2])
        for entity in entities[-2:]:
            self.assertEqual(entity._attr_device_class, "energy")
            self.assertEqual(entity._attr_state_class, "total_increasing")
            self.assertEqual(entity._attr_native_unit_of_measurement, "kWh")
        for entity in entities[:3]:
            self.assertEqual(entity._attr_state_class, "measurement")
        energy.power = None
        self.assertFalse(entities[0].available)
        self.assertTrue(entities[-1].available)
        self.assertEqual(entities[-1].native_value, 2)
        runtime.grid_meter = None
        entities.clear()
        await env["async_setup_entry"](None, SimpleNamespace(runtime_data=runtime), lambda items: entities.extend(items))
        self.assertEqual(entities, [])

    def test_ids_and_translations(self):
        self.assertIn('super().__init__(runtime, key)', (ROOT / "sensor.py").read_text())
        self.assertIn('f"{runtime.entry.entry_id}_{key}"', (ROOT / "entity.py").read_text())
        for file in ("strings.json", "translations/de.json", "translations/en.json"):
            d = json.loads((ROOT / file).read_text())
            for key in ("grid_power_net", "grid_import_power", "grid_export_power", "grid_import_energy", "grid_export_energy"):
                self.assertIn(key, d["entity"]["sensor"])
            for flow in ("config", "options"):
                for step in ("automatic", "manual"):
                    self.assertIn("external_grid_power_entity", d[flow]["step"][step]["data"])
