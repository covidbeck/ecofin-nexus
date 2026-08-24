"""Deterministic demo fixtures. Everything seeded here is explicitly labeled
`demo` — synthetic data for demonstrations, never real market data."""

import json
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.math_engine.costs import effective_rate
from app.models import ConsumptionRecord, EmissionFactor, Organization, TariffConfig

FIXTURE_PATH = Path(__file__).parent.parent / "db" / "fixtures" / "demo_dataset.json"


@lru_cache(maxsize=1)
def _fixture() -> dict[str, Any]:
    with FIXTURE_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def seed_demo_data(db: Session, organization: Organization) -> dict[str, int]:
    """Idempotent per organization: demo records are re-created only if absent."""
    fixture = _fixture()

    existing_demo = db.scalar(
        select(ConsumptionRecord).where(
            ConsumptionRecord.organization_id == organization.id,
            ConsumptionRecord.source == "demo",
        )
    )
    created_records = 0
    if existing_demo is None:
        for row in fixture["records"]:
            kwh = float(row["kwh"])
            cost = float(row["cost_kzt"])
            fixed = float(row["fixed_charges_kzt"])
            db.add(
                ConsumptionRecord(
                    organization_id=organization.id,
                    period_start=date.fromisoformat(row["period_start"]),
                    period_end=date.fromisoformat(row["period_end"]),
                    kwh=kwh,
                    cost_kzt=cost,
                    fixed_charges_kzt=fixed,
                    effective_rate=effective_rate(cost, fixed, kwh),
                    data_quality="estimated",
                    source="demo",
                    status="confirmed",
                )
            )
            created_records += 1

    created_tariff = 0
    has_tariff = db.scalar(
        select(TariffConfig).where(TariffConfig.organization_id == organization.id)
    )
    if has_tariff is None:
        tariff = fixture["tariff"]
        db.add(
            TariffConfig(
                organization_id=organization.id,
                name=tariff["name"],
                currency=tariff["currency"],
                structure=tariff["structure"],
                source=tariff["source"],
                status=tariff["status"],
                version=1,
            )
        )
        created_tariff = 1

    created_factor = 0
    has_factor = db.scalar(
        select(EmissionFactor).where(EmissionFactor.organization_id == organization.id)
    )
    if has_factor is None:
        factor = fixture["emission_factor"]
        db.add(
            EmissionFactor(
                organization_id=organization.id,
                value_kg_per_kwh=float(factor["value_kg_per_kwh"]),
                unit=factor["unit"],
                source=factor["source"],
                status=factor["status"],
                version=1,
            )
        )
        created_factor = 1

    db.commit()
    return {
        "records": created_records,
        "tariff_configs": created_tariff,
        "emission_factors": created_factor,
    }
