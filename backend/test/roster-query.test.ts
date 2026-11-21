import { describe, expect, it } from "vitest";
import { buildShiftWhere } from "../src/models/roster.model";

describe("upcoming shift query", () => {
  it("uses the supplied business date as an inclusive lower date bound", () => {
    expect(buildShiftWhere({ page: 1, limit: 8, search: "", includePast: false }, "2026-11-19")).toEqual({
      date: { gte: new Date("2026-11-19T00:00:00.000Z") },
    });
  });

  it("applies schedule search together with the upcoming-date bound", () => {
    const where = buildShiftWhere({ page: 1, limit: 8, search: "alex", includePast: false }, "2026-11-19");

    expect(where.date).toEqual({ gte: new Date("2026-11-19T00:00:00.000Z") });
    expect(where.OR).toHaveLength(4);
  });

  it("limits the history view to shifts before the business date", () => {
    expect(buildShiftWhere({ page: 1, limit: 8, search: "", includePast: true }, "2026-11-19")).toEqual({
      date: { lt: new Date("2026-11-19T00:00:00.000Z") },
    });
  });
});
