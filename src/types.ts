export type DynamicIntentType =
  | "vacation_balance"
  | "sick_balance"
  | "employee_count"
  | "employee_list"
  | null;

export interface DynamicIntent {
  type: DynamicIntentType;
  employeeId?: string;
}

export interface LoadedDocument {
  source: string;
  format: "txt" | "md" | "pdf";
  content: string;
}

export interface DocumentChunk {
  id: string;
  source: string;
  text: string;
  location?: string;
}

export interface TermVector {
  weights: Map<string, number>;
  norm: number;
}

export interface TfidfIndex {
  chunks: DocumentChunk[];
  vectors: TermVector[];
  idf: Map<string, number>;
  totalDocuments: number;
}

export interface RetrievalMatch {
  chunk: DocumentChunk;
  score: number;
}

export interface Citation {
  source: string;
  chunkId: string;
  score: number;
  location?: string;
}

export interface StaticResponse {
  kind: "static";
  answer: string;
  citations: Citation[];
}

export interface DynamicResponse {
  kind: "dynamic";
  answer: string;
}

export interface FallbackResponse {
  kind: "fallback";
  answer: string;
}

export interface ErrorResponse {
  kind: "error";
  answer: string;
}

export type ChatResponse = StaticResponse | DynamicResponse | FallbackResponse | ErrorResponse;

export interface EmployeeBalance {
  employeeId: string;
  vacationDaysRemaining: number;
  sickDaysRemaining: number;
  lastUpdated: string;
}

export interface EmployeeCountResponse {
  totalEmployees: number;
  lastUpdated: string;
}

export interface EmployeeListEntry {
  employeeId: string;
}

export interface EmployeeListResponse {
  employees: EmployeeListEntry[];
  totalEmployees: number;
  lastUpdated: string;
}
