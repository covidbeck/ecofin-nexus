"""Digital Twin builder: assembles the dashboard for a confirmed period.

All numbers come from the deterministic math engine; every claim carries a
status and, when data is missing, an explanation instead of a substitute.
"""

from dataclasses import asdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.math_engine.anomalies import detect_anomalies
from app.math_engine.baseline import (
    MIN_HISTORY_PERIODS,
    baseline_deviation,
    historical_baseline,
    intensity,
)
from app.math_engine.carbon import co2e_kg
from app.math_engine.confidence import confidence_band
from app.math_engine.snapshot import build_snapshot
from app.models import ConsumptionRecord, EmissionFactor, Organization, TariffConfig
from app.schemas.common import ConfidenceBandSchema, ValueWithStatus
from app.schemas.consumption import ConsumptionRecordSchema
from app.schemas.dashboard import (
    AnomalySchema,
    AssumptionSchema,
    DashboardResponseSchema,
    TrendPointSchema,
)
from app.services.catalog import catalog_source, catalog_version

DRIVER_UNITS = {
    "floor_area_m2": "кВт·ч/м²",
    "output_units": "кВт·ч/ед.",
    "guests": "кВт·ч/гость",
    "beds": "кВт·ч/койка",
    "employees": "кВт·ч/сотрудник",
}


def record_schema(record: ConsumptionRecord) -> ConsumptionRecordSchema:
    return ConsumptionRecordSchema(
        id=record.id,
        period_start=record.period_start,
        period_end=record.period_end,
        kwh=record.kwh,
        cost_kzt=record.cost_kzt,
        fixed_charges_kzt=record.fixed_charges_kzt,
        effective_rate=record.effective_rate,
        data_quality=record.data_quality,  # type: ignore[arg-type]
        source=record.source,  # type: ignore[arg-type]
        status=record.status,
    )


def approved_emission_factor(db: Session, organization_id: int) -> EmissionFactor | None:
    return db.scalar(
        select(EmissionFactor)
        .where(
            EmissionFactor.organization_id == organization_id,
            EmissionFactor.status == "approved",
        )
        .order_by(EmissionFactor.version.desc())
    )


def approved_tariff(db: Session, organization_id: int) -> TariffConfig | None:
    return db.scalar(
        select(TariffConfig)
        .where(
            TariffConfig.organization_id == organization_id,
            TariffConfig.status == "approved",
        )
        .order_by(TariffConfig.version.desc())
    )


