import { useState, useEffect, useCallback } from 'react';
import { getMyBookings, cancelBooking, rescheduleBooking, verifyPayment, getAvailableSlots } from '../../api/bookingApi';
import { getProfileImageUrl } from '../../utils/imageUrl';
import BookingCalendar from '../../components/booking/BookingCalendar';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(minutes) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function hoursUntil(isoStr) {
  return (new Date(isoStr).getTime() - Date.now()) / (1000 * 60 * 60);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatSlotTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function expertInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  PENDING_PAYMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED:       'bg-green-50 text-green-700 border-green-200',
  CANCELLED:       'bg-red-50 text-red-600 border-red-200',
  REFUNDED:        'bg-gray-100 text-gray-600 border-gray-200',
  COMPLETED:       'bg-blue-50 text-blue-700 border-blue-200',
};
const STATUS_LABELS = {
  PENDING_PAYMENT: 'Awaiting payment',
  CONFIRMED:       'Confirmed',
  CANCELLED:       'Cancelled',
  REFUNDED:        'Refunded',
  COMPLETED:       'Completed',
};

// ─── Expert Avatar ────────────────────────────────────────────────────────────
const ExpertAvatar = ({ name, profileImage, size = 'md' }) => {
  const [imgError, setImgError] = useState(false);
  const url = getProfileImageUrl(profileImage);
  const sizeClass = size === 'lg' ? 'w-14 h-14 text-base' : 'w-11 h-11 text-sm';

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-[#445446] text-white flex items-center justify-center font-semibold flex-shrink-0 select-none`}>
      {expertInitials(name)}
    </div>
  );
};

