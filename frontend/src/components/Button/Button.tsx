import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  icon,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${styles.button} ${className ?? ""}`}
      data-variant={variant}
      data-size={size}
      data-full={fullWidth || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={18} className={styles.spinner} /> : icon}
      <span>{children}</span>
    </button>
  );
}
