"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import RagAnalyticsDashboard from "@/components/RagAnalyticsDashboard";
import type { SystemStats } from "@/lib/stats";
import ChatThread from "@/components/chat/ChatThread";
import ChatEmptyState from "@/components/chat/ChatEmptyState";
import ChatComposer from "@/components/chat/ChatComposer";
import EvidenceDrawer from "@/components/EvidenceDrawer";
import DocumentLibrary from "@/components/DocumentLibrary";

const PDFViewerModal = dynamic(() => import("@/components/PDFViewerModal"), {
  ssr: false,
});
import AILoading from "@/components/AILoading";
import { Button, Header } from "@/components/ui";
import { useSourceCollection } from "@/hooks/useSourceCollection";
import {
  computeAnswerConfidence,
  estimateTimings,
} from "@/lib/chat-utils";
import { useConversationMemory } from "@/hooks/useConversationMemory";
import { buildHistoryForRequest } from "@/lib/memory-service";
import { cn, ds } from "@/lib/design-system";
import { computeSessionAnalytics } from "@/lib/session-analytics";
import {
  shouldUseResearchMode,
} from "@/lib/research-mode";
import type { ChatMessage, CitationSource, RagDebugInfo } from "@/types/chat";

const DEBUG_KEY = "medical-rag-debug-mode";
const RESEARCH_KEY = "medical-rag-research-mode";

function createId(): string {
  return crypto.randomUUID();
}

function loadDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEBUG_KEY) === "true";
}

function loadResearchMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(RESEARCH_KEY) === "true";
}

