from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.utility_bill import HourlyProfileResponseSchema, UtilityBillInputSchema


class ArbitrageResultSchema(BaseModel):
    delta_cost_kzt: float = Field(..., description="Daily savings ΔC from peak-to-night shift, KZT")
    shifted_kwh: float = Field(..., ge=0, description="Flexible energy moved out of peak, kWh")
    savings_percent: float = Field(..., description="ΔC as percent of baseline daily cost")


class Scope2EmissionsSchema(BaseModel):
    co2_avoided_tonnes: float = Field(..., description="Avoided Scope 2 CO2, tonnes")
    trees_equivalent: float = Field(..., ge=0, description="Equivalent trees (21 kg CO2/tree/year)")


class ESGUnderwritingReportSchema(BaseModel):
    i_gap: float = Field(..., description="Efficiency gap I_gap = (E_base - E_opt) / E_base")
    status: Literal["eligible", "ineligible"] = Field(
        ..., description="Damu Fund green-loan gate (I_gap >= 0.20)"
    )
    summary: str


class HealthResponseSchema(BaseModel):
    status: str
    message: str


class BillAnalysisResponseSchema(BaseModel):
    bill: UtilityBillInputSchema
    hourly_profile: HourlyProfileResponseSchema
    arbitrage: ArbitrageResultSchema
    scope2: Scope2EmissionsSchema
    esg: ESGUnderwritingReportSchema
