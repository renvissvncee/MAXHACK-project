import { Bell } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StateView from "../../components/StateView/StateView";
import { getNotification, markNotificationRead, notificationDestination } from "../../services/notificationsService";

export default function NotificationLaunch() {
  const { notificationId } = useParams<{ notificationId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!notificationId) { navigate("/notifications?launch=not-found", { replace: true }); return; }
    let cancelled = false;
    getNotification(notificationId).then(async (notification) => {
      if (!notification.readAt) await markNotificationRead(notification.id);
      if (cancelled) return;
      window.dispatchEvent(new Event("priut:notifications-updated"));
      navigate(notificationDestination(notification), { replace: true });
    }).catch(() => { if (!cancelled) navigate("/notifications?launch=not-found", { replace: true }); });
    return () => { cancelled = true; };
  }, [navigate, notificationId]);

  return <main className="screen"><StateView icon={<Bell size={28} />} title="Открываем уведомление" description="Проверяем доступ и загружаем событие…" /></main>;
}
