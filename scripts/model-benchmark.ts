import { askQuestion, type RagResponseDetails } from "../src/lib/rag";
import { contextContainsTableData } from "../src/lib/answer-sanitizer";

const META_LEAK_RE =
  /Context \d|conversation history|current question is asking/i;

const DANGLING_TABLE_RE = /\bTable\s+(\d+)\b/i;

function isRagDetails(
  result: Awaited<ReturnType<typeof askQuestion>>,
): result is RagResponseDetails {
  return "chunks" in result;
}

type BenchmarkCase = {
  name: string;
  question: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  comparisonMode?: boolean;
};

const CASES: BenchmarkCase[] = [
  {
    name: "Factual grounding",
    question: "How is diabetes diagnosed?",
  },
  {
    name: "Memory follow-up",
    question: "What are its symptoms?",
    history: [
      { role: "user", content: "What is diabetes?" },
      {
        role: "assistant",
        content:
          "Diabetes is a condition in which the level of sugar (glucose) in the blood is high.",
      },
    ],
  },
  {
    name: "Comparison mode",
    question: "Compare diabetes and hypertension symptoms",
    comparisonMode: true,
  },
];

const MODELS = (process.env.BENCHMARK_MODELS ?? "llama3.2:3b,qwen2.5:7b")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

async function runCase(
  model: string,
  testCase: BenchmarkCase,
): Promise<void> {
  const started = Date.now();

  const includeDetails = testCase.name === "Factual grounding";

  const result = await askQuestion(testCase.question, {
    model,
    history: testCase.history,
    comparisonMode: testCase.comparisonMode,
    log: false,
    includeDetails,
  });

  const elapsedMs = Date.now() - started;
  const metaLeak = META_LEAK_RE.test(result.answer);
  const tableMatch = result.answer.match(DANGLING_TABLE_RE);

  console.log(`  ${testCase.name}`);
  console.log(`    Time:    ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`    Sources: ${result.sources.length}`);
  console.log(`    Meta:    ${metaLeak ? "LEAK" : "clean"}`);

  if (tableMatch) {
    const tableNum = Number(tableMatch[1]);
    const context = isRagDetails(result)
      ? result.chunks.map((chunk) => chunk.content).join("\n")
      : "";
    const hasTableData = contextContainsTableData(context, tableNum);
    console.log(
      `    Table:   WARN dangling Table ${tableNum} (context has data: ${hasTableData})`,
    );
  } else {
    console.log(`    Table:   clean`);
  }

  console.log(`    Answer:  ${result.answer.slice(0, 120).replace(/\n/g, " ")}…`);
  console.log();
}

async function main(): Promise<void> {
  console.log("Medical RAG model benchmark\n");

  for (const model of MODELS) {
    console.log(`=== ${model} ===\n`);

    for (const testCase of CASES) {
      try {
        await runCase(model, testCase);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.log(`  ${testCase.name}`);
        console.log(`    ERROR: ${message.slice(0, 200)}`);
        console.log();
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
