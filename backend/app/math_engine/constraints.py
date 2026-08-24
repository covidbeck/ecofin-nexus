"""Hard business constraints. A violated constraint disqualifies a scenario
and is reported with a human-readable reason — never silently relaxed."""

from dataclasses import dataclass, field

from app.math_engine.scenario import ActionSpec

DEFAULT_CONSTRAINTS: dict[str, float] = {
    "capex_budget_kzt": 0.0,  # Zero-CapEx by default
    "min_production_share": 1.0,  # keep 100% of output
    "max_schedule_shift_hours": 0.0,
    "flexible_load_share": 0.0,
}


@dataclass
class ConstraintCheck:
    ok: bool
    violations: list[str] = field(default_factory=list)


def check_constraints(
    levels: dict[str, float],
    specs: dict[str, ActionSpec],
    constraints: dict[str, float],
    has_approved_tou: bool,
) -> ConstraintCheck:
    merged = {**DEFAULT_CONSTRAINTS, **{k: float(v) for k, v in constraints.items()}}
    violations: list[str] = []

    active = {aid: lvl for aid, lvl in levels.items() if lvl > 0}

    total_capex = sum(specs[aid].capex_kzt for aid in active)
    if total_capex > merged["capex_budget_kzt"] + 1e-9:
        violations.append(
            f"CapEx {total_capex:.0f} ₸ превышает бюджет {merged['capex_budget_kzt']:.0f} ₸."
        )

    production_at_risk = sum(
        specs[aid].production_impact_share * lvl for aid, lvl in active.items()
    )
    allowed_impact = 1.0 - merged["min_production_share"]
    if production_at_risk > allowed_impact + 1e-9:
        violations.append(
            f"Риск для выпуска {production_at_risk * 100:.0f}% выше допустимого "
            f"{allowed_impact * 100:.0f}% (минимальный выпуск "
            f"{merged['min_production_share'] * 100:.0f}%)."
        )

    max_shift = max(
        (specs[aid].schedule_shift_hours * lvl for aid, lvl in active.items()),
        default=0.0,
    )
    if max_shift > merged["max_schedule_shift_hours"] + 1e-9:
        violations.append(
            f"Сдвиг графика {max_shift:.1f} ч превышает допустимый "
            f"{merged['max_schedule_shift_hours']:.1f} ч."
        )

    for aid, lvl in active.items():
        spec = specs[aid]
        if spec.requires_tou and not has_approved_tou:
            violations.append(
                f"Действие «{spec.label}» требует утверждённого time-of-use тарифа, "
                "которого нет в конфигурации."
            )
        if spec.requires_tou and lvl > merged["flexible_load_share"] + 1e-9:
            violations.append(
                f"Действие «{spec.label}» задействует {lvl * 100:.0f}% нагрузки, "
                f"но гибкая доля ограничена {merged['flexible_load_share'] * 100:.0f}%."
            )

    return ConstraintCheck(ok=not violations, violations=violations)
