import { Bell, CalendarDays } from "lucide-react";
import type { Shift } from "../../types";
import type { Language } from "../../utils/i18n";
import { readableDate, t } from "../shared";

export function NotificationPopover({
  language,
  businessDate,
  todayShifts,
  nextShift,
  unread,
  onMarkRead,
  onSelect,
}: {
  language: Language;
  businessDate: string;
  todayShifts: Shift[];
  nextShift: Shift | null;
  unread: boolean;
  onMarkRead: () => void;
  onSelect: (target: ".today-card" | ".schedule-card") => void;
}) {
  const count = todayShifts.length + Number(nextShift !== null);
  return (
    <section
      className="popover-card notifications-popover"
      id="notifications-popover"
      role="dialog"
      aria-label={t(language, "notificationsTitle")}
    >
      <header className="popover-title">
        <div>
          <strong>{t(language, "notificationsTitle")}</strong>
          {count > 0 && <span className="notification-count">{count}</span>}
        </div>
        {unread && (
          <button className="text-button popover-read-button" onClick={onMarkRead}>
            {t(language, "markAllRead")}
          </button>
        )}
      </header>
      {count === 0 ? (
        <p className="notification-empty">{t(language, "noNotifications")}</p>
      ) : (
        <div className="notification-list">
          {todayShifts.map((shift) => (
            <button
              className={`notification-item ${unread ? "unread" : ""}`}
              key={`today-${shift.id}`}
              onClick={() => onSelect(".today-card")}
            >
              <span className="notification-icon"><Bell size={15} /></span>
              <span className="notification-copy">
                <strong>{t(language, "onDutyToday")}</strong>
                <span>{t(language, "todayNotification", { name: shift.member.name })}</span>
                <small>{readableDate(businessDate, language, { weekday: "short", month: "short", day: "numeric" })}</small>
              </span>
              {unread && <i className="unread-dot" />}
            </button>
          ))}
          {nextShift && (
            <button
              className={`notification-item ${unread ? "unread" : ""}`}
              onClick={() => onSelect(".schedule-card")}
            >
              <span className="notification-icon upcoming-icon"><CalendarDays size={15} /></span>
              <span className="notification-copy">
                <strong>{t(language, "upNext")}</strong>
                <span>{t(language, "nextShiftNotification", {
                  name: nextShift.member.name,
                  date: readableDate(nextShift.date, language, { month: "short", day: "numeric" }),
                })}</span>
                <small>{readableDate(nextShift.date, language, { weekday: "short", month: "short", day: "numeric" })}</small>
              </span>
              {unread && <i className="unread-dot" />}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
