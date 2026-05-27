import { useState, useEffect, useCallback } from "react";
import { getBookingDetail, updateBookingNote } from "../../api/adminApi";
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
  const [booking, setBooking]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState("");

  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError]   = useState("");
  const [noteSuccess, setNoteSuccess] = useState("");
  const [note, setNote]             = useState("");
  const [noteDirty, setNoteDirty]   = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBookingDetail(bookingId);
      setBooking(data);
      setNote(data.internal_admin_note || "");
    } catch {
      setLoadError("Failed to load booking details.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  const handleSaveNote = async () => {
    setNoteError(""); setNoteSuccess("");
    setNoteSaving(true);
    try {
      await updateBookingNote(bookingId, note);
      setNoteSuccess("Note saved.");
      setNoteDirty(false);
      onUpdated();
    } catch (e) {
      setNoteError(e?.response?.data?.error || "Failed to save note.");
    } finally {
      setNoteSaving(false);
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
          <div className="p-6 text-center text-sm text-red-500">{loadError || "Booking not found."}</div>
        ) : (
          <div className="divide-y divide-[#E4E7E4]">

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

            {/* Refund details */}
            {(booking.status === "CANCELLED" || booking.status === "REFUNDED") && booking.stripe_payment_intent_id && (
              <div className="px-6 py-4">
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
              {(noteError || noteSuccess) && (
                <div className="mb-2">
                  {noteError   && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{noteError}</p>}
                  {noteSuccess && <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">{noteSuccess}</p>}
                </div>
              )}
              <textarea
                value={note}
                onChange={(e) => { setNote(e.target.value); setNoteDirty(true); setNoteSuccess(""); }}
                rows={3}
                placeholder="Add an internal note…"
                className="w-full text-sm border border-[#E4E7E4] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] placeholder-gray-300"
              />
              {noteDirty && (
                <button
                  onClick={handleSaveNote}
                  disabled={noteSaving}
                  className="mt-2 px-4 py-1.5 text-xs font-medium bg-[#445446] text-white rounded-lg hover:bg-[#3a4a3b] disabled:opacity-50 transition-colors"
                >
                  {noteSaving ? "Saving…" : "Save note"}
                </button>
              )}
            </div>

            {/* Admin actions */}
            <AdminActionsPanel
              booking={booking}
              onActionComplete={() => { load(); onUpdated(); }}
            />

          </div>
        )}
      </div>
    </div>
  );
}

export default BookingDetailModal;
