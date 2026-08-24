"""Cost and effective-rate math.

C_t = E_t * r_t + F_t
r_eff = (C_t - F_t) / E_t, E_t > 0

Time-of-use costs use an approved, versioned tariff structure only — never
hardcoded market rates.
"""

from typing import Any


def total_cost(energy_kwh: float, rate: float, fixed_charges: float = 0.0) -> float:
    if energy_kwh < 0:
        raise ValueError("energy_kwh must be non-negative")
    if rate < 0:
        raise ValueError("rate must be non-negative")
    return energy_kwh * rate + fixed_charges


def effective_rate(cost: float, fixed_charges: float, energy_kwh: float) -> float:
    if energy_kwh <= 0:
        raise ValueError("energy_kwh must be positive to compute an effective rate")
    return (cost - fixed_charges) / energy_kwh


def cost_with_tariff(
    energy_kwh: float,
    structure: dict[str, Any],
    fixed_charges: float = 0.0,
) -> float:
    """Cost of a period under a configured tariff structure.

    Supported structures:
      {"type": "flat", "rate_kzt_per_kwh": r}
      {"type": "time_of_use", "zones": [{"label", "rate_kzt_per_kwh", "energy_share"}]}
        with sum(energy_share) == 1 (validated with small tolerance).
    """
    if energy_kwh < 0:
        raise ValueError("energy_kwh must be non-negative")

    kind = structure.get("type")
    if kind == "flat":
        return total_cost(energy_kwh, float(structure["rate_kzt_per_kwh"]), fixed_charges)
    if kind == "time_of_use":
        zones = structure.get("zones") or []
        if not zones:
            raise ValueError("time_of_use structure requires zones")
        total_share = sum(float(zone["energy_share"]) for zone in zones)
        if abs(total_share - 1.0) > 1e-6:
            raise ValueError("time_of_use energy shares must sum to 1")
        energy_cost = sum(
            energy_kwh * float(zone["energy_share"]) * float(zone["rate_kzt_per_kwh"])
            for zone in zones
        )
        return energy_cost + fixed_charges
    raise ValueError(f"unsupported tariff structure type: {kind!r}")
