"""Versioned action catalog: the only source of savings coefficients.

Values are explicit assumptions (status `estimated`, source recorded) that the
user can review — never presented as measured market data.
"""

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.math_engine.scenario import ActionSpec
from app.schemas.scenario import ActionCatalogItemSchema, ActionCatalogSchema

CATALOG_PATH = Path(__file__).parent.parent / "db" / "fixtures" / "action_catalog.json"


@lru_cache(maxsize=1)
def _raw_catalog() -> dict[str, Any]:
    with CATALOG_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def catalog_version() -> str:
    return str(_raw_catalog()["version"])


def catalog_source() -> str:
    return str(_raw_catalog()["source"])


def lambda_risk_kzt() -> float:
    return float(_raw_catalog()["lambda_risk_kzt_per_point"])


def lambda_effort_kzt() -> float:
    return float(_raw_catalog()["lambda_effort_kzt_per_point"])


def action_specs(business_profile: str | None = None) -> dict[str, ActionSpec]:
    specs: dict[str, ActionSpec] = {}
    for item in _raw_catalog()["actions"]:
        if business_profile and business_profile not in item["applies_to"]:
            continue
        specs[item["id"]] = ActionSpec(
            id=item["id"],
            label=item["label"],
            savings_share=float(item["savings_share"]),
            capex_kzt=float(item["capex_kzt"]),
            risk_score=float(item["risk_score"]),
            effort_score=float(item["effort_score"]),
            schedule_shift_hours=float(item["schedule_shift_hours"]),
            production_impact_share=float(item["production_impact_share"]),
            requires_tou=bool(item["requires_tou"]),
        )
    return specs


def interactions() -> dict[frozenset[str], float]:
    return {
        frozenset(entry["pair"]): float(entry["gamma"])
        for entry in _raw_catalog().get("interactions", [])
    }


def catalog_schema(business_profile: str | None = None) -> ActionCatalogSchema:
    raw = _raw_catalog()
    items = [
        ActionCatalogItemSchema(
            id=item["id"],
            label=item["label"],
            description=item["description"],
            savings_share=float(item["savings_share"]),
            capex_kzt=float(item["capex_kzt"]),
            risk_score=float(item["risk_score"]),
            effort_score=float(item["effort_score"]),
            schedule_shift_hours=float(item["schedule_shift_hours"]),
            production_impact_share=float(item["production_impact_share"]),
            requires_tou=bool(item["requires_tou"]),
            status=str(raw["status"]),
            source=str(raw["source"]),
        )
        for item in raw["actions"]
        if not business_profile or business_profile in item["applies_to"]
    ]
    return ActionCatalogSchema(version=raw["version"], source=raw["source"], actions=items)
