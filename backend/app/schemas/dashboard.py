from typing import Any

from pydantic import BaseModel

from app.schemas.common import ConfidenceBandSchema, ValueWithStatus
from app.schemas.consumption import ConsumptionRecordSchema


class AnomalySchema(BaseModel):
    kind: str
    severity: str
    deviation: float
    current_kwh: float
    reference_kwh: float
    message: str
    evidence: dict[str, Any]


class AssumptionSchema(BaseModel):
    subject: str
    detail: str
    source: str
    status: str


class TrendPointSchema(BaseModel):
    period: str
    kwh: float
    cost_kzt: float


class DashboardResponseSchema(BaseModel):
    record: ConsumptionRecordSchema
    cost_kzt: ValueWithStatus
    kwh: ValueWithStatus
    effective_rate: ValueWithStatus
    co2e_kg: ValueWithStatus
    intensity: ValueWithStatus
    baseline_kwh: ValueWithStatus
    baseline_deviation: ValueWithStatus
    data_quality: str
    confidence: ConfidenceBandSchema
    anomalies: list[AnomalySchema]
    key_anomaly: AnomalySchema | None
    trend: list[TrendPointSchema]
    assumptions: list[AssumptionSchema]
    snapshot: dict[str, Any]
    missing_data: list[str]
