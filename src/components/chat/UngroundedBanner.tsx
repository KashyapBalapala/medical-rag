import { cn } from "@/lib/design-system";

type UngroundedBannerProps = {
  className?: string;
};

export default function UngroundedBanner({ className }: UngroundedBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3",
        className,
      )}
    >
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-900"
        aria-hidden
      >
        !
      </span>
      <div>
        <p className="text-sm font-semibold text-amber-950">
          Limited document evidence
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-amber-900/80">
          No closely matching chunks were retrieved. Treat this answer with extra
          caution and verify against your source documents.
        </p>
      </div>
    </div>
  );
}
