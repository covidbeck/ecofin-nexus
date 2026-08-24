"""Unit tests for the deterministic math layer.

Every expected value is hand-computed and written out explicitly so a reviewer
can re-derive it on paper.
"""

import pytest

from app.math_engine.anomalies import baseline_anomaly, detect_anomalies, period_over_period
from app.math_engine.baseline import baseline_deviation, historical_baseline, intensity
from app.math_engine.carbon import avoided_co2e_kg, co2e_kg
from app.math_engine.confidence import confidence_band
from app.math_engine.constraints import check_constraints
from app.math_engine.costs import cost_with_tariff, effective_rate, total_cost
from app.math_engine.optimizer import optimize
from app.math_engine.scenario import ActionSpec, scenario_cost_kzt, scenario_energy_kwh
from app.math_engine.snapshot import ENGINE_VERSION, build_snapshot
from app.math_engine.validation import cost_consistency, validate_record

# Six months of demo-like history: median of the first five is 2940.
HISTORY = [2850.0, 2940.0, 2790.0, 2980.0, 3050.0]


# ---------------------------------------------------------------- costs


def test_total_cost_and_effective_rate_roundtrip() -> None:
    # C = 1000 * 33 + 3500 = 36500; r_eff = (36500 - 3500) / 1000 = 33
    cost = total_cost(1000.0, 33.0, 3500.0)
    assert cost == 36500.0
    assert effective_rate(cost, 3500.0, 1000.0) == 33.0


def test_effective_rate_requires_positive_energy() -> None:
    with pytest.raises(ValueError):
        effective_rate(100.0, 0.0, 0.0)


def test_flat_tariff_cost() -> None:
    # 100 kWh * 40 + 500 = 4500
    structure = {"type": "flat", "rate_kzt_per_kwh": 40.0}
    assert cost_with_tariff(100.0, structure, 500.0) == 4500.0


def test_time_of_use_tariff_cost() -> None:
    # 1000 kWh: peak 20% * 42 = 8400, day 60% * 33 = 19800, night 20% * 21 = 4200
    # energy cost 32400 + fixed 100 = 32500
    structure = {
        "type": "time_of_use",
        "zones": [
            {"label": "peak", "rate_kzt_per_kwh": 42.0, "energy_share": 0.2},
            {"label": "day", "rate_kzt_per_kwh": 33.0, "energy_share": 0.6},
            {"label": "night", "rate_kzt_per_kwh": 21.0, "energy_share": 0.2},
        ],
    }
    assert cost_with_tariff(1000.0, structure, 100.0) == pytest.approx(32500.0)


def test_time_of_use_shares_must_sum_to_one() -> None:
    structure = {
        "type": "time_of_use",
        "zones": [{"label": "peak", "rate_kzt_per_kwh": 42.0, "energy_share": 0.5}],
    }
    with pytest.raises(ValueError):
        cost_with_tariff(1000.0, structure)


# ---------------------------------------------------------------- baseline


def test_intensity() -> None:
    # 3000 kWh / 120 m2 = 25 kWh/m2
    assert intensity(3000.0, 120.0) == 25.0
    with pytest.raises(ValueError):
        intensity(3000.0, 0.0)


def test_historical_baseline_median_and_insufficiency() -> None:
    # sorted: 2790, 2850, 2940, 2980, 3050 -> median 2940
    assert historical_baseline(HISTORY) == 2940.0
    # fewer than 2 periods -> None (caller reports `unavailable`)
    assert historical_baseline([2850.0]) is None
    assert historical_baseline([]) is None


def test_baseline_deviation() -> None:
    # (3720 - 2940) / 2940 = 780 / 2940 ≈ 0.2653061224
    assert baseline_deviation(3720.0, 2940.0) == pytest.approx(0.2653061224, abs=1e-9)


# ---------------------------------------------------------------- validation


def test_validate_record() -> None:
    assert validate_record(3000.0, 96000.0, 3500.0, 30).ok
    bad = validate_record(0.0, -5.0, 100.0, 0)
    assert not bad.ok
    assert len(bad.issues) >= 3


def test_cost_consistency() -> None:
    # exact: 1000 * 33 + 3500 = 36500
    assert cost_consistency(36500.0, 1000.0, 33.0, 3500.0)
    # 40000 vs 36500 -> 9.6% deviation > 5% tolerance
    assert not cost_consistency(40000.0, 1000.0, 33.0, 3500.0)


