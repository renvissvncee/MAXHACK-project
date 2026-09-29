import { Home } from "lucide-react";
import { useState } from "react";
import styles from "./PhotoPlaceholder.module.css";

interface PhotoPlaceholderProps {
  /** Either a gradient key (e.g. "violet") for the mock look, or a real image URL. Falsy while real listings have no photos yet. */
  variant?: string;
  className?: string;
  iconSize?: number;
}

const isImageUrl = (value: string) =>
  value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/");

export default function PhotoPlaceholder({ variant, className, iconSize = 28 }: PhotoPlaceholderProps) {
  const [failed, setFailed] = useState(false);

  if (variant && isImageUrl(variant) && !failed) {
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

  const gradientKey = variant && !isImageUrl(variant) ? variant : "violet";

  return (
    <div className={`${styles.photo} gradient-${gradientKey} ${className ?? ""}`}>
      <div className={styles.pattern} />
      <Home size={iconSize} className={styles.icon} strokeWidth={1.5} />
    </div>
  );
}
