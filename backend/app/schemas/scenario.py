from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import ConfidenceBandSchema, ValueWithStatus


class ActionLevelSchema(BaseModel):
    action_id: str
    level: float = Field(..., ge=0, le=1)


class ActionCatalogItemSchema(BaseModel):
    id: str
    label: str
    description: str
    savings_share: float
    capex_kzt: float
    risk_score: float
    effort_score: float
    schedule_shift_hours: float
    production_impact_share: float
    requires_tou: bool
    status: str
    source: str


class ActionCatalogSchema(BaseModel):
    version: str
    source: str
    actions: list[ActionCatalogItemSchema]


class ScenarioCreateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    base_record_id: int
    actions: list[ActionLevelSchema]


class ScenarioUpdateSchema(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    actions: list[ActionLevelSchema] | None = None


class SimulationResultSchema(BaseModel):
    feasible: bool
    violations: list[str]
    base_kwh: float
    base_cost_kzt: float
    scenario_kwh: ValueWithStatus
    scenario_cost_kzt: ValueWithStatus
    delta_kwh: ValueWithStatus
    delta_cost_kzt: ValueWithStatus
    avoided_co2e_kg: ValueWithStatus
    confidence: ConfidenceBandSchema
    snapshot: dict[str, Any]


class ScenarioSchema(BaseModel):
    id: int
    name: str
    base_record_id: int
    actions: list[ActionLevelSchema]
    result: SimulationResultSchema | None = None


class ScenarioListSchema(BaseModel):
    scenarios: list[ScenarioSchema]


class CandidateSchema(BaseModel):
    levels: dict[str, float]
    scenario_kwh: float
    scenario_cost_kzt: float
    delta_cost_kzt: float
    risk_score: float
    effort_score: float
    z_score: float
    feasible: bool
    violations: list[str]


class OptimizationRequestSchema(BaseModel):
    base_record_id: int


class OptimizationResponseSchema(BaseModel):
    best: CandidateSchema | None
    best_simulation: SimulationResultSchema | None
    action_plan: list[str]
    ranked_feasible: list[CandidateSchema]
    rejected: list[CandidateSchema]
    evaluated_count: int
    lambda_risk_kzt: float
    lambda_effort_kzt: float
    note: str
