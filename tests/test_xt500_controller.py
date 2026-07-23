"""Unit tests for the Home Assistant independent XT500 production controller."""

from __future__ import annotations

import importlib.util
from datetime import UTC, datetime, timedelta
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


package = ModuleType(PACKAGE)
package.__path__ = [str(ROOT / "custom_components" / "xt500_energy_manager")]
sys.modules[PACKAGE] = package
_load_module(f"{PACKAGE}.const", Path(package.__path__[0]) / "const.py")
controller = _load_module(f"{PACKAGE}.controller", Path(package.__path__[0]) / "controller.py")


class ControllerTest(unittest.TestCase):
    def input(self, **changes):
        values = {
            "soc": 50,
            "pv_power": 900,
            "grid_power": 100,
            "grid_port_power": 600,
            "load_port_power": 300,
            "current_grid_setpoint": 0,
            "current_inverter_setpoint": 500,
        }
        values.update(changes)
        return controller.ControlInput(**values)

    def test_pv_priority_never_requests_grid_charge(self):
        result = controller.calculate_control(
            self.input(),
            controller.ControlSettings(
                charge_active=True,
                charge_source="manual",
                charge_mode="pv_priority",
                meter_export_positive=False,
            ),
        )
        self.assertGreaterEqual(result.recommended_grid_setpoint, 0)
        self.assertEqual(result.active_mode, "pv_priority")

    def test_grid_charge_requests_configured_negative_setpoint(self):
        result = controller.calculate_control(
            self.input(),
            controller.ControlSettings(
                charge_active=True,
                charge_source="automatic",
                charge_mode="grid_charge",
                charge_power=1200,
                meter_export_positive=False,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, -1200)
        self.assertIn("automatic", result.status)

    def test_pv_surplus_cannot_exceed_available_pv(self):
        result = controller.calculate_control(
            self.input(pv_power=740, grid_power=-50, grid_port_power=500),
            controller.ControlSettings(
                charge_active=True,
                charge_mode="pv_surplus",
                meter_export_positive=False,
            ),
        )
        self.assertLessEqual(result.recommended_grid_setpoint, 740)
        self.assertEqual(
            result.recommended_grid_setpoint,
            result.recommended_inverter_setpoint,
        )

    def test_target_soc_ends_charge_recommendation(self):
        result = controller.calculate_control(
            self.input(soc=100),
            controller.ControlSettings(
                charge_active=True,
                charge_mode="grid_charge",
                target_soc=100,
                meter_export_positive=False,
            ),
        )
        self.assertTrue(result.target_reached)
        self.assertEqual(result.status, "target_reached")
        self.assertGreaterEqual(result.recommended_grid_setpoint, 0)

    def test_normal_operation_does_not_treat_manual_target_as_reached(self):
        result = controller.calculate_control(
            self.input(soc=100),
            controller.ControlSettings(
                charge_active=False,
                target_soc=50,
                meter_export_positive=False,
            ),
        )
        self.assertFalse(result.target_reached)
        self.assertEqual(result.status, "normal")

    def test_charge_limit_returns_to_normal_after_target_charge(self):
        self.assertEqual(
            controller.select_charge_limit(
                normal_limit=80,
                target_soc=100,
                charge_active=True,
                low=70,
                high=100,
                step=1,
            ),
            100,
        )
        self.assertEqual(
            controller.select_charge_limit(
                normal_limit=80,
                target_soc=100,
                charge_active=False,
                low=70,
                high=100,
                step=1,
            ),
            80,
        )

    def test_charge_limit_respects_device_range(self):
        self.assertEqual(
            controller.select_charge_limit(
                normal_limit=60,
                target_soc=65,
                charge_active=False,
                low=70,
                high=100,
                step=1,
            ),
            70,
        )

    def test_low_soc_blocks_discharge(self):
        result = controller.calculate_control(
            self.input(soc=9),
            controller.ControlSettings(minimum_soc=10, meter_export_positive=False),
        )
        self.assertTrue(result.discharge_blocked)
        self.assertLessEqual(result.recommended_grid_setpoint, 0)

    def test_unsigned_xt500_power_is_decoded(self):
        self.assertEqual(controller.decode_signed_16(65500), -36)
        self.assertEqual(controller.decode_signed_16(300), 300)

    def test_xt500_grid_output_is_limited_to_800_watts(self):
        result = controller.calculate_control(
            self.input(grid_power=2000, grid_port_power=300),
            controller.ControlSettings(
                grid_limit=800,
                inverter_limit=2400,
                meter_export_positive=False,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, 800)
        self.assertGreater(result.recommended_inverter_setpoint, 800)

    def test_xt500_pro_keeps_2400_watt_range(self):
        result = controller.calculate_control(
            self.input(grid_power=2100, grid_port_power=300),
            controller.ControlSettings(
                grid_limit=2400,
                inverter_limit=2400,
                meter_export_positive=False,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, 2400)
        self.assertEqual(result.recommended_inverter_setpoint, 2400)

    def test_legacy_charge_modes_are_normalized(self):
        expected = {
            "Netzladung": "grid_charge",
            "PV-Überschuss": "pv_surplus",
            "PV-Direkt-Bypass": "pv_surplus",
            "PV-Vorrang": "pv_priority",
            "Nur PV": "pv_priority",
            "PV + Netz": "pv_and_grid",
        }
        for legacy, normalized in expected.items():
            with self.subTest(legacy=legacy):
                self.assertEqual(controller.normalize_charge_mode(legacy), normalized)

    def test_legacy_base_mode_is_normalized(self):
        self.assertEqual(controller.normalize_base_mode("Normalbetrieb"), "normal")
        self.assertEqual(controller.normalize_base_mode("PV-Überschuss"), "pv_surplus")

    def test_live_setpoint_change_is_limited_per_write(self):
        self.assertEqual(
            controller.limit_setpoint_change(0, 1200, -2400, 2400, 10, 200),
            200,
        )
        self.assertEqual(
            controller.limit_setpoint_change(0, -1200, -2400, 2400, 10, 200),
            -200,
        )

    def test_live_setpoint_change_respects_device_limits_after_rounding(self):
        self.assertEqual(
            controller.limit_setpoint_change(90, 200, -95, 95, 10, 200),
            95,
        )

    def test_adaptive_control_uses_small_band_below_first_threshold(self):
        profile = controller.select_adaptive_control_profile(
            7,
            small_error=8,
            large_error=150,
            slow_interval=3,
            medium_interval=2.5,
            fast_interval=1,
            small_maximum_change=20,
            medium_maximum_change=120,
            large_maximum_change=600,
        )
        self.assertEqual(profile.band, "small")
        self.assertEqual(profile.interval, 3)
        self.assertEqual(profile.maximum_change, 20)

    def test_adaptive_control_uses_medium_band_at_small_threshold(self):
        profile = controller.select_adaptive_control_profile(
            80,
            small_error=8,
            large_error=150,
            slow_interval=3,
            medium_interval=2.5,
            fast_interval=1,
            small_maximum_change=20,
            medium_maximum_change=120,
            large_maximum_change=600,
        )
        self.assertEqual(profile.band, "medium")
        self.assertEqual(profile.interval, 2.5)
        self.assertEqual(profile.maximum_change, 120)

    def test_adaptive_control_uses_large_band_at_large_threshold(self):
        profile = controller.select_adaptive_control_profile(
            900,
            small_error=8,
            large_error=150,
            slow_interval=3,
            medium_interval=2.5,
            fast_interval=1,
            small_maximum_change=20,
            medium_maximum_change=120,
            large_maximum_change=600,
        )
        self.assertEqual(profile.band, "large")
        self.assertEqual(profile.interval, 1)
        self.assertEqual(profile.maximum_change, 600)

    def test_overall_control_error_uses_largest_deviation(self):
        self.assertEqual(
            controller.overall_control_error(
                public_grid_power=250,
                public_grid_target=-10,
                current_grid_setpoint=0,
                requested_grid_setpoint=100,
                current_inverter_setpoint=500,
                requested_inverter_setpoint=650,
            ),
            260,
        )

    def test_feedback_waits_for_every_source_after_write(self):
        last_write = datetime.now(UTC)
        self.assertFalse(
            controller.feedback_samples_are_fresh(
                last_write,
                [last_write + timedelta(seconds=1), last_write],
            )
        )
        self.assertTrue(
            controller.feedback_samples_are_fresh(
                last_write,
                [
                    last_write + timedelta(seconds=1),
                    last_write + timedelta(seconds=2),
                ],
            )
        )

    def test_recovery_delays_use_limited_backoff(self):
        self.assertEqual(controller.recovery_delay_seconds(60, 0), 60)
        self.assertEqual(controller.recovery_delay_seconds(60, 1), 300)
        self.assertEqual(controller.recovery_delay_seconds(60, 2), 900)
        self.assertIsNone(controller.recovery_delay_seconds(60, 3))

    def test_recovery_delay_never_drops_below_one_second(self):
        self.assertEqual(controller.recovery_delay_seconds(0, 0), 1)
        self.assertIsNone(controller.recovery_delay_seconds(60, -1))

    def test_transient_write_retry_uses_feedback_based_backoff(self):
        self.assertEqual(controller.write_retry_delay_seconds(6, 1), 6)
        self.assertEqual(controller.write_retry_delay_seconds(6, 2), 12)

    def test_transient_write_retry_stops_after_two_retries(self):
        self.assertIsNone(controller.write_retry_delay_seconds(6, 3))

    def test_low_pv_stops_release_immediately(self):
        decision = controller.update_pv_release(
            active=True,
            pv_power=50,
            stop_power=50,
            start_power=80,
            start_delay=30,
            above_start_since=None,
            now=100,
        )
        self.assertFalse(decision.active)
        self.assertIsNone(decision.remaining_delay)

    def test_pv_release_requires_continuous_time_above_start_power(self):
        waiting = controller.update_pv_release(
            active=False,
            pv_power=81,
            stop_power=50,
            start_power=80,
            start_delay=30,
            above_start_since=None,
            now=100,
        )
        self.assertFalse(waiting.active)
        self.assertEqual(waiting.above_start_since, 100)
        self.assertEqual(waiting.remaining_delay, 30)

        released = controller.update_pv_release(
            active=False,
            pv_power=90,
            stop_power=50,
            start_power=80,
            start_delay=30,
            above_start_since=waiting.above_start_since,
            now=130,
        )
        self.assertTrue(released.active)

    def test_pv_release_timer_resets_below_start_power(self):
        decision = controller.update_pv_release(
            active=False,
            pv_power=70,
            stop_power=50,
            start_power=80,
            start_delay=30,
            above_start_since=100,
            now=110,
        )
        self.assertFalse(decision.active)
        self.assertIsNone(decision.above_start_since)

    def test_pv_surplus_lockout_sets_both_setpoints_to_zero(self):
        result = controller.calculate_control(
            self.input(pv_power=40),
            controller.ControlSettings(
                base_mode="pv_surplus",
                meter_export_positive=False,
                pv_release_allowed=False,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, 0)
        self.assertEqual(result.recommended_inverter_setpoint, 0)


if __name__ == "__main__":
    unittest.main()
