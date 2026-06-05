import { cn, ds } from "@/lib/design-system";
import type { ButtonHTMLAttributes } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: ds.button.primary,
    secondary: ds.button.secondary,
    ghost: ds.button.ghost,
  }[variant];

  const sizeClass = {
    sm: ds.button.sm,
    md: ds.button.md,
    lg: ds.button.lg,
  }[size];

  return (
    <button
      className={cn(ds.button.base, variantClass, sizeClass, className)}
      {...props}
    >
      {children}
    </button>
  );
}
