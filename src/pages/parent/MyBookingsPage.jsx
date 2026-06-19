import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation, Trans } from 'react-i18next';
import {
  useGetMyBookingsQuery,
  useCancelBookingMutation,
  useRescheduleBookingMutation,
  useVerifyPaymentMutation,
  useGetAvailableSlotsQuery,
  useGetAvailableDatesInMonthQuery,
} from '../../api/bookingApi';
import { useAuth } from '../../context/AuthContext';
import { getProfileImageUrl } from '../../utils/imageUrl';
import BookingCalendar from '../../components/booking/BookingCalendar';
import CancellationPolicy from '../../components/booking/CancellationPolicy';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(isoStr, lng = 'en') {
  return new Date(isoStr).toLocaleDateString(lng === 'it' ? 'it-IT' : 'en-GB', {
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

function formatLocaleStr(isoStr, lng = 'en') {
  return new Date(isoStr).toLocaleString(lng === 'it' ? 'it-IT' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function expertInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function fmtCurrency(n, currency, lng = 'en') {
  if (!n) return null;
  return new Intl.NumberFormat(lng === 'it' ? 'it' : 'en', {
    style: 'currency', currency,
  }).format(Number(n));
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
  const { t, i18n } = useTranslation('parentBookings');
  const lng = i18n.language;
  const [copied, setCopied] = useState(false);

  const ref        = `SN-${new Date(booking.created_at).getFullYear()}-${String(booking.id).padStart(5, '0')}`;
  const currency   = booking.currency || 'EUR';
  const expertName = booking.expert?.user?.account_deleted
    ? t('detailSheet.deletedSpecialist')
    : (booking.expert?.user?.name || t('detailSheet.deletedSpecialist'));
  const duration   = formatDuration(booking.service?.duration_minutes);
  const hrs        = hoursUntil(booking.scheduled_at);
  const isUpcoming = booking.status === 'CONFIRMED' && hrs > 0;
  const sk         = statusKey(booking);
  const location   = [
    booking.expert?.address_street,
    booking.expert?.address_city,
    booking.expert?.address_postcode,
  ].filter(Boolean).join(', ');

  const paymentStatusLabel =
    booking.status === 'PENDING_PAYMENT'                                      ? t('detailSheet.paymentAwaiting')
    : booking.status === 'CANCELLED' && booking.refund_status === 'failed'    ? t('detailSheet.paymentRefundFailed')
    : booking.status === 'CANCELLED'                                           ? t('detailSheet.paymentNotCharged')
    : t('detailSheet.paymentPaid');

  const copy = () => {
    navigator.clipboard?.writeText(ref)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {});
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#E4E7E4] flex-shrink-0">
          <h2 className="text-base font-semibold text-[#1F2933]">{t('detailSheet.title')}</h2>
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
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('detailSheet.referenceLabel')}</p>
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
                  {t('detailSheet.copied')}
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.621c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                  </svg>
                  {t('detailSheet.copy')}
                </>
              )}
            </button>
          </div>

          {/* Status */}
          <div>
            <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[sk] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {t(`status.${sk}`, { defaultValue: booking.status })}
            </span>
          </div>

          {/* Specialist */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]">
            <ExpertAvatar name={expertName} profileImage={booking.expert?.profile_image} size="md" />
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{t('detailSheet.specialistSection')}</p>
              <p className="text-sm font-semibold text-[#1F2933]">{expertName}</p>
            </div>
          </div>

          {/* Session details */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('detailSheet.sessionSection')}</p>
            <div className="space-y-3">
              <DetailRow label={t('detailSheet.serviceLabel')}  value={booking.service?.title || t('detailSheet.sessionSection')} />
              <DetailRow label={t('detailSheet.dateLabel')}     value={formatDate(booking.scheduled_at, lng)} />
              <DetailRow label={t('detailSheet.timeLabel')}     value={formatTime(booking.scheduled_at)} />
              {duration && <DetailRow label={t('detailSheet.durationLabel')} value={duration} />}
              <DetailRow
                label={t('detailSheet.formatLabel')}
                value={booking.format === 'ONLINE' ? t('detailSheet.formatOnline') : t('detailSheet.formatInPerson')}
              />
              {booking.format === 'IN_PERSON' && location && (
                <DetailRow label={t('detailSheet.locationLabel')} value={location} />
              )}
            </div>
          </div>

          {/* Payment */}
          {(booking.amount || booking.status === 'PENDING_PAYMENT') && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('detailSheet.paymentSection')}</p>
              <div className="space-y-3">
                {booking.amount && (
                  <DetailRow label={t('detailSheet.amountPaid')} value={fmtCurrency(booking.amount, currency, lng)} />
                )}
                <DetailRow label={t('detailSheet.paymentStatus')} value={paymentStatusLabel} />
                {(booking.status === 'REFUNDED' || (booking.refund_amount && booking.refund_status !== 'failed')) && (
                  <DetailRow
                    label={t('detailSheet.refundIssued')}
                    value={fmtCurrency(booking.refund_amount || booking.amount, currency, lng)}
                    valueClass="text-green-600 font-medium"
                  />
                )}
              </div>
            </div>
          )}

          {/* Cancellation reason */}
          {booking.cancellation_reason && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('detailSheet.cancellationSection')}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{booking.cancellation_reason}</p>
            </div>
          )}

          {/* Cancellation policy — only for upcoming confirmed sessions */}
          {isUpcoming && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('detailSheet.policySection')}</p>
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

