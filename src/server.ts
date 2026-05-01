import express from "express";
import path from "node:path";
import { bootstrapChatbot } from "./chatbot";
import { createMockApiApp } from "./dynamic/mockApi";
import type { ChatResponse } from "./types";

const PORT = Number(process.env.PORT ?? "3000");

// Starts the web server, mounts API routes, and serves the UI.
async function start(): Promise<void> {


  const hrServiceBaseUrl = process.env.HR_SERVICE_BASE_URL ?? `http://127.0.0.1:${PORT}`;
  const chatbot = await bootstrapChatbot(
    undefined,
    hrServiceBaseUrl
  );

  const app = express();
  app.use(express.json());

  const mockApiApp = createMockApiApp();
  app.use(mockApiApp);

  // Handles chat requests from the frontend and returns a typed chatbot response.
  app.post("/api/chat", async (request, response) => {

    const { question } = request.body as { question?: string };

    if (!question || typeof question !== "string") {
      response.status(400).json({ error: "Missing or invalid 'question' field." });
      return;
    }

    try {
      const chatResponse: ChatResponse = await chatbot.ask(question.trim());
      response.json(chatResponse);
    } catch (error) {
      console.error("Chat error:", error);
      response.status(500).json({ error: "Internal server error." });
    }
  });

  const publicDir = path.resolve(process.cwd(), "public");
  app.use(express.static(publicDir));

  app.listen(PORT, () => {
    console.log(`Chatbot UI at http://localhost:${PORT}`);
    console.log(`HR mock API at http://localhost:${PORT}/employees/:id/balances`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
