"""Deterministic demo fixtures. Everything seeded here is explicitly labeled
`demo` — synthetic data for demonstrations, never real market data."""

import json
import secrets
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.math_engine.costs import effective_rate
from app.models import (
    ConsumptionRecord,
    EmissionFactor,
    Organization,
    Subscription,
    TariffConfig,
    User,
)
from app.services.entitlements import get_or_create_subscription

DEMO_ORG_NAME = "Nexus Demo Bakery"
DEMO_USER_NAME = "Жюри Nexus"
DEMO_REGION = "Astana"
DEMO_PROFILE = "bakery"
DEMO_DRIVER = {
    "type": "output_units",
    "value": 4200.0,
    "label": "Demo fixture — выпуск пекарни за период (буханки)",
}
DEMO_CONSTRAINTS = {
    "capex_budget_kzt": 0.0,
    "min_production_share": 1.0,
    "max_schedule_shift_hours": 2.0,
    "flexible_load_share": 0.3,
}

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


def _apply_demo_profile(organization: Organization) -> None:
    organization.name = DEMO_ORG_NAME
    organization.business_profile = DEMO_PROFILE
    organization.region = DEMO_REGION
    organization.currency = "KZT"
    organization.timezone = "Asia/Almaty"
    organization.drivers = dict(DEMO_DRIVER)
    organization.constraints = dict(DEMO_CONSTRAINTS)
    organization.onboarding_complete = 1


def ensure_demo_workspace(db: Session) -> tuple[User, Organization]:
    """Idempotently create or reuse the single jury demo org and owner."""
    email = settings.demo_email
    user = db.scalar(select(User).where(User.email == email))

    if user is None:
        organization = Organization()
        _apply_demo_profile(organization)
        db.add(organization)
        db.flush()

        password = settings.demo_password or secrets.token_urlsafe(32)
        user = User(
            email=email,
            password_hash=hash_password(password),
            name=DEMO_USER_NAME,
            role="owner",
            organization_id=organization.id,
        )
        db.add(user)
        db.add(
            Subscription(
                organization_id=organization.id,
                plan="business",
                cycle="month",
                status="active",
            )
        )
        db.flush()
    else:
        organization = db.get(Organization, user.organization_id)
        if organization is None:
            organization = Organization()
            _apply_demo_profile(organization)
            db.add(organization)
            db.flush()
            user.organization_id = organization.id
        else:
            _apply_demo_profile(organization)
        user.name = DEMO_USER_NAME
        subscription = get_or_create_subscription(db, organization.id)
        subscription.plan = "business"
        subscription.cycle = "month"
        subscription.status = "active"

    db.commit()
    db.refresh(user)
    db.refresh(organization)
    seed_demo_data(db, organization)
    db.refresh(user)
    db.refresh(organization)
    return user, organization
