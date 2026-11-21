import { dateLocale, translate, type Language, type TranslationKey } from "../utils/i18n";

export type ShiftDraft = { memberId: string; date: string; notes: string };
export const t = (language: Language, key: TranslationKey, values?: Record<string, string | number>) =>
  translate(language, key, values);
export const readableDate = (date: string, language: Language, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat(dateLocale(language), { timeZone: "UTC", ...options })
    .format(new Date(`${date.slice(0, 10)}T00:00:00.000Z`));

export const initials = (name: string) =>
  name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
