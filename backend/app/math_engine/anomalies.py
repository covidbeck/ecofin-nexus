"""Anomaly detection: period-over-period and baseline deviations.

Every anomaly carries evidence: the observed values, the reference, the
deviation and the formula used — no black-box flags.
"""

from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Any

from app.math_engine.baseline import baseline_deviation, historical_baseline

POP_THRESHOLD = 0.15
BASELINE_THRESHOLD = 0.20
SEVERE_MULTIPLIER = 2.0


@dataclass
class Anomaly:
    kind: str  # "period_over_period" | "baseline_deviation"
    severity: str  # "warning" | "critical"
    deviation: float
    current_kwh: float
    reference_kwh: float
    message: str
    evidence: dict[str, Any] = field(default_factory=dict)


def period_over_period(
    current_kwh: float,
    previous_kwh: float,
    threshold: float = POP_THRESHOLD,
) -> Anomaly | None:
    if previous_kwh <= 0:
        return None
    deviation = (current_kwh - previous_kwh) / previous_kwh
    if abs(deviation) < threshold:
        return None
    severity = "critical" if abs(deviation) >= threshold * SEVERE_MULTIPLIER else "warning"
    direction = "выросло" if deviation > 0 else "снизилось"
    return Anomaly(
        kind="period_over_period",
        severity=severity,
        deviation=deviation,
        current_kwh=current_kwh,
        reference_kwh=previous_kwh,
        message=(
            f"Потребление {direction} на {abs(deviation) * 100:.1f}% "
            f"к предыдущему периоду ({previous_kwh:.0f} → {current_kwh:.0f} кВт·ч)."
        ),
        evidence={
            "formula": "(E_t - E_{t-1}) / E_{t-1}",
            "current_kwh": current_kwh,
            "previous_kwh": previous_kwh,
            "threshold": threshold,
        },
    )


def baseline_anomaly(
    current_kwh: float,
    history_kwh: Sequence[float],
    threshold: float = BASELINE_THRESHOLD,
) -> Anomaly | None:
    baseline = historical_baseline(history_kwh)
    if baseline is None or baseline <= 0:
        return None
    deviation = baseline_deviation(current_kwh, baseline)
    if abs(deviation) < threshold:
        return None
    severity = "critical" if abs(deviation) >= threshold * SEVERE_MULTIPLIER else "warning"
    direction = "выше" if deviation > 0 else "ниже"
    return Anomaly(
        kind="baseline_deviation",
        severity=severity,
        deviation=deviation,
        current_kwh=current_kwh,
        reference_kwh=baseline,
        message=(
            f"Период {direction} исторической базы (медиана {baseline:.0f} кВт·ч) "
            f"на {abs(deviation) * 100:.1f}%."
        ),
        evidence={
            "formula": "A_base = (E_t - median(E_hist)) / median(E_hist)",
            "current_kwh": current_kwh,
            "baseline_kwh": baseline,
            "history_periods": len(history_kwh),
            "threshold": threshold,
        },
    )


def detect_anomalies(
    current_kwh: float,
    history_kwh: Sequence[float],
) -> list[Anomaly]:
    """History is ordered oldest → newest and excludes the current period."""
    found: list[Anomaly] = []
    if history_kwh:
        pop = period_over_period(current_kwh, history_kwh[-1])
        if pop is not None:
            found.append(pop)
    base = baseline_anomaly(current_kwh, history_kwh)
    if base is not None:
        found.append(base)
    return found
