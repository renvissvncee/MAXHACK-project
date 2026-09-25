import type { ReactNode } from "react";
import styles from "./Tag.module.css";

interface TagProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export default function Tag({ children, active, onClick }: TagProps) {
  if (onClick) {
    return (
      <button type="button" className={styles.tag} data-active={active || undefined} onClick={onClick}>
        {children}
      </button>
    );
  }
  return (
    <span className={styles.tag} data-active={active || undefined}>
      {children}
    </span>
  );
}
