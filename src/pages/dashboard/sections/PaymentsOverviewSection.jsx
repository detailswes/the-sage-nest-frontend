import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  useListTransactionsQuery,
  useExportTransactionsXlsxMutation,
  useGetBookingDetailQuery,
  useGetRefundLogQuery,
} from "../../../api/adminApi";
import {
  formatFormat,
  formatTransferStatus,
} from "../../../utils/formatBookingTime";
import AdminActionsPanel from "../../../components/admin/AdminActionsPanel";

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

const formatCurrency = (amount, currency = "EUR") =>
  amount != null
    ? new Intl.NumberFormat("en", { style: "currency", currency }).format(
        parseFloat(amount)
      )
    : "—";

const specialistPayout = (transaction) => {
  if (transaction.transfer_status !== "completed")
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: transaction.currency || "EUR",
    }).format(0);
  const { amount, platform_fee, currency = "EUR" } = transaction;
  if (amount == null || platform_fee == null) return "—";
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(
    parseFloat(amount) - parseFloat(platform_fee)
  );
};

// ─── Payment status helpers ───────────────────────────────────────────────────

function getPaymentStatus(tx) {
  if (
    ["CONFIRMED", "COMPLETED"].includes(tx.status) &&
    tx.transfer_status === "failed"
  )
    return "transfer_failed";
  if (
    ["CONFIRMED", "COMPLETED"].includes(tx.status) &&
    tx.stripe_payment_intent_id
  )
    return "succeeded";
  if (tx.status === "REFUNDED") return "refunded";
  if (tx.status === "PENDING_PAYMENT") return "pending";
  if (tx.status === "CANCELLED") {
    if (tx.stripe_payment_intent_id) {
      if (tx.refund_status === "pending") return "refund_pending";
      if (tx.refund_status === "succeeded") return "refunded";
      return "captured_cancelled";
    }
    return "failed";
  }
  return "failed";
}

const PAYMENT_STATUS_CLS = {
  succeeded: "bg-green-100 text-green-700",
  refunded: "bg-gray-100 text-gray-600",
  refund_pending: "bg-amber-100 text-amber-700",
  captured_cancelled: "bg-orange-100 text-orange-700",
  transfer_failed: "bg-red-100 text-red-600",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-600",
};

