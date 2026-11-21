import { Fragment, useState, type FormEvent } from "react";
import { ArrowUpRight, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { api, ApiError } from "../../services/api";
import type { User } from "../../types";
import type { Language } from "../../utils/i18n";
import { t } from "../shared";
import { LanguageToggle } from "../common/LanguageToggle";

export function Login({ language, onLanguageChange, onLogin }: { language: Language; onLanguageChange: (language: Language) => void; onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { user } = await api.login(email, password);
      onLogin(user);
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 401 ? t(language, "signInFailed") : t(language, "signInError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page" lang={language} dir={language === "he" ? "rtl" : "ltr"}>
      <LanguageToggle language={language} onChange={onLanguageChange} />
      <div className="login-art" aria-hidden="true">
        <div className="art-glow" />
        <div className="art-copy">
          <div className="brand brand-light"><span className="brand-mark" aria-hidden="true"><ShieldCheck size={19} /></span><span className="brand-lockup"><strong>relay<span className="brand-dot">.</span></strong><small>ON-CALL ROSTER</small></span></div>
          <div className="art-message">
            <span className="eyebrow">{t(language, "tagline")}</span>
            <h1>{t(language, "loginHeroTitle").split(/<br\s*\/?\s*>/i).map((part, index) => <Fragment key={index}>{index > 0 && <br />}{part}</Fragment>)}</h1>
            <p>{t(language, "loginHeroDescription")}</p>
          </div>
          <div className="art-status"><span className="status-pulse" /> {t(language, "systemsReady")}</div>
        </div>
        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />
      </div>
      <section className="login-panel">
        <div className="mobile-brand brand"><span className="brand-mark" aria-hidden="true"><ShieldCheck size={19} /></span><span className="brand-lockup"><strong>relay<span className="brand-dot">.</span></strong><small>ON-CALL ROSTER</small></span></div>
        <div className="login-form-wrap">
          <div className="welcome-icon"><ShieldCheck size={23} /></div>
          <span className="eyebrow">{t(language, "teamWorkspace")}</span>
          <h2>{t(language, "welcomeBack")}</h2>
          <p className="muted">{t(language, "loginDescription")}</p>
          <form onSubmit={submit} className="login-form">
            <label htmlFor="email">{t(language, "workEmail")}</label>
            <div className="input-wrap"><Mail size={17} /><input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <label htmlFor="password">{t(language, "password")}</label>
            <div className="input-wrap"><ShieldCheck size={17} /><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
            {error && <div className="alert error-alert" role="alert">{error}</div>}
            <button className="button button-primary login-submit" disabled={busy}>
              {busy ? <LoaderCircle size={17} className="spin" /> : null}
              {t(language, "signIn")} <ArrowUpRight size={17} />
            </button>
          </form>
          <p className="login-foot"><ShieldCheck size={14} /> {t(language, "secureWorkspace")}</p>
        </div>
        <span className="login-copyright">{t(language, "loginFooter")}</span>
      </section>
    </main>
  );
}
