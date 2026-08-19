"""Model B: tariff arbitrage. ΔC = Σ_{h ∈ Peak} E_flex,h * (R_peak - R_night)."""

from collections.abc import Sequence

from app.schemas.analytics import ArbitrageResultSchema

HOURS_IN_DAY = 24


def calculate_arbitrage(
    hourly_kwh: Sequence[float],
    peak_hours: Sequence[int],
    r_peak: float,
    r_night: float,
    hour_rates_kzt: Sequence[float],
    flex_share: float,
) -> ArbitrageResultSchema:
    if len(hourly_kwh) != HOURS_IN_DAY:
        raise ValueError("hourly_kwh must contain 24 values")
    if len(hour_rates_kzt) != HOURS_IN_DAY:
        raise ValueError("hour_rates_kzt must contain 24 zonal rates")
    if not 0.0 <= flex_share <= 1.0:
        raise ValueError("flex_share must be in [0, 1]")

    rate_spread = r_peak - r_night
    shifted_kwh = 0.0
    delta_cost_kzt = 0.0
    for hour in peak_hours:
        e_flex = hourly_kwh[hour] * flex_share
        shifted_kwh += e_flex
        delta_cost_kzt += e_flex * rate_spread

    baseline_cost = sum(
        kwh * rate for kwh, rate in zip(hourly_kwh, hour_rates_kzt, strict=True)
    )
    savings_percent = (delta_cost_kzt / baseline_cost * 100.0) if baseline_cost else 0.0

    return ArbitrageResultSchema(
        delta_cost_kzt=delta_cost_kzt,
        shifted_kwh=shifted_kwh,
        savings_percent=savings_percent,
    )
