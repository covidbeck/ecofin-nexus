from typing import Any


class AIAgentsService:
    """Narrative agents. They only phrase math_engine outputs; they never compute."""

    def generate_roadmap(self, math_data: dict[str, Any]) -> list[str]:
        shifted_kwh = math_data["shifted_kwh"]
        delta_cost_kzt = math_data["delta_cost_kzt"]
        return [
            (
                f"Шаг 1. Перенесите выпечку и преднагрев печей с пика 19:00–23:00 "
                f"на ночь 23:00–05:00. Гибкий объём по ядру: {shifted_kwh:.2f} кВт·ч в сутки."
            ),
            (
                f"Шаг 2. Сдвиньте тестомес и холодильные компрессоры в ночную зону КРЕМ, "
                f"чтобы закрепить экономию {delta_cost_kzt:.0f} ₸ в сутки при том же kWh."
            ),
            (
                "Шаг 3. Зафиксируйте новый график смены в журнале нагрузки и сверьте "
                "следующую квитанцию с этим профилем."
            ),
        ]

    def generate_esg_summary(self, math_data: dict[str, Any]) -> str:
        i_gap = math_data["i_gap"]
        status = math_data["esg_status"]
        co2 = math_data["co2_avoided_tonnes"]
        trees = math_data["trees_equivalent"]
        gate = (
            "Порог Damu Fund (I_gap ≥ 0.20) выполнен — сделка может идти в андеррайтинг зелёного займа."
            if status == "eligible"
            else "Порог Damu Fund (I_gap ≥ 0.20) не выполнен — требуется дополнительное снижение базы до повторной подачи."
        )
        return (
            f"ESG Executive Summary для андеррайтеров фонда Даму. "
            f"Индекс эффективности I_gap = {i_gap:.4f}, статус {status}. "
            f"Сценарий переноса пиковой нагрузки даёт предотвращённые выбросы Scope 2 "
            f"{co2:.4f} т CO₂ (эквивалент {trees:.1f} деревьев по константе ядра). {gate}"
        )
