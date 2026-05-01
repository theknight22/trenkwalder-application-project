import express, { type Express } from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { EmployeeBalance, EmployeeCountResponse, EmployeeListResponse } from "../types";

interface EmployeeRecord {
  employeeId: string;
  vacationDaysRemaining: number;
  sickDaysRemaining: number;
  lastUpdated: string;
}

interface EmployeesDbShape {
  employees: EmployeeRecord[];
}

const DEFAULT_EMPLOYEE_DATA_PATH = path.resolve(
  process.cwd(),
  "data",
  "mock",
  "employees.json"
);

// Creates the mock HR API app with count, list, and balance endpoints.
export function createMockApiApp(dataFilePath = DEFAULT_EMPLOYEE_DATA_PATH): Express {

  const app = express();
  app.use(express.json());

  // Returns total employee count and latest update timestamp.
  app.get("/employees/count", async (_, response) => {

    try {
      const employees = await readEmployees(dataFilePath);
      const payload: EmployeeCountResponse = {
        totalEmployees: employees.length,
        lastUpdated: getLatestUpdatedDate(employees)
      };
      response.json(payload);

    } catch (error) {
      response.status(500).json({ error: formatError(error) });
    }
  });

  // Returns a compact list of employee IDs plus metadata.
  app.get("/employees", async (_, response) => {

    try {
      const employees = await readEmployees(dataFilePath);
      const payload: EmployeeListResponse = {
        employees: employees.map((employee) => ({ employeeId: employee.employeeId })),
        totalEmployees: employees.length,
        lastUpdated: getLatestUpdatedDate(employees)
      };
      response.json(payload);

    } catch (error) {
      response.status(500).json({ error: formatError(error) });
    }
  });

  // Returns leave balances for one employee by ID.
  app.get("/employees/:id/balances", async (request, response) => {

    try {
      const employees = await readEmployees(dataFilePath);
      const requestedId = request.params.id.trim().toUpperCase();
      const record = employees.find((item) => item.employeeId.toUpperCase() === requestedId);

      if (!record) {
        response.status(404).json({ error: `Employee ${requestedId} not found.` });
        return;
      }

      const payload: EmployeeBalance = {
        employeeId: record.employeeId,
        vacationDaysRemaining: record.vacationDaysRemaining,
        sickDaysRemaining: record.sickDaysRemaining,
        lastUpdated: record.lastUpdated
      };

      response.json(payload);

    } catch (error) {
      response.status(500).json({ error: formatError(error) });
    }
  });

  return app;
}

// Starts the standalone mock API HTTP server.
export async function startMockApiServer(
  port = 4000,
  dataFilePath = DEFAULT_EMPLOYEE_DATA_PATH
): Promise<void> {

  const app = createMockApiApp(dataFilePath);
  await new Promise<void>((resolve) => {

    app.listen(port, () => {
      console.log(`Mock HR API running on http://localhost:${port}`);
      resolve();
    });
  });
}

// Reads and parses the JSON employee dataset from disk.
async function readEmployees(filePath: string): Promise<EmployeeRecord[]> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as EmployeesDbShape;
  return parsed.employees;
}

// Computes the latest lastUpdated value across all employee records.
function getLatestUpdatedDate(employees: EmployeeRecord[]): string {
  if (employees.length === 0) {
    return "";
  }

  return employees
    .map((employee) => employee.lastUpdated)
    .reduce((latest, current) => (current > latest ? current : latest));
}

// Converts unknown thrown values to readable strings for API error responses.
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
