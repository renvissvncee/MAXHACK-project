export type NotificationKind = "request_created" | "request_accepted" | "request_declined" | "review_created";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  text: string;
  targetType: "request" | "user_reviews";
  targetId: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPage {
  unreadCount: number;
  items: AppNotification[];
}
