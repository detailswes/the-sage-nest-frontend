import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBookings, cancelBooking, rescheduleBooking, verifyPayment, getAvailableSlots, getAvailableDatesInMonth } from '../../api/bookingApi';
import { getProfileImageUrl } from '../../utils/imageUrl';
import BookingCalendar from '../../components/booking/BookingCalendar';
import CancellationPolicy from '../../components/booking/CancellationPolicy';

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
  PENDING_PAYMENT:      'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED:            'bg-green-50 text-green-700 border-green-200',
  CANCELLED:            'bg-red-50 text-red-600 border-red-200',
  REFUNDED:             'bg-gray-100 text-gray-600 border-gray-200',
  REFUNDED_BY_EXPERT:   'bg-green-50 text-green-700 border-green-200',
  COMPLETED:            'bg-blue-50 text-blue-700 border-blue-200',
};
const STATUS_LABELS = {
  PENDING_PAYMENT:      'Awaiting payment',
  CONFIRMED:            'Confirmed',
  CANCELLED:            'Cancelled',
  REFUNDED:             'Refunded',
  REFUNDED_BY_EXPERT:   'Cancelled by expert',
  COMPLETED:            'Completed',
};

function statusKey(booking) {
  if (booking.status === 'REFUNDED' && booking.cancellation_reason === 'Cancelled by expert') {
    return 'REFUNDED_BY_EXPERT';
  }
  return booking.status;
}

// ─── Detail sheet sub-components ─────────────────────────────────────────────
const DetailRow = ({ label, value, valueClass }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-xs text-gray-400 flex-shrink-0 pt-px">{label}</span>
    <span className={`text-sm text-right leading-snug ${valueClass || 'text-[#1F2933]'}`}>{value}</span>
  </div>
);

