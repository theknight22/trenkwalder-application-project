import path from "node:path";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootstrapChatbot } from "../src/chatbot";
import { createMockApiApp } from "../src/dynamic/mockApi";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = createMockApiApp();
  server = app.listen(0);
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a port.");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("chatbot end-to-end", () => {
  it("handles static questions with citations", async () => {
    const chatbot = await bootstrapChatbot(
      path.resolve(process.cwd(), "data", "docs"),
      baseUrl
    );

    const response = await chatbot.ask("When should vacation requests be submitted?");
    expect(response.kind).toBe("static");
    if (response.kind !== "static") {
      throw new Error("Expected static response.");
    }

    expect(response.answer.toLowerCase()).toContain("vacation requests");
    expect(response.citations.length).toBeGreaterThan(0);
  });

  it("handles dynamic questions by calling external mock service", async () => {
    const chatbot = await bootstrapChatbot(
      path.resolve(process.cwd(), "data", "docs"),
      baseUrl
    );

    const response = await chatbot.ask("How many vacation days do I have left for employee E001?");
    expect(response.kind).toBe("dynamic");
    expect(response.answer).toContain("E001");
  });

  it("handles employee count questions through dynamic service", async () => {
    const chatbot = await bootstrapChatbot(
      path.resolve(process.cwd(), "data", "docs"),
      baseUrl
    );

    const response = await chatbot.ask("How many employees are there?");
    expect(response.kind).toBe("dynamic");
    expect(response.answer).toContain("employees");
  });

  it("handles employee list questions through dynamic service", async () => {
    const chatbot = await bootstrapChatbot(
      path.resolve(process.cwd(), "data", "docs"),
      baseUrl
    );

    const response = await chatbot.ask("List employees");
    expect(response.kind).toBe("dynamic");
    expect(response.answer).toContain("E001");
  });

  it("falls back when no relevant static content exists", async () => {
    const chatbot = await bootstrapChatbot(
      path.resolve(process.cwd(), "data", "docs"),
      baseUrl
    );

    const response = await chatbot.ask("zxyqv blorp flarn");
    expect(response.kind).toBe("fallback");
  });
});