// ─── Booking Card ─────────────────────────────────────────────────────────────
const BookingCard = ({ booking, onCancel, onReschedule }) => {
  // ── Cancel state ────────────────────────────────────────────────────────
  const [showCancel,  setShowCancel]  = useState(false);
  const [reason,      setReason]      = useState('');
  const [cancelling,  setCancelling]  = useState(false);
  const [cancelErr,   setCancelErr]   = useState('');

  // ── Reschedule state ─────────────────────────────────────────────────────
  const [showReschedule,  setShowReschedule]  = useState(false);
  const [rescheduleDate,  setRescheduleDate]  = useState(todayISO);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [slotsLoading,    setSlotsLoading]    = useState(false);
  const [rescheduleSlot,  setRescheduleSlot]  = useState(null);
  const [rescheduling,    setRescheduling]    = useState(false);
  const [rescheduleErr,   setRescheduleErr]   = useState('');

  const hrs              = hoursUntil(booking.scheduled_at);
  const isFuture         = hrs > 0;
  const canCancel        = ['CONFIRMED', 'PENDING_PAYMENT'].includes(booking.status) && isFuture && hrs >= 12;
  const inLockoutWindow  = booking.status === 'CONFIRMED' && isFuture && hrs < 12;
  // Refund tier shown inside the cancel form
  const refundTierMsg    = hrs >= 24
    ? 'You\'ll receive a full refund.'
    : 'You\'ll receive a 50% refund (cancellation is between 12 and 24 hours before your session).';
  const expertName   = booking.expert?.user?.account_deleted ? 'Deleted specialist' : (booking.expert?.user?.name || 'Expert');
  const duration     = formatDuration(booking.service?.duration_minutes);

  const canReschedule = booking.status === 'CONFIRMED' && isFuture && hrs >= 12;

  // Load available slots whenever the reschedule panel is open or the date changes
  useEffect(() => {
    if (!showReschedule) return;
    setSlotsLoading(true);
    setRescheduleSlot(null);
    getAvailableSlots(booking.expert_id, rescheduleDate, booking.service_id)
      .then(setRescheduleSlots)
      .catch(() => setRescheduleSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [showReschedule, rescheduleDate, booking.expert_id, booking.service_id]);

  const openReschedule = () => { setShowCancel(false);  setShowReschedule(true);  };
  const openCancel     = () => { setShowReschedule(false); setShowCancel(true);   };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    setCancelErr('');
    try {
      await onCancel(booking.id, reason || undefined);
      setShowCancel(false);
    } catch (err) {
      setCancelErr(err.response?.data?.error || 'Could not cancel. Please try again.');
      setCancelling(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleSlot) return;
    setRescheduling(true);
    setRescheduleErr('');
    try {
      await onReschedule(booking.id, rescheduleSlot.start);
      setShowReschedule(false);
      setRescheduleSlot(null);
      setRescheduling(false);
    } catch (err) {
      setRescheduleErr(err.response?.data?.error || 'Could not reschedule. Please try again.');
      setRescheduling(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden shadow-sm hover:shadow-md transition-shadow">

      {/* ── Card body ── */}
      <div className="p-5">
        <div className="flex items-start gap-4">

          {/* Expert avatar */}
          <ExpertAvatar
            name={expertName}
            profileImage={booking.expert?.profile_image}
            size="lg"
          />

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-base font-semibold text-[#1F2933] leading-snug">{expertName}</p>
                <p className="text-sm text-gray-500 mt-0.5">{booking.service?.title || 'Session'}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_STYLES[booking.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {STATUS_LABELS[booking.status] || booking.status}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Date */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <span>{formatDate(booking.scheduled_at)}</span>
              </div>

              {/* Time */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span>{formatTime(booking.scheduled_at)}</span>
              </div>

              {/* Duration */}
              {duration && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {duration}
                </span>
              )}

              {/* Format */}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                booking.format === 'ONLINE'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-[#445446]/10 text-[#445446]'
              }`}>
                {booking.format === 'ONLINE' ? 'Online' : 'In-Person'}
              </span>
            </div>
          </div>
        </div>

        {/* Online reminder for confirmed future sessions */}
        {booking.status === 'CONFIRMED' && booking.format === 'ONLINE' && isFuture && (
          <div className="mt-4 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-start gap-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Your expert will share a meeting link (Zoom / Teams) before the session.
          </div>
        )}
      </div>

      {/* ── Actions footer ── */}
      {(canCancel || canReschedule || inLockoutWindow) && (
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-[#E4E7E4] pt-4 space-y-3">

            {/* Within 12h lockout — both actions unavailable */}
            {inLockoutWindow && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-amber-800">Changes no longer possible</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Cancellations and reschedules are not accepted within 12 hours of your session. Please contact support if you need assistance.
                  </p>
                </div>
              </div>
            )}

            {/* ── Default action row: Reschedule + Cancel buttons ── */}
            {!showReschedule && !showCancel && (canCancel || canReschedule) && (
              <div className="flex items-center gap-3 justify-end">
                {canReschedule && (
                  <button
                    onClick={openReschedule}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#445446] border border-[#445446]/40 hover:bg-[#445446]/8 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                    Reschedule
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={openCancel}
                    className="text-xs text-gray-400 hover:text-red-500 underline underline-offset-2 transition-colors"
                  >
                    Cancel booking
                  </button>
                )}
              </div>
            )}

            {/* ── Reschedule panel ── */}
            {showReschedule && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#1F2933]">Select a new date and time</p>

                <BookingCalendar
                  selectedDate={rescheduleDate}
                  onSelect={setRescheduleDate}
                  minDateISO={todayISO()}
                />

                {/* Slot grid */}
                {slotsLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                    <span className="text-xs text-gray-500">Loading times…</span>
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">No available slots on this date — try another day.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {rescheduleSlots.map((slot) => (
                      <button
                        key={slot.start}
                        onClick={() => setRescheduleSlot(slot)}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                          rescheduleSlot?.start === slot.start
                            ? 'bg-[#445446] text-white border-[#445446]'
                            : 'bg-white text-[#1F2933] border-[#E4E7E4] hover:border-[#445446]'
                        }`}
                      >
                        {formatSlotTime(slot.start)}
                      </button>
                    ))}
                  </div>
                )}

                {rescheduleErr && <p className="text-xs text-red-600">{rescheduleErr}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowReschedule(false); setRescheduleSlot(null); setRescheduleErr(''); }}
                    className="flex-1 py-2 text-xs font-medium border border-[#E4E7E4] rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Keep current time
                  </button>
                  <button
                    onClick={handleConfirmReschedule}
                    disabled={!rescheduleSlot || rescheduling}
                    className="flex-1 py-2 text-xs font-medium bg-[#445446] hover:bg-[#3a4a3b] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {rescheduling ? 'Rescheduling…' : 'Confirm reschedule'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Cancel panel ── */}
            {showCancel && (
              <div className="space-y-2">
                <div className={`px-3 py-2 rounded-lg text-xs ${hrs >= 24 ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                  {refundTierMsg}
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for cancellation (optional)"
                  rows={2}
                  className="w-full border border-[#E4E7E4] rounded-lg px-3 py-2 text-xs text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 resize-none"
                />
                {cancelErr && <p className="text-xs text-red-600">{cancelErr}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowCancel(false); setCancelErr(''); setReason(''); }}
                    className="flex-1 py-2 text-xs font-medium border border-[#E4E7E4] rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Keep booking
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    disabled={cancelling}
                    className="flex-1 py-2 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-60"
                  >
                    {cancelling ? 'Cancelling…' : 'Confirm cancel'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

// ─── Past Booking Card ────────────────────────────────────────────────────────
const PastBookingCard = ({ booking }) => {
  const expertName = booking.expert?.user?.name || 'Expert';
  const duration   = formatDuration(booking.service?.duration_minutes);

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden opacity-90">

      {/* ── Card body ── */}
      <div className="p-5">
        <div className="flex items-start gap-4">

          {/* Expert avatar */}
          <ExpertAvatar
            name={expertName}
            profileImage={booking.expert?.profile_image}
            size="lg"
          />

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-base font-semibold text-[#1F2933] leading-snug">{expertName}</p>
                <p className="text-sm text-gray-500 mt-0.5">{booking.service?.title || 'Session'}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_STYLES[booking.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {STATUS_LABELS[booking.status] || booking.status}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Date */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <span>{formatDate(booking.scheduled_at)}</span>
              </div>

              {/* Time */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span>{formatTime(booking.scheduled_at)}</span>
              </div>

              {/* Duration */}
              {duration && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {duration}
                </span>
              )}

              {/* Format */}
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {booking.format === 'ONLINE' ? 'Online' : 'In-Person'}
              </span>

              {/* Amount paid */}
              {booking.amount && booking.status !== 'REFUNDED' && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  £{Number(booking.amount).toFixed(2)} paid
                </span>
              )}
              {booking.amount && booking.status === 'REFUNDED' && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full line-through">
                  £{Number(booking.amount).toFixed(2)} refunded
                </span>
              )}
            </div>

            {/* Cancellation reason */}
            {['CANCELLED', 'REFUNDED'].includes(booking.status) && booking.cancellation_reason && (
              <p className="mt-2 text-xs text-gray-400 italic">
                Reason: {booking.cancellation_reason}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Phase 2 actions footer (all placeholders — uncomment in Phase 2) ── */}
      {/* <div className="px-5 pb-5 pt-0">
        <div className="border-t border-[#E4E7E4] pt-4 flex items-center gap-2 flex-wrap">

          Phase 2: Receipt download — uses booking.stripe_charge_id via Stripe API
          {booking.stripe_charge_id && (
            <a href={`/receipts/${booking.id}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#445446] underline underline-offset-2 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download receipt
            </a>
          )}

          Phase 2: Re-book CTA — links to booking page for same expert + service
          {booking.status === 'COMPLETED' && (
            <Link to={`/dashboard/parent/browse/${booking.expert?.id}/book?service=${booking.service_id}`}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-[#445446] hover:underline transition-colors">
              Book again
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          )}

          Phase 2: Star rating — submits to POST /reviews, stored in Review table
          {booking.status === 'COMPLETED' && !booking.review && (
            <div className="w-full mt-2">
              <p className="text-xs text-gray-400 mb-1">How was your session?</p>
              <div className="flex gap-1">
                {[1,2,3,4,5].map((star) => (
                  <button key={star} className="text-gray-300 hover:text-amber-400 transition-colors">
                    ★
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div> */}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const MyBookingsPage = ({ view = 'upcoming' }) => {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    getMyBookings()
      .then((data) => {
        setBookings(data);

        // Silently reconcile any PENDING_PAYMENT bookings older than 2 minutes.
        // These are stuck — the Stripe webhook was likely missed. verifyPayment
        // checks the PaymentIntent status directly with Stripe and self-confirms
        // if the payment already went through.
        const stale = data.filter(
          (b) =>
            b.status === 'PENDING_PAYMENT' &&
            Date.now() - new Date(b.created_at).getTime() > 2 * 60 * 1000
        );
        stale.forEach((b) => {
          verifyPayment(b.id)
            .then((result) => {
              if (result.status === 'CONFIRMED') {
                setBookings((prev) =>
                  prev.map((x) => (x.id === b.id ? { ...x, status: 'CONFIRMED' } : x))
                );
              }
            })
            .catch(() => {}); // non-fatal — badge stays amber, no crash
        });
      })
      .catch(() => setError('Could not load your bookings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = useCallback(async (id, reason) => {
    await cancelBooking(id, reason);
    setBookings((prev) =>
      prev.map((b) => b.id === id ? { ...b, status: 'CANCELLED' } : b)
    );
  }, []);

  const handleReschedule = useCallback(async (id, newScheduledAt) => {
    await rescheduleBooking(id, newScheduledAt);
    setBookings((prev) =>
      prev.map((b) => b.id === id ? { ...b, scheduled_at: newScheduledAt } : b)
    );
  }, []);

  const now      = new Date();
  const upcoming = bookings.filter((b) =>
    ['CONFIRMED', 'PENDING_PAYMENT'].includes(b.status) && new Date(b.scheduled_at) > now
  );
  const past = bookings.filter((b) =>
    !['CONFIRMED', 'PENDING_PAYMENT'].includes(b.status) || new Date(b.scheduled_at) <= now
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  const isUpcoming = view === 'upcoming';
  const displayed  = isUpcoming ? upcoming : past;
  const title      = isUpcoming ? 'Upcoming Bookings' : 'Past Bookings';
  const emptyMsg   = isUpcoming
    ? 'You have no upcoming sessions — find an expert to get started.'
    : 'No past sessions yet.';

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-xl font-semibold text-[#1F2933]">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {isUpcoming
            ? 'Your confirmed and pending sessions.'
            : 'Completed, cancelled, and refunded sessions.'}
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-[#445446]/8 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          </div>
          <p className="text-sm text-gray-400 mt-1">{emptyMsg}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {isUpcoming
            ? displayed.map((b) => <BookingCard key={b.id} booking={b} onCancel={handleCancel} onReschedule={handleReschedule} />)
            : displayed.map((b) => <PastBookingCard key={b.id} booking={b} />)
          }
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
