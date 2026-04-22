import { useState, useEffect, useCallback, useRef } from "react";
import { listTransactions, exportTransactionsCsv, getBookingDetail, adminManualRefund, adminRetryTransfer, adminMarkTransferResolved } from "../../../api/adminApi";
import { formatFormat, formatTransferStatus } from "../../../utils/formatBookingTime";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

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

const formatCurrency = (amount) =>
  amount != null ? `£${parseFloat(amount).toFixed(2)}` : "—";

const specialistPayout = (transaction) => {
  if (transaction.transfer_status !== "completed") return "£0.00";
  const { amount, platform_fee } = transaction;
  if (amount == null || platform_fee == null) return "—";
  return `£${(parseFloat(amount) - parseFloat(platform_fee)).toFixed(2)}`;
};

// ─── Payment status helpers ───────────────────────────────────────────────────

function getPaymentStatus(t) {
  // Payment was captured but the expert transfer failed — distinct from a payment failure
  if (["CONFIRMED", "COMPLETED"].includes(t.status) && t.transfer_status === "failed")
    return "transfer_failed";
  if (["CONFIRMED", "COMPLETED"].includes(t.status) && t.stripe_payment_intent_id)
    return "succeeded";
  if (t.status === "REFUNDED") return "refunded";
  if (t.status === "PENDING_PAYMENT") return "pending";
  if (t.status === "CANCELLED") {
    // Payment was captured before the cancellation — not a payment failure
    if (t.stripe_payment_intent_id) {
      if (t.refund_status === "pending")   return "refund_pending";
      if (t.refund_status === "succeeded") return "refunded";
      return "captured_cancelled"; // captured, no refund (0% policy or refund not yet initiated)
    }
    return "failed"; // booking cancelled before any payment was captured
  }
  return "failed";
}

