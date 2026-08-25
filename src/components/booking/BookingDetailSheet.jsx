import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatDate, formatTime, formatDuration, hoursUntil, fmtCurrency, statusKey, STATUS_STYLES,
} from '../../utils/bookingDisplay';
import PersonAvatar from './PersonAvatar';
import CancellationPolicy from './CancellationPolicy';
import BookingInvoicingInfo from './BookingInvoicingInfo';

const DetailRow = ({ label, value, valueClass }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-xs text-gray-400 flex-shrink-0 pt-px">{label}</span>
    <span className={`text-sm text-right leading-snug ${valueClass || 'text-[#1F2933]'}`}>{value}</span>
  </div>
);

// ─── Booking Detail Sheet ─────────────────────────────────────────────────────
// Read-only overview of one booking. Shared between the parent's "My Bookings"
// page and the expert dashboard's appointment sections — role picks which
// counterpart block (specialist vs. client) and which extra sections
// (cancellation policy vs. invoicing) apply.
const BookingDetailSheet = ({ booking, onClose, role = 'parent' }) => {
  const { t, i18n } = useTranslation('parentBookings');
  const lng = i18n.language;
  const [copied, setCopied] = useState(false);
  const isExpertView = role === 'expert';

  const ref        = `SN-${new Date(booking.created_at).getFullYear()}-${String(booking.id).padStart(5, '0')}`;
  const currency   = booking.currency || 'EUR';
  const counterpartName = isExpertView
    ? (booking.parent?.name || '—')
    : (booking.expert?.user?.account_deleted
        ? t('detailSheet.deletedSpecialist')
        : (booking.expert?.user?.name || t('detailSheet.deletedSpecialist')));
  const counterpartEmail = isExpertView ? booking.parent?.email : null;
  const counterpartLabel = isExpertView ? t('detailSheet.clientSection') : t('detailSheet.specialistSection');
  const avatarImage = isExpertView ? undefined : booking.expert?.profile_image;
  const duration   = formatDuration(booking.service?.duration_minutes);
  const hrs        = hoursUntil(booking.scheduled_at);
  const isUpcoming = booking.status === 'CONFIRMED' && hrs > 0;
  const sk         = statusKey(booking);
  const location   = !isExpertView
    ? [
        booking.expert?.address_street,
        booking.expert?.address_city,
        booking.expert?.address_postcode,
      ].filter(Boolean).join(', ')
    : '';

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

          {/* Counterpart: specialist (parent view) or client (expert view) */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]">
            <PersonAvatar name={counterpartName} profileImage={avatarImage} size="md" />
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{counterpartLabel}</p>
              <p className="text-sm font-semibold text-[#1F2933]">{counterpartName}</p>
              {counterpartEmail && (
                <a href={`mailto:${counterpartEmail}`} className="text-xs text-[#445446] hover:underline">
                  {counterpartEmail}
                </a>
              )}
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
                value={booking.format === 'ONLINE' ? t('detailSheet.formatOnline') : booking.format === 'HOME_VISIT' ? t('detailSheet.formatHomeVisit') : t('detailSheet.formatInPerson')}
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

          {/* Invoicing — expert view only */}
          {isExpertView && <BookingInvoicingInfo booking={booking} />}

          {/* Cancellation reason */}
          {booking.cancellation_reason && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('detailSheet.cancellationSection')}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{booking.cancellation_reason}</p>
            </div>
          )}

          {/* Cancellation policy — parent view only, upcoming confirmed sessions */}
          {isUpcoming && !isExpertView && (
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

export default BookingDetailSheet;
