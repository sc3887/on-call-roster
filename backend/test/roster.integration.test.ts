import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dateOnlyInTimeZone } from "../src/lib/dates";

const runIntegration = process.env.RUN_DB_INTEGRATION_TESTS === "true";

describe.skipIf(!runIntegration)("roster ownership integration", () => {
  let app: (typeof import("../src/app"))["app"];
  let prisma: (typeof import("../src/conf/database"))["prisma"];
  let admin: { id: string; email: string; memberId: string };
  let owner: { id: string; email: string; memberId: string };
  let other: { id: string; email: string; memberId: string };
  let unlinked: { id: string; email: string };
  let password: string;
  let date: string;
  const userIds: string[] = [];
  const memberIds: string[] = [];

  function futureDate(offset: number): Date {
    const value = new Date(`${dateOnlyInTimeZone()}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    return value;
  }

  function futureDateString(offset: number): string {
    return futureDate(offset).toISOString().slice(0, 10);
  }

  async function login(email: string) {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email, password }).expect(200);
    return agent;
  }

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET ??= "integration-test-secret-at-least-32-characters";
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for roster integration tests.");
    ({ app } = await import("../src/app"));
    ({ prisma } = await import("../src/conf/database"));

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    password = "IntegrationPass123!";
    const passwordHash = await bcrypt.hash(password, 4);
    const createAccount = async (label: string, role: string, linked: boolean) => {
      const email = `${label}-${suffix}@integration.example`;
      const user = await prisma.user.create({
        data: {
          email,
          name: label,
          role,
          passwordHash,
          ...(linked ? { teamMember: { create: { name: label, email, role: "Engineer" } } } : {}),
        },
        include: { teamMember: { select: { id: true } } },
      });
      userIds.push(user.id);
      if (user.teamMember) memberIds.push(user.teamMember.id);
      return { id: user.id, email, memberId: user.teamMember?.id ?? "" };
    };
    admin = await createAccount("admin", "ADMIN", true);
    owner = await createAccount("owner", "USER", true);
    other = await createAccount("other", "USER", true);
    unlinked = await createAccount("unlinked", "USER", false);
    date = futureDateString(10);
  });

  afterAll(async () => {
    if (!prisma) return;
    if (memberIds.length > 0) {
      await prisma.shift.deleteMany({ where: { memberId: { in: memberIds } } });
    }
    if (userIds.length > 0) {
      await prisma.teamMember.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  it("forces regular users to create only for their linked team member and returns 409 for duplicates", async () => {
    const agent = await login(owner.email);
    const firstMembersPage = await agent.get("/api/members?page=1&limit=1").expect(200);
    const secondMembersPage = await agent.get("/api/members?page=2&limit=1").expect(200);
    expect(firstMembersPage.body.members).toHaveLength(1);
    expect(secondMembersPage.body.members).toHaveLength(1);
    expect(firstMembersPage.body.pagination).toMatchObject({ page: 1, limit: 1, totalPages: expect.any(Number) });
    expect(firstMembersPage.body.pagination.total).toBeGreaterThanOrEqual(3);
    expect(secondMembersPage.body.currentMember).toMatchObject({ id: owner.memberId, name: "owner" });

    const created = await agent.post("/api/shifts")
      .send({ date, notes: "owner assignment" })
      .expect(201);
    expect(created.body.shift.memberId).toBe(owner.memberId);
    const createdWithForgedMember = await agent.post("/api/shifts")
      .send({ memberId: other.memberId, date: futureDateString(18), notes: "forged member" })
      .expect(201);
    expect(createdWithForgedMember.body.shift.memberId).toBe(owner.memberId);
    const otherShift = await prisma.shift.create({
      data: { memberId: other.memberId, date: futureDate(19), notes: "other user's shift" },
    });

    const roster = await agent.get("/api/shifts?page=1&limit=50").expect(200);
    expect(roster.body.shifts.find((shift: { id: string }) => shift.id === created.body.shift.id).canManage).toBe(true);
    expect(roster.body.shifts.find((shift: { id: string }) => shift.id === createdWithForgedMember.body.shift.id).canManage).toBe(true);
    expect(roster.body.shifts.find((shift: { id: string }) => shift.id === otherShift.id).canManage).toBe(false);
    const duplicate = await agent.post("/api/shifts")
      .send({ memberId: owner.memberId, date, notes: "duplicate" })
      .expect(409);
    expect(duplicate.body.error.code).toBe("CONFLICT");
  });

  it("blocks regular users from editing or deleting another member's shift", async () => {
    const shift = await prisma.shift.create({
      data: { memberId: other.memberId, date: futureDate(11), notes: "private ownership fixture" },
    });
    const agent = await login(owner.email);
    await agent.put(`/api/shifts/${shift.id}`)
      .send({ memberId: owner.memberId, date: futureDateString(12), notes: "unauthorized" })
      .expect(403);
    await agent.delete(`/api/shifts/${shift.id}`).expect(403);
    expect(await prisma.shift.findUnique({ where: { id: shift.id } })).not.toBeNull();
  });

  it("lets users manage their own shifts without transferring ownership and admins manage all shifts", async () => {
    const shift = await prisma.shift.create({
      data: { memberId: owner.memberId, date: futureDate(13), notes: "before edit" },
    });
    const ownerAgent = await login(owner.email);
    const updated = await ownerAgent.put(`/api/shifts/${shift.id}`)
      .send({ memberId: other.memberId, date: futureDateString(14), notes: "owner edit" })
      .expect(200);
    expect(updated.body.shift.memberId).toBe(owner.memberId);
    await ownerAgent.delete(`/api/shifts/${shift.id}`).expect(204);

    const adminShift = await prisma.shift.create({
      data: { memberId: other.memberId, date: futureDate(15), notes: "admin fixture" },
    });
    const adminAgent = await login(admin.email);
    await adminAgent.put(`/api/shifts/${adminShift.id}`)
      .send({ memberId: admin.memberId, date: futureDateString(16), notes: "admin edit" })
      .expect(200);
    await adminAgent.delete(`/api/shifts/${adminShift.id}`).expect(204);
  });

  it("rejects all edits to past shifts but allows deleting them", async () => {
    const oldDate = futureDate(-2);
    const oldDateString = futureDateString(-2);
    const shift = await prisma.shift.create({
      data: { memberId: owner.memberId, date: oldDate, notes: "old note" },
    });
    const agent = await login(owner.email);
    const notesOnly = await agent.put(`/api/shifts/${shift.id}`)
      .send({ memberId: owner.memberId, date: oldDateString, notes: "updated historical note" })
      .expect(400);
    expect(notesOnly.body.error.code).toBe("VALIDATION_ERROR");
    const unchangedShift = await prisma.shift.findUnique({ where: { id: shift.id } });
    expect(unchangedShift?.notes).toBe("old note");
    expect(unchangedShift?.date.toISOString().slice(0, 10)).toBe(oldDateString);

    const adminAgent = await login(admin.email);
    const adminEdit = await adminAgent.put(`/api/shifts/${shift.id}`)
      .send({ memberId: other.memberId, date: oldDateString, notes: "admin historical edit" })
      .expect(400);
    expect(adminEdit.body.error.code).toBe("VALIDATION_ERROR");
    expect((await prisma.shift.findUnique({ where: { id: shift.id } }))?.notes).toBe("old note");
    await agent.delete(`/api/shifts/${shift.id}`).expect(204);

    const futureShift = await prisma.shift.create({
      data: { memberId: owner.memberId, date: futureDate(20), notes: "upcoming" },
    });
    const response = await agent.put(`/api/shifts/${futureShift.id}`)
      .send({ memberId: owner.memberId, date: oldDateString, notes: "must not become historical" })
      .expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect((await prisma.shift.findUnique({ where: { id: futureShift.id } }))?.date.toISOString().slice(0, 10)).toBe(futureDateString(20));
  });

  it("returns a clear error when an account has no linked team member", async () => {
    const agent = await login(unlinked.email);
    const response = await agent.post("/api/shifts")
      .send({ memberId: other.memberId, date: futureDateString(17), notes: "not allowed" })
      .expect(403);
    expect(response.body.error.code).toBe("ROSTER_MEMBERSHIP_REQUIRED");
  });
});
