import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { api, ApiError, registerUnauthorizedCallback } from "../services/api";
import type { Language } from "../utils/i18n";
import { appReducer, createInitialAppState, type AccessibilityPreferences } from "../store";
import { t } from "./shared";
import { LanguageToggle } from "./common/LanguageToggle";
import { Login } from "./auth/Login";
import { RosterBoard } from "./roster/RosterBoard";

function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialAppState);
  const { user, checkingSession, sessionError, accessibility, language } = state;
  const languageRef = useRef(language);
  const [supportOpen, setSupportOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const closeAccessibility = useCallback(() => setAccessibilityOpen(false), []);
  const setLanguage = (nextLanguage: Language) => dispatch({ type: "languageChanged", language: nextLanguage });
  const setAccessibility = (preferences: AccessibilityPreferences) => dispatch({ type: "accessibilityChanged", preferences });

  useEffect(() => {
    languageRef.current = language;
    document.documentElement.lang = language;
    document.documentElement.dir = language === "he" ? "rtl" : "ltr";
    document.title = language === "he"
      ? "Relay — לוח תורנויות"
      : "Relay — On-call roster";
    try {
      localStorage.setItem("relay-language", language);
    } catch {
      // Language still works for the current session when storage is unavailable.
    }
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.largeText = String(accessibility.largerText);
    document.documentElement.dataset.highContrast = String(accessibility.highContrast);
    document.documentElement.dataset.reduceMotion = String(accessibility.reduceMotion);
    try {
      localStorage.setItem("relay-accessibility", JSON.stringify(accessibility));
    } catch {
      // Preferences remain active for this session if storage is unavailable.
    }
  }, [accessibility]);

  useEffect(() => registerUnauthorizedCallback(() => dispatch({ type: "sessionExpired" })), []);

  useEffect(() => {
    api.me()
      .then(({ user: currentUser }) => dispatch({ type: "sessionRestored", user: currentUser }))
      .catch((cause) => {
        if (cause instanceof ApiError && cause.status === 401) {
          dispatch({ type: "sessionExpired" });
          return;
        }
        dispatch({
          type: "sessionFailed",
          message: languageRef.current === "he"
            ? "בדקו שה־API ומסד הנתונים פועלים ונסו להתחבר שוב."
            : "Check that the API and database are running, then retry.",
        });
      })
      .finally(() => dispatch({ type: "sessionCheckCompleted" }));
  }, []);

  if (checkingSession) {
    return <div className="page-loading"><LoaderCircle className="spin" /> {t(language, "connecting")}</div>;
  }
  if (sessionError) {
    return <div className="page-loading session-error" role="alert"><LanguageToggle language={language} onChange={setLanguage} /><strong>{t(language, "connectionFailed")}</strong><span>{sessionError}</span><button className="button button-secondary" onClick={() => window.location.reload()}>{t(language, "retry")}</button></div>;
  }
  if (!user) return <Login language={language} onLanguageChange={setLanguage} onLogin={(signedInUser) => dispatch({ type: "sessionRestored", user: signedInUser })} />;
  return <RosterBoard language={language} onLanguageChange={setLanguage} user={user} onLogout={() => dispatch({ type: "sessionExpired" })} onOpenSupport={() => setSupportOpen(true)} onOpenAccessibility={() => setAccessibilityOpen(true)} supportOpen={supportOpen} onCloseSupport={() => setSupportOpen(false)} accessibilityOpen={accessibilityOpen} onCloseAccessibility={closeAccessibility} accessibility={accessibility} setAccessibility={setAccessibility} />;
}

export default App;
