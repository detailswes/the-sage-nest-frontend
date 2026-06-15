import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  adminCancelBooking,
  adminManualRefund,
  markBookingDisputed,
  adminRetryTransfer,
  adminMarkTransferResolved,
} from "../../api/adminApi";

function computeRefundPolicy(bk) {
  const total = parseFloat(bk.amount);
  const ref   = bk.status === "CANCELLED" && bk.cancelled_at
    ? new Date(bk.cancelled_at)
    : new Date();
  const h   = (new Date(bk.scheduled_at).getTime() - ref.getTime()) / 3_600_000;
  const pct = h >= 24 ? 100 : h >= 12 ? 50 : 0;
  return {
    policyPercent: pct,
    policyAmount:  parseFloat((total * pct / 100).toFixed(2)),
    tierKey:       h >= 24 ? "tierFull" : h >= 12 ? "tierHalf" : "tierNone",
  };
}

// Shared admin actions panel used by both BookingDetailModal and TransactionDetailModal.
// Props: booking (fetched object), onActionComplete (called after any successful action).
export default function AdminActionsPanel({ booking, onActionComplete }) {
  const { t } = useTranslation("adminDashboard");

  const [activeForm, setActiveForm] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  const [cancelReason, setCancelReason]   = useState("");
  const [refundReason, setRefundReason]   = useState("");
  const [refundAmount, setRefundAmount]   = useState("");
  const [refundAmountError, setRefundAmountError] = useState("");
  const [overrideReason, setOverrideReason]       = useState("");
  const [overrideReasonError, setOverrideReasonError] = useState("");
  const [showRefundConfirm, setShowRefundConfirm]     = useState(false);
  const [pendingRefundAmount, setPendingRefundAmount]   = useState(undefined);
  const [pendingOverrideReason, setPendingOverrideReason] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [resolveNote, setResolveNote]     = useState("");

  const canCancel      = ["CONFIRMED", "PENDING_PAYMENT"].includes(booking.status);
  const canRefund      = booking.stripe_payment_intent_id &&
    booking.refund_status !== "succeeded" &&
    ["CONFIRMED", "COMPLETED", "CANCELLED"].includes(booking.status);
  const canDispute     = !booking.is_disputed && ["CONFIRMED", "COMPLETED"].includes(booking.status);
  const canResDisp     = booking.is_disputed;
  const canRetry       = booking.transfer_status === "failed" && ["CONFIRMED", "COMPLETED"].includes(booking.status);
  const canMarkResolved = booking.transfer_status === "failed" && ["CONFIRMED", "COMPLETED"].includes(booking.status);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 5000);
    return () => clearTimeout(t);
  }, [success]);

  if (!canCancel && !canRefund && !canDispute && !canResDisp && !canRetry && !canMarkResolved) return null;

  const openForm = (form) => { setActiveForm(form); setError(""); setSuccess(""); };
  const dismissForm = () => {
    setActiveForm(null);
    setCancelReason("");
    setRefundReason(""); setRefundAmount(""); setRefundAmountError("");
    setOverrideReason(""); setOverrideReasonError("");
    setDisputeReason(""); setResolveNote("");
    setError("");
  };

  const run = async (fn) => {
    setLoading(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e?.response?.data?.error || t("adminActions.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => run(async () => {
    if (!cancelReason.trim()) return;
    await adminCancelBooking(booking.id, cancelReason.trim());
    setSuccess(t("adminActions.cancel.success"));
    dismissForm();
    onActionComplete();
  });

  const handleRefundSubmit = () => {
    setRefundAmountError(""); setOverrideReasonError("");
    const total = parseFloat(booking.amount);
    let parsedAmount;
    if (refundAmount.trim() !== "") {
      parsedAmount = parseFloat(refundAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setRefundAmountError(t("adminActions.refund.errGtZero"));
        return;
      }
      if (parsedAmount > total) {
        setRefundAmountError(t("adminActions.refund.errExceedsTotal", { amount: total.toFixed(2) }));
        return;
      }
    }
    const { policyAmount } = computeRefundPolicy(booking);
    const requested  = parsedAmount ?? total;
    const isOnPolicy = Math.abs(requested - policyAmount) < 0.005;
    if (!isOnPolicy && !overrideReason.trim()) {
      setOverrideReasonError(t("adminActions.refund.errOverrideRequired"));
      return;
    }
    setPendingRefundAmount(parsedAmount);
    setPendingOverrideReason(isOnPolicy ? "" : overrideReason.trim());
    setShowRefundConfirm(true);
  };

  const handleRefundConfirm = () => {
    setShowRefundConfirm(false);
    run(async () => {
      const total = parseFloat(booking.amount);
      await adminManualRefund(booking.id, refundReason.trim() || undefined, pendingRefundAmount, pendingOverrideReason || undefined);
      const isPartial = pendingRefundAmount != null && pendingRefundAmount < total;
      setSuccess(isPartial
        ? t("adminActions.refund.successPartial", { amount: pendingRefundAmount.toFixed(2) })
        : t("adminActions.refund.successFull"));
      dismissForm();
      onActionComplete();
    });
  };

  const handleDispute = () => run(async () => {
    await markBookingDisputed(booking.id, true, disputeReason.trim() || undefined);
    setSuccess(t("adminActions.dispute.success"));
    dismissForm();
    onActionComplete();
  });

  const handleResolveDispute = () => run(async () => {
    await markBookingDisputed(booking.id, false);
    setSuccess(t("adminActions.dispute.resolveSuccess"));
    onActionComplete();
  });

  const handleRetry = () => run(async () => {
    await adminRetryTransfer(booking.id);
    setSuccess(t("adminActions.retry.success"));
    dismissForm();
    onActionComplete();
  });

  const handleMarkResolved = () => run(async () => {
    await adminMarkTransferResolved(booking.id, resolveNote || undefined);
    setSuccess(t("adminActions.resolve.success"));
    dismissForm();
    onActionComplete();
  });

  const btn  = "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50";
  const btnX = `${btn} border border-gray-300 text-gray-600 hover:bg-gray-50`;

  return (
    <div className="px-6 py-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t("adminActions.title")}</p>

      {(error || success) && (
        <div className="mb-3">
          {error   && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <span className="flex-1">{success}</span>
              <button type="button" onClick={() => setSuccess("")} className="p-0.5 text-green-400 hover:text-green-600 transition-colors flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
        </div>
      )}

      {activeForm === null && (
        <div className="flex flex-wrap gap-2">
          {canCancel && (
            <button onClick={() => openForm("cancel")}
              className={`${btn} border border-red-300 text-red-600 hover:bg-red-50`}>
              {t("adminActions.cancelBooking")}
            </button>
          )}
          {canRefund && (
            <button onClick={() => openForm("refund")}
              className={`${btn} border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100`}>
              {t("adminActions.issueRefund")}
            </button>
          )}
          {canDispute && (
            <button onClick={() => openForm("dispute")}
              className={`${btn} border border-orange-300 text-orange-600 hover:bg-orange-50`}>
              {t("adminActions.markDisputed")}
            </button>
          )}
          {canResDisp && (
            <button onClick={handleResolveDispute} disabled={loading}
              className={`${btn} border border-green-300 text-green-700 hover:bg-green-50`}>
              {loading ? t("adminActions.resolving") : t("adminActions.resolveDispute")}
            </button>
          )}
          {canRetry && (
            <button onClick={() => openForm("retry")}
              className={`${btn} border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100`}>
              {t("adminActions.retryTransfer")}
            </button>
          )}
          {canMarkResolved && (
            <button onClick={() => openForm("resolve")}
              className={`${btn} border border-green-200 text-green-700 bg-green-50 hover:bg-green-100`}>
              {t("adminActions.markResolved")}
            </button>
          )}
        </div>
      )}

      {activeForm === "cancel" && (
        <div className="p-3 bg-red-50 rounded-xl border border-red-100">
          <p className="text-xs font-medium text-red-700 mb-2">
            {booking.stripe_payment_intent_id
              ? t("adminActions.cancel.descWithRefund")
              : t("adminActions.cancel.descNoRefund")}
          </p>
          <textarea
            value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
            rows={2} placeholder={t("adminActions.cancel.placeholder")}
            className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-300 placeholder-red-300 bg-white"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleCancel} disabled={!cancelReason.trim() || loading}
              className={`${btn} bg-red-600 text-white hover:bg-red-700`}>
              {loading ? t("adminActions.cancel.cancelling") : t("adminActions.cancel.confirmBtn")}
            </button>
            <button onClick={dismissForm} className={btnX}>{t("adminActions.cancel.dismiss")}</button>
          </div>
        </div>
      )}

      {activeForm === "refund" && (() => {
        const { policyPercent, policyAmount, tierKey } = computeRefundPolicy(booking);
        const parsedInput = refundAmount.trim() !== "" ? parseFloat(refundAmount) : NaN;
        const requested   = !isNaN(parsedInput) ? parsedInput : parseFloat(booking.amount);
        const isOnPolicy  = Math.abs(requested - policyAmount) < 0.005;
        return (
          <div className="space-y-2.5">
            <div className="px-2.5 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <span className="font-semibold">{t("adminActions.refund.policyLabel")}</span> £{policyAmount.toFixed(2)} ({policyPercent}% — {t(`adminActions.refund.${tierKey}`)})
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                {t("adminActions.refund.amountLabel")}{" "}
                <span className="font-normal text-gray-400">
                  {t("adminActions.refund.amountHint", { amount: parseFloat(booking.amount).toFixed(2) })}
                </span>
              </label>
              <input type="number" min="0.01" step="0.01" max={parseFloat(booking.amount)}
                value={refundAmount}
                onChange={(e) => { setRefundAmount(e.target.value); setRefundAmountError(""); setOverrideReasonError(""); }}
                placeholder={parseFloat(booking.amount).toFixed(2)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 bg-white"
              />
              {refundAmountError && <p className="text-xs text-red-600 mt-1">{refundAmountError}</p>}
            </div>
            <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)}
              rows={2} placeholder={t("adminActions.refund.reasonPlaceholder")}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#445446]/30 placeholder-gray-300 bg-white"
            />
            {!isOnPolicy && (
              <div className="px-2.5 py-2 bg-amber-50 border border-amber-200 rounded-lg space-y-1.5">
                <p className="text-xs text-amber-700 font-medium">
                  {t("adminActions.refund.overrideWarning")}
                </p>
                <textarea value={overrideReason}
                  onChange={(e) => { setOverrideReason(e.target.value); setOverrideReasonError(""); }}
                  rows={2} placeholder={t("adminActions.refund.overridePlaceholder")}
                  className={`w-full text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 bg-white ${
                    overrideReasonError ? "border-red-400 focus:ring-red-200" : "border-amber-300 focus:ring-amber-200"
                  }`}
                />
                {overrideReasonError && <p className="text-xs text-red-600">{overrideReasonError}</p>}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleRefundSubmit} disabled={loading}
                className={`${btn} bg-gray-700 text-white hover:bg-gray-800`}>
                {loading ? t("adminActions.refund.refunding") : t("adminActions.refund.reviewBtn")}
              </button>
              <button onClick={dismissForm} className={btnX}>{t("adminActions.refund.dismiss")}</button>
            </div>
          </div>
        );
      })()}

      {activeForm === "dispute" && (
        <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
          <p className="text-xs font-medium text-orange-700 mb-2">
            {t("adminActions.dispute.desc")}
          </p>
          <textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}
            rows={2} placeholder={t("adminActions.dispute.placeholder")}
            className="w-full text-sm border border-orange-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder-orange-300 bg-white"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleDispute} disabled={loading}
              className={`${btn} bg-orange-600 text-white hover:bg-orange-700`}>
              {loading ? t("adminActions.dispute.flagging") : t("adminActions.dispute.confirmBtn")}
            </button>
            <button onClick={dismissForm} className={btnX}>{t("adminActions.dispute.dismiss")}</button>
          </div>
        </div>
      )}

      {activeForm === "retry" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{t("adminActions.retry.desc")}</p>
          <div className="flex gap-2">
            <button onClick={handleRetry} disabled={loading}
              className={`${btn} bg-[#445446] text-white hover:bg-[#3a4a3b]`}>
              {loading ? t("adminActions.retry.processing") : t("adminActions.retry.confirmBtn")}
            </button>
            <button onClick={dismissForm} className={btnX}>{t("adminActions.retry.cancel")}</button>
          </div>
        </div>
      )}

      {activeForm === "resolve" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{t("adminActions.resolve.desc")}</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t("adminActions.resolve.noteLabel")}</label>
            <input type="text" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)}
              placeholder={t("adminActions.resolve.notePlaceholder")}
              className="w-full text-sm border border-[#E4E7E4] rounded-lg px-3 py-2 outline-none focus:border-[#445446]"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleMarkResolved} disabled={loading}
              className={`${btn} bg-green-600 text-white hover:bg-green-700`}>
              {loading ? t("adminActions.resolve.processing") : t("adminActions.resolve.confirmBtn")}
            </button>
            <button onClick={dismissForm} className={btnX}>{t("adminActions.resolve.cancel")}</button>
          </div>
        </div>
      )}

      {showRefundConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">
              {pendingOverrideReason
                ? t("adminActions.refundConfirm.titleOverride")
                : pendingRefundAmount != null
                ? t("adminActions.refundConfirm.titlePartial")
                : t("adminActions.refundConfirm.titleFull")}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-2">
              {pendingRefundAmount != null
                ? t("adminActions.refundConfirm.bodyPartial", { amount: pendingRefundAmount.toFixed(2), id: booking.id })
                : t("adminActions.refundConfirm.bodyFull", { amount: parseFloat(booking.amount).toFixed(2), id: booking.id })}
              {" "}{t("adminActions.refundConfirm.cannotUndo")}
            </p>
            {pendingOverrideReason && (
              <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <span className="font-semibold">{t("adminActions.refundConfirm.overrideLabel")}</span> {pendingOverrideReason}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowRefundConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                {t("adminActions.refundConfirm.cancel")}
              </button>
              <button onClick={handleRefundConfirm}
                className="flex-1 py-2.5 px-4 rounded-lg bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium transition-colors">
                {t("adminActions.refundConfirm.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
