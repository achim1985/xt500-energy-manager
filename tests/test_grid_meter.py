"""HA adapter contract tests with scoped doubles (no live HA runtime)."""

import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).parents[1] / "custom_components/xt500_energy_manager"


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class Store:
    def __init__(self, hass, version, key, **kwargs):
        self.hass, self.key = hass, key
        self.scheduled = 0

    async def async_load(self):
        return self.hass.disk.get(self.key)

    def async_delay_save(self, fn, delay):
        self.scheduled += 1
        self.hass.disk[self.key] = fn()

    async def async_save(self, data):
        self.hass.disk[self.key] = data


class PowerConverter:
    VALID_UNITS = {"W", "kW"}

    @staticmethod
    def convert(value, unit, target):
        return value * (1000 if unit == "kW" else 1)


def state(value, unit="W", **attributes):
    return SimpleNamespace(state=value, attributes={"unit_of_measurement": unit, **attributes})


class GridMeterTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        names = ["homeassistant", "homeassistant.config_entries", "homeassistant.core", "homeassistant.const", "homeassistant.helpers", "homeassistant.helpers.event", "homeassistant.helpers.storage", "homeassistant.util", "homeassistant.util.unit_conversion", "grid_adapter_tests"]
        doubles = {name: ModuleType(name) for name in names}
        doubles["grid_adapter_tests"].__path__ = [str(ROOT)]
        doubles["homeassistant.config_entries"].ConfigEntry = object
        core = doubles["homeassistant.core"]
        core.Event = core.HomeAssistant = core.State = object
        core.callback = lambda fn: fn
        doubles["homeassistant.const"].UnitOfPower = SimpleNamespace(WATT="W")
        doubles["homeassistant.helpers.storage"].Store = Store
        doubles["homeassistant.util.unit_conversion"].PowerConverter = PowerConverter
        self.callbacks = []
        self.removed = []

        def subscribe(*args):
            self.callbacks.append(args)
            return lambda: self.removed.append(args)

        doubles["homeassistant.helpers.event"].async_track_state_change_event = subscribe
        doubles["homeassistant.helpers.event"].async_track_time_interval = subscribe
        self.modules = patch.dict(sys.modules, doubles)
        self.modules.start()
        self.addCleanup(self.modules.stop)
        load("grid_adapter_tests.const", ROOT / "const.py")
        load("grid_adapter_tests.grid_energy", ROOT / "grid_energy.py")
        self.module = load("grid_adapter_tests.grid_meter", ROOT / "grid_meter.py")
        self.now = 0
        self.clock = patch.object(self.module, "monotonic", lambda: self.now)
        self.clock.start()
        self.addCleanup(self.clock.stop)
        self.source = state("1000")
        self.hass = SimpleNamespace(disk={}, states=SimpleNamespace(get=lambda entity: self.source))
        self.entry = SimpleNamespace(entry_id="stable", data={"external_grid_power_entity": "sensor.meter"})

    async def start(self):
        meter = self.module.ExternalGridMeter(self.hass, self.entry)
        await meter.async_start()
        return meter

    def tick(self, meter, seconds):
        for _ in range(seconds // 60):
            self.now += 60
            meter._checkpoint(None)

    async def test_constant_power_hour_and_bounded_saves(self):
        meter = await self.start()
        self.tick(meter, 3600)
        self.assertAlmostEqual(meter.energy.import_energy, 1)
        self.assertEqual(meter._store.scheduled, 61)

    async def test_kw_and_inversion(self):
        self.source = state("1", "kW")
        self.entry.data["external_grid_invert"] = True
        meter = await self.start()
        self.tick(meter, 3600)
        self.assertEqual(meter.energy.power, -1000)
        self.assertAlmostEqual(meter.energy.export_energy, 1)

    async def test_invalid_states_and_outage(self):
        for invalid in (None, state(None), state("unknown"), state("unavailable"), state("abc"), state("nan"), state("inf"), state("1", "VA")):
            with self.subTest(invalid=invalid):
                self.now = 0
                self.hass.disk.clear()
                meter = await self.start()
                self.now = 30
                meter._sample(invalid)
                self.now = 7200
                meter._sample(state("1000"))
                self.tick(meter, 60)
                self.assertAlmostEqual(meter.energy.import_energy, 90 / 3600)
                await meter.async_stop()

    async def test_restart_source_change_and_listener_cleanup(self):
        meter = await self.start()
        self.tick(meter, 1800)
        await meter.async_stop()
        await meter.async_stop()
        self.assertEqual(len(self.removed), 2)
        self.now = 99999
        self.entry.data["external_grid_power_entity"] = "sensor.other"
        self.source = state("-500")
        restarted = await self.start()
        self.tick(restarted, 1800)
        self.assertAlmostEqual(restarted.energy.import_energy, .5)
        self.assertAlmostEqual(restarted.energy.export_energy, .25)

    async def test_units_change_omits_uncertain_interval(self):
        meter = await self.start()
        self.now = 30
        meter._sample(state("1", "kW"))
        self.tick(meter, 60)
        self.assertAlmostEqual(meter.energy.import_energy, 60 / 3600)

    async def test_late_scheduler_omits_suspend(self):
        meter = await self.start()
        self.now = 99999
        meter._checkpoint(None)
        self.assertEqual(meter.energy.import_energy, 0)
        self.tick(meter, 60)
        self.assertAlmostEqual(meter.energy.import_energy, 60 / 3600)

    async def test_restored_and_recursive_sources_ignored(self):
        for source in (state("1000", restored=True), state("1000", xt500_key="grid_power_net")):
            self.source = source
            meter = await self.start()
            self.tick(meter, 60)
            self.assertIsNone(meter.energy.power)
            self.assertEqual(meter.energy.import_energy, 0)

    async def test_frequent_events_do_not_debounce_storage_forever(self):
        meter = await self.start()
        for i in range(1, 181):
            self.now = i
            meter._state_changed(SimpleNamespace(data={"new_state": state("1000")}))
        self.assertEqual(meter._store.scheduled, 4)
        self.assertAlmostEqual(self.hass.disk[meter._store.key]["import_energy"], .05)
