import { buildRetrievalQuery } from "@/lib/conversation";
import type { ConversationTurn } from "@/types/chat";
import {
  extractTopicFromQuestion,
  isFollowUpQuestion,
} from "@/lib/memory-service";
import {
  extractQuestionAspect,
  extractComparisonAspect,
  extractResearchTopics,
} from "@/lib/research-mode";
import {
  RETRIEVAL_CONFIG,
  type QueryClassification,
} from "@/lib/search/retrieval.config";
import type { PlannedQuery, RetrievalPlan } from "@/lib/search/types";

export type PlannerOptions = {
  researchMode?: boolean;
  comparisonMode?: boolean;
  comparisonTopics?: string[];
};

const TOPIC_LABELS = [
  "Overview",
  "Symptoms",
  "Diagnosis",
  "Treatment",
  "Complications",
  "Prevention",
] as const;

function resolveTopic(
  question: string,
  history: ConversationTurn[],
): string | null {
  const fromQuestion = extractTopicFromQuestion(question);
  if (fromQuestion) return fromQuestion;

  if (history.length === 0) return null;

  const lastUser = [...history].reverse().find((turn) => turn.role === "user");
  if (!lastUser) return null;

  return extractTopicFromQuestion(lastUser.content);
}

function resolveAspect(question: string): string | null {
  const explicit = extractQuestionAspect(question);
  if (explicit) return explicit;

  if (/\bdiagnos/i.test(question)) return "diagnosis";
  if (/\b(symptoms?|signs?)\b/i.test(question)) return "symptoms";
  if (/\b(treatment|management|medication)\b/i.test(question)) return "treatment";
  if (/\b(causes?|risk factors?|etiology)\b/i.test(question)) return "causes";
  if (/\b(prevention|preventive)\b/i.test(question)) return "prevention";
  if (/\bcomplications?\b/i.test(question)) return "complications";

  return null;
}

function isBroadQuestion(question: string): boolean {
  return /\b(explain|describe|summarize|synthesize|overview|tell me about)\b/i.test(
    question,
  );
}

function isExploratoryQuestion(question: string): boolean {
  return (
    /\b(explore|survey|review|across documents|multi[- ]document)\b/i.test(
      question,
    ) || /\bwhat (do|does) the (documents?|literature)\b/i.test(question)
  );
}

function dedupeQueries(
  queries: PlannedQuery[],
  maxQueries: number,
): PlannedQuery[] {
  const seen = new Set<string>();
  const result: PlannedQuery[] = [];

  for (const item of queries) {
    const key = item.query.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= maxQueries) break;
  }

  return result;
}

function buildDirectQaQueries(topic: string, aspect: string | null): PlannedQuery[] {
  if (aspect?.includes("symptom") || aspect?.includes("sign")) {
    return [
      { query: `${topic} symptoms`, label: "Symptoms" },
      { query: `signs symptoms ${topic}`, label: "Symptoms" },
    ];
  }

  if (aspect?.includes("diagnos")) {
    return [
      { query: `${topic} diagnosis`, label: "Diagnosis" },
      { query: `${topic} diagnostic criteria`, label: "Diagnosis" },
    ];
  }

  if (aspect) {
    return [
      { query: `${topic} ${aspect}`, label: aspect },
      { query: `${topic} ${aspect} clinical`, label: aspect },
    ];
  }

  return [
    { query: `${topic} overview`, label: "Overview" },
    { query: `${topic} clinical features`, label: "Overview" },
  ];
}

function buildResearchQueries(topic: string): PlannedQuery[] {
  return [
    { query: `${topic} overview`, label: "Overview" },
    { query: `${topic} symptoms`, label: "Symptoms" },
    { query: `${topic} diagnosis`, label: "Diagnosis" },
    { query: `${topic} treatment`, label: "Treatment" },
    { query: `${topic} complications`, label: "Complications" },
    { query: `${topic} prevention`, label: "Prevention" },
  ];
}

function buildComparisonQueries(topics: string[]): PlannedQuery[] {
  const queries: PlannedQuery[] = [];

  for (const topic of topics) {
    queries.push(
      { query: `${topic} symptoms`, label: `${topic} — Symptoms` },
      { query: `${topic} diagnosis`, label: `${topic} — Diagnosis` },
      { query: `${topic} treatment`, label: `${topic} — Treatment` },
    );
  }

  if (topics.length >= 2) {
    const [topicA, topicB] = topics;
    queries.push(
      {
        query: `${topicA} ${topicB} differences`,
        label: "Comparison",
      },
      {
        query: `${topicA} ${topicB} similarities`,
        label: "Comparison",
      },
    );
  }

  return queries;
}

