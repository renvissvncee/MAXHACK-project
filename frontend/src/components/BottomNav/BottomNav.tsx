import { Bell, Home, Inbox, Search, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getNotifications } from "../../services/notificationsService";
import styles from "./BottomNav.module.css";

const items = [
  { to: "/home", label: "Главная", icon: Home },
  { to: "/search", label: "Поиск", icon: Search },
  { to: "/requests", label: "Заявки", icon: Inbox },
  { to: "/notifications", label: "События", icon: Bell },
  { to: "/profile", label: "Профиль", icon: User },
];

export default function BottomNav() {
  const [unreadCount, setUnreadCount] = useState(0);
  const refresh = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    void getNotifications(true).then((page) => setUnreadCount(page.unreadCount)).catch(() => undefined);
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 45_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("priut:notifications-updated", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("priut:notifications-updated", refresh);
    };
  }, [refresh]);

  return (
    <nav className={styles.nav} aria-label="Основная навигация">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
        >
          <Icon size={22} strokeWidth={2.1} />
          {to === "/notifications" && unreadCount > 0 && (
            <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
          )}
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
