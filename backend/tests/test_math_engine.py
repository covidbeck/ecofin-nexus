from app.math_engine.arbitrage import calculate_arbitrage
from app.math_engine.carbon_engine import TREE_KG_CO2_PER_YEAR, calculate_scope2_emissions
from app.math_engine.esg_scoring import calculate_esg_score
from app.math_engine.load_approximator import approximate_hourly_load, build_hourly_profile

R_PEAK = 52.4
R_DAY = 36.8
R_NIGHT = 14.2
PEAK_HOURS = (19, 20, 21, 22)
NIGHT_HOURS = (23, 0, 1, 2, 3, 4, 5, 6)
DAY_HOURS = tuple(range(7, 19))


def _hour_rates() -> list[float]:
    rates = [0.0] * 24
    for hour in PEAK_HOURS:
        rates[hour] = R_PEAK
    for hour in DAY_HOURS:
        rates[hour] = R_DAY
    for hour in NIGHT_HOURS:
        rates[hour] = R_NIGHT
    return rates


def test_model_a_hourly_load_formula() -> None:
    e_month = 3000.0
    d_month = 30
    w_h = [0.0] * 24
    w_h[0] = 0.25
    w_h[12] = 0.75

    profile = approximate_hourly_load(e_month, d_month, w_h)

    daily = e_month / d_month
    assert daily == 100.0
    assert profile[0] == 25.0
    assert profile[12] == 75.0
    assert profile[1] == 0.0
    assert sum(profile) == daily


def test_model_a_hourly_profile_cost_points() -> None:
    e_month = 240.0
    d_month = 30
    w_h = [1.0 / 24.0] * 24
    rates = _hour_rates()

    result = build_hourly_profile(e_month, d_month, w_h, rates)

    expected_e_h = (e_month / d_month) * (1.0 / 24.0)
    assert len(result.points) == 24
    assert result.points[19].energy_kwh == expected_e_h
    assert result.points[19].power_kw == expected_e_h
    assert result.points[19].cost_kzt == expected_e_h * R_PEAK
    assert result.total_daily_kwh == e_month / d_month


def test_model_b_peak_to_night_arbitrage() -> None:
    hourly = [0.0] * 24
    hourly[19] = 10.0
    hourly[20] = 5.0
    flex_share = 1.0
    rates = _hour_rates()

    result = calculate_arbitrage(
        hourly,
        peak_hours=PEAK_HOURS,
        r_peak=R_PEAK,
        r_night=R_NIGHT,
        hour_rates_kzt=rates,
        flex_share=flex_share,
    )

    shifted = 10.0 + 5.0
    spread = R_PEAK - R_NIGHT
    delta_c = shifted * spread
    baseline = 10.0 * R_PEAK + 5.0 * R_PEAK

    assert result.shifted_kwh == 15.0
    assert abs(result.delta_cost_kzt - delta_c) < 1e-12
    assert abs(result.delta_cost_kzt - 15.0 * 38.2) < 1e-12
    assert abs(result.savings_percent - (delta_c / baseline * 100.0)) < 1e-12


def test_model_b_flex_share_scales_linearly() -> None:
    hourly = [0.0] * 24
    hourly[21] = 8.0
    rates = _hour_rates()

    full = calculate_arbitrage(
        hourly, PEAK_HOURS, R_PEAK, R_NIGHT, rates, flex_share=1.0
    )
    half = calculate_arbitrage(
        hourly, PEAK_HOURS, R_PEAK, R_NIGHT, rates, flex_share=0.5
    )

    assert half.shifted_kwh == full.shifted_kwh * 0.5
    assert half.delta_cost_kzt == full.delta_cost_kzt * 0.5


def test_model_c_scope2_uses_mwh_grid_factor() -> None:
    delta_e_kwh = 1000.0
    result = calculate_scope2_emissions(delta_e_kwh, ef_grid=0.892)

    assert result.co2_avoided_tonnes == 0.892
    assert result.trees_equivalent == (0.892 * 1000.0) / TREE_KG_CO2_PER_YEAR


def test_model_d_damu_threshold() -> None:
    on_threshold = calculate_esg_score(e_base=100.0, e_opt=80.0)
    assert on_threshold.i_gap == 0.20
    assert on_threshold.status == "eligible"

    below = calculate_esg_score(e_base=100.0, e_opt=81.0)
    assert abs(below.i_gap - 0.19) < 1e-12
    assert below.status == "ineligible"

    above = calculate_esg_score(e_base=200.0, e_opt=140.0)
    assert above.i_gap == 0.30
    assert above.status == "eligible"
    assert "0.20" in above.summary
