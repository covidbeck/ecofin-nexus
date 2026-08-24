import type {
  ActionCatalogItem,
  Anomaly,
  Assumption,
  ConfidenceBand,
  Constraints,
  ConsumptionRecord,
  DashboardResponse,
  TariffConfig,
  ValueStatus,
  ValueWithStatus,
} from "@/lib/types";

const MONTHS_NOMINATIVE = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
];

const MONTHS_CHART = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const REGION_LABELS: Record<string, string> = {
  astana: "Астана",
  almaty: "Алматы",
  shymkent: "Шымкент",
  karaganda: "Караганда",
  aktobe: "Актобе",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  member: "Сотрудник",
};

const UNIT_LABELS: Record<string, string> = {
  KZT: "₸",
  kWh: "кВт·ч",
  "KZT/kWh": "₸/кВт·ч",
  "kg CO2e": "кг CO₂e",
  "kg CO2e/kWh": "кг CO₂e / кВт·ч",
};

export type ActionLevelChoice = "off" | "partial" | "full";

export const ACTION_LEVEL_OPTIONS: { value: ActionLevelChoice; label: string }[] = [
  { value: "off", label: "Не использовать" },
  { value: "partial", label: "Частично" },
  { value: "full", label: "Полностью" },
];

export const ACTION_LEVEL_VALUES: Record<ActionLevelChoice, number> = {
  off: 0,
  partial: 0.5,
  full: 1,
};

export type SpendChoice = "none" | "custom";
export type ShiftChoice = "none" | "one_hour" | "two_hours";
export type ProductionChoice = "keep_full" | "allow_small";
export type FlexChoice = "none" | "small" | "up_to_30";

export const ACTION_COPY: Record<string, { title: string; summary: string }> = {
  night_idle_reduction: {
    title: "Отключать неиспользуемое оборудование после смены",
    summary: "Свет и дежурные устройства вне рабочего времени",
  },
  efficiency_maintenance: {
    title: "Провести регламентное обслуживание оборудования",
    summary: "Чистка, настройка и устранение мелких потерь без остановки выпуска",
  },
  schedule_optimization: {
    title: "Сдвинуть часть работ ближе к границам смены",
    summary: "Уплотнить технологические окна, не меняя объём выпечки",
  },
  flexible_load_shift: {
    title: "Перенести второстепенную нагрузку на более дешёвые часы",
    summary: "Оборудование, которое можно включать не в пик",
  },
  setpoint_tuning: {
    title: "Подстроить температуру климата и холодильников",
    summary: "В допустимых технологических границах",
  },
};

export function parseIsoDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
}

export function monthName(value: string, capitalized = false): string {
  const month = MONTHS_NOMINATIVE[parseIsoDate(value).getMonth()] ?? value;
  if (!capitalized) return month;
  return month.charAt(0).toUpperCase() + month.slice(1);
}

export function chartMonthLabel(period: string): string {
  const date = parseIsoDate(period);
  return MONTHS_CHART[date.getMonth()] ?? period;
}

export function formatNumberRu(value: number, digits = 0): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function humanUnit(unit?: string | null): string {
  if (!unit) return "";
  return UNIT_LABELS[unit] ?? unit.replace("kWh", "кВт·ч").replace("KZT", "₸");
}

export function percentFromShare(share: number): number {
  return Math.round(Math.abs(share) * 100);
}

export function regionLabel(region?: string | null): string {
  if (!region) return "Регион не указан";
  return REGION_LABELS[region.trim().toLowerCase()] ?? region;
}

export function roleLabel(role?: string | null): string {
  if (!role) return "Пользователь";
  return ROLE_LABELS[role.toLowerCase()] ?? role;
}

export function planLabel(name?: string | null): string {
  if (!name) return "План не выбран";
  return name;
}

export function isDemoRecord(record: Pick<ConsumptionRecord, "source">): boolean {
  return record.source === "demo";
}

export function isDemoCabinet(orgName?: string | null, records?: ConsumptionRecord[]): boolean {
  if (orgName?.toLowerCase().includes("demo")) return true;
  return Boolean(records?.some((record) => record.source === "demo"));
}

export function accuracyLabel(confidence: ConfidenceBand): string {
  const share = confidence.half_width_share;
  if (share <= 0.05) return "высокая";
  if (share <= 0.12) return "средняя";
  return "ориентировочная";
}

