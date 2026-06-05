import Logo from "@/components/ui/Logo";
import { cn, ds } from "@/lib/design-system";
import type { ReactNode } from "react";

export type HeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export default function Header({
  title,
  subtitle,
  actions,
  className,
}: HeaderProps) {
  return (
    <header className={cn(ds.header.shell, ds.layout.section, className)}>
      <div className={cn(ds.layout.container, ds.header.inner)}>
        <Logo size="md" />
        <div className="min-w-0 flex-1">
          <h1 className={ds.typography.h1}>{title}</h1>
          {subtitle && (
            <p className={cn("mt-0.5", ds.typography.caption, "text-slate-500")}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
