"""Model C: Scope 2 avoided emissions. ΔE_Scope2 = ΔE_kWh * EF_grid_KZ with EF in tCO2/MWh."""

from app.schemas.analytics import Scope2EmissionsSchema

EF_GRID_KZ = 0.892
KWH_PER_MWH = 1000.0
TREE_KG_CO2_PER_YEAR = 21.0


def calculate_scope2_emissions(
    delta_e_kwh: float,
    ef_grid: float = EF_GRID_KZ,
) -> Scope2EmissionsSchema:
    if delta_e_kwh < 0:
        raise ValueError("delta_e_kwh must be non-negative")

    delta_e_mwh = delta_e_kwh / KWH_PER_MWH
    co2_avoided_tonnes = delta_e_mwh * ef_grid
    trees_equivalent = (co2_avoided_tonnes * 1000.0) / TREE_KG_CO2_PER_YEAR

    return Scope2EmissionsSchema(
        co2_avoided_tonnes=co2_avoided_tonnes,
        trees_equivalent=trees_equivalent,
    )
