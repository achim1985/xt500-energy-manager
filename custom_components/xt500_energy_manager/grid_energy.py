"""Independent left-rule energy accounting, with no restart extrapolation."""

from dataclasses import dataclass
from math import isfinite


@dataclass
class GridEnergy:
    """Accumulate W seconds as kWh; timestamps are process-local monotonic time."""

    import_energy: float = 0.0
    export_energy: float = 0.0
    power: float | None = None
    timestamp: float | None = None

    def restore(self, data: dict) -> None:
        """Restore totals only. Never restore a previous power or timestamp."""
        for key in ("import_energy", "export_energy"):
            value = data.get(key, 0.0)
            if isinstance(value, (int, float)) and isfinite(value) and value >= 0:
                setattr(self, key, float(value))
        self.power = self.timestamp = None

    def snapshot(self) -> dict[str, float]:
        return {"import_energy": self.import_energy, "export_energy": self.export_energy}

    def advance(self, now: float) -> None:
        """Integrate the preceding held value, never the new sample retroactively."""
        if self.timestamp is not None and now < self.timestamp:
            self.power = self.timestamp = None
            return
        if self.power is not None and self.timestamp is not None:
            energy = abs(self.power) * ((now - self.timestamp) / 3_600_000)
            key = "import_energy" if self.power >= 0 else "export_energy"
            total = getattr(self, key) + energy
            if isfinite(total):
                setattr(self, key, total)
        self.timestamp = now if self.power is not None else None

    def sample(self, power: float | None, now: float, *, discontinuity: bool = False) -> None:
        """Close the valid interval on loss; skip intervals with uncertain timing/units."""
        if not discontinuity:
            self.advance(now)
        self.power = power if power is not None and isfinite(power) else None
        self.timestamp = now if self.power is not None else None
