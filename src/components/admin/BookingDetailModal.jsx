import { useState, useEffect, useCallback } from "react";
import {
  getBookingDetail,
  adminCancelBooking,
  markBookingDisputed,
  updateBookingNote,
  adminManualRefund,
} from "../../api/adminApi";
import { formatBookingTime, formatFormat, formatTransferStatus } from "../../utils/formatBookingTime";

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
  const cfg = {
    CONFIRMED:       { cls: "bg-green-100 text-green-700",  label: "Confirmed" },
    COMPLETED:       { cls: "bg-blue-100 text-blue-700",    label: "Completed" },
    CANCELLED:       { cls: "bg-red-100 text-red-600",      label: "Cancelled" },
    REFUNDED:        { cls: "bg-gray-100 text-gray-600",    label: "Refunded" },
    PENDING_PAYMENT: { cls: "bg-amber-100 text-amber-700",  label: "Pending Payment" },
    PENDING:         { cls: "bg-amber-100 text-amber-700",  label: "Pending" },
  }[status] || { cls: "bg-gray-100 text-gray-500", label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

export const DisputedBadge = () => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
    Disputed
  </span>
);

// ─── Modal ────────────────────────────────────────────────────────────────────

function BookingDetailModal({ bookingId, onClose, onUpdated }) {
  const [booking, setBooking]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError]     = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [showCancelForm, setShowCancelForm]   = useState(false);
  const [cancelReason, setCancelReason]       = useState("");

  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason]     = useState("");

  const [showRefundForm, setShowRefundForm]   = useState(false);
  const [refundReason, setRefundReason]       = useState("");
  const [refundAmount, setRefundAmount]       = useState("");
  const [refundAmountError, setRefundAmountError] = useState("");
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [pendingRefundAmount, setPendingRefundAmount] = useState(undefined);

  const [note, setNote]         = useState("");
  const [noteDirty, setNoteDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBookingDetail(bookingId);
      setBooking(data);
      setNote(data.internal_admin_note || "");
    } catch {
      setActionError("Failed to load booking details.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  const clearFeedback = () => { setActionError(""); setActionSuccess(""); };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    clearFeedback();
    setActionLoading("cancel");
    try {
      await adminCancelBooking(bookingId, cancelReason.trim());
      setActionSuccess("Booking cancelled successfully.");
      setShowCancelForm(false);
      setCancelReason("");
      await load();
      onUpdated();
    } catch (e) {
      setActionError(e?.response?.data?.error || "Failed to cancel booking.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispute = async () => {
    clearFeedback();
    setActionLoading("dispute");
    try {
      await markBookingDisputed(bookingId, true, disputeReason.trim() || undefined);
      setActionSuccess("Booking marked as disputed. Pending payout is paused.");
      setShowDisputeForm(false);
      setDisputeReason("");
      await load();
      onUpdated();
    } catch (e) {
      setActionError(e?.response?.data?.error || "Failed to mark as disputed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveDispute = async () => {
    clearFeedback();
    setActionLoading("resolve");
    try {
      await markBookingDisputed(bookingId, false);
      setActionSuccess("Dispute resolved.");
      await load();
      onUpdated();
    } catch (e) {
      setActionError(e?.response?.data?.error || "Failed to resolve dispute.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefundSubmit = () => {
    setRefundAmountError("");
    const bookingTotal = parseFloat(booking.amount);
    let parsedAmount = undefined;
    if (refundAmount.trim() !== "") {
      parsedAmount = parseFloat(refundAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setRefundAmountError("Amount must be greater than £0.00.");
        return;
      }
      if (parsedAmount > bookingTotal) {
        setRefundAmountError(`Amount cannot exceed the booking total (£${bookingTotal.toFixed(2)}).`);
        return;
      }
    }
    setPendingRefundAmount(parsedAmount);
    setShowRefundConfirm(true);
  };

  const handleRefundConfirm = async () => {
    setShowRefundConfirm(false);
    clearFeedback();
    setActionLoading("refund");
    const bookingTotal = parseFloat(booking.amount);
    try {
      await adminManualRefund(bookingId, refundReason.trim() || undefined, pendingRefundAmount);
      const isPartial = pendingRefundAmount != null && pendingRefundAmount < bookingTotal;
      setActionSuccess(isPartial
        ? `Partial refund of £${pendingRefundAmount.toFixed(2)} issued successfully.`
        : "Full refund issued successfully.");
      setShowRefundForm(false);
      setRefundReason("");
      setRefundAmount("");
      setPendingRefundAmount(undefined);
      await load();
      onUpdated();
    } catch (e) {
      setActionError(e?.response?.data?.error || "Failed to issue refund. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveNote = async () => {
    clearFeedback();
    setActionLoading("note");
    try {
      await updateBookingNote(bookingId, note);
      setActionSuccess("Note saved.");
      setNoteDirty(false);
      onUpdated();
    } catch (e) {
      setActionError(e?.response?.data?.error || "Failed to save note.");
    } finally {
      setActionLoading(null);
    }
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
              Booking #{bookingId}
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

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          </div>
        ) : !booking ? (
          <div className="p-6 text-center text-sm text-red-500">{actionError || "Booking not found."}</div>
        ) : (
          <div className="divide-y divide-[#E4E7E4]">

            {/* Feedback */}
            {(actionError || actionSuccess) && (
              <div className="px-6 py-3">
                {actionError && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{actionError}</p>
                )}
                {actionSuccess && (
                  <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{actionSuccess}</p>
                )}
              </div>
            )}

            {/* Parties */}
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Parent / Client</p>
                <p className="text-sm font-medium text-[#1F2933]">{booking.parent?.name || "—"}</p>
                <p className="text-xs text-gray-400 mt-0.5">{booking.parent?.email || "—"}</p>
                {booking.parent?.phone && (
                  <p className="text-xs text-gray-400 mt-0.5">{booking.parent.phone}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Specialist</p>
                <p className="text-sm font-medium text-[#1F2933]">{booking.expert?.user?.name || "—"}</p>
                <p className="text-xs text-gray-400 mt-0.5">{booking.expert?.user?.email || "—"}</p>
              </div>
            </div>

            {/* Session details */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Session Details</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Service</span>
                  <span className="font-medium text-[#1F2933]">{booking.service?.title || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Format</span>
                  <span className="font-medium text-[#1F2933]">{formatFormat(booking.format)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date &amp; Time</span>
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
                  <span className="text-gray-500">Duration</span>
                  <span className="font-medium text-[#1F2933]">{booking.duration_minutes} min</span>
                </div>
              </div>
            </div>

            {/* Payment details */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount charged</span>
                  <span className="font-medium text-[#1F2933]">{formatCurrency(booking.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform fee</span>
                  <span className="font-medium text-[#1F2933]">{formatCurrency(booking.platform_fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment status</span>
                  <span className="font-medium text-[#1F2933]">
                    {(() => {
                      if (!booking.stripe_payment_intent_id) return "No payment";
                      if (["CONFIRMED", "COMPLETED"].includes(booking.status)) {
                        if (booking.transfer_status === "failed") return "Captured — transfer failed";
                        return "Payment captured";
                      }
                      if (booking.status === "CANCELLED" || booking.status === "REFUNDED") {
                        if (booking.refund_status === "succeeded") return "Captured — refunded";
                        if (booking.refund_status === "pending")   return "Captured — refund pending";
                        return "Captured — cancelled";
                      }
                      return "Payment captured";
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Transfer status</span>
                  <span className="font-medium text-[#1F2933]">{formatTransferStatus(booking)}</span>
                </div>
              </div>
              {booking.stripe_payment_intent_id && (
                <p className="text-xs text-gray-400 mt-2 font-mono break-all">
                  PI: {booking.stripe_payment_intent_id}
                </p>
              )}
            </div>

            {/* Refund details — always shown when booking had a payment and is cancelled/refunded */}
            {(booking.status === "CANCELLED" || booking.status === "REFUNDED") && booking.stripe_payment_intent_id && (
              <div className="px-6 py-4 border-t border-[#E4E7E4]">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Refund</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Refund status</span>
                    {booking.refund_status === "succeeded" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        Refunded
                      </span>
                    ) : booking.refund_status === "pending" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        Refund pending
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
                          Refunded
                        </span>
                        <span className="text-gray-400 font-normal">(details not recorded)</span>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Not refunded</span>
                    )}
                  </div>
                  {booking.refund_amount != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount refunded</span>
                      <span className="font-medium text-[#1F2933]">
                        {formatCurrency(booking.refund_amount)}
                        {parseFloat(booking.refund_amount) < parseFloat(booking.amount) && (
                          <span className="ml-1.5 text-xs text-amber-600 font-normal">(partial)</span>
                        )}
                      </span>
                    </div>
                  )}
                  {booking.refunded_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Refund date</span>
                      <span className="font-medium text-[#1F2933]">{formatDate(booking.refunded_at)}</span>
                    </div>
                  )}
                  {booking.stripe_refund_id && (
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-gray-500 flex-shrink-0">Stripe Refund ID</span>
                      <span className="text-xs text-gray-500 font-mono break-all text-right">{booking.stripe_refund_id}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cancellation info */}
            {(booking.status === "CANCELLED" || booking.status === "REFUNDED") && (
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cancellation</p>
                {booking.cancellation_reason ? (
                  <p className="text-sm text-[#1F2933]">{booking.cancellation_reason}</p>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    No reason provided — follow up may be required
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
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">Dispute</p>
                <p className="text-sm text-[#1F2933]">{booking.dispute_reason || "No reason provided"}</p>
                {booking.disputed_at && (
                  <p className="text-xs text-gray-400 mt-1">Flagged on {formatDate(booking.disputed_at)}</p>
                )}
              </div>
            )}

            {/* Internal admin note */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Internal Note
                <span className="ml-1.5 text-[10px] normal-case font-normal text-gray-400">(not visible to parent or specialist)</span>
              </p>
              <textarea
                value={note}
                onChange={(e) => { setNote(e.target.value); setNoteDirty(true); setActionSuccess(""); }}
                rows={3}
                placeholder="Add an internal note…"
                className="w-full text-sm border border-[#E4E7E4] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] placeholder-gray-300"
              />
              {noteDirty && (
                <button
                  onClick={handleSaveNote}
                  disabled={actionLoading === "note"}
                  className="mt-2 px-4 py-1.5 text-xs font-medium bg-[#445446] text-white rounded-lg hover:bg-[#3a4a3b] disabled:opacity-50 transition-colors"
                >
                  {actionLoading === "note" ? "Saving…" : "Save note"}
                </button>
              )}
            </div>

            {/* Admin actions */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Admin Actions</p>
              <div className="flex flex-wrap gap-2">

                {["CONFIRMED", "PENDING_PAYMENT"].includes(booking.status) && (
                  <button
                    onClick={() => { setShowCancelForm((v) => !v); setShowDisputeForm(false); setShowRefundForm(false); }}
                    className="px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Cancel Booking
                  </button>
                )}

                {booking.status === "CONFIRMED" && booking.stripe_payment_intent_id && (
                  <button
                    onClick={() => { setShowRefundForm((v) => !v); setShowCancelForm(false); setShowDisputeForm(false); }}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Refund Only
                  </button>
                )}

                {!booking.is_disputed && ["CONFIRMED", "COMPLETED"].includes(booking.status) && (
                  <button
                    onClick={() => { setShowDisputeForm((v) => !v); setShowCancelForm(false); setShowRefundForm(false); }}
                    className="px-3 py-1.5 text-xs font-medium border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
                  >
                    Mark as Disputed
                  </button>
                )}
                {booking.is_disputed && (
                  <button
                    onClick={handleResolveDispute}
                    disabled={actionLoading === "resolve"}
                    className="px-3 py-1.5 text-xs font-medium border border-green-300 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === "resolve" ? "Resolving…" : "Resolve Dispute"}
                  </button>
                )}
              </div>

              {showCancelForm && (
                <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs font-medium text-red-700 mb-2">
                    {booking.status === "CONFIRMED" && booking.stripe_payment_intent_id
                      ? "Cancel and refund this booking. A full refund will be issued to the parent."
                      : "Cancel this booking."}
                  </p>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={2}
                    placeholder="Reason for cancellation (required)…"
                    className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-300 placeholder-red-300 bg-white"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleCancel}
                      disabled={!cancelReason.trim() || actionLoading === "cancel"}
                      className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === "cancel" ? "Cancelling…" : "Confirm Cancel"}
                    </button>
                    <button
                      onClick={() => { setShowCancelForm(false); setCancelReason(""); }}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {showRefundForm && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Issue a refund to the parent. Leave the amount blank for a full refund, or enter a lower amount for a partial refund.
                  </p>
                  <div className="mb-2">
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Refund amount (£) <span className="font-normal text-gray-400">— leave blank for full refund (£{parseFloat(booking.amount).toFixed(2)})</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={parseFloat(booking.amount)}
                      value={refundAmount}
                      onChange={(e) => { setRefundAmount(e.target.value); setRefundAmountError(""); }}
                      placeholder={parseFloat(booking.amount).toFixed(2)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 bg-white"
                    />
                    {refundAmountError && (
                      <p className="text-xs text-red-600 mt-1">{refundAmountError}</p>
                    )}
                  </div>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows={2}
                    placeholder="Reason (optional)…"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#445446]/30 placeholder-gray-300 bg-white"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleRefundSubmit}
                      disabled={actionLoading === "refund"}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === "refund" ? "Refunding…" : "Confirm Refund"}
                    </button>
                    <button
                      onClick={() => { setShowRefundForm(false); setRefundReason(""); setRefundAmount(""); setRefundAmountError(""); }}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {showDisputeForm && (
                <div className="mt-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-xs font-medium text-orange-700 mb-2">
                    Flag this booking as disputed. Any pending payout to the specialist will be paused.
                  </p>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    rows={2}
                    placeholder="Reason for dispute (optional)…"
                    className="w-full text-sm border border-orange-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder-orange-300 bg-white"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleDispute}
                      disabled={actionLoading === "dispute"}
                      className="px-3 py-1.5 text-xs font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === "dispute" ? "Flagging…" : "Confirm Dispute"}
                    </button>
                    <button
                      onClick={() => { setShowDisputeForm(false); setDisputeReason(""); }}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Refund confirmation modal */}
      {showRefundConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">
              {pendingRefundAmount != null ? "Confirm Partial Refund" : "Confirm Full Refund"}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              {pendingRefundAmount != null
                ? `Issue a partial refund of £${pendingRefundAmount.toFixed(2)} for booking #${bookingId}?`
                : `Issue a full refund of £${parseFloat(booking.amount).toFixed(2)} for booking #${bookingId}?`}
              {" "}This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRefundConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefundConfirm}
                className="flex-1 py-2.5 px-4 rounded-lg bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
              >
                Yes, issue refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingDetailModal;
