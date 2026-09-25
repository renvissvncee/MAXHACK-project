import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./IconButton.module.css";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "surface" | "ghost" | "solid";
}

export default function IconButton({ children, variant = "surface", className, ...rest }: IconButtonProps) {
  return (
    <button type="button" className={`${styles.iconButton} ${className ?? ""}`} data-variant={variant} {...rest}>
      {children}
    </button>
  );
}