export function billTrustLabel(record: ConsumptionRecord): {
  label: string;
  tone: "demo" | "manual" | "verified" | "review";
} {
  if (record.source === "demo") return { label: "Демо-данные", tone: "demo" };
  if (record.status !== "confirmed") return { label: "Нужно проверить", tone: "review" };
  if (record.source === "manual") return { label: "Введено вами", tone: "manual" };
  if (record.source === "upload") return { label: "Проверенный счёт", tone: "verified" };
  return { label: "Нужно проверить", tone: "review" };
}

export function billSourceLabel(source: ConsumptionRecord["source"]): string {
  if (source === "upload") return "Счёт";
  if (source === "manual") return "Вручную";
  return "Демо";
}

export function compareWithLabel(record: ConsumptionRecord): string {
  const month = monthName(record.period_start);
  const year = parseIsoDate(record.period_start).getFullYear();
  return `Счёт за ${month} ${year} · ${formatNumberRu(record.kwh)} кВт·ч`;
}

export function periodShortLabel(record: Pick<ConsumptionRecord, "period_start" | "period_end">): string {
  const start = parseIsoDate(record.period_start);
  return `${monthName(record.period_start, true)} ${start.getFullYear()}`;
}

export function actionTitle(action: Pick<ActionCatalogItem, "id" | "label">): string {
  return ACTION_COPY[action.id]?.title ?? action.label;
}

export function actionSummary(action: Pick<ActionCatalogItem, "id" | "description">): string {
  return ACTION_COPY[action.id]?.summary ?? action.description;
}

export function actionCondition(action: ActionCatalogItem): string {
  if (action.capex_kzt > 0) {
    return `Потребуются вложения до ${formatNumberRu(action.capex_kzt)} ₸`;
  }
  return "Без дополнительных затрат";
}

export function actionEffect(action: ActionCatalogItem): string {
  const percent = percentFromShare(action.savings_share);
  if (percent <= 0) {
    return action.requires_tou
      ? "Экономия считается только при многозонном тарифе"
      : "Эффект зависит от выбранных условий";
  }
  return `До ${percent}% меньше потребления`;
}

export function levelFromNumber(level: number): ActionLevelChoice {
  if (level >= 1) return "full";
  if (level >= 0.5) return "partial";
  return "off";
}

export function spendChoiceFromCapex(value: number): SpendChoice {
  return value > 0 ? "custom" : "none";
}

export function shiftChoiceFromHours(value: number): ShiftChoice {
  if (value >= 1.5) return "two_hours";
  if (value >= 0.5) return "one_hour";
  return "none";
}

export function productionChoiceFromShare(value: number): ProductionChoice {
  return value >= 0.999 ? "keep_full" : "allow_small";
}

export function flexChoiceFromShare(value: number): FlexChoice {
  if (value <= 0) return "none";
  if (value < 0.25) return "small";
  return "up_to_30";
}

export function constraintsFromChoices(
  previous: Constraints,
  choices: {
    spend: SpendChoice;
    capexAmount: string;
    shift: ShiftChoice;
    production: ProductionChoice;
    flex: FlexChoice;
  },
): Constraints {
  const shiftHours = choices.shift === "none" ? 0 : choices.shift === "one_hour" ? 1 : 2;
  let flexShare = 0;
  if (choices.flex === "small") {
    flexShare = previous.flexible_load_share > 0 && previous.flexible_load_share < 0.25
      ? previous.flexible_load_share
      : 0.15;
  } else if (choices.flex === "up_to_30") {
    flexShare = previous.flexible_load_share >= 0.25 ? previous.flexible_load_share : 0.3;
  }

  return {
    capex_budget_kzt:
      choices.spend === "none" ? 0 : Number(choices.capexAmount) || previous.capex_budget_kzt || 0,
    max_schedule_shift_hours: shiftHours,
    min_production_share:
      choices.production === "keep_full"
        ? 1
        : previous.min_production_share < 1
          ? previous.min_production_share
          : 0.95,
    flexible_load_share: flexShare,
  };
}

export function businessContextCopy(input: {
  businessLabel: string;
  constraints: Constraints;
  isDemo: boolean;
}): string {
  const spend =
    input.constraints.capex_budget_kzt <= 0
      ? "без дополнительных вложений"
      : `с бюджетом на изменения до ${formatNumberRu(input.constraints.capex_budget_kzt)} ₸`;
  const output =
    input.constraints.min_production_share >= 0.999
      ? "выпуск сохраняется полностью"
      : "допустим небольшой сдвиг выпуска";
  const demo = input.isDemo
    ? " В демо эти правила — синтетический пример пекарни, а не настройки реального поставщика."
    : "";
  return `Nexus сравнивает расход ${input.businessLabel.toLowerCase()} с обычным уровнем за предыдущие месяцы и предлагает только действия, которые проходят ваши правила: ${spend}, ${output}.${demo}`;
}

