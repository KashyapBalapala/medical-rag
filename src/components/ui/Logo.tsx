import { cn, ds } from "@/lib/design-system";

export type LogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

function MedicalLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.5"
        className="opacity-40"
      />
      <path
        d="M12 8v8M8 12h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const sizeMap = {
  sm: { shell: ds.logo.sm, icon: ds.logo.iconSm },
  md: { shell: ds.logo.md, icon: ds.logo.iconMd },
  lg: { shell: ds.logo.lg, icon: ds.logo.iconLg },
} as const;

export default function Logo({ size = "md", className }: LogoProps) {
  const sizes = sizeMap[size];

  return (
    <div
      className={cn(ds.logo.shell, sizes.shell, className)}
      aria-label="Medical RAG logo"
    >
      <MedicalLogoIcon className={cn(sizes.icon, "text-white")} />
    </div>
  );
}
