import { useEffect, useRef, useState } from "react";
import { Accessibility, ArrowDownRight, Bell, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, History, LoaderCircle, LogOut, Mail, Pencil, Plus, Search, ShieldCheck, Trash2, UsersRound, X } from "lucide-react";
import { api, ApiError } from "../../services/api";
import type { MembersPage, Pagination, Shift, TeamMember, User } from "../../types";
import type { Language } from "../../utils/i18n";
import type { AccessibilityPreferences } from "../../store";
import { initials, readableDate, t, type ShiftDraft } from "../shared";
import { NotificationPopover } from "./NotificationPopover";
import { ShiftModal } from "./ShiftModal";
import { SupportCenter } from "../support/SupportCenter";
import { AdminConsole } from "../admin/AdminConsole";
import { AccessibilityPanel } from "../accessibility/AccessibilityPanel";
import { LanguageToggle } from "../common/LanguageToggle";

export function RosterBoard({
  language,
  onLanguageChange,
  user,
  onLogout,
  onOpenSupport,
  onOpenAccessibility,
  supportOpen,
  onCloseSupport,
  accessibilityOpen,
  onCloseAccessibility,
  accessibility,
  setAccessibility,
}: {
  language: Language;
  onLanguageChange: (language: Language) => void;
  user: User;
  onLogout: () => void;
  onOpenSupport: () => void;
  onOpenAccessibility: () => void;
  supportOpen: boolean;
  onCloseSupport: () => void;
  accessibilityOpen: boolean;
  onCloseAccessibility: () => void;
  accessibility: AccessibilityPreferences;
  setAccessibility: (preferences: AccessibilityPreferences) => void;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);
  const [memberPagination, setMemberPagination] = useState<Pagination>({ page: 1, limit: 8, total: 0, totalPages: 0 });
  const [memberPage, setMemberPage] = useState(1);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberRefreshVersion, setMemberRefreshVersion] = useState(0);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [todayDate, setTodayDate] = useState("");
  const [nextShift, setNextShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 8, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showPastShifts, setShowPastShifts] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<Shift | "new" | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [openPopover, setOpenPopover] = useState<"notifications" | null>(null);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const notificationPopoverRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef(language);
  const notificationCount = Number(todayShifts.length > 0) + Number(nextShift !== null);
  const notificationFingerprint = `${todayShifts.map((shift) => shift.id).join(",")}:${nextShift?.id ?? ""}`;

  function addRosterMember(member: TeamMember) {
    setMembers((current) => current.some((existing) => existing.id === member.id)
      ? current
      : [...current, member].sort((first, second) => first.name.localeCompare(second.name)));
    setMemberRefreshVersion((current) => current + 1);
  }

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    setNotificationsRead(false);
  }, [notificationFingerprint]);

  useEffect(() => {
    function dismissPopover(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setOpenPopover(null);
        return;
      }
      if (event instanceof MouseEvent && event.type === "pointerdown") {
        const target = event.target as Node;
        if (!notificationPopoverRef.current?.contains(target)) {
          setOpenPopover(null);
        }
      }
    }

    document.addEventListener("pointerdown", dismissPopover);
    document.addEventListener("keydown", dismissPopover);
    return () => {
      document.removeEventListener("pointerdown", dismissPopover);
      document.removeEventListener("keydown", dismissPopover);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setMemberLoading(true);
    api.members(memberPage, controller.signal)
      .then((memberResult: MembersPage) => {
        if (controller.signal.aborted) return;
        setMembers((current) => {
          const byId = new Map(current.map((member) => [member.id, member]));
          for (const member of memberResult.members) byId.set(member.id, member);
          return [...byId.values()].sort((first, second) => first.name.localeCompare(second.name));
        });
        setCurrentMember(memberResult.currentMember);
        setMemberPagination(memberResult.pagination);
        const lastPage = Math.max(memberResult.pagination.totalPages, 1);
        if (memberPage > lastPage) setMemberPage(lastPage);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t(languageRef.current, "loadRosterError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setMemberLoading(false);
      });
    return () => controller.abort();
  }, [memberPage, memberRefreshVersion]);

  useEffect(() => {
    const controller = new AbortController();
    api.today(controller.signal)
      .then((todayResult) => {
        if (controller.signal.aborted) return;
        setTodayShifts(todayResult.shifts);
        setTodayDate(todayResult.date);
        setNextShift(todayResult.nextShift);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t(languageRef.current, "loadRosterError"));
      });
    return () => controller.abort();
  }, [refreshVersion]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api.shifts(page, debouncedSearch, showPastShifts, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setShifts(result.shifts);
        setPagination(result.pagination);
        if (page > Math.max(result.pagination.totalPages, 1)) {
          setPage(Math.max(result.pagination.totalPages, 1));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t(languageRef.current, "loadRosterError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, debouncedSearch, showPastShifts, refreshVersion]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function logout() {
    try {
      await api.logout();
      onLogout();
    } catch {
      setError(t(language, "signOutError"));
    }
  }

  async function saveShift(draft: ShiftDraft, id?: string) {
    setBusy(true);
    try {
      await api.saveShift(draft, id);
      setModal(null);
      setToast(id ? t(language, "shiftUpdated") : t(language, "shiftAdded"));
      setRefreshVersion((current) => current + 1);
    } catch (cause) {
      throw new Error(cause instanceof ApiError && cause.status === 409
        ? t(language, "duplicateShift")
        : cause instanceof ApiError && cause.status === 403
           ? t(language, "shiftPermissionError")
           : t(language, "saveShiftError"));
    } finally {
      setBusy(false);
    }
  }

  async function removeShift(shift: Shift) {
    if (!window.confirm(t(language, "removeShiftConfirm", {
      name: shift.member.name,
      date: readableDate(shift.date, language),
    }))) return;
    setError("");
    try {
      await api.deleteShift(shift.id);
      setToast(t(language, "shiftRemoved"));
      setRefreshVersion((current) => current + 1);
    } catch {
      setError(t(language, "saveShiftError"));
    }
  }

  const todayLabel = todayDate
    ? readableDate(todayDate, language, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  return (
    <div className="app-shell" lang={language} dir={language === "he" ? "rtl" : "ltr"}>
      <aside className="sidebar">
        <a className="brand" href="#" aria-label={t(language, "rosterHome")}><span className="brand-mark" aria-hidden="true"><ShieldCheck size={19} /></span><span className="brand-lockup"><strong>relay<span className="brand-dot">.</span></strong><small>ON-CALL ROSTER</small></span></a>
        <div className="nav-label">{t(language, "operations")}</div>
        <button className={`nav-item ${adminOpen ? "" : "active"}`} onClick={() => setAdminOpen(false)}><CalendarDays size={18} /><span>{t(language, "onCallRoster")}</span><span className="nav-count">{pagination.total}</span></button>
        {user.role === "ADMIN" && <button className={`nav-item ${adminOpen ? "active" : ""}`} onClick={() => setAdminOpen(true)}><UsersRound size={18} /><span>{t(language, "adminWorkspace")}</span></button>}
        <div className="sidebar-note"><div className="note-icon"><ShieldCheck size={18} /></div><strong>{t(language, "coverageClear")}</strong><p>{t(language, "coverageDescription")}</p></div>
        <div className="sidebar-bottom">
          {user.role !== "ADMIN" && <button className="support-bot-launcher" type="button" onClick={onOpenSupport} aria-label={t(language, "helpSupport")} aria-haspopup="dialog" aria-expanded={supportOpen} title={t(language, "helpSupport")}>
            <span className="support-bot-message" lang={language} dir={language === "he" ? "rtl" : "ltr"}>{t(language, "supportBotGreeting")}</span>
            <svg className="support-bot-illustration" viewBox="0 0 100 90" aria-hidden="true">
              <defs>
                <linearGradient id="bot-body" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#e9f5ed" />
                </linearGradient>
              </defs>
              <path d="M50 16V9" fill="none" stroke="#16834a" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="50" cy="7" r="5" fill="#f58220" stroke="#fff" strokeWidth="2" />
              <path d="M29 31v-5c0-12 9-20 21-20s21 8 21 20v5" fill="#e9f5ed" stroke="#16834a" strokeWidth="3.5" strokeLinejoin="round" />
              <rect x="19" y="25" width="62" height="43" rx="16" fill="url(#bot-body)" stroke="#16834a" strokeWidth="3.5" />
              <path d="M13 39h6v15h-6a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4ZM81 39h6a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-6" fill="#fff" stroke="#16834a" strokeWidth="3.5" strokeLinejoin="round" />
              <rect x="29" y="34" width="42" height="25" rx="11" fill="#dff1e5" />
              <circle cx="40" cy="45" r="3" fill="#176d3f" />
              <circle cx="60" cy="45" r="3" fill="#176d3f" />
              <path d="M41 52c2 3 5 4 9 4s7-1 9-4" fill="none" stroke="#176d3f" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M43 69v5c0 3 3 5 7 5s7-2 7-5v-5" fill="#e9f5ed" stroke="#16834a" strokeWidth="3.5" />
              <path d="M23 86c1-10 8-16 18-16h18c10 0 17 6 18 16" fill="url(#bot-body)" stroke="#16834a" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M42 75h16" stroke="#c7e4d0" strokeWidth="2" strokeLinecap="round" />
              <circle cx="50" cy="81" r="3.5" fill="#f58220" />
            </svg>
          </button>}
          <div className="sidebar-user"><span className="user-avatar">{initials(user.name || user.email)}</span><span className="user-details"><strong>{user.name || user.email.split("@")[0]}</strong><small>{t(language, user.role === "ADMIN" ? "administrator" : "regularUser")}</small></span><button className="icon-button logout-button" onClick={() => void logout()} title={t(language, "signOut")} aria-label={t(language, "signOut")}><LogOut size={17} /></button></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-leading">
            <span className="brand-mark topbar-brand-mark" aria-hidden="true"><ShieldCheck size={21} /></span><span className="topbar-relay"><strong>relay<span className="brand-dot">.</span></strong><small>ON-CALL ROSTER</small></span>
            <div className="breadcrumb">{t(language, "operations")} <ChevronRight size={14} /> <strong>{t(language, adminOpen ? "adminWorkspace" : "onCallRoster")}</strong></div>
          </div>
          <div className="topbar-right">
            <LanguageToggle language={language} onChange={onLanguageChange} />
            <span className="live-indicator"><span /> {t(language, "roster")}</span>
            <div className="popover-anchor notification-anchor" ref={notificationPopoverRef}>
              <button
                className="icon-button notification-button"
                aria-label={t(language, "openNotifications")}
                aria-expanded={openPopover === "notifications"}
                aria-haspopup="dialog"
                aria-controls="notifications-popover"
                onClick={() => setOpenPopover((current) => current === "notifications" ? null : "notifications")}
              >
                <Bell size={18} />
                {notificationCount > 0 && !notificationsRead && <i />}
              </button>
              {openPopover === "notifications" && (
                <NotificationPopover
                  language={language}
                  businessDate={todayDate}
                  todayShifts={todayShifts}
                  nextShift={nextShift}
                  unread={notificationCount > 0 && !notificationsRead}
                  onMarkRead={() => setNotificationsRead(true)}
                  onSelect={(target) => {
                    setNotificationsRead(true);
                    setOpenPopover(null);
                    document.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                />
              )}
            </div>
            <span className="topbar-date">{todayLabel}</span>
          </div>
        </header>
        {adminOpen && user.role === "ADMIN"
          ? <AdminConsole language={language} user={user} onClose={() => setAdminOpen(false)} onRosterMemberAdded={addRosterMember} />
          : <div className="content-wrap">
          <div className="heading-row"><div><div className="eyebrow">{t(language, "teamOperations")} <span className="eyebrow-dot">·</span> {t(language, "rotationOverview")}</div><h1>{t(language, "pageTitle")}<span className="title-period">.</span></h1><p className="heading-subtitle">{t(language, "pageDescription")}</p></div><button className="button button-primary add-button" onClick={() => setModal("new")}><Plus size={18} /> {t(language, "addShift")}</button></div>

          {error && <div className="alert error-alert board-alert" role="alert"><span>{error}</span><button onClick={() => setError("")} aria-label={t(language, "dismissError")}><X size={16} /></button></div>}

          <section className="today-card">
            <div className="today-main">
              <div className="today-topline"><span className="on-duty-dot" /> {t(language, "onDutyToday")} {todayDate && <span className="today-date">{readableDate(todayDate, language, { weekday: "short", month: "short", day: "numeric" })}</span>}</div>
              {todayShifts.length ? <div className="today-people">{todayShifts.map((shift) => <div className="today-person" key={shift.id}><span className="person-avatar hero-avatar">{initials(shift.member.name)}</span><div><h2>{shift.member.name}</h2><p>{shift.member.role}</p></div><span className="primary-badge"><span /> {t(language, "onCall")}</span></div>)}</div> : <div className="no-oncall"><h2>{t(language, "noOneOnCall")}</h2><p>{t(language, "addShiftPrompt")}</p></div>}
              <div className="today-contact">{todayShifts.length > 0 && <><span className="contact-label">{t(language, "contact")}</span>{todayShifts.map((shift) => <a dir="ltr" href={`mailto:${shift.member.email}`} key={shift.id}><Mail size={14} /> {shift.member.email}</a>)}</>}</div>
            </div>
            <div className="today-aside"><div className="aside-icon"><Clock3 size={18} /></div><span className="aside-label">{t(language, "upNext")}</span>{nextShift ? <><strong>{nextShift.member.name}</strong><p>{readableDate(nextShift.date, language, { weekday: "short", month: "short", day: "numeric" })}</p></> : <><strong>{t(language, "notScheduled")}</strong><p>{t(language, "planHandoff")}</p></>}</div>
          </section>

          <div className="section-heading"><div><span className="eyebrow">{t(language, "schedule")}</span><h2>{t(language, showPastShifts ? "pastShifts" : "upcomingShifts")} <span className="schedule-total">{pagination.total}</span></h2></div><div className="schedule-tools"><button className="button button-secondary history-toggle" type="button" aria-pressed={showPastShifts} onClick={() => { setPage(1); setShowPastShifts((current) => !current); }}><History size={15} />{t(language, showPastShifts ? "showUpcomingShifts" : "showPastShifts")}</button><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder={t(language, "searchRoster")} aria-label={t(language, "searchRoster")} /></div><button className="button button-secondary add-button-mobile" onClick={() => setModal("new")}><Plus size={17} /> {t(language, "addShift")}</button></div></div>

          <section className="schedule-card" aria-label={t(language, showPastShifts ? "pastScheduleLabel" : "scheduleLabel")}>
            <div className="table-scroll"><table><thead><tr><th>{t(language, "teamMember")}</th><th>{t(language, "date")}</th><th>{t(language, "role")}</th><th>{t(language, "contact")}</th><th>{t(language, "notes")}</th><th><span className="sr-only">{t(language, "actions")}</span></th></tr></thead><tbody>
              {loading ? <tr><td colSpan={6} className="table-state"><LoaderCircle size={19} className="spin" /> {t(language, "loadingSchedule")}</td></tr>
                : shifts.length ? shifts.map((shift) => <tr key={shift.id}><td><div className="member-cell"><span className="person-avatar">{initials(shift.member.name)}</span><span><strong>{shift.member.name}</strong><small dir="ltr">{shift.member.email}</small></span></div></td><td><span className={`date-chip ${shift.date.slice(0, 10) === todayDate ? "date-today" : ""}`}><CalendarDays size={14} />{shift.date.slice(0, 10) === todayDate ? t(language, "today") : readableDate(shift.date, language, { month: "short", day: "numeric", year: "numeric" })}</span></td><td><span className="role-text">{shift.member.role}</span></td><td><a dir="ltr" className="contact-link" href={`mailto:${shift.member.email}`}><Mail size={14} /> {t(language, "email")}</a></td><td><span className="notes-text">{shift.notes === "Primary on-call" ? t(language, "primaryOnCall") : shift.notes === "Backup rotation" ? t(language, "backupRotation") : shift.notes || "—"}</span></td><td>{shift.canManage === true && <div className="row-actions">{shift.date.slice(0, 10) >= todayDate && <button className="icon-button" onClick={() => setModal(shift)} aria-label={`${t(language, "editShift")} - ${shift.member.name}`} title={t(language, "editShift")}><Pencil size={15} /></button>}<button className="icon-button delete-action" onClick={() => void removeShift(shift)} aria-label={`${t(language, "deleteShift")} - ${shift.member.name}`} title={t(language, "deleteShift")}><Trash2 size={15} /></button></div>}</td></tr>)
                : <tr><td colSpan={6} className="table-empty"><div className="empty-icon"><CalendarDays size={21} /></div><strong>{debouncedSearch ? t(language, "noMatches") : t(language, showPastShifts ? "pastScheduleClear" : "scheduleClear")}</strong><span>{debouncedSearch ? t(language, "tryAnotherSearch") : !showPastShifts && t(language, "startRotation")}</span>{!debouncedSearch && !showPastShifts && <button className="text-button" onClick={() => setModal("new")}><Plus size={15} /> {t(language, "addFirstShift")}</button>}</td></tr>}
            </tbody></table></div>
            <footer className="table-footer"><span>{t(language, "showing")} <strong>{pagination.total === 0 ? 0 : (page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)}</strong> {t(language, "of")} <strong>{pagination.total}</strong> {t(language, "shifts")}</span><div className="pagination"><button className="icon-button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} aria-label={t(language, "previousPage")}><ChevronLeft size={17} /></button><span>{t(language, "page")} <strong>{page}</strong> {t(language, "of")} <strong>{Math.max(pagination.totalPages, 1)}</strong></span><button className="icon-button" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)} aria-label={t(language, "nextPage")}><ChevronRight size={17} /></button></div></footer>
          </section>

          <div className="bottom-summary"><span><Check size={15} /> {t(language, "rosterUpToDate")}</span><span>{t(language, "businessTimeZone")}</span><span>{t(language, "refreshesOnOpen")} <ArrowDownRight size={14} /></span></div>
        </div>}
      </main>

      <button className="accessibility-launcher" type="button" onClick={onOpenAccessibility} aria-label={t(language, "accessibility")} aria-haspopup="dialog" title={t(language, "accessibility")}>
        <Accessibility size={23} strokeWidth={2} aria-hidden="true" />
      </button>

      {modal && <ShiftModal language={language} onLanguageChange={onLanguageChange} isAdmin={user.role === "ADMIN"} members={user.role === "ADMIN" ? members : currentMember ? [currentMember] : []} memberPage={memberPage} memberPagination={memberPagination} memberLoading={memberLoading} onMemberPageChange={setMemberPage} businessDate={todayDate} shift={modal === "new" ? null : modal} busy={busy} onClose={() => setModal(null)} onSave={(draft) => saveShift(draft, modal === "new" ? undefined : modal.id)} />}
      {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
      {supportOpen && user.role !== "ADMIN" && <SupportCenter language={language} onLanguageChange={onLanguageChange} user={user} onClose={onCloseSupport} />}
      {accessibilityOpen && <AccessibilityPanel language={language} onClose={onCloseAccessibility} preferences={accessibility} onChange={setAccessibility} />}
    </div>
  );
}
