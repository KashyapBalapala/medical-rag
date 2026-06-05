import { cn, ds } from "@/lib/design-system";
import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "elevated" | "outline";
  hover?: boolean;
  padding?: "none" | "sm" | "md";
};

export default function Card({
  variant = "default",
  hover = false,
  padding = "md",
  className,
  children,
  ...props
}: CardProps) {
  const variantClass = {
    default: "",
    elevated: ds.card.elevated,
    outline: "bg-slate-50/50",
  }[variant];

  const paddingClass = {
    none: "",
    sm: ds.card.paddingSm,
    md: ds.card.padding,
  }[padding];

  return (
    <div
      className={cn(
        ds.card.base,
        variantClass,
        hover && ds.card.hover,
        paddingClass,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
