"""Numerical grid accounting tests without a Home Assistant installation."""

import importlib.util
from pathlib import Path
import sys
import unittest

PATH = Path(__file__).parents[1] / "custom_components/xt500_energy_manager/grid_energy.py"
spec = importlib.util.spec_from_file_location("xt500_grid_energy_tests", PATH)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
GridEnergy = module.GridEnergy


class GridEnergyTests(unittest.TestCase):
    def test_import_hour(self):
        meter = GridEnergy()
        meter.sample(1000, 0)
        meter.sample(0, 3600)
        self.assertEqual(meter.snapshot(), {"import_energy": 1, "export_energy": 0})

    def test_export_hour(self):
        meter = GridEnergy()
        meter.sample(-1000, 0)
        meter.advance(3600)
        self.assertEqual(meter.snapshot(), {"import_energy": 0, "export_energy": 1})

    def test_direction_change(self):
        meter = GridEnergy()
        meter.sample(1000, 0)
        meter.sample(-500, 1800)
        meter.sample(0, 3600)
        self.assertEqual(meter.snapshot(), {"import_energy": .5, "export_energy": .25})

    def test_outage_not_backfilled(self):
        meter = GridEnergy()
        meter.sample(1000, 0)
        meter.sample(None, 1800)
        meter.sample(1000, 9000)
        meter.advance(10800)
        self.assertEqual(meter.import_energy, 1)

    def test_restart_restores_totals_without_elapsed_time(self):
        meter = GridEnergy()
        meter.sample(1000, 0)
        meter.advance(1800)
        restarted = GridEnergy()
        restarted.restore(meter.snapshot())
        self.assertIsNone(restarted.timestamp)
        restarted.sample(-500, 99999)
        restarted.advance(101799)
        self.assertEqual(restarted.snapshot(), {"import_energy": .5, "export_energy": .25})

    def test_minute_checkpoints_do_not_double_count(self):
        meter = GridEnergy()
        meter.sample(1000, 0)
        for t in range(60, 3601, 60):
            meter.advance(t)
        meter.sample(0, 3600)
        self.assertAlmostEqual(meter.import_energy, 1)

    def test_non_finite_samples(self):
        for value in (float("nan"), float("inf"), float("-inf")):
            meter = GridEnergy()
            meter.sample(value, 0)
            meter.advance(3600)
            self.assertEqual(meter.import_energy, 0)
            self.assertEqual(meter.export_energy, 0)

    def test_invalid_stored_values(self):
        meter = GridEnergy()
        meter.restore({"import_energy": -1, "export_energy": float("nan")})
        self.assertEqual(meter.snapshot(), {"import_energy": 0, "export_energy": 0})

    def test_discontinuity_and_backwards_clock(self):
        meter = GridEnergy()
        meter.sample(1000, 100)
        meter.sample(1000, 100000, discontinuity=True)
        self.assertEqual(meter.import_energy, 0)
        meter.advance(10)
        self.assertIsNone(meter.power)
        self.assertEqual(meter.import_energy, 0)
