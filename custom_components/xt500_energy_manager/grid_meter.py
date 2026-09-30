"""Event-driven external grid meter, independently persisted using HA Store."""

from collections.abc import Callable
from datetime import timedelta
import logging
from math import isfinite
from time import monotonic

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, State, callback
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util.unit_conversion import PowerConverter
from homeassistant.const import UnitOfPower

from .const import CONF_EXTERNAL_GRID_INVERT, CONF_EXTERNAL_GRID_POWER_ENTITY, DOMAIN
from .grid_energy import GridEnergy

_LOGGER = logging.getLogger(__name__)
# One local accounting checkpoint per minute, no device polling. A delay beyond
# two checkpoints indicates scheduler suspension: omit that uncertain interval.
_CHECKPOINT_SECONDS = 60


class ExternalGridMeter:
    """Share one pair of counters across all five entities and their enable states."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.source = entry.data[CONF_EXTERNAL_GRID_POWER_ENTITY]
        self.invert = entry.data.get(CONF_EXTERNAL_GRID_INVERT, False)
        self.energy = GridEnergy()
        self.unit: str | None = None
        self._listeners: set[Callable[[], None]] = set()
        self._unsubs: list[Callable[[], None]] = []
        self._store = Store(hass, 1, f"{DOMAIN}.{entry.entry_id}.grid_energy", atomic_writes=True)
        self._stopped = False
        self._last_save_at = float("-inf")
        self._unsupported_unit: object = object()

    async def async_start(self) -> None:
        stored = await self._store.async_load()
        if isinstance(stored, dict):
            self.energy.restore(stored)
            _LOGGER.debug("Restored grid energy totals: %s", self.energy.snapshot())
        else:
            _LOGGER.debug("Initializing grid energy totals at zero")
        _LOGGER.debug("Observing external grid sensor %s (invert=%s)", self.source, self.invert)
        self._unsubs = [
            async_track_state_change_event(self.hass, [self.source], self._state_changed),
            async_track_time_interval(self.hass, self._checkpoint, timedelta(seconds=_CHECKPOINT_SECONDS)),
        ]
        self._sample(self.hass.states.get(self.source))

    def _power(self, state: State | None) -> tuple[float | None, str | None]:
        if state is None:
            _LOGGER.debug("External grid source %s is absent", self.source)
            return None, None
        if state.attributes.get("restored") or state.attributes.get("xt500_key") in (
            "grid_power_net", "grid_import_power", "grid_export_power",
            "grid_import_energy", "grid_export_energy",
        ):
            _LOGGER.debug("Ignoring restored or derived grid source %s", self.source)
            return None, None
        unit = state.attributes.get("unit_of_measurement")
        try:
            value = float(state.state)
        except (TypeError, ValueError):
            _LOGGER.debug("Invalid external grid state %s: %s", self.source, state.state)
            return None, unit
        if not isfinite(value):
            _LOGGER.debug("Non-finite external grid state %s: %s", self.source, state.state)
            return None, unit
        if not isinstance(unit, str) or unit not in PowerConverter.VALID_UNITS:
            if unit != self._unsupported_unit:
                _LOGGER.warning("Unsupported external grid power unit for %s: %r", self.source, unit)
                self._unsupported_unit = unit
            return None, unit
        self._unsupported_unit = object()
        value = PowerConverter.convert(value, unit, UnitOfPower.WATT)
        if self.invert:
            value = -value
        _LOGGER.debug("External grid %s unit=%s normalized=%s W", self.source, unit, value)
        return value if isfinite(value) else None, unit

    def _late(self, now: float) -> bool:
        previous = self.energy.timestamp
        return previous is not None and (now < previous or now - previous > 2 * _CHECKPOINT_SECONDS)

    @callback
    def _sample(self, state: State | None) -> None:
        now = monotonic()
        power, unit = self._power(state)
        discontinuity = self._late(now) or (
            self.energy.power is not None
            and power is not None
            and self.unit is not None
            and unit != self.unit
        )
        if discontinuity:
            _LOGGER.debug("Omitting uncertain grid interval (timing or unit change)")
        self.energy.sample(power, now, discontinuity=discontinuity)
        self.unit = unit
        self._publish()

    @callback
    def _state_changed(self, event: Event) -> None:
        self._sample(event.data.get("new_state"))

    @callback
    def _checkpoint(self, _now) -> None:
        now = monotonic()
        if self._late(now):
            self.energy.sample(self.energy.power, now, discontinuity=True)
        else:
            self.energy.advance(now)
        self._publish()

    @callback
    def _publish(self) -> None:
        now = monotonic()
        if now - self._last_save_at >= _CHECKPOINT_SECONDS:
            # Do not debounce every source update: frequent updates must not
            # postpone persistence indefinitely. Bound crash loss to one minute.
            self._last_save_at = now
            self._store.async_delay_save(self.energy.snapshot, 0)
        for listener in tuple(self._listeners):
            listener()

    @callback
    def async_add_listener(self, listener: Callable[[], None]) -> Callable[[], None]:
        self._listeners.add(listener)
        return lambda: self._listeners.discard(listener)

    async def async_stop(self) -> None:
        """Flush on orderly shutdown/unload and cancel all observation."""
        if self._stopped:
            return
        self._stopped = True
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        now = monotonic()
        if not self._late(now):
            self.energy.advance(now)
        self.energy.sample(None, now, discontinuity=True)
        await self._store.async_save(self.energy.snapshot())
