import { Home, Inbox, Search, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import styles from "./BottomNav.module.css";

const items = [
  { to: "/home", label: "Главная", icon: Home },
  { to: "/search", label: "Поиск", icon: Search },
  { to: "/requests", label: "Заявки", icon: Inbox },
  { to: "/profile", label: "Профиль", icon: User },
];

export default function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Основная навигация">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
        >
          <Icon size={22} strokeWidth={2.1} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
