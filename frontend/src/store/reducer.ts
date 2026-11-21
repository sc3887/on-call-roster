import type { Language } from "../utils/i18n";
import type { User } from "../types";

export interface AccessibilityPreferences {
  largerText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
}

export interface AppState {
  user: User | null;
  checkingSession: boolean;
  sessionError: string;
  accessibility: AccessibilityPreferences;
  language: Language;
}

export type AppAction =
  | { type: "sessionRestored"; user: User }
  | { type: "sessionExpired" }
  | { type: "sessionCheckCompleted" }
  | { type: "sessionFailed"; message: string }
  | { type: "languageChanged"; language: Language }
  | { type: "accessibilityChanged"; preferences: AccessibilityPreferences };

export const defaultAccessibility: AccessibilityPreferences = {
  largerText: false,
  highContrast: false,
  reduceMotion: false,
};

function readAccessibilityPreferences(): AccessibilityPreferences {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem("relay-accessibility") ?? "null");
    if (saved && typeof saved === "object") {
      const preferences = saved as Partial<AccessibilityPreferences>;
      return {
        largerText: preferences.largerText === true,
        highContrast: preferences.highContrast === true,
        reduceMotion: preferences.reduceMotion === true,
      };
    }
  } catch {
    return defaultAccessibility;
  }
  return defaultAccessibility;
}

export function createInitialAppState(): AppState {
  let language: Language = "en";
  try {
    language = localStorage.getItem("relay-language") === "he" ? "he" : "en";
  } catch {
    language = "en";
  }
  return {
    user: null,
    checkingSession: true,
    sessionError: "",
    accessibility: readAccessibilityPreferences(),
    language,
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "sessionRestored":
      return { ...state, user: action.user, sessionError: "" };
    case "sessionExpired":
      return { ...state, user: null };
    case "sessionCheckCompleted":
      return { ...state, checkingSession: false };
    case "sessionFailed":
      return { ...state, sessionError: action.message };
    case "languageChanged":
      return { ...state, language: action.language };
    case "accessibilityChanged":
      return { ...state, accessibility: action.preferences };
    default:
      return state;
  }
}
