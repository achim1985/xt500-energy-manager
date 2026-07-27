"""Contract tests for the distributed dynamic-tariff blueprint."""

from pathlib import Path
import unittest


BLUEPRINT = (
    Path(__file__).parents[1]
    / "blueprints"
    / "automation"
    / "xt500_energy_manager"
    / "dynamic_tariff_charging.yaml"
)


class DynamicTariffBlueprintTests(unittest.TestCase):
    def setUp(self):
        self.source = BLUEPRINT.read_text(encoding="utf-8")

    def test_has_stable_source_url_and_typed_entity_inputs(self):
        self.assertIn("source_url:", self.source)
        self.assertIn(
            "blueprints/automation/xt500_energy_manager/"
            "dynamic_tariff_charging.yaml",
            self.source,
        )
        self.assertIn("integration: xt500_energy_manager", self.source)
        self.assertIn("integration: sunenergyxt", self.source)

    def test_uses_hysteresis_and_refreshes_bounded_request(self):
        self.assertIn("below: !input charge_start_price", self.source)
        self.assertIn("below: !input charge_stop_price", self.source)
        self.assertIn('minutes: "/15"', self.source)
        self.assertIn("action: switch.turn_on", self.source)
        self.assertIn("action: switch.turn_off", self.source)

    def test_stops_for_invalid_price_or_reached_soc_via_default(self):
        self.assertIn("entity_id: !input soc_sensor", self.source)
        self.assertIn("below: !input target_soc", self.source)
        self.assertIn("default:", self.source)
        self.assertTrue(
            self.source.rfind("action: switch.turn_off")
            > self.source.rfind("default:")
        )


if __name__ == "__main__":
    unittest.main()
