const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getCheckin: (token: string) =>
    request(`/api/checkins/${token}`),

  saveResponses: (token: string, responses: object[]) =>
    request(`/api/checkins/${token}/save`, {
      method: "POST",
      body: JSON.stringify({ responses }),
    }),

  completeCheckin: (token: string, responses: object[]) =>
    request(`/api/checkins/${token}/complete`, {
      method: "POST",
      body: JSON.stringify({ responses }),
    }),

  listFarms: () =>
    request(`/api/admin/farms`),

  getFarm: (id: string) =>
    request(`/api/admin/farms/${id}`),

  dispatchCheckin: (farmId: string) =>
    request(`/api/admin/farms/${farmId}/dispatch`, { method: "POST", body: "{}" }),

  getReport: (farmId: string) =>
    request(`/api/report/${farmId}`),

  getAiBriefing: (farmId: string) =>
    request(`/api/report/${farmId}/briefing`, { method: "POST", body: "{}" }),
};
