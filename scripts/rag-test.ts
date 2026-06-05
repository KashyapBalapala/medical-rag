import { askQuestion } from "@/lib/rag";

async function main(): Promise<void> {
  const result = await askQuestion("What are symptoms of diabetes?");
  console.log(result);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
