import { useState, type FormEvent } from "react";
import { Mail, X } from "lucide-react";
import { api } from "../../services/api";
import type { User } from "../../types";
import type { Language } from "../../utils/i18n";
import { t } from "../shared";
import { LanguageToggle } from "../common/LanguageToggle";

export function SupportCenter({ language, onLanguageChange, user, onClose }: {
  language: Language;
  onLanguageChange: (language: Language) => void;
  user: User;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (subject.trim().length < 3) {
      setError(t(language, "ticketSubjectRequired"));
      return;
    }
    if (body.trim().length < 10) {
      setError(t(language, "ticketBodyRequired"));
      return;
    }
    setLoading(true);
    try {
      await api.createSupportTicket({ subject, body });
      setSubject("");
      setBody("");
      setNotice(t(language, "requestSent"));
    } catch {
      setError(t(language, "requestFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" lang={language} dir={language === "he" ? "rtl" : "ltr"} onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
      <section className="modal support-modal support-request-modal" role="dialog" aria-modal="true" aria-labelledby="support-title">
        <header className="modal-header">
          <div><span className="eyebrow">{t(language, "contactSupport")} · {user.email}</span><h2 id="support-title">{t(language, "newRequest")}</h2></div>
          <div className="modal-header-actions"><LanguageToggle language={language} onChange={onLanguageChange} /><button className="icon-button" onClick={onClose} disabled={loading} aria-label={t(language, "close")}><X size={19} /></button></div>
        </header>
        {error && <div className="alert error-alert support-alert" role="alert">{error}</div>}
        {notice && <div className="alert success-alert support-alert" role="status">{notice}</div>}
        <div className="support-content">
          <form className="support-form" onSubmit={(event) => void submitTicket(event)}>
            <label htmlFor="support-subject">{t(language, "subject")}</label>
            <input id="support-subject" value={subject} onChange={(event) => setSubject(event.target.value)} minLength={3} maxLength={120} required />
            <label htmlFor="support-body">{t(language, "describeIssue")}</label>
            <textarea id="support-body" value={body} onChange={(event) => setBody(event.target.value)} minLength={10} maxLength={4000} rows={5} required />
            <button className="button button-primary" type="submit" disabled={loading}><Mail size={16} /> {t(language, "sendRequest")}</button>
          </form>
        </div>
      </section>
    </div>
  );
}
