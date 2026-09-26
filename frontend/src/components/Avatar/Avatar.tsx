import { getIdentityGradient, getInitials } from "../../utils/initials";
import styles from "./Avatar.module.css";

interface AvatarProps {
  /** Real photo URL (or data URL). Takes priority over emoji/initials. */
  photo?: string | null;
  /** Decorative mock avatar, used for demo hosts that don't have real photos. */
  emoji?: string;
  /** Gradient key. Falls back to a deterministic pick based on `name` when omitted. */
  color?: string;
  name: string;
  size?: number;
  className?: string;
}

export default function Avatar({ photo, emoji, color, name, size = 44, className }: AvatarProps) {
  const style = { width: size, height: size, fontSize: size * 0.44 };

  if (photo) {
    return (
      <div className={`${styles.avatar} ${className ?? ""}`} style={style}>
        <img src={photo} alt={name} className={styles.image} />
      </div>
    );
  }

  const gradientKey = color ?? getIdentityGradient(name || "?");

  return (
    <div className={`${styles.avatar} gradient-${gradientKey} ${className ?? ""}`} style={style}>
      <span>{emoji ?? getInitials(name)}</span>
    </div>
  );
}
