import { api } from "./api.ts";
import type { AppNotification, NotificationPage } from "../types/notification.ts";

export function getNotifications(unreadOnly = false) {
  return api<NotificationPage>(`/api/notifications?unread_only=${unreadOnly}&limit=100`);
}

export function getNotification(id: string) {
  return api<AppNotification>(`/api/notifications/${encodeURIComponent(id)}`);
}

export function markNotificationRead(id: string) {
  return api<AppNotification>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
}

export function notificationDestination(notification: AppNotification) {
  if (notification.targetType === "user_reviews") {
    return `/users/${notification.targetId}/reviews`;
  }
  const direction = notification.kind === "request_created" ? "incoming" : "outgoing";
  return `/requests?direction=${direction}&focus=${notification.targetId}`;
}
