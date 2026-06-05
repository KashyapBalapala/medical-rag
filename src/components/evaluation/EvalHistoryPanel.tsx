"use client";

import type { EvaluationRecord } from "@/types/evaluation";
import { formatMs } from "@/lib/chat-utils";
import { cn } from "@/lib/design-system";

type EvalHistoryPanelProps = {
  records: EvaluationRecord[];
  onSelect: (record: EvaluationRecord) => void;
  onClear: () => void;
  selectedId?: string | null;
};

export default function EvalHistoryPanel({
  records,
  onSelect,
  onClear,
  selectedId,
}: EvalHistoryPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/60">
      <div className="flex items-center justify-between border-b border-slate-700/80 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Evaluation history
        </h3>
        {records.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-medium text-slate-500 transition hover:text-red-400"
          >
            Clear
          </button>
        )}
      </div>

      <ul className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
        {records.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-slate-500">
            No tests yet
          </li>
        ) : (
          records.map((record) => (
            <li key={record.id}>
              <button
                type="button"
                onClick={() => onSelect(record)}
                className={cn(
                  "w-full px-4 py-3 text-left transition hover:bg-slate-800/60",
                  selectedId === record.id && "bg-violet-500/10",
                )}
              >
                <p className="line-clamp-2 text-sm font-medium text-slate-200">
                  {record.question}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-semibold",
                      record.success
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-amber-500/15 text-amber-400",
                    )}
                  >
                    {record.success ? "Success" : "Low evidence"}
                  </span>
                  <span className="text-slate-500">
                    Top {record.topScore}% · Conf {record.confidence}%
                  </span>
                  <span className="text-slate-500">
                    {formatMs(record.generationMs)} gen
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-600">
                  {new Date(record.createdAt).toLocaleString()}
                </p>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
