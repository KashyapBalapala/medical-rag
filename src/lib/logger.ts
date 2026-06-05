function timestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

export function isRagLoggingEnabled(): boolean {
  return process.env.RAG_LOG === "true";
}

/** Status lines — always on its own line, never mixed with streamed tokens. */
export function ragLog(step: string, detail?: string): void {
  if (!isRagLoggingEnabled()) return;
  const suffix = detail ? ` — ${detail}` : "";
  console.error(`[${timestamp()}] [rag] ${step}${suffix}`);
}

/** Progress during live token streaming (stderr avoids breaking stdout). */
export function ragLogProgress(step: string, detail?: string): void {
  ragLog(step, detail);
}

export function ragLogSection(title: string): void {
  if (!isRagLoggingEnabled()) return;
  console.error(`\n${"═".repeat(60)}`);
  console.error(`  ${title}`);
  console.error(`${"═".repeat(60)}\n`);
}

export function ragLogBlock(title: string, body: string): void {
  if (!isRagLoggingEnabled()) return;
  const border = "─".repeat(60);
  console.error(`[${timestamp()}] [rag] ${title}`);
  console.error(border);
  console.error(body.trim() || "(empty)");
  console.error(border);
}

/** Live LLM output — stdout only, no timestamps prefixed per token. */
export function ragStreamWrite(text: string): void {
  process.stdout.write(text);
}

export function ragStreamNewline(): void {
  process.stdout.write("\n");
}

export function startTimer(): number {
  return performance.now();
}

export function elapsedMs(start: number): number {
  return Math.round(performance.now() - start);
}

export function ragLogTiming(step: string, startMs: number, extra?: string): number {
  const ms = elapsedMs(startMs);
  const detail = extra ? `${ms}ms (${extra})` : `${ms}ms`;
  ragLog(step, detail);
  return ms;
}

export function startProgressHeartbeat(
  label: string,
  startMs: number,
  intervalMs = 15000,
): ReturnType<typeof setInterval> {
  if (!isRagLoggingEnabled()) {
    return setInterval(() => {}, 1_000_000);
  }

  return setInterval(() => {
    ragLogProgress(label, `${elapsedMs(startMs)}ms elapsed`);
  }, intervalMs);
}
