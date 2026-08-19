from app.db.tariffs import (
    grid_emission_factor,
    hour_rates_kzt,
    load_profile_weights,
    night_zone,
    peak_zone,
)
from app.math_engine.arbitrage import calculate_arbitrage
from app.math_engine.carbon_engine import calculate_scope2_emissions
from app.math_engine.esg_scoring import calculate_esg_score
from app.math_engine.load_approximator import approximate_hourly_load, build_hourly_profile
from app.schemas.analytics import BillAnalysisResponseSchema
from app.schemas.utility_bill import UtilityBillInputSchema

# Share of peak-hour bakery load that can move to night (ovens / dough). Input, not a formula.
DEFAULT_FLEX_SHARE = 1.0


def analyze_utility_bill(bill: UtilityBillInputSchema) -> BillAnalysisResponseSchema:
    region = bill.region.value
    business = bill.business_type.value
    weights = load_profile_weights(business)
    rates = hour_rates_kzt(region)
    peak = peak_zone(region)
    night = night_zone(region)

    hourly_profile = build_hourly_profile(
        bill.total_kwh,
        bill.days_in_month,
        weights,
        rates,
    )
    hourly_kwh = approximate_hourly_load(bill.total_kwh, bill.days_in_month, weights)

    arbitrage = calculate_arbitrage(
        hourly_kwh,
        peak_hours=peak["hours"],
        r_peak=float(peak["rate_kzt_per_kwh"]),
        r_night=float(night["rate_kzt_per_kwh"]),
        hour_rates_kzt=rates,
        flex_share=DEFAULT_FLEX_SHARE,
    )

    monthly_shifted_kwh = arbitrage.shifted_kwh * bill.days_in_month
    scope2 = calculate_scope2_emissions(monthly_shifted_kwh, ef_grid=grid_emission_factor())

    e_opt = bill.total_kwh - monthly_shifted_kwh
    esg = calculate_esg_score(e_base=bill.total_kwh, e_opt=max(e_opt, 0.0))

    return BillAnalysisResponseSchema(
        bill=bill,
        hourly_profile=hourly_profile,
        arbitrage=arbitrage,
        scope2=scope2,
        esg=esg,
    )
