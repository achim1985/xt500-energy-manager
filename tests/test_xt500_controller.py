"""Unit tests for the Home Assistant independent XT500 production controller."""

from __future__ import annotations

import importlib.util
from datetime import UTC, datetime, time, timedelta
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

    def test_ac_pv_sign_is_normalized_without_turning_consumption_into_pv(self):
        self.assertEqual(
            controller.normalize_pv_production(-600, production_negative=True),
            600,
        )
        self.assertEqual(
            controller.normalize_pv_production(600, production_negative=False),
            600,
        )
        self.assertEqual(
            controller.normalize_pv_production(40, production_negative=True),
            0,
        )

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

    def test_grid_charge_is_not_limited_by_positive_house_output_limit(self):
        result = controller.calculate_control(
            self.input(),
            controller.ControlSettings(
                charge_active=True,
                charge_source="manual",
                charge_mode="grid_charge",
                charge_power=2400,
                grid_limit=800,
                inverter_limit=2400,
                meter_export_positive=False,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, -2400)
        self.assertEqual(result.active_mode, "grid_charge")

    def test_pv_and_grid_charge_uses_independent_charge_power_limit(self):
        result = controller.calculate_control(
            self.input(),
            controller.ControlSettings(
                charge_active=True,
                charge_source="manual",
                charge_mode="pv_and_grid",
                charge_power=1800,
                grid_limit=800,
                inverter_limit=2400,
                meter_export_positive=False,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, -1800)

    def test_pv_and_grid_subtracts_pv_available_for_battery(self):
        result = controller.calculate_control(
            self.input(
                pv_power=1400,
                grid_power=0,
                grid_port_power=300,
                load_port_power=0,
            ),
            controller.ControlSettings(
                charge_active=True,
                charge_source="manual",
                charge_mode="pv_and_grid",
                charge_power=1200,
                grid_limit=800,
                inverter_limit=2400,
                target_grid_power=0,
                meter_export_positive=False,
            ),
        )
        # 300 W PV supplies the house, 1100 W PV remains for charging, and
        # the grid provides only the missing 100 W of the 1200 W target.
        self.assertEqual(result.recommended_inverter_setpoint, 300)
        self.assertEqual(result.recommended_grid_setpoint, -100)

    def test_pv_and_grid_needs_no_grid_when_pv_covers_charge_target(self):
        result = controller.calculate_control(
            self.input(
                pv_power=1600,
                grid_power=0,
                grid_port_power=300,
                load_port_power=0,
            ),
            controller.ControlSettings(
                charge_active=True,
                charge_source="automatic",
                charge_mode="pv_and_grid",
                charge_power=1200,
                target_grid_power=0,
                meter_export_positive=False,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, 0)

    def test_grid_charge_keeps_fixed_grid_request_with_available_pv(self):
        result = controller.calculate_control(
            self.input(
                pv_power=1600,
                grid_power=0,
                grid_port_power=300,
                load_port_power=0,
            ),
            controller.ControlSettings(
                charge_active=True,
                charge_source="manual",
                charge_mode="grid_charge",
                charge_power=1200,
                grid_limit=800,
                inverter_limit=2400,
                target_grid_power=0,
                meter_export_positive=False,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, -1200)

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

    def test_ac_only_pv_surplus_absorbs_export_without_grid_import(self):
        result = controller.calculate_control(
            self.input(
                pv_power=0,
                ac_pv_power=600,
                grid_power=600,
                grid_port_power=0,
                load_port_power=0,
                current_grid_setpoint=0,
                current_inverter_setpoint=0,
            ),
            controller.ControlSettings(
                charge_active=True,
                charge_source="manual",
                charge_mode="pv_surplus",
                charge_power=1200,
                meter_export_positive=True,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, -600)
        self.assertEqual(result.recommended_inverter_setpoint, 0)
        self.assertEqual(result.available_ac_surplus, 600)
        self.assertEqual(result.active_coupling_mode, "ac")
        self.assertEqual(result.active_energy_source, "pv")

    def test_automatic_cycle_pv_surplus_uses_reconstructed_ac_export(self):
        result = controller.calculate_control(
            self.input(
                pv_power=0,
                ac_pv_power=0,
                grid_power=600,
                grid_port_power=0,
                load_port_power=0,
                current_grid_setpoint=0,
                current_inverter_setpoint=0,
            ),
            controller.ControlSettings(
                charge_active=True,
                charge_source="cycle_automatic",
                charge_mode="pv_surplus",
                coupling_mode="ac",
                charge_power=1200,
                meter_export_positive=True,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, -600)
        self.assertEqual(result.available_ac_surplus, 600)
        self.assertEqual(result.active_coupling_mode, "ac")
        self.assertEqual(result.status, "cycle_automatic_pv_surplus")
        self.assertEqual(result.active_energy_source, "pv")

    def test_ac_only_pv_priority_absorbs_only_available_surplus(self):
        result = controller.calculate_control(
            self.input(
                pv_power=0,
                ac_pv_power=600,
                grid_power=600,
                grid_port_power=0,
                load_port_power=0,
                current_grid_setpoint=0,
                current_inverter_setpoint=0,
            ),
            controller.ControlSettings(
                charge_active=True,
                charge_source="cycle_automatic",
                charge_mode="pv_priority",
                charge_power=1200,
                meter_export_positive=True,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, -600)
        self.assertEqual(result.mode_state, "charging")

    def test_ac_only_pv_and_grid_uses_pv_towards_total_charge_target(self):
        result = controller.calculate_control(
            self.input(
                pv_power=0,
                ac_pv_power=600,
                grid_power=600,
                grid_port_power=0,
                load_port_power=0,
            ),
            controller.ControlSettings(
                charge_active=True,
                charge_source="manual",
                charge_mode="pv_and_grid",
                charge_power=1200,
                meter_export_positive=True,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, -1200)
        self.assertEqual(result.effective_public_grid_target, -600)
        self.assertEqual(result.active_energy_source, "pv_and_grid")

    def test_ac_only_grid_charge_preserves_configured_public_grid_share(self):
        result = controller.calculate_control(
            self.input(
                pv_power=0,
                ac_pv_power=600,
                grid_power=600,
                grid_port_power=0,
                load_port_power=0,
            ),
            controller.ControlSettings(
                charge_active=True,
                charge_source="manual",
                charge_mode="grid_charge",
                charge_power=1200,
                meter_export_positive=True,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, -1800)
        self.assertEqual(result.effective_public_grid_target, -1200)

    def test_grid_charge_respects_real_negative_device_range(self):
        result = controller.calculate_control(
            self.input(
                pv_power=0,
                ac_pv_power=1000,
                grid_power=1000,
                grid_port_power=0,
                load_port_power=0,
            ),
            controller.ControlSettings(
                charge_active=True,
                charge_mode="grid_charge",
                charge_power=2400,
                grid_charge_limit=2400,
                meter_export_positive=True,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, -2400)
        self.assertEqual(result.effective_public_grid_target, -1400)

    def test_mixed_pv_and_grid_counts_dc_and_ac_without_double_subtraction(self):
        result = controller.calculate_control(
            self.input(
                pv_power=1000,
                ac_pv_power=500,
                grid_power=300,
                grid_port_power=0,
                load_port_power=0,
                current_inverter_setpoint=0,
            ),
            controller.ControlSettings(
                charge_active=True,
                charge_mode="pv_and_grid",
                charge_power=1200,
                meter_export_positive=True,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, -200)
        self.assertEqual(result.active_coupling_mode, "hybrid")
        self.assertEqual(result.active_energy_source, "pv_and_grid")

    def test_waiting_pv_mode_stays_selected_and_active(self):
        result = controller.calculate_control(
            self.input(
                pv_power=0,
                ac_pv_power=0,
                grid_power=0,
                grid_port_power=0,
                current_inverter_setpoint=0,
            ),
            controller.ControlSettings(
                charge_active=True,
                charge_source="cycle_automatic",
                charge_mode="pv_priority",
                coupling_mode="automatic",
            ),
        )
        self.assertEqual(result.selected_mode, "pv_priority")
        self.assertEqual(result.active_mode, "pv_priority")
        self.assertEqual(result.mode_state, "waiting_for_pv")
        self.assertEqual(result.selected_coupling_mode, "automatic")
        self.assertEqual(result.active_coupling_mode, "none")

    def test_ac_and_dc_release_gates_do_not_unlock_each_other(self):
        result = controller.calculate_control(
            self.input(
                pv_power=500,
                ac_pv_power=600,
                grid_power=600,
                grid_port_power=0,
                load_port_power=0,
                current_inverter_setpoint=0,
            ),
            controller.ControlSettings(
                charge_active=True,
                charge_mode="pv_surplus",
                pv_release_allowed=False,
                ac_pv_release_allowed=True,
                meter_export_positive=True,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, -600)
        self.assertEqual(result.recommended_inverter_setpoint, 0)
        self.assertEqual(result.active_coupling_mode, "ac")

    def test_normal_mode_waits_for_ac_release_before_absorbing_small_surplus(self):
        blocked = controller.calculate_control(
            self.input(
                pv_power=0,
                grid_power=40,
                grid_port_power=0,
                load_port_power=0,
                current_inverter_setpoint=0,
            ),
            controller.ControlSettings(
                charge_active=False,
                ac_pv_release_allowed=False,
                meter_export_positive=True,
            ),
        )
        released = controller.calculate_control(
            self.input(
                pv_power=0,
                grid_power=100,
                grid_port_power=0,
                load_port_power=0,
                current_inverter_setpoint=0,
            ),
            controller.ControlSettings(
                charge_active=False,
                ac_pv_release_allowed=True,
                meter_export_positive=True,
            ),
        )
        self.assertEqual(blocked.recommended_grid_setpoint, 0)
        self.assertEqual(released.recommended_grid_setpoint, -100)

    def test_dc_only_coupling_does_not_use_reconstructed_ac_surplus(self):
        result = controller.calculate_control(
            self.input(
                pv_power=0,
                ac_pv_power=600,
                grid_power=600,
                grid_port_power=0,
                load_port_power=0,
            ),
            controller.ControlSettings(
                charge_active=True,
                charge_mode="pv_surplus",
                coupling_mode="dc",
                meter_export_positive=True,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, 0)
        self.assertEqual(result.available_ac_surplus, 0)
        self.assertEqual(result.mode_state, "waiting_for_pv")

    def test_legacy_hybrid_selection_is_normalized_to_both_pv_sources(self):
        result = controller.calculate_control(
            self.input(
                pv_power=300,
                ac_pv_power=600,
                grid_power=200,
                grid_port_power=0,
                load_port_power=0,
            ),
            controller.ControlSettings(
                coupling_mode="hybrid",
                meter_export_positive=True,
            ),
        )
        self.assertEqual(result.selected_coupling_mode, "automatic")
        self.assertEqual(result.dc_pv_power, 300)
        self.assertEqual(result.available_ac_surplus, 200)

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

    def test_normal_operation_compensates_sustained_grid_import(self):
        result = controller.calculate_control(
            self.input(
                grid_power=79,
                grid_port_power=173,
                load_port_power=0,
                current_grid_setpoint=250,
                current_inverter_setpoint=251,
            ),
            controller.ControlSettings(
                charge_active=False,
                target_grid_power=-10,
                meter_export_positive=False,
            ),
        )
        self.assertEqual(result.normalized_grid_power, -79)
        self.assertEqual(result.recommended_grid_setpoint, 319)
        self.assertEqual(result.recommended_inverter_setpoint, 319)

    def test_normal_operation_compensates_grid_export(self):
        result = controller.calculate_control(
            self.input(
                grid_power=-100,
                grid_port_power=400,
                load_port_power=0,
                current_grid_setpoint=300,
                current_inverter_setpoint=300,
            ),
            controller.ControlSettings(
                charge_active=False,
                target_grid_power=-10,
                meter_export_positive=False,
            ),
        )
        self.assertEqual(result.normalized_grid_power, 100)
        self.assertEqual(result.recommended_grid_setpoint, 190)
        self.assertEqual(result.recommended_inverter_setpoint, 190)

    def test_normal_feedback_preserves_load_port_output(self):
        result = controller.calculate_control(
            self.input(
                grid_power=79,
                grid_port_power=173,
                load_port_power=300,
                current_grid_setpoint=250,
                current_inverter_setpoint=550,
            ),
            controller.ControlSettings(
                charge_active=False,
                target_grid_power=-10,
                meter_export_positive=False,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, 319)
        self.assertEqual(result.recommended_inverter_setpoint, 619)

    def test_normal_feedback_respects_configured_output_limits(self):
        result = controller.calculate_control(
            self.input(
                grid_power=500,
                grid_port_power=2300,
                load_port_power=0,
                current_grid_setpoint=2390,
                current_inverter_setpoint=2390,
            ),
            controller.ControlSettings(
                charge_active=False,
                target_grid_power=-10,
                grid_limit=2400,
                inverter_limit=2400,
                meter_export_positive=False,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, 2400)
        self.assertEqual(result.recommended_inverter_setpoint, 2400)

    def test_grid_charge_does_not_use_normal_feedback_correction(self):
        result = controller.calculate_control(
            self.input(
                grid_power=500,
                current_grid_setpoint=900,
                current_inverter_setpoint=900,
            ),
            controller.ControlSettings(
                charge_active=True,
                charge_source="manual",
                charge_mode="grid_charge",
                charge_power=600,
                meter_export_positive=False,
            ),
        )
        self.assertEqual(result.recommended_grid_setpoint, -600)

    def test_tariff_request_uses_separate_grid_charge_settings(self):
        decision = controller.select_charge_request(
            manual_active=False,
            manual_cycle_active=False,
            automatic_cycle_active=False,
            tariff_active=True,
            manual_mode="pv_priority",
            cycle_mode="pv_surplus",
            manual_target_soc=90,
            cycle_target_soc=100,
            tariff_target_soc=80,
            charge_power=2400,
            tariff_charge_power=1000,
        )
        self.assertTrue(decision.active)
        self.assertEqual(decision.source, "tariff")
        self.assertEqual(decision.mode, "grid_charge")
        self.assertEqual(decision.target_soc, 80)
        self.assertEqual(decision.charge_power, 1000)

        result = controller.calculate_control(
            self.input(soc=50),
            controller.ControlSettings(
                charge_active=decision.active,
                charge_source=decision.source,
                charge_mode=decision.mode,
                target_soc=decision.target_soc,
                charge_power=decision.charge_power,
            ),
        )
        self.assertEqual(result.status, "tariff_grid_charge")
        self.assertEqual(result.recommended_grid_setpoint, -1000)

    def test_manual_and_cycle_requests_override_tariff_request(self):
        manual = controller.select_charge_request(
            manual_active=True,
            manual_cycle_active=True,
            automatic_cycle_active=True,
            tariff_active=True,
            manual_mode="pv_priority",
            cycle_mode="pv_surplus",
            manual_target_soc=85,
            cycle_target_soc=100,
            tariff_target_soc=80,
            charge_power=1200,
            tariff_charge_power=600,
        )
        self.assertEqual(manual.source, "manual")
        self.assertEqual(manual.target_soc, 85)
        self.assertEqual(manual.charge_power, 1200)

        cycle = controller.select_charge_request(
            manual_active=False,
            manual_cycle_active=False,
            automatic_cycle_active=True,
            tariff_active=True,
            manual_mode="pv_priority",
            cycle_mode="pv_and_grid",
            manual_target_soc=85,
            cycle_target_soc=100,
            tariff_target_soc=80,
            charge_power=1200,
            tariff_charge_power=600,
        )
        self.assertEqual(cycle.source, "cycle_automatic")
        self.assertEqual(cycle.mode, "pv_and_grid")
        self.assertEqual(cycle.charge_power, 1200)

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

    def test_new_cycle_without_reference_is_not_due(self):
        now = datetime(2026, 7, 23, 12, tzinfo=UTC)
        self.assertFalse(
            controller.cycle_is_due(
                now=now,
                last_full=None,
                cycle_reference=None,
                interval_days=14,
            )
        )

    def test_cycle_uses_reference_until_first_full_charge(self):
        reference = datetime(2026, 7, 23, 12, tzinfo=UTC)
        self.assertFalse(
            controller.cycle_is_due(
                now=reference + timedelta(days=13, hours=23),
                last_full=None,
                cycle_reference=reference,
                interval_days=14,
            )
        )
        self.assertTrue(
            controller.cycle_is_due(
                now=reference + timedelta(days=14),
                last_full=None,
                cycle_reference=reference,
                interval_days=14,
            )
        )

    def test_observed_full_charge_is_authoritative_cycle_reference(self):
        now = datetime(2026, 7, 23, 12, tzinfo=UTC)
        self.assertFalse(
            controller.cycle_is_due(
                now=now,
                last_full=now - timedelta(days=1),
                cycle_reference=now - timedelta(days=30),
                interval_days=14,
            )
        )

    def test_next_cycle_check_uses_same_day_when_due_before_check_time(self):
        self.assertEqual(
            controller.next_cycle_check_at(
                baseline=datetime(2026, 7, 1, 8, tzinfo=UTC),
                interval_days=14,
                check_time=time(12, 0),
            ),
            datetime(2026, 7, 15, 12, tzinfo=UTC),
        )

    def test_next_cycle_check_waits_until_next_day_when_due_after_check_time(self):
        self.assertEqual(
            controller.next_cycle_check_at(
                baseline=datetime(2026, 7, 1, 18, tzinfo=UTC),
                interval_days=14,
                check_time=time(12, 0),
            ),
            datetime(2026, 7, 16, 12, tzinfo=UTC),
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

    def test_battery_flows_show_only_actual_net_discharge(self):
        self.assertEqual(controller.net_battery_flows(200, 300), (0.0, 100.0))

    def test_battery_flows_show_only_actual_net_charge(self):
        self.assertEqual(controller.net_battery_flows(500, 120), (380.0, 0.0))

    def test_battery_flows_never_return_negative_values(self):
        self.assertEqual(controller.net_battery_flows(-20, -10), (0.0, 0.0))

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
            self.input(
                grid_power=2100,
                grid_port_power=300,
                current_grid_setpoint=300,
                current_inverter_setpoint=300,
            ),
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
