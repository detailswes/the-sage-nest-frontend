import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  listAllBookings,
  getBookingDetail,
  adminCancelBooking,
  markBookingDisputed,
  updateBookingNote,
  adminManualRefund,
} from "../../../api/adminApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const formatCurrency = (amount) =>
  amount != null ? `£${parseFloat(amount).toFixed(2)}` : "—";

// ─── Status badge ─────────────────────────────────────────────────────────────

const BookingStatusBadge = ({ status }) => {
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

const DisputedBadge = () => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
    Disputed
  </span>
);

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTERS = [
  { key: "ALL",             label: "All" },
  { key: "UPCOMING",        label: "Upcoming" },
  { key: "CONFIRMED",       label: "Confirmed" },
  { key: "COMPLETED",       label: "Completed" },
  { key: "PENDING_PAYMENT", label: "Pending Payment" },
  { key: "CANCELLED",       label: "Cancelled" },
  { key: "REFUNDED",        label: "Refunded" },
  { key: "DISPUTED",        label: "Disputed" },
];

// ─── Detail modal ─────────────────────────────────────────────────────────────

function BookingDetailModal({ bookingId, onClose, onUpdated }) {
  const [booking, setBooking]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError]     = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Cancel form
  const [showCancelForm, setShowCancelForm]   = useState(false);
  const [cancelReason, setCancelReason]       = useState("");

  // Dispute form
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason]     = useState("");

  // Refund form
  const [showRefundForm, setShowRefundForm]   = useState(false);
  const [refundReason, setRefundReason]       = useState("");
  const [refundAmount, setRefundAmount]       = useState("");
  const [refundAmountError, setRefundAmountError] = useState("");

  // Internal note
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

  const handleRefund = async () => {
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
    clearFeedback();
    setActionLoading("refund");
    try {
      await adminManualRefund(bookingId, refundReason.trim() || undefined, parsedAmount);
      const isPartial = parsedAmount != null && parsedAmount < bookingTotal;
      setActionSuccess(isPartial ? `Partial refund of £${parsedAmount.toFixed(2)} issued successfully.` : "Full refund issued successfully.");
      setShowRefundForm(false);
      setRefundReason("");
      setRefundAmount("");
      await load();
      onUpdated();
    } catch (e) {
      setActionError(e?.response?.data?.error || "Failed to issue refund.");
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
                  <span className="font-medium text-[#1F2933]">{booking.format || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date &amp; Time</span>
                  <span className="font-medium text-[#1F2933]">{formatDateTime(booking.scheduled_at)}</span>
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
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount charged</span>
                  <span className="font-medium text-[#1F2933]">{formatCurrency(booking.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform fee</span>
                  <span className="font-medium text-[#1F2933]">{formatCurrency(booking.platform_fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Transfer status</span>
                  <span className="font-medium text-[#1F2933] capitalize">{booking.transfer_status || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment status</span>
                  <span className="font-medium text-[#1F2933]">
                    {booking.stripe_payment_intent_id ? "Payment captured" : "No payment"}
                  </span>
                </div>
                {booking.refund_status && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Refund status</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      booking.refund_status === "succeeded" ? "bg-green-100 text-green-700" :
                      booking.refund_status === "pending"   ? "bg-amber-100 text-amber-700" :
                                                              "bg-red-100 text-red-600"
                    }`}>
                      {booking.refund_status.charAt(0).toUpperCase() + booking.refund_status.slice(1)}
                    </span>
                  </div>
                )}
                {booking.refund_amount != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount refunded</span>
                    <span className="font-medium text-[#1F2933]">
                      {formatCurrency(booking.refund_amount)}
                      {parseFloat(booking.refund_amount) < parseFloat(booking.amount) && (
                        <span className="ml-1 text-xs text-amber-600 font-normal">(partial)</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              {booking.stripe_payment_intent_id && (
                <p className="text-xs text-gray-400 mt-2 font-mono break-all">
                  PI: {booking.stripe_payment_intent_id}
                </p>
              )}
            </div>

            {/* Cancellation info */}
            {(booking.status === "CANCELLED" || booking.status === "REFUNDED") && (
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cancellation</p>
                <p className="text-sm text-[#1F2933]">{booking.cancellation_reason || "No reason provided"}</p>
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

                {/* Cancel */}
                {["CONFIRMED", "PENDING_PAYMENT"].includes(booking.status) && (
                  <button
                    onClick={() => { setShowCancelForm((v) => !v); setShowDisputeForm(false); setShowRefundForm(false); }}
                    className="px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Cancel Booking
                  </button>
                )}

                {/* Manual refund */}
                {booking.status === "CONFIRMED" && booking.stripe_payment_intent_id && (
                  <button
                    onClick={() => { setShowRefundForm((v) => !v); setShowCancelForm(false); setShowDisputeForm(false); }}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Refund Only
                  </button>
                )}

                {/* Dispute / Resolve */}
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

              {/* Cancel form */}
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

              {/* Refund form */}
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
                      onClick={handleRefund}
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

              {/* Dispute form */}
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
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

const BookingsManagementSection = () => {
  const location = useLocation();

  const [bookings, setBookings]         = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching]         = useState(false);

  const [search, setSearch]             = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [fromDate, setFromDate]         = useState("");
  const [toDate, setToDate]             = useState("");

  const [selectedId, setSelectedId]     = useState(null);
  const debounceRef                     = useRef(null);

  const LIMIT = 25;

  const load = useCallback(async (opts = {}) => {
    const isInitial = opts.initial;
    if (isInitial) setInitialLoading(true); else setFetching(true);
    try {
      const resolvedSearch = opts.search !== undefined ? opts.search : search;
      const resolvedFilter = opts.filter ?? activeFilter;
      const resolvedPage   = opts.page   ?? page;
      const resolvedFrom   = opts.from   !== undefined ? opts.from  : fromDate;
      const resolvedTo     = opts.to     !== undefined ? opts.to    : toDate;
      const params = {
        page:   resolvedPage,
        limit:  LIMIT,
        search: resolvedSearch,
        ...(resolvedFilter === "DISPUTED"
          ? { disputed: "true", status: "ALL" }
          : { status: resolvedFilter }),
        ...(resolvedFrom ? { from: resolvedFrom } : {}),
        ...(resolvedTo   ? { to:   resolvedTo   } : {}),
      };
      const data = await listAllBookings(params);
      setBookings(data.bookings);
      setTotal(data.total);
    } catch {
      // silently keep existing list on error
    } finally {
      if (isInitial) setInitialLoading(false); else setFetching(false);
    }
  }, [page, search, activeFilter, fromDate, toDate]);

  // On mount: read ?search= from URL (e.g. coming from expert listing bookings count link)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("search") || "";
    setSearch(q);
    load({ initial: true, search: q });
  }, []); // eslint-disable-line

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      load({ search: val, page: 1, filter: activeFilter, from: fromDate, to: toDate });
    }, 400);
  };

  const handleFromChange = (e) => {
    const val = e.target.value;
    setFromDate(val);
    setPage(1);
    load({ page: 1, search, filter: activeFilter, from: val, to: toDate });
  };

  const handleToChange = (e) => {
    const val = e.target.value;
    setToDate(val);
    setPage(1);
    load({ page: 1, search, filter: activeFilter, from: fromDate, to: val });
  };

  const applyFilter = (key) => {
    setActiveFilter(key);
    setPage(1);
    load({ filter: key, page: 1, search, from: fromDate, to: toDate, initial: !bookings.length });
  };

  const goToPage = (p) => {
    setPage(p);
    load({ page: p, search, filter: activeFilter, from: fromDate, to: toDate });
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1F2933]">Booking Management</h1>
        <p className="text-sm text-gray-400 mt-1">
          Platform-wide booking list — search, filter and take action on any booking.
        </p>
      </div>

      {/* Search + date range */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex flex-1 min-w-[260px] items-center gap-2 bg-white border border-[#E4E7E4] rounded-xl px-3 py-2 shadow-sm">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by booking ID, parent or specialist name…"
            className="flex-1 text-sm bg-transparent outline-none placeholder-gray-300 text-[#1F2933]"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                if (debounceRef.current) clearTimeout(debounceRef.current);
                setPage(1);
                load({ search: "", page: 1, filter: activeFilter, from: fromDate, to: toDate });
              }}
              className="text-gray-300 hover:text-gray-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 bg-white border border-[#E4E7E4] rounded-xl px-3 py-2 shadow-sm">
          <span className="text-xs text-gray-400">From</span>
          <input type="date" value={fromDate} onChange={handleFromChange}
            className="text-sm outline-none bg-transparent text-[#1F2933]" />
          <span className="text-xs text-gray-400">To</span>
          <input type="date" value={toDate} onChange={handleToChange}
            className="text-sm outline-none bg-transparent text-[#1F2933]" />
          {(fromDate || toDate) && (
            <button
              onClick={() => {
                setFromDate(""); setToDate(""); setPage(1);
                load({ page: 1, search, filter: activeFilter, from: "", to: "" });
              }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap mb-4">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => applyFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === key
                ? "bg-[#445446] text-white"
                : "bg-white border border-[#E4E7E4] text-gray-500 hover:text-[#1F2933] hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_160px_90px_90px] gap-3 px-4 py-3 bg-[#F5F7F5] border-b border-[#E4E7E4]">
          {["ID", "Parent", "Specialist", "Service", "Date & Time", "Amount", "Status"].map((h) => (
            <span key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {initialLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">No bookings found.</p>
          </div>
        ) : (
          <div className={`divide-y divide-[#E4E7E4] ${fetching ? "opacity-60 pointer-events-none" : ""}`}>
            {bookings.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className="w-full grid grid-cols-[60px_1fr_1fr_1fr_160px_90px_90px] gap-3 px-4 py-3 text-left hover:bg-[#F5F7F5] transition-colors"
              >
                <span className="text-sm font-mono text-gray-400">#{b.id}</span>
                <span className="text-sm text-[#1F2933] truncate">{b.parent?.name || "—"}</span>
                <span className="text-sm text-[#1F2933] truncate">{b.expert?.user?.name || "—"}</span>
                <span className="text-sm text-gray-500 truncate">{b.service?.title || "—"}</span>
                <span className="text-sm text-gray-500">{formatDateTime(b.scheduled_at)}</span>
                <span className="text-sm font-medium text-[#1F2933]">{formatCurrency(b.amount)}</span>
                <div className="flex flex-wrap gap-1">
                  <BookingStatusBadge status={b.status} />
                  {b.is_disputed && <DisputedBadge />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} bookings
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1 || fetching}
              className="px-3 py-1.5 text-xs font-medium border border-[#E4E7E4] rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  disabled={fetching}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    p === page
                      ? "bg-[#445446] text-white"
                      : "border border-[#E4E7E4] text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages || fetching}
              className="px-3 py-1.5 text-xs font-medium border border-[#E4E7E4] rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedId && (
        <BookingDetailModal
          bookingId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => load({ page, search, filter: activeFilter })}
        />
      )}
    </div>
  );
};

export default BookingsManagementSection;
