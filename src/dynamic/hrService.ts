import type {
  EmployeeBalance,
  EmployeeCountResponse,
  EmployeeListResponse
} from "../types";

type HrServiceErrorCode = "not_found" | "service_unavailable" | "invalid_response";

export class HrServiceError extends Error {

  public readonly code: HrServiceErrorCode;

  constructor(code: HrServiceErrorCode, message: string) {
    super(message);
    this.name = "HrServiceError";
    this.code = code;
  }
}

export class HrServiceClient {

  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs = 2_000
  ) { }

  async getBalances(employeeId: string): Promise<EmployeeBalance> {

    const payload = (await this.fetchJson(
      `/employees/${encodeURIComponent(employeeId)}/balances`,
      `Employee ${employeeId} was not found.`
    )) as Partial<EmployeeBalance>;

    if (
      typeof payload.employeeId !== "string" ||
      typeof payload.vacationDaysRemaining !== "number" ||
      typeof payload.sickDaysRemaining !== "number" ||
      typeof payload.lastUpdated !== "string"
    ) {
      throw new HrServiceError("invalid_response", "HR service returned an invalid payload.");
    }

    return {
      employeeId: payload.employeeId,
      vacationDaysRemaining: payload.vacationDaysRemaining,
      sickDaysRemaining: payload.sickDaysRemaining,
      lastUpdated: payload.lastUpdated
    };
  }

  async getEmployeeCount(): Promise<EmployeeCountResponse> {

    const payload = (await this.fetchJson("/employees/count")) as Partial<EmployeeCountResponse>;

    if (typeof payload.totalEmployees !== "number" || typeof payload.lastUpdated !== "string") {
      throw new HrServiceError("invalid_response", "HR service returned an invalid payload.");
    }

    return {
      totalEmployees: payload.totalEmployees,
      lastUpdated: payload.lastUpdated
    };
  }

  async listEmployees(): Promise<EmployeeListResponse> {

    const payload = (await this.fetchJson("/employees")) as Partial<EmployeeListResponse>;
    if (
      typeof payload.totalEmployees !== "number" ||
      typeof payload.lastUpdated !== "string" ||
      !Array.isArray(payload.employees) ||
      payload.employees.some(
        (employee) =>
          typeof employee !== "object" ||
          employee === null ||
          typeof employee.employeeId !== "string"
      )
    ) {
      throw new HrServiceError("invalid_response", "HR service returned an invalid payload.");
    }

    return {
      totalEmployees: payload.totalEmployees,
      lastUpdated: payload.lastUpdated,
      employees: payload.employees.map((employee) => ({ employeeId: employee.employeeId }))
    };
  }

  private async fetchJson(endpoint: string, notFoundMessage?: string): Promise<unknown> {

    const url = `${this.baseUrl.replace(/\/$/, "")}${endpoint}`;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeoutMs);

    let response: Response;

    try {
      response = await fetch(url, { signal: abortController.signal });

    } catch (error) {
      throw new HrServiceError(
        "service_unavailable",
        `Could not reach external HR service: ${formatError(error)}`
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 404 && notFoundMessage) {
      throw new HrServiceError("not_found", notFoundMessage);
    }

    if (!response.ok) {
      throw new HrServiceError(
        "service_unavailable",
        `HR service returned HTTP ${response.status}.`
      );
    }

    return response.json();
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
