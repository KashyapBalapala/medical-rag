import { searchDocuments } from "@/lib/retrieve";
import { ragLog, startTimer, elapsedMs } from "@/lib/logger";
import { searchBM25, isBm25IndexLoaded } from "./bm25";
import {
  RETRIEVAL_CONFIG,
  getClassificationLimits,
  isHybridRetrievalEnabled,
} from "./retrieval.config";
import { isBibliographyChunk } from "./chunk-quality";
import { applyDiversitySelection } from "./diversity";
import { rerankResults } from "./rerank";
import { fuseResults } from "./rrf";
import {
  assessRetrievalQuality,
  buildPerformanceWarnings,
} from "./confidence";
import type {
  FusedHit,
  HybridRetrieveResult,
  HybridRetrievalDebug,
  PerQueryRetrievalDebug,
  RankedHit,
  RankedHitSummary,
  RetrievalMetrics,
  RetrievalPlan,
  RetrievalStageCounts,
} from "./types";
import type { SearchResult } from "@/lib/retrieve";

export type HybridRetrieveOptions = {
  log?: boolean;
  planningMs?: number;
};

function toSummary(hit: RankedHit | FusedHit, rank: number): RankedHitSummary {
  const chunk = hit.chunk;
  const base: RankedHitSummary = {
    id: chunk.id,
    file: chunk.metadata.filename,
    chunkIndex: chunk.metadata.chunkIndex,
    score: "score" in hit ? hit.score : hit.finalScore,
    rank,
  };

  if ("source" in hit) {
    base.source = hit.source;
    base.queryLabel = hit.queryLabel;
  }

  if ("rrfScore" in hit) {
    base.rrfScore = hit.rrfScore;
    base.finalScore = hit.finalScore;
    base.queryLabel = hit.queryLabel;
  }

  return base;
}

async function retrieveForQuery(
  query: string,
  label: string,
  log: boolean,
): Promise<{
  bm25Hits: RankedHit[];
  vectorHits: RankedHit[];
  bm25Ms: number;
  vectorMs: number;
}> {
  const { retrieval } = RETRIEVAL_CONFIG;

  const bm25Start = startTimer();
  const bm25Raw = await searchBM25(query, retrieval.bm25TopK);
  const bm25Ms = elapsedMs(bm25Start);

  const vectorStart = startTimer();
  const vectorRaw = await searchDocuments(query, {
    topK: retrieval.vectorTopK,
    log: false,
  });
  const vectorMs = elapsedMs(vectorStart);

  if (log) {
    ragLog(
      "Hybrid query",
      `"${query}" → bm25=${bm25Raw.length} vector=${vectorRaw.length}`,
    );
  }

  return {
    bm25Hits: bm25Raw.map((hit) => ({
      source: "bm25" as const,
      score: hit.score,
      rank: hit.rank,
      chunk: hit.chunk,
      queryLabel: label,
    })),
    vectorHits: vectorRaw.map((hit, index) => ({
      source: "vector" as const,
      score: hit.similarityScore,
      rank: index + 1,
      chunk: hit,
      queryLabel: label,
    })),
    bm25Ms,
    vectorMs,
  };
}

function mergeFusedCandidates(
  perQueryFused: FusedHit[],
): FusedHit[] {
  const bestById = new Map<string, FusedHit>();

  for (const hit of perQueryFused) {
    const existing = bestById.get(hit.chunk.id);
    if (!existing || hit.rrfScore > existing.rrfScore) {
      bestById.set(hit.chunk.id, hit);
    }
  }

  return [...bestById.values()]
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, RETRIEVAL_CONFIG.fusion.candidateTopK);
}

function buildChunksByLabel(
  finalHits: FusedHit[],
): Map<string, SearchResult[]> {
  const map = new Map<string, SearchResult[]>();

  for (const hit of finalHits) {
    const label = hit.queryLabel || "General";
    const list = map.get(label) ?? [];
    list.push(hit.chunk);
    map.set(label, list);
  }

  return map;
}

