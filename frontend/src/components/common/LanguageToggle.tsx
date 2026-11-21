import type { Language } from "../../utils/i18n";
import { t } from "../shared";

export function LanguageToggle({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  const nextLanguage = language === "en" ? "he" : "en";
  return (
    <button className="language-toggle" type="button" onClick={() => onChange(nextLanguage)} aria-label={language === "en" ? t(language, "switchLanguageToHebrew") : t(language, "switchLanguageToEnglish")}>
      {language === "en" ? "עב" : "EN"} <span>{language === "en" ? t(language, "switchToEnglish") : t(language, "switchToHebrew")}</span>
    </button>
  );
}
