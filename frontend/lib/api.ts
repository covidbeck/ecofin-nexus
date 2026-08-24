import type {
  ActionCatalog,
  ActionLevel,
  AuthResponse,
  BillUploadResponse,
  CheckoutResponse,
  ConfigState,
  ConsumptionCreate,
  ConsumptionList,
  ConsumptionRecord,
  CopilotResponse,
  DashboardResponse,
  DemoSeedResponse,
  EmissionFactor,
  FaqListResponse,
  OptimizationResponse,
  OrganizationProfile,
  OrganizationProfileUpdate,
  PlanId,
  PlansResponse,
  Scenario,
  ScenarioList,
  SimulationResult,
  Subscription,
  TariffConfig,
  UserResponse,
} from "@/lib/types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "nexus.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function detailMessage(detail: unknown): string | null {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    return (
      detail
        .map((item) =>
          item && typeof item === "object" && "msg" in item
            ? String((item as { msg: unknown }).msg)
            : String(item),
        )
        .join("; ") || null
    );
  }
  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      `Сервис Nexus временно недоступен. Проверьте, что API запущен (${API_BASE}).`,
    );
  }

  if (!response.ok) {
    let message = `Ошибка API (${response.status})`;
    try {
      const payload = (await response.json()) as { detail?: unknown };
      message = detailMessage(payload.detail) ?? message;
    } catch {
      /* keep fallback message */
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ---------------------------------------------------------------- auth

export function apiRegister(input: {
  name: string;
  organization_name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/api/v1/auth/register", jsonInit("POST", input));
}

export function apiLogin(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/v1/auth/login", jsonInit("POST", { email, password }));
}

export function apiLogout(): Promise<{ status: string }> {
  return request<{ status: string }>("/api/v1/auth/logout", { method: "POST" });
}

export function fetchMe(): Promise<UserResponse> {
  return request<UserResponse>("/api/v1/auth/me");
}

// ---------------------------------------------------------------- organization

export function fetchOrganizationProfile(): Promise<OrganizationProfile> {
  return request<OrganizationProfile>("/api/v1/organization/profile");
}

export function updateOrganizationProfile(
  payload: OrganizationProfileUpdate,
): Promise<OrganizationProfile> {
  return request<OrganizationProfile>("/api/v1/organization/profile", jsonInit("PUT", payload));
}

export function fetchOrganizationConfig(): Promise<ConfigState> {
  return request<ConfigState>("/api/v1/organization/config");
}

export function putTariff(payload: TariffConfig): Promise<TariffConfig> {
  return request<TariffConfig>("/api/v1/organization/tariff", jsonInit("PUT", payload));
}

export function putEmissionFactor(payload: EmissionFactor): Promise<EmissionFactor> {
  return request<EmissionFactor>(
    "/api/v1/organization/emission-factor",
    jsonInit("PUT", payload),
  );
}

// ---------------------------------------------------------------- bills / consumption

export function uploadBill(file: File): Promise<BillUploadResponse> {
  const body = new FormData();
  body.append("file", file, file.name);
  return request<BillUploadResponse>("/api/v1/bills/upload", { method: "POST", body });
}

export function createConsumption(payload: ConsumptionCreate): Promise<ConsumptionRecord> {
  return request<ConsumptionRecord>("/api/v1/consumption", jsonInit("POST", payload));
}

export function fetchConsumption(): Promise<ConsumptionList> {
  return request<ConsumptionList>("/api/v1/consumption");
}

// ---------------------------------------------------------------- dashboard

export function fetchDashboard(recordId?: number): Promise<DashboardResponse> {
  const query = recordId ? `?record_id=${recordId}` : "";
  return request<DashboardResponse>(`/api/v1/dashboard${query}`);
}

// ---------------------------------------------------------------- scenarios

export function fetchActionCatalog(): Promise<ActionCatalog> {
  return request<ActionCatalog>("/api/v1/scenarios/catalog");
}

export function fetchScenarios(): Promise<ScenarioList> {
  return request<ScenarioList>("/api/v1/scenarios");
}

export function createScenario(input: {
  name: string;
  base_record_id: number;
  actions: ActionLevel[];
}): Promise<Scenario> {
  return request<Scenario>("/api/v1/scenarios", jsonInit("POST", input));
}

export function updateScenario(
  id: number,
  input: { name?: string; actions?: ActionLevel[] },
): Promise<Scenario> {
  return request<Scenario>(`/api/v1/scenarios/${id}`, jsonInit("PUT", input));
}

export function simulateScenario(id: number): Promise<SimulationResult> {
  return request<SimulationResult>(`/api/v1/scenarios/${id}/simulate`, { method: "POST" });
}

export function optimizeScenarios(baseRecordId: number): Promise<OptimizationResponse> {
  return request<OptimizationResponse>(
    "/api/v1/scenarios/optimize",
    jsonInit("POST", { base_record_id: baseRecordId }),
  );
}

// ---------------------------------------------------------------- subscription

export function fetchPlans(): Promise<PlansResponse> {
  return request<PlansResponse>("/api/v1/subscription/plans");
}

export function fetchSubscription(): Promise<Subscription> {
  return request<Subscription>("/api/v1/subscription");
}

export function checkout(plan: PlanId, cycle: "month" | "year"): Promise<CheckoutResponse> {
  return request<CheckoutResponse>("/api/v1/subscription/checkout", jsonInit("POST", { plan, cycle }));
}

// ---------------------------------------------------------------- copilot & demo

export function fetchFaq(): Promise<FaqListResponse> {
  return request<FaqListResponse>("/api/v1/copilot/faq");
}

export function sendCopilotMessage(message: string): Promise<CopilotResponse> {
  return request<CopilotResponse>("/api/v1/copilot/chat", jsonInit("POST", { message }));
}

export function seedDemoData(): Promise<DemoSeedResponse> {
  return request<DemoSeedResponse>("/api/v1/demo/seed", { method: "POST" });
}
