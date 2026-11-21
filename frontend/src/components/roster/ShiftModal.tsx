import { useState, type FormEvent } from "react";
import { Check, ChevronLeft, ChevronRight, LoaderCircle, X } from "lucide-react";
import type { Pagination, TeamMember, Shift } from "../../types";
import type { Language } from "../../utils/i18n";
import { t, type ShiftDraft } from "../shared";
import { LanguageToggle } from "../common/LanguageToggle";

export function ShiftModal({ language, onLanguageChange, members, isAdmin, memberPage, memberPagination, memberLoading, onMemberPageChange, businessDate, shift, busy, onClose, onSave }: {
  language: Language;
  onLanguageChange: (language: Language) => void;
  members: TeamMember[];
  isAdmin: boolean;
  memberPage: number;
  memberPagination: Pagination;
  memberLoading: boolean;
  onMemberPageChange: (page: number) => void;
  businessDate: string;
  shift: Shift | null;
  busy: boolean;
  onClose: () => void;
  onSave: (draft: ShiftDraft) => Promise<void>;
}) {
  const [memberId, setMemberId] = useState(shift?.member.id ?? members[0]?.id ?? "");
  const [date, setDate] = useState(shift?.date.slice(0, 10) ?? businessDate);
  const [notes, setNotes] = useState(shift?.notes ?? "");
  const [validationError, setValidationError] = useState("");
  const [saveError, setSaveError] = useState("");
  const selectableMembers = shift && !members.some((member) => member.id === shift.member.id)
    ? [...members, shift.member].sort((first, second) => first.name.localeCompare(second.name))
    : members;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError("");
    if ((isAdmin && !memberId) || (!isAdmin && members.length === 0) || !date) {
      setValidationError(t(language, "chooseMemberDate"));
      return;
    }
    if (businessDate && date < businessDate) {
      setValidationError(t(language, "pastShiftDate"));
      return;
    }
    setValidationError("");
    try {
      await onSave({ memberId, date, notes });
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : t(language, "saveShiftError"));
    }
  }

  return <div className="modal-backdrop" lang={language} dir={language === "he" ? "rtl" : "ltr"} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header className="modal-header"><div><span className="eyebrow">{shift ? t(language, "updateRotation") : t(language, "planRotation")}</span><h2 id="modal-title">{shift ? t(language, "editShiftTitle") : t(language, "addShiftTitle")}</h2></div><div className="modal-header-actions"><LanguageToggle language={language} onChange={onLanguageChange} /><button className="icon-button" onClick={onClose} disabled={busy} aria-label={t(language, "closeDialog")}><X size={19} /></button></div></header>
      <form onSubmit={submit}><div className="modal-body">
        {isAdmin ? <><label htmlFor="member">{t(language, "teamMemberLabel")}</label><small className="roster-field-note">{t(language, "shiftMemberDescription", { count: memberPagination.total })}</small><select id="member" value={memberId} onChange={(event) => setMemberId(event.target.value)} required disabled={memberLoading || selectableMembers.length === 0}>{selectableMembers.map((member) => <option value={member.id} key={member.id}>{member.name} · {member.role}</option>)}</select><div className="member-pagination"><button type="button" className="icon-button" disabled={memberPage <= 1 || memberLoading} onClick={() => onMemberPageChange(memberPage - 1)} aria-label={t(language, "previousPage")}><ChevronLeft size={16} /></button><span aria-live="polite">{t(language, "page")} <strong>{memberPage}</strong> {t(language, "of")} <strong>{Math.max(memberPagination.totalPages, 1)}</strong></span><button type="button" className="icon-button" disabled={memberPage >= memberPagination.totalPages || memberLoading} onClick={() => onMemberPageChange(memberPage + 1)} aria-label={t(language, "nextPage")}><ChevronRight size={16} /></button></div></> : members.length === 0 ? <div className="alert error-alert" role="alert">{t(language, "accountTeamMemberRequired")}</div> : <p className="roster-field-note">{t(language, "yourOwnShiftsOnly", { name: members[0].name })}</p>}
        <label htmlFor="date">{t(language, "onCallDate")}</label><input id="date" type="date" dir="ltr" min={businessDate || undefined} value={date} onChange={(event) => setDate(event.target.value)} required />
        <label htmlFor="notes">{t(language, "handoffNotes")} <span className="optional-label">{t(language, "optional")}</span></label><textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={3} placeholder={t(language, "notesPlaceholder")} />
        <div className="field-hint">{t(language, "notesCounter", { count: notes.length })}</div>
        {validationError && <div className="alert error-alert" role="alert">{validationError}</div>}
        {saveError && <div className="alert error-alert" role="alert">{saveError}</div>}
      </div><footer className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose} disabled={busy}>{t(language, "cancel")}</button><button type="submit" className="button button-primary" disabled={busy || members.length === 0}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{shift ? t(language, "saveChanges") : t(language, "addToRoster")}</button></footer></form>
    </section>
  </div>;
}
