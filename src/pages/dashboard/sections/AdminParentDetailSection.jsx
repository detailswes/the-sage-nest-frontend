import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  useGetParentDetailQuery,
  useListParentBookingsQuery,
  useGetAuditLogQuery,
  useActivateParentMutation,
  useSuspendParentMutation,
  useLazyGetParentSuspensionPreviewQuery,
  useGdprDeleteParentMutation,
  useSendParentPasswordResetMutation,
  useResendParentVerificationMutation,
  useManuallyVerifyParentMutation,
} from "../../../api/adminApi";
import BookingDetailModal, { BookingStatusBadge } from "../../../components/admin/BookingDetailModal";
import { formatBookingTime } from "../../../utils/formatBookingTime";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";

const formatCurrency = (amount) =>
  amount != null ? `£${parseFloat(amount).toFixed(2)}` : "—";

const getInitials = (name) =>
  name ? name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?";

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const { t } = useTranslation("adminDashboard");
  if (!status || status === "ACTIVE")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />{t("parentDetail.badge.active")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />{t("parentDetail.badge.suspended")}
    </span>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const AdminParentDetailSection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation("adminDashboard");

  // ── RTK queries ──────────────────────────────────────────────────────────────
  const { data: parent, isLoading: parentLoading, isError: parentError, error: parentErrObj } =
    useGetParentDetailQuery(id);
  const { data: bookings = [], isLoading: bookingsLoading } =
    useListParentBookingsQuery(id);
  const { data: auditData, isLoading: auditLoading, refetch: refetchAudit } =
    useGetAuditLogQuery({ entityId: parseInt(id), entityType: 'PARENT', page: 1 });
  const auditLog = auditData?.data ?? [];

  // ── RTK mutations ─────────────────────────────────────────────────────────────
  const [activateParent,          { isLoading: activating }]          = useActivateParentMutation();
  const [suspendParent,           { isLoading: suspending }]          = useSuspendParentMutation();
  const [fetchSuspendPreview]                                         = useLazyGetParentSuspensionPreviewQuery();
  const [gdprDeleteParent,        { isLoading: gdprMutating }]        = useGdprDeleteParentMutation();
  const [sendParentPasswordReset, { isLoading: resettingPassword }]   = useSendParentPasswordResetMutation();
  const [resendParentVerification, { isLoading: resendingVerif }]     = useResendParentVerificationMutation();
  const [manuallyVerifyParent,    { isLoading: verifying }]           = useManuallyVerifyParentMutation();

  const anyActionLoading = activating || suspending || resettingPassword || resendingVerif || verifying;

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [activeTab,         setActiveTab]         = useState("overview");
  const [showConfirm,       setShowConfirm]       = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [showGdprDelete,    setShowGdprDelete]    = useState(false);
  const [gdprEmail,         setGdprEmail]         = useState("");
  const [showSuspendModal,     setShowSuspendModal]     = useState(false);
  const [suspendPreview,       setSuspendPreview]       = useState(null);
  const [suspendReason,        setSuspendReason]        = useState("");
  const [suspendError,         setSuspendError]         = useState("");
  const [suspendPreviewLoading, setSuspendPreviewLoading] = useState(false);
  const [suspendLoading,       setSuspendLoading]       = useState(false);

  // ── Status actions ────────────────────────────────────────────────────────────

  // Activate — simple confirm modal path (unchanged)
  const handleStatusChange = async (type) => {
    setShowConfirm(null);
    try {
      if (type === "activate") await activateParent(id).unwrap();
      if (type === "suspend")  await suspendParent({ id }).unwrap();
      toast.success(t("parentDetail.statusActions.success"));
      refetchAudit();
    } catch (e) {
      toast.error(e?.data?.error || t("parentDetail.genericActionError"));
    }
  };

  // Suspend — dedicated modal with preview + reason
  const handleSuspendClick = async () => {
    setShowSuspendModal(true);
    setSuspendPreview(null);
    setSuspendReason("");
    setSuspendError("");
    setSuspendPreviewLoading(true);
    try {
      const preview = await fetchSuspendPreview(id).unwrap();
      setSuspendPreview(preview);
    } catch {
      setSuspendError(t("parentDetail.suspend.previewError"));
    } finally {
      setSuspendPreviewLoading(false);
    }
  };

  const handleSuspendConfirm = async () => {
    if (!suspendReason) { setSuspendError(t("parentDetail.suspend.reasonRequired")); return; }
    setSuspendLoading(true);
    setSuspendError("");
    try {
      await suspendParent({ id, reason: suspendReason }).unwrap();
      setShowSuspendModal(false);
      toast.success(t("parentDetail.statusActions.success"));
      refetchAudit();
    } catch (err) {
      setSuspendError(err?.data?.error || t("parentDetail.genericActionError"));
    } finally {
      setSuspendLoading(false);
    }
  };

  const handleGdprDelete = async () => {
    try {
      await gdprDeleteParent({ id, confirmEmail: gdprEmail.trim() }).unwrap();
      navigate("/dashboard/admin/parents");
    } catch (e) {
      toast.error(e?.data?.error || t("parentDetail.gdpr.deletionFailed"));
    }
  };

  // ── Support tool actions ──────────────────────────────────────────────────────

  const handleSupportTool = async (action) => {
    try {
      if (action === "passwordReset") {
        await sendParentPasswordReset(id).unwrap();
        toast.success(t("parentDetail.supportTools.passwordResetSuccess"));
      } else if (action === "resendVerification") {
        await resendParentVerification(id).unwrap();
        toast.success(t("parentDetail.supportTools.resendVerificationSuccess"));
      } else if (action === "manualVerify") {
        await manuallyVerifyParent(id).unwrap();
        toast.success(t("parentDetail.supportTools.manualVerifySuccess"));
      }
      refetchAudit();
    } catch (e) {
      toast.error(e?.data?.error || t("parentDetail.genericActionError"));
    }
  };

  // ── Render states ─────────────────────────────────────────────────────────────

  if (parentLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (parentError || !parent) {
    const isNotFound = parentErrObj?.status === 404;
    return (
      <div className="text-center py-24">
        <p className="text-lg font-semibold text-[#1F2933] mb-2">
          {isNotFound ? t("parentDetail.notFound") : t("parentDetail.loadError")}
        </p>
        <Link to="/dashboard/admin/parents" className="text-sm text-[#445446] hover:underline">
          {t("parentDetail.backToList")}
        </Link>
      </div>
    );
  }

  const status   = parent.parent_status || "ACTIVE";
  const initials = getInitials(parent.name);

  const parentName = parent?.name || t("parentDetail.confirmModal.defaultName");

  const CONFIRM_CFG = {
    activate: {
      title:  t("parentDetail.confirmModal.activate_title"),
      body:   t("parentDetail.confirmModal.activate_body", { name: parentName }),
      btnCls: "bg-green-600 hover:bg-green-700",
      label:  t("parentDetail.confirmModal.activate_confirm"),
    },
  };

  const TABS = [
    { key: "overview",  label: t("parentDetail.tabs.overview") },
    { key: "bookings",  label: `${t("parentDetail.tabs.bookings")} (${parent._count?.bookings_as_parent ?? bookings.length})` },
    { key: "consents",  label: t("parentDetail.tabs.consents") },
    { key: "activity",  label: t("parentDetail.tabs.activity") },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#5e6d5b] mb-6">
        <Link to="/dashboard/admin/parents" className="hover:text-[#445446] transition-colors font-medium">
          {t("parentDetail.breadcrumb")}
        </Link>
        <svg className="w-4 h-4 text-[#c5ceba]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-[#445446] font-semibold truncate">{parent.name || "Parent"}</span>
      </div>

      <div className="flex gap-6 items-start">

        {/* ── Left: main content ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Identity card */}
          <div className="bg-white rounded-2xl border-2 border-[#c5ceba] px-6 py-5 mb-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-[#445446]/10 text-[#445446] flex items-center justify-center text-xl font-bold flex-shrink-0 select-none">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-[#1F2933]">{parent.name || "—"}</h1>
                  <StatusBadge status={status} />
                  {!parent.is_verified && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      {t("parentDetail.badge.unverified")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{parent.email}</p>
                {parent.phone && (
                  <p className="text-sm text-gray-400 mt-0.5">{parent.phone}</p>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-400">{t("parentDetail.registered")}</p>
                    <p className="text-sm font-medium text-[#1F2933]">{formatDate(parent.created_at)}</p>
                  </div>
                  <div className="w-px h-8 bg-[#E4E7E4]" />
                  <div>
                    <p className="text-xs text-gray-400">{t("parentDetail.totalBookings")}</p>
                    <p className="text-sm font-medium text-[#1F2933]">
                      {parent._count?.bookings_as_parent ?? bookings.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs + content */}
          <div className="bg-white rounded-2xl border-2 border-[#c5ceba] overflow-hidden">
            <div className="flex border-b border-[#c5ceba]">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === key
                      ? "text-[#445446] border-[#445446]"
                      : "text-gray-400 border-transparent hover:text-[#5e6d5b]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

          {/* ── Overview tab ─────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {t("parentDetail.overview.contactTitle")}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("parentDetail.overview.email")}</span>
                      <span className="font-medium text-[#1F2933]">{parent.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("parentDetail.overview.phone")}</span>
                      <span className="font-medium text-[#1F2933]">{parent.phone || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("parentDetail.overview.emailVerified")}</span>
                      <span className={`font-medium ${parent.is_verified ? "text-green-700" : "text-amber-600"}`}>
                        {parent.is_verified ? t("parentDetail.overview.yes") : t("parentDetail.overview.no")}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {t("parentDetail.overview.accountTitle")}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("parentDetail.overview.status")}</span>
                      <StatusBadge status={status} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("parentDetail.overview.registered")}</span>
                      <span className="font-medium text-[#1F2933]">{formatDate(parent.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("parentDetail.overview.totalBookings")}</span>
                      <span className="font-medium text-[#1F2933]">
                        {parent._count?.bookings_as_parent ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Legal Consents tab ───────────────────────────────────── */}
          {activeTab === "consents" && (() => {
            const lc = parent.legal_consents;
            if (!lc) return <div className="px-6 py-8 text-center"><p className="text-sm text-gray-400">{t("parentDetail.consents.noData")}</p></div>;

            const fmtDate = (iso) =>
              iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

            const ComplianceBadge = ({ ok }) =>
              ok ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  {t("parentDetail.consents.upToDate")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                  {t("parentDetail.consents.needsUpdate")}
                </span>
              );

            return (
              <div className="px-6 py-5 space-y-5">
                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { labelKey: "parentDetail.consents.privacyPolicy", current: lc.current_pp_version, accepted: lc.pp_acceptances[0]?.version ?? null, at: lc.pp_acceptances[0]?.accepted_at ?? null, ok: lc.pp_compliant },
                    { labelKey: "parentDetail.consents.terms", current: lc.current_tc_version, accepted: lc.tc_acceptances[0]?.version ?? lc.tc_at_registration?.tc_version ?? null, at: lc.tc_acceptances[0]?.accepted_at ?? lc.tc_at_registration?.accepted_at ?? null, ok: lc.tc_compliant },
                  ].map(({ labelKey, current, accepted, at, ok }) => (
                    <div key={labelKey} className="bg-[#dfe2d7]/20 rounded-xl border border-[#c5ceba] px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-[#1F2933]">{t(labelKey)}</p>
                        <ComplianceBadge ok={ok} />
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">{t("parentDetail.consents.currentVersion")}</span>
                          <span className="font-medium text-[#1F2933]">{current ?? "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">{t("parentDetail.consents.acceptedVersion")}</span>
                          <span className={`font-medium ${accepted && accepted === current ? "text-green-700" : "text-red-600"}`}>
                            {accepted ?? t("parentDetail.consents.neverAccepted")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">{t("parentDetail.consents.acceptedOn")}</span>
                          <span className="font-medium text-[#1F2933]">{fmtDate(at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Privacy Policy history */}
                <div className="bg-[#dfe2d7]/20 rounded-xl border border-[#c5ceba] px-5 py-4">
                  <p className="text-xs font-semibold text-[#5e6d5b] uppercase tracking-wider mb-3">
                    {t("parentDetail.consents.ppHistory")}
                  </p>
                  {lc.pp_acceptances.length === 0 ? (
                    <p className="text-sm text-gray-400">{t("parentDetail.consents.noPpHistory")}</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-[#c5ceba]">
                        {[
                          t("parentDetail.consents.colVersion"),
                          t("parentDetail.consents.colAcceptedOn"),
                          t("parentDetail.consents.colMarketing"),
                        ].map((h) => (
                          <th key={h} className="text-left text-[#5e6d5b] font-semibold pb-2 pr-4">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody className="divide-y divide-[#dfe2d7]">
                        {lc.pp_acceptances.map((a, i) => (
                          <tr key={i}>
                            <td className="py-2 pr-4 font-medium text-[#1F2933]">{a.version}</td>
                            <td className="py-2 pr-4 text-gray-500">{fmtDate(a.accepted_at)}</td>
                            <td className="py-2">
                              {a.marketing_consent
                                ? <span className="text-green-700 font-medium">{t("parentDetail.consents.granted")} {a.marketing_accepted_at ? `· ${fmtDate(a.marketing_accepted_at)}` : ""}</span>
                                : <span className="text-gray-400">{t("parentDetail.consents.notGranted")}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* T&C history */}
                <div className="bg-[#dfe2d7]/20 rounded-xl border border-[#c5ceba] px-5 py-4">
                  <p className="text-xs font-semibold text-[#5e6d5b] uppercase tracking-wider mb-3">
                    {t("parentDetail.consents.tcHistory")}
                  </p>
                  {lc.tc_at_registration && (
                    <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                      {t("parentDetail.consents.acceptedAtRegistration")}{" "}
                      <span className="font-medium">{lc.tc_at_registration.tc_version}</span>{" "}
                      {t("parentDetail.consents.acceptedOn").toLowerCase()} {fmtDate(lc.tc_at_registration.accepted_at)}
                    </div>
                  )}
                  {lc.tc_acceptances.length === 0 && !lc.tc_at_registration ? (
                    <p className="text-sm text-gray-400">{t("parentDetail.consents.noTcHistory")}</p>
                  ) : lc.tc_acceptances.length === 0 ? null : (
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-[#c5ceba]">
                        {[
                          t("parentDetail.consents.colVersion"),
                          t("parentDetail.consents.colAcceptedOn"),
                          t("parentDetail.consents.colSource"),
                        ].map((h) => (
                          <th key={h} className="text-left text-[#5e6d5b] font-semibold pb-2 pr-4">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody className="divide-y divide-[#dfe2d7]">
                        {lc.tc_acceptances.map((a, i) => (
                          <tr key={i}>
                            <td className="py-2 pr-4 font-medium text-[#1F2933]">{a.version}</td>
                            <td className="py-2 pr-4 text-gray-500">{fmtDate(a.accepted_at)}</td>
                            <td className="py-2 text-gray-500">{t("parentDetail.consents.versionUpdate")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── Bookings tab ─────────────────────────────────────────── */}
          {activeTab === "bookings" && (
            <div>
              {bookingsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-7 h-7 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#dfe2d7]/50 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-[#c5ceba]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[#445446]">{t("parentDetail.bookingsTab.noBookings")}</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#445446] border-b border-[#3a4a3b]">
                      {[
                        t("parentDetail.bookingsTab.col.service"),
                        t("parentDetail.bookingsTab.col.specialist"),
                        t("parentDetail.bookingsTab.col.dateTime"),
                        t("parentDetail.bookingsTab.col.amount"),
                        t("parentDetail.bookingsTab.col.status"),
                      ].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-white uppercase tracking-wider px-5 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dfe2d7]">
                    {bookings.map((b) => (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedBookingId(b.id)}
                        className="hover:bg-[#dfe2d7]/50 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-[#1F2933] truncate max-w-[160px]">
                            {b.service?.title || "—"}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">#{b.id}</p>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">
                          {b.expert?.user?.name || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 leading-tight">
                          {(() => {
                            const { primary, utc } = formatBookingTime(b.scheduled_at, b.expert?.timezone);
                            return (
                              <>
                                <span className="block whitespace-nowrap">{primary}</span>
                                {utc && <span className="block text-xs text-gray-400">{utc}</span>}
                              </>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-[#1F2933]">
                          {formatCurrency(b.amount)}
                        </td>
                        <td className="px-5 py-3.5">
                          <BookingStatusBadge status={b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Activity tab ─────────────────────────────────────────── */}
          {activeTab === "activity" && (
            <div className="px-6 py-5">
              {auditLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-7 h-7 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                </div>
              ) : auditLog.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  {t("parentDetail.activityTab.noActivity")}
                </p>
              ) : (
                <ol className="relative border-l border-[#E4E7E4] ml-2 space-y-4">
                  {auditLog.map((entry) => (
                    <li key={entry.id} className="ml-4">
                      <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-[#445446]/20 border-2 border-[#445446]" />
                      <p className="text-xs font-semibold text-[#1F2933]">
                        {t(`parentDetail.actionLabels.${entry.action}`, { defaultValue: entry.action })}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {entry.admin_name} · {formatDate(entry.created_at)}
                      </p>
                      {entry.note && (
                        <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-3 py-2">
                          {entry.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          </div>{/* end tabs+content box */}

        </div>

        {/* ── Right: sidebar actions ──────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* Account status */}
          <div className="bg-white rounded-2xl border-2 border-[#c5ceba] px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {t("parentDetail.statusActions.title")}
            </p>
            <div className="flex flex-col gap-2">
              {status !== "ACTIVE" && (
                <button
                  onClick={() => setShowConfirm("activate")}
                  disabled={anyActionLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {activating
                    ? t("parentDetail.statusActions.activating")
                    : t("parentDetail.statusActions.activate")}
                </button>
              )}
              {status !== "SUSPENDED" && (
                <button
                  onClick={handleSuspendClick}
                  disabled={anyActionLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  {suspending
                    ? t("parentDetail.statusActions.suspending")
                    : t("parentDetail.statusActions.suspend")}
                </button>
              )}
            </div>
          </div>

          {/* Support tools */}
          <div className="bg-white rounded-2xl border-2 border-[#c5ceba] px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {t("parentDetail.supportTools.title")}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSupportTool("passwordReset")}
                disabled={anyActionLoading}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#c5ceba] text-gray-600 hover:bg-[#dfe2d7]/50 disabled:opacity-50 transition-colors"
              >
                {resettingPassword
                  ? t("parentDetail.supportTools.sending")
                  : t("parentDetail.supportTools.passwordReset")}
              </button>
              {!parent.is_verified && (
                <>
                  <button
                    onClick={() => handleSupportTool("resendVerification")}
                    disabled={anyActionLoading}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#c5ceba] text-gray-600 hover:bg-[#dfe2d7]/50 disabled:opacity-50 transition-colors"
                  >
                    {resendingVerif
                      ? t("parentDetail.supportTools.sending")
                      : t("parentDetail.supportTools.resendVerification")}
                  </button>
                  <button
                    onClick={() => handleSupportTool("manualVerify")}
                    disabled={anyActionLoading}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                  >
                    {verifying
                      ? t("parentDetail.supportTools.verifying")
                      : t("parentDetail.supportTools.markVerified")}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-2xl border-2 border-dashed border-red-200 shadow-sm px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              {t("parentDetail.dangerZone.title")}
            </p>
            <p className="text-xs text-gray-400 mb-3">
              {t("parentDetail.dangerZone.subtitle")}
            </p>
            <button
              onClick={() => { setGdprEmail(""); setShowGdprDelete(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors w-full"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              {t("parentDetail.dangerZone.deleteBtn")}
            </button>
          </div>

        </div>
      </div>

      {/* ── Booking detail modal ── */}
      {selectedBookingId && (
        <BookingDetailModal
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          onUpdated={() => {}}
        />
      )}

      {/* ── Status confirm modal ─────────────────────────────────────────────── */}
      {showConfirm && (() => {
        const cfg = CONFIRM_CFG[showConfirm] || {};
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(null); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-base font-semibold text-[#1F2933] text-center mb-2">{cfg.title}</h3>
              <p className="text-sm text-gray-500 text-center mb-6">{cfg.body}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 py-2.5 px-4 rounded-lg border border-[#c5ceba] text-sm font-medium text-gray-600 hover:bg-[#dfe2d7]/50 transition-colors"
                >
                  {t("parentDetail.confirmModal.cancel")}
                </button>
                <button
                  onClick={() => handleStatusChange(showConfirm)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-white text-sm font-medium transition-colors ${cfg.btnCls}`}
                >
                  {cfg.label}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Suspension modal ──────────────────────────────────────────────────── */}
      {showSuspendModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !suspendLoading) { setShowSuspendModal(false); } }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 flex-shrink-0">
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1F2933]">{t("parentDetail.suspend.title")}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{t("parentDetail.suspend.subtitle", { name: parentName })}</p>
              </div>
            </div>

            {/* Preview */}
            {suspendPreviewLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
              </div>
            ) : suspendPreview && (
              <div className="mb-5">
                {suspendPreview.upcomingBookingCount === 0 ? (
                  <div className="bg-gray-50 border border-[#c5ceba] rounded-lg px-4 py-3 text-sm text-gray-500">
                    {t("parentDetail.suspend.noBookings")}
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      {t("parentDetail.suspend.affectedBookings", { count: suspendPreview.upcomingBookingCount })}
                    </p>
                    <div className="border border-[#c5ceba] rounded-lg overflow-hidden mb-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-[#E4E7E4]">
                            <th className="text-left font-semibold text-gray-400 px-3 py-2">{t("parentDetail.suspend.colSpecialist")}</th>
                            <th className="text-left font-semibold text-gray-400 px-3 py-2">{t("parentDetail.suspend.colService")}</th>
                            <th className="text-left font-semibold text-gray-400 px-3 py-2">{t("parentDetail.suspend.colRefund")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0F2F0]">
                          {suspendPreview.bookings.map((b) => (
                            <tr key={b.id}>
                              <td className="px-3 py-2 font-medium text-[#1F2933]">{b.expertName}</td>
                              <td className="px-3 py-2 text-gray-500 max-w-[140px] truncate">{b.serviceTitle}</td>
                              <td className="px-3 py-2">
                                {b.refundAction === "auto_full" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    {t("parentDetail.suspend.refundAuto")}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                    {t("parentDetail.suspend.refundManual")}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {suspendPreview.bookings.some((b) => b.refundAction === "manual") && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                        {t("parentDetail.suspend.manualWarning")}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Reason selector */}
            {!suspendPreviewLoading && suspendPreview && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  {t("parentDetail.suspend.reasonLabel")} <span className="text-red-500">*</span>
                </label>
                <select
                  value={suspendReason}
                  onChange={(e) => { setSuspendReason(e.target.value); setSuspendError(""); }}
                  className="w-full px-3 py-2 text-sm border border-[#c5ceba] rounded-lg text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition"
                >
                  <option value="">{t("parentDetail.suspend.reasonPlaceholder")}</option>
                  <option value="fraud">{t("parentDetail.suspend.reasonFraud")}</option>
                  <option value="abuse">{t("parentDetail.suspend.reasonAbuse")}</option>
                  <option value="admin_error">{t("parentDetail.suspend.reasonAdminError")}</option>
                  <option value="closure_request">{t("parentDetail.suspend.reasonClosure")}</option>
                </select>
              </div>
            )}

            {/* Error */}
            {suspendError && (
              <p className="text-xs text-red-600 mb-3 px-1">{suspendError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { if (!suspendLoading) setShowSuspendModal(false); }}
                disabled={suspendLoading}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#c5ceba] text-sm font-medium text-gray-600 hover:bg-[#dfe2d7]/50 transition-colors disabled:opacity-50"
              >
                {t("parentDetail.suspend.cancel")}
              </button>
              <button
                onClick={handleSuspendConfirm}
                disabled={suspendLoading || suspendPreviewLoading || !suspendPreview}
                className="flex-1 py-2.5 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {suspendLoading ? t("parentDetail.suspend.suspending") : t("parentDetail.suspend.confirm")}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── GDPR delete modal ─────────────────────────────────────────────────── */}
      {showGdprDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !gdprMutating) setShowGdprDelete(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-red-700 text-center mb-4">
              {t("parentDetail.gdpr.title")}
            </h3>
            {(() => {
              const now = new Date();
              const upcomingBookings   = bookings.filter((b) => ["PENDING_PAYMENT", "CONFIRMED"].includes(b.status) && new Date(b.scheduled_at) > now);
              const overdueUnresolved  = bookings.filter((b) => b.status === "CONFIRMED" && new Date(b.scheduled_at) <= now);
              const pendingRefunds     = bookings.filter((b) => b.refund_status === "pending");
              const openDisputes       = bookings.filter((b) => b.is_disputed === true);
              const isBlocked = upcomingBookings.length > 0 || overdueUnresolved.length > 0 || pendingRefunds.length > 0 || openDisputes.length > 0;

              if (isBlocked) {
                return (
                  <>
                    <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-4 text-xs text-amber-800 space-y-2">
                      <p className="font-semibold">{t("parentDetail.gdpr.blockedTitle")}</p>
                      {upcomingBookings.length > 0 && (
                        <p><span className="font-medium">{upcomingBookings.length} {t("parentDetail.gdpr.blockedUpcoming", { count: upcomingBookings.length })}</span>{t("parentDetail.gdpr.blockedUpcomingSuffix")}</p>
                      )}
                      {overdueUnresolved.length > 0 && (
                        <p><span className="font-medium">{overdueUnresolved.length} {t("parentDetail.gdpr.blockedOverdue", { count: overdueUnresolved.length })}</span>{t("parentDetail.gdpr.blockedOverdueSuffix")}</p>
                      )}
                      {pendingRefunds.length > 0 && (
                        <p><span className="font-medium">{pendingRefunds.length} {t("parentDetail.gdpr.blockedRefunds", { count: pendingRefunds.length })}</span>{t("parentDetail.gdpr.blockedRefundsSuffix")}</p>
                      )}
                      {openDisputes.length > 0 && (
                        <p><span className="font-medium">{openDisputes.length} {t("parentDetail.gdpr.blockedDisputes", { count: openDisputes.length })}</span>{t("parentDetail.gdpr.blockedDisputesSuffix")}</p>
                      )}
                      <p className="text-amber-600 mt-1">{t("parentDetail.gdpr.blockedResolve")}</p>
                    </div>
                    <button
                      onClick={() => { setShowGdprDelete(false); setGdprEmail("");}}
                      className="w-full py-2.5 px-4 rounded-lg border border-[#c5ceba] text-sm font-medium text-gray-600 hover:bg-[#dfe2d7]/50 transition-colors"
                    >
                      {t("parentDetail.gdpr.close")}
                    </button>
                  </>
                );
              }

              return (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-xs text-red-700 space-y-2">
                    <p className="font-semibold">{t("parentDetail.gdpr.irreversible")}</p>
                    <div>
                      <p className="font-medium mb-0.5">{t("parentDetail.gdpr.deletedTitle")}</p>
                      <ul className="list-disc list-inside space-y-0.5 text-red-600">
                        <li>{t("parentDetail.gdpr.erase1")}</li>
                        <li>{t("parentDetail.gdpr.erase2")}</li>
                        <li>{t("parentDetail.gdpr.erase3")}</li>
                        <li>{t("parentDetail.gdpr.erase4")}</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium mb-0.5">{t("parentDetail.gdpr.retainTitle")}</p>
                      <ul className="list-disc list-inside space-y-0.5 text-red-600">
                        <li>{t("parentDetail.gdpr.retain1")}</li>
                        <li>{t("parentDetail.gdpr.retain2")}</li>
                      </ul>
                    </div>
                    <p className="text-red-600 border-t border-red-200 pt-2">
                      {t("parentDetail.gdpr.retainNote")}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {t("parentDetail.gdpr.typeEmail")}{" "}
                    <span className="font-medium text-[#1F2933]">{parent.email}</span>
                  </p>
                  <input
                    type="email"
                    value={gdprEmail}
                    onChange={(e) => setGdprEmail(e.target.value)}
                    placeholder={parent.email}
                    className="w-full px-3 py-2.5 text-sm border border-[#c5ceba] rounded-lg text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition mb-3"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowGdprDelete(false); setGdprEmail("");}}
                      disabled={gdprMutating}
                      className="flex-1 py-2.5 px-4 rounded-lg border border-[#c5ceba] text-sm font-medium text-gray-600 hover:bg-[#dfe2d7]/50 transition-colors disabled:opacity-50"
                    >
                      {t("parentDetail.gdpr.cancel")}
                    </button>
                    <button
                      onClick={handleGdprDelete}
                      disabled={gdprMutating || gdprEmail.trim().toLowerCase() !== parent.email?.toLowerCase()}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      {gdprMutating ? t("parentDetail.gdpr.erasing") : t("parentDetail.gdpr.eraseBtn")}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminParentDetailSection;
