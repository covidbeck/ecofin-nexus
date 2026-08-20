from typing import Literal

from pydantic import BaseModel, Field

TierId = Literal["free", "pro_7500", "enterprise_50000"]
BillingCycle = Literal["month", "year"]


class SubscribeRequestSchema(BaseModel):
    tier_id: TierId
    billing_cycle: BillingCycle


class SubscribeResponseSchema(BaseModel):
    status: str
    payment_url: str
    tier: str


class CaptchaRequestSchema(BaseModel):
    token: str = Field(default="", description="Mock 'I am not a robot' widget token")


class CaptchaResponseSchema(BaseModel):
    status: str
    score: float
