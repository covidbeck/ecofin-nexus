"""Model A: hourly load from monthly energy. E_h = (E_month / D_month) * w_h."""

from collections.abc import Sequence

from app.schemas.utility_bill import HourlyPointSchema, HourlyProfileResponseSchema

HOURS_IN_DAY = 24


def approximate_hourly_load(
    e_month: float,
    d_month: int,
    w_h: Sequence[float],
) -> list[float]:
    if d_month <= 0:
        raise ValueError("d_month must be positive")
    if len(w_h) != HOURS_IN_DAY:
        raise ValueError("w_h must contain 24 hourly weights")

    daily_kwh = e_month / d_month
    return [daily_kwh * weight for weight in w_h]


def build_hourly_profile(
    e_month: float,
    d_month: int,
    w_h: Sequence[float],
    hour_rates_kzt: Sequence[float],
) -> HourlyProfileResponseSchema:
    if len(hour_rates_kzt) != HOURS_IN_DAY:
        raise ValueError("hour_rates_kzt must contain 24 zonal rates")

    energy = approximate_hourly_load(e_month, d_month, w_h)
    points: list[HourlyPointSchema] = []
    total_cost = 0.0
    for hour, (kwh, rate) in enumerate(zip(energy, hour_rates_kzt, strict=True)):
        cost = kwh * rate
        total_cost += cost
        points.append(
            HourlyPointSchema(
                hour=hour,
                energy_kwh=kwh,
                power_kw=kwh,
                cost_kzt=cost,
            )
        )
    return HourlyProfileResponseSchema(
        points=points,
        total_daily_kwh=sum(energy),
        total_daily_cost_kzt=total_cost,
    )