export function headlineFromDashboard(
  twin: DashboardResponse,
  options?: { hasNoCostAction?: boolean },
): string {
  const month = monthName(twin.record.period_start);
  const anomaly = twin.key_anomaly;
  const noCost = options?.hasNoCostAction ? " Есть действия без дополнительных вложений." : "";

  if (anomaly && anomaly.deviation > 0) {
    return `В ${month} расход выше обычного.${noCost}`;
  }
  if (anomaly && anomaly.deviation < 0) {
    return `В ${month} расход ниже обычного.`;
  }
  if (twin.baseline_kwh.value === null) {
    return `Расход за ${month} посчитан. Для сравнения с обычным уровнем нужно больше истории.`;
  }
  return `В ${month} расход в пределах обычного уровня.`;
}

export function anomalyHumanMessage(anomaly: Anomaly, historyMonths: number): string {
  const percent = percentFromShare(anomaly.deviation);
  const months = historyMonths > 0 ? historyMonths : 1;
  if (anomaly.kind === "baseline_deviation") {
    const direction = anomaly.deviation > 0 ? "выше" : "ниже";
    return `Расход на ${percent}% ${direction} обычного уровня за последние ${months} ${pluralMonths(months)}`;
  }
  const direction = anomaly.deviation > 0 ? "выше" : "ниже";
  return `Расход на ${percent}% ${direction} предыдущего месяца`;
}

export function deviationHumanLabel(value: number): string {
  const percent = percentFromShare(value);
  if (percent === 0) return "На уровне обычного расхода";
  return value > 0 ? `На ${percent}% выше обычного` : `На ${percent}% ниже обычного`;
}

export function savingsLabel(amount: number | null | undefined, unit = "₸"): string {
  if (amount === null || amount === undefined) return "недоступно";
  if (amount < 0) return `Расход вырастет на ${formatNumberRu(Math.abs(amount))} ${unit}`;
  if (amount === 0) return `Без ожидаемой экономии`;
  return `До ${formatNumberRu(amount)} ${unit} экономии за период`;
}

export function savingsKwhLabel(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "";
  if (amount <= 0) return "без снижения потребления";
  return `${formatNumberRu(amount)} кВт·ч меньше`;
}

export function humanizeViolation(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("time-of-use") || lower.includes("многозон")) {
    return "Этот вариант недоступен: для расчёта экономии от переноса времени работы нужен подтверждённый многозонный тариф.";
  }
  if (lower.includes("capex")) {
    return "Этот вариант недоступен: он требует вложений выше суммы, которую вы готовы потратить.";
  }
  if (lower.includes("выпуск")) {
    return "Этот вариант недоступен: он может снизить выпуск, а в настройках указано сохранить выпуск полностью.";
  }
  if (lower.includes("сдвиг графика")) {
    return "Этот вариант недоступен: он требует сдвиг времени работы больше, чем вы разрешили.";
  }
  if (lower.includes("гибкая доля") || lower.includes("гибк")) {
    return "Этот вариант недоступен: он затрагивает большую долю оборудования, чем вы готовы переносить по времени.";
  }
  return text;
}

export type ConstraintPreview = {
  reason: string;
  constraintNow: string;
  constraintNeeded: string;
  possibleEffect: string;
};

function hoursPhrase(hours: number): string {
  const rounded = Math.max(0, Math.round(hours));
  const mod10 = rounded % 10;
  const mod100 = rounded % 100;
  let word = "часов";
  if (mod10 === 1 && mod100 !== 11) word = "час";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "часа";
  return `${rounded} ${word}`;
}

function catalogEffectLine(action: ActionCatalogItem): string {
  const percent = percentFromShare(action.savings_share);
  if (percent <= 0) {
    return "Возможный эффект зависит от тарифа и режима работы. Пока условие не изменено, действие не входит в текущий расчёт и не является рекомендацией.";
  }
  return `В каталоге действие оценивается как снижение потребления до ${percent}%. Это оценка каталога, а не расчёт по вашему счёту. Пока условие не изменено, действие не входит в текущий план и не является рекомендацией.`;
}

