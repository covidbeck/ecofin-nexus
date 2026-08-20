export type BusinessType = "bakery" | "catering";
export type RegionCode = "astana" | "almaty";
export type EsgStatus = "eligible" | "ineligible";

export interface UtilityBillInput {
  total_kwh: number;
  cost_kzt: number;
  business_type: BusinessType;
  region: RegionCode;
  days_in_month: number;
}

export interface HourlyPoint {
  hour: number;
  energy_kwh: number;
  power_kw: number;
  cost_kzt: number;
}

export interface HourlyProfileResponse {
  points: HourlyPoint[];
  total_daily_kwh: number;
  total_daily_cost_kzt: number;
}

export interface ArbitrageResult {
  delta_cost_kzt: number;
  shifted_kwh: number;
  savings_percent: number;
}

export interface Scope2 {
  co2_avoided_tonnes: number;
  trees_equivalent: number;
}

export interface ESG {
  i_gap: number;
  status: EsgStatus;
  summary: string;
}

export interface BillAnalysisResponse {
  bill: UtilityBillInput;
  hourly_profile: HourlyProfileResponse;
  arbitrage: ArbitrageResult;
  scope2: Scope2;
  esg: ESG;
  ai_roadmap: string[];
  esg_executive_summary: string;
}

export type TierId = "free" | "pro_7500" | "enterprise_50000";
export type BillingCycle = "month" | "year";

export interface SubscribeRequest {
  tier_id: TierId;
  billing_cycle: BillingCycle;
}

export interface SubscribeResponse {
  status: string;
  payment_url: string;
  tier: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqListResponse {
  items: FaqItem[];
}

export interface ChatResponse {
  reply: string;
  source: string;
}

export interface ProfileMeResponse {
  authenticated: boolean;
  user: {
    sub: string;
    role: string;
  };
}
