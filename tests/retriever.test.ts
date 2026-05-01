import { describe, expect, it } from "vitest";
import { buildTfidfIndex } from "../src/static/search";
import { retrieveRelevantChunks } from "../src/static/search";

describe("retriever", () => {
  it("returns the most relevant chunk for a known question", () => {
    const index = buildTfidfIndex([
      {
        id: "faq-chunk-1",
        source: "faq.txt",
        text: "New employees have a probation period of six months."
      },
      {
        id: "policy-chunk-1",
        source: "policy.md",
        text: "Vacation requests should be submitted at least 10 business days in advance."
      },
      {
        id: "random-chunk-1",
        source: "misc.txt",
        text: "The office coffee machine is on the second floor."
      }
    ]);

    const matches = retrieveRelevantChunks(index, "How long is the probation period?");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].chunk.source).toBe("faq.txt");
  });
});
