import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { bootstrapChatbot } from "./chatbot";

async function runCli(): Promise<void> {

  const chatbot = await bootstrapChatbot();
  const lineReader = readline.createInterface({ input, output });

  console.log("Offline HR Chatbot (TypeScript)");
  console.log('Type your question, or "exit" to quit.');

  while (true) {

    const question = (await lineReader.question("\nask > ")).trim();

    if (!question) {
      continue;
    }

    if (["exit", "quit"].includes(question.toLowerCase())) {
      break;
    }

    const response = await chatbot.ask(question);
    console.log(`\n${response.answer}`);

    if (response.kind === "static") {
      for (const citation of response.citations) {
        console.log(`  - [${citation.source}] ${citation.chunkId} (score=${citation.score})`);
      }
    }
  }

  lineReader.close();
}

runCli().catch((error) => {
  console.error("Failed to start chatbot:", error);
  process.exit(1);
});
