"use client";

import { displayFilename } from "@/lib/chat-utils";
import type { RankedChunk } from "@/types/evaluation";
import { cn } from "@/lib/design-system";

type EvalChunkTableProps = {
  chunks: RankedChunk[];
  loading?: boolean;
};

function scoreColor(score: number): string {
  const percent = score * 100;
  if (percent >= 85) return "text-emerald-400 bg-emerald-500/15";
  if (percent >= 70) return "text-cyan-400 bg-cyan-500/15";
  return "text-amber-400 bg-amber-500/15";
}

export default function EvalChunkTable({ chunks, loading }: EvalChunkTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/60">
      <div className="border-b border-slate-700/80 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Retrieval quality · Top {Math.min(chunks.length, 5)} chunks
        </h3>
      </div>

      {loading ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">
          Running retrieval…
        </p>
      ) : chunks.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">
          Run a test to inspect retrieved chunks
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/80 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5 font-semibold">Rank</th>
                <th className="px-4 py-2.5 font-semibold">Score</th>
                <th className="px-4 py-2.5 font-semibold">Document</th>
                <th className="px-4 py-2.5 font-semibold">Chunk</th>
                <th className="px-4 py-2.5 font-semibold">Content</th>
              </tr>
            </thead>
            <tbody>
              {chunks.map((chunk) => (
                <tr
                  key={`${chunk.rank}-${chunk.file}-${chunk.chunkIndex}`}
                  className="border-b border-slate-800/80 last:border-0"
                >
                  <td className="px-4 py-3 font-mono font-bold text-violet-300">
                    #{chunk.rank}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono text-xs font-semibold",
                        scoreColor(chunk.score),
                      )}
                    >
                      {Math.round(chunk.score * 100)}%
                    </span>
                  </td>
                  <td className="max-w-[140px] truncate px-4 py-3 text-slate-200">
                    {displayFilename(chunk.file)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {chunk.chunkIndex}
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <p className="line-clamp-3 font-mono text-xs leading-relaxed text-slate-400">
                      {chunk.content}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
