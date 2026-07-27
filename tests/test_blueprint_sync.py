"""Tests for safe installation and update of the bundled blueprint."""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys
import tempfile
import unittest


ROOT = Path(__file__).parents[1]
MODULE_PATH = (
    ROOT
    / "custom_components"
    / "xt500_energy_manager"
    / "blueprint_sync.py"
)
SPEC = spec_from_file_location("xt500_blueprint_sync", MODULE_PATH)
blueprint_sync = module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = blueprint_sync
SPEC.loader.exec_module(blueprint_sync)


class BlueprintSyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.config_dir = Path(self.temp.name)
        self.target = (
            self.config_dir / blueprint_sync.BLUEPRINT_RELATIVE_TARGET
        )
        self.hash_file = (
            self.target.parent / blueprint_sync.BLUEPRINT_HASH_FILENAME
        )
        self.bundled = blueprint_sync.bundled_blueprint_path().read_text(
            encoding="utf-8"
        )

    def test_installs_blueprint_and_management_hash(self):
        result = blueprint_sync.sync_bundled_blueprint(self.config_dir)

        self.assertEqual(result.status, "installed")
        self.assertTrue(result.changed)
        self.assertEqual(self.target.read_text(encoding="utf-8"), self.bundled)
        self.assertTrue(self.hash_file.exists())

    def test_second_sync_is_unchanged(self):
        blueprint_sync.sync_bundled_blueprint(self.config_dir)

        result = blueprint_sync.sync_bundled_blueprint(self.config_dir)

        self.assertEqual(result.status, "unchanged")
        self.assertFalse(result.changed)

    def test_updates_an_unchanged_managed_copy(self):
        blueprint_sync.sync_bundled_blueprint(self.config_dir)
        old_content = self.target.read_text(encoding="utf-8")
        self.target.write_text(old_content.replace("default: 1000", "default: 900"))
        self.hash_file.write_text(
            blueprint_sync._content_hash(
                self.target.read_text(encoding="utf-8")
            )
        )

        result = blueprint_sync.sync_bundled_blueprint(self.config_dir)

        self.assertEqual(result.status, "updated")
        self.assertTrue(result.changed)
        self.assertEqual(self.target.read_text(encoding="utf-8"), self.bundled)
        self.assertEqual(
            self.hash_file.read_text(encoding="utf-8").strip(),
            blueprint_sync._content_hash(self.bundled),
        )

    def test_preserves_user_modified_managed_copy(self):
        blueprint_sync.sync_bundled_blueprint(self.config_dir)
        self.target.write_text(
            self.target.read_text(encoding="utf-8")
            + "\n# Local user modification\n",
            encoding="utf-8",
        )

        result = blueprint_sync.sync_bundled_blueprint(self.config_dir)

        self.assertEqual(result.status, "preserved")
        self.assertFalse(result.changed)
        self.assertIn(
            "# Local user modification",
            self.target.read_text(encoding="utf-8"),
        )

    def test_adopts_the_previously_unmarked_copy(self):
        self.target.parent.mkdir(parents=True)
        self.target.write_text(
            self.bundled.removeprefix(
                f"{blueprint_sync.MANAGED_MARKER}\n"
            ).replace(
                blueprint_sync.BUNDLED_SOURCE_PATH,
                blueprint_sync.LEGACY_SOURCE_PATH,
            ),
            encoding="utf-8",
        )

        result = blueprint_sync.sync_bundled_blueprint(self.config_dir)

        self.assertEqual(result.status, "updated")
        self.assertTrue(result.changed)
        self.assertEqual(self.target.read_text(encoding="utf-8"), self.bundled)
        self.assertTrue(self.hash_file.exists())


if __name__ == "__main__":
    unittest.main()
