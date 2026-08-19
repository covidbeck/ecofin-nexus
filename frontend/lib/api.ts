import type { BillAnalysisResponse } from "@/lib/types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

export async function analyzeUtilityBill(file: File): Promise<BillAnalysisResponse> {
  const body = new FormData();
  body.append("file", file, file.name);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/v1/analyze-bill`, {
      method: "POST",
      body,
    });
  } catch {
    throw new ApiError("Бэкенд недоступен. Запустите API на http://localhost:8000.");
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

  return (await response.json()) as BillAnalysisResponse;
}
