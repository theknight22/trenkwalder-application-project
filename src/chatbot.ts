import path from "node:path";
import type { ChatResponse, DynamicIntent, DynamicIntentType, TfidfIndex } from "./types";
import { HrServiceClient, HrServiceError } from "./dynamic/hrService";
import { loadDocumentsFromDirectory } from "./static/loader";
import { buildStaticAnswer, buildTfidfIndex, chunkDocuments, retrieveRelevantChunks } from "./static/search";

export interface ChatbotDependencies {
  hrService: HrServiceClient;
  tfidfIndex: TfidfIndex;
}

const EMPLOYEE_ID_PATTERN = "[A-Za-z0-9_-]{2,20}";

const VACATION_WORDS = [
  "vacation",
  "pto",
  "holiday"
];
const SICK_WORDS = [
  "sick",
  "illness"
];
const BALANCE_WORDS = [
  "balance",
  "remaining",
  "left",
  "days"
];
const EMPLOYEE_COUNT_PHRASES = [
  "how many employees",
  "number of employees",
  "total employees",
  "employee count",
  "headcount"
];
const EMPLOYEE_LIST_PHRASES = [
  "list employees",
  "show employees",
  "employee list"
];

export class Chatbot {
  constructor(private readonly dependencies: ChatbotDependencies) { }

  async ask(question: string): Promise<ChatResponse> {
    const intent = routeDynamicIntent(question);

    if (intent.type) {
      return this.answerFromHrService(intent);
    }

    const matches = retrieveRelevantChunks(this.dependencies.tfidfIndex, question, {
      topK: 3,
      minScore: 0.1
    });

    if (matches.length === 0) {
      return { kind: "fallback", answer: "I couldn't find that in the available documents." };
    }

    const staticAnswer = buildStaticAnswer(question, matches);
    return {
      kind: "static",
      answer: staticAnswer.answer,
      citations: staticAnswer.citations
    };
  }

  private async answerFromHrService(intent: DynamicIntent): Promise<ChatResponse> {

    if (intent.type === "employee_count") {
      try {

        const count = await this.dependencies.hrService.getEmployeeCount();

        return {
          kind: "dynamic",
          answer: `There are ${count.totalEmployees} employees in the system (last updated ${count.lastUpdated}).`
        };

      } catch {
        return { kind: "error", answer: "The HR service is temporarily unavailable. Please try again." };
      }
    }

    if (intent.type === "employee_list") {

      try {

        const list = await this.dependencies.hrService.listEmployees();
        const ids = list.employees.map((employee) => employee.employeeId).join(", ");

        return {
          kind: "dynamic",
          answer: `Employees (${list.totalEmployees}): ${ids} (last updated ${list.lastUpdated}).`
        };

      } catch {
        return { kind: "error", answer: "The HR service is temporarily unavailable. Please try again." };
      }
    }

    if (!intent.employeeId) {

      return {
        kind: "error",
        answer:
          "Please include an employee ID in the question, for example: \"How many vacation days are left for employee E001?\" or \"employee:E001\"."
      };
    }

    try {

      const balances = await this.dependencies.hrService.getBalances(intent.employeeId);

      if (intent.type === "vacation_balance") {

        return {
          kind: "dynamic",
          answer: `Employee ${balances.employeeId} has ${balances.vacationDaysRemaining} vacation days remaining (last updated ${balances.lastUpdated}).`
        };
      }

      return {
        kind: "dynamic",
        answer: `Employee ${balances.employeeId} has ${balances.sickDaysRemaining} sick days remaining (last updated ${balances.lastUpdated}).`
      };
    } catch (error) {

      if (error instanceof HrServiceError && error.code === "not_found") {
        return { kind: "error", answer: error.message };
      }

      return { kind: "error", answer: "The HR service is temporarily unavailable. Please try again." };
    }
  }
}

export async function bootstrapChatbot(

  docsDirectory = path.resolve(process.cwd(), "data", "docs"),
  hrServiceBaseUrl = process.env.HR_SERVICE_BASE_URL ?? "http://localhost:4000"

): Promise<Chatbot> {

  const docs = await loadDocumentsFromDirectory(docsDirectory);
  const tfidfIndex = buildTfidfIndex(chunkDocuments(docs));
  const hrService = new HrServiceClient(hrServiceBaseUrl, 2_000);

  return new Chatbot({ hrService, tfidfIndex });
}

export function routeDynamicIntent(question: string): DynamicIntent {

  const normalized = question.toLowerCase();
  const employeeId = extractEmployeeId(question) ?? undefined;

  const hasEmployeeCountPhrase = EMPLOYEE_COUNT_PHRASES.some((phrase) => normalized.includes(phrase));
  const hasEmployeeListPhrase = EMPLOYEE_LIST_PHRASES.some((phrase) => normalized.includes(phrase));

  const hasVacation = VACATION_WORDS.some((word) => normalized.includes(word));
  const hasSick = SICK_WORDS.some((word) => normalized.includes(word));
  const hasBalanceWord = BALANCE_WORDS.some((word) => normalized.includes(word));

  let type: DynamicIntentType = null;

  if (hasVacation && hasBalanceWord) type = "vacation_balance";
  else if (hasSick && hasBalanceWord) type = "sick_balance";
  else if (hasEmployeeListPhrase) type = "employee_list";
  else if (hasEmployeeCountPhrase) type = "employee_count";

  return { type, employeeId };
}

export function extractEmployeeId(question: string): string | null {
  const patterns = [

    new RegExp(`for\\s+employee\\s+(${EMPLOYEE_ID_PATTERN})`, "i"),
    new RegExp(`employee:(${EMPLOYEE_ID_PATTERN})`, "i")

  ];

  for (const pattern of patterns) {

    const match = question.match(pattern);
    if (match?.[1]) return match[1].trim();

  }

  return null;
}
