import type {
  BillAnalysisResponse,
  ChatResponse,
  FaqListResponse,
  ProfileMeResponse,
  SubscribeRequest,
  SubscribeResponse,
} from "@/lib/types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const DEMO_TOKEN = "demo-jwt-token";

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
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError(`Бэкенд недоступен. Запустите API на ${API_BASE}.`);
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

export async function analyzeUtilityBill(file: File): Promise<BillAnalysisResponse> {
  const body = new FormData();
  body.append("file", file, file.name);
  return request<BillAnalysisResponse>("/api/v1/analyze-bill", { method: "POST", body });
}

export async function subscribe(payload: SubscribeRequest): Promise<SubscribeResponse> {
  return request<SubscribeResponse>("/api/v1/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchProfileMe(): Promise<ProfileMeResponse> {
  return request<ProfileMeResponse>("/api/v1/profile/me", {
    headers: { Authorization: `Bearer ${DEMO_TOKEN}` },
  });
}

export async function fetchFaq(): Promise<FaqListResponse> {
  return request<FaqListResponse>("/api/v1/faq");
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  return request<ChatResponse>("/api/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}
