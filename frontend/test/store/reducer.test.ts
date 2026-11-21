import { afterEach, describe, expect, it, vi } from "vitest";
import { appReducer, createInitialAppState, defaultAccessibility, type AppState } from "../../src/store/reducer";
import type { User } from "../../src/types";

const admin: User = {
  id: "admin-1",
  email: "admin@example.com",
  name: "Relay Admin",
  role: "ADMIN",
};

function createState(overrides: Partial<AppState> = {}): AppState {
  return {
    user: null,
    checkingSession: true,
    sessionError: "",
    accessibility: defaultAccessibility,
    language: "en",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("appReducer", () => {
  it("restores the authenticated user and clears the session error", () => {
    const state = createState({ sessionError: "Session unavailable" });

    expect(appReducer(state, { type: "sessionRestored", user: admin })).toEqual({
      ...state,
      user: admin,
      sessionError: "",
    });
  });

  it("expires the session without changing unrelated state", () => {
    const state = createState({ user: admin, checkingSession: false, language: "he" });

    expect(appReducer(state, { type: "sessionExpired" })).toEqual({ ...state, user: null });
  });

  it("marks the initial session check complete", () => {
    const state = createState();

    expect(appReducer(state, { type: "sessionCheckCompleted" })).toEqual({
      ...state,
      checkingSession: false,
    });
  });

  it("stores session failures for the connection error screen", () => {
    const state = createState();

    expect(appReducer(state, { type: "sessionFailed", message: "API unavailable" })).toEqual({
      ...state,
      sessionError: "API unavailable",
    });
  });

  it("changes the active language", () => {
    const state = createState();

    expect(appReducer(state, { type: "languageChanged", language: "he" })).toEqual({
      ...state,
      language: "he",
    });
  });

  it("updates accessibility preferences without mutating the previous state", () => {
    const state = createState();
    const preferences = { largerText: true, highContrast: false, reduceMotion: true };

    expect(appReducer(state, { type: "accessibilityChanged", preferences })).toEqual({
      ...state,
      accessibility: preferences,
    });
    expect(state.accessibility).toEqual(defaultAccessibility);
  });

  it("initializes defaults when browser storage is unavailable", () => {
    const state = createInitialAppState();

    expect(state).toEqual({
      user: null,
      checkingSession: true,
      sessionError: "",
      accessibility: defaultAccessibility,
      language: "en",
    });
  });

  it("restores persisted language and accessibility preferences", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => key === "relay-language"
        ? "he"
        : JSON.stringify({ largerText: true, highContrast: "invalid", reduceMotion: true })),
    });

    expect(createInitialAppState()).toEqual({
      user: null,
      checkingSession: true,
      sessionError: "",
      accessibility: { largerText: true, highContrast: false, reduceMotion: true },
      language: "he",
    });
  });
});
