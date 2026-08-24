from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field

BusinessProfile = Literal[
    "office", "shop", "cafe", "bakery", "production", "warehouse", "hotel", "clinic"
]

DriverType = Literal["floor_area_m2", "output_units", "guests", "beds", "employees"]


class DriverSchema(BaseModel):
    type: DriverType
    value: float = Field(..., gt=0)
    label: str | None = None


class ConstraintsSchema(BaseModel):
    capex_budget_kzt: float = Field(default=0.0, ge=0)
    min_production_share: float = Field(default=1.0, ge=0, le=1)
    max_schedule_shift_hours: float = Field(default=0.0, ge=0, le=24)
    flexible_load_share: float = Field(default=0.0, ge=0, le=1)


class OrganizationProfileSchema(BaseModel):
    name: str
    business_profile: BusinessProfile | None = None
    region: str | None = None
    currency: str = "KZT"
    timezone: str = "Asia/Almaty"
    driver: DriverSchema | None = None
    constraints: ConstraintsSchema = ConstraintsSchema()
    onboarding_complete: bool = False


class OrganizationProfileUpdateSchema(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    business_profile: BusinessProfile | None = None
    region: str | None = Field(default=None, max_length=128)
    currency: str | None = Field(default=None, min_length=1, max_length=8)
    timezone: str | None = Field(default=None, max_length=64)
    driver: DriverSchema | None = None
    constraints: ConstraintsSchema | None = None


class TariffZoneSchema(BaseModel):
    label: str
    rate_kzt_per_kwh: float = Field(..., ge=0)
    energy_share: float = Field(..., ge=0, le=1)


class TariffStructureSchema(BaseModel):
    type: Literal["flat", "time_of_use"]
    rate_kzt_per_kwh: float | None = Field(default=None, ge=0)
    zones: list[TariffZoneSchema] | None = None


class TariffConfigSchema(BaseModel):
    id: int | None = None
    name: str = Field(..., min_length=1, max_length=255)
    currency: str = "KZT"
    structure: TariffStructureSchema
    source: str = Field(..., min_length=3, description="Origin of the tariff data")
    valid_from: date | None = None
    valid_to: date | None = None
    status: Literal["draft", "approved"] = "draft"
    version: int = 1


class EmissionFactorSchema(BaseModel):
    id: int | None = None
    value_kg_per_kwh: float = Field(..., gt=0)
    unit: str = "kg CO2e/kWh"
    source: str = Field(..., min_length=3, description="Origin of the factor")
    valid_from: date | None = None
    valid_to: date | None = None
    status: Literal["draft", "approved"] = "draft"
    version: int = 1


class ConfigStateSchema(BaseModel):
    """What is configured (and approved) for the organization."""

    tariff: TariffConfigSchema | None = None
    emission_factor: EmissionFactorSchema | None = None


def structure_to_dict(structure: TariffStructureSchema) -> dict[str, Any]:
    payload = structure.model_dump(exclude_none=True)
    return payload