def build_dashboard(
    db: Session,
    organization: Organization,
    record: ConsumptionRecord,
) -> DashboardResponseSchema:
    history_records = list(
        db.scalars(
            select(ConsumptionRecord)
            .where(
                ConsumptionRecord.organization_id == organization.id,
                ConsumptionRecord.period_start < record.period_start,
                ConsumptionRecord.status == "confirmed",
            )
            .order_by(ConsumptionRecord.period_start)
        )
    )
    history_kwh = [item.kwh for item in history_records]
    missing: list[str] = []
    assumptions: list[AssumptionSchema] = []

    quality = record.data_quality
    cost_value = ValueWithStatus(
        value=record.cost_kzt, unit="KZT", status=quality, source=record.source
    )
    kwh_value = ValueWithStatus(
        value=record.kwh, unit="kWh", status=quality, source=record.source
    )
    rate_value = ValueWithStatus(
        value=record.effective_rate,
        unit="KZT/kWh",
        status=quality if record.effective_rate is not None else "unavailable",
        explanation=None
        if record.effective_rate is not None
        else "Эффективная ставка не рассчитана: потребление должно быть положительным.",
    )

    # CO2e — only with an approved emission factor.
    factor = approved_emission_factor(db, organization.id)
    if factor is not None:
        co2e = co2e_kg(record.kwh, factor.value_kg_per_kwh)
        co2e_value = ValueWithStatus(
            value=co2e, unit="kg CO2e", status=quality, source=factor.source
        )
        assumptions.append(
            AssumptionSchema(
                subject="Коэффициент выбросов",
                detail=f"{factor.value_kg_per_kwh} {factor.unit} (версия {factor.version})",
                source=factor.source,
                status=factor.status,
            )
        )
    else:
        co2e_value = ValueWithStatus(
            value=None,
            unit="kg CO2e",
            status="unavailable",
            explanation=(
                "Нет утверждённого коэффициента выбросов. Добавьте его с источником "
                "в настройках организации — без него CO₂e не рассчитывается."
            ),
        )
        missing.append("Утверждённый коэффициент выбросов (CO₂e недоступен).")

    # Intensity — only with a configured driver.
    driver = (organization.drivers or {}) if organization.drivers else {}
    if driver.get("type") and float(driver.get("value") or 0) > 0:
        driver_value = float(driver["value"])
        intensity_value = ValueWithStatus(
            value=intensity(record.kwh, driver_value),
            unit=DRIVER_UNITS.get(str(driver["type"]), "кВт·ч/ед."),
            status=quality,
            source="Профиль организации (онбординг)",
        )
    else:
        intensity_value = ValueWithStatus(
            value=None,
            status="unavailable",
            explanation="Драйвер профиля не задан — интенсивность не рассчитывается.",
        )
        missing.append("Драйвер профиля (площадь, выпуск, гости) для интенсивности.")

    # Baseline — needs enough history.
    baseline = historical_baseline(history_kwh)
    if baseline is not None:
        baseline_value = ValueWithStatus(
            value=baseline,
            unit="kWh",
            status="confirmed",
            source=f"Медиана {len(history_kwh)} предыдущих периодов",
        )
        deviation_value = ValueWithStatus(
            value=baseline_deviation(record.kwh, baseline),
            status=quality,
            source="A_base = (E_t - B_t) / B_t",
        )
    else:
        explanation = (
            f"Недостаточно истории: нужно минимум {MIN_HISTORY_PERIODS} "
            f"подтверждённых периода, есть {len(history_kwh)}."
        )
        baseline_value = ValueWithStatus(value=None, status="unavailable", explanation=explanation)
        deviation_value = ValueWithStatus(value=None, status="unavailable", explanation=explanation)
        missing.append("История периодов для базовой линии и аномалий.")

    anomalies = [AnomalySchema(**asdict(a)) for a in detect_anomalies(record.kwh, history_kwh)]
    key_anomaly = None
    if anomalies:
        key_anomaly = max(anomalies, key=lambda a: abs(a.deviation))

    band = confidence_band(record.cost_kzt, quality)

    tariff = approved_tariff(db, organization.id)
    if tariff is not None:
        assumptions.append(
            AssumptionSchema(
                subject="Тариф",
                detail=f"{tariff.name} (версия {tariff.version})",
                source=tariff.source,
                status=tariff.status,
            )
        )
    else:
        missing.append("Утверждённый тариф (для сценариев переноса нагрузки).")

    assumptions.append(
        AssumptionSchema(
            subject="Каталог действий",
            detail=f"Версия {catalog_version()} — коэффициенты экономии являются оценками",
            source=catalog_source(),
            status="estimated",
        )
    )
    assumptions.append(
        AssumptionSchema(
            subject="Качество данных периода",
            detail=f"{quality} (источник: {record.source})",
            source="Подтверждено пользователем при вводе",
            status=quality,
        )
    )

    trend = [
        TrendPointSchema(
            period=item.period_start.isoformat(), kwh=item.kwh, cost_kzt=item.cost_kzt
        )
        for item in [*history_records, record]
    ]

    snapshot = build_snapshot(
        kind="dashboard",
        inputs={
            "record_id": record.id,
            "kwh": record.kwh,
            "cost_kzt": record.cost_kzt,
            "fixed_charges_kzt": record.fixed_charges_kzt,
            "history_kwh": history_kwh,
            "driver": driver or None,
        },
        config_versions={
            "action_catalog": catalog_version(),
            "tariff": f"v{tariff.version}" if tariff else None,
            "emission_factor": f"v{factor.version}" if factor else None,
        },
        outputs={
            "effective_rate": record.effective_rate,
            "co2e_kg": co2e_value.value,
            "baseline_kwh": baseline_value.value,
            "anomalies": len(anomalies),
        },
        formulas=["effective_rate", "co2e", "historical_baseline", "baseline_deviation"],
    )

    return DashboardResponseSchema(
        record=record_schema(record),
        cost_kzt=cost_value,
        kwh=kwh_value,
        effective_rate=rate_value,
        co2e_kg=co2e_value,
        intensity=intensity_value,
        baseline_kwh=baseline_value,
        baseline_deviation=deviation_value,
        data_quality=quality,
        confidence=ConfidenceBandSchema(
            low=band.low, high=band.high, half_width_share=band.half_width_share, label=band.label
        ),
        anomalies=anomalies,
        key_anomaly=key_anomaly,
        trend=trend,
        assumptions=assumptions,
        snapshot=snapshot,
        missing_data=missing,
    )
