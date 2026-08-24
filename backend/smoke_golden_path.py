"""Smoke test of the Golden Path against a running API (in-container).

Run: docker exec ecofin-backend python smoke_golden_path.py
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request

BASE = "http://localhost:8000/api/v1"


def call(method: str, path: str, body: dict | None = None, token: str | None = None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{BASE}{path}", data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read().decode() or "{}")


def main() -> None:
    results: list[tuple[str, bool, str]] = []

    def check(name: str, ok: bool, detail: str = "") -> None:
        results.append((name, ok, detail))

    # 1. Unauthorized access must be rejected.
    status, _ = call("GET", "/dashboard")
    check("unauthorized dashboard -> 401", status == 401, f"got {status}")
    status, _ = call("GET", "/auth/me")
    check("unauthorized me -> 401", status == 401, f"got {status}")

    # 2. Register a fresh org.
    email = f"smoke+{int(time.time())}@nexus.test"
    status, auth = call(
        "POST",
        "/auth/register",
        {
            "name": "Smoke",
            "organization_name": "Smoke Org",
            "email": email,
            "password": "smoke-pass-123",
        },
    )
    check("register -> 200", status == 200, f"got {status}: {auth}")
    token = auth.get("token", "")

    # 3. Onboarding (profile update).
    status, _ = call(
        "PUT",
        "/organization/profile",
        {
            "business_profile": "bakery",
            "region": "Астана",
            "driver": {"type": "output_units", "value": 1000},
            "constraints": {
                "capex_budget_kzt": 100000,
                "min_production_share": 1,
                "max_schedule_shift_hours": 2,
                "flexible_load_share": 0.2,
            },
        },
        token,
    )
    check("onboarding profile -> 200", status == 200, f"got {status}")

    # 4. Manual consumption entry; Free plan allows 1 record/month.
    def add_record(start: str, end: str, kwh: float, cost: float):
        return call(
            "POST",
            "/consumption",
            {
                "period_start": start,
                "period_end": end,
                "kwh": kwh,
                "cost_kzt": cost,
                "fixed_charges_kzt": 0,
                "data_quality": "measured",
                "source": "manual",
            },
            token,
        )

    status, record = add_record("2026-06-01", "2026-06-30", 2900, 87000)
    check("manual entry -> 200", status == 200, f"got {status}: {record}")
    record_id = record.get("id")

    # Free plan entitlement: second record in the same month must be rejected.
    status, _ = add_record("2026-07-01", "2026-07-31", 3000, 90000)
    check("free plan limit -> 403", status == 403, f"got {status}")

    # 5. Dashboard: CO2e must be unavailable (no approved emission factor).
    status, dash = call("GET", "/dashboard", token=token)
    check("dashboard -> 200", status == 200, f"got {status}")
    co2 = dash.get("co2e_kg", {})
    check(
        "co2e unavailable without factor",
        co2.get("status") == "unavailable" and co2.get("value") is None,
        json.dumps(co2, ensure_ascii=False),
    )
    check(
        "cost measured",
        dash.get("cost_kzt", {}).get("status") == "measured",
        json.dumps(dash.get("cost_kzt", {}), ensure_ascii=False),
    )

    # 6. Scenario create + simulate.
    status, scenario = call(
        "POST",
        "/scenarios",
        {
            "name": "Smoke scenario",
            "base_record_id": record_id,
            "actions": [{"action_id": "night_idle_reduction", "level": 1}],
        },
        token,
    )
    check("scenario create -> 200", status == 200, f"got {status}: {scenario}")
    status, sim = call("POST", f"/scenarios/{scenario.get('id')}/simulate", {}, token)
    check("simulate -> 200", status == 200, f"got {status}: {sim}")
    if status == 200:
        check("simulate feasible", sim.get("feasible") is True, json.dumps(sim.get("violations", [])))
        check(
            "avoided co2 unavailable without factor",
            sim.get("avoided_co2e_kg", {}).get("status") == "unavailable",
            json.dumps(sim.get("avoided_co2e_kg", {}), ensure_ascii=False),
        )

    # 7. Optimizer requires Pro -> expect 403 on free plan.
    status, _ = call("POST", "/scenarios/optimize", {"base_record_id": record_id}, token)
    check("optimizer blocked on free -> 403", status == 403, f"got {status}")

    # 8. Mock checkout to Pro, then optimizer works and record limit rises.
    status, _ = call("POST", "/subscription/checkout", {"plan": "pro", "cycle": "month"}, token)
    check("checkout pro -> 200", status == 200, f"got {status}")
    status, second = add_record("2026-07-01", "2026-07-31", 3000, 90000)
    check("second record on pro -> 200", status == 200, f"got {status}: {second}")
    status, opt = call("POST", "/scenarios/optimize", {"base_record_id": record_id}, token)
    check("optimizer on pro -> 200", status == 200, f"got {status}")
    if status == 200:
        check("optimizer evaluated > 0", opt.get("evaluated_count", 0) > 0, str(opt.get("evaluated_count")))

    # 9. Approve emission factor -> CO2e becomes available.
    status, _ = call(
        "PUT",
        "/organization/emission-factor",
        {
            "value_kg_per_kwh": 0.5,
            "unit": "kg CO2e/kWh",
            "source": "smoke-test source",
            "status": "approved",
            "version": 1,
        },
        token,
    )
    check("emission factor put -> 200", status == 200, f"got {status}")
    status, dash2 = call("GET", "/dashboard", token=token)
    co2b = dash2.get("co2e_kg", {})
    check(
        "co2e available with factor",
        status == 200 and co2b.get("value") is not None,
        json.dumps(co2b, ensure_ascii=False),
    )

    # 10. Logout invalidates session.
    status, _ = call("POST", "/auth/logout", {}, token)
    check("logout -> 200", status == 200, f"got {status}")
    status, _ = call("GET", "/auth/me", token=token)
    check("token invalid after logout -> 401", status == 401, f"got {status}")

    failed = [r for r in results if not r[1]]
    for name, ok, detail in results:
        print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if not ok else ""))
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
