from typing import Literal

from pydantic import BaseModel

ValueStatus = Literal["measured", "confirmed", "estimated", "simulated", "unavailable"]


class ValueWithStatus(BaseModel):
    """A material number with provenance. When status is `unavailable`,
    value is None and `explanation` says what is missing."""

    value: float | None = None
    unit: str | None = None
    status: ValueStatus
    source: str | None = None
    explanation: str | None = None


class ConfidenceBandSchema(BaseModel):
    low: float
    high: float
    half_width_share: float
    label: str


class HealthResponseSchema(BaseModel):
    status: str
    message: str