# ---------------------------------------------------------------- anomalies


def test_period_over_period_threshold() -> None:
    # (3720 - 3050) / 3050 ≈ 0.2197 -> warning (below 0.30 critical bound)
    anomaly = period_over_period(3720.0, 3050.0)
    assert anomaly is not None
    assert anomaly.severity == "warning"
    assert anomaly.deviation == pytest.approx(0.2196721311, abs=1e-9)
    # +5% is normal
    assert period_over_period(105.0, 100.0) is None


def test_baseline_anomaly_evidence() -> None:
    anomaly = baseline_anomaly(3720.0, HISTORY)
    assert anomaly is not None
    assert anomaly.reference_kwh == 2940.0
    assert anomaly.evidence["formula"].startswith("A_base")
    # (4200 - 2940) / 2940 ≈ 0.4286 >= 0.40 -> critical
    critical = baseline_anomaly(4200.0, HISTORY)
    assert critical is not None
    assert critical.severity == "critical"


def test_detect_anomalies_returns_both_kinds() -> None:
    found = detect_anomalies(3720.0, HISTORY)
    kinds = {a.kind for a in found}
    assert kinds == {"period_over_period", "baseline_deviation"}
    # insufficient history -> no baseline anomaly, no crash
    assert detect_anomalies(3720.0, []) == []


# ---------------------------------------------------------------- carbon


def test_co2e_only_with_positive_factor() -> None:
    # 3000 kWh * 0.7 kg/kWh = 2100 kg
    assert co2e_kg(3000.0, 0.7) == 2100.0
    # (3000 - 2700) * 0.7 = 210 kg avoided
    assert avoided_co2e_kg(3000.0, 2700.0, 0.7) == pytest.approx(210.0)
    with pytest.raises(ValueError):
        co2e_kg(3000.0, 0.0)


# ---------------------------------------------------------------- scenario

SPEC_A = ActionSpec(
    id="a", label="A", savings_share=0.06, capex_kzt=0.0, risk_score=1.0,
    effort_score=1.0, schedule_shift_hours=0.0, production_impact_share=0.0,
)
SPEC_B = ActionSpec(
    id="b", label="B", savings_share=0.04, capex_kzt=0.0, risk_score=1.0,
    effort_score=1.0, schedule_shift_hours=0.0, production_impact_share=0.0,
)
INTERACTIONS = {frozenset({"a", "b"}): 0.01}


def test_scenario_energy_with_interaction() -> None:
    # E = 1000 - (0.06*1 + 0.04*1)*1000 + 0.01*1*1*1000 = 1000 - 100 + 10 = 910
    e = scenario_energy_kwh(1000.0, {"a": 1.0, "b": 1.0}, {"a": SPEC_A, "b": SPEC_B}, INTERACTIONS)
    assert e == pytest.approx(910.0)
    # partial levels: 1000 - (30 + 40) + 0.01*0.5*1*1000 = 1000 - 70 + 5 = 935
    e_half = scenario_energy_kwh(
        1000.0, {"a": 0.5, "b": 1.0}, {"a": SPEC_A, "b": SPEC_B}, INTERACTIONS
    )
    assert e_half == pytest.approx(935.0)


def test_scenario_rejects_bad_levels() -> None:
    with pytest.raises(ValueError):
        scenario_energy_kwh(1000.0, {"a": 1.5}, {"a": SPEC_A}, {})
    with pytest.raises(ValueError):
        scenario_energy_kwh(1000.0, {"zzz": 1.0}, {"a": SPEC_A}, {})


def test_scenario_cost() -> None:
    # 910 * 33 + 3500 = 30030 + 3500 = 33530
    assert scenario_cost_kzt(910.0, 33.0, 3500.0) == pytest.approx(33530.0)


# ---------------------------------------------------------------- constraints


def test_capex_budget_constraint() -> None:
    expensive = ActionSpec(
        id="led", label="LED", savings_share=0.05, capex_kzt=200000.0, risk_score=1.0,
        effort_score=1.0, schedule_shift_hours=0.0, production_impact_share=0.0,
    )
    check = check_constraints(
        {"led": 1.0}, {"led": expensive}, {"capex_budget_kzt": 0.0}, has_approved_tou=False
    )
    assert not check.ok
    assert any("CapEx" in v for v in check.violations)


