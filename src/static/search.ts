import type {
  Citation,
  DocumentChunk,
  LoadedDocument,
  RetrievalMatch,
  TermVector,
  TfidfIndex
} from "../types";
import { toSentenceCandidates, tokenize } from "../utils/text";

export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

export interface RetrievalOptions {
  topK?: number;
  minScore?: number;
}

export interface StaticAnswerPayload {
  answer: string;
  citations: Citation[];
}

const DEFAULT_CHUNK_SIZE = 900;
const DEFAULT_OVERLAP = 150;
const DEFAULT_TOP_K = 3;
const DEFAULT_MIN_SCORE = 0.1;

export function chunkDocuments(documents: LoadedDocument[], options: ChunkOptions = {}): DocumentChunk[] {

  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap ?? DEFAULT_OVERLAP;

  if (overlap >= chunkSize) {
    throw new Error("Chunk overlap must be smaller than chunk size.");
  }

  return documents.flatMap((document) => chunkOneDocument(document, chunkSize, overlap));
}

function chunkOneDocument(document: LoadedDocument, chunkSize: number, overlap: number): DocumentChunk[] {

  const chunks: DocumentChunk[] = [];
  const step = chunkSize - overlap;
  let start = 0;
  let chunkIndex = 1;

  while (start < document.content.length) {
    const end = Math.min(start + chunkSize, document.content.length);
    const text = document.content.slice(start, end).trim();

    if (text) {
      chunks.push({
        id: `${document.source}-chunk-${chunkIndex}`,
        source: document.source,
        text
      });
      chunkIndex += 1;
    }

    if (end >= document.content.length) break;
    start += step;
  }

  return chunks;
}

// TF-IDF is basic, but for this demo easy to run.
export function buildTfidfIndex(chunks: DocumentChunk[]): TfidfIndex {

  const tokenizedChunks = chunks.map((chunk) => tokenize(chunk.text));
  const documentFrequencies = new Map<string, number>();

  for (const tokens of tokenizedChunks) {

    for (const term of new Set(tokens)) {
      documentFrequencies.set(term, (documentFrequencies.get(term) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();

  for (const [term, frequency] of documentFrequencies) {
    idf.set(term, Math.log((chunks.length + 1) / (frequency + 1)) + 1);
  }

  return {
    chunks,
    idf,
    totalDocuments: chunks.length,
    vectors: tokenizedChunks.map((tokens) => buildVector(tokens, idf))
  };
}

export function retrieveRelevantChunks(
  index: TfidfIndex,
  question: string,
  options: RetrievalOptions = {}

): RetrievalMatch[] {
  const topK = options.topK ?? DEFAULT_TOP_K;
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const queryVector = buildVector(tokenize(question), index.idf);

  if (queryVector.norm === 0) return [];

  const matches: RetrievalMatch[] = [];

  for (let i = 0; i < index.chunks.length; i += 1) {

    const score = cosineSimilarity(queryVector.weights, queryVector.norm, index.vectors[i]);
    if (score >= minScore) matches.push({ chunk: index.chunks[i], score });
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, topK);
}

export function buildStaticAnswer(question: string, matches: RetrievalMatch[]): StaticAnswerPayload {

  const queryTokens = new Set(tokenize(question));
  const candidates: Array<{ sentence: string; score: number }> = [];

  for (const match of matches) {

    for (const sentence of toSentenceCandidates(match.chunk.text)) {
      const overlap = tokenize(sentence).filter((token) => queryTokens.has(token)).length;
      candidates.push({ sentence, score: overlap + match.score });
    }
  }

  const selected = dedupe(candidates.sort((a, b) => b.score - a.score).map((item) => item.sentence)).slice(0, 2);

  const answer = selected.length
    ? selected.join(" ")
    : matches[0]?.chunk.text.slice(0, 240) ?? "I couldn't find a confident answer in the documents.";

  return {
    answer,
    citations: matches.map((match) => ({
      source: match.chunk.source,
      chunkId: match.chunk.id,
      score: Number(match.score.toFixed(3)),
      location: match.chunk.location
    }))
  };
}

function buildVector(tokens: string[], idf: Map<string, number>): TermVector {

  const frequencies = termFrequency(tokens);
  const weights = new Map<string, number>();
  let normSquare = 0;

  for (const [term, tf] of frequencies) {
    const inverseDocFrequency = idf.get(term);
    if (!inverseDocFrequency) continue;

    const weight = tf * inverseDocFrequency;
    weights.set(term, weight);
    normSquare += weight * weight;
  }

  return { weights, norm: Math.sqrt(normSquare) };
}

function termFrequency(tokens: string[]): Map<string, number> {

  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);

  if (tokens.length === 0) return counts;

  for (const [token, count] of counts) {
    counts.set(token, count / tokens.length);
  }
  return counts;
}

function cosineSimilarity(
  queryWeights: Map<string, number>,
  queryNorm: number,
  documentVector: TfidfIndex["vectors"][number]

): number {
  if (documentVector.norm === 0 || queryNorm === 0) return 0;

  let dotProduct = 0;
  for (const [term, queryWeight] of queryWeights) {
    dotProduct += queryWeight * (documentVector.weights.get(term) ?? 0);
  }

  return dotProduct / (queryNorm * documentVector.norm);
}

function dedupe(sentences: string[]): string[] {

  const seen = new Set<string>();
  const output: string[] = [];

  for (const sentence of sentences) {
    const key = sentence.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(sentence);
  }

  return output;
}
