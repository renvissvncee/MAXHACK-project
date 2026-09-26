import { Home } from "lucide-react";
import { useState } from "react";
import styles from "./PhotoPlaceholder.module.css";

interface PhotoPlaceholderProps {
  /** Either a gradient key (e.g. "violet") for the mock look, or a real image URL. */
  variant: string;
  className?: string;
  iconSize?: number;
}

const isImageUrl = (value: string) => value.startsWith("http://") || value.startsWith("https://");

export default function PhotoPlaceholder({ variant, className, iconSize = 28 }: PhotoPlaceholderProps) {
  const [failed, setFailed] = useState(false);

  if (isImageUrl(variant) && !failed) {
    return (
      <div className={`${styles.photo} ${className ?? ""}`}>
        <img
          src={variant}
          alt=""
          className={styles.image}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.photo} gradient-${isImageUrl(variant) ? "violet" : variant} ${className ?? ""}`}>
      <div className={styles.pattern} />
      <Home size={iconSize} className={styles.icon} strokeWidth={1.5} />
    </div>
  );
}
