import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getUpcomingAppointments,
  markSessionLinkSent,
  expertCancelBooking,
  markBookingComplete,
  saveExpertNote,
} from '../../../api/bookingApi';

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

const EnvelopeIcon = () => (
  <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
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

// ─── Cancel confirmation modal ────────────────────────────────────────────────
const CancelModal = ({ booking, onConfirm, onDismiss, cancelling }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
    <div className="bg-white rounded-2xl border border-[#E4E7E4] shadow-xl w-full max-w-md p-6">
      <h3 className="text-base font-semibold text-[#1F2933] mb-2">Cancel this appointment?</h3>
      <p className="text-sm text-gray-500 mb-1">
        <span className="font-medium text-[#1F2933]">{booking.parent?.name}</span>
        {' — '}{booking.service?.title}
      </p>
      <p className="text-sm text-gray-500 mb-4">
        {formatAppointmentDate(booking.scheduled_at)} at {formatAppointmentTime(booking.scheduled_at)}
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>This action cannot be undone.</strong> The parent will receive a full refund and
          an email notifying them of the cancellation.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onDismiss}
          disabled={cancelling}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-[#E4E7E4] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Keep appointment
        </button>
        <button
          onClick={onConfirm}
          disabled={cancelling}
          className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
        >
          {cancelling ? 'Cancelling…' : 'Yes, cancel'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Note editor — shared by card and past-row ────────────────────────────────
const NoteEditor = ({ bookingId, initialNote, onSaved }) => {
  const [note,      setNote]      = useState(initialNote || '');
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const timerRef = useRef(null);

  const persist = useCallback(async (value) => {
    setSaveState('saving');
    try {
      const res = await saveExpertNote(bookingId, value);
      setSaveState('saved');
      if (onSaved) onSaved(res.expert_note);
      timerRef.current = setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
    }
  }, [bookingId, onSaved]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="px-4 pb-4">
      <p className="text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
        Private notes
        <span className="ml-1 normal-case font-normal text-gray-300">(not visible to parents)</span>
      </p>
      <textarea
        value={note}
        onChange={(e) => { setNote(e.target.value); setSaveState('idle'); }}
        onBlur={() => persist(note)}
        placeholder="Add session notes…"
        rows={3}
        className="w-full text-sm text-[#1F2933] placeholder-gray-300 border border-[#E4E7E4] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#445446] focus:border-[#445446] transition-colors"
      />
      <p className={`text-xs mt-1 transition-opacity ${saveState === 'idle' ? 'opacity-0' : 'opacity-100'} ${
        saveState === 'error' ? 'text-red-500' : 'text-gray-400'
      }`}>
        {saveState === 'saving' && 'Saving…'}
        {saveState === 'saved'  && 'Saved'}
        {saveState === 'error'  && 'Could not save — please try again'}
      </p>
    </div>
  );
};

// ─── Appointment card ─────────────────────────────────────────────────────────
const AppointmentCard = ({ booking, onMarkSent, onCancelRequest, onComplete }) => {
  const [marking,    setMarking]    = useState(false);
  const [completing, setCompleting] = useState(false);
  const [note,       setNote]       = useState(booking.expert_note || '');
  const isOnline  = booking.format === 'ONLINE';
  const isPast    = new Date(booking.scheduled_at) < new Date();
  const needsLinkReminder = isOnline && !booking.session_link_sent;

  const handleMark = async () => {
    setMarking(true);
    await onMarkSent(booking.id);
    setMarking(false);
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await markBookingComplete(booking.id, note);
      onComplete(booking.id);
    } catch {
      setCompleting(false);
    }
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
        {booking.parent?.email && (
          <div className="flex items-center gap-2">
            <EnvelopeIcon />
            <a
              href={`mailto:${booking.parent.email}`}
              className="text-sm text-[#445446] hover:underline truncate"
            >
              {booking.parent.email}
            </a>
          </div>
        )}
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

      {/* Notes */}
      <NoteEditor
        bookingId={booking.id}
        initialNote={note}
        onSaved={(v) => setNote(v || '')}
      />

      {/* Actions */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        {isPast && (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#445446] border border-[#445446]/40 bg-[#445446]/5 hover:bg-[#445446]/10 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            {completing ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
            {completing ? 'Marking…' : 'Mark as complete'}
          </button>
        )}
        <button
          onClick={() => onCancelRequest(booking)}
          className="w-full text-xs font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 py-2 rounded-lg transition-colors"
        >
          Cancel appointment
        </button>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const UpcomingAppointmentsSection = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

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

  const handleComplete = useCallback((id) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await expertCancelBooking(cancelTarget.id);
      setAppointments((prev) => prev.filter((a) => a.id !== cancelTarget.id));
      setCancelTarget(null);
    } catch {
      setError('Failed to cancel the appointment. Please try again.');
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          onConfirm={handleCancelConfirm}
          onDismiss={() => setCancelTarget(null)}
          cancelling={cancelling}
        />
      )}

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
              onCancelRequest={setCancelTarget}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingAppointmentsSection;
