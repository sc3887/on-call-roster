import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, registerUnauthorizedCallback } from "../../src/services/api";

let unregisterUnauthorizedCallback: (() => void) | undefined;

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  unregisterUnauthorizedCallback?.();
  unregisterUnauthorizedCallback = undefined;
  vi.unstubAllGlobals();
});

describe("api service", () => {
  it("sends login credentials as JSON with same-origin cookies", async () => {
    const fetchMock = mockFetch(jsonResponse({ user: { id: "user-1" } }));

    await api.login("admin@example.com", "DemoPass123!");

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@example.com", password: "DemoPass123!" }),
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("encodes search terms and forwards an abort signal", async () => {
    const fetchMock = mockFetch(jsonResponse({ shifts: [], pagination: {} }));
    const controller = new AbortController();

    await api.shifts(2, "Sam Rivera & ops", true, controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/shifts?page=2&limit=8&search=Sam%20Rivera%20%26%20ops&includePast=true",
      expect.objectContaining({ signal: controller.signal, credentials: "same-origin" }),
    );
  });

  it("requests a specific members page with the page size", async () => {
    const fetchMock = mockFetch(jsonResponse({
      members: [],
      currentMember: null,
      currentMemberId: null,
      pagination: { page: 3, limit: 8, total: 25, totalPages: 4 },
    }));

    await api.members(3);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/members?page=3&limit=8",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("returns undefined for successful no-content responses", async () => {
    mockFetch(new Response(null, { status: 204 }));

    await expect(api.deleteShift("shift-1")).resolves.toBeUndefined();
  });

  it("converts API error responses into ApiError with status and message", async () => {
    mockFetch(jsonResponse({ error: { message: "Shift cannot be edited." } }, 400));

    await expect(api.saveShift({ memberId: "member-1", date: "2026-11-20", notes: "" }, "shift-1"))
      .rejects.toMatchObject({
        name: "ApiError",
        message: "Shift cannot be edited.",
        status: 400,
      });
  });

  it("uses a fallback message when an error response is not JSON", async () => {
    mockFetch(new Response("unavailable", { status: 503 }));

    await expect(api.members()).rejects.toMatchObject({
      name: "ApiError",
      message: "Request failed (503).",
      status: 503,
    });
  });

  it("calls the registered unauthorized callback for protected requests", async () => {
    const onUnauthorized = vi.fn();
    unregisterUnauthorizedCallback = registerUnauthorizedCallback(onUnauthorized);
    mockFetch(jsonResponse({ error: { message: "Session expired." } }, 401));

    await expect(api.logout()).rejects.toBeInstanceOf(ApiError);

    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("does not expire the session for login or session-check 401 responses", async () => {
    const onUnauthorized = vi.fn();
    unregisterUnauthorizedCallback = registerUnauthorizedCallback(onUnauthorized);
    mockFetch(
      jsonResponse({ error: { message: "Invalid credentials." } }, 401),
      jsonResponse({ error: { message: "Not signed in." } }, 401),
    );

    await expect(api.login("unknown@example.com", "wrong")).rejects.toBeInstanceOf(ApiError);
    await expect(api.me()).rejects.toBeInstanceOf(ApiError);

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("unregisters only the callback it registered", async () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    const unregisterFirst = registerUnauthorizedCallback(firstCallback);
    unregisterUnauthorizedCallback = registerUnauthorizedCallback(secondCallback);
    unregisterFirst();
    mockFetch(jsonResponse({ error: { message: "Session expired." } }, 401));

    await expect(api.logout()).rejects.toBeInstanceOf(ApiError);

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledOnce();
  });
});