def test_tou_requirement_and_flexible_share() -> None:
    shift = ActionSpec(
        id="shift", label="Shift", savings_share=0.0, capex_kzt=0.0, risk_score=1.0,
        effort_score=1.0, schedule_shift_hours=3.0, production_impact_share=0.0,
        requires_tou=True,
    )
    constraints = {"max_schedule_shift_hours": 4.0, "flexible_load_share": 0.2}
    no_tou = check_constraints({"shift": 0.1}, {"shift": shift}, constraints, False)
    assert not no_tou.ok
    over_flex = check_constraints({"shift": 0.5}, {"shift": shift}, constraints, True)
    assert not over_flex.ok
    ok = check_constraints({"shift": 0.2}, {"shift": shift}, constraints, True)
    assert ok.ok


def test_production_and_schedule_constraints() -> None:
    risky = ActionSpec(
        id="sched", label="Schedule", savings_share=0.05, capex_kzt=0.0, risk_score=1.0,
        effort_score=1.0, schedule_shift_hours=2.0, production_impact_share=0.02,
    )
    strict = check_constraints(
        {"sched": 1.0},
        {"sched": risky},
        {"min_production_share": 1.0, "max_schedule_shift_hours": 0.0},
        has_approved_tou=False,
    )
    assert not strict.ok
    assert len(strict.violations) == 2  # production + schedule shift
    relaxed = check_constraints(
        {"sched": 1.0},
        {"sched": risky},
        {"min_production_share": 0.95, "max_schedule_shift_hours": 2.0},
        has_approved_tou=False,
    )
    assert relaxed.ok


# ---------------------------------------------------------------- optimizer


def test_optimizer_picks_best_feasible() -> None:
    # base: 1000 kWh, 33000 KZT at rate 33, no fixed charges.
    # a=1.0 -> E=940, C=31020, ΔC=1980, Z=1980-100-100=1780 (λ=100 each, R=H=1)
    # combos with b are blocked by its 50000 capex against a 0 budget.
    blocked_b = ActionSpec(
        id="b", label="B", savings_share=0.04, capex_kzt=50000.0, risk_score=1.0,
        effort_score=1.0, schedule_shift_hours=0.0, production_impact_share=0.0,
    )
    result = optimize(
        base_kwh=1000.0,
        base_cost=33000.0,
        effective_rate=33.0,
        fixed_charges=0.0,
        specs={"a": SPEC_A, "b": blocked_b},
        interactions={},
        constraints={"capex_budget_kzt": 0.0},
        lambda_risk=100.0,
        lambda_effort=100.0,
        has_approved_tou=False,
    )
    assert result.best is not None
    assert result.best.levels == {"a": 1.0}
    assert result.best.delta_cost_kzt == pytest.approx(1980.0)
    assert result.best.z_score == pytest.approx(1780.0)
    assert result.evaluated_count == 8  # 3^2 - 1 (do-nothing excluded)
    assert all("CapEx" in v for c in result.rejected for v in c.violations)


def test_optimizer_returns_none_when_no_positive_gain() -> None:
    # zero effective rate -> ΔC = 0 -> Z < 0 for any action -> no recommendation
    result = optimize(
        base_kwh=1000.0,
        base_cost=0.0,
        effective_rate=0.0,
        fixed_charges=0.0,
        specs={"a": SPEC_A},
        interactions={},
        constraints={},
        lambda_risk=100.0,
        lambda_effort=100.0,
        has_approved_tou=False,
    )
    assert result.best is None


# ---------------------------------------------------------------- confidence & snapshot


def test_confidence_band_rules() -> None:
    measured = confidence_band(100.0, "measured")
    assert (measured.low, measured.high) == (97.0, 103.0)
    assert measured.label == "±3%"
    simulated = confidence_band(100.0, "estimated", simulated=True)
    assert simulated.half_width_share == pytest.approx(0.22)
    assert simulated.label == "±22%"


def test_snapshot_captures_inputs_and_versions() -> None:
    snapshot = build_snapshot(
        kind="test",
        inputs={"kwh": 3000.0},
        config_versions={"action_catalog": "1.0.0"},
        outputs={"cost": 96000.0},
        formulas=["total_cost"],
    )
    assert snapshot["engine_version"] == ENGINE_VERSION
    assert snapshot["inputs"]["kwh"] == 3000.0
    assert snapshot["config_versions"]["action_catalog"] == "1.0.0"
    assert snapshot["formulas"] == {"total_cost": "C_t = E_t * r_t + F_t"}
    assert "computed_at" in snapshot