function classifyQuestion(
  question: string,
  history: ConversationTurn[],
  options: PlannerOptions,
  comparisonTopics: string[],
): QueryClassification {
  if (
    (options.comparisonMode || comparisonTopics.length >= 2) &&
    comparisonTopics.length >= 2
  ) {
    return "comparison";
  }

  if (isFollowUpQuestion(question) && history.length > 0) {
    return "follow_up";
  }

  if (isExploratoryQuestion(question)) {
    return "exploratory";
  }

  // UI research toggle affects the synthesis prompt, not retrieval depth.
  // Only broad questions (explain, summarize, …) use the heavy research pipeline.
  if (isBroadQuestion(question)) {
    return "research";
  }

  return "direct_qa";
}

function buildPlanForClassification(
  classification: QueryClassification,
  question: string,
  history: ConversationTurn[],
  topic: string | null,
  aspect: string | null,
  comparisonTopics: string[],
): RetrievalPlan {
  const limits = RETRIEVAL_CONFIG.planning;

  switch (classification) {
    case "comparison": {
      const queries = dedupeQueries(
        buildComparisonQueries(comparisonTopics),
        limits.comparison.maxQueries,
      );
      return {
        classification,
        intent: classification,
        topics: comparisonTopics,
        aspects: ["symptoms", "diagnosis", "treatment"],
        queries,
      };
    }

    case "research": {
      const resolvedTopic = topic ?? "medical condition";
      const queries = dedupeQueries(
        buildResearchQueries(resolvedTopic),
        limits.research.maxQueries,
      );
      return {
        classification,
        intent: classification,
        topics: [resolvedTopic],
        aspects: [...TOPIC_LABELS],
        queries,
      };
    }

    case "exploratory": {
      const resolvedTopic = topic ?? "medical literature";
      const queries = dedupeQueries(
        [
          ...buildResearchQueries(resolvedTopic),
          { query: `${resolvedTopic} evidence summary`, label: "Overview" },
          { query: `${resolvedTopic} key findings`, label: "Overview" },
        ],
        limits.exploratory.maxQueries,
      );
      return {
        classification,
        intent: classification,
        topics: topic ? [topic] : [],
        aspects: [...TOPIC_LABELS],
        queries,
      };
    }

    case "follow_up": {
      const queries = dedupeQueries(
        [
          {
            query: buildRetrievalQuery(question, history),
            label: aspect ?? topic ?? "Follow-up",
          },
          ...(topic && aspect
            ? [{ query: `${topic} ${aspect}`, label: aspect }]
            : []),
        ],
        limits.followUp.maxQueries,
      );
      return {
        classification,
        intent: classification,
        topics: topic ? [topic] : [],
        aspects: aspect ? [aspect] : [],
        queries,
      };
    }

    case "direct_qa":
    default: {
      if (topic) {
        const queries = dedupeQueries(
          buildDirectQaQueries(topic, aspect),
          limits.directQa.maxQueries,
        );
        return {
          classification: "direct_qa",
          intent: "direct_qa",
          topics: [topic],
          aspects: aspect ? [aspect] : [],
          queries,
        };
      }

      return {
        classification: "direct_qa",
        intent: "direct_qa",
        topics: [],
        aspects: aspect ? [aspect] : [],
        queries: [
          {
            query: buildRetrievalQuery(question, history),
            label: aspect ?? "General",
          },
        ],
      };
    }
  }
}

export function generateRetrievalPlan(
  question: string,
  history: ConversationTurn[] = [],
  options: PlannerOptions = {},
): RetrievalPlan {
  const trimmed = question.trim();
  const comparisonTopics =
    options.comparisonTopics ?? extractResearchTopics(trimmed);
  const topic = resolveTopic(trimmed, history);
  const aspect =
    resolveAspect(trimmed) ?? extractComparisonAspect(trimmed) ?? null;

  const classification = classifyQuestion(
    trimmed,
    history,
    options,
    comparisonTopics,
  );

  return buildPlanForClassification(
    classification,
    trimmed,
    history,
    topic,
    aspect,
    comparisonTopics,
  );
}
