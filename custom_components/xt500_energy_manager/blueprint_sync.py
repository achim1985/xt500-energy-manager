"""Install and update the blueprint bundled with XT500 Energy Manager."""

from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import os
from pathlib import Path


BLUEPRINT_FILENAME = "dynamic_tariff_charging.yaml"
BLUEPRINT_RELATIVE_TARGET = (
    Path("blueprints")
    / "automation"
    / "xt500_energy_manager"
    / BLUEPRINT_FILENAME
)
BLUEPRINT_HASH_FILENAME = f".{BLUEPRINT_FILENAME}.xt500.sha256"
MANAGED_MARKER = "# Managed by XT500 Energy Manager."
BUNDLED_SOURCE_PATH = (
    "custom_components/xt500_energy_manager/blueprints/"
    f"{BLUEPRINT_FILENAME}"
)
LEGACY_SOURCE_PATH = (
    "blueprints/automation/xt500_energy_manager/"
    f"{BLUEPRINT_FILENAME}"
)


@dataclass(frozen=True, slots=True)
class BlueprintSyncResult:
    """Result of one bundled-blueprint synchronization."""

    status: str
    target: Path
    changed: bool
    detail: str


def bundled_blueprint_path() -> Path:
    """Return the blueprint shipped inside the HACS integration package."""
    return Path(__file__).parent / "blueprints" / BLUEPRINT_FILENAME


def _content_hash(content: str) -> str:
    return sha256(content.encode("utf-8")).hexdigest()


def _atomic_write(path: Path, content: str) -> None:
    """Write one UTF-8 text file atomically."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp")
    temporary.write_text(content, encoding="utf-8")
    os.replace(temporary, path)


def sync_bundled_blueprint(config_dir: str | Path) -> BlueprintSyncResult:
    """Install or safely update the blueprint in Home Assistant's config."""
    source = bundled_blueprint_path()
    bundled = source.read_text(encoding="utf-8")
    if not bundled.startswith(MANAGED_MARKER):
        raise ValueError("Bundled tariff blueprint has no management marker")

    target = Path(config_dir) / BLUEPRINT_RELATIVE_TARGET
    hash_file = target.parent / BLUEPRINT_HASH_FILENAME
    bundled_hash = _content_hash(bundled)

    if not target.exists():
        _atomic_write(target, bundled)
        _atomic_write(hash_file, f"{bundled_hash}\n")
        return BlueprintSyncResult(
            "installed", target, True, "Bundled blueprint installed"
        )

    existing = target.read_text(encoding="utf-8")
    existing_hash = _content_hash(existing)
    if existing_hash == bundled_hash:
        if not hash_file.exists() or hash_file.read_text(
            encoding="utf-8"
        ).strip() != bundled_hash:
            _atomic_write(hash_file, f"{bundled_hash}\n")
        return BlueprintSyncResult(
            "unchanged", target, False, "Bundled blueprint already current"
        )

    recorded_hash = (
        hash_file.read_text(encoding="utf-8").strip()
        if hash_file.exists()
        else None
    )
    legacy_unmarked = bundled.removeprefix(
        f"{MANAGED_MARKER}\n"
    ).replace(BUNDLED_SOURCE_PATH, LEGACY_SOURCE_PATH)
    safe_to_replace = (
        recorded_hash is not None and existing_hash == recorded_hash
    ) or existing == legacy_unmarked

    if not safe_to_replace:
        return BlueprintSyncResult(
            "preserved",
            target,
            False,
            "Existing blueprint differs from the last managed copy",
        )

    _atomic_write(target, bundled)
    _atomic_write(hash_file, f"{bundled_hash}\n")
    return BlueprintSyncResult(
        "updated", target, True, "Bundled blueprint updated"
    )
