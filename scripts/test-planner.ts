import { generateRetrievalPlan } from "../src/lib/research/planner";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

const cases = [
  {
    question: "What are symptoms of diabetes?",
    researchMode: false,
    expectedClassification: "direct_qa",
    minQueries: 1,
    maxQueries: 2,
  },
  {
    question: "How is diabetes diagnosed?",
    researchMode: false,
    expectedClassification: "direct_qa",
    minQueries: 1,
    maxQueries: 2,
  },
  {
    question: "What is diabetes?",
    researchMode: true,
    expectedClassification: "direct_qa",
    minQueries: 1,
    maxQueries: 2,
  },
  {
    question: "Explain diabetes.",
    researchMode: true,
    expectedClassification: "research",
    minQueries: 5,
    maxQueries: 8,
  },
  {
    question: "Compare diabetes and hypertension",
    researchMode: true,
    comparisonMode: true,
    comparisonTopics: ["diabetes", "hypertension"],
    expectedClassification: "comparison",
    minQueries: 8,
    maxQueries: 12,
  },
] as const;

for (const testCase of cases) {
  const plan = generateRetrievalPlan(testCase.question, [], {
    researchMode: testCase.researchMode,
    comparisonMode:
      "comparisonMode" in testCase ? testCase.comparisonMode : false,
    comparisonTopics:
      "comparisonTopics" in testCase ? [...testCase.comparisonTopics] : [],
  });

  assert(
    plan.classification === testCase.expectedClassification,
    `${testCase.question} → ${plan.classification}`,
  );
  assert(
    plan.queries.length >= testCase.minQueries &&
      plan.queries.length <= testCase.maxQueries,
    `${testCase.question} → ${plan.queries.length} queries`,
  );
}

console.log("\nAll planner checks passed.");
