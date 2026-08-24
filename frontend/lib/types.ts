// API contracts mirroring backend/app/schemas (Pydantic V2).

export type ValueStatus =
  | "measured"
  | "confirmed"
  | "estimated"
  | "simulated"
  | "unavailable";

export interface ValueWithStatus {
  value: number | null;
  unit?: string | null;
  status: ValueStatus;
  source?: string | null;
  explanation?: string | null;
}

export interface ConfidenceBand {
  low: number;
  high: number;
  half_width_share: number;
  label: string;
}

// ---------------------------------------------------------------- auth

export interface OrganizationBrief {
  id: number;
  name: string;
  onboarding_complete: boolean;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: string;
  organization: OrganizationBrief;
}

export interface AuthResponse {
  token: string;
  expires_at: string;
  user: UserResponse;
}

// ---------------------------------------------------------------- organization

export type BusinessProfile =
  | "office"
  | "shop"
  | "cafe"
  | "bakery"
  | "production"
  | "warehouse"
  | "hotel"
  | "clinic";

export type DriverType =
  | "floor_area_m2"
  | "output_units"
  | "guests"
  | "beds"
  | "employees";

export interface Driver {
  type: DriverType;
  value: number;
  label?: string | null;
}

export interface Constraints {
  capex_budget_kzt: number;
  min_production_share: number;
  max_schedule_shift_hours: number;
  flexible_load_share: number;
}

export interface OrganizationProfile {
  name: string;
  business_profile: BusinessProfile | null;
  region: string | null;
  currency: string;
  timezone: string;
  driver: Driver | null;
  constraints: Constraints;
  onboarding_complete: boolean;
}

export interface OrganizationProfileUpdate {
  name?: string;
  business_profile?: BusinessProfile;
  region?: string;
  currency?: string;
  timezone?: string;
  driver?: Driver;
  constraints?: Constraints;
}

export interface TariffZone {
  label: string;
  rate_kzt_per_kwh: number;
  energy_share: number;
}

export interface TariffStructure {
  type: "flat" | "time_of_use";
  rate_kzt_per_kwh?: number | null;
  zones?: TariffZone[] | null;
}

export interface TariffConfig {
  id?: number | null;
  name: string;
  currency: string;
  structure: TariffStructure;
  source: string;
  valid_from?: string | null;
  valid_to?: string | null;
  status: "draft" | "approved";
  version: number;
}

export interface EmissionFactor {
  id?: number | null;
  value_kg_per_kwh: number;
  unit: string;
  source: string;
  valid_from?: string | null;
  valid_to?: string | null;
  status: "draft" | "approved";
  version: number;
}

export interface ConfigState {
  tariff: TariffConfig | null;
  emission_factor: EmissionFactor | null;
}

// ---------------------------------------------------------------- consumption

export type DataQuality = "measured" | "estimated";

export interface ConsumptionCreate {
  period_start: string;
  period_end: string;
  kwh: number;
  cost_kzt: number;
  fixed_charges_kzt: number;
  data_quality: DataQuality;
  source: "upload" | "manual";
}

export interface ConsumptionRecord {
  id: number;
  period_start: string;
  period_end: string;
  kwh: number;
  cost_kzt: number;
  fixed_charges_kzt: number;
  effective_rate: number | null;
  data_quality: DataQuality | "estimated";
  source: "upload" | "manual" | "demo";
  status: string;
}

export interface ConsumptionList {
  records: ConsumptionRecord[];
}

export interface ExtractedField {
  name: string;
  value: string | null;
  confident: boolean;
}

export interface BillUploadResponse {
  needs_manual_entry: boolean;
  fields: ExtractedField[];
  draft: ConsumptionCreate | null;
  warnings: string[];
  message: string;
}

// ---------------------------------------------------------------- dashboard

export interface Anomaly {
  kind: string;
  severity: string;
  deviation: number;
  current_kwh: number;
  reference_kwh: number;
  message: string;
  evidence: Record<string, unknown>;
}

export interface Assumption {
  subject: string;
  detail: string;
  source: string;
  status: string;
}

export interface TrendPoint {
  period: string;
  kwh: number;
  cost_kzt: number;
}

export interface DashboardResponse {
  record: ConsumptionRecord;
  cost_kzt: ValueWithStatus;
  kwh: ValueWithStatus;
  effective_rate: ValueWithStatus;
  co2e_kg: ValueWithStatus;
  intensity: ValueWithStatus;
  baseline_kwh: ValueWithStatus;
  baseline_deviation: ValueWithStatus;
  data_quality: string;
  confidence: ConfidenceBand;
  anomalies: Anomaly[];
  key_anomaly: Anomaly | null;
  trend: TrendPoint[];
  assumptions: Assumption[];
  snapshot: Record<string, unknown>;
  missing_data: string[];
}

// ---------------------------------------------------------------- scenarios

export interface ActionLevel {
  action_id: string;
  level: number;
}

export interface ActionCatalogItem {
  id: string;
  label: string;
  description: string;
  savings_share: number;
  capex_kzt: number;
  risk_score: number;
  effort_score: number;
  schedule_shift_hours: number;
  production_impact_share: number;
  requires_tou: boolean;
  status: string;
  source: string;
}

export interface ActionCatalog {
  version: string;
  source: string;
  actions: ActionCatalogItem[];
}

export interface SimulationResult {
  feasible: boolean;
  violations: string[];
  base_kwh: number;
  base_cost_kzt: number;
  scenario_kwh: ValueWithStatus;
  scenario_cost_kzt: ValueWithStatus;
  delta_kwh: ValueWithStatus;
  delta_cost_kzt: ValueWithStatus;
  avoided_co2e_kg: ValueWithStatus;
  confidence: ConfidenceBand;
  snapshot: Record<string, unknown>;
}

export interface Scenario {
  id: number;
  name: string;
  base_record_id: number;
  actions: ActionLevel[];
  result: SimulationResult | null;
}

export interface ScenarioList {
  scenarios: Scenario[];
}

export interface Candidate {
  levels: Record<string, number>;
  scenario_kwh: number;
  scenario_cost_kzt: number;
  delta_cost_kzt: number;
  risk_score: number;
  effort_score: number;
  z_score: number;
  feasible: boolean;
  violations: string[];
}

export interface OptimizationResponse {
  best: Candidate | null;
  best_simulation: SimulationResult | null;
  action_plan: string[];
  ranked_feasible: Candidate[];
  rejected: Candidate[];
  evaluated_count: number;
  lambda_risk_kzt: number;
  lambda_effort_kzt: number;
  note: string;
}

// ---------------------------------------------------------------- subscription

export type PlanId = "free" | "pro" | "business";
export type BillingCycle = "month" | "year";

export interface Plan {
  id: PlanId;
  name: string;
  price_month_kzt: number;
  price_year_kzt: number;
  bills_per_month: number | null;
  active_scenarios: number | null;
  optimizer_enabled: boolean;
  snapshot_export: boolean;
  multi_user: boolean;
  description: string;
  highlights: string[];
}

export interface PlansResponse {
  plans: Plan[];
}

export interface Subscription {
  plan: PlanId;
  cycle: BillingCycle;
  status: string;
  activated_at: string;
  entitlements: Plan;
}

export interface CheckoutResponse {
  status: string;
  subscription: Subscription;
  note: string;
}

// ---------------------------------------------------------------- copilot

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqListResponse {
  items: FaqItem[];
}

export interface CopilotResponse {
  reply: string;
  source: string;
}

export interface DemoSeedResponse {
  status: string;
  created: Record<string, number>;
  note: string;
}
