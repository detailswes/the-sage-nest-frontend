import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
  startOfWeek as startOfWeekFn,
  endOfWeek,
  addDays,
} from "date-fns";
import { enGB } from "date-fns/locale/en-GB";
import { it as itLocale } from "date-fns/locale/it";
import "react-big-calendar/lib/css/react-big-calendar.css";

import {
  listAvailability,
  addAvailabilitySlot,
  removeAvailabilitySlot,
  checkAvailabilityConflicts,
  getMyProfile,
  updateMyProfile,
} from "../../../api/expertApi";
import {
  listBlockouts,
  createBlockout,
  deleteBlockout,
} from "../../../api/blockoutApi";
import { getCalendarBookings } from "../../../api/bookingApi";

// ─── date-fns localizer ───────────────────────────────────────────────────────
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { "en-GB": enGB, "it": itLocale },
});

// ─── Constants ────────────────────────────────────────────────────────────────
const EMPTY_SLOT_FORM = { day_of_week: "1", start_time: "", end_time: "" };
const EMPTY_BLOCK_FORM = {
  date_from: "",
  date_to: "",
  block_type: "full_day",
  start_time: "",
  end_time: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a "YYYY-MM-DD" date string as LOCAL date — avoids UTC midnight shift */
function parseDateLocal(dateStr) {
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Expand recurring weekly slots into concrete calendar events for a date range */
function expandRecurringSlots(slots, rangeStart, rangeEnd, availLabel = 'Available') {
  const events = [];
  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    const dayOfWeek = cursor.getDay();
    for (const slot of slots) {
      if (slot.day_of_week !== dayOfWeek) continue;
      const [sh, sm] = slot.start_time.split(":").map(Number);
      const [eh, em] = slot.end_time.split(":").map(Number);
      const start = new Date(cursor);
      start.setHours(sh, sm, 0, 0);
      const evEnd = new Date(cursor);
      evEnd.setHours(eh, em, 0, 0);
      events.push({
        id: `slot-${slot.id}-${cursor.toDateString()}`,
        title: availLabel,
        start,
        end: evEnd,
        type: "availability",
        slotId: slot.id,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return events;
}

/** Convert blockout DB records into calendar events */
function blockoutsToEvents(blockouts, blockedLabel = 'Blocked', dayOffLabel = 'Day Off') {
  return blockouts.map((b) => {
    const date = parseDateLocal(b.date);
    let start, end;
    if (!b.start_time) {
      start = new Date(date);
      start.setHours(0, 0, 0, 0);
      end = new Date(date);
      end.setHours(23, 59, 59, 999);
    } else {
      const [sh, sm] = b.start_time.split(":").map(Number);
      const [eh, em] = b.end_time.split(":").map(Number);
      start = new Date(date);
      start.setHours(sh, sm, 0, 0);
      end = new Date(date);
      end.setHours(eh, em, 0, 0);
    }
    return {
      id: `block-${b.id}`,
      title: b.start_time ? blockedLabel : dayOffLabel,
      start,
      end,
      type: "blockout",
      blockId: b.id,
      allDay: !b.start_time,
    };
  });
}

/** Convert booking DB records into calendar events */
function bookingsToEvents(bookings, clientFallback = 'Client', sessionFallback = 'Session') {
  return bookings.map((b) => {
    const start = new Date(b.scheduled_at);
    const end = new Date(start.getTime() + b.duration_minutes * 60 * 1000);
    return {
      id: `booking-${b.id}`,
      title: `${b.parent?.name || clientFallback} · ${b.service?.title || sessionFallback}`,
      start,
      end,
      type: "booking",
      format: b.format,
      bookingId: b.id,
    };
  });
}

/**
 * Remove available-slot time ranges that overlap with occupied ranges.
 * Full-day blockouts wipe the whole day; time-based overlaps trim or split.
 */
function subtractOccupied(availEvents, blockoutEvents, bookingEvents) {
  const occupied = [
    ...blockoutEvents.map((e) => ({ start: e.start, end: e.end, allDay: !!e.allDay })),
    ...bookingEvents.map((e) => ({ start: e.start, end: e.end, allDay: false })),
  ];

  let result = [...availEvents];

  for (const occ of occupied) {
    const next = [];
    for (const avail of result) {
      if (occ.allDay) {
        if (avail.start.toDateString() !== occ.start.toDateString()) {
          next.push(avail);
        }
      } else {
        const overlaps = occ.start < avail.end && occ.end > avail.start;
        if (!overlaps) {
          next.push(avail);
        } else {
          if (avail.start < occ.start) {
            next.push({ ...avail, end: occ.start, id: avail.id + "_pre" });
          }
          if (avail.end > occ.end) {
            next.push({ ...avail, start: occ.end, id: avail.id + "_post" });
          }
        }
      }
    }
    result = next;
  }

  return result;
}

/** Compute the calendar date range for a given view + anchor date */
function getRangeForView(view, date) {
  if (view === "week") {
    return {
      start: startOfWeekFn(date, { weekStartsOn: 1 }),
      end: endOfWeek(date, { weekStartsOn: 1 }),
    };
  }
  if (view === "day") {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    return { start: dayStart, end: dayEnd };
  }
  const mStart = startOfMonth(date);
  const mEnd = endOfMonth(date);
  return {
    start: startOfWeekFn(mStart, { weekStartsOn: 1 }),
    end: endOfWeek(mEnd, { weekStartsOn: 1 }),
  };
}

// ─── Custom toolbar ───────────────────────────────────────────────────────────
const CustomToolbar = ({ label, onNavigate, onView, view }) => {
  const { t } = useTranslation('expertDashboard');
  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onNavigate("PREV")}
          className="p-2 rounded-lg text-gray-500 hover:text-[#445446] hover:bg-[#445446]/10 transition-colors"
          title={t('availability.toolbar.prev')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button
          onClick={() => onNavigate("TODAY")}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-[#E4E7E4] hover:bg-gray-50 transition-colors"
        >
          {t('availability.toolbar.today')}
        </button>
        <button
          onClick={() => onNavigate("NEXT")}
          className="p-2 rounded-lg text-gray-500 hover:text-[#445446] hover:bg-[#445446]/10 transition-colors"
          title={t('availability.toolbar.next')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
        <span className="ml-2 text-sm font-semibold text-[#1F2933]">{label}</span>
      </div>
      <div className="flex rounded-lg border border-[#E4E7E4] overflow-hidden">
        {["day", "week", "month"].map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${
              view === v
                ? "bg-[#445446] text-white"
                : "text-gray-500 hover:bg-gray-50 bg-white"
            }`}
          >
            {t('availability.views.' + v)}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Event style getter ───────────────────────────────────────────────────────
const dayPropGetter = (date) => {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return { style: { backgroundColor: '#f7f8f7' } };
  return {};
};

const eventStyleGetter = (event) => {
  const base = {
    border: "none",
    borderRadius: "5px",
    fontSize: "11px",
    padding: "2px 6px",
    cursor: "default",
  };
  if (event.type === "availability")
    return { style: { ...base, backgroundColor: "#445446", color: "#fff", opacity: 0.85 } };
  if (event.type === "blockout" && event.allDay)
    return { style: { ...base, backgroundColor: "#f97316", color: "#fff" } };
  if (event.type === "blockout")
    return { style: { ...base, backgroundColor: "#ef4444", color: "#fff" } };
  if (event.type === "booking")
    return { style: { ...base, backgroundColor: event.format === "ONLINE" ? "#2563eb" : "#445446", color: "#fff" } };
  return { style: base };
};

// ─── Custom event renderers ───────────────────────────────────────────────────
const fmtTime = (d, lng = 'en') =>
  d.toLocaleTimeString(lng === 'it' ? 'it-IT' : 'en-GB', {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const MonthEventComponent = ({ event }) => {
  const { t, i18n } = useTranslation('expertDashboard');
  const lng = i18n.language;
  if (event.type === "availability") {
    const label = `${fmtTime(event.start, lng)}–${fmtTime(event.end, lng)}`;
    return <span title={`${t('availability.available')} ${label}`}>{label}</span>;
  }
  return <span title={event.title}>{event.title}</span>;
};

const TimeGridEventComponent = ({ event }) => {
  const { t, i18n } = useTranslation('expertDashboard');
  const lng = i18n.language;
  if (event.type === "availability") {
    return (
      <span title={`${t('availability.available')} ${fmtTime(event.start, lng)}–${fmtTime(event.end, lng)}`}>
        {t('availability.available')}
      </span>
    );
  }
  return <span title={event.title}>{event.title}</span>;
};

// ─── Legend ───────────────────────────────────────────────────────────────────
const Legend = () => {
  const { t } = useTranslation('expertDashboard');
  const items = [
    { color: "#445446", label: t('availability.legend.available'),      opacity: 0.85 },
    { color: "#f97316", label: t('availability.legend.dayOff') },
    { color: "#ef4444", label: t('availability.legend.blocked') },
    { color: "#2563eb", label: t('availability.legend.bookedOnline') },
    { color: "#445446", label: t('availability.legend.bookedInPerson'), border: "2px dashed #445446", bg: "transparent" },
  ];
  return (
    <div className="flex items-center gap-4 mb-4 flex-wrap">
      {items.map(({ color, label, opacity, border, bg }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{
              backgroundColor: bg !== undefined ? bg : color,
              opacity: opacity ?? 1,
              border: border ?? "none",
            }}
          />
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── 15-minute time options (06:00 → 22:00) ──────────────────────────────────
const TIME_OPTIONS = [];
for (let h = 6; h < 22; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}
TIME_OPTIONS.push("22:00");

const TimeSelect = ({ value, onChange, hasError }) => {
  const { t } = useTranslation('expertDashboard');
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 rounded-lg border text-sm text-[#1F2933] bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] appearance-none pr-7 ${
          hasError ? "border-red-400" : "border-[#E4E7E4]"
        }`}
      >
        <option value="">{t('availability.weekly.selectTime')}</option>
        {TIME_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <svg
        className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
      </svg>
    </div>
  );
};

// ─── Weekly schedule panel ────────────────────────────────────────────────────

function fmtBookingDate(isoStr, lng = 'en') {
  const d = new Date(isoStr);
  return d.toLocaleString(lng === 'it' ? 'it-IT' : 'en-GB', {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const WeeklySchedulePanel = ({ slots, onAdd, onRemove, removingId, adding, formError }) => {
  const { t, i18n } = useTranslation('expertDashboard');
  const lng = i18n.language;
  const [form, setForm] = useState(EMPTY_SLOT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [pendingRemove, setPendingRemove] = useState(null);

  const handleStartRemove = async (slot) => {
    setPendingRemove({ id: slot.id, checking: true, conflicts: null });
    try {
      const data = await checkAvailabilityConflicts(slot.id);
      setPendingRemove({ id: slot.id, checking: false, conflicts: data.bookings });
    } catch {
      setPendingRemove({ id: slot.id, checking: false, conflicts: [] });
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.start_time) errs.start_time = t('availability.weekly.errors.required');
    if (!form.end_time)   errs.end_time   = t('availability.weekly.errors.required');
    if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      errs.end_time = t('availability.weekly.errors.afterStart');
    } else if (form.start_time && form.end_time) {
      const dayInt = parseInt(form.day_of_week);
      const conflict = slots.find(
        (s) =>
          s.day_of_week === dayInt &&
          form.start_time < s.end_time &&
          form.end_time > s.start_time
      );
      if (conflict) {
        errs.end_time = t('availability.weekly.errors.overlaps', {
          start: conflict.start_time,
          end: conflict.end_time,
        });
      }
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }
    onAdd({
      day_of_week: parseInt(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
    });
    setForm(EMPTY_SLOT_FORM);
    setFormErrors({});
  };

  const slotsByDay = Array.from({ length: 7 }, (_, idx) => ({
    label: t('availability.days.' + idx),
    idx,
    slots: slots.filter((s) => s.day_of_week === idx),
  })).filter(({ slots: ds }) => ds.length > 0);

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5">
      <h3 className="text-sm font-semibold text-[#1F2933] mb-4">
        {t('availability.weekly.title')}
      </h3>

      {formError && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('availability.weekly.dayLabel')}
            </label>
            <div className="relative">
              <select
                value={form.day_of_week}
                onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#E4E7E4] text-sm text-[#1F2933] bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] appearance-none pr-7"
              >
                {Array.from({ length: 7 }, (_, i) => (
                  <option key={i} value={i}>{t('availability.days.' + i)}</option>
                ))}
              </select>
              <svg
                className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('availability.weekly.fromLabel')}
            </label>
            <TimeSelect
              value={form.start_time}
              onChange={(val) => {
                setForm((f) => ({ ...f, start_time: val }));
                setFormErrors((fe) => ({ ...fe, start_time: "" }));
              }}
              hasError={!!formErrors.start_time}
            />
            {formErrors.start_time && (
              <p className="mt-0.5 text-xs text-red-500">{formErrors.start_time}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('availability.weekly.toLabel')}
            </label>
            <TimeSelect
              value={form.end_time}
              onChange={(val) => {
                setForm((f) => ({ ...f, end_time: val }));
                setFormErrors((fe) => ({ ...fe, end_time: "" }));
              }}
              hasError={!!formErrors.end_time}
            />
            {formErrors.end_time && (
              <p className="mt-0.5 text-xs text-red-500">{formErrors.end_time}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={adding}
            className="flex items-center gap-1.5 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 text-white text-xs font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {adding ? (
              <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            )}
            {adding ? t('availability.weekly.addingBtn') : t('availability.weekly.addSlotBtn')}
          </button>
        </div>
      </form>

      {slotsByDay.length > 0 && (
        <div className="mt-4 border-t border-[#E4E7E4] pt-4 space-y-3">
          {slotsByDay.map(({ label, slots: ds }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                {label}
              </p>
              <div className="space-y-1">
                {ds.map((slot) => {
                  const isPending    = pendingRemove?.id === slot.id;
                  const isChecking   = isPending && pendingRemove.checking;
                  const conflicts    = isPending && !isChecking ? pendingRemove.conflicts : null;
                  const hasConflicts = conflicts && conflicts.length > 0;

                  return (
                    <div key={slot.id}>
                      <div className="flex items-center justify-between px-3 py-1.5 bg-[#445446]/5 rounded-lg">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#445446] flex-shrink-0" />
                          <span className="text-xs font-medium text-[#1F2933]">
                            {slot.start_time} – {slot.end_time}
                          </span>
                        </div>

                        {isChecking ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400">{t('availability.weekly.checking')}</span>
                            <div className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
                          </div>
                        ) : isPending ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setPendingRemove(null)}
                              className="text-xs text-gray-500 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
                            >
                              {t('availability.weekly.cancelBtn')}
                            </button>
                            <button
                              onClick={() => { setPendingRemove(null); onRemove(slot.id); }}
                              disabled={removingId === slot.id}
                              className={`text-xs font-medium text-white disabled:opacity-60 px-2 py-0.5 rounded transition-colors ${
                                hasConflicts
                                  ? "bg-amber-600 hover:bg-amber-700"
                                  : "bg-red-500 hover:bg-red-600"
                              }`}
                            >
                              {hasConflicts ? t('availability.weekly.removeAnywayBtn') : t('availability.weekly.removeBtn')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartRemove(slot)}
                            disabled={removingId === slot.id}
                            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors disabled:opacity-40"
                          >
                            {removingId === slot.id ? (
                              <div className="w-3 h-3 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>

                      {hasConflicts && (
                        <div className="mt-1 mb-1 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                          <div className="flex items-start gap-1.5 mb-1.5">
                            <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                            <p className="font-semibold text-amber-800">
                              {t('availability.weekly.conflicts', { count: conflicts.length })}
                            </p>
                          </div>
                          <ul className="space-y-0.5 text-amber-700 ml-5">
                            {conflicts.map((bk) => (
                              <li key={bk.id}>
                                {fmtBookingDate(bk.scheduled_at, lng)} · {bk.parent?.name} · {bk.service?.title}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-1.5 ml-5 text-amber-600">
                            {t('availability.weekly.conflictNote')}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Block-out panel ──────────────────────────────────────────────────────────
const BlockoutPanel = ({
  blockouts,
  slots,
  onCreate,
  onDelete,
  deletingId,
  creating,
  createError,
  createInfo,
}) => {
  const { t, i18n } = useTranslation('expertDashboard');
  const lng = i18n.language;
  const [form, setForm] = useState(EMPTY_BLOCK_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [confirmRestoreId, setConfirmRestoreId] = useState(null);

  const noAvailabilityWarning = useMemo(() => {
    if (form.block_type !== "time_slot" || !form.date_from || form.date_from !== form.date_to) return "";
    const [y, m, d] = form.date_from.split("-").map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const hasSlots = slots.some((s) => s.day_of_week === dayOfWeek);
    if (hasSlots) return "";
    return t('availability.blockout.noAvailWarning', { day: t('availability.days.' + dayOfWeek) });
  }, [form.date_from, form.date_to, form.block_type, slots, t]);

  const inputClass = (hasErr) =>
    `w-full px-3 py-2 rounded-lg border text-sm text-[#1F2933] bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
      hasErr ? "border-red-400" : "border-[#E4E7E4]"
    }`;

  const validate = () => {
    const errs = {};
    if (!form.date_from) errs.date_from = t('availability.blockout.errors.required');
    if (!form.date_to)   errs.date_to   = t('availability.blockout.errors.required');
    if (form.date_from && form.date_to && form.date_from > form.date_to)
      errs.date_to = t('availability.blockout.errors.afterStartDate');
    if (form.block_type === "time_slot") {
      if (!form.start_time) errs.start_time = t('availability.blockout.errors.required');
      if (!form.end_time)   errs.end_time   = t('availability.blockout.errors.required');
      if (form.start_time && form.end_time && form.start_time >= form.end_time)
        errs.end_time = t('availability.blockout.errors.afterStart');
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }
    const payload = { date_from: form.date_from, date_to: form.date_to };
    if (form.block_type === "time_slot") {
      payload.start_time = form.start_time;
      payload.end_time = form.end_time;
    }
    onCreate(payload);
    setForm(EMPTY_BLOCK_FORM);
    setFormErrors({});
  };

  const formatBlockDate = (isoDate) => {
    const d = parseDateLocal(isoDate);
    return d.toLocaleDateString(lng === 'it' ? 'it-IT' : 'en-GB', {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const sortedBlockouts = [...blockouts].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5">
      <h3 className="text-sm font-semibold text-[#1F2933] mb-1">
        {t('availability.blockout.title')}
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        {t('availability.blockout.subtitle')}
      </p>

      {createError && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {createError}
        </div>
      )}

      {createInfo && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          {createInfo}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('availability.blockout.fromLabel')}
            </label>
            <input
              type="date"
              value={form.date_from}
              onChange={(e) => {
                const val = e.target.value;
                setForm((f) => ({
                  ...f,
                  date_from: val,
                  date_to: f.date_to && f.date_to < val ? val : f.date_to,
                }));
                setFormErrors((fe) => ({ ...fe, date_from: "", date_to: "" }));
              }}
              className={inputClass(!!formErrors.date_from)}
              min={new Date().toISOString().split("T")[0]}
            />
            {formErrors.date_from && (
              <p className="mt-0.5 text-xs text-red-500">{formErrors.date_from}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('availability.blockout.toLabel')}
            </label>
            <input
              type="date"
              value={form.date_to}
              onChange={(e) => {
                setForm((f) => ({ ...f, date_to: e.target.value }));
                setFormErrors((fe) => ({ ...fe, date_to: "" }));
              }}
              className={inputClass(!!formErrors.date_to)}
              min={form.date_from || new Date().toISOString().split("T")[0]}
            />
            {formErrors.date_to && (
              <p className="mt-0.5 text-xs text-red-500">{formErrors.date_to}</p>
            )}
          </div>
        </div>

        {noAvailabilityWarning && (
          <p className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            {noAvailabilityWarning}
          </p>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t('availability.blockout.blockTypeLabel')}
          </label>
          <div className="flex rounded-lg border border-[#E4E7E4] overflow-hidden">
            {[
              { value: "full_day",  label: t('availability.blockout.fullDayBtn') },
              { value: "time_slot", label: t('availability.blockout.timeSlotBtn') },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, block_type: value, start_time: "", end_time: "" }))}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  form.block_type === value
                    ? "bg-[#445446] text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {form.block_type === "time_slot" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('availability.blockout.fromLabel')}
              </label>
              <TimeSelect
                value={form.start_time}
                onChange={(val) => {
                  setForm((f) => ({ ...f, start_time: val }));
                  setFormErrors((fe) => ({ ...fe, start_time: "" }));
                }}
                hasError={!!formErrors.start_time}
              />
              {formErrors.start_time && (
                <p className="mt-0.5 text-xs text-red-500">{formErrors.start_time}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('availability.blockout.toLabel')}
              </label>
              <TimeSelect
                value={form.end_time}
                onChange={(val) => {
                  setForm((f) => ({ ...f, end_time: val }));
                  setFormErrors((fe) => ({ ...fe, end_time: "" }));
                }}
                hasError={!!formErrors.end_time}
              />
              {formErrors.end_time && (
                <p className="mt-0.5 text-xs text-red-500">{formErrors.end_time}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-xs font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {creating && (
              <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            {creating ? t('availability.blockout.blockingBtn') : t('availability.blockout.blockDatesBtn')}
          </button>
        </div>
      </form>

      {sortedBlockouts.length > 0 && (
        <div className="mt-4 border-t border-[#E4E7E4] pt-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {t('availability.blockout.activeTitle')}
          </p>
          {sortedBlockouts.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg border border-red-100"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#1F2933] truncate">
                  {formatBlockDate(b.date)}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {b.start_time
                    ? `${b.start_time} – ${b.end_time}`
                    : t('availability.blockout.fullDayLabel')}
                </p>
              </div>
              {confirmRestoreId === b.id ? (
                <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                  <button
                    onClick={() => setConfirmRestoreId(null)}
                    className="text-xs text-gray-500 px-1.5 py-0.5 rounded hover:bg-red-100 transition-colors"
                  >
                    {t('availability.blockout.cancelBtn')}
                  </button>
                  <button
                    onClick={() => { setConfirmRestoreId(null); onDelete(b.id); }}
                    disabled={deletingId === b.id}
                    className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-2 py-0.5 rounded transition-colors"
                  >
                    {t('availability.blockout.restoreBtn')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmRestoreId(b.id)}
                  disabled={deletingId === b.id}
                  title={t('availability.blockout.restoreTitle')}
                  className="ml-3 flex-shrink-0 text-xs font-medium text-red-500 hover:text-red-700 underline underline-offset-2 transition-colors disabled:opacity-40"
                >
                  {deletingId === b.id ? t('availability.blockout.restoringBtn') : t('availability.blockout.restoreBtn')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const AvailabilitySection = () => {
  const { t, i18n } = useTranslation('expertDashboard');
  const lng = i18n.language;

  const [view, setView] = useState("week");
  const [date, setDate] = useState(new Date());
  const [range, setRange] = useState(() => getRangeForView("week", new Date()));

  const [slots,       setSlots]       = useState([]);
  const [blockouts,   setBlockouts]   = useState([]);
  const [calBookings, setCalBookings] = useState([]);

  const [loadingInit, setLoadingInit] = useState(true);
  const [initError,   setInitError]   = useState('');
  const [expertTz,    setExpertTz]    = useState("");

  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [savingBuffer,  setSavingBuffer]  = useState(false);
  const [bufferSaved,   setBufferSaved]   = useState(false);
  const [bufferError,   setBufferError]   = useState("");

  const [advanceDays,   setAdvanceDays]   = useState(60);
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [advanceSaved,  setAdvanceSaved]  = useState(false);
  const [advanceError,  setAdvanceError]  = useState("");

  const [noticeHours,  setNoticeHours]  = useState(24);
  const [savingNotice, setSavingNotice] = useState(false);
  const [noticeSaved,  setNoticeSaved]  = useState(false);
  const [noticeError,  setNoticeError]  = useState("");

  const [addingSlot,  setAddingSlot]  = useState(false);
  const [removingId,  setRemovingId]  = useState(null);
  const [slotError,   setSlotError]   = useState("");

  const [creatingBlock, setCreatingBlock] = useState(false);
  const [deletingBlock, setDeletingBlock] = useState(null);
  const [blockError,    setBlockError]    = useState("");
  const [blockInfo,     setBlockInfo]     = useState("");

  // ── Suppress overflow indicators on off-range (prior/next month) cells ───────
  const viewedDateRef = useRef(date);
  useEffect(() => { viewedDateRef.current = date; }, [date]);

  const ShowMoreComponent = useMemo(() => {
    const ref = viewedDateRef;
    return function ShowMore({ slotDate, count }) {
      const isOffRange =
        slotDate.getMonth() !== ref.current.getMonth() ||
        slotDate.getFullYear() !== ref.current.getFullYear();
      if (isOffRange) return null;
      return (
        <button type="button" className="rbc-button-link rbc-show-more">
          +{count} more
        </button>
      );
    };
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const initialRange = getRangeForView("week", new Date());
    Promise.all([
      listAvailability(),
      listBlockouts(initialRange.start.toISOString(), initialRange.end.toISOString()),
      getCalendarBookings(initialRange.start.toISOString(), initialRange.end.toISOString()),
      getMyProfile(),
    ])
      .then(([s, b, bk, profile]) => {
        setSlots(s);
        setBlockouts(b);
        setCalBookings(bk);
        setExpertTz(profile?.timezone || "");
        setBufferMinutes(profile?.buffer_minutes ?? 0);
        setAdvanceDays(profile?.advance_booking_days ?? 60);
        setNoticeHours(profile?.min_notice_hours ?? 24);
      })
      .catch(() => setInitError('availability.loadFailed'))
      .finally(() => setLoadingInit(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refresh blockouts + bookings when range changes ───────────────────────────
  const refreshRangeData = useCallback(async (newRange) => {
    try {
      const [b, bk] = await Promise.all([
        listBlockouts(newRange.start.toISOString(), newRange.end.toISOString()),
        getCalendarBookings(newRange.start.toISOString(), newRange.end.toISOString()),
      ]);
      setBlockouts(b);
      setCalBookings(bk);
    } catch {
      /* non-critical */
    }
  }, []);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const handleNavigate = useCallback(
    (action) => {
      let newDate;
      if (action === "TODAY") {
        newDate = new Date();
      } else if (action === "PREV") {
        newDate = view === "week"
          ? addDays(date, -7)
          : new Date(date.getFullYear(), date.getMonth() - 1, 1);
      } else if (action === "NEXT") {
        newDate = view === "week"
          ? addDays(date, 7)
          : new Date(date.getFullYear(), date.getMonth() + 1, 1);
      } else {
        newDate = action;
      }
      setDate(newDate);
      const newRange = getRangeForView(view, newDate);
      setRange(newRange);
      refreshRangeData(newRange);
    },
    [view, date, refreshRangeData]
  );

  const handleViewChange = useCallback(
    (newView) => {
      setView(newView);
      const newRange = getRangeForView(newView, date);
      setRange(newRange);
      refreshRangeData(newRange);
    },
    [date, refreshRangeData]
  );

  const handleRangeChange = useCallback(
    (newRange) => {
      let start, end;
      if (Array.isArray(newRange)) {
        start = newRange[0];
        end = addDays(newRange[newRange.length - 1], 1);
      } else {
        start = newRange.start;
        end = newRange.end;
      }
      const r = { start, end };
      setRange(r);
      refreshRangeData(r);
    },
    [refreshRangeData]
  );

  // ── Initial scroll position ───────────────────────────────────────────────────
  const scrollToTime = useMemo(() => {
    if (slots.length === 0) return new Date(0, 0, 0, 6, 0);
    const earliest = slots.reduce(
      (min, s) => (s.start_time < min ? s.start_time : min),
      slots[0].start_time
    );
    const [h, m] = earliest.split(":").map(Number);
    const totalMins = Math.max(6 * 60, h * 60 + m - 30);
    return new Date(0, 0, 0, Math.floor(totalMins / 60), totalMins % 60);
  }, [slots]);

  // ── Build merged event list ───────────────────────────────────────────────────
  const events = useMemo(() => {
    const blockoutEvs  = blockoutsToEvents(blockouts, t('availability.blocked'), t('availability.dayOff'));
    const bookingEvs   = bookingsToEvents(calBookings, t('availability.clientFallback'), t('availability.sessionFallback'));
    const rawAvailEvs  = expandRecurringSlots(slots, range.start, range.end, t('availability.available'));
    const cleanAvailEvs = subtractOccupied(rawAvailEvs, blockoutEvs, bookingEvs);
    return [...cleanAvailEvs, ...blockoutEvs, ...bookingEvs];
  }, [slots, blockouts, calBookings, range, t]);

  // ── Slot handlers ─────────────────────────────────────────────────────────────
  const handleAddSlot = async (data) => {
    setAddingSlot(true);
    setSlotError("");
    try {
      const created = await addAvailabilitySlot(data);
      setSlots((prev) =>
        [...prev, created].sort(
          (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
        )
      );
    } catch (err) {
      setSlotError(err?.response?.data?.error || t('availability.weekly.addFailed'));
    } finally {
      setAddingSlot(false);
    }
  };

  const handleRemoveSlot = async (id) => {
    setRemovingId(id);
    try {
      await removeAvailabilitySlot(id);
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setSlotError(t('availability.weekly.removeFailed'));
    } finally {
      setRemovingId(null);
    }
  };

  // ── Blockout handlers ─────────────────────────────────────────────────────────
  const handleCreateBlockout = async (data) => {
    setCreatingBlock(true);
    setBlockError("");
    setBlockInfo("");
    try {
      const { blockouts: newBlockouts, removedCount, skipped } = await createBlockout(data);

      if (newBlockouts.length === 0) {
        setBlockError(
          skipped > 0
            ? t('availability.blockout.info.noneCreatedSkipped', { count: skipped })
            : t('availability.blockout.info.noneCreated')
        );
      } else {
        setBlockouts((prev) => {
          if (removedCount > 0) {
            const newDates = new Set(newBlockouts.map((b) => new Date(b.date).toDateString()));
            return [
              ...prev.filter((b) => !(b.start_time && newDates.has(new Date(b.date).toDateString()))),
              ...newBlockouts,
            ];
          }
          return [...prev, ...newBlockouts];
        });

        const parts = [];
        if (removedCount > 0)
          parts.push(t('availability.blockout.info.removedBlocks', { count: removedCount }));
        if (skipped > 0)
          parts.push(t('availability.blockout.info.skippedDays', { count: skipped }));
        if (parts.length) setBlockInfo(parts.join(" · ") + ".");
      }
    } catch (err) {
      setBlockError(err?.response?.data?.error || t('availability.blockout.errors.createFailed'));
    } finally {
      setCreatingBlock(false);
    }
  };

  const handleDeleteBlockout = async (id) => {
    setDeletingBlock(id);
    try {
      await deleteBlockout(id);
      setBlockouts((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setBlockError(t('availability.blockout.errors.restoreFailed'));
    } finally {
      setDeletingBlock(null);
    }
  };

  // ── Buffer save handler ───────────────────────────────────────────────────────
  const handleSaveBuffer = async (value) => {
    setSavingBuffer(true);
    setBufferError("");
    setBufferSaved(false);
    try {
      await updateMyProfile({ buffer_minutes: value });
      setBufferMinutes(value);
      setBufferSaved(true);
      setTimeout(() => setBufferSaved(false), 3000);
    } catch {
      setBufferError(t('availability.buffer.saveFailed'));
    } finally {
      setSavingBuffer(false);
    }
  };

  // ── Advance booking limit save handler ────────────────────────────────────────
  const handleSaveAdvance = async (value) => {
    setSavingAdvance(true);
    setAdvanceError("");
    setAdvanceSaved(false);
    try {
      await updateMyProfile({ advance_booking_days: value });
      setAdvanceDays(value);
      setAdvanceSaved(true);
      setTimeout(() => setAdvanceSaved(false), 3000);
    } catch {
      setAdvanceError(t('availability.advance.saveFailed'));
    } finally {
      setSavingAdvance(false);
    }
  };

  // ── Minimum notice period save handler ────────────────────────────────────────
  const handleSaveNotice = async (value) => {
    setSavingNotice(true);
    setNoticeError("");
    setNoticeSaved(false);
    try {
      await updateMyProfile({ min_notice_hours: value });
      setNoticeHours(value);
      setNoticeSaved(true);
      setTimeout(() => setNoticeSaved(false), 3000);
    } catch {
      setNoticeError(t('availability.notice.saveFailed'));
    } finally {
      setSavingNotice(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  const dateFnsLocale = lng === 'it' ? itLocale : enGB;
  const calendarLabel =
    view === "week"
      ? format(range.start, "MMM d", { locale: dateFnsLocale }) + " – " + format(range.end, "MMM d, yyyy", { locale: dateFnsLocale })
      : format(date, "MMMM yyyy", { locale: dateFnsLocale });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#1F2933]">{t('availability.heading')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('availability.subheading')}</p>
      </div>

      {initError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {t(initError)}
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5 mb-5">
        <Legend />
        <CustomToolbar
          label={calendarLabel}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          view={view}
        />
        <div style={{ height: view === "week" ? 560 : 500 }}>
          <Calendar
            localizer={localizer}
            culture={lng === 'it' ? 'it' : 'en-GB'}
            events={events}
            view={view}
            views={['day', 'week', 'month']}
            date={date}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            onRangeChange={handleRangeChange}
            dayPropGetter={dayPropGetter}
            eventPropGetter={eventStyleGetter}
            components={{
              toolbar: () => null,
              month: { event: MonthEventComponent },
              week:  { event: TimeGridEventComponent },
              day:   { event: TimeGridEventComponent },
              showMore: ShowMoreComponent,
            }}
            step={30}
            timeslots={2}
            min={new Date(0, 0, 0, 6, 0)}
            max={new Date(0, 0, 0, 22, 30)}
            scrollToTime={scrollToTime}
            showMultiDayTimes
            popup
          />
        </div>
      </div>

      {/* Timezone notice */}
      {expertTz ? (
        <div className="mb-4 px-4 py-3 bg-[#F5F7F5] border border-[#E4E7E4] rounded-lg text-sm text-gray-600">
          {t('availability.timezone.setPre')}{" "}
          <span className="font-semibold text-[#1F2933]">{expertTz}</span>
        </div>
      ) : (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>{t('availability.timezone.notSetBold')}</strong>{" "}
          {t('availability.timezone.notSetBody')}{" "}
          <a href="/dashboard/expert/profile" className="underline font-medium">
            {t('availability.timezone.profileLink')}
          </a>{" "}
          {t('availability.timezone.notSetSuf')}
        </div>
      )}

      {/* Buffer Between Sessions */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5 mb-5">
        <h3 className="text-sm font-semibold text-[#1F2933] mb-1">
          {t('availability.buffer.title')}
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          {t('availability.buffer.description')}
        </p>

        {bufferError && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {bufferError}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {[0, 15, 30, 45, 60].map((mins) => (
            <button
              key={mins}
              type="button"
              disabled={savingBuffer}
              onClick={() => handleSaveBuffer(mins)}
              className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                bufferMinutes === mins
                  ? "bg-[#445446] text-white border-[#445446]"
                  : "bg-white text-gray-600 border-[#E4E7E4] hover:bg-gray-50"
              }`}
            >
              {mins === 0 ? t('availability.buffer.noBuffer') : t('availability.buffer.minLabel', { count: mins })}
            </button>
          ))}

          {savingBuffer && (
            <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin ml-1" />
          )}
          {bufferSaved && (
            <span className="text-xs text-[#445446] font-medium ml-1">
              {t('availability.buffer.saved')}
            </span>
          )}
        </div>
      </div>

      {/* Advance Booking Limit */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5 mb-5">
        <h3 className="text-sm font-semibold text-[#1F2933] mb-1">
          {t('availability.advance.title')}
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          {t('availability.advance.description')}
        </p>

        {advanceError && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {advanceError}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {[14, 30, 60, 90].map((days) => (
            <button
              key={days}
              type="button"
              disabled={savingAdvance}
              onClick={() => handleSaveAdvance(days)}
              className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                advanceDays === days
                  ? "bg-[#445446] text-white border-[#445446]"
                  : "bg-white text-gray-600 border-[#E4E7E4] hover:bg-gray-50"
              }`}
            >
              {t('availability.advance.daysLabel', { count: days })}
            </button>
          ))}

          {savingAdvance && (
            <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin ml-1" />
          )}
          {advanceSaved && (
            <span className="text-xs text-[#445446] font-medium ml-1">
              {t('availability.advance.saved')}
            </span>
          )}
        </div>
      </div>

      {/* Minimum Notice Period */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5 mb-5">
        <h3 className="text-sm font-semibold text-[#1F2933] mb-1">
          {t('availability.notice.title')}
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          {t('availability.notice.description')}
        </p>

        {noticeError && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {noticeError}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {[12, 24, 48, 72].map((hours) => (
            <button
              key={hours}
              type="button"
              disabled={savingNotice}
              onClick={() => handleSaveNotice(hours)}
              className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                noticeHours === hours
                  ? "bg-[#445446] text-white border-[#445446]"
                  : "bg-white text-gray-600 border-[#E4E7E4] hover:bg-gray-50"
              }`}
            >
              {t('availability.notice.hoursLabel', { count: hours })}
            </button>
          ))}

          {savingNotice && (
            <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin ml-1" />
          )}
          {noticeSaved && (
            <span className="text-xs text-[#445446] font-medium ml-1">
              {t('availability.notice.saved')}
            </span>
          )}
        </div>

        {noticeHours === 12 && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p>
              <span className="font-semibold">{t('availability.notice.warning12hBold')}</span>{" "}
              {t('availability.notice.warning12hBody')}
            </p>
          </div>
        )}
      </div>

      {/* Settings panels */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <WeeklySchedulePanel
          slots={slots}
          onAdd={handleAddSlot}
          onRemove={handleRemoveSlot}
          removingId={removingId}
          adding={addingSlot}
          formError={slotError}
        />
        <BlockoutPanel
          blockouts={blockouts}
          slots={slots}
          onCreate={handleCreateBlockout}
          onDelete={handleDeleteBlockout}
          deletingId={deletingBlock}
          creating={creatingBlock}
          createError={blockError}
          createInfo={blockInfo}
        />
      </div>
    </div>
  );
};

export default AvailabilitySection;
