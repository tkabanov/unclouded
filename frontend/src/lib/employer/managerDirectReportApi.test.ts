import { describe, expect, it } from "vitest";

import {
  MANAGER_DIRECT_REPORT_DUPLICATE_MESSAGE,
  managerDirectReportCreateError,
} from "./managerDirectReportApi";

describe("managerDirectReportCreateError", () => {
  it("maps duplicate pair constraint to a friendly message", () => {
    expect(
      managerDirectReportCreateError({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "manager_direct_report_distinct_pair"',
      }).message,
    ).toBe(MANAGER_DIRECT_REPORT_DUPLICATE_MESSAGE);
  });

  it("passes through other database errors", () => {
    expect(
      managerDirectReportCreateError({ code: "42501", message: "permission denied" }).message,
    ).toBe("permission denied");
  });
});
