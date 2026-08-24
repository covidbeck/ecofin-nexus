"""Normalization and historical baselines.

I_t = E_t / D_t                       (intensity per profile driver)
B_hist = median(E_{t-1}, ..., E_{t-n})
A_base = (E_t - B_t) / B_t            (relative deviation from baseline)
"""

from collections.abc import Sequence
from statistics import median

MIN_HISTORY_PERIODS = 2


def intensity(energy_kwh: float, driver_value: float) -> float:
    if driver_value <= 0:
        raise ValueError("driver_value must be positive")
    if energy_kwh < 0:
        raise ValueError("energy_kwh must be non-negative")
    return energy_kwh / driver_value


def historical_baseline(history_kwh: Sequence[float]) -> float | None:
    """Median of prior periods. None when history is insufficient — the caller
    must surface `unavailable` instead of inventing a baseline."""
    cleaned = [value for value in history_kwh if value is not None]
    if len(cleaned) < MIN_HISTORY_PERIODS:
        return None
    if any(value < 0 for value in cleaned):
        raise ValueError("history values must be non-negative")
    return float(median(cleaned))


def baseline_deviation(current_kwh: float, baseline_kwh: float) -> float:
    if baseline_kwh <= 0:
        raise ValueError("baseline_kwh must be positive")
    return (current_kwh - baseline_kwh) / baseline_kwh
