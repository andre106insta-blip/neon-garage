import type { Car, Expense, Plan, Stats } from "./types";

const BASE = (import.meta as any).env?.VITE_API_BASE ?? "";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/**
 * Лёгкий in-memory кэш для GET-списков (cars, stats).
 * Переключение вкладок — мгновенно, без повторной загрузки.
 * Любая мутация сбрасывает кэш, чтобы данные не устаревали.
 */
const cache = new Map<string, unknown>();

function cachedReq<T>(key: string, path: string): Promise<T> {
  if (cache.has(key)) return Promise.resolve(cache.get(key) as T);
  return req<T>(path).then((v) => {
    cache.set(key, v);
    return v;
  });
}

function clearCache() {
  cache.clear();
}

export const api = {
  // cars
  listCars: (status?: string) =>
    cachedReq<Car[]>(`cars:${status ?? "all"}`, `/api/cars${status ? `?status=${status}` : ""}`),
  getCar: (id: number) => req<Car>(`/api/cars/${id}`),
  createCar: (data: Partial<Car>) =>
    req<Car>(`/api/cars`, { method: "POST", body: JSON.stringify(data) }).then((r) => {
      clearCache();
      return r;
    }),
  updateCar: (id: number, data: Partial<Car>) =>
    req<Car>(`/api/cars/${id}`, { method: "PATCH", body: JSON.stringify(data) }).then((r) => {
      clearCache();
      return r;
    }),
  deleteCar: (id: number) =>
    req<{ ok: boolean }>(`/api/cars/${id}`, { method: "DELETE" }).then((r) => {
      clearCache();
      return r;
    }),

  // expenses
  listExpenses: (carId: number) => req<Expense[]>(`/api/cars/${carId}/expenses`),
  createExpense: (carId: number, data: Partial<Expense>) =>
    req<Expense>(`/api/cars/${carId}/expenses`, {
      method: "POST",
      body: JSON.stringify(data),
    }).then((r) => {
      clearCache();
      return r;
    }),
  deleteExpense: (carId: number, expenseId: number) =>
    req<{ ok: boolean }>(`/api/cars/${carId}/expenses/${expenseId}`, { method: "DELETE" }).then(
      (r) => {
        clearCache();
        return r;
      },
    ),

  // plans
  listPlans: () => req<Plan[]>(`/api/plans`),
  listCarPlans: (carId: number) => req<Plan[]>(`/api/cars/${carId}/plans`),
  createPlan: (carId: number, data: Partial<Plan>) =>
    req<Plan>(`/api/cars/${carId}/plans`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updatePlan: (id: number, data: Partial<Omit<Plan, "done">> & { done?: boolean }) =>
    req<Plan>(`/api/plans/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePlan: (id: number) => req<{ ok: boolean }>(`/api/plans/${id}`, { method: "DELETE" }),

  // stats
  stats: () => cachedReq<Stats>(`stats`, `/api/stats`),

  // сбросить кэш вручную (например, при pull-to-refresh)
  clearCache,
};
