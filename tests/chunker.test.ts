import { describe, expect, it } from "vitest";
import { chunkDocuments } from "../src/static/search";

describe("chunker", () => {
  it("splits text into overlapping chunks with metadata", () => {
    const longText = "A".repeat(120) + "B".repeat(120) + "C".repeat(120);
    const chunks = chunkDocuments(
      [
        {
          source: "sample.txt",
          format: "txt",
          content: longText
        }
      ],
      { chunkSize: 150, overlap: 30 }
    );

    expect(chunks.length).toBe(3);
    expect(chunks[0].id).toBe("sample.txt-chunk-1");
    expect(chunks[1].id).toBe("sample.txt-chunk-2");
    expect(chunks[0].source).toBe("sample.txt");
    expect(chunks[0].text.length).toBeLessThanOrEqual(150);
    expect(chunks[1].text.startsWith("A".repeat(30))).toBe(false);
  });

  it("rejects overlap equal or greater than chunk size", () => {
    expect(() =>
      chunkDocuments(
        [
          {
            source: "sample.txt",
            format: "txt",
            content: "hello world"
          }
        ],
        { chunkSize: 100, overlap: 100 }
      )
    ).toThrow("Chunk overlap must be smaller than chunk size.");
  });
});
