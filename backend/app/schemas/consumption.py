from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator

DataQuality = Literal["measured", "estimated"]
RecordSource = Literal["upload", "manual", "demo"]


class ConsumptionCreateSchema(BaseModel):
    """Manual entry or user confirmation of an extraction draft."""

    period_start: date
    period_end: date
    kwh: float = Field(..., gt=0)
    cost_kzt: float = Field(..., ge=0)
    fixed_charges_kzt: float = Field(default=0.0, ge=0)
    data_quality: DataQuality = "estimated"
    source: Literal["upload", "manual"] = "manual"

    @model_validator(mode="after")
    def check_period(self) -> "ConsumptionCreateSchema":
        if self.period_end < self.period_start:
            raise ValueError("period_end must not precede period_start")
        if self.fixed_charges_kzt > self.cost_kzt:
            raise ValueError("fixed charges cannot exceed total cost")
        return self


class ConsumptionRecordSchema(BaseModel):
    id: int
    period_start: date
    period_end: date
    kwh: float
    cost_kzt: float
    fixed_charges_kzt: float
    effective_rate: float | None
    data_quality: DataQuality
    source: RecordSource
    status: str


class ConsumptionListSchema(BaseModel):
    records: list[ConsumptionRecordSchema]


class ExtractedFieldSchema(BaseModel):
    """A single field pulled from the bill by the extraction adapter.
    The user reviews and confirms every field before anything is stored."""

    name: str
    value: str | None = None
    confident: bool = False


class BillUploadResponseSchema(BaseModel):
    needs_manual_entry: bool
    fields: list[ExtractedFieldSchema] = []
    draft: ConsumptionCreateSchema | None = None
    warnings: list[str] = []
    message: str
