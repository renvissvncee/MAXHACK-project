import styles from "./Avatar.module.css";

interface AvatarProps {
  emoji: string;
  color: string;
  size?: number;
  className?: string;
}

export default function Avatar({ emoji, color, size = 44, className }: AvatarProps) {
  return (
    <div
      className={`${styles.avatar} gradient-${color} ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      <span>{emoji}</span>
    </div>
  );
}