export default function Home() {
  const {
    messages,
    hydrated,
    historyForRequest,
    memoryActive,
    exchangeCount,
    appendMessage,
    clearMemory,
  } = useConversationMemory();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [debugMode, setDebugMode] = useState(() => loadDebugMode());
  const [researchMode, setResearchMode] = useState(() => loadResearchMode());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const evidence = useSourceCollection();
  const pdfViewer = useSourceCollection();

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(DEBUG_KEY, String(debugMode));
  }, [debugMode, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(RESEARCH_KEY, String(researchMode));
  }, [researchMode, hydrated]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const response = await fetch("/api/stats");
      if (!response.ok) throw new Error("Failed to load system stats");
      setStats((await response.json()) as SystemStats);
    } catch {
      setStats(null);
      setStatsError("Unable to load pipeline statistics. Check ChromaDB and retry.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats, refreshKey]);

  const sessionAnalytics = useMemo(
    () => computeSessionAnalytics(messages),
    [messages],
  );

  function handleRefresh() {
    setRefreshKey((key) => key + 1);
    void fetchStats();
  }

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const history = buildHistoryForRequest(messages);
    const useResearch = shouldUseResearchMode(trimmed, researchMode);

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
      researchMode: useResearch,
    };

    appendMessage(userMessage);
    setInput("");
    setLoading(true);
    setSidebarOpen(false);

    const started = performance.now();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          history,
          debug: debugMode,
          research: useResearch,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Request failed (${response.status})`,
        );
      }

      const totalMs = Math.round(performance.now() - started);
      const serverDebug = data.debug as RagDebugInfo | undefined;
      const timings = serverDebug?.timings ?? estimateTimings(totalMs);
      const sources: CitationSource[] = data.sources ?? [];
      const confidence = computeAnswerConfidence(sources);

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: data.answer ?? "",
        sources,
        question: trimmed,
        createdAt: new Date().toISOString(),
        confidence,
        timings,
        researchMode: data.researchMode === true || useResearch,
        comparisonMode: data.comparisonMode === true,
        comparisonTopics: Array.isArray(data.comparisonTopics)
          ? data.comparisonTopics
          : undefined,
        topicSources: Array.isArray(data.topicSources)
          ? data.topicSources
          : undefined,
        memory:
          (data.memory as RagDebugInfo["memory"]) ??
          serverDebug?.memory,
        ...(debugMode && serverDebug ? { debug: serverDebug } : {}),
      };

      appendMessage(assistantMessage);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Unknown error occurred";
      appendMessage({
        id: createId(),
        role: "assistant",
        content: `Something went wrong while generating your answer.\n${detail}`,
        error: true,
        retryQuestion: trimmed,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }

  function clearConversation() {
    clearMemory();
  }

  return (
    <div className={ds.layout.page}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      <Header
        title="Medical RAG Assistant"
        subtitle="Evidence-backed research over your medical document library"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/evaluation">
              <Button type="button" variant="ghost" size="sm">
                Evaluation Lab
              </Button>
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-expanded={sidebarOpen}
              aria-controls="document-sidebar"
            >
              Documents
            </Button>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
              <input
                type="checkbox"
                checked={researchMode}
                onChange={(event) => setResearchMode(event.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Research mode
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(event) => setDebugMode(event.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              RAG Debug
            </label>
            {messages.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearConversation}
              >
                Clear chat
              </Button>
            )}
          </div>
        }
      />

      <RagAnalyticsDashboard
        stats={stats}
        session={sessionAnalytics}
        loading={statsLoading}
        error={statsError}
        onRefresh={handleRefresh}
      />

      <div className={cn("flex-1 pb-6", ds.layout.section)}>
        <div className={cn(ds.layout.containerWide, "grid gap-6 lg:grid-cols-[280px_1fr]")}>
          <aside
            id="document-sidebar"
            className={cn(
              "space-y-4 lg:sticky lg:top-4 lg:block lg:self-start",
              sidebarOpen ? "block" : "hidden",
            )}
          >
            <DocumentLibrary refreshKey={refreshKey} onRefresh={handleRefresh} />
          </aside>

          <main
            id="main-content"
            className="flex min-h-[min(720px,calc(100vh-12rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100"
          >
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/60 to-white px-4 py-5 sm:px-6">
              {!hydrated ? (
                <div className="flex justify-center py-16">
                  <AILoading />
                </div>
              ) : messages.length === 0 && !loading ? (
                <ChatEmptyState
                  disabled={loading}
                  researchMode={researchMode}
                  onSelect={(question) => void sendQuestion(question)}
                />
              ) : (
                <ChatThread
                  messages={messages}
                  loading={loading}
                  debugMode={debugMode}
                  onOpenSource={(payload) => evidence.open(payload)}
                  onRetry={(question) => void sendQuestion(question)}
                />
              )}
            </div>

            <ChatComposer
              input={input}
              loading={loading}
              hasMessages={messages.length > 0}
              researchMode={researchMode}
              memoryActive={memoryActive}
              exchangeCount={exchangeCount}
              messagesIncluded={historyForRequest.length}
              onInputChange={setInput}
              onSubmit={() => void sendQuestion(input)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendQuestion(input);
                }
              }}
            />
          </main>
        </div>
      </div>

      <EvidenceDrawer
        state={evidence.state}
        onClose={evidence.close}
        onNext={evidence.goNext}
        onPrev={evidence.goPrev}
        canGoNext={evidence.canGoNext}
        canGoPrev={evidence.canGoPrev}
        onViewPdf={(source) => {
          if (!evidence.state) return;
          pdfViewer.open({
            source,
            sources: evidence.state.sources,
            query: evidence.state.query,
          });
        }}
      />

      <PDFViewerModal
        state={
          pdfViewer.state
            ? {
                sources: pdfViewer.state.sources,
                activeIndex: pdfViewer.state.activeIndex,
                query: pdfViewer.state.query,
              }
            : null
        }
        onClose={pdfViewer.close}
        onNext={pdfViewer.goNext}
        onPrev={pdfViewer.goPrev}
        canGoNext={pdfViewer.canGoNext}
        canGoPrev={pdfViewer.canGoPrev}
      />
    </div>
  );
}
