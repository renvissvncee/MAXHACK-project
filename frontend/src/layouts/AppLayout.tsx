import { Outlet } from "react-router-dom";
import BottomNav from "../components/BottomNav/BottomNav";
import styles from "./AppLayout.module.css";

export default function AppLayout() {
  return (
    <div className={styles.shell}>
      <div className={styles.page}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
