"""Pure control calculations for the XT500 Energy Manager.

This module deliberately contains no Home Assistant service calls, which keeps
the decision and setpoint-limiting logic independently testable.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime, time, timedelta

from .const import (
    BASE_NORMAL,
    BASE_PV_SURPLUS,
    MODE_GRID,
    MODE_PV_GRID,
    MODE_PV_PRIORITY,
    MODE_PV_SURPLUS,
)

RECOVERY_DELAY_MULTIPLIERS = (1.0, 5.0, 15.0)
WRITE_RETRY_DELAY_MULTIPLIERS = (1.0, 2.0)


def cycle_is_due(
    *,
    now: datetime,
    last_full: datetime | None,
    cycle_reference: datetime | None,
    interval_days: float,
) -> bool:
    """Return whether a scheduled full-charge cycle is due.

    An observed full charge is authoritative. The separate reference is used
    only until the first full charge has been recorded. With neither value
    available, a new installation must first establish a reference instead of
    starting an immediate cycle.
    """
    baseline = last_full or cycle_reference
    if baseline is None:
        return False
    return now >= baseline + timedelta(days=max(float(interval_days), 0.0))


def next_cycle_check_at(
    *,
    baseline: datetime,
    interval_days: float,
    check_time: time,
) -> datetime:
    """Return the first configured daily check at or after the cycle is due."""
    due_at = baseline + timedelta(days=max(float(interval_days), 0.0))
    candidate = datetime.combine(
        due_at.date(),
        check_time.replace(tzinfo=None),
        tzinfo=due_at.tzinfo,
    )
    if candidate < due_at:
        candidate += timedelta(days=1)
    return candidate


def normalize_charge_mode(value: str) -> str:
    """Normalize localized charge-mode labels."""
    normalized = value.strip().lower().replace("_", "-").replace(" ", "-")
    aliases = {
        "netzladung": MODE_GRID,
        "grid-charge": MODE_GRID,
        "pv-überschuss": MODE_PV_SURPLUS,
        "pv-direkt-bypass": MODE_PV_SURPLUS,
        "pv-surplus": MODE_PV_SURPLUS,
        "pv-vorrang": MODE_PV_PRIORITY,
        "nur-pv": MODE_PV_PRIORITY,
        "pv-priority": MODE_PV_PRIORITY,
        "pv-+-netz": MODE_PV_GRID,
        "pv-and-grid": MODE_PV_GRID,
    }
    return aliases.get(normalized, MODE_PV_PRIORITY)


def normalize_base_mode(value: str) -> str:
    """Normalize localized zero-feed-in mode labels."""
    normalized = value.strip().lower().replace("_", "-").replace(" ", "-")
    if normalized in ("pv-überschuss", "pv-direkt-bypass", "pv-surplus"):
        return BASE_PV_SURPLUS
    return BASE_NORMAL


def clamp(value: float, low: float, high: float) -> float:
    """Clamp value to an inclusive range."""
    return max(low, min(value, high))


def recovery_delay_seconds(
    base_delay: float,
    attempts_completed: int,
) -> float | None:
    """Return the guarded delay before the next recovery attempt."""
    if attempts_completed < 0 or attempts_completed >= len(
        RECOVERY_DELAY_MULTIPLIERS
    ):
        return None
    return max(float(base_delay), 1.0) * RECOVERY_DELAY_MULTIPLIERS[
        attempts_completed
    ]


def write_retry_delay_seconds(
    base_delay: float,
    failed_attempts: int,
) -> float | None:
    """Return the delay after a transient write timeout."""
    index = failed_attempts - 1
    if index < 0 or index >= len(WRITE_RETRY_DELAY_MULTIPLIERS):
        return None
    return max(float(base_delay), 1.0) * WRITE_RETRY_DELAY_MULTIPLIERS[index]


def limit_setpoint_change(
    current: float,
    requested: float,
    low: float,
    high: float,
    step: float,
    maximum_change: float,
) -> float:
    """Clamp a requested value and limit one live write to a safe-sized step."""
    safe_step = max(step, 1.0)
    bounded = clamp(requested, low, high)
    limited = clamp(bounded, current - maximum_change, current + maximum_change)
    rounded = low + round((limited - low) / safe_step) * safe_step
    return clamp(rounded, low, high)


def select_charge_limit(
    *,
    normal_limit: float,
    target_soc: float,
    charge_active: bool,
    low: float,
    high: float,
    step: float,
) -> float:
    """Return the device charge limit for normal or temporary target charging."""
    requested = max(normal_limit, target_soc) if charge_active else normal_limit
    safe_step = max(step, 1.0)
    bounded = clamp(requested, low, high)
    rounded = low + round((bounded - low) / safe_step) * safe_step
    return clamp(rounded, low, high)


@dataclass(slots=True, frozen=True)
class AdaptiveControlProfile:
    """Selected response band for one control cycle."""

    band: str
    error: float
    interval: float
    maximum_change: float


@dataclass(slots=True, frozen=True)
class PvReleaseDecision:
    """State and timer information for low-PV output suppression."""

    active: bool
    above_start_since: float | None
    remaining_delay: float | None


def update_pv_release(
    *,
    active: bool,
    pv_power: float,
    stop_power: float,
    start_power: float,
    start_delay: float,
    above_start_since: float | None,
    now: float,
) -> PvReleaseDecision:
    """Apply immediate low-PV stop and delayed, hysteretic re-enabling."""
    safe_stop = max(float(stop_power), 0.0)
    safe_start = max(float(start_power), safe_stop)
    safe_delay = max(float(start_delay), 0.0)
    available_pv = max(float(pv_power), 0.0)

    if available_pv <= safe_stop:
        return PvReleaseDecision(False, None, None)
    if active:
        return PvReleaseDecision(True, None, None)
    if available_pv <= safe_start:
        return PvReleaseDecision(False, None, None)

    started = now if above_start_since is None else above_start_since
    remaining = safe_delay - max(now - started, 0.0)
    if remaining <= 0:
        return PvReleaseDecision(True, None, None)
    return PvReleaseDecision(False, started, remaining)


def select_adaptive_control_profile(
    error: float,
    *,
    small_error: float,
    large_error: float,
    slow_interval: float,
    medium_interval: float,
    fast_interval: float,
    small_maximum_change: float,
    medium_maximum_change: float,
    large_maximum_change: float,
) -> AdaptiveControlProfile:
    """Select interval and maximum setpoint change from the current error."""
    safe_error = abs(error)
    small_threshold = max(float(small_error), 0.0)
    large_threshold = max(float(large_error), small_threshold)

    if safe_error >= large_threshold:
        return AdaptiveControlProfile(
            "large",
            safe_error,
            max(float(fast_interval), 0.1),
            max(float(large_maximum_change), 1.0),
        )
    if safe_error >= small_threshold:
        return AdaptiveControlProfile(
            "medium",
            safe_error,
            max(float(medium_interval), 0.1),
            max(float(medium_maximum_change), 1.0),
        )
    return AdaptiveControlProfile(
        "small",
        safe_error,
        max(float(slow_interval), 0.1),
        max(float(small_maximum_change), 1.0),
    )


def overall_control_error(
    *,
    public_grid_power: float,
    public_grid_target: float,
    current_grid_setpoint: float,
    requested_grid_setpoint: float,
    current_inverter_setpoint: float,
    requested_inverter_setpoint: float,
) -> float:
    """Return the largest measured or requested control deviation."""
    return max(
        abs(public_grid_target - public_grid_power),
        abs(requested_grid_setpoint - current_grid_setpoint),
        abs(requested_inverter_setpoint - current_inverter_setpoint),
    )


def feedback_samples_are_fresh(
    last_write: datetime | None, sample_times: Iterable[datetime | None]
) -> bool:
    """Return whether every feedback sample is newer than the last write."""
    if last_write is None:
        return True
    return all(
        sample_time is not None and sample_time > last_write
        for sample_time in sample_times
    )


def decode_signed_16(value: float) -> float:
    """Decode unsigned 16-bit values used by some XT500 entities."""
    return value - 65536 if value > 32767 else value


def net_battery_flows(
    input_power: float,
    output_power: float,
) -> tuple[float, float]:
    """Return mutually exclusive net charging and discharging power."""
    net_power = max(float(input_power), 0.0) - max(float(output_power), 0.0)
    return round(max(net_power, 0.0), 1), round(max(-net_power, 0.0), 1)


@dataclass(slots=True, frozen=True)
class ControlInput:
    """Current measurements used by the production controller."""

    soc: float
    pv_power: float
    grid_power: float
    grid_port_power: float
    load_port_power: float
    current_grid_setpoint: float
    current_inverter_setpoint: float


@dataclass(slots=True, frozen=True)
class ControlSettings:
    """User-adjustable control settings."""

    charge_active: bool = False
    charge_source: str = "none"
    charge_mode: str = MODE_PV_PRIORITY
    base_mode: str = "normal"
    target_soc: float = 100.0
    minimum_soc: float = 10.0
    soc_hysteresis: float = 5.0
    discharge_hold: bool = False
    charge_power: float = 2400.0
    target_grid_power: float = 0.0
    grid_limit: float = 2400.0
    inverter_limit: float = 2400.0
    meter_export_positive: bool = True
    pv_release_allowed: bool = True


@dataclass(slots=True, frozen=True)
class ControlResult:
    """Calculated production setpoints."""

    recommended_grid_setpoint: float
    recommended_inverter_setpoint: float
    normalized_grid_power: float
    estimated_home_load: float
    active_mode: str
    status: str
    target_reached: bool
    charge_blocked: bool
    discharge_blocked: bool


def calculate_control(data: ControlInput, cfg: ControlSettings) -> ControlResult:
    """Calculate GS/IS setpoints using the verified v1.3 topology model."""
    normalized_grid = data.grid_power if cfg.meter_export_positive else -data.grid_power
    grid_port = decode_signed_16(data.grid_port_power)
    load_port = decode_signed_16(data.load_port_power)
    positive_load = max(load_port, 0.0)
    load_backfeed = max(-load_port, 0.0)
    estimated_home_load = grid_port - normalized_grid
    target_reached = cfg.charge_active and data.soc >= cfg.target_soc
    charge_active = cfg.charge_active and not target_reached
    discharge_blocked = cfg.discharge_hold or data.soc <= cfg.minimum_soc
    charge_blocked = target_reached

    active_mode = cfg.charge_mode if charge_active else cfg.base_mode
    pv_direct = active_mode == MODE_PV_SURPLUS or (
        not charge_active and cfg.base_mode == BASE_PV_SURPLUS
    )
    grid_charge_only = charge_active and active_mode == MODE_GRID

    load_grid_target = (
        min(max(cfg.target_grid_power - estimated_home_load, 0.0), positive_load)
        if positive_load > 0
        else 0.0
    )
    raw_grid_target = cfg.target_grid_power + estimated_home_load
    if load_backfeed <= 0:
        raw_grid_target += load_grid_target
    desired_load_output = max(positive_load - load_grid_target, 0.0)
    # Compensate the observed difference between the XT500 command and its
    # actual grid-port output. This keeps the topology feed-forward target while
    # closing the loop around conversion losses, device lag, and derating.
    feedback_grid_target = raw_grid_target + (
        data.current_grid_setpoint - grid_port
    )
    feedback_inverter_target = desired_load_output + max(
        feedback_grid_target,
        0.0,
    )
    pv_direct_target = min(
        max(estimated_home_load + cfg.target_grid_power, 0.0),
        max(data.pv_power, 0.0),
        cfg.grid_limit,
        cfg.inverter_limit,
    )
    if pv_direct and not cfg.pv_release_allowed:
        pv_direct_target = 0.0
    raw_is_target = desired_load_output + max(raw_grid_target, 0.0)

    if charge_active and active_mode in (MODE_GRID, MODE_PV_PRIORITY, MODE_PV_GRID):
        requested = -clamp(cfg.charge_power, 0.0, cfg.grid_limit)
        if active_mode == MODE_PV_PRIORITY:
            requested = 0.0
        grid_target = min(raw_grid_target, requested)
    elif pv_direct:
        grid_target = pv_direct_target
    else:
        grid_target = feedback_grid_target

    min_grid = -cfg.grid_limit
    max_grid = cfg.grid_limit
    if pv_direct or charge_blocked or (load_backfeed > 0 and raw_grid_target >= 0):
        min_grid = 0.0
    if discharge_blocked:
        max_grid = 0.0
    grid_target = clamp(grid_target, min_grid, max_grid)

    if pv_direct or grid_charge_only:
        inverter_target = pv_direct_target
    elif not charge_active and active_mode == BASE_NORMAL:
        inverter_target = feedback_inverter_target
    else:
        inverter_target = raw_is_target
    if discharge_blocked:
        inverter_target = min(inverter_target, max(data.pv_power, 0.0))
    inverter_target = clamp(inverter_target, 0.0, cfg.inverter_limit)

    if target_reached:
        status = "target_reached"
    elif charge_active:
        status = f"{cfg.charge_source}_{active_mode}"
    elif discharge_blocked:
        status = "minimum_soc_hold"
    else:
        status = cfg.base_mode

    return ControlResult(
        recommended_grid_setpoint=round(grid_target),
        recommended_inverter_setpoint=round(inverter_target),
        normalized_grid_power=round(normalized_grid, 1),
        estimated_home_load=round(estimated_home_load, 1),
        active_mode=active_mode,
        status=status,
        target_reached=target_reached,
        charge_blocked=charge_blocked,
        discharge_blocked=discharge_blocked,
    )
