"""CO2e math. Only ever called with an approved emission factor.

M_t = E_t * G_t
ΔM  = (E_base - E_scenario) * G_t

The caller (service layer) is responsible for the availability rule: no
approved factor → the CO2e claim is `unavailable`, these functions are not
invoked with substitutes.
"""


def co2e_kg(energy_kwh: float, factor_kg_per_kwh: float) -> float:
    if energy_kwh < 0:
        raise ValueError("energy_kwh must be non-negative")
    if factor_kg_per_kwh <= 0:
        raise ValueError("factor_kg_per_kwh must be positive")
    return energy_kwh * factor_kg_per_kwh


def avoided_co2e_kg(
    base_kwh: float,
    scenario_kwh: float,
    factor_kg_per_kwh: float,
) -> float:
    if base_kwh < 0 or scenario_kwh < 0:
        raise ValueError("energies must be non-negative")
    if factor_kg_per_kwh <= 0:
        raise ValueError("factor_kg_per_kwh must be positive")
    return (base_kwh - scenario_kwh) * factor_kg_per_kwh