export async function hybridRetrieve(
  plan: RetrievalPlan,
  options: HybridRetrieveOptions = {},
): Promise<HybridRetrieveResult> {
  const log = options.log ?? false;
  const totalStart = startTimer();
  const planningMs = options.planningMs ?? 0;

  let bm25Ms = 0;
  let vectorMs = 0;
  let fusionMs = 0;
  let diversityMs = 0;
  let rerankMs = 0;

  let bm25ResultsCount = 0;
  let vectorResultsCount = 0;

  const perQueryDebug: PerQueryRetrievalDebug[] = [];
  const allFused: FusedHit[] = [];

  const queryResults = await Promise.all(
    plan.queries.map(async (planned) => {
      const result = await retrieveForQuery(planned.query, planned.label, log);
      return { planned, ...result };
    }),
  );

  for (const result of queryResults) {
    bm25Ms += result.bm25Ms;
    vectorMs += result.vectorMs;
    bm25ResultsCount += result.bm25Hits.length;
    vectorResultsCount += result.vectorHits.length;

    const fusionStart = startTimer();
    const fused = fuseResults(
      result.bm25Hits,
      result.vectorHits,
      RETRIEVAL_CONFIG.fusion.rrfK,
    );
    fusionMs += elapsedMs(fusionStart);

    allFused.push(...fused);

    perQueryDebug.push({
      query: result.planned.query,
      label: result.planned.label,
      bm25Results: result.bm25Hits.map((hit, index) =>
        toSummary(hit, index + 1),
      ),
      vectorResults: result.vectorHits.map((hit, index) =>
        toSummary(hit, index + 1),
      ),
      fusedResults: fused.map((hit, index) => toSummary(hit, index + 1)),
    });
  }

  const mergeStart = startTimer();
  const fusedCandidates = mergeFusedCandidates(allFused);
  const mergeMs = elapsedMs(mergeStart);

  const limits = getClassificationLimits(plan.classification);

  const diversityStart = startTimer();
  const diversePool = applyDiversitySelection(fusedCandidates, {
    targetCount: limits.diversityTopK,
  });
  diversityMs = elapsedMs(diversityStart);

  const rerankStart = startTimer();
  const reranked = rerankResults(diversePool);
  rerankMs = elapsedMs(rerankStart);

  const withoutBibliography = reranked.filter(
    (hit) => !isBibliographyChunk(hit.chunk.content),
  );
  const ranked =
    withoutBibliography.length >= Math.min(limits.finalTopK, 2)
      ? withoutBibliography
      : reranked;

  const finalHits = ranked.slice(0, limits.finalTopK);
  const chunks = finalHits.map((hit) => ({
    ...hit.chunk,
    similarityScore: Number(hit.finalScore.toFixed(2)),
  }));
  const chunksByLabel = buildChunksByLabel(finalHits);

  const uniqueFiles = new Set(chunks.map((chunk) => chunk.metadata.filename));
  const uniqueLabels = new Set(
    [...chunksByLabel.entries()]
      .filter(([, labelChunks]) => labelChunks.length > 0)
      .map(([label]) => label),
  );

  const totalDocsRetrieved = new Set(
    fusedCandidates.map((hit) => hit.chunk.metadata.filename),
  ).size;

  const expectedTopics = Math.max(plan.aspects.length, plan.queries.length, 1);
  const quality = assessRetrievalQuality(finalHits, uniqueFiles.size);

  const retrievalMetrics: RetrievalMetrics = {
    planningMs,
    bm25Ms,
    vectorMs,
    fusionMs,
    diversityMs,
    rerankMs,
    mergeMs,
    totalRetrievalMs: elapsedMs(totalStart),
    documentCoverage: uniqueFiles.size,
    documentCoverageRatio:
      totalDocsRetrieved > 0
        ? Number((uniqueFiles.size / totalDocsRetrieved).toFixed(3))
        : 0,
    topicCoverage: uniqueLabels.size,
    topicCoverageRatio: Number(
      (uniqueLabels.size / expectedTopics).toFixed(3),
    ),
    retrievalConfidence: quality.retrievalConfidence,
    bm25IndexLoaded: isBm25IndexLoaded(),
    hybridEnabled: isHybridRetrievalEnabled(),
    lowRetrievalConfidence: quality.lowRetrievalConfidence,
    performanceWarnings: buildPerformanceWarnings({
      planningMs,
      bm25Ms,
      vectorMs,
      fusionMs,
      rerankMs,
      totalRetrievalMs: elapsedMs(totalStart),
    }),
  };

  const stageCounts: RetrievalStageCounts = {
    bm25ResultsCount,
    vectorResultsCount,
    fusedResultsCount: fusedCandidates.length,
    diversityResultsCount: diversePool.length,
    finalContextChunks: chunks.length,
    uniqueDocuments: uniqueFiles.size,
  };

  const diagnostics: HybridRetrievalDebug = {
    queryPlan: plan,
    retrievalPlan: plan,
    stageCounts,
    perQuery: perQueryDebug,
    retrievalMetrics,
  };

  if (log) {
    ragLog(
      "Hybrid retrieval complete",
      `${chunks.length} chunks | fused=${fusedCandidates.length} diverse=${diversePool.length} docs=${uniqueFiles.size} confidence=${quality.retrievalConfidence}${quality.lowRetrievalConfidence ? " LOW_RETRIEVAL_CONFIDENCE" : ""}`,
    );
  }

  return {
    chunks,
    chunksByLabel,
    diagnostics,
    lowRetrievalConfidence: quality.lowRetrievalConfidence,
  };
}
