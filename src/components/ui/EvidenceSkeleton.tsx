import { cn } from "@/lib/design-system";

type EvidenceSkeletonProps = {
  lines?: number;
  className?: string;
};

export default function EvidenceSkeleton({
  lines = 8,
  className,
}: EvidenceSkeletonProps) {
  return (
    <div
      className={cn("animate-pulse space-y-2.5", className)}
      role="status"
      aria-label="Loading evidence content"
    >
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-3 rounded bg-slate-200/80",
            index % 3 === 0 ? "w-full" : index % 3 === 1 ? "w-[92%]" : "w-[78%]",
          )}
        />
      ))}
      <span className="sr-only">Loading retrieved evidence…</span>
    </div>
  );
}