// ─── Booking Detail Sheet ─────────────────────────────────────────────────────
const BookingDetailSheet = ({ booking, onClose }) => {
  const [copied, setCopied] = useState(false);

  const ref       = `SN-${new Date(booking.created_at).getFullYear()}-${String(booking.id).padStart(5, '0')}`;
  const currency  = booking.currency || 'EUR';
  const expertName = booking.expert?.user?.account_deleted
    ? 'Deleted specialist'
    : (booking.expert?.user?.name || 'Expert');
  const duration  = formatDuration(booking.service?.duration_minutes);
  const hrs       = hoursUntil(booking.scheduled_at);
  const isUpcoming = booking.status === 'CONFIRMED' && hrs > 0;
  const sk        = statusKey(booking);
  const location  = [
    booking.expert?.address_street,
    booking.expert?.address_city,
    booking.expert?.address_postcode,
  ].filter(Boolean).join(', ');

  const fmtCurrency = (n) =>
    n ? new Intl.NumberFormat('en', { style: 'currency', currency }).format(Number(n)) : null;

  const paymentStatusLabel =
    booking.status === 'PENDING_PAYMENT' ? 'Awaiting payment'
    : booking.status === 'CANCELLED'     ? 'Not charged'
    : 'Paid';

  const copy = () => {
    navigator.clipboard?.writeText(ref)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {});
  };

  // Lock body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#E4E7E4] flex-shrink-0">
          <h2 className="text-base font-semibold text-[#1F2933]">Booking Details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 pb-8 space-y-6">

          {/* Booking reference */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Booking reference</p>
              <p className="text-sm font-mono font-bold text-[#1F2933] tracking-widest">{ref}</p>
            </div>
            <button
              onClick={copy}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                copied
                  ? 'text-green-700 border-green-200 bg-green-50'
                  : 'text-[#445446] border-[#445446]/30 hover:bg-[#445446]/5'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.621c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Status */}
          <div>
            <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[sk] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {STATUS_LABELS[sk] || booking.status}
            </span>
          </div>

          {/* Specialist */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]">
            <ExpertAvatar name={expertName} profileImage={booking.expert?.profile_image} size="md" />
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Specialist</p>
              <p className="text-sm font-semibold text-[#1F2933]">{expertName}</p>
            </div>
          </div>

          {/* Session details */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Session</p>
            <div className="space-y-3">
              <DetailRow label="Service"  value={booking.service?.title || 'Session'} />
              <DetailRow label="Date"     value={formatDate(booking.scheduled_at)} />
              <DetailRow label="Time"     value={formatTime(booking.scheduled_at)} />
              {duration && <DetailRow label="Duration" value={duration} />}
              <DetailRow
                label="Format"
                value={booking.format === 'ONLINE' ? 'Online' : 'In-Person'}
              />
              {booking.format === 'IN_PERSON' && location && (
                <DetailRow label="Location" value={location} />
              )}
            </div>
          </div>

          {/* Payment */}
          {(booking.amount || booking.status === 'PENDING_PAYMENT') && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment</p>
              <div className="space-y-3">
                {booking.amount && (
                  <DetailRow label="Amount paid" value={fmtCurrency(booking.amount)} />
                )}
                <DetailRow label="Payment status" value={paymentStatusLabel} />
                {(booking.status === 'REFUNDED' || booking.refund_amount) && (
                  <DetailRow
                    label="Refund issued"
                    value={fmtCurrency(booking.refund_amount || booking.amount)}
                    valueClass="text-green-600 font-medium"
                  />
                )}
              </div>
            </div>
          )}

          {/* Cancellation reason */}
          {booking.cancellation_reason && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Cancellation</p>
              <p className="text-sm text-gray-600 leading-relaxed">{booking.cancellation_reason}</p>
            </div>
          )}

          {/* Cancellation policy — only for upcoming confirmed sessions */}
          {isUpcoming && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Cancellation policy</p>
              <CancellationPolicy compact />
            </div>
          )}

        </div>
      </div>
    </div>
  );
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
const BookingCard = ({ booking, onCancel, onReschedule, onViewDetails }) => {
  // ── Cancel state ────────────────────────────────────────────────────────
  const [showCancel,  setShowCancel]  = useState(false);
  const [reason,      setReason]      = useState('');
  const [cancelling,  setCancelling]  = useState(false);
  const [cancelErr,   setCancelErr]   = useState('');

  // ── Reschedule state ─────────────────────────────────────────────────────
  const [showReschedule,    setShowReschedule]    = useState(false);
  // Start at the booking's own date so the calendar opens on the right month
  const [rescheduleDate,    setRescheduleDate]    = useState(
    () => new Date(booking.scheduled_at).toISOString().slice(0, 10)
  );
  const [rescheduleSlots,   setRescheduleSlots]   = useState([]);
  const [slotsLoading,      setSlotsLoading]      = useState(false);
  const [rescheduleSlot,    setRescheduleSlot]    = useState(null);
  const [rescheduling,      setRescheduling]      = useState(false);
  const [rescheduleErr,     setRescheduleErr]     = useState('');
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
  const [availableDates,    setAvailableDates]    = useState(undefined);
  const [loadingDates,      setLoadingDates]      = useState(false);

  const hrs              = hoursUntil(booking.scheduled_at);
  const isFuture         = hrs > 0;
  const canCancel        = booking.status === 'CONFIRMED' && isFuture && hrs >= 12;
  const inLockoutWindow  = booking.status === 'CONFIRMED' && isFuture && hrs < 12;
  // Refund tier shown inside the cancel form
  const currency     = booking.currency || 'EUR';
  const fullAmount   = booking.amount ? new Intl.NumberFormat('en', { style: 'currency', currency }).format(Number(booking.amount)) : null;
  const halfAmount   = booking.amount ? new Intl.NumberFormat('en', { style: 'currency', currency }).format(Number(booking.amount) / 2) : null;
  const refundTierMsg = hrs >= 24
    ? `You'll receive a full refund${fullAmount ? ` (${fullAmount})` : ''}.`
    : `You'll receive a 50% refund${halfAmount ? ` (${halfAmount})` : ''} — cancellation is between 12 and 24 hours before your session.`;
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

  // Load available dates for the calendar month (same logic as booking flow)
  const fetchAvailableDates = useCallback(async (year, month) => {
    setLoadingDates(true);
    try {
      const dates = await getAvailableDatesInMonth(
        booking.expert_id, year, month, booking.service_id,
      );
      setAvailableDates(dates);
    } catch {
      setAvailableDates(undefined);
    } finally {
      setLoadingDates(false);
    }
  }, [booking.expert_id, booking.service_id]);

  const openReschedule = () => {
    setShowCancel(false);
    setAvailableDates(undefined); // reset so calendar fetches fresh on mount
    setShowReschedule(true);
  };
  const openCancel = () => { setShowReschedule(false); setShowCancel(true); };

  const handleConfirmCancel = async () => {
    if (!reason.trim()) {
      setCancelErr('Please provide a reason for your cancellation.');
      return;
    }
    setCancelling(true);
    setCancelErr('');
    try {
      await onCancel(booking.id, reason.trim());
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
      setRescheduleSuccess(true);
    } catch (err) {
      setRescheduleErr(err.response?.data?.error || 'Could not reschedule. Please try again.');
      setRescheduling(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden shadow-sm hover:shadow-md transition-shadow">

      {/* ── Card body — tappable to open detail sheet ── */}
      <div className="p-5 cursor-pointer hover:bg-[#F5F7F5]/60 transition-colors" onClick={() => onViewDetails(booking)}>
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
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_STYLES[statusKey(booking)] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {STATUS_LABELS[statusKey(booking)] || booking.status}
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

        {/* In-person location for confirmed future sessions */}
        {booking.status === 'CONFIRMED' && booking.format === 'IN_PERSON' && isFuture && (() => {
          const address = [booking.expert?.address_street, booking.expert?.address_city, booking.expert?.address_postcode].filter(Boolean).join(', ');
          return address ? (
            <div className="mt-4 px-3 py-2.5 bg-[#445446]/5 border border-[#445446]/20 rounded-xl text-xs text-[#445446] flex items-start gap-2">
              <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span><span className="font-medium">Address:</span> {address}</span>
            </div>
          ) : null;
        })()}

        {/* View details hint */}
        <div className="mt-4 flex items-center justify-end gap-1 text-xs text-gray-400">
          <span>View details</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>

      {/* ── Reschedule success banner ── */}
      {rescheduleSuccess && (
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-[#E4E7E4] pt-4">
            <div className="flex items-start gap-3 px-3 py-3 bg-green-50 border border-green-200 rounded-xl">
              <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-green-800">Session rescheduled</p>
                <p className="text-xs text-green-700 mt-0.5">
                  Your session is now booked for{' '}
                  <span className="font-medium">
                    {new Date(booking.scheduled_at).toLocaleString('en-GB', {
                      weekday: 'short', day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  . Confirmation emails have been sent to you and your expert.
                </p>
              </div>
              <button
                onClick={() => setRescheduleSuccess(false)}
                className="flex-shrink-0 text-green-500 hover:text-green-700 transition-colors"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Actions footer ── */}
      {!rescheduleSuccess && (canCancel || canReschedule || inLockoutWindow) && (
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

                {/* Current booking reference */}
                <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F7F5] border border-[#E4E7E4] rounded-lg text-xs text-gray-500">
                  <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span>
                    Currently booked:{' '}
                    <span className="font-medium text-[#1F2933]">
                      {new Date(booking.scheduled_at).toLocaleString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </span>
                </div>

                <BookingCalendar
                  selectedDate={rescheduleDate}
                  onSelect={setRescheduleDate}
                  minDateISO={todayISO()}
                  availableDates={availableDates}
                  loadingDates={loadingDates}
                  onMonthChange={fetchAvailableDates}
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
                <div>
                  <label className="block text-xs font-medium text-[#1F2933] mb-1">
                    Reason for cancellation <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => { setReason(e.target.value.slice(0, 200)); if (cancelErr) setCancelErr(''); }}
                    placeholder="Please describe why you're cancelling…"
                    maxLength={200}
                    rows={2}
                    className={`w-full border rounded-lg px-3 py-2 text-xs text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 resize-none transition-colors ${
                      cancelErr && !reason.trim() ? 'border-red-400 bg-red-50' : 'border-[#E4E7E4]'
                    }`}
                  />
                  <p className={`text-right text-xs mt-1 ${reason.length >= 190 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {reason.length} / 200
                  </p>
                </div>
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
                    disabled={cancelling || !reason.trim()}
                    className="flex-1 py-2 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
const PastBookingCard = ({ booking, onViewDetails }) => {
  const navigate   = useNavigate();
  const expertName = booking.expert?.user?.name || 'Expert';
  const duration   = formatDuration(booking.service?.duration_minutes);

  const isCompleted      = booking.status === 'COMPLETED';
  const expertDeleted    = !!booking.expert?.user?.account_deleted;
  const serviceInactive  = booking.service?.is_active === false;
  const canBookAgain     = isCompleted && !expertDeleted && !serviceInactive;
  const bookAgainBlocked = isCompleted && (expertDeleted || serviceInactive);

  const handleBookAgain = () => {
    navigate('/dashboard/parent/browse', {
      state: {
        restore: {
          expert:  { id: booking.expert_id, ...booking.expert },
          service: { id: booking.service_id, ...booking.service },
        },
      },
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden opacity-90">

      {/* ── Card body — tappable to open detail sheet ── */}
      <div className="p-5 cursor-pointer hover:bg-[#F5F7F5]/60 transition-colors" onClick={() => onViewDetails(booking)}>
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
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_STYLES[statusKey(booking)] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {STATUS_LABELS[statusKey(booking)] || booking.status}
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
              {booking.amount && booking.status !== 'REFUNDED' && booking.status !== 'CANCELLED' && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {new Intl.NumberFormat('en', { style: 'currency', currency: booking.currency || 'EUR' }).format(Number(booking.amount))} paid
                </span>
              )}

              {/* Refund chip */}
              {booking.status === 'REFUNDED' && booking.amount && (() => {
                const cur = booking.currency || 'EUR';
                const refundAmt = booking.refund_amount || booking.amount;
                const isFull = !booking.refund_amount || Number(booking.refund_amount) >= Number(booking.amount);
                const formatted = new Intl.NumberFormat('en', { style: 'currency', currency: cur }).format(Number(refundAmt));
                return (
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                    {isFull ? `Full refund issued — ${formatted} returned` : `${formatted} refunded`}
                  </span>
                );
              })()}
            </div>

            {/* Expert-cancelled: prominent green refund notice */}
            {booking.status === 'REFUNDED' && booking.cancellation_reason === 'Cancelled by expert' && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <p className="text-xs text-green-700 leading-relaxed">
                  <span className="font-semibold">Cancelled by your expert.</span>
                  {booking.amount
                    ? ` A full refund of ${new Intl.NumberFormat('en', { style: 'currency', currency: booking.currency || 'EUR' }).format(Number(booking.amount))} has been issued. Please allow 5–10 business days to appear in your account.`
                    : ' A full refund has been issued.'}
                </p>
              </div>
            )}

            {/* Parent-cancelled reason */}
            {booking.status === 'CANCELLED' && booking.cancellation_reason && booking.cancellation_reason !== 'Cancelled by expert' && (
              <div className="mt-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">Cancellation reason</p>
                <p className="text-xs text-gray-600 leading-relaxed">{booking.cancellation_reason}</p>
              </div>
            )}

            {/* Partial refund (parent-cancelled within 12–24 h window) */}
            {booking.status === 'REFUNDED' && booking.cancellation_reason !== 'Cancelled by expert' && booking.refund_amount && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <p className="text-xs text-green-700 leading-relaxed">
                  {new Intl.NumberFormat('en', { style: 'currency', currency: booking.currency || 'EUR' }).format(Number(booking.refund_amount))} refunded to your original payment method.
                </p>
              </div>
            )}

            {/* View details hint */}
            <div className="mt-3 flex items-center justify-end gap-1 text-xs text-gray-400">
              <span>View details</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Book again footer (completed sessions only) ── */}
      {(canBookAgain || bookAgainBlocked) && (
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-[#E4E7E4] pt-4">

            {/* Blocked: service deactivated or expert deleted */}
            {bookAgainBlocked && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-gray-600">Booking unavailable</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {expertDeleted
                      ? 'This expert is no longer on the platform.'
                      : 'This service is no longer offered by the expert.'}
                    {' '}You can browse other available experts.
                  </p>
                </div>
              </div>
            )}

            {/* Active: book again */}
            {canBookAgain && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Enjoyed this session?</p>
                <button
                  onClick={handleBookAgain}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#445446] border border-[#445446]/40 hover:bg-[#445446]/8 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Book again
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const MyBookingsPage = ({ view = 'upcoming' }) => {
  const [bookings,        setBookings]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

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

  const now = new Date();
  // Use session END time (start + duration) so an in-progress session stays in
  // Upcoming until it's actually over, not just after it begins.
  const sessionEndTime = (b) =>
    new Date(b.scheduled_at).getTime() + (b.duration_minutes || 0) * 60 * 1000;

  const upcoming = bookings.filter((b) =>
    b.status === 'CONFIRMED' && sessionEndTime(b) > now.getTime()
  );
  const past = bookings.filter((b) =>
    b.status !== 'PENDING_PAYMENT' &&
    (b.status !== 'CONFIRMED' || sessionEndTime(b) <= now.getTime())
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
            ? 'Your confirmed upcoming sessions.'
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
            ? displayed.map((b) => <BookingCard key={b.id} booking={b} onCancel={handleCancel} onReschedule={handleReschedule} onViewDetails={setSelectedBooking} />)
            : displayed.map((b) => <PastBookingCard key={b.id} booking={b} onViewDetails={setSelectedBooking} />)
          }
        </div>
      )}

      {selectedBooking && (
        <BookingDetailSheet
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
};

export default MyBookingsPage;
