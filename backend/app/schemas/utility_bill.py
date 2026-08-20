from enum import Enum

from pydantic import BaseModel, Field


class RegionCode(str, Enum):
    astana = "astana"
    almaty = "almaty"


class BusinessType(str, Enum):
    bakery = "bakery"
    catering = "catering"


class UtilityBillInputSchema(BaseModel):
    total_kwh: float = Field(..., gt=0, description="Monthly consumption E_month, kWh")
    cost_kzt: float = Field(..., ge=0, description="Monthly bill amount, KZT")
    business_type: BusinessType
    region: RegionCode
    days_in_month: int = Field(..., ge=28, le=31, description="D_month")


class UtilityBillExtractionSchema(BaseModel):
    """LLM extraction contract. Mapped onto UtilityBillInputSchema after validation."""

    consumption_kwh: float = Field(..., gt=0)
    total_cost_kzt: float = Field(..., ge=0)
    business_type: BusinessType
    location: RegionCode
    billing_period_days: int = Field(..., ge=28, le=31)

    def to_input(self) -> UtilityBillInputSchema:
        return UtilityBillInputSchema(
            total_kwh=self.consumption_kwh,
            cost_kzt=self.total_cost_kzt,
            business_type=self.business_type,
            region=self.location,
            days_in_month=self.billing_period_days,
        )


class HourlyPointSchema(BaseModel):
    hour: int = Field(..., ge=0, le=23)
    energy_kwh: float = Field(..., ge=0, description="E_h for this hour, kWh")
    power_kw: float = Field(..., ge=0, description="Average power over the hour, kW")
    cost_kzt: float = Field(..., ge=0, description="Hour energy cost at zonal tariff, KZT")


class HourlyProfileResponseSchema(BaseModel):
    points: list[HourlyPointSchema] = Field(..., min_length=24, max_length=24)
    total_daily_kwh: float = Field(..., ge=0)
    total_daily_cost_kzt: float = Field(..., ge=0)
