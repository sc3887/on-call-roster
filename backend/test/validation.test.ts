import { describe, expect, it } from "vitest";
import { dateOnlyInTimeZone, isValidDateOnly, isValidTimeZone } from "../src/lib/dates";
import { createShiftSchema, createUserSchema, shiftSchema, memberPaginationSchema, paginationSchema } from "../src/lib/validation";

describe("date-only validation", () => {
  it("accepts valid leap days and rejects impossible or malformed dates", () => {
    expect(isValidDateOnly("2024-02-29")).toBe(true);
    expect(isValidDateOnly("2025-02-29")).toBe(false);
    expect(isValidDateOnly("2025-13-01")).toBe(false);
    expect(isValidDateOnly("2025-1-01")).toBe(false);
  });

  it("calculates business dates across Israel's standard and daylight-saving offsets", () => {
    expect(dateOnlyInTimeZone(new Date("2026-11-19T21:59:00.000Z"), "Asia/Jerusalem")).toBe("2026-11-19");
    expect(dateOnlyInTimeZone(new Date("2026-11-19T22:00:00.000Z"), "Asia/Jerusalem")).toBe("2026-11-20");
    expect(dateOnlyInTimeZone(new Date("2026-06-01T20:59:00.000Z"), "Asia/Jerusalem")).toBe("2026-06-01");
    expect(dateOnlyInTimeZone(new Date("2026-06-01T21:00:00.000Z"), "Asia/Jerusalem")).toBe("2026-06-02");
    expect(isValidTimeZone("Asia/Jerusalem")).toBe(true);
    expect(isValidTimeZone("Not/A_Timezone")).toBe(false);
  });
});

describe("request validation", () => {
  it("normalizes valid account emails and rejects malformed addresses", () => {
    expect(createUserSchema.parse({
      name: "  Alex Morgan  ",
      email: "  ALEX@example.com  ",
      password: "AsecurePassword123",
    })).toEqual({
      name: "Alex Morgan",
      email: "alex@example.com",
      password: "AsecurePassword123",
      role: "USER",
    });
    expect(createUserSchema.safeParse({
      name: "Alex Morgan",
      email: "not-an-email",
      password: "AsecurePassword123",
    }).success).toBe(false);
  });

  it("rejects creating shifts before the business date but allows today and future dates", () => {
    const validate = createShiftSchema("2026-11-20");
    expect(validate.safeParse({ memberId: "member-1", date: "2026-11-19" }).success).toBe(false);
    expect(validate.safeParse({ memberId: "member-1", date: "2026-11-20" }).success).toBe(true);
    expect(validate.safeParse({ memberId: "member-1", date: "2026-11-21" }).success).toBe(true);
    expect(shiftSchema.safeParse({ memberId: "member-1", date: "2026-11-19" }).success).toBe(true);
  });
  it("rejects malformed shift dates and oversized notes", () => {
    expect(shiftSchema.safeParse({ memberId: "member-1", date: "2025-02-30" }).success).toBe(false);
    expect(shiftSchema.safeParse({
      memberId: "member-1",
      date: "2025-04-21",
      notes: "x".repeat(501),
    }).success).toBe(false);
  });

  it("bounds pagination to prevent unbounded queries", () => {
    expect(paginationSchema.parse({ page: "2", limit: "25" })).toEqual({
      page: 2,
      limit: 25,
      search: "",
      includePast: false,
    });
    expect(paginationSchema.parse({ includePast: "true" }).includePast).toBe(true);
    expect(paginationSchema.safeParse({ page: "0", limit: "5000" }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: "100001" }).success).toBe(false);
    expect(paginationSchema.safeParse({ search: "x".repeat(101) }).success).toBe(false);
  });

  it("defaults member pagination to eight and bounds page size", () => {
    expect(memberPaginationSchema.parse({})).toEqual({ page: 1, limit: 8 });
    expect(memberPaginationSchema.parse({ page: "3", limit: "8" })).toEqual({ page: 3, limit: 8 });
    expect(memberPaginationSchema.safeParse({ page: "0" }).success).toBe(false);
    expect(memberPaginationSchema.safeParse({ limit: "5000" }).success).toBe(false);
  });
});
