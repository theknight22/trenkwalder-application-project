import { describe, expect, it } from "vitest";
import { extractEmployeeId, routeDynamicIntent } from "../src/chatbot";

describe("intent detection", () => {
  it("detects vacation balance intent and employee ID in natural language", () => {
    const intent = routeDynamicIntent(
      "How many vacation days do I have left for employee E001?"
    );

    expect(intent.type).toBe("vacation_balance");
    expect(intent.employeeId).toBe("E001");
  });

  it("detects sick balance intent and employee:id pattern", () => {
    const intent = routeDynamicIntent("employee:E002 what is my sick days balance left?");

    expect(intent.type).toBe("sick_balance");
    expect(intent.employeeId).toBe("E002");
  });

  it("detects employee count intent", () => {
    const intent = routeDynamicIntent("How many employees are there?");
    expect(intent.type).toBe("employee_count");
  });

  it("detects employee list intent", () => {
    const intent = routeDynamicIntent("Please list employees");
    expect(intent.type).toBe("employee_list");
  });

  it("returns null dynamic intent for static-content questions", () => {
    const intent = routeDynamicIntent("What is the probation period?");
    expect(intent.type).toBeNull();
  });

  it("keeps vacation policy questions on the static path", () => {
    const intent = routeDynamicIntent("How many vacation days can be carried over?");
    expect(intent.type).toBeNull();
  });

  it("extracts employee ID from supported patterns", () => {
    expect(extractEmployeeId("for employee E003")).toBe("E003");
    expect(extractEmployeeId("employee:E003")).toBe("E003");
    expect(extractEmployeeId("employee E003")).toBeNull();
  });
});
