import { describe, expect, it } from "vitest";
import { buildSeedAssignments } from "../src/lib/seed-assignments";

const emails = [
  "user@example.com",
  "sam.rivera@example.com",
  "jordan.lee@example.com",
  "taylor.kim@example.com",
  "admin@example.com",
];
const members = new Map(emails.map((email) => [email, { id: email }]));

function offset(date: Date, days: number): string {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

describe("seed assignments", () => {
  it("preserves the original four assignments and adds 24 future and 6 past dates", () => {
    const today = "2026-11-20";
    const assignments = buildSeedAssignments(members, today, "user@example.com", "admin@example.com");
    const todayDate = new Date(`${today}T00:00:00.000Z`);
    const dates = assignments.map((assignment) => assignment.date.toISOString().slice(0, 10));

    expect(assignments).toHaveLength(34);
    expect(dates).toContain(offset(todayDate, 0));
    expect(dates).toContain(offset(todayDate, 27));
    expect(dates).toContain(offset(todayDate, -6));
    expect(assignments.filter(({ date }) => date > todayDate)).toHaveLength(27);
    expect(assignments.filter(({ date }) => date < todayDate)).toHaveLength(6);
    expect(assignments.slice(0, 4)).toMatchObject([
      { memberId: "user@example.com", date: new Date(`${today}T00:00:00.000Z`), notes: "Primary on-call" },
      { memberId: "jordan.lee@example.com", date: new Date(`${offset(todayDate, 1)}T00:00:00.000Z`), notes: "Backup rotation" },
      { memberId: "admin@example.com", date: new Date(`${offset(todayDate, 2)}T00:00:00.000Z`), notes: null },
      { memberId: "sam.rivera@example.com", date: new Date(`${offset(todayDate, 3)}T00:00:00.000Z`), notes: null },
    ]);
    expect(new Set(assignments.map(({ memberId, date }) => `${memberId}:${date.toISOString()}`)).size).toBe(assignments.length);
  });

  it("resolves member identities by email without relying on result ordering", () => {
    const shuffledMembers = new Map([...members.entries()].reverse());
    const assignments = buildSeedAssignments(shuffledMembers, "2026-11-20", "user@example.com", "admin@example.com");
    expect(assignments[0].memberId).toBe("user@example.com");
    expect(assignments[2].memberId).toBe("admin@example.com");
  });
});
