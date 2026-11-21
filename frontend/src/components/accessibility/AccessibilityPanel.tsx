import { useEffect, useRef } from "react";
import { Accessibility, X } from "lucide-react";
import type { Language } from "../../utils/i18n";
import { defaultAccessibility, type AccessibilityPreferences } from "../../store";
import { t } from "../shared";

export function AccessibilityPanel({
  language,
  preferences,
  onChange,
  onClose,
}: {
  language: Language;
  preferences: AccessibilityPreferences;
  onChange: (preferences: AccessibilityPreferences) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const toggle = (key: keyof AccessibilityPreferences) =>
    onChange({ ...preferences, [key]: !preferences[key] });

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop accessibility-backdrop" lang={language} dir={language === "he" ? "rtl" : "ltr"} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="modal accessibility-modal" role="dialog" aria-modal="true" aria-labelledby="accessibility-title">
        <header className="modal-header">
          <div className="modal-heading-icon"><Accessibility size={20} /><div><span className="eyebrow">{t(language, "accessibility")}</span><h2 id="accessibility-title">{t(language, "accessibilitySettings")}</h2></div></div>
          <button ref={closeButtonRef} className="icon-button" onClick={onClose} aria-label={t(language, "close")}><X size={19} /></button>
        </header>
        <div className="accessibility-options">
          <PreferenceToggle id="larger-text" label={t(language, "largerText")} description={t(language, "largerTextDescription")} checked={preferences.largerText} onChange={() => toggle("largerText")} />
          <PreferenceToggle id="high-contrast" label={t(language, "highContrast")} description={t(language, "highContrastDescription")} checked={preferences.highContrast} onChange={() => toggle("highContrast")} />
          <PreferenceToggle id="reduce-motion" label={t(language, "reduceMotion")} description={t(language, "reduceMotionDescription")} checked={preferences.reduceMotion} onChange={() => toggle("reduceMotion")} />
        </div>
        <footer className="modal-footer">
          <button className="button button-secondary" onClick={() => onChange(defaultAccessibility)}>{t(language, "resetAccessibility")}</button>
          <button className="button button-primary" onClick={onClose}>{t(language, "close")}</button>
        </footer>
      </section>
    </div>
  );
}

function PreferenceToggle({ id, label, description, checked, onChange }: { id: string; label: string; description: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="preference-toggle" htmlFor={id}>
      <span className="preference-copy"><span>{label}</span><small id={`${id}-description`}>{description}</small></span>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} aria-label={label} aria-describedby={`${id}-description`} />
      <span className="toggle-track" aria-hidden="true"><span /></span>
    </label>
  );
}