const PaymentStatusBadge = ({ transaction, verbose = false }) => {
  const { t } = useTranslation("adminDashboard");
  const ps = getPaymentStatus(transaction);
  const cls = PAYMENT_STATUS_CLS[ps] || "bg-gray-100 text-gray-500";
  const label = verbose
    ? t(`paymentsMgmt.paymentStatus.verbose.${ps}`, {
        defaultValue: t(`paymentsMgmt.paymentStatus.${ps}`, {
          defaultValue: ps,
        }),
      })
    : t(`paymentsMgmt.paymentStatus.${ps}`, { defaultValue: ps });
  return (
    <span
      className={`inline-flex items-center justify-self-start px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
};

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTER_KEYS = [
  "ALL",
  "succeeded",
  "refunded",
  "pending",
  "failed",
  "transfer_failed",
];

// ─── Amount cell ──────────────────────────────────────────────────────────────

function AmountCell({ transaction: tx }) {
  const { t } = useTranslation("adminDashboard");
  const refunded = tx.refund_status === "succeeded" && tx.refund_amount != null;
  const refundPending =
    tx.refund_status === "pending" && tx.refund_amount != null;

  if (refunded) {
    const isPartial = parseFloat(tx.refund_amount) < parseFloat(tx.amount);
    return (
      <span className="flex flex-col gap-0.5 leading-tight">
        <span className="text-sm font-medium text-gray-400 line-through">
          {formatCurrency(tx.amount, tx.currency)}
        </span>
        <span className="text-xs font-medium text-red-500">
          −{formatCurrency(tx.refund_amount, tx.currency)}
          {isPartial && (
            <span className="text-red-400 font-normal">
              {" "}
              ({t("paymentsMgmt.partial")})
            </span>
          )}
        </span>
      </span>
    );
  }

  if (refundPending) {
    return (
      <span className="flex flex-col gap-0.5 leading-tight">
        <span className="text-sm font-medium text-[#1F2933]">
          {formatCurrency(tx.amount, tx.currency)}
        </span>
        <span className="text-xs text-amber-500">
          {t("paymentsMgmt.refundPending")}
        </span>
      </span>
    );
  }

  return (
    <span className="text-sm font-medium text-[#1F2933]">
      {formatCurrency(tx.amount, tx.currency)}
    </span>
  );
}

// ─── Transaction detail modal ─────────────────────────────────────────────────

function TransactionDetailModal({ bookingId, onClose }) {
  const { t } = useTranslation("adminDashboard");
  const {
    data: booking,
    isLoading,
    isError,
  } = useGetBookingDetailQuery(bookingId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl flex items-center justify-between px-6 py-4 border-b border-[#E4E7E4]">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-[#1F2933]">
              {t("paymentsMgmt.modal.title", { id: bookingId })}
            </h2>
            {booking && <PaymentStatusBadge transaction={booking} verbose />}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          </div>
        ) : isError ? (
          <div className="p-6 text-center text-sm text-red-500">
            {t("paymentsMgmt.modal.loadError")}
          </div>
        ) : (
          <div className="divide-y divide-[#E4E7E4]">
            {/* Parties */}
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {t("paymentsMgmt.modal.parentClient")}
                </p>
                <p className="text-sm font-medium text-[#1F2933]">
                  {booking.parent?.name || "—"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {booking.parent?.email || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {t("paymentsMgmt.modal.specialist")}
                </p>
                <p className="text-sm font-medium text-[#1F2933]">
                  {booking.expert?.user?.name || "—"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {booking.expert?.user?.email || "—"}
                </p>
              </div>
            </div>

            {/* Session */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {t("paymentsMgmt.modal.session")}
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("paymentsMgmt.modal.service")}
                  </span>
                  <span className="font-medium text-[#1F2933]">
                    {booking.service?.title || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("paymentsMgmt.modal.format")}
                  </span>
                  <span className="font-medium text-[#1F2933]">
                    {formatFormat(booking.format, t)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("paymentsMgmt.modal.dateTime")}
                  </span>
                  <span className="font-medium text-[#1F2933]">
                    {formatDateTime(booking.scheduled_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("paymentsMgmt.modal.duration")}
                  </span>
                  <span className="font-medium text-[#1F2933]">
                    {booking.duration_minutes} {t("paymentsMgmt.modal.min")}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment breakdown */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {t("paymentsMgmt.modal.paymentBreakdown")}
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("paymentsMgmt.modal.amountCharged")}
                  </span>
                  <span className="font-medium text-[#1F2933]">
                    {formatCurrency(booking.amount, booking.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("paymentsMgmt.modal.platformFee")}
                  </span>
                  <span className="font-medium text-[#1F2933]">
                    {formatCurrency(booking.platform_fee, booking.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("paymentsMgmt.modal.specialistPayout")}
                  </span>
                  <span className="font-medium text-[#1F2933]">
                    {specialistPayout(booking)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t("paymentsMgmt.modal.transferStatus")}
                  </span>
                  <span className="font-medium text-[#1F2933]">
                    {formatTransferStatus(booking, t)}
                  </span>
                </div>
                {booking.refund_status && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      {t("paymentsMgmt.modal.refundStatus")}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        booking.refund_status === "succeeded"
                          ? "bg-green-100 text-green-700"
                          : booking.refund_status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {t(
                        `paymentsMgmt.paymentStatus.${booking.refund_status}`,
                        {
                          defaultValue:
                            booking.refund_status.charAt(0).toUpperCase() +
                            booking.refund_status.slice(1),
                        }
                      )}
                    </span>
                  </div>
                )}
                {booking.refund_amount != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      {t("paymentsMgmt.modal.amountRefunded")}
                    </span>
                    <span className="font-medium text-[#1F2933]">
                      {formatCurrency(booking.refund_amount, booking.currency)}
                      {parseFloat(booking.refund_amount) <
                        parseFloat(booking.amount) && (
                        <span className="ml-1 text-xs text-amber-600 font-normal">
                          ({t("paymentsMgmt.partial")})
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stripe reference */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {t("paymentsMgmt.modal.stripeRef")}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-500 flex-shrink-0">
                    {t("paymentsMgmt.modal.paymentIntentId")}
                  </span>
                  {booking.stripe_payment_intent_id ? (
                    <span className="font-mono text-xs text-[#1F2933] break-all text-right">
                      {booking.stripe_payment_intent_id}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">
                      {t("paymentsMgmt.modal.noPayment")}
                    </span>
                  )}
                </div>
                {booking.stripe_charge_id && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-gray-500 flex-shrink-0">
                      {t("paymentsMgmt.modal.chargeId")}
                    </span>
                    <span className="font-mono text-xs text-[#1F2933] break-all text-right">
                      {booking.stripe_charge_id}
                    </span>
                  </div>
                )}
                {booking.stripe_transfer_id && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-gray-500 flex-shrink-0">
                      {t("paymentsMgmt.modal.transferId")}
                    </span>
                    <span className="font-mono text-xs text-[#1F2933] break-all text-right">
                      {booking.stripe_transfer_id}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Cancellation info */}
            {(booking.status === "CANCELLED" ||
              booking.status === "REFUNDED") &&
              booking.cancellation_reason && (
                <div className="px-6 py-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {t("paymentsMgmt.modal.cancellationNote")}
                  </p>
                  <p className="text-sm text-[#1F2933]">
                    {booking.cancellation_reason}
                  </p>
                  {booking.cancelled_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(booking.cancelled_at)}
                    </p>
                  )}
                </div>
              )}

            {/* Admin actions — mutations in AdminActionsPanel invalidate the Booking tag, triggering auto-refetch */}
            <AdminActionsPanel booking={booking} onActionComplete={() => {}} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Refund log view ──────────────────────────────────────────────────────────

const REFUND_LIMIT = 25;

function RefundLogView() {
  const { t } = useTranslation("adminDashboard");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useGetRefundLogQuery({
    page,
    limit: REFUND_LIMIT,
  });

  const entries = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = Math.ceil(total / REFUND_LIMIT);
  const loading = isLoading || isFetching;

  return (
    <div>
      <div className="bg-white rounded-2xl border-2 border-[#c5ceba] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[160px_140px_80px_1fr_110px_110px_180px] gap-3 px-4 py-3 bg-[#445446] border-b border-[#3a4a3b]">
          {[
            t("paymentsMgmt.refundLog.col.timestamp"),
            t("paymentsMgmt.refundLog.col.admin"),
            t("paymentsMgmt.refundLog.col.booking"),
            t("paymentsMgmt.refundLog.col.parent"),
            t("paymentsMgmt.refundLog.col.original"),
            t("paymentsMgmt.refundLog.col.refunded"),
            t("paymentsMgmt.refundLog.col.stripeRefundId"),
          ].map((h) => (
            <span
              key={h}
              className="text-xs font-semibold text-white uppercase tracking-wider"
            >
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-[#dfe2d7]/50 flex items-center justify-center mb-3">
              <svg
                className="w-5 h-5 text-[#c5ceba]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#445446]">
              {t("paymentsMgmt.refundLog.noRefunds")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E4E7E4]">
            {entries.map((e) => {
              const b = e.booking;
              const isPartial =
                b &&
                b.refund_amount != null &&
                parseFloat(b.refund_amount) < parseFloat(b.amount);
              return (
                <div
                  key={e.id}
                  className="grid grid-cols-[160px_140px_80px_1fr_110px_110px_180px] gap-3 px-4 py-3.5 items-center"
                >
                  <span className="text-xs text-gray-500">
                    {new Date(e.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-sm text-[#1F2933] truncate">
                    {e.admin_name}
                  </span>
                  <span className="text-sm font-mono text-gray-500">
                    #{e.booking_id}
                  </span>
                  <span className="text-sm text-[#1F2933] truncate">
                    {b?.parent?.name || "—"}
                  </span>
                  <span className="text-sm text-gray-500">
                    {b ? formatCurrency(b.amount, b.currency) : "—"}
                  </span>
                  <span className="flex flex-col gap-0.5 leading-tight">
                    <span className="text-sm font-medium text-red-500">
                      −{b ? formatCurrency(b.refund_amount, b.currency) : "—"}
                    </span>
                    {isPartial && (
                      <span className="text-xs text-gray-400">
                        {t("paymentsMgmt.partial")}
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-mono text-gray-400 truncate">
                    {b?.stripe_refund_id || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          {t("paymentsMgmt.refundLog.note", { count: total })}
        </p>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400">
            {t("paymentsMgmt.refundLog.showing")}{" "}
            <span className="font-medium text-[#1F2933]">
              {(page - 1) * REFUND_LIMIT + 1}–
              {Math.min(page * REFUND_LIMIT, total)}
            </span>{" "}
            {t("paymentsMgmt.refundLog.of")}{" "}
            <span className="font-medium text-[#1F2933]">{total}</span>
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1 || loading}
              className="px-3 py-1.5 text-xs font-medium border border-[#c5ceba] rounded-lg text-[#5e6d5b] hover:bg-[#dfe2d7]/50 disabled:opacity-40 transition-colors"
            >
              {t("paymentsMgmt.refundLog.previous")}
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages || loading}
              className="px-3 py-1.5 text-xs font-medium border border-[#c5ceba] rounded-lg text-[#5e6d5b] hover:bg-[#dfe2d7]/50 disabled:opacity-40 transition-colors"
            >
              {t("paymentsMgmt.refundLog.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

const LIMIT = 25;

const PaymentsOverviewSection = () => {
  const { t } = useTranslation("adminDashboard");
  const [view, setView] = useState("transactions");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const queryParams = {
    page,
    limit: LIMIT,
    payment_status: activeFilter,
    ...(search ? { search } : {}),
    ...(fromDate ? { from: fromDate } : {}),
    ...(toDate ? { to: toDate } : {}),
  };

  const { data, isLoading, isFetching } = useListTransactionsQuery(queryParams);
  const [exportTransactionsXlsx, { isLoading: exportingXlsx }] =
    useExportTransactionsXlsxMutation();

  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
    setPage(1);
  };
  const handleFromChange = (e) => {
    setFromDate(e.target.value);
    setPage(1);
  };
  const handleToChange = (e) => {
    setToDate(e.target.value);
    setPage(1);
  };
  const applyFilter = (key) => {
    setActiveFilter(key);
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const blob = await exportTransactionsXlsx({
        search,
        payment_status: activeFilter,
        ...(search ? { search } : {}),
        ...(fromDate ? { from: fromDate } : {}),
        ...(toDate ? { to: toDate } : {}),
      }).unwrap();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore export errors
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#445446]">
            {t("paymentsMgmt.pageTitle")}
          </h2>
          <p className="text-sm text-[#5e6d5b] font-medium mt-1">
            {view === "transactions"
              ? t("paymentsMgmt.subtitleTransactions")
              : t("paymentsMgmt.subtitleRefundLog")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View toggle */}
          <div className="flex rounded-xl border border-[#c5ceba] overflow-hidden bg-white">
            <button
              onClick={() => setView("transactions")}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                view === "transactions"
                  ? "bg-[#445446] text-white"
                  : "text-[#5e6d5b] hover:text-[#445446] hover:bg-[#dfe2d7]/50"
              }`}
            >
              {t("paymentsMgmt.viewTransactions")}
            </button>
            <button
              onClick={() => setView("refund-log")}
              className={`px-3 py-2 text-xs font-medium border-l border-[#c5ceba] transition-colors ${
                view === "refund-log"
                  ? "bg-[#445446] text-white"
                  : "text-[#5e6d5b] hover:text-[#445446] hover:bg-[#dfe2d7]/50"
              }`}
            >
              {t("paymentsMgmt.viewRefundLog")}
            </button>
          </div>
          {view === "transactions" && (
            <button
              onClick={handleExport}
              disabled={exportingXlsx}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#445446] text-white rounded-xl hover:bg-[#3a4a3b] disabled:opacity-50 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              {exportingXlsx
                ? t("paymentsMgmt.exporting")
                : t("paymentsMgmt.exportBtn")}
            </button>
          )}
        </div>
      </div>

      {/* Refund log view */}
      {view === "refund-log" && <RefundLogView />}

      {/* Transactions view */}
      {view === "transactions" && (
        <>
          {/* Filter tabs + search — unified box */}
          <div className="mb-5 bg-white rounded-2xl border-2 border-[#c5ceba] p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder={t("paymentsMgmt.searchPlaceholder")}
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-[#c5ceba] rounded-xl bg-white text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    setPage(1);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Status pill tabs */}
            <div className="flex items-center flex-wrap gap-1 border border-[#c5ceba] rounded-xl p-1">
              {FILTER_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => applyFilter(key)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    activeFilter === key
                      ? "bg-[#445446] text-white shadow-sm"
                      : "text-[#5e6d5b] hover:text-[#445446] hover:bg-[#dfe2d7]/50"
                  }`}
                >
                  {t(`paymentsMgmt.filter.${key}`)}
                </button>
              ))}
            </div>

            {/* Date range — always one line */}
            <div className="flex items-center gap-2 border border-[#c5ceba] rounded-xl px-3 py-2">
              <span className="text-xs text-[#5e6d5b]">{t("paymentsMgmt.from")}</span>
              <input type="date" value={fromDate} onChange={handleFromChange}
                className="text-sm outline-none bg-transparent text-[#1F2933]" />
              <span className="text-xs text-[#5e6d5b]">{t("paymentsMgmt.to")}</span>
              <input type="date" value={toDate} onChange={handleToChange}
                className="text-sm outline-none bg-transparent text-[#1F2933]" />
              {(fromDate || toDate) && (
                <button
                  onClick={() => { setFromDate(""); setToDate(""); setPage(1); }}
                  className="text-xs text-[#5e6d5b] hover:text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors"
                >
                  {t("paymentsMgmt.clear")}
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border-2 border-[#c5ceba] overflow-hidden">
            <div className="grid grid-cols-[60px_1fr_1fr_100px_100px_100px_160px_140px] gap-3 px-4 py-3 bg-[#445446] border-b border-[#3a4a3b]">
              {[
                t("paymentsMgmt.col.id"),
                t("paymentsMgmt.col.parent"),
                t("paymentsMgmt.col.specialist"),
                t("paymentsMgmt.col.amount"),
                t("paymentsMgmt.col.fee"),
                t("paymentsMgmt.col.payout"),
                t("paymentsMgmt.col.date"),
                t("paymentsMgmt.col.paymentStatus"),
              ].map((h) => (
                <span
                  key={h}
                  className="text-xs font-semibold text-white uppercase tracking-wider"
                >
                  {h}
                </span>
              ))}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-[#dfe2d7]/50 flex items-center justify-center mb-3">
                  <svg
                    className="w-5 h-5 text-[#c5ceba]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-[#445446]">
                  {t("paymentsMgmt.noTransactions")}
                </p>
              </div>
            ) : (
              <div
                className={`divide-y divide-[#dfe2d7] ${
                  isFetching ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                {transactions.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => setSelectedId(tx.id)}
                    className="w-full grid grid-cols-[60px_1fr_1fr_100px_100px_100px_160px_140px] gap-3 px-4 py-3.5 text-left hover:bg-[#dfe2d7]/50 transition-colors items-center"
                  >
                    <span className="text-sm font-mono text-gray-400">
                      #{tx.id}
                    </span>
                    <span className="text-sm text-[#1F2933] truncate">
                      {tx.parent?.name || "—"}
                    </span>
                    <span className="text-sm text-[#1F2933] truncate">
                      {tx.expert?.user?.name || "—"}
                    </span>
                    <AmountCell transaction={tx} />
                    <span className="text-sm text-gray-500">
                      {formatCurrency(tx.platform_fee, tx.currency)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {specialistPayout(tx)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(tx.scheduled_at)}
                    </span>
                    <PaymentStatusBadge transaction={tx} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-400">
                {t("paymentsMgmt.pagination.showing")}{" "}
                <span className="font-medium text-[#1F2933]">
                  {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)}
                </span>{" "}
                {t("paymentsMgmt.pagination.of")}{" "}
                <span className="font-medium text-[#1F2933]">{total}</span>{" "}
                {t("paymentsMgmt.pagination.transaction", { count: total })}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                  className="px-3 py-1.5 text-xs font-medium border border-[#c5ceba] rounded-lg text-[#5e6d5b] hover:bg-[#dfe2d7]/50 disabled:opacity-40 transition-colors"
                >
                  {t("paymentsMgmt.pagination.previous")}
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p =
                    totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      disabled={isFetching}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        p === page
                          ? "bg-[#445446] text-white"
                          : "border border-[#c5ceba] text-[#5e6d5b] hover:bg-[#dfe2d7]/50"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isFetching}
                  className="px-3 py-1.5 text-xs font-medium border border-[#c5ceba] rounded-lg text-[#5e6d5b] hover:bg-[#dfe2d7]/50 disabled:opacity-40 transition-colors"
                >
                  {t("paymentsMgmt.pagination.next")}
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
        </>
      )}
    </div>
  );
};

export default PaymentsOverviewSection;