const PaymentStatusBadge = ({ transaction }) => {
  const ps = getPaymentStatus(transaction);
  const cfg = {
    succeeded:          { cls: "bg-green-100 text-green-700",   label: "Succeeded" },
    refunded:           { cls: "bg-gray-100 text-gray-600",     label: "Refunded" },
    refund_pending:     { cls: "bg-amber-100 text-amber-700",   label: "Refund Pending" },
    captured_cancelled: { cls: "bg-orange-100 text-orange-700", label: "Captured — No Refund" },
    transfer_failed:    { cls: "bg-red-100 text-red-600",       label: "Captured — Transfer Failed" },
    pending:            { cls: "bg-amber-100 text-amber-700",   label: "Pending" },
    failed:             { cls: "bg-red-100 text-red-600",       label: "Failed" },
  }[ps] || { cls: "bg-gray-100 text-gray-500", label: ps };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTERS = [
  { key: "ALL",            label: "All" },
  { key: "succeeded",      label: "Succeeded" },
  { key: "refunded",       label: "Refunded" },
  { key: "pending",        label: "Pending" },
  { key: "failed",         label: "Failed" },
  { key: "transfer_failed", label: "Transfer Failed" },
];

// ─── Amount cell (shows refund info inline when a refund has occurred) ────────

function AmountCell({ transaction: t }) {
  const refunded = t.refund_status === "succeeded" && t.refund_amount != null;
  const refundPending = t.refund_status === "pending" && t.refund_amount != null;

  if (refunded) {
    const isPartial = parseFloat(t.refund_amount) < parseFloat(t.amount);
    return (
      <span className="flex flex-col gap-0.5 leading-tight">
        <span className="text-sm font-medium text-gray-400 line-through">
          {formatCurrency(t.amount)}
        </span>
        <span className="text-xs font-medium text-red-500">
          −{formatCurrency(t.refund_amount)}{isPartial && <span className="text-red-400 font-normal"> (partial)</span>}
        </span>
      </span>
    );
  }

  if (refundPending) {
    return (
      <span className="flex flex-col gap-0.5 leading-tight">
        <span className="text-sm font-medium text-[#1F2933]">{formatCurrency(t.amount)}</span>
        <span className="text-xs text-amber-500">refund pending</span>
      </span>
    );
  }

  return <span className="text-sm font-medium text-[#1F2933]">{formatCurrency(t.amount)}</span>;
}

// ─── Admin actions panel ──────────────────────────────────────────────────────

function AdminActionsPanel({ booking, onActionComplete }) {
  const [action, setAction]           = useState(null); // 'refund' | 'retry' | 'resolve'
  const [loading, setLoading]         = useState(false);
  const [actionError, setActionError] = useState("");
  const [reason, setReason]           = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  const canRefund = booking.stripe_payment_intent_id &&
    booking.refund_status !== "succeeded" &&
    ["CONFIRMED", "COMPLETED", "CANCELLED"].includes(booking.status);
  const canRetryTransfer = booking.transfer_status === "failed" &&
    ["CONFIRMED", "COMPLETED"].includes(booking.status);
  const canMarkResolved = booking.transfer_status === "failed" &&
    ["CONFIRMED", "COMPLETED"].includes(booking.status);

  if (!canRefund && !canRetryTransfer && !canMarkResolved) return null;

  const reset = () => { setAction(null); setActionError(""); setReason(""); setRefundAmount(""); };

  const handleSubmit = async () => {
    setLoading(true);
    setActionError("");
    try {
      if (action === "refund")  await adminManualRefund(booking.id, reason || undefined, refundAmount || undefined);
      if (action === "retry")   await adminRetryTransfer(booking.id);
      if (action === "resolve") await adminMarkTransferResolved(booking.id, reason || undefined);
      reset();
      onActionComplete();
    } catch (err) {
      setActionError(err?.response?.data?.error || "Action failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const btnBase   = "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50";
  const btnCancel = `${btnBase} border border-[#E4E7E4] text-gray-500 hover:bg-gray-50`;

  return (
    <div className="px-6 py-4 border-t border-[#E4E7E4]">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Admin Actions</p>

      {action === null && (
        <div className="flex flex-wrap gap-2">
          {canRefund && (
            <button onClick={() => setAction("refund")}
              className={`${btnBase} border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100`}>
              Issue Refund
            </button>
          )}
          {canRetryTransfer && (
            <button onClick={() => setAction("retry")}
              className={`${btnBase} border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100`}>
              Retry Transfer
            </button>
          )}
          {canMarkResolved && (
            <button onClick={() => setAction("resolve")}
              className={`${btnBase} border border-green-200 text-green-700 bg-green-50 hover:bg-green-100`}>
              Mark as Resolved
            </button>
          )}
        </div>
      )}

      {action === "refund" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Issue a refund for this transaction. Leave amount blank to refund the full{" "}
            <span className="font-medium">{formatCurrency(booking.amount)}</span>.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount (optional)</label>
              <input type="number" step="0.01" min="0.01" max={parseFloat(booking.amount)}
                value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
                placeholder={`Max £${parseFloat(booking.amount).toFixed(2)}`}
                className="w-full text-sm border border-[#E4E7E4] rounded-lg px-3 py-2 outline-none focus:border-[#445446]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Reason (optional)</label>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for refund…"
                className="w-full text-sm border border-[#E4E7E4] rounded-lg px-3 py-2 outline-none focus:border-[#445446]" />
            </div>
          </div>
          {actionError && <p className="text-xs text-red-500">{actionError}</p>}
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={loading}
              className={`${btnBase} bg-amber-600 text-white hover:bg-amber-700`}>
              {loading ? "Processing…" : "Confirm Refund"}
            </button>
            <button onClick={reset} disabled={loading} className={btnCancel}>Cancel</button>
          </div>
        </div>
      )}

      {action === "retry" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Reset this transfer to pending so the next scheduled run will attempt the payout again.
            Ensure the specialist's Stripe account is correctly configured before retrying.
          </p>
          {actionError && <p className="text-xs text-red-500">{actionError}</p>}
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={loading}
              className={`${btnBase} bg-[#445446] text-white hover:bg-[#3a4a3b]`}>
              {loading ? "Processing…" : "Confirm Retry"}
            </button>
            <button onClick={reset} disabled={loading} className={btnCancel}>Cancel</button>
          </div>
        </div>
      )}

      {action === "resolve" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Mark this transfer as manually resolved. Use this when the payout has been handled
            outside the automated system (e.g. direct bank transfer).
          </p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Manual bank transfer sent on 22 Apr 2026"
              className="w-full text-sm border border-[#E4E7E4] rounded-lg px-3 py-2 outline-none focus:border-[#445446]" />
          </div>
          {actionError && <p className="text-xs text-red-500">{actionError}</p>}
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={loading}
              className={`${btnBase} bg-green-600 text-white hover:bg-green-700`}>
              {loading ? "Processing…" : "Mark as Resolved"}
            </button>
            <button onClick={reset} disabled={loading} className={btnCancel}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Transaction detail modal ─────────────────────────────────────────────────

function TransactionDetailModal({ bookingId, onClose }) {
  const [booking, setBooking]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");
    getBookingDetail(bookingId)
      .then(setBooking)
      .catch(() => setError("Failed to load transaction details."))
      .finally(() => setLoading(false));
  }, [bookingId, reloadKey]);

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
              Transaction #{bookingId}
            </h2>
            {booking && <PaymentStatusBadge transaction={booking} />}
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
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-500">{error}</div>
        ) : (
          <div className="divide-y divide-[#E4E7E4]">

            {/* Parties */}
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Parent / Client</p>
                <p className="text-sm font-medium text-[#1F2933]">{booking.parent?.name || "—"}</p>
                <p className="text-xs text-gray-400 mt-0.5">{booking.parent?.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Specialist</p>
                <p className="text-sm font-medium text-[#1F2933]">{booking.expert?.user?.name || "—"}</p>
                <p className="text-xs text-gray-400 mt-0.5">{booking.expert?.user?.email || "—"}</p>
              </div>
            </div>

            {/* Session */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Session</p>
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
                  <span className="font-medium text-[#1F2933]">{formatDateTime(booking.scheduled_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-medium text-[#1F2933]">{booking.duration_minutes} min</span>
                </div>
              </div>
            </div>

            {/* Payment breakdown */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment Breakdown</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount charged</span>
                  <span className="font-medium text-[#1F2933]">{formatCurrency(booking.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform fee (Sage Nest)</span>
                  <span className="font-medium text-[#1F2933]">{formatCurrency(booking.platform_fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Specialist payout</span>
                  <span className="font-medium text-[#1F2933]">
                    {specialistPayout(booking)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Transfer status</span>
                  <span className="font-medium text-[#1F2933]">{formatTransferStatus(booking)}</span>
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
            </div>

            {/* Stripe reference */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Stripe Reference</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-500 flex-shrink-0">Payment Intent ID</span>
                  {booking.stripe_payment_intent_id ? (
                    <span className="font-mono text-xs text-[#1F2933] break-all text-right">
                      {booking.stripe_payment_intent_id}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">No payment captured</span>
                  )}
                </div>
                {booking.stripe_charge_id && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-gray-500 flex-shrink-0">Charge ID</span>
                    <span className="font-mono text-xs text-[#1F2933] break-all text-right">
                      {booking.stripe_charge_id}
                    </span>
                  </div>
                )}
                {booking.stripe_transfer_id && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-gray-500 flex-shrink-0">Transfer ID</span>
                    <span className="font-mono text-xs text-[#1F2933] break-all text-right">
                      {booking.stripe_transfer_id}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Cancellation info */}
            {(booking.status === "CANCELLED" || booking.status === "REFUNDED") && booking.cancellation_reason && (
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cancellation Note</p>
                <p className="text-sm text-[#1F2933]">{booking.cancellation_reason}</p>
                {booking.cancelled_at && (
                  <p className="text-xs text-gray-400 mt-1">{formatDate(booking.cancelled_at)}</p>
                )}
              </div>
            )}

            {/* Admin actions */}
            <AdminActionsPanel
              booking={booking}
              onActionComplete={() => setReloadKey((k) => k + 1)}
            />

          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

const PaymentsOverviewSection = () => {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching]         = useState(false);
  const [exporting, setExporting]       = useState(false);

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
      const resolvedSearch = opts.search         !== undefined ? opts.search  : search;
      const resolvedFilter = opts.filter         !== undefined ? opts.filter  : activeFilter;
      const resolvedPage   = opts.page           !== undefined ? opts.page    : page;
      const resolvedFrom   = opts.from           !== undefined ? opts.from    : fromDate;
      const resolvedTo     = opts.to             !== undefined ? opts.to      : toDate;

      const params = {
        page:           resolvedPage,
        limit:          LIMIT,
        search:         resolvedSearch,
        payment_status: resolvedFilter,
        ...(resolvedFrom ? { from: resolvedFrom } : {}),
        ...(resolvedTo   ? { to:   resolvedTo   } : {}),
      };
      const data = await listTransactions(params);
      setTransactions(data.transactions);
      setTotal(data.total);
    } catch {
      // silently keep existing list on error
    } finally {
      if (isInitial) setInitialLoading(false); else setFetching(false);
    }
  }, [page, search, activeFilter, fromDate, toDate]);

  useEffect(() => { load({ initial: true }); }, []); // eslint-disable-line

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
    load({ filter: key, page: 1, search, from: fromDate, to: toDate, initial: !transactions.length });
  };

  const goToPage = (p) => {
    setPage(p);
    load({ page: p, search, filter: activeFilter, from: fromDate, to: toDate });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportTransactionsCsv({
        search,
        payment_status: activeFilter,
        ...(fromDate ? { from: fromDate } : {}),
        ...(toDate   ? { to:   toDate   } : {}),
      });
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href    = url;
      a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore export errors
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2933]">Payment Overview</h1>
          <p className="text-sm text-gray-400 mt-1">
            Platform-wide transaction list — view amounts, fees, payouts and Stripe references.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#445446] text-white rounded-xl hover:bg-[#3a4a3b] disabled:opacity-50 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
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
        <div className="grid grid-cols-[60px_1fr_1fr_100px_100px_100px_160px_110px] gap-3 px-4 py-3 bg-[#F5F7F5] border-b border-[#E4E7E4]">
          {["ID", "Parent", "Specialist", "Amount", "Fee", "Payout", "Date", "Payment Status"].map((h) => (
            <span key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {initialLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">No transactions found.</p>
          </div>
        ) : (
          <div className={`divide-y divide-[#E4E7E4] ${fetching ? "opacity-60 pointer-events-none" : ""}`}>
            {transactions.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className="w-full grid grid-cols-[60px_1fr_1fr_100px_100px_100px_160px_110px] gap-3 px-4 py-3 text-left hover:bg-[#F5F7F5] transition-colors items-center"
              >
                <span className="text-sm font-mono text-gray-400">#{t.id}</span>
                <span className="text-sm text-[#1F2933] truncate">{t.parent?.name || "—"}</span>
                <span className="text-sm text-[#1F2933] truncate">{t.expert?.user?.name || "—"}</span>
                <AmountCell transaction={t} />
                <span className="text-sm text-gray-500">{formatCurrency(t.platform_fee)}</span>
                <span className="text-sm text-gray-500">{specialistPayout(t)}</span>
                <span className="text-sm text-gray-500">{formatDate(t.scheduled_at)}</span>
                <PaymentStatusBadge transaction={t} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} transactions
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
        <TransactionDetailModal
          bookingId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
};

export default PaymentsOverviewSection;
