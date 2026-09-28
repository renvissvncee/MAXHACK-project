export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...options, credentials: "include",
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
      signal: AbortSignal.timeout(15000) });
  } catch { throw new Error("Сервер недоступен или не ответил за 15 секунд. Повторите запрос."); }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = response.status === 401 ? "Сессия истекла. Откройте приложение заново через MAX." : body?.error?.message;
    throw new ApiError(response.status, message || `Ошибка сервера (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
