import { promises as fs } from "node:fs";
import path from "node:path";
import removeMarkdown from "remove-markdown";
import { PDFParse } from "pdf-parse";
import type { LoadedDocument } from "../types";
import { normalizeWhitespace } from "../utils/text";

const SUPPORTED_EXTENSIONS = new Set([".txt", ".md", ".pdf"]);

export async function loadDocumentsFromDirectory(directoryPath: string): Promise<LoadedDocument[]> {

  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
  const documents: LoadedDocument[] = [];

  for (const fileName of files) {

    const fullPath = path.join(directoryPath, fileName);
    const extension = path.extname(fileName).toLowerCase();

    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      continue;
    }

    const content = await extractContent(fullPath, extension);
    documents.push({
      source: fileName,
      format: extension.slice(1) as LoadedDocument["format"],
      content
    });
  }

  return documents;
}

async function extractContent(filePath: string, extension: string): Promise<string> {

  if (extension === ".txt") {
    const raw = await fs.readFile(filePath, "utf8");
    return normalizeWhitespace(raw);
  }

  if (extension === ".md") {
    const raw = await fs.readFile(filePath, "utf8");
    return normalizeWhitespace(removeMarkdown(raw));
  }

  if (extension === ".pdf") {

    const raw = await fs.readFile(filePath);
    const parser = new PDFParse({ data: raw });

    try {
      const parsed = await parser.getText();
      return normalizeWhitespace(parsed.text);
    } finally {
      await parser.destroy();
    }
  }

  throw new Error(`Unsupported extension: ${extension}`);
}
