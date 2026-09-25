import type { ReactNode } from "react";
import Button from "../Button/Button";
import styles from "./StateView.module.css";

interface StateViewProps {
  icon: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "neutral" | "danger";
}

export default function StateView({ icon, title, description, actionLabel, onAction, tone = "neutral" }: StateViewProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon} data-tone={tone}>
        {icon}
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction} className={styles.action}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
