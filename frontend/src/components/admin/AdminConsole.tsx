import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, Plus, UserRound, X } from "lucide-react";
import { api, ApiError } from "../../services/api";
import type { ManagedUser, SupportTicket, TeamMember, User } from "../../types";
import { dateLocale, type Language } from "../../utils/i18n";
import { initials, readableDate, t } from "../shared";

export function AdminConsole({ language, user, onClose, onRosterMemberAdded }: {
  language: Language;
  user: User;
  onClose: () => void;
  onRosterMemberAdded: (member: TeamMember) => void;
}) {
  const [activeTab, setActiveTab] = useState<"inbox" | "users">("inbox");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"USER" | "ADMIN">("USER");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? null;

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { tickets: latestTickets } = await api.supportTickets();
      setTickets(latestTickets);
      setSelectedTicketId((current) => current && latestTickets.some((ticket) => ticket.id === current)
        ? current
        : latestTickets[0]?.id ?? null);
      setError("");
    } catch {
      setError(t(language, "requestFailed"));
    } finally {
      setLoading(false);
    }
  }, [language]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { users: latestUsers } = await api.users();
      setUsers(latestUsers);
      setError("");
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 403 ? t(language, "adminOnly") : t(language, "userUpdateFailed"));
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (activeTab === "users") void loadUsers();
  }, [activeTab, loadUsers]);

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket || !reply.trim()) {
      setError(t(language, "messageRequired"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.replyToTicket(selectedTicket.id, reply);
      setReply("");
      await loadTickets();
    } catch {
      setError(t(language, "replyFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(status: SupportTicket["status"]) {
    if (!selectedTicket) return;
    setLoading(true);
    setError("");
    try {
      await api.updateTicketStatus(selectedTicket.id, status);
      await loadTickets();
    } catch {
      setError(t(language, "requestFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (newName.trim().length < 2 || newPassword.length < 12) {
      setError(newPassword.length < 12 ? t(language, "passwordRequirement") : t(language, "fullName"));
      return;
    }
    setLoading(true);
    try {
      const { member } = await api.createUser({ name: newName.trim(), email: newEmail.trim(), password: newPassword, role: newRole });
      onRosterMemberAdded(member);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("USER");
      await loadUsers();
      setNotice(t(language, "userCreated"));
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 409
        ? (language === "he" ? "כבר קיים משתמש עם כתובת הדוא״ל הזו." : "A user with this email already exists.")
        : t(language, "userCreateFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function toggleUser(userToUpdate: ManagedUser) {
    if (userToUpdate.id === user.id) {
      setError(t(language, "cannotDeactivateSelf"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.setUserActive(userToUpdate.id, !userToUpdate.isActive);
      await loadUsers();
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 409
        ? t(language, "lastActiveAdmin")
        : t(language, "userUpdateFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function addUserToRoster(userToAdd: ManagedUser) {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const { member } = await api.addUserToRoster(userToAdd.id);
      onRosterMemberAdded(member);
      setUsers((current) => current.map((managedUser) => managedUser.id === userToAdd.id
        ? { ...managedUser, teamMemberId: member.id }
        : managedUser));
      setNotice(t(language, "userAddedToRoster"));
    } catch {
      setError(t(language, "addToRosterFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-console-screen" lang={language} dir={language === "he" ? "rtl" : "ltr"}>
      <div className="admin-console-heading">
        <div><span className="eyebrow">{t(language, "administrator")}</span><h1>{t(language, "adminWorkspace")}</h1></div>
        <button className="icon-button" onClick={onClose} aria-label={t(language, "close")}><X size={19} /></button>
      </div>
      <nav className="support-tabs admin-console-tabs" aria-label={t(language, "adminWorkspace")}>
        <button className={`support-tab ${activeTab === "inbox" ? "selected" : ""}`} onClick={() => { setActiveTab("inbox"); setError(""); setNotice(""); }}>{t(language, "supportInbox")}{tickets.length > 0 && <span className="support-tab-count">{tickets.length}</span>}</button>
        <button className={`support-tab ${activeTab === "users" ? "selected" : ""}`} onClick={() => { setActiveTab("users"); setError(""); setNotice(""); }}>{t(language, "manageUsers")}</button>
      </nav>
      {error && <div className="alert error-alert support-alert" role="alert">{error}</div>}
      {notice && <div className="alert success-alert support-alert" role="status">{notice}</div>}
      <div className="admin-console-content">
        {activeTab === "inbox" && (
          <div className="ticket-layout">
            <div className="ticket-list">
              {loading && tickets.length === 0 ? <p className="support-empty">{t(language, "loadingSchedule")}</p>
                : tickets.length === 0 ? <p className="support-empty">{t(language, "noInboxRequests")}</p>
                  : tickets.map((ticket) => (
                    <button key={ticket.id} className={`ticket-list-item ${selectedTicketId === ticket.id ? "selected" : ""}`} onClick={() => setSelectedTicketId(ticket.id)}>
                      <strong>{ticket.subject}</strong>
                      <span>{ticket.requester.name || ticket.requester.email}</span>
                      <small><StatusBadge language={language} status={ticket.status} /> {readableDate(ticket.updatedAt, language, { month: "short", day: "numeric" })}</small>
                    </button>
                  ))}
            </div>
            <div className="ticket-thread">
              {!selectedTicket ? <p className="support-empty">{t(language, "noInboxRequests")}</p> : <>
                <div className="ticket-detail-heading">
                  <div><h3>{selectedTicket.subject}</h3><span>{t(language, "requestedBy")}: {selectedTicket.requester.name || selectedTicket.requester.email}</span></div>
                  <select aria-label={t(language, "status")} value={selectedTicket.status} disabled={loading} onChange={(event) => void changeStatus(event.target.value as SupportTicket["status"])}><option value="OPEN">{t(language, "open")}</option><option value="IN_PROGRESS">{t(language, "inProgress")}</option><option value="RESOLVED">{t(language, "resolved")}</option></select>
                </div>
                <div className="ticket-messages">{selectedTicket.messages.map((message) => <article className={`ticket-message ${message.author.id === user.id ? "own-message" : ""}`} key={message.id}><div className="ticket-message-meta"><strong>{message.author.id === user.id ? (language === "he" ? "אני" : "You") : message.author.name || message.author.email}</strong><time>{new Intl.DateTimeFormat(dateLocale(language), { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.createdAt))}</time></div><p>{message.body}</p></article>)}</div>
                {selectedTicket.status !== "RESOLVED" && <form className="ticket-reply-form" onSubmit={(event) => void sendReply(event)}><textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={4000} rows={3} placeholder={t(language, "writeReply")} aria-label={t(language, "writeReply")} required /><button className="button button-primary" disabled={loading}><ArrowUpRight size={15} /> {t(language, "sendReply")}</button></form>}
              </>}
            </div>
          </div>
        )}
        {activeTab === "users" && (
          <div className="users-layout">
            <form className="create-user-form" onSubmit={(event) => void createAccount(event)}>
              <h3>{t(language, "addUser")}</h3>
              <label htmlFor="new-user-name">{t(language, "fullName")}</label><input id="new-user-name" value={newName} onChange={(event) => setNewName(event.target.value)} minLength={2} maxLength={100} required />
              <label htmlFor="new-user-email">{t(language, "emailAddress")}</label><input id="new-user-email" type="email" value={newEmail} onChange={(event) => { event.currentTarget.setCustomValidity(""); setNewEmail(event.target.value); }} onInvalid={(event) => { if (event.currentTarget.validity.typeMismatch) event.currentTarget.setCustomValidity(t(language, "invalidEmail")); }} autoComplete="email" dir="ltr" spellCheck={false} maxLength={254} required />
              <label htmlFor="new-user-password">{t(language, "temporaryPassword")}</label><input id="new-user-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} maxLength={128} required /><small>{t(language, "passwordRequirement")}</small>
              <label htmlFor="new-user-role">{t(language, "accountType")}</label><select id="new-user-role" value={newRole} onChange={(event) => setNewRole(event.target.value as "ADMIN" | "USER")}><option value="USER">{t(language, "regularUser")}</option><option value="ADMIN">{t(language, "administrator")}</option></select>
              <button className="button button-primary" disabled={loading}><UserRound size={15} /> {t(language, "createAccount")}</button>
            </form>
            <div className="managed-user-list">
              <h3>{t(language, "userManagement")} <span>{users.length}</span></h3>
              <p className="managed-user-description">{t(language, "userManagementDescription")}</p>
              {users.length === 0 ? <p className="support-empty">{loading ? t(language, "loadingSchedule") : t(language, "noUsers")}</p> : users.map((managedUser) => (
                <div className="managed-user" key={managedUser.id}>
                  <span className="user-avatar">{initials(managedUser.name || managedUser.email)}</span>
                  <span className="managed-user-info"><strong>{managedUser.name || managedUser.email}</strong><small dir="ltr">{managedUser.email}</small></span>
                  <span className={`managed-user-role ${managedUser.role === "ADMIN" ? "admin-role" : ""}`}>{t(language, managedUser.role === "ADMIN" ? "administrator" : "regularUser")}</span>
                  <div className="managed-user-actions">
                    {managedUser.teamMemberId
                      ? <span className="managed-user-roster-status">{t(language, "alreadyInRoster")}</span>
                      : <button className="button button-secondary user-active-button" disabled={loading || !managedUser.isActive} onClick={() => void addUserToRoster(managedUser)}><Plus size={13} />{t(language, "addUserToRoster")}</button>}
                    <button className="button button-secondary user-active-button" disabled={loading || managedUser.id === user.id} onClick={() => void toggleUser(managedUser)}>{t(language, managedUser.isActive ? "deactivate" : "activate")}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ language, status }: { language: Language; status: SupportTicket["status"] }) {
  const key = status === "OPEN" ? "open" : status === "IN_PROGRESS" ? "inProgress" : "resolved";
  return <span className={`ticket-status status-${status.toLowerCase()}`}>{t(language, key)}</span>;
}
