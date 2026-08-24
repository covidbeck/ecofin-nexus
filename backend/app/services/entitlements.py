"""Server-side plan configuration and entitlement checks (MVP, mock checkout)."""

from datetime import date

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ConsumptionRecord, Subscription
from app.schemas.subscription import PlanSchema

PLANS: dict[str, PlanSchema] = {
    "free": PlanSchema(
        id="free",
        name="Free",
        price_month_kzt=0,
        price_year_kzt=0,
        bills_per_month=1,
        active_scenarios=1,
        optimizer_enabled=False,
        snapshot_export=False,
        multi_user=False,
        description="Познакомиться с цифровым двойником на собственных данных.",
        highlights=[
            "1 счёт в месяц",
            "Digital twin периода: kWh, KZT, effective rate",
            "1 активный сценарий",
        ],
    ),
    "pro": PlanSchema(
        id="pro",
        name="Pro",
        price_month_kzt=7500,
        price_year_kzt=72000,
        bills_per_month=15,
        active_scenarios=None,
        optimizer_enabled=True,
        snapshot_export=True,
        multi_user=False,
        description="Рабочий инструмент для кафе, пекарен и небольших производств.",
        highlights=[
            "До 15 счетов в месяц",
            "Аномалии с доказательствами",
            "Оптимизатор: best feasible scenario",
            "Экспорт снимков расчётов",
        ],
    ),
    "business": PlanSchema(
        id="business",
        name="Business",
        price_month_kzt=50000,
        price_year_kzt=480000,
        bills_per_month=None,
        active_scenarios=None,
        optimizer_enabled=True,
        snapshot_export=True,
        multi_user=True,
        description="Для сетей и производств с несколькими площадками.",
        highlights=[
            "Без лимитов на счета и сценарии",
            "Несколько пользователей (roadmap)",
            "Приоритетная поддержка",
        ],
    ),
}


def get_or_create_subscription(db: Session, organization_id: int) -> Subscription:
    subscription = db.scalar(
        select(Subscription).where(Subscription.organization_id == organization_id)
    )
    if subscription is None:
        subscription = Subscription(organization_id=organization_id, plan="free")
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
    return subscription


def plan_for(subscription: Subscription) -> PlanSchema:
    return PLANS.get(subscription.plan, PLANS["free"])


def ensure_can_add_record(db: Session, organization_id: int) -> None:
    subscription = get_or_create_subscription(db, organization_id)
    plan = plan_for(subscription)
    if plan.bills_per_month is None:
        return
    month_start = date.today().replace(day=1)
    count = db.scalar(
        select(func.count(ConsumptionRecord.id)).where(
            ConsumptionRecord.organization_id == organization_id,
            ConsumptionRecord.created_at >= month_start,
            ConsumptionRecord.source != "demo",
        )
    )
    if (count or 0) >= plan.bills_per_month:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Лимит плана {plan.name}: {plan.bills_per_month} счёт(ов) в месяц. "
                "Обновите план в разделе «Подписка»."
            ),
        )


def ensure_optimizer_enabled(db: Session, organization_id: int) -> None:
    subscription = get_or_create_subscription(db, organization_id)
    plan = plan_for(subscription)
    if not plan.optimizer_enabled:
        raise HTTPException(
            status_code=403,
            detail="Оптимизатор доступен на планах Pro и Business.",
        )
