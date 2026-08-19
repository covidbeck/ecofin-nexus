import json
from functools import lru_cache
from pathlib import Path
from typing import Any

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "tariffs_krem_2026.json"
HOURS_IN_DAY = 24


@lru_cache(maxsize=1)
def load_krem_tariffs() -> dict[str, Any]:
    with FIXTURE_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def hour_rates_kzt(region: str) -> list[float]:
    zones = load_krem_tariffs()["regions"][region]["zones"]
    rates = [0.0] * HOURS_IN_DAY
    for zone in zones.values():
        rate = float(zone["rate_kzt_per_kwh"])
        for hour in zone["hours"]:
            rates[int(hour)] = rate
    return rates


def peak_zone(region: str) -> dict[str, Any]:
    return load_krem_tariffs()["regions"][region]["zones"]["peak"]


def night_zone(region: str) -> dict[str, Any]:
    return load_krem_tariffs()["regions"][region]["zones"]["night"]


def load_profile_weights(business_type: str) -> list[float]:
    profiles = load_krem_tariffs()["load_profiles"]
    return [float(weight) for weight in profiles[business_type]["w_h"]]


def grid_emission_factor() -> float:
    return float(load_krem_tariffs()["ef_grid"])
