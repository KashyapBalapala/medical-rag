import { buildRetrievalQuery } from "../src/lib/conversation";
import type { ConversationTurn } from "../src/types/chat";

const hypertensionHistory: ConversationTurn[] = [
  { role: "user", content: "What is hypertension?" },
  {
    role: "assistant",
    content:
      "Hypertension is systolic blood pressure ≥140 mmHg and/or diastolic ≥90 mmHg.",
  },
  { role: "user", content: "Causes of Hypertension." },
  {
    role: "assistant",
    content:
      "Causes of hypertension include obesity, diabetes, high salt diet, alcohol, and smoking.",
  },
];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

const diabetesCausesQuery = buildRetrievalQuery(
  "What are the causes of diabetes?",
  hypertensionHistory,
);

assert(
  !/hypertension/i.test(diabetesCausesQuery),
  "explicit-topic question does not embed prior hypertension turns",
);
assert(
  /diabetes/i.test(diabetesCausesQuery) && /causes/i.test(diabetesCausesQuery),
  "diabetes causes query keeps topic and aspect terms",
);

const followUpQuery = buildRetrievalQuery(
  "What are its symptoms?",
  [
    ...hypertensionHistory,
    { role: "user", content: "What are the causes of diabetes?" },
    {
      role: "assistant",
      content: "A reduction in insulin production causes diabetes.",
    },
  ],
);

assert(
  /diabetes/i.test(followUpQuery),
  "pronoun follow-up still expands with recent topic context",
);
assert(
  /symptoms/i.test(followUpQuery),
  "symptom follow-up adds symptom retrieval boost",
);

console.log("\nAll retrieval query checks passed.");
