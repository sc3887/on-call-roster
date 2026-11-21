import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUserForLogin: vi.fn(),
  findUserForSession: vi.fn(),
  prismaUserFindUnique: vi.fn(),
  prismaTeamMemberFindUnique: vi.fn(),
}));

vi.mock("../src/conf/database", () => ({
  prisma: {
    user: { findUnique: mocks.prismaUserFindUnique },
    teamMember: { findUnique: mocks.prismaTeamMemberFindUnique },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../src/models/auth.model", () => ({
  findUserForLogin: mocks.findUserForLogin,
  findUserForSession: mocks.findUserForSession,
}));

let app: (typeof import("../src/app"))["app"];
let passwordHash: string;

beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
  vi.stubEnv("JWT_SECRET", "test-secret-that-is-long-enough-for-the-config");
  ({ app } = await import("../src/app"));
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  vi.clearAllMocks();
  passwordHash = await bcrypt.hash("correct-password", 4);
  mocks.findUserForLogin.mockResolvedValue({
    id: "user-1",
    email: "person@example.com",
    name: "Test User",
    role: "USER",
    isActive: true,
    passwordHash,
  });
  mocks.prismaUserFindUnique.mockResolvedValue({ role: "USER", isActive: true });
  mocks.prismaTeamMemberFindUnique.mockResolvedValue({ id: "member-1" });
});

describe("HTTP API", () => {
  it("rejects roster requests without an authenticated session", async () => {
    await request(app).get("/api/members").expect(401);
  });

  it("creates an HttpOnly session cookie on login", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "PERSON@example.com", password: "correct-password" })
      .expect(200);

    expect(response.body.user).toMatchObject({ id: "user-1", role: "USER" });
    expect(response.headers["set-cookie"][0]).toMatch(/HttpOnly/i);
    expect(mocks.findUserForLogin).toHaveBeenCalledWith("person@example.com");
  });

  it("compares passwords against a module-level dummy hash for unknown emails", async () => {
    mocks.findUserForLogin.mockResolvedValue(null);
    const compareSpy = vi.spyOn(bcrypt, "compare").mockResolvedValue(false);
    await request(app)
      .post("/api/auth/login")
      .send({ email: "unknown@example.com", password: "wrong-password" })
      .expect(401);

    expect(compareSpy).toHaveBeenCalledWith("wrong-password", expect.stringMatching(/^\$2[ab]\$12\$/));
    compareSpy.mockRestore();
  });

  it("blocks regular users from administrator user-management endpoints", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login")
      .send({ email: "person@example.com", password: "correct-password" })
      .expect(200);

    await agent.get("/api/support/users").expect(403);
  });

  it("returns a validation error for an invalid shift request", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login")
      .send({ email: "person@example.com", password: "correct-password" })
      .expect(200);

    const response = await agent.post("/api/shifts")
      .send({ memberId: "", date: "2026-02-30", notes: "invalid" })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
  it("rejects past shift creation requests at the HTTP boundary", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login")
      .send({ email: "person@example.com", password: "correct-password" })
      .expect(200);

    const response = await agent.post("/api/shifts")
      .send({ memberId: "member-1", date: "2020-01-01", notes: "past" })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
