"""MVP enumerative optimizer over discrete action levels.

max_x Z = (C_base - C_scenario(x)) - λ_risk·R(x) - λ_effort·H(x)
subject to all hard constraints (capex, production, schedule shift,
flexible load, tariff availability).

Enumeration over x_i ∈ {0, 0.5, 1} is fast, fully explainable and reliable
for the small MVP action catalogs (≤ 7 actions → ≤ 3^7 = 2187 combinations).
"""

from dataclasses import dataclass, field
from itertools import product

from app.math_engine.constraints import ConstraintCheck, check_constraints
from app.math_engine.scenario import ActionSpec, scenario_cost_kzt, scenario_energy_kwh

DEFAULT_LEVELS: tuple[float, ...] = (0.0, 0.5, 1.0)
MAX_ACTIONS = 8


@dataclass
class Candidate:
    levels: dict[str, float]
    scenario_kwh: float
    scenario_cost_kzt: float
    delta_cost_kzt: float
    risk_score: float
    effort_score: float
    z_score: float
    feasible: bool
    violations: list[str] = field(default_factory=list)


@dataclass
class OptimizationResult:
    best: Candidate | None
    ranked_feasible: list[Candidate]
    rejected: list[Candidate]
    evaluated_count: int


def _score(
    levels: dict[str, float],
    specs: dict[str, ActionSpec],
    base_kwh: float,
    base_cost: float,
    effective_rate: float,
    fixed_charges: float,
    interactions: dict[frozenset[str], float],
    constraints: dict[str, float],
    lambda_risk: float,
    lambda_effort: float,
    has_approved_tou: bool,
) -> Candidate:
    check: ConstraintCheck = check_constraints(levels, specs, constraints, has_approved_tou)
    e_scen = scenario_energy_kwh(base_kwh, levels, specs, interactions)
    c_scen = scenario_cost_kzt(e_scen, effective_rate, fixed_charges)
    delta_cost = base_cost - c_scen
    risk = sum(specs[aid].risk_score * lvl for aid, lvl in levels.items())
    effort = sum(specs[aid].effort_score * lvl for aid, lvl in levels.items())
    z = delta_cost - lambda_risk * risk - lambda_effort * effort
    return Candidate(
        levels={aid: lvl for aid, lvl in levels.items() if lvl > 0},
        scenario_kwh=e_scen,
        scenario_cost_kzt=c_scen,
        delta_cost_kzt=delta_cost,
        risk_score=risk,
        effort_score=effort,
        z_score=z,
        feasible=check.ok,
        violations=check.violations,
    )


def optimize(
    base_kwh: float,
    base_cost: float,
    effective_rate: float,
    fixed_charges: float,
    specs: dict[str, ActionSpec],
    interactions: dict[frozenset[str], float],
    constraints: dict[str, float],
    lambda_risk: float,
    lambda_effort: float,
    has_approved_tou: bool,
    levels: tuple[float, ...] = DEFAULT_LEVELS,
) -> OptimizationResult:
    if len(specs) > MAX_ACTIONS:
        raise ValueError(f"enumerative optimizer supports at most {MAX_ACTIONS} actions")

    action_ids = sorted(specs.keys())
    feasible: list[Candidate] = []
    rejected: list[Candidate] = []
    evaluated = 0

    for combo in product(levels, repeat=len(action_ids)):
        if all(level == 0.0 for level in combo):
            continue  # the do-nothing baseline is not a recommendation
        candidate_levels = dict(zip(action_ids, combo, strict=True))
        candidate = _score(
            candidate_levels,
            specs,
            base_kwh,
            base_cost,
            effective_rate,
            fixed_charges,
            interactions,
            constraints,
            lambda_risk,
            lambda_effort,
            has_approved_tou,
        )
        evaluated += 1
        (feasible if candidate.feasible else rejected).append(candidate)

    feasible.sort(key=lambda c: c.z_score, reverse=True)
    # Deterministic, bounded diagnostics: worst offenders first is not needed,
    # keep insertion order but cap the payload size.
    best = feasible[0] if feasible and feasible[0].z_score > 0 else None
    return OptimizationResult(
        best=best,
        ranked_feasible=feasible[:10],
        rejected=rejected[:10],
        evaluated_count=evaluated,
    )
