import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import {
  format, parse, startOfWeek, getDay,
  startOfMonth, endOfMonth, endOfWeek, addDays,
} from 'date-fns';
import { enGB } from 'date-fns/locale/en-GB';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getCalendarBookings } from '../../../api/bookingApi';
import { listAvailability } from '../../../api/expertApi';
import { listBlockouts } from '../../../api/blockoutApi';

// ─── react-big-calendar localizer (date-fns) — Monday week start ─────────────
const locales = { 'en-GB': enGB };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDateLocal(dateStr) {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Compute the visible calendar range for a given view + anchor date */
function getRangeForView(view, date) {
  if (view === 'week') {
    return {
      start: startOfWeek(date, { weekStartsOn: 1 }),
      end:   endOfWeek(date,   { weekStartsOn: 1 }),
    };
  }
  if (view === 'day') {
    const s = new Date(date); s.setHours(0, 0, 0, 0);
    const e = new Date(date); e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  }
  if (view === 'agenda') {
    return { start: date, end: addDays(date, 30) };
  }
  // month — use full calendar grid (Mon-start weeks covering the month)
  const mStart = startOfMonth(date);
  const mEnd   = endOfMonth(date);
  return {
    start: startOfWeek(mStart, { weekStartsOn: 1 }),
    end:   endOfWeek(mEnd,     { weekStartsOn: 1 }),
  };
}

/** Expand recurring weekly availability slots into concrete events for a date range */
function expandRecurringSlots(slots, rangeStart, rangeEnd) {
  const events = [];
  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    const dow = cursor.getDay();
    for (const slot of slots) {
      if (slot.day_of_week !== dow) continue;
      const [sh, sm] = slot.start_time.split(':').map(Number);
      const [eh, em] = slot.end_time.split(':').map(Number);
      const start = new Date(cursor); start.setHours(sh, sm, 0, 0);
      const evEnd = new Date(cursor); evEnd.setHours(eh, em, 0, 0);
      events.push({
        id:    `avail-${slot.id}-${cursor.toDateString()}`,
        title: 'Available',
        start,
        end:   evEnd,
        type:  'availability',
        startLabel: slot.start_time,
        endLabel:   slot.end_time,
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
      start = new Date(date); start.setHours(0, 0, 0, 0);
      end   = new Date(date); end.setHours(23, 59, 59, 999);
    } else {
      const [sh, sm] = b.start_time.split(':').map(Number);
      const [eh, em] = b.end_time.split(':').map(Number);
      start = new Date(date); start.setHours(sh, sm, 0, 0);
      end   = new Date(date); end.setHours(eh, em, 0, 0);
    }
    return { id: `block-${b.id}`, start, end, allDay: !b.start_time, type: 'blockout' };
  });
}

/** Strip availability event windows that overlap with bookings or blockouts */
function subtractOccupied(availEvents, blockoutEvents, bookingEvents) {
  const occupied = [
    ...blockoutEvents.map((e) => ({ start: e.start, end: e.end, allDay: !!e.allDay })),
    ...bookingEvents.map((e)  => ({ start: e.start, end: e.end, allDay: false })),
  ];

  let result = [...availEvents];
  for (const occ of occupied) {
    const next = [];
    for (const avail of result) {
      if (occ.allDay) {
        if (avail.start.toDateString() !== occ.start.toDateString()) next.push(avail);
      } else {
        const overlaps = occ.start < avail.end && occ.end > avail.start;
        if (!overlaps) {
          next.push(avail);
        } else {
          if (avail.start < occ.start) next.push({ ...avail, end: occ.start,   id: avail.id + '_pre'  });
          if (avail.end   > occ.end)   next.push({ ...avail, start: occ.end,   id: avail.id + '_post' });
        }
      }
    }
    result = next;
  }
  return result;
}

// ─── Custom toolbar ───────────────────────────────────────────────────────────
const VIEWS = ['day', 'week', 'month', 'agenda'];
const CustomToolbar = ({ label, onNavigate, onView, view }) => (
  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
    <div className="flex items-center gap-1">
      <button
        onClick={() => onNavigate('PREV')}
        className="p-2 rounded-lg text-gray-500 hover:text-[#445446] hover:bg-[#445446]/10 transition-colors"
        title="Previous"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button
        onClick={() => onNavigate('TODAY')}
        className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-[#E4E7E4] hover:bg-gray-50 transition-colors"
      >
        Today
      </button>
      <button
        onClick={() => onNavigate('NEXT')}
        className="p-2 rounded-lg text-gray-500 hover:text-[#445446] hover:bg-[#445446]/10 transition-colors"
        title="Next"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
      <span className="ml-2 text-sm font-semibold text-[#1F2933]">{label}</span>
    </div>
    <div className="flex rounded-lg border border-[#E4E7E4] overflow-hidden">
      {VIEWS.map((v) => (
        <button
          key={v}
          onClick={() => onView(v)}
          className={`px-4 py-1.5 text-xs font-medium transition-colors ${
            view === v
              ? 'bg-[#445446] text-white'
              : 'text-gray-500 hover:bg-gray-50 bg-white'
          }`}
        >
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  </div>
);

// ─── Weekend column tint (Sat + Sun get a lighter background) ────────────────
const dayPropGetter = (date) => {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) {
    return { style: { backgroundColor: '#f7f8f7' } };
  }
  return {};
};

// ─── Event style getter ───────────────────────────────────────────────────────
const eventPropGetter = (event) => {
  const base = { border: 'none', borderRadius: '5px', fontSize: '11px', padding: '2px 6px' };
  if (event.type === 'availability')
    return { style: { ...base, backgroundColor: '#445446', opacity: 0.5, color: '#fff', cursor: 'default' } };
  if (event.resource?.format === 'ONLINE')
    return { style: { ...base, backgroundColor: '#2563eb', color: '#fff' } };
  return { style: { ...base, backgroundColor: '#445446', color: '#fff' } };
};

// ─── Event components (month vs time-grid) ────────────────────────────────────
const fmtTime = (d) =>
  d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

const MonthEvent = ({ event }) => {
  if (event.type === 'availability') {
    return <span title={`Available ${event.startLabel}–${event.endLabel}`}>{event.startLabel}–{event.endLabel}</span>;
  }
  const b = event.resource;
  return <span title={event.title}>{b?.parent?.name || event.title}</span>;
};

const TimeGridEvent = ({ event }) => {
  if (event.type === 'availability') {
    return <span title={`Available ${fmtTime(event.start)}–${fmtTime(event.end)}`}>Available</span>;
  }
  const b = event.resource;
  return (
    <div className="leading-tight overflow-hidden">
      <p className="font-semibold truncate">{b?.parent?.name || event.title}</p>
      <p className="truncate opacity-90">{b?.service?.title}</p>
      <p className="truncate opacity-75">{b?.format === 'ONLINE' ? 'Online' : 'In-Person'}</p>
    </div>
  );
};

// ─── Appointment detail modal ─────────────────────────────────────────────────
const AppointmentModal = ({ event, onClose }) => {
  if (!event) return null;
  const b = event.resource;
  const isOnline = b.format === 'ONLINE';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-[#1F2933]">Appointment Details</h3>
            <span className={`mt-1 inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
              isOnline
                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                : 'bg-[#445446]/10 text-[#445446] border border-[#445446]/20'
            }`}>
              {isOnline ? 'Online Session' : 'In-Person Session'}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <div>
              <p className="text-xs text-gray-400">Parent</p>
              <p className="font-medium text-[#1F2933]">{b.parent?.name || '—'}</p>
              {b.parent?.email && (
                <a href={`mailto:${b.parent.email}`} className="text-xs text-[#445446] hover:underline">
                  {b.parent.email}
                </a>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            <div>
              <p className="text-xs text-gray-400">Service</p>
              <p className="font-medium text-[#1F2933]">{b.service?.title || '—'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div>
              <p className="text-xs text-gray-400">Time slot</p>
              <p className="font-medium text-[#1F2933]">
                {new Date(b.scheduled_at).toLocaleString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{b.duration_minutes} minutes</p>
            </div>
          </div>
        </div>

        {isOnline && (
          <div className="mt-5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Reminder:</strong> Please send your Zoom or Teams meeting link directly to the parent before the session.
              </p>
            </div>
          </div>
        )}

        <button onClick={onClose}
          className="mt-5 w-full py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
};

// ─── Legend ───────────────────────────────────────────────────────────────────
const Legend = () => (
  <div className="flex items-center gap-4 mb-4 flex-wrap">
    {[
      { color: '#445446', opacity: 0.5,  label: 'Available' },
      { color: '#2563eb', opacity: 1,    label: 'Booked (Online)' },
      { color: '#445446', opacity: 1,    label: 'Booked (In-Person)' },
    ].map(({ color, opacity, label }) => (
      <div key={label} className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color, opacity }} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
    ))}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const CalendarSection = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view,        setView]        = useState('month');
  const [bookings,    setBookings]    = useState([]);
  const [slots,       setSlots]       = useState([]);
  const [blockouts,   setBlockouts]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [selected,    setSelected]    = useState(null);

  // Fetch recurring availability slots once — they don't change with navigation
  useEffect(() => {
    listAvailability().then(setSlots).catch(() => {});
  }, []);

  // Fetch bookings + blockouts for a generous 3-month window around the current date
  const fetchRangeData = useCallback(async (date) => {
    setLoading(true);
    setError('');
    try {
      const from = new Date(date.getFullYear(), date.getMonth() - 1, 1);
      const to   = new Date(date.getFullYear(), date.getMonth() + 2, 0, 23, 59, 59);
      const [bkData, blData] = await Promise.all([
        getCalendarBookings(from.toISOString(), to.toISOString()),
        listBlockouts(from.toISOString(), to.toISOString()),
      ]);
      setBookings(bkData);
      setBlockouts(blData);
    } catch {
      setError('Could not load calendar. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRangeData(currentDate);
  }, [currentDate, fetchRangeData]);

  // Build merged event list: clean availability windows + bookings
  const events = useMemo(() => {
    const range = getRangeForView(view, currentDate);

    const bookingEvs = bookings.map((b) => {
      const start = new Date(b.scheduled_at);
      const end   = new Date(start.getTime() + b.duration_minutes * 60 * 1000);
      return { id: b.id, title: b.parent?.name || 'Booking', start, end, type: 'booking', resource: b };
    });

    const blockoutEvs  = blockoutsToEvents(blockouts);
    const rawAvailEvs  = expandRecurringSlots(slots, range.start, range.end);
    const cleanAvailEvs = subtractOccupied(rawAvailEvs, blockoutEvs, bookingEvs);

    return [...cleanAvailEvs, ...bookingEvs];
  }, [slots, blockouts, bookings, currentDate, view]);

  // Scroll to earliest slot or 08:00 in time-grid views
  const scrollToTime = useMemo(() => {
    if (slots.length === 0) return new Date(0, 0, 0, 8, 0);
    const earliest = slots.reduce(
      (min, s) => (s.start_time < min ? s.start_time : min),
      slots[0].start_time
    );
    const [h, m] = earliest.split(':').map(Number);
    const totalMins = Math.max(7 * 60, h * 60 + m - 30);
    return new Date(0, 0, 0, Math.floor(totalMins / 60), totalMins % 60);
  }, [slots]);

  const handleNavigate = useCallback((date) => setCurrentDate(date), []);
  const handleView     = useCallback((v) => setView(v), []);

  // Only open the detail modal for booking events
  const handleSelect = useCallback((event) => {
    if (event.type === 'booking') setSelected(event);
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#1F2933]">Calendar</h2>
        <p className="text-sm text-gray-500 mt-1">
          Your availability and confirmed appointments in one view.
        </p>
      </div>

      <Legend />

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      {loading && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          <span className="text-xs text-gray-400">Loading…</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E4E7E4] overflow-hidden" style={{ height: 640 }}>
        <Calendar
          localizer={localizer}
          events={events}
          date={currentDate}
          view={view}
          views={VIEWS}
          onNavigate={handleNavigate}
          onView={handleView}
          onSelectEvent={handleSelect}
          eventPropGetter={eventPropGetter}
          dayPropGetter={dayPropGetter}
          components={{
            toolbar: CustomToolbar,
            month: { event: MonthEvent },
            week:  { event: TimeGridEvent },
            day:   { event: TimeGridEvent },
          }}
          min={new Date(0, 0, 0, 7, 0)}
          max={new Date(0, 0, 0, 22, 0)}
          scrollToTime={scrollToTime}
          popup
          style={{ height: '100%', padding: '8px' }}
        />
      </div>

      <AppointmentModal event={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default CalendarSection;
