import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetBookingByIdQuery, useVerifyPaymentMutation } from '../../api/bookingApi';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS        = 40; // ~2 minutes total

function formatLocation(expert) {
  return [expert?.address_street, expert?.address_city, expert?.address_postcode]
    .filter(Boolean).join(', ');
}

function formatDate(isoStr, lng = 'en') {
  return new Date(isoStr).toLocaleString(lng === 'it' ? 'it-IT' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatPrice(amount, currency = 'EUR', lng = 'en') {
  return new Intl.NumberFormat(lng === 'it' ? 'it' : 'en', { style: 'currency', currency }).format(Number(amount));
}

function formatDuration(mins, t) {
  if (!mins) return '';
  if (!t) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    return m ? `${h}h ${m}min` : `${h}h`;
  }
  if (mins < 60) return t('slotStep.duration.minutes', { count: mins });
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? t('slotStep.duration.hoursMinutes', { h, m }) : t('slotStep.duration.hours', { h });
}

function bookingRef(booking) {
  const year = new Date(booking.created_at).getFullYear();
  return `SN-${year}-${String(booking.id).padStart(5, '0')}`;
}

// ─── Status icons / banners ───────────────────────────────────────────────────
const SuccessBanner = ({ booking }) => {
  const { t, i18n } = useTranslation('parentBookings');
  const lng = i18n.language;
  const expertName = booking.expert?.user?.account_deleted
    ? t('bookingStatus.success.deletedSpecialist')
    : booking.expert?.user?.name;
  const location    = formatLocation(booking.expert);
  const formatLabel = booking.format === 'ONLINE' ? t('slotStep.formatOnline') : t('slotStep.formatInPerson');
  const duration    = formatDuration(booking.duration_minutes, t);

  return (
    <div className="text-center">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#445446]/10 mb-4">
        <svg className="w-8 h-8 text-[#445446]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-[#1F2933] mb-2">{t('bookingStatus.success.title')}</h2>

      {/* Booking reference chip */}
      <span className="inline-block text-xs font-medium text-gray-500 bg-gray-100 border border-[#E4E7E4] px-3 py-1 rounded-full mb-6">
        {t('bookingStatus.success.refChip', { ref: bookingRef(booking) })}
      </span>

      {/* Detail table */}
      <div className="border border-[#E4E7E4] rounded-xl overflow-hidden mb-4 text-sm text-left">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E7E4]">
          <span className="text-gray-500">{t('bookingStatus.success.expertLabel')}</span>
          <span className="font-medium text-[#1F2933] text-right">{expertName}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E7E4]">
          <span className="text-gray-500">{t('bookingStatus.success.serviceLabel')}</span>
          <span className="font-medium text-[#1F2933] text-right max-w-[60%]">{booking.service?.title}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E7E4]">
          <span className="text-gray-500">{t('bookingStatus.success.dateLabel')}</span>
          <span className="font-medium text-[#1F2933] text-right">{formatDate(booking.scheduled_at, lng)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E7E4]">
          <span className="text-gray-500">{t('bookingStatus.success.formatLabel')}</span>
          <span className="font-medium text-[#1F2933]">
            {formatLabel}{duration ? ` · ${duration}` : ''}
          </span>
        </div>
        {booking.format === 'IN_PERSON' && location && (
          <div className="flex items-start justify-between px-4 py-3 border-b border-[#E4E7E4]">
            <span className="text-gray-500 flex-shrink-0">{t('bookingStatus.success.locationLabel')}</span>
            <span className="font-medium text-[#1F2933] text-right ml-4">{location}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-gray-500">{t('bookingStatus.success.totalLabel')}</span>
          <span className="font-semibold text-[#445446]">
            {formatPrice(booking.amount, booking.currency || 'EUR', lng)}
          </span>
        </div>
      </div>

      {/* Email + session link notice */}
      <div className="flex items-start gap-3 px-4 py-3 bg-[#445446]/5 border border-[#445446]/20 rounded-xl mb-6 text-left">
        <svg className="w-4 h-4 text-[#445446] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
        <p className="text-xs text-[#445446] leading-relaxed">
          {t('bookingStatus.success.emailNotice')}
        </p>
      </div>

      <Link to="/dashboard/parent/upcoming"
        className="block w-full bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold py-3 rounded-lg transition-colors text-center">
        {t('bookingStatus.success.viewBtn')}
      </Link>
    </div>
  );
};

