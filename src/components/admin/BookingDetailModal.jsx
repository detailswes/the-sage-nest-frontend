import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useGetBookingDetailQuery, useUpdateBookingNoteMutation } from "../../api/adminApi";
import { formatBookingTime, formatFormat, formatTransferStatus } from "../../utils/formatBookingTime";
import AdminActionsPanel from "./AdminActionsPanel";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export const formatCurrency = (amount) =>
  amount != null ? `£${parseFloat(amount).toFixed(2)}` : "—";

// ─── Shared badges ────────────────────────────────────────────────────────────

export const BookingStatusBadge = ({ status }) => {
  const { t } = useTranslation("adminDashboard");
  const cls = {
    CONFIRMED:       "bg-green-100 text-green-700",
    COMPLETED:       "bg-blue-100 text-blue-700",
    CANCELLED:       "bg-red-100 text-red-600",
    REFUNDED:        "bg-gray-100 text-gray-600",
    PENDING_PAYMENT: "bg-amber-100 text-amber-700",
    PENDING:         "bg-amber-100 text-amber-700",
  }[status] || "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>
      {t(`bookingModal.bookingStatus.${status}`, { defaultValue: status })}
    </span>
  );
};

export const DisputedBadge = () => {
  const { t } = useTranslation("adminDashboard");
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-orange-100 text-orange-700">
      {t("bookingModal.disputed")}
    </span>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function BookingDetailModal({ bookingId, onClose, onUpdated }) {
  const { t } = useTranslation("adminDashboard");

  const { data: booking, isLoading, isError } = useGetBookingDetailQuery(bookingId);
  const [updateBookingNote, { isLoading: noteSaving }] = useUpdateBookingNoteMutation();

  const [note,      setNote]      = useState("");
  const [noteDirty, setNoteDirty] = useState(false);

  // Sync note from server value (only when it changes, preserves in-progress edits)
  useEffect(() => {
    if (!noteDirty) {
      setNote(booking?.internal_admin_note || "");
    }
  }, [booking?.internal_admin_note]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveNote = async () => {
    try {
      await updateBookingNote({ id: bookingId, note }).unwrap();
      toast.success(t("bookingModal.noteSaved"));
      setNoteDirty(false);
      onUpdated();
    } catch (e) {
      toast.error(e?.data?.error || t("bookingModal.noteSaveError"));
    }
  };

  const getPaymentStatusLabel = () => {
    if (!booking?.stripe_payment_intent_id) return t("bookingModal.paymentStatus.noPayment");
    if (["CONFIRMED", "COMPLETED"].includes(booking.status)) {
      if (booking.transfer_status === "failed") return t("bookingModal.paymentStatus.capturedTransferFailed");
      return t("bookingModal.paymentStatus.captured");
    }
    if (booking.status === "CANCELLED" || booking.status === "REFUNDED") {
      if (booking.refund_status === "succeeded") return t("bookingModal.paymentStatus.capturedRefunded");
      if (booking.refund_status === "pending")   return t("bookingModal.paymentStatus.capturedRefundPending");
      return t("bookingModal.paymentStatus.capturedCancelled");
    }
    return t("bookingModal.paymentStatus.captured");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl flex items-center justify-between px-6 py-4 border-b border-[#E4E7E4]">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-[#1F2933]">
              {t("bookingModal.title", { id: bookingId })}
            </h2>
            {booking && <BookingStatusBadge status={booking.status} />}
            {booking?.is_disputed && <DisputedBadge />}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          </div>
        ) : isError || !booking ? (
          <div className="p-6 text-center text-sm text-red-500">{t("bookingModal.loadError")}</div>
        ) : (
          <div className="divide-y divide-[#E4E7E4]">

            {/* Parties */}
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("bookingModal.sections.parentClient")}</p>
                <p className="text-sm font-medium text-[#1F2933]">{booking.parent?.name || "—"}</p>
                <p className="text-xs text-gray-400 mt-0.5">{booking.parent?.email || "—"}</p>
                {booking.parent?.phone && (
                  <p className="text-xs text-gray-400 mt-0.5">{booking.parent.phone}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("bookingModal.sections.specialist")}</p>
                <p className="text-sm font-medium text-[#1F2933]">{booking.expert?.user?.name || "—"}</p>
                <p className="text-xs text-gray-400 mt-0.5">{booking.expert?.user?.email || "—"}</p>
              </div>
            </div>

            {/* Session details */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t("bookingModal.sections.sessionDetails")}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("bookingModal.labels.service")}</span>
                  <span className="font-medium text-[#1F2933]">{booking.service?.title || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("bookingModal.labels.format")}</span>
                  <span className="font-medium text-[#1F2933]">{formatFormat(booking.format, t)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("bookingModal.labels.dateTime")}</span>
                  <span className="text-right">
                    {(() => {
                      const { primary, utc } = formatBookingTime(booking.scheduled_at, booking.expert?.timezone);
                      return (
                        <>
                          <span className="font-medium text-[#1F2933] block">{primary}</span>
                          {utc && <span className="text-xs text-gray-400 block">{utc}</span>}
                        </>
                      );
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("bookingModal.labels.duration")}</span>
                  <span className="font-medium text-[#1F2933]">{booking.duration_minutes} {t("bookingModal.labels.min")}</span>
                </div>
              </div>
            </div>

            {/* Payment details */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t("bookingModal.sections.payment")}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("bookingModal.labels.amountCharged")}</span>
                  <span className="font-medium text-[#1F2933]">{formatCurrency(booking.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("bookingModal.labels.platformFee")}</span>
                  <span className="font-medium text-[#1F2933]">{formatCurrency(booking.platform_fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("bookingModal.labels.paymentStatus")}</span>
                  <span className="font-medium text-[#1F2933]">{getPaymentStatusLabel()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("bookingModal.labels.transferStatus")}</span>
                  <span className="font-medium text-[#1F2933]">{formatTransferStatus(booking, t)}</span>
                </div>
              </div>
              {booking.stripe_payment_intent_id && (
                <p className="text-xs text-gray-400 mt-2 font-mono break-all">
                  PI: {booking.stripe_payment_intent_id}
                </p>
              )}
            </div>

            {/* Refund details */}
            {(booking.status === "CANCELLED" || booking.status === "REFUNDED") && booking.stripe_payment_intent_id && (
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t("bookingModal.sections.refund")}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t("bookingModal.labels.refundStatus")}</span>
                    {booking.refund_status === "succeeded" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        {t("bookingModal.refundStatus.refunded")}
                      </span>
                    ) : booking.refund_status === "pending" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        {t("bookingModal.refundStatus.pending")}
                      </span>
                    ) : booking.refund_status ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        {booking.refund_status.charAt(0).toUpperCase() + booking.refund_status.slice(1)}
                      </span>
                    ) : booking.status === "REFUNDED" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-green-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                          {t("bookingModal.refundStatus.refunded")}
                        </span>
                        <span className="text-gray-400 font-normal">{t("bookingModal.refundStatus.detailsNotRecorded")}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">{t("bookingModal.refundStatus.notRefunded")}</span>
                    )}
                  </div>
                  {booking.refund_amount != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("bookingModal.labels.amountRefunded")}</span>
                      <span className="font-medium text-[#1F2933]">
                        {formatCurrency(booking.refund_amount)}
                        {parseFloat(booking.refund_amount) < parseFloat(booking.amount) && (
                          <span className="ml-1.5 text-xs text-amber-600 font-normal">{t("bookingModal.labels.partial")}</span>
                        )}
                      </span>
                    </div>
                  )}
                  {booking.refunded_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("bookingModal.labels.refundDate")}</span>
                      <span className="font-medium text-[#1F2933]">{formatDate(booking.refunded_at)}</span>
                    </div>
                  )}
                  {booking.stripe_refund_id && (
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-gray-500 flex-shrink-0">{t("bookingModal.labels.stripeRefundId")}</span>
                      <span className="text-xs text-gray-500 font-mono break-all text-right">{booking.stripe_refund_id}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cancellation info */}
            {(booking.status === "CANCELLED" || booking.status === "REFUNDED") && (
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("bookingModal.sections.cancellation")}</p>
                {booking.cancellation_reason ? (
                  <p className="text-sm text-[#1F2933]">{booking.cancellation_reason}</p>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    {t("bookingModal.cancellationNoReason")}
                  </span>
                )}
                {booking.cancelled_at && (
                  <p className="text-xs text-gray-400 mt-1">{formatDate(booking.cancelled_at)}</p>
                )}
              </div>
            )}

            {/* Dispute info */}
            {booking.is_disputed && (
              <div className="px-6 py-4 bg-orange-50">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">{t("bookingModal.sections.dispute")}</p>
                <p className="text-sm text-[#1F2933]">{booking.dispute_reason || t("bookingModal.disputeNoReason")}</p>
                {booking.disputed_at && (
                  <p className="text-xs text-gray-400 mt-1">{t("bookingModal.disputeFlaggedOn", { date: formatDate(booking.disputed_at) })}</p>
                )}
              </div>
            )}

            {/* Internal admin note */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {t("bookingModal.sections.internalNote")}
                <span className="ml-1.5 text-[10px] normal-case font-normal text-gray-400">{t("bookingModal.sections.internalNoteHint")}</span>
              </p>
              <textarea
                value={note}
                onChange={(e) => { setNote(e.target.value); setNoteDirty(true); }}
                rows={3}
                placeholder={t("bookingModal.notePlaceholder")}
                className="w-full text-sm border border-[#E4E7E4] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] placeholder-gray-300"
              />
              {noteDirty && (
                <button
                  onClick={handleSaveNote}
                  disabled={noteSaving}
                  className="mt-2 px-4 py-1.5 text-xs font-medium bg-[#445446] text-white rounded-lg hover:bg-[#3a4a3b] disabled:opacity-50 transition-colors"
                >
                  {noteSaving ? t("bookingModal.saving") : t("bookingModal.saveNote")}
                </button>
              )}
            </div>

            {/* Admin actions — RTK mutations in AdminActionsPanel invalidate Booking tag, triggering auto-refetch */}
            <AdminActionsPanel
              booking={booking}
              onActionComplete={() => {}}
            />

          </div>
        )}
      </div>
    </div>
  );
}

export default BookingDetailModal;
