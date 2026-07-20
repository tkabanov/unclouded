import { describe, expect, it } from "vitest";

describe("managerAggregateLogic", () => {
  it("returns empty snapshot when no direct reports are linked", async () => {
    const { computeManagerAggregateForDirectReports } = await import(
      "../../../../supabase/functions/_shared/managerAggregateLogic.ts"
    );

    const client = {
      from(table: string) {
        if (table !== "managerDirectReport") {
          throw new Error(`Unexpected table ${table}`);
        }
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        };
      },
    };

    const snapshot = await computeManagerAggregateForDirectReports(client as never, "manager-1");
    expect(snapshot.directReportCount).toBe(0);
    expect(snapshot.optedInCount).toBe(0);
    expect(snapshot.suppressed).toBe(true);
    expect(snapshot.legalReviewRequired).toBe(true);
  });
});
