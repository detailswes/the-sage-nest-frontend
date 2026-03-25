import { useState, useEffect, useCallback } from 'react';
import { getUpcomingAppointments, markSessionLinkSent } from '../../../api/bookingApi';

// ─── Icons ────────────────────────────────────────────────────────────────────
const CalendarCheckIcon = () => (
  <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAppointmentDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAppointmentTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

// ─── Appointment card ─────────────────────────────────────────────────────────
const AppointmentCard = ({ booking, onMarkSent }) => {
  const [marking, setMarking] = useState(false);
  const isOnline = booking.service?.format === 'ONLINE' || booking.format === 'ONLINE';
  const needsLinkReminder = isOnline && !booking.session_link_sent;

  const handleMark = async () => {
    setMarking(true);
    await onMarkSent(booking.id);
    setMarking(false);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E4E7E4] overflow-hidden">
      {/* Date/time header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#F5F7F5] border-b border-[#E4E7E4]">
        <div>
          <p className="text-xs font-semibold text-[#445446]">
            {formatAppointmentDate(booking.scheduled_at)}
          </p>
          <p className="text-sm font-bold text-[#1F2933] mt-0.5">
            {formatAppointmentTime(booking.scheduled_at)}
          </p>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            isOnline
              ? 'bg-blue-50 text-blue-600 border border-blue-100'
              : 'bg-[#445446]/10 text-[#445446] border border-[#445446]/20'
          }`}
        >
          {isOnline ? 'Online' : 'In-Person'}
        </span>
      </div>

      {/* Details */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <UserIcon />
          <span className="text-sm font-medium text-[#1F2933]">
            {booking.parent?.name || '—'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <BriefcaseIcon />
          <span className="text-sm text-gray-600">
            {booking.service?.title || '—'}
            <span className="ml-2 text-xs text-gray-400">
              · {formatDuration(booking.duration_minutes || booking.service?.duration_minutes || 0)}
            </span>
          </span>
        </div>
      </div>

      {/* Amber reminder banner */}
      {needsLinkReminder && (
        <div className="mx-4 mb-3 flex items-center justify-between gap-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 min-w-0">
            <LinkIcon />
            <p className="text-xs font-medium text-amber-700 truncate">
              Session link not yet sent to parent
            </p>
          </div>
          <button
            onClick={handleMark}
            disabled={marking}
            className="flex-shrink-0 text-xs font-semibold text-amber-700 border border-amber-300 bg-white hover:bg-amber-50 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-60"
          >
            {marking ? 'Saving…' : 'Mark sent'}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const UpcomingAppointmentsSection = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getUpcomingAppointments()
      .then(setAppointments)
      .catch(() => setError('Failed to load appointments.'))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkSent = useCallback(async (id) => {
    try {
      await markSessionLinkSent(id);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, session_link_sent: true } : a))
      );
    } catch {
      // non-critical — UI will just stay in reminder state
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#1F2933]">Upcoming Appointments</h2>
        <p className="text-sm text-gray-500 mt-1">
          Your next scheduled sessions with parents.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CalendarCheckIcon />
          <p className="mt-4 text-sm font-medium text-gray-500">No upcoming appointments.</p>
          <p className="mt-1 text-sm text-gray-400">
            Your availability is live and parents can book you.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((booking) => (
            <AppointmentCard
              key={booking.id}
              booking={booking}
              onMarkSent={handleMarkSent}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingAppointmentsSection;