const FailedBanner = ({ status }) => {
  const { t } = useTranslation('parentBookings');
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-[#1F2933] mb-1">
        {status === 'CANCELLED' ? t('bookingStatus.failed.titleCancelled') : t('bookingStatus.failed.titleFailed')}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {status === 'REFUNDED'
          ? t('bookingStatus.failed.bodyRefunded')
          : t('bookingStatus.failed.bodyFailed')}
      </p>
      <Link to="/dashboard/parent/browse"
        className="inline-block bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors">
        {t('bookingStatus.failed.tryAgainBtn')}
      </Link>
    </div>
  );
};

const PendingBanner = () => {
  const { t } = useTranslation('parentBookings');
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 mb-4">
        <div className="w-8 h-8 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" style={{ borderWidth: 3 }} />
      </div>
      <h2 className="text-xl font-bold text-[#1F2933] mb-1">{t('bookingStatus.pending.title')}</h2>
      <p className="text-sm text-gray-500">
        {t('bookingStatus.pending.body')}
      </p>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const BookingStatusPage = () => {
  const { id: paramId }   = useParams();
  const [searchParams]    = useSearchParams();
  const { t }             = useTranslation('parentBookings');
  // Support both /booking/status/:id (paramId) and /booking-confirmed?bookingId=X (query param)
  const id = paramId || searchParams.get('bookingId');

  // Check if Stripe redirected here after payment (adds ?redirect_status=succeeded etc.)
  const redirectStatus = searchParams.get('redirect_status');

  const [shouldPoll,   setShouldPoll]   = useState(true);
  const [finalStatus,  setFinalStatus]  = useState(null);
  const pollCount = useRef(0);

  const { data: booking, isError } = useGetBookingByIdQuery(id, {
    pollingInterval: shouldPoll ? POLL_INTERVAL_MS : 0,
    skip: !id,
  });
  const [verifyPayment] = useVerifyPaymentMutation();

  // RTK polls every POLL_INTERVAL_MS; each new response triggers this effect.
  // Stop polling when status resolves or max polls exhausted.
  useEffect(() => {
    if (!booking || !shouldPoll) return;

    if (booking.status !== 'PENDING_PAYMENT') {
      setShouldPoll(false);
      return;
    }

    pollCount.current += 1;
    if (pollCount.current >= MAX_POLLS) {
      setShouldPoll(false);
      // Polling exhausted — ask the backend to verify directly with Stripe
      // in case the webhook was delayed or missed.
      verifyPayment(id).unwrap()
        .then((result) => setFinalStatus(result.status))
        .catch(() => {});
    }
  }, [booking]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = finalStatus ?? booking?.status ?? 'PENDING_PAYMENT';
  const error  = isError ? t('bookingStatus.loadError') : '';

  return (
    <div className="min-h-screen bg-[#F5F7F5] flex flex-col items-center justify-center py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E4E7E4] shadow-lg px-8 py-10">

        {/* Logo */}
        <p className="text-center font-bold text-[#1F2933] tracking-tight mb-8">Sage Nest</p>

        {error ? (
          <div className="text-center">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Link to="/dashboard/parent/upcoming" className="text-sm text-[#445446] underline">
              {t('bookingStatus.goToBookings')}
            </Link>
          </div>
        ) : !booking ? (
          <PendingBanner />
        ) : status === 'CONFIRMED' ? (
          <SuccessBanner booking={booking} />
        ) : (status === 'CANCELLED' || status === 'REFUNDED') ? (
          <FailedBanner status={status} />
        ) : (
          <>
            <PendingBanner />
            {redirectStatus === 'succeeded' && (
              <p className="text-xs text-gray-400 text-center mt-4">
                {t('bookingStatus.pending.paymentReceived')}
              </p>
            )}
            {pollCount.current >= MAX_POLLS && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 mb-2">
                  {t('bookingStatus.pending.takingLonger')}
                </p>
                <Link to="/dashboard/parent/upcoming" className="text-sm text-[#445446] underline">
                  {t('bookingStatus.pending.checkBookings')}
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BookingStatusPage;