export function actionConstraintPreview(
  action: ActionCatalogItem,
  constraints: Constraints,
  hasTou: boolean,
): ConstraintPreview | null {
  if (action.requires_tou && !hasTou) {
    return {
      reason: "Потребуется подтверждённый многозонный тариф",
      constraintNow: "Сейчас для расчётов нет подтверждённого многозонного тарифа.",
      constraintNeeded: "Нужно задать и подтвердить многозонный тариф в профиле.",
      possibleEffect: catalogEffectLine(action),
    };
  }
  if (action.capex_kzt > constraints.capex_budget_kzt) {
    return {
      reason: `Потребуется увеличить бюджет изменений до ${formatNumberRu(action.capex_kzt)} ₸`,
      constraintNow:
        constraints.capex_budget_kzt <= 0
          ? "Сейчас дополнительные вложения не предусмотрены."
          : `Сейчас бюджет на изменения: ${formatNumberRu(constraints.capex_budget_kzt)} ₸.`,
      constraintNeeded: `Нужно разрешить вложения не ниже ${formatNumberRu(action.capex_kzt)} ₸.`,
      possibleEffect: catalogEffectLine(action),
    };
  }
  const allowedImpact = 1 - constraints.min_production_share;
  if (action.production_impact_share > allowedImpact + 1e-9) {
    return {
      reason: "Потребуется допустить временное снижение выпуска",
      constraintNow: "Сейчас в настройках указано сохранить выпуск полностью.",
      constraintNeeded: "Нужно допустить временное снижение выпуска.",
      possibleEffect: catalogEffectLine(action),
    };
  }
  if (action.schedule_shift_hours > constraints.max_schedule_shift_hours + 1e-9) {
    const currentHours = constraints.max_schedule_shift_hours;
    const reason =
      currentHours <= 0
        ? "Потребуется разрешить изменение графика"
        : `Потребуется разрешить изменение графика более чем на ${hoursPhrase(currentHours)}`;
    return {
      reason,
      constraintNow:
        currentHours <= 0
          ? "Сейчас сдвиг графика не допускается."
          : `Сейчас разрешён сдвиг не больше чем на ${hoursPhrase(currentHours)}.`,
      constraintNeeded: `Нужно разрешить сдвиг графика до ${hoursPhrase(action.schedule_shift_hours)}.`,
      possibleEffect: catalogEffectLine(action),
    };
  }
  if (action.requires_tou && 0.5 > constraints.flexible_load_share + 1e-9) {
    return {
      reason: "Потребуется увеличить долю нагрузки, которую можно переносить по времени",
      constraintNow: `Сейчас можно переносить до ${percentFromShare(constraints.flexible_load_share)}% нагрузки.`,
      constraintNeeded: "Нужно разрешить перенос не менее 50% гибкой нагрузки.",
      possibleEffect: catalogEffectLine(action),
    };
  }
  return null;
}

export function actionUnavailableReason(
  action: ActionCatalogItem,
  constraints: Constraints,
  hasTou: boolean,
): string | null {
  return actionConstraintPreview(action, constraints, hasTou)?.reason ?? null;
}

export function selectedActionsEffectCopy(input: {
  actions: ActionCatalogItem[];
  levels: Record<string, number>;
}): string {
  const selected = input.actions.filter((action) => (input.levels[action.id] ?? 0) > 0);
  if (selected.length === 0) {
    return "Выбранные действия не дали расчётного эффекта, потому что ни одно из них не включено в план.";
  }
  const names = selected.map((action) => `«${actionTitle(action)}»`);
  if (names.length === 1) {
    return `Эффект дало выбранное действие: ${names[0]}.`;
  }
  return `Эффект дали выбранные действия: ${names.join(", ")}.`;
}

export function whyPlanFits(input: {
  actions: ActionCatalogItem[];
  levels: Record<string, number>;
  constraints: Constraints;
}): string {
  const selected = input.actions.filter((action) => (input.levels[action.id] ?? 0) > 0);
  if (selected.length === 0) {
    return "Выберите действия, которые можно выполнить без риска для выпуска — Nexus покажет ожидаемый эффект.";
  }
  const parts: string[] = [];
  if (selected.every((action) => action.capex_kzt <= input.constraints.capex_budget_kzt)) {
    parts.push(
      input.constraints.capex_budget_kzt <= 0
        ? "Все выбранные действия не требуют дополнительных вложений."
        : "Действия укладываются в сумму, которую вы готовы потратить.",
    );
  }
  if (selected.every((action) => action.production_impact_share <= 1 - input.constraints.min_production_share + 1e-9)) {
    parts.push("Выпуск можно сохранить.");
  }
  if (
    selected.every(
      (action) => action.schedule_shift_hours <= input.constraints.max_schedule_shift_hours + 1e-9,
    )
  ) {
    parts.push("Сдвиг времени работы не выходит за ваши ограничения.");
  }
  return parts.join(" ") || "План проходит ваши текущие ограничения.";
}

