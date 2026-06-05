import { askQuestion } from "../src/lib/rag";

async function main(): Promise<void> {
  console.log("=== Turn 1: What is diabetes? ===\n");
  const first = await askQuestion("What is diabetes?", { includeDetails: true });
  console.log(first.answer.slice(0, 280));
  console.log(`\nSources: ${first.sources.length}\n`);

  console.log("=== Turn 2: What are its symptoms? (with memory) ===\n");
  const second = await askQuestion("What are its symptoms?", {
    includeDetails: true,
    history: [
      { role: "user", content: "What is diabetes?" },
      { role: "assistant", content: first.answer },
    ],
  });

  console.log(second.answer.slice(0, 400));
  console.log(`\nSources: ${second.sources.length}`);

  const metaLeak =
    /Context \d|conversation history|current question is asking/i.test(
      second.answer,
    );
  if (metaLeak) {
    console.log("\n✗ Answer leaks RAG/meta phrasing");
    process.exit(1);
  }
  console.log("\n✓ No meta phrasing in answer");

  if ("prompt" in second && second.prompt.includes("Conversation History:")) {
    console.log("✓ Conversational memory prompt present");
  } else {
    console.log("✗ Memory prompt missing");
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