// ─── Booking Card (upcoming) ──────────────────────────────────────────────────
const BookingCard = ({ booking, onViewDetails }) => {
  const { t, i18n } = useTranslation('parentBookings');
  const lng = i18n.language;

  const [showCancel,  setShowCancel]  = useState(false);
  const [reason,      setReason]      = useState('');
  const [cancelErr,   setCancelErr]   = useState('');

  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(
    () => new Date(booking.scheduled_at).toISOString().slice(0, 10)
  );
  const [rescheduleSlot, setRescheduleSlot] = useState(null);
  const [monthArgs,      setMonthArgs]      = useState(null);

  const [cancelBooking,    { isLoading: cancelling   }] = useCancelBookingMutation();
  const [rescheduleBooking, { isLoading: rescheduling }] = useRescheduleBookingMutation();

  const { data: rescheduleSlots = [], isFetching: slotsLoading } = useGetAvailableSlotsQuery(
    { expertId: booking.expert_id, date: rescheduleDate, serviceId: booking.service_id },
    { skip: !showReschedule }
  );

  const { data: availableDatesRaw, isFetching: loadingDates } = useGetAvailableDatesInMonthQuery(
    monthArgs,
    { skip: !monthArgs }
  );
  const availableDates = useMemo(
    () => (availableDatesRaw ? new Set(availableDatesRaw) : undefined),
    [availableDatesRaw]
  );

  // Reset selected slot when date changes
  useEffect(() => {
    setRescheduleSlot(null);
  }, [rescheduleDate]);

  const fetchAvailableDates = useCallback((year, month) => {
    setMonthArgs({ expertId: booking.expert_id, year, month, serviceId: booking.service_id });
  }, [booking.expert_id, booking.service_id]);

  const hrs             = hoursUntil(booking.scheduled_at);
  const isFuture        = hrs > 0;
  const canCancel       = booking.status === 'CONFIRMED' && isFuture && hrs >= 12;
  const inLockoutWindow = booking.status === 'CONFIRMED' && isFuture && hrs < 12;
  const currency        = booking.currency || 'EUR';
  const fullAmount      = fmtCurrency(booking.amount, currency, lng);
  const halfAmount      = booking.amount ? fmtCurrency(Number(booking.amount) / 2, currency, lng) : null;
  const refundTierMsg   = hrs >= 24
    ? t('card.refundFull',  { amount: fullAmount  ? ` (${fullAmount})`  : '' })
    : t('card.refundHalf',  { amount: halfAmount  ? ` (${halfAmount})`  : '' });
  const expertName      = booking.expert?.user?.account_deleted
    ? t('detailSheet.deletedSpecialist')
    : (booking.expert?.user?.name || 'Expert');
  const duration        = formatDuration(booking.service?.duration_minutes);
  const canReschedule   = booking.status === 'CONFIRMED' && isFuture && hrs >= 12;

  const openReschedule = () => {
    setShowCancel(false);
    setMonthArgs(null);
    setRescheduleSlot(null);
    setShowReschedule(true);
  };

  const openCancel = () => { setShowReschedule(false); setShowCancel(true); };

  const handleConfirmCancel = async () => {
    if (!reason.trim()) {
      setCancelErr(t('card.reasonRequired'));
      return;
    }
    setCancelErr('');
    try {
      await cancelBooking({ id: booking.id, reason: reason.trim() }).unwrap();
      setShowCancel(false);
    } catch (err) {
      setCancelErr(err?.data?.error || t('card.cancelError'));
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleSlot) return;
    try {
      await rescheduleBooking({ id: booking.id, newScheduledAt: rescheduleSlot.start }).unwrap();
      setShowReschedule(false);
      setRescheduleSlot(null);
      toast.success(t('card.rescheduledTitle'));
    } catch (err) {
      toast.error(err?.data?.error || t('card.rescheduleError'));
    }
  };

  const sk = statusKey(booking);

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden shadow-sm hover:shadow-md transition-shadow">

      {/* Card body */}
      <div className="p-5 cursor-pointer hover:bg-[#F5F7F5]/60 transition-colors" onClick={() => onViewDetails(booking)}>
        <div className="flex items-start gap-4">
          <ExpertAvatar name={expertName} profileImage={booking.expert?.profile_image} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-base font-semibold text-[#1F2933] leading-snug">{expertName}</p>
                <p className="text-sm text-gray-500 mt-0.5">{booking.service?.title || t('detailSheet.sessionSection')}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_STYLES[sk] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {t(`status.${sk}`, { defaultValue: booking.status })}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <span>{formatDate(booking.scheduled_at, lng)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span>{formatTime(booking.scheduled_at)}</span>
              </div>
              {duration && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {duration}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                booking.format === 'ONLINE'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-[#445446]/10 text-[#445446]'
              }`}>
                {booking.format === 'ONLINE' ? t('detailSheet.formatOnline') : t('detailSheet.formatInPerson')}
              </span>
            </div>
          </div>
        </div>

        {/* Online reminder */}
        {booking.status === 'CONFIRMED' && booking.format === 'ONLINE' && isFuture && (
          <div className="mt-4 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-start gap-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            {t('card.onlineReminder')}
          </div>
        )}

        {/* In-person address */}
        {booking.status === 'CONFIRMED' && booking.format === 'IN_PERSON' && isFuture && (() => {
          const address = [booking.expert?.address_street, booking.expert?.address_city, booking.expert?.address_postcode].filter(Boolean).join(', ');
          return address ? (
            <div className="mt-4 px-3 py-2.5 bg-[#445446]/5 border border-[#445446]/20 rounded-xl text-xs text-[#445446] flex items-start gap-2">
              <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span><span className="font-medium">{t('card.addressLabel')}</span> {address}</span>
            </div>
          ) : null;
        })()}

        {/* View details hint */}
        <div className="mt-4 flex items-center justify-end gap-1 text-xs text-gray-400">
          <span>{t('card.viewDetails')}</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>

      {/* Actions footer */}
      {(canCancel || canReschedule || inLockoutWindow) && (
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-[#E4E7E4] pt-4 space-y-3">

            {/* Lockout notice */}
            {inLockoutWindow && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-amber-800">{t('card.lockoutTitle')}</p>
                  <p className="text-xs text-amber-700 mt-0.5">{t('card.lockoutMessage')}</p>
                </div>
              </div>
            )}

            {/* Action row */}
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
                    {t('card.rescheduleBtn')}
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={openCancel}
                    className="text-xs text-gray-400 hover:text-red-500 underline underline-offset-2 transition-colors"
                  >
                    {t('card.cancelBookingBtn')}
                  </button>
                )}
              </div>
            )}

            {/* Reschedule panel */}
            {showReschedule && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#1F2933]">{t('card.rescheduleTitle')}</p>

                <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F7F5] border border-[#E4E7E4] rounded-lg text-xs text-gray-500">
                  <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span>
                    <Trans
                      i18nKey="card.currentlyBooked"
                      ns="parentBookings"
                      values={{ datetime: formatLocaleStr(booking.scheduled_at, lng) }}
                      components={[<span />, <span className="font-medium text-[#1F2933]" />]}
                    />
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

                {slotsLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                    <span className="text-xs text-gray-500">{t('card.loadingTimes')}</span>
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">{t('card.noSlotsOnDate')}</p>
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

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowReschedule(false); setRescheduleSlot(null); }}
                    className="flex-1 py-2 text-xs font-medium border border-[#E4E7E4] rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {t('card.keepCurrentTime')}
                  </button>
                  <button
                    onClick={handleConfirmReschedule}
                    disabled={!rescheduleSlot || rescheduling}
                    className="flex-1 py-2 text-xs font-medium bg-[#445446] hover:bg-[#3a4a3b] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {rescheduling ? t('card.rescheduling') : t('card.confirmReschedule')}
                  </button>
                </div>
              </div>
            )}

            {/* Cancel panel */}
            {showCancel && (
              <div className="space-y-2">
                <div className={`px-3 py-2 rounded-lg text-xs ${hrs >= 24 ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                  {refundTierMsg}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F2933] mb-1">
                    {t('card.reasonLabel')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => { setReason(e.target.value.slice(0, 200)); if (cancelErr) setCancelErr(''); }}
                    placeholder={t('card.reasonPlaceholder')}
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
                    {t('card.keepBooking')}
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    disabled={cancelling || !reason.trim()}
                    className="flex-1 py-2 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {cancelling ? t('card.cancelling') : t('card.confirmCancel')}
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
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('parentBookings');
  const lng = i18n.language;

  const expertName       = booking.expert?.user?.name || 'Expert';
  const duration         = formatDuration(booking.service?.duration_minutes);
  const isCompleted      = booking.status === 'COMPLETED';
  const expertDeleted    = !!booking.expert?.user?.account_deleted;
  const serviceInactive  = booking.service?.is_active === false;
  const canBookAgain     = isCompleted && !expertDeleted && !serviceInactive;
  const bookAgainBlocked = isCompleted && (expertDeleted || serviceInactive);
  const sk               = statusKey(booking);

  const handleBookAgain = () => {
    navigate('/book', {
      state: {
        restore: {
          expert:           { id: booking.expert_id, ...booking.expert },
          service:          { id: booking.service_id, ...booking.service },
          fromPastBookings: true,
        },
      },
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden opacity-90">

      {/* Card body */}
      <div className="p-5 cursor-pointer hover:bg-[#F5F7F5]/60 transition-colors" onClick={() => onViewDetails(booking)}>
        <div className="flex items-start gap-4">
          <ExpertAvatar name={expertName} profileImage={booking.expert?.profile_image} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-base font-semibold text-[#1F2933] leading-snug">{expertName}</p>
                <p className="text-sm text-gray-500 mt-0.5">{booking.service?.title || t('detailSheet.sessionSection')}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_STYLES[sk] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {t(`status.${sk}`, { defaultValue: booking.status })}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <span>{formatDate(booking.scheduled_at, lng)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span>{formatTime(booking.scheduled_at)}</span>
              </div>
              {duration && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {duration}
                </span>
              )}
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {booking.format === 'ONLINE' ? t('detailSheet.formatOnline') : t('detailSheet.formatInPerson')}
              </span>

              {/* Amount paid chip */}
              {booking.amount && booking.status !== 'REFUNDED' && booking.status !== 'CANCELLED' && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {t('pastCard.paidChip', { amount: fmtCurrency(booking.amount, booking.currency || 'EUR', lng) })}
                </span>
              )}

              {/* Refund chip */}
              {booking.status === 'REFUNDED' && booking.amount && (() => {
                const cur      = booking.currency || 'EUR';
                const refundAmt = booking.refund_amount || booking.amount;
                const isFull   = !booking.refund_amount || Number(booking.refund_amount) >= Number(booking.amount);
                const formatted = fmtCurrency(refundAmt, cur, lng);
                return (
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                    {isFull
                      ? t('pastCard.refundFullChip', { amount: formatted })
                      : t('pastCard.refundPartialChip', { amount: formatted })}
                  </span>
                );
              })()}
            </div>

            {/* Expert-cancelled refund notice */}
            {booking.status === 'REFUNDED' && booking.cancellation_reason === 'Cancelled by expert' && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <p className="text-xs text-green-700 leading-relaxed">
                  <span className="font-semibold">{t('pastCard.expertCancelledTitle')}</span>
                  {booking.amount
                    ? t('pastCard.expertCancelledRefund', { amount: fmtCurrency(booking.amount, booking.currency || 'EUR', lng) })
                    : t('pastCard.expertCancelledSimple')}
                </p>
              </div>
            )}

            {/* Parent-cancelled reason */}
            {booking.status === 'CANCELLED' && booking.cancellation_reason && booking.cancellation_reason !== 'Cancelled by expert' && (
              <div className="mt-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">{t('pastCard.cancellationReasonLabel')}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{booking.cancellation_reason}</p>
              </div>
            )}

            {/* Refund failed notice */}
            {booking.status === 'CANCELLED' && booking.refund_status === 'failed' && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <p className="text-xs text-red-700 leading-relaxed">
                  <span className="font-semibold">{t('pastCard.refundFailedTitle')}</span>
                  {' '}{t('pastCard.refundFailedMsg')}
                </p>
              </div>
            )}

            {/* Partial refund notice */}
            {booking.status === 'REFUNDED' && booking.cancellation_reason !== 'Cancelled by expert' && booking.refund_amount && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <p className="text-xs text-green-700 leading-relaxed">
                  {t('pastCard.partialRefundMsg', { amount: fmtCurrency(booking.refund_amount, booking.currency || 'EUR', lng) })}
                </p>
              </div>
            )}

            {/* View details hint */}
            <div className="mt-3 flex items-center justify-end gap-1 text-xs text-gray-400">
              <span>{t('pastCard.viewDetails')}</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Book again footer */}
      {(canBookAgain || bookAgainBlocked) && (
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-[#E4E7E4] pt-4">

            {bookAgainBlocked && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-gray-600">{t('pastCard.unavailableTitle')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {expertDeleted ? t('pastCard.expertDeleted') : t('pastCard.serviceInactive')}
                    {t('pastCard.unavailableSuffix')}
                  </p>
                </div>
              </div>
            )}

            {canBookAgain && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{t('pastCard.enjoyedSession')}</p>
                <button
                  onClick={handleBookAgain}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#445446] border border-[#445446]/40 hover:bg-[#445446]/8 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {t('pastCard.bookAgain')}
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
  const { t } = useTranslation('parentBookings');
  const { triggerPpCheck } = useAuth();

  // Fire any deferred Privacy Policy update modal
  useEffect(() => { triggerPpCheck(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: bookings = [], isLoading, isError } = useGetMyBookingsQuery();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Verify stale pending-payment bookings; tag invalidation auto-refreshes the list
  useEffect(() => {
    if (!bookings.length) return;
    const stale = bookings.filter(
      (b) =>
        b.status === 'PENDING_PAYMENT' &&
        Date.now() - new Date(b.created_at).getTime() > 2 * 60 * 1000
    );
    stale.forEach((b) => {
      verifyPayment(b.id).unwrap().catch(() => {});
    });
  }, [bookings]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = new Date();
  const sessionEndTime = (b) =>
    new Date(b.scheduled_at).getTime() + (b.duration_minutes || 0) * 60 * 1000;

  const upcoming = bookings.filter((b) =>
    b.status === 'CONFIRMED' && sessionEndTime(b) > now.getTime()
  );
  const past = bookings.filter((b) =>
    b.status !== 'PENDING_PAYMENT' &&
    (b.status !== 'CONFIRMED' || sessionEndTime(b) <= now.getTime())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  const isUpcoming = view === 'upcoming';
  const displayed  = isUpcoming ? upcoming : past;

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-xl font-semibold text-[#445446]">
          {isUpcoming ? t('page.upcomingTitle') : t('page.pastTitle')}
        </h2>
        <p className="text-sm text-[#5e6d5b] font-medium mt-1">
          {isUpcoming ? t('page.upcomingSubtitle') : t('page.pastSubtitle')}
        </p>
      </div>

      {isError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {t('page.loadError')}
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-[#c5ceba] flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[#dfe2d7]/50 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-[#c5ceba]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#445446]">{isUpcoming ? t('page.emptyUpcoming') : t('page.emptyPast')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {isUpcoming
            ? displayed.map((b) => <BookingCard key={b.id} booking={b} onViewDetails={setSelectedBooking} />)
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
