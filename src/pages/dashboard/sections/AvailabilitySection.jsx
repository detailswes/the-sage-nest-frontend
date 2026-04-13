import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import "react-big-calendar/lib/css/react-big-calendar.css";

import {
  listAvailability,
  addAvailabilitySlot,
  removeAvailabilitySlot,
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
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  getDay,
  locales: { "en-GB": enGB },
});

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const EMPTY_SLOT_FORM = { day_of_week: "1", start_time: "", end_time: "" };
const EMPTY_BLOCK_FORM = {
  date: "",
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
function expandRecurringSlots(slots, rangeStart, rangeEnd) {
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
        title: "Available",
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
function blockoutsToEvents(blockouts) {
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
      title: b.start_time ? "Blocked" : "Day Off",
      start,
      end,
      type: "blockout",
      blockId: b.id,
      allDay: !b.start_time,
    };
  });
}

/** Convert booking DB records into calendar events */
function bookingsToEvents(bookings) {
  return bookings.map((b) => {
    const start = new Date(b.scheduled_at);
    const end = new Date(start.getTime() + b.duration_minutes * 60 * 1000);
    return {
      id: `booking-${b.id}`,
      title: `${b.parent?.name || "Client"} · ${b.service?.title || "Session"}`,
      start,
      end,
      type: "booking",
      format: b.format,         // ONLINE | IN_PERSON — drives colour
      bookingId: b.id,
    };
  });
}

/**
 * Remove available-slot time ranges that overlap with occupied ranges
 * (bookings / blockouts). Full-day blockouts wipe the whole day;
 * time-based overlaps trim or split the available slot around the window.
 */
