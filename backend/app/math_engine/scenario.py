"""Scenario simulation.

E_scenario = E_base - Σ_i s_i·x_i + Σ_{i<j} γ_ij·x_i·x_j

s_i and γ_ij come from the versioned action catalog (status `estimated`,
source recorded); x_i ∈ [0, 1] are user-chosen activation levels.
s_i and γ_ij are expressed as shares of E_base and converted to kWh here.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class ActionSpec:
    id: str
    label: str
    savings_share: float  # share of E_base saved at x_i = 1
    capex_kzt: float
    risk_score: float  # 0..5
    effort_score: float  # 0..5
    schedule_shift_hours: float
    production_impact_share: float  # share of output at risk at x_i = 1
    requires_tou: bool = False


def scenario_energy_kwh(
    base_kwh: float,
    levels: dict[str, float],
    specs: dict[str, ActionSpec],
    interactions: dict[frozenset[str], float],
) -> float:
    """Interactions γ are overlap shares that *reduce* combined savings."""
    if base_kwh < 0:
        raise ValueError("base_kwh must be non-negative")
    for action_id, level in levels.items():
        if not 0.0 <= level <= 1.0:
            raise ValueError(f"level for {action_id} must be in [0, 1]")
        if action_id not in specs:
            raise ValueError(f"unknown action: {action_id}")

    savings_kwh = sum(
        specs[action_id].savings_share * level * base_kwh
        for action_id, level in levels.items()
    )
    overlap_kwh = 0.0
    for pair, gamma in interactions.items():
        ids = list(pair)
        if len(ids) != 2:
            continue
        level_a = levels.get(ids[0], 0.0)
        level_b = levels.get(ids[1], 0.0)
        overlap_kwh += gamma * level_a * level_b * base_kwh

    return max(base_kwh - savings_kwh + overlap_kwh, 0.0)


def scenario_cost_kzt(
    scenario_kwh: float,
    effective_rate: float,
    fixed_charges: float = 0.0,
) -> float:
    if scenario_kwh < 0:
        raise ValueError("scenario_kwh must be non-negative")
    if effective_rate < 0:
        raise ValueError("effective_rate must be non-negative")
    return scenario_kwh * effective_rate + fixed_charges
