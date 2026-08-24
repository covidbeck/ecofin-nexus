"""Deterministic validation of consumption records."""

from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    ok: bool
    issues: list[str] = field(default_factory=list)


def validate_record(
    kwh: float,
    cost: float,
    fixed_charges: float,
    period_days: int,
) -> ValidationResult:
    issues: list[str] = []
    if kwh <= 0:
        issues.append("Потребление (kWh) должно быть положительным.")
    if cost < 0:
        issues.append("Стоимость не может быть отрицательной.")
    if fixed_charges < 0:
        issues.append("Фиксированные начисления не могут быть отрицательными.")
    if fixed_charges > cost:
        issues.append("Фиксированные начисления превышают полную стоимость счёта.")
    if period_days <= 0:
        issues.append("Период должен содержать хотя бы один день.")
    if period_days > 366:
        issues.append("Период длиннее года — проверьте даты.")
    return ValidationResult(ok=not issues, issues=issues)


def cost_consistency(
    cost: float,
    kwh: float,
    rate: float,
    fixed_charges: float = 0.0,
    tolerance: float = 0.05,
) -> bool:
    """True when C ≈ E*r + F within relative tolerance (known tariff)."""
    expected = kwh * rate + fixed_charges
    if expected <= 0:
        return cost == expected
    return abs(cost - expected) / expected <= tolerance
