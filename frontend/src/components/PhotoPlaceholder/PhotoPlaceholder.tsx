import { Home } from "lucide-react";
import styles from "./PhotoPlaceholder.module.css";

interface PhotoPlaceholderProps {
  variant: string;
  className?: string;
  iconSize?: number;
}

export default function PhotoPlaceholder({ variant, className, iconSize = 28 }: PhotoPlaceholderProps) {
  return (
    <div className={`${styles.photo} gradient-${variant} ${className ?? ""}`}>
      <div className={styles.pattern} />
      <Home size={iconSize} className={styles.icon} strokeWidth={1.5} />
    </div>
  );
}