export function tariffHumanSummary(tariff: TariffConfig | null, isDemo: boolean): string {
  if (!tariff) {
    return "Тариф ещё не задан. Без него часть расчётов экономии от переноса времени работы недоступна.";
  }
  const kind = tariff.structure.type === "time_of_use" ? "многозонный" : "фиксированный";
  const rate = tariff.structure.rate_kzt_per_kwh;
  const rateText =
    rate != null ? ` Ставка: ${formatNumberRu(rate, 2)} ₸/кВт·ч.` : " Ставки заданы по зонам суток.";
  const demo = isDemo ? " В демо это синтетический пример, а не тариф поставщика." : "";
  return `Для расчётов используется ${kind} тариф.${rateText}${demo}`;
}

export function evidenceUsedData(twin: DashboardResponse): string[] {
  const items = [
    `Период: ${periodShortLabel(twin.record)}, ${formatNumberRu(twin.kwh.value ?? 0)} кВт·ч, ${formatNumberRu(twin.cost_kzt.value ?? 0)} ₸`,
  ];
  if (twin.record.source === "demo") {
    items.push("Источник периода: демонстрационные данные для показа возможностей Nexus.");
  } else if (twin.record.source === "manual") {
    items.push("Источник периода: значения, введённые вами.");
  } else {
    items.push("Источник периода: подтверждённый счёт.");
  }
  if (twin.baseline_kwh.value !== null) {
    items.push(`Обычный расход: ${formatNumberRu(twin.baseline_kwh.value)} кВт·ч за предыдущие месяцы.`);
  }
  return items;
}

export function evidenceAssumptionsHuman(assumptions: Assumption[], isDemo: boolean): string[] {
  const lines = assumptions.map((item) => humanAssumption(item, isDemo));
  return lines.filter(Boolean);
}

export function evidenceReliability(twin: DashboardResponse): string {
  const accuracy = accuracyLabel(twin.confidence);
  const demo =
    twin.record.source === "demo"
      ? " Это демонстрационные данные, поэтому цифры нужны для показа логики решения, а не как факт по вашему предприятию."
      : "";
  return `Точность оценки: ${accuracy}. Подробный интервал и формулы доступны в технических деталях.${demo}`;
}

export function valueStatusHuman(status: ValueStatus): string {
  const labels: Record<ValueStatus, string> = {
    measured: "по измерениям",
    confirmed: "подтверждено",
    estimated: "оценка",
    simulated: "симуляция",
    unavailable: "недоступно",
  };
  return labels[status];
}

function humanAssumption(item: Assumption, isDemo: boolean): string {
  const subject = item.subject.toLowerCase();
  if (subject.includes("коэффициент") || subject.includes("выброс")) {
    return isDemo
      ? "Экологический эффект посчитан по демо-оценке, не по данным реального оператора сети."
      : "Экологический эффект посчитан по коэффициенту, который вы подтвердили.";
  }
  if (subject.includes("тариф")) {
    return isDemo
      ? "Стоимость и экономия считаются по демонстрационному примеру тарифа."
      : "Стоимость считается по подтверждённому тарифу организации.";
  }
  if (subject.includes("каталог")) {
    return "Ожидаемая экономия по действиям — оценка из каталога, а не гарантия.";
  }
  if (subject.includes("качеств")) {
    return twinQualityAssumption(item, isDemo);
  }
  return item.detail;
}

function twinQualityAssumption(item: Assumption, isDemo: boolean): string {
  if (isDemo || item.detail.toLowerCase().includes("demo")) {
    return "Период помечен как демонстрационные данные.";
  }
  return "Цифры периода подтверждены перед расчётом.";
}

function pluralMonths(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "месяц";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "месяца";
  return "месяцев";
}

export function intensityMetric(data: ValueWithStatus): {
  label: string;
  value: string;
  explanation: string;
} | null {
  if (data.value === null || data.value === undefined) return null;
  return {
    label: "Расход энергии на одну единицу продукции",
    value: `${formatNumberRu(data.value, 2)} ${humanUnit(data.unit) || "кВт·ч/ед."}`,
    explanation:
      "Вспомогательная метрика: сколько энергии уходит на одну единицу выпуска. На главном экране не показывается, чтобы не перегружать решение.",
  };
}

export function isTouTariff(tariff: TariffConfig | null | undefined): boolean {
  return tariff?.structure.type === "time_of_use";
}
