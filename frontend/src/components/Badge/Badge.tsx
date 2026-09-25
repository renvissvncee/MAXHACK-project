import { BadgeCheck } from "lucide-react";
import styles from "./Badge.module.css";

interface BadgeProps {
  size?: "sm" | "md";
}

export default function VerifiedBadge({ size = "md" }: BadgeProps) {
  return (
    <span className={styles.badge} data-size={size}>
      <BadgeCheck size={size === "sm" ? 13 : 15} strokeWidth={2.4} />
      Верифицирован
    </span>
  );
}
