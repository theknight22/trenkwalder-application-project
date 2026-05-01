import http, { type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { HrServiceClient, HrServiceError } from "../src/dynamic/hrService";
import { createMockApiApp } from "../src/dynamic/mockApi";

let activeServer: Server | null = null;

afterEach(async () => {
  if (activeServer) {
    await new Promise<void>((resolve, reject) => {
      activeServer?.close((error) => (error ? reject(error) : resolve()));
    });
    activeServer = null;
  }
});

describe("HrServiceClient", () => {
  it("returns balances for an existing employee", async () => {
    const app = createMockApiApp();
    activeServer = app.listen(0);
    const baseUrl = getServerBaseUrl(activeServer);
    const client = new HrServiceClient(baseUrl, 2_000);

    const balances = await client.getBalances("E001");
    expect(balances.employeeId).toBe("E001");
    expect(typeof balances.vacationDaysRemaining).toBe("number");
  });

  it("returns employee count", async () => {
    const app = createMockApiApp();
    activeServer = app.listen(0);
    const baseUrl = getServerBaseUrl(activeServer);
    const client = new HrServiceClient(baseUrl, 2_000);

    const count = await client.getEmployeeCount();
    expect(count.totalEmployees).toBeGreaterThan(0);
    expect(typeof count.lastUpdated).toBe("string");
  });

  it("returns employee list", async () => {
    const app = createMockApiApp();
    activeServer = app.listen(0);
    const baseUrl = getServerBaseUrl(activeServer);
    const client = new HrServiceClient(baseUrl, 2_000);

    const list = await client.listEmployees();
    expect(list.totalEmployees).toBeGreaterThan(0);
    expect(list.employees.length).toBe(list.totalEmployees);
    expect(typeof list.employees[0]?.employeeId).toBe("string");
  });

  it("maps 404 to not_found error", async () => {
    const app = createMockApiApp();
    activeServer = app.listen(0);
    const baseUrl = getServerBaseUrl(activeServer);
    const client = new HrServiceClient(baseUrl, 2_000);

    await expect(client.getBalances("MISSING")).rejects.toMatchObject<HrServiceError>({
      code: "not_found"
    });
  });

  it("maps timeout to service_unavailable", async () => {
    activeServer = http.createServer((_, response) => {
      setTimeout(() => {
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json");
        response.end(
          JSON.stringify({
            employeeId: "E999",
            vacationDaysRemaining: 1,
            sickDaysRemaining: 1,
            lastUpdated: "2026-04-20"
          })
        );
      }, 200);
    });

    await new Promise<void>((resolve) => activeServer?.listen(0, resolve));

    const baseUrl = getServerBaseUrl(activeServer);
    const client = new HrServiceClient(baseUrl, 30);

    await expect(client.getBalances("E999")).rejects.toMatchObject<HrServiceError>({
      code: "service_unavailable"
    });
  });
});

function getServerBaseUrl(server: Server): string {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not read test server address.");
  }
  return `http://127.0.0.1:${address.port}`;
}
