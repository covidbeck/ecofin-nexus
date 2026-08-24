"""Scenario simulation and enumerative optimization on top of math_engine."""

from dataclasses import asdict

from sqlalchemy.orm import Session

from app.math_engine.carbon import avoided_co2e_kg
from app.math_engine.confidence import confidence_band
from app.math_engine.constraints import check_constraints
from app.math_engine.optimizer import Candidate, optimize
from app.math_engine.scenario import scenario_cost_kzt, scenario_energy_kwh
from app.math_engine.snapshot import build_snapshot
from app.models import ConsumptionRecord, Organization
from app.schemas.common import ConfidenceBandSchema, ValueWithStatus
from app.schemas.scenario import (
    ActionLevelSchema,
    CandidateSchema,
    OptimizationResponseSchema,
    SimulationResultSchema,
)
from app.services.catalog import (
    action_specs,
    catalog_version,
    interactions,
    lambda_effort_kzt,
    lambda_risk_kzt,
)
from app.services.twin import approved_emission_factor, approved_tariff

OPTIMIZER_NOTE = (
    "Оценка/симуляция, не гарантия: коэффициенты экономии — версионируемые "
    "допущения каталога действий, эффект зависит от фактического режима работы."
)


def _org_constraints(organization: Organization) -> dict[str, float]:
    raw = organization.constraints or {}
    return {key: float(value) for key, value in raw.items() if isinstance(value, (int, float))}


def simulate(
    db: Session,
    organization: Organization,
    record: ConsumptionRecord,
    actions: list[ActionLevelSchema],
) -> SimulationResultSchema:
    specs = action_specs(organization.business_profile)
    unknown = [a.action_id for a in actions if a.action_id not in specs]
    if unknown:
        raise ValueError(f"Неизвестные или неприменимые действия: {', '.join(unknown)}")

    levels = {a.action_id: a.level for a in actions}
    gamma = interactions()
    constraints = _org_constraints(organization)
    tariff = approved_tariff(db, organization.id)
    has_tou = bool(
        tariff is not None and (tariff.structure or {}).get("type") == "time_of_use"
    )

    check = check_constraints(levels, specs, constraints, has_approved_tou=has_tou)

    e_base = record.kwh
    c_base = record.cost_kzt
    rate = record.effective_rate if record.effective_rate is not None else 0.0
    e_scen = scenario_energy_kwh(e_base, levels, specs, gamma)
    c_scen = scenario_cost_kzt(e_scen, rate, record.fixed_charges_kzt)

    factor = approved_emission_factor(db, organization.id)
    if factor is not None:
        avoided = avoided_co2e_kg(e_base, e_scen, factor.value_kg_per_kwh)
        avoided_value = ValueWithStatus(
            value=avoided, unit="kg CO2e", status="simulated", source=factor.source
        )
    else:
        avoided_value = ValueWithStatus(
            value=None,
            unit="kg CO2e",
            status="unavailable",
            explanation="Нет утверждённого коэффициента выбросов — эффект CO₂e не рассчитывается.",
        )

    band = confidence_band(c_base - c_scen, record.data_quality, simulated=True)

    snapshot = build_snapshot(
        kind="scenario_simulation",
        inputs={
            "record_id": record.id,
            "base_kwh": e_base,
            "base_cost_kzt": c_base,
            "effective_rate": rate,
            "levels": levels,
            "constraints": constraints,
        },
        config_versions={
            "action_catalog": catalog_version(),
            "tariff": f"v{tariff.version}" if tariff else None,
            "emission_factor": f"v{factor.version}" if factor else None,
        },
        outputs={
            "scenario_kwh": e_scen,
            "scenario_cost_kzt": c_scen,
            "delta_cost_kzt": c_base - c_scen,
            "feasible": check.ok,
        },
        formulas=["scenario_energy", "total_cost", "avoided_co2e"],
    )

    return SimulationResultSchema(
        feasible=check.ok,
        violations=check.violations,
        base_kwh=e_base,
        base_cost_kzt=c_base,
        scenario_kwh=ValueWithStatus(value=e_scen, unit="kWh", status="simulated"),
        scenario_cost_kzt=ValueWithStatus(value=c_scen, unit="KZT", status="simulated"),
        delta_kwh=ValueWithStatus(value=e_base - e_scen, unit="kWh", status="simulated"),
        delta_cost_kzt=ValueWithStatus(value=c_base - c_scen, unit="KZT", status="simulated"),
        avoided_co2e_kg=avoided_value,
        confidence=ConfidenceBandSchema(
            low=band.low, high=band.high, half_width_share=band.half_width_share, label=band.label
        ),
        snapshot=snapshot,
    )


def _candidate_schema(candidate: Candidate) -> CandidateSchema:
    return CandidateSchema(**asdict(candidate))


def run_optimizer(
    db: Session,
    organization: Organization,
    record: ConsumptionRecord,
) -> OptimizationResponseSchema:
    specs = action_specs(organization.business_profile)
    gamma = interactions()
    constraints = _org_constraints(organization)
    tariff = approved_tariff(db, organization.id)
    has_tou = bool(
        tariff is not None and (tariff.structure or {}).get("type") == "time_of_use"
    )
    rate = record.effective_rate if record.effective_rate is not None else 0.0

    result = optimize(
        base_kwh=record.kwh,
        base_cost=record.cost_kzt,
        effective_rate=rate,
        fixed_charges=record.fixed_charges_kzt,
        specs=specs,
        interactions=gamma,
        constraints=constraints,
        lambda_risk=lambda_risk_kzt(),
        lambda_effort=lambda_effort_kzt(),
        has_approved_tou=has_tou,
    )

    best_simulation = None
    action_plan: list[str] = []
    if result.best is not None:
        levels = [
            ActionLevelSchema(action_id=aid, level=lvl)
            for aid, lvl in result.best.levels.items()
        ]
        best_simulation = simulate(db, organization, record, levels)
        for aid, lvl in result.best.levels.items():
            spec = specs[aid]
            action_plan.append(
                f"{spec.label} — уровень {lvl * 100:.0f}%"
                + (f", сдвиг графика до {spec.schedule_shift_hours * lvl:.1f} ч" if spec.schedule_shift_hours else "")
            )

    return OptimizationResponseSchema(
        best=_candidate_schema(result.best) if result.best else None,
        best_simulation=best_simulation,
        action_plan=action_plan,
        ranked_feasible=[_candidate_schema(c) for c in result.ranked_feasible],
        rejected=[_candidate_schema(c) for c in result.rejected],
        evaluated_count=result.evaluated_count,
        lambda_risk_kzt=lambda_risk_kzt(),
        lambda_effort_kzt=lambda_effort_kzt(),
        note=OPTIMIZER_NOTE,
    )
