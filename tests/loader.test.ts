import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadDocumentsFromDirectory } from "../src/static/loader";

describe("document loader", () => {
  it("loads txt, md, and pdf documents with non-empty content", async () => {
    const docsPath = path.resolve(process.cwd(), "data", "docs");
    const documents = await loadDocumentsFromDirectory(docsPath);

    const bySource = new Map(documents.map((doc) => [doc.source, doc]));

    expect(bySource.has("faq.txt")).toBe(true);
    expect(bySource.has("policy.md")).toBe(true);
    expect(bySource.has("handbook.pdf")).toBe(true);

    expect(bySource.get("faq.txt")?.content.length ?? 0).toBeGreaterThan(0);
    expect(bySource.get("policy.md")?.content.length ?? 0).toBeGreaterThan(0);
    expect(bySource.get("handbook.pdf")?.content.length ?? 0).toBeGreaterThan(0);
  });
});
