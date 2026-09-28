const NOTIFICATION_START_PARAM = /^notification_([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function notificationIdFromStartParam(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 512) return null;
  return NOTIFICATION_START_PARAM.exec(value)?.[1]?.toLowerCase() ?? null;
}

export function currentStartParam(): string | null {
  return window.WebApp?.initDataUnsafe?.start_param
    ?? new URLSearchParams(window.location.search).get("WebAppStartParam");
}
