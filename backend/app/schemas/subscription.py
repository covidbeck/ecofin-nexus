from typing import Literal

from pydantic import BaseModel

PlanId = Literal["free", "pro", "business"]
BillingCycle = Literal["month", "year"]


class PlanSchema(BaseModel):
    id: PlanId
    name: str
    price_month_kzt: float
    price_year_kzt: float
    bills_per_month: int | None  # None = unlimited
    active_scenarios: int | None
    optimizer_enabled: bool
    snapshot_export: bool
    multi_user: bool
    description: str
    highlights: list[str]


class PlansResponseSchema(BaseModel):
    plans: list[PlanSchema]


class SubscriptionSchema(BaseModel):
    plan: PlanId
    cycle: BillingCycle
    status: str
    activated_at: str
    entitlements: PlanSchema


class CheckoutRequestSchema(BaseModel):
    """Mock checkout: plan and cycle only. Card details are never accepted."""

    plan: PlanId
    cycle: BillingCycle


class CheckoutResponseSchema(BaseModel):
    status: str
    subscription: SubscriptionSchema
    note: str
