import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enGB } from 'date-fns/locale/en-GB';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getCalendarBookings } from '../../../api/bookingApi';

// ─── react-big-calendar localizer (date-fns) ─────────────────────────────────
const locales = { 'en-GB': enGB };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  getDay,
  locales,
});

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
        {/* Header */}
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
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Details */}
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <div>
              <p className="text-xs text-gray-400">Parent</p>
              <p className="font-medium text-[#1F2933]">{b.parent?.name || '—'}</p>
              {b.parent?.email && (
                <a
                  href={`mailto:${b.parent.email}`}
                  className="text-xs text-[#445446] hover:underline"
                >
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

        {/* Online session reminder */}
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

// ─── Custom event component ───────────────────────────────────────────────────
// Shows: parent name, service, format badge — colour-coded by format
const EventBlock = ({ event }) => {
  const isOnline = event.resource?.format === 'ONLINE';
  return (
    <div className={`h-full px-1 py-0.5 rounded text-xs leading-tight overflow-hidden ${
      isOnline
        ? 'bg-blue-500 text-white'
        : 'bg-[#445446] text-white'
    }`}>
      <p className="font-semibold truncate">{event.resource?.parent?.name || event.title}</p>
      <p className="truncate opacity-90">{event.resource?.service?.title}</p>
      <p className="truncate opacity-75">{isOnline ? 'Online' : 'In-Person'}</p>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const CalendarSection = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view,        setView]        = useState('month');
  const [bookings,    setBookings]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [selected,    setSelected]    = useState(null);

  const fetchBookings = useCallback(async (date, _viewMode) => {
    setLoading(true);
    setError('');
    try {
      // Fetch a generous window around the current view
      const from = new Date(date.getFullYear(), date.getMonth() - 1, 1);
      const to   = new Date(date.getFullYear(), date.getMonth() + 2, 0, 23, 59, 59);
      const data = await getCalendarBookings(from.toISOString(), to.toISOString());
      setBookings(data);
    } catch {
      setError('Could not load calendar. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings(currentDate, view);
  }, [currentDate, view, fetchBookings]);

  // Convert bookings to react-big-calendar event objects
  const events = useMemo(() =>
    bookings.map((b) => {
      const start = new Date(b.scheduled_at);
      const end   = new Date(start.getTime() + b.duration_minutes * 60 * 1000);
      return {
        id:       b.id,
        title:    b.parent?.name || 'Booking',
        start,
        end,
        resource: b,
      };
    }),
  [bookings]);

  const handleNavigate = useCallback((date) => setCurrentDate(date), []);
  const handleView     = useCallback((v) => setView(v), []);
  const handleSelect   = useCallback((event) => setSelected(event), []);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#1F2933]">Calendar</h2>
        <p className="text-sm text-gray-500 mt-1">
          Your availability and confirmed appointments in one view.
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-xs text-gray-500">Online</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#445446]" />
          <span className="text-xs text-gray-500">In-Person</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      {loading && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          <span className="text-xs text-gray-400">Loading…</span>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-[#E4E7E4] overflow-hidden"
        style={{ height: 620 }}>
        <Calendar
          localizer={localizer}
          events={events}
          date={currentDate}
          view={view}
          onNavigate={handleNavigate}
          onView={handleView}
          onSelectEvent={handleSelect}
          components={{ event: EventBlock }}
          popup
          style={{ height: '100%', padding: '8px' }}
        />
      </div>

      {/* Detail modal */}
      <AppointmentModal event={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default CalendarSection;
