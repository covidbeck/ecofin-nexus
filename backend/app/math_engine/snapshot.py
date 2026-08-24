"""Calculation snapshots: immutable, reproducible records of every material
computation — inputs, config versions, formulas and outputs."""

from datetime import datetime, timezone
from typing import Any

ENGINE_VERSION = "2.0.0"

FORMULAS: dict[str, str] = {
    "total_cost": "C_t = E_t * r_t + F_t",
    "effective_rate": "r_eff = (C_t - F_t) / E_t",
    "intensity": "I_t = E_t / D_t",
    "historical_baseline": "B_hist = median(E_{t-1}..E_{t-n})",
    "baseline_deviation": "A_base = (E_t - B_t) / B_t",
    "co2e": "M_t = E_t * G_t",
    "avoided_co2e": "ΔM = (E_base - E_scen) * G_t",
    "scenario_energy": "E_scen = E_base - Σ s_i·x_i + Σ γ_ij·x_i·x_j",
    "objective": "Z = (C_base - C_scen) - λ_risk·R - λ_effort·H",
}


def build_snapshot(
    kind: str,
    inputs: dict[str, Any],
    config_versions: dict[str, Any],
    outputs: dict[str, Any],
    formulas: list[str] | None = None,
) -> dict[str, Any]:
    used = formulas or list(FORMULAS.keys())
    return {
        "kind": kind,
        "engine_version": ENGINE_VERSION,
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "inputs": inputs,
        "config_versions": config_versions,
        "formulas": {name: FORMULAS[name] for name in used if name in FORMULAS},
        "outputs": outputs,
    }