function subtractOccupied(availEvents, blockoutEvents, bookingEvents) {
  const occupied = [
    ...blockoutEvents.map((e) => ({
      start: e.start,
      end: e.end,
      allDay: !!e.allDay,
    })),
    ...bookingEvents.map((e) => ({
      start: e.start,
      end: e.end,
      allDay: false,
    })),
  ];

  let result = [...availEvents];

  for (const occ of occupied) {
    const next = [];
    for (const avail of result) {
      if (occ.allDay) {
        // Full-day blockout: drop every availability slot on that date
        if (avail.start.toDateString() !== occ.start.toDateString()) {
          next.push(avail);
        }
      } else {
        const overlaps = occ.start < avail.end && occ.end > avail.start;
        if (!overlaps) {
          next.push(avail);
        } else {
          // Keep the portion before the occupied window
          if (avail.start < occ.start) {
            next.push({ ...avail, end: occ.start, id: avail.id + "_pre" });
          }
          // Keep the portion after the occupied window
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
const CustomToolbar = ({ label, onNavigate, onView, view }) => (
  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
    <div className="flex items-center gap-1">
      <button
        onClick={() => onNavigate("PREV")}
        className="p-2 rounded-lg text-gray-500 hover:text-[#445446] hover:bg-[#445446]/10 transition-colors"
        title="Previous"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5 8.25 12l7.5-7.5"
          />
        </svg>
      </button>
      <button
        onClick={() => onNavigate("TODAY")}
        className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-[#E4E7E4] hover:bg-gray-50 transition-colors"
      >
        Today
      </button>
      <button
        onClick={() => onNavigate("NEXT")}
        className="p-2 rounded-lg text-gray-500 hover:text-[#445446] hover:bg-[#445446]/10 transition-colors"
        title="Next"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.25 4.5 7.5 7.5-7.5 7.5"
          />
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
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  </div>
);

// ─── Event style getter ───────────────────────────────────────────────────────
const eventStyleGetter = (event) => {
  const base = {
    border: "none",
    borderRadius: "5px",
    fontSize: "11px",
    padding: "2px 6px",
    cursor: "default",
  };
  if (event.type === "availability")
    return {
      style: {
        ...base,
        backgroundColor: "#445446",
        color: "#fff",
        opacity: 0.85,
      },
    };
  if (event.type === "blockout" && event.allDay)
    return { style: { ...base, backgroundColor: "#f97316", color: "#fff" } }; // Day Off – orange
  if (event.type === "blockout")
    return { style: { ...base, backgroundColor: "#ef4444", color: "#fff" } }; // Blocked – red
  if (event.type === "booking")
    return {
      style: {
        ...base,
        backgroundColor: event.format === "ONLINE" ? "#2563eb" : "#445446",
        color: "#fff",
      },
    };
  return { style: base };
};

// ─── Custom event renderers ───────────────────────────────────────────────────
// Month view has no time axis so we show the actual time range inside the event.
// Week/day views already position events on the time grid — just show the label.
const fmtTime = (d) =>
  d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

// Used in month view — show HH:MM–HH:MM for availability slots
const MonthEventComponent = ({ event }) => {
  if (event.type === "availability") {
    const label = `${fmtTime(event.start)}–${fmtTime(event.end)}`;
    return <span title={`Available ${label}`}>{label}</span>;
  }
  return <span title={event.title}>{event.title}</span>;
};

// Used in week/day views — position on grid is self-explanatory, just show label
const TimeGridEventComponent = ({ event }) => {
  if (event.type === "availability") {
    return <span title={`Available ${fmtTime(event.start)}–${fmtTime(event.end)}`}>Available</span>;
  }
  return <span title={event.title}>{event.title}</span>;
};

// ─── Legend ───────────────────────────────────────────────────────────────────
const Legend = () => (
  <div className="flex items-center gap-4 mb-4 flex-wrap">
    {[
      { color: "#445446", label: "Available",           opacity: 0.85 },
      { color: "#f97316", label: "Day Off" },
      { color: "#ef4444", label: "Blocked" },
      { color: "#2563eb", label: "Booked (Online)" },
      { color: "#445446", label: "Booked (In-Person)",  border: "2px dashed #445446", bg: "transparent" },
    ].map(({ color, label, opacity, border, bg }) => (
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

/// ─── 15-minute time options (06:00 → 23:45) ──────────────────────────────────
const TIME_OPTIONS = [];
for (let h = 6; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }
}

// Dropdown restricted to 15-minute increments — prevents non-standard times
const TimeSelect = ({ value, onChange, hasError }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 rounded-lg border text-sm text-[#1F2933] bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] appearance-none pr-7 ${
        hasError ? "border-red-400" : "border-[#E4E7E4]"
      }`}
    >
      <option value="">— select —</option>
      {TIME_OPTIONS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
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

// ─── Weekly schedule panel ────────────────────────────────────────────────────
const WeeklySchedulePanel = ({
  slots,
  onAdd,
  onRemove,
  removingId,
  adding,
  formError,
}) => {
  const [form, setForm] = useState(EMPTY_SLOT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  const validate = () => {
    const errs = {};
    if (!form.start_time) errs.start_time = "Required";
    if (!form.end_time) errs.end_time = "Required";
    if (form.start_time && form.end_time && form.start_time >= form.end_time)
      errs.end_time = "Must be after start";
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

  const slotsByDay = DAYS.reduce((acc, label, idx) => {
    const daySlots = slots.filter((s) => s.day_of_week === idx);
    if (daySlots.length) acc.push({ label, idx, slots: daySlots });
    return acc;
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5">
      <h3 className="text-sm font-semibold text-[#1F2933] mb-4">
        Weekly Schedule
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
              Day
            </label>
            <div className="relative">
              <select
                value={form.day_of_week}
                onChange={(e) =>
                  setForm((f) => ({ ...f, day_of_week: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#E4E7E4] text-sm text-[#1F2933] bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] appearance-none pr-7"
              >
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19 9-7 7-7-7"
                />
              </svg>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              From
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
              <p className="mt-0.5 text-xs text-red-500">
                {formErrors.start_time}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              To
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
              <p className="mt-0.5 text-xs text-red-500">
                {formErrors.end_time}
              </p>
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
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            )}
            {adding ? "Adding…" : "Add Slot"}
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
                {ds.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between px-3 py-1.5 bg-[#445446]/5 rounded-lg"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#445446] flex-shrink-0" />
                      <span className="text-xs font-medium text-[#1F2933]">
                        {slot.start_time} – {slot.end_time}
                      </span>
                    </div>
                    {confirmRemoveId === slot.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setConfirmRemoveId(null)}
                          className="text-xs text-gray-500 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setConfirmRemoveId(null);
                            onRemove(slot.id);
                          }}
                          disabled={removingId === slot.id}
                          className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-2 py-0.5 rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveId(slot.id)}
                        disabled={removingId === slot.id}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors disabled:opacity-40"
                      >
                        {removingId === slot.id ? (
                          <div className="w-3 h-3 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                        ) : (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18 18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Block-out panel ──────────────────────────────────────────────────────────
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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
  const [form, setForm] = useState(EMPTY_BLOCK_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [confirmRestoreId, setConfirmRestoreId] = useState(null);

  // Inline warning: time-slot block on a day with no weekly availability
  const noAvailabilityWarning = useMemo(() => {
    if (form.block_type !== "time_slot" || !form.date) return "";
    const [y, m, d] = form.date.split("-").map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay(); // local date — no UTC shift
    const hasSlots = slots.some((s) => s.day_of_week === dayOfWeek);
    if (hasSlots) return "";
    return `You have no availability set for ${DAY_NAMES[dayOfWeek]}s. This block will be rejected — add ${DAY_NAMES[dayOfWeek]} availability to your Weekly Schedule first, or use a Full Day block instead.`;
  }, [form.date, form.block_type, slots]);

  const inputClass = (hasErr) =>
    `w-full px-3 py-2 rounded-lg border text-sm text-[#1F2933] bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
      hasErr ? "border-red-400" : "border-[#E4E7E4]"
    }`;

  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = "Required";
    if (form.block_type === "time_slot") {
      if (!form.start_time) errs.start_time = "Required";
      if (!form.end_time) errs.end_time = "Required";
      if (form.start_time && form.end_time && form.start_time >= form.end_time)
        errs.end_time = "Must be after start";
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
    const payload = { date: form.date };
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
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const sortedBlockouts = [...blockouts].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5">
      <h3 className="text-sm font-semibold text-[#1F2933] mb-1">
        Block Out Dates
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        One-off blocks — your recurring schedule is never changed.
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
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Date
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => {
              setForm((f) => ({ ...f, date: e.target.value }));
              setFormErrors((fe) => ({ ...fe, date: "" }));
            }}
            className={inputClass(!!formErrors.date)}
            min={new Date().toISOString().split("T")[0]}
          />
          {formErrors.date && (
            <p className="mt-0.5 text-xs text-red-500">{formErrors.date}</p>
          )}
          {noAvailabilityWarning && (
            <p className="mt-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              {noAvailabilityWarning}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Block type
          </label>
          <div className="flex rounded-lg border border-[#E4E7E4] overflow-hidden">
            {[
              { value: "full_day", label: "Full Day" },
              { value: "time_slot", label: "Time Slot" },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    block_type: value,
                    start_time: "",
                    end_time: "",
                  }))
                }
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
                From
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
                <p className="mt-0.5 text-xs text-red-500">
                  {formErrors.start_time}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                To
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
                <p className="mt-0.5 text-xs text-red-500">
                  {formErrors.end_time}
                </p>
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
            {creating ? "Blocking…" : "Block Date"}
          </button>
        </div>
      </form>

      {sortedBlockouts.length > 0 && (
        <div className="mt-4 border-t border-[#E4E7E4] pt-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Active Block Outs
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
                    : "Full day"}
                </p>
              </div>
              {confirmRestoreId === b.id ? (
                <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                  <button
                    onClick={() => setConfirmRestoreId(null)}
                    className="text-xs text-gray-500 px-1.5 py-0.5 rounded hover:bg-red-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setConfirmRestoreId(null);
                      onDelete(b.id);
                    }}
                    disabled={deletingId === b.id}
                    className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-2 py-0.5 rounded transition-colors"
                  >
                    Restore
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmRestoreId(b.id)}
                  disabled={deletingId === b.id}
                  title="Restore this slot"
                  className="ml-3 flex-shrink-0 text-xs font-medium text-red-500 hover:text-red-700 underline underline-offset-2 transition-colors disabled:opacity-40"
                >
                  {deletingId === b.id ? "Restoring…" : "Restore"}
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
  const [view, setView] = useState("week");
  const [date, setDate] = useState(new Date());
  const [range, setRange] = useState(() => getRangeForView("week", new Date()));

  const [slots, setSlots] = useState([]);
  const [blockouts, setBlockouts] = useState([]);
  const [calBookings, setCalBookings] = useState([]);

  const [loadingInit, setLoadingInit] = useState(true);
  const [initError, setInitError] = useState("");
  const [expertTz, setExpertTz] = useState("");

  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [savingBuffer, setSavingBuffer] = useState(false);
  const [bufferSaved, setBufferSaved] = useState(false);
  const [bufferError, setBufferError] = useState("");

  const [advanceDays, setAdvanceDays] = useState(60);
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [advanceSaved, setAdvanceSaved] = useState(false);
  const [advanceError, setAdvanceError] = useState("");

  const [noticeHours, setNoticeHours] = useState(24);
  const [savingNotice, setSavingNotice] = useState(false);
  const [noticeSaved, setNoticeSaved] = useState(false);
  const [noticeError, setNoticeError] = useState("");

  const [addingSlot, setAddingSlot] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [slotError, setSlotError] = useState("");

  const [creatingBlock, setCreatingBlock] = useState(false);
  const [deletingBlock, setDeletingBlock] = useState(null);
  const [blockError, setBlockError] = useState("");
  const [blockInfo, setBlockInfo] = useState("");

  // ── Suppress overflow indicators on off-range (prior/next month) cells ───────
  // viewedDateRef stays in sync with `date` so the ShowMore component can read
  // it without needing to be re-created (which would cause calendar remounts).
  const viewedDateRef = useRef(date);
  useEffect(() => {
    viewedDateRef.current = date;
  }, [date]);

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
  }, []); // empty deps → stable reference; reads current month from ref

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    const initialRange = getRangeForView("week", new Date());
    Promise.all([
      listAvailability(),
      listBlockouts(
        initialRange.start.toISOString(),
        initialRange.end.toISOString()
      ),
      getCalendarBookings(
        initialRange.start.toISOString(),
        initialRange.end.toISOString()
      ),
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
      .catch(() => setInitError("Failed to load availability data."))
      .finally(() => setLoadingInit(false));
  }, []);

  // ── Refresh blockouts + bookings when range changes ──────────────────────────
  const refreshRangeData = useCallback(async (newRange) => {
    try {
      const [b, bk] = await Promise.all([
        listBlockouts(newRange.start.toISOString(), newRange.end.toISOString()),
        getCalendarBookings(
          newRange.start.toISOString(),
          newRange.end.toISOString()
        ),
      ]);
      setBlockouts(b);
      setCalBookings(bk);
    } catch {
      /* non-critical */
    }
  }, []);

  // ── Navigation — handles 'PREV' / 'NEXT' / 'TODAY' strings from CustomToolbar
  const handleNavigate = useCallback(
    (action) => {
      let newDate;
      if (action === "TODAY") {
        newDate = new Date();
      } else if (action === "PREV") {
        newDate =
          view === "week"
            ? addDays(date, -7)
            : new Date(date.getFullYear(), date.getMonth() - 1, 1);
      } else if (action === "NEXT") {
        newDate =
          view === "week"
            ? addDays(date, 7)
            : new Date(date.getFullYear(), date.getMonth() + 1, 1);
      } else {
        newDate = action; // Date object from react-big-calendar's internal navigation
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

  // react-big-calendar fires onRangeChange on internal navigation
  const handleRangeChange = useCallback(
    (newRange) => {
      let start, end;
      if (Array.isArray(newRange)) {
        start = newRange[0];
        end = newRange[newRange.length - 1];
        end = addDays(end, 1);
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

  // ── Build merged event list — available slots trimmed around occupied ranges ─
  const events = useMemo(() => {
    const blockoutEvs = blockoutsToEvents(blockouts);
    const bookingEvs = bookingsToEvents(calBookings);
    const rawAvailEvs = expandRecurringSlots(slots, range.start, range.end);
    const cleanAvailEvs = subtractOccupied(
      rawAvailEvs,
      blockoutEvs,
      bookingEvs
    );
    return [...cleanAvailEvs, ...blockoutEvs, ...bookingEvs];
  }, [slots, blockouts, calBookings, range]);

  // ── Slot handlers ─────────────────────────────────────────────────────────
  const handleAddSlot = async (data) => {
    setAddingSlot(true);
    setSlotError("");
    try {
      const created = await addAvailabilitySlot(data);
      setSlots((prev) =>
        [...prev, created].sort(
          (a, b) =>
            a.day_of_week - b.day_of_week ||
            a.start_time.localeCompare(b.start_time)
        )
      );
    } catch (err) {
      setSlotError(err?.response?.data?.error || "Failed to add slot.");
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
      setSlotError("Failed to remove slot.");
    } finally {
      setRemovingId(null);
    }
  };

  // ── Blockout handlers ─────────────────────────────────────────────────────
  const handleCreateBlockout = async (data) => {
    setCreatingBlock(true);
    setBlockError("");
    setBlockInfo("");
    try {
      const created = await createBlockout(data);

      if (created.removedCount > 0) {
        // Backend auto-removed time-slot blocks superseded by this Full Day block.
        // Sync local state: drop those time-slot entries for the same date, then add the new one.
        const createdDate = new Date(created.date).toDateString();
        setBlockouts((prev) => [
          ...prev.filter(
            (b) =>
              !(b.start_time && new Date(b.date).toDateString() === createdDate)
          ),
          created,
        ]);
        setBlockInfo(
          `${created.removedCount} existing time-slot block${
            created.removedCount > 1 ? "s were" : " was"
          } automatically removed because the Full Day block supersedes them.`
        );
      } else {
        setBlockouts((prev) => [...prev, created]);
      }
    } catch (err) {
      setBlockError(
        err?.response?.data?.error || "Failed to create block-out."
      );
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
      setBlockError("Failed to restore slot.");
    } finally {
      setDeletingBlock(null);
    }
  };

  // ── Buffer save handler ───────────────────────────────────────────────────
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
      setBufferError("Failed to save buffer setting. Please try again.");
    } finally {
      setSavingBuffer(false);
    }
  };

  // ── Advance booking limit save handler ────────────────────────────────────
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
      setAdvanceError(
        "Failed to save advance booking limit. Please try again."
      );
    } finally {
      setSavingAdvance(false);
    }
  };

  // ── Minimum notice period save handler ────────────────────────────────────
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
      setNoticeError("Failed to save notice period. Please try again.");
    } finally {
      setSavingNotice(false);
    }
  };

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  const calendarLabel =
    view === "week"
      ? format(range.start, "MMM d") + " – " + format(range.end, "MMM d, yyyy")
      : format(date, "MMMM yyyy");

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#1F2933]">Availability</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage your weekly schedule, block out specific dates, and view booked
          sessions.
        </p>
      </div>

      {initError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {initError}
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
            events={events}
            view={view}
            views={['day', 'week', 'month']}
            date={date}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            onRangeChange={handleRangeChange}
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
            min={new Date(0, 0, 0, 7, 0)}
            max={new Date(0, 0, 0, 21, 0)}
            showMultiDayTimes
            popup
          />
        </div>
      </div>

      {/* Timezone notice */}
      {expertTz ? (
        <div className="mb-4 px-4 py-3 bg-[#F5F7F5] border border-[#E4E7E4] rounded-lg text-sm text-gray-600">
          Your availability times are set in your profile timezone:{" "}
          <span className="font-semibold text-[#1F2933]">{expertTz}</span>
        </div>
      ) : (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Timezone not set.</strong> Please set your timezone in your{" "}
          <a href="/dashboard/expert/profile" className="underline font-medium">
            Profile
          </a>{" "}
          before adding availability, so your slots display correctly to
          parents.
        </div>
      )}

      {/* Buffer Between Sessions */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5 mb-5">
        <h3 className="text-sm font-semibold text-[#1F2933] mb-1">
          Buffer Between Sessions
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Add a automatic break after each confirmed booking. For example, with
          a 15-minute buffer, if a session ends at 11:00 the next available slot
          will start at 11:15. This applies to all your services and is
          invisible to parents — they simply won't see the blocked window.
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
              {mins === 0 ? "No buffer" : `${mins} min`}
            </button>
          ))}

          {savingBuffer && (
            <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin ml-1" />
          )}
          {bufferSaved && (
            <span className="text-xs text-[#445446] font-medium ml-1">
              ✓ Saved
            </span>
          )}
        </div>
      </div>

      {/* Advance Booking Limit */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5 mb-5">
        <h3 className="text-sm font-semibold text-[#1F2933] mb-1">
          Advance Booking Limit
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Control how far ahead parents can book sessions with you. Slots beyond
          this window will not be visible or bookable. This helps you keep your
          schedule predictable.
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
              {days} days
            </button>
          ))}

          {savingAdvance && (
            <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin ml-1" />
          )}
          {advanceSaved && (
            <span className="text-xs text-[#445446] font-medium ml-1">
              ✓ Saved
            </span>
          )}
        </div>
      </div>

      {/* Minimum Notice Period */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5 mb-5">
        <h3 className="text-sm font-semibold text-[#1F2933] mb-1">
          Minimum Notice Period
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Set how much notice you need before a session. Slots within this
          window will be automatically hidden from parents — they simply won't
          see them as available.
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
              {hours}h
            </button>
          ))}

          {savingNotice && (
            <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin ml-1" />
          )}
          {noticeSaved && (
            <span className="text-xs text-[#445446] font-medium ml-1">
              ✓ Saved
            </span>
          )}
        </div>
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
