import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StateView from "../../components/StateView/StateView";
import { useToast } from "../../context/ToastContext";
import { getNotifications, markNotificationRead, notificationDestination } from "../../services/notificationsService";
import type { AppNotification, NotificationKind, NotificationPage } from "../../types/notification";
import { pluralRu } from "../../utils/plural";
import styles from "./Notifications.module.css";

const UNREAD_FORMS = ["непрочитанное", "непрочитанных", "непрочитанных"] as const;

const kindLabels: Record<NotificationKind, string> = {
  request_created: "Новая заявка",
  request_accepted: "Заявка принята",
  request_declined: "Заявка отклонена",
  review_created: "Новый отзыв",
};

export default function Notifications() {
  const [page, setPage] = useState<NotificationPage | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setError(false);
    try { setPage(await getNotifications()); }
    catch { setError(true); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const launch = params.get("launch");
    if (!launch) return;
    showToast(launch === "invalid" ? "Ссылка MAX не содержит корректного уведомления." : "Уведомление не найдено.", "info");
    params.delete("launch");
    setParams(params, { replace: true });
  }, [params, setParams, showToast]);

  const open = async (notification: AppNotification) => {
    setBusyId(notification.id);
    try {
      if (!notification.readAt) await markNotificationRead(notification.id);
      window.dispatchEvent(new Event("priut:notifications-updated"));
      navigate(notificationDestination(notification));
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : "Не удалось открыть уведомление.", "info");
      setBusyId(null);
    }
  };

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><p>События</p><h1>Уведомления</h1></div>
      <button type="button" onClick={() => void load()} aria-label="Обновить"><RefreshCw size={19} /></button>
    </header>
    {page && page.unreadCount > 0 && (
      <div className={styles.unread}>
        <CheckCheck size={17} /> {page.unreadCount} {pluralRu(page.unreadCount, UNREAD_FORMS)}
      </div>
    )}
    {!page && !error && <p className={styles.loading}>Загружаем уведомления…</p>}
    {error && <StateView tone="danger" icon={<Bell size={28} />} title="Не удалось загрузить" description="Проверьте соединение." actionLabel="Повторить" onAction={() => void load()} />}
    {page?.items.length === 0 && <StateView icon={<Bell size={28} />} title="Пока тихо" description="Здесь появятся заявки, решения и новые отзывы." />}
    {page && page.items.length > 0 && <div className={styles.list}>{page.items.map((notification) => (
      <button key={notification.id} type="button" className={styles.item} data-unread={!notification.readAt || undefined}
        disabled={busyId === notification.id} onClick={() => void open(notification)}>
        <span className={styles.icon}><Bell size={18} /></span>
        <span className={styles.copy}><strong>{kindLabels[notification.kind]}</strong><span>{notification.text}</span></span>
        {!notification.readAt && <span className={styles.dot} aria-label="Не прочитано" />}
      </button>
    ))}</div>}
  </main>;
}
