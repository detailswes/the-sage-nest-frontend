import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getExpertDetail,
  approveExpert,
  rejectExpert,
  suspendExpert,
  reactivateExpert,
  sendPasswordReset,
  resendVerification,
  manuallyVerify,
  exportTaxDataCsv,
  getExpertYearlySummary,
  listExpertBookings,
  requestChanges,
  getAuditLog,
  gdprDeleteExpert,
  approveLanguage,
  rejectLanguage,
  approveProfileDraft,
  rejectProfileDraft,
} from "../../../api/adminApi";
import { getProfileImageUrl, getDocumentUrl } from "../../../utils/imageUrl";
import { formatBookingTime } from "../../../utils/formatBookingTime";
import BookingDetailModal from "../../../components/admin/BookingDetailModal";

// ─── Shared helpers ───────────────────────────────────────────────────────────

const FORMAT_BADGE_CLS = {
  ONLINE:    "bg-blue-100 text-blue-700",
  IN_PERSON: "bg-purple-100 text-purple-700",
};

const CLUSTER_BADGE_CLS = {
  FOR_PARENTS: "bg-pink-100 text-pink-700",
  FOR_BABY:    "bg-cyan-100 text-cyan-700",
  PACKAGE:     "bg-amber-100 text-amber-700",
  GIFT:        "bg-green-100 text-green-700",
  EVENT:       "bg-violet-100 text-violet-700",
};

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";

const getInitials = (name) =>
  name ? name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?";

const isInsuranceExpired = (iso) => iso && new Date(iso) <= new Date();

// ─── Small sub-components ─────────────────────────────────────────────────────

const SectionLabel = ({ children }) => (
  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{children}</p>
);

const DocLink = ({ url, label }) => {
  const { t } = useTranslation("adminDashboard");
  if (!url) return <span className="text-xs text-gray-400 italic">{t("expertDetail.profile.noDocument")}</span>;
  return (
    <a
      href={getDocumentUrl(url)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-[#445446] hover:underline flex-shrink-0"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
      </svg>
      {label || t("expertDetail.profile.viewDocument")}
    </a>
  );
};

const StatusBadge = ({ status }) => {
  const { t } = useTranslation("adminDashboard");
  const cls = {
    APPROVED:          "bg-green-100 text-green-700",
    REJECTED:          "bg-red-100 text-red-600",
    SUSPENDED:         "bg-orange-100 text-orange-700",
    PENDING:           "bg-amber-100 text-amber-700",
    CHANGES_REQUESTED: "bg-violet-100 text-violet-700",
  }[status] || "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {t(`expertDetail.statusBadge.${status}`, { defaultValue: status })}
    </span>
  );
};

const BookingStatusBadge = ({ status }) => {
  const { t } = useTranslation("adminDashboard");
  const cls = {
    CONFIRMED:       "bg-green-100 text-green-700",
    COMPLETED:       "bg-blue-100 text-blue-700",
    CANCELLED:       "bg-red-100 text-red-600",
    REFUNDED:        "bg-gray-100 text-gray-600",
    PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  }[status] || "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {t(`expertDetail.bookingStatusBadge.${status}`, { defaultValue: status })}
    </span>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const AdminExpertDetailSection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation("adminDashboard");

  const [expert, setExpert]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError]     = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [langActionLoading, setLangActionLoading] = useState(null);
  const [langConfirm, setLangConfirm] = useState(null); // { lang, action: 'approve' | 'reject' }

  // Tabs
  const [activeTab, setActiveTab]   = useState("profile");

  // Bookings tab
  const [bookings, setBookings]         = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsLoaded, setBookingsLoaded]   = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  // Activity tab
  const [auditLog, setAuditLog]       = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditLoaded, setAuditLoaded]   = useState(false);

  // Action modals
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [changesNote, setChangesNote]               = useState("");
  const [changesLoading, setChangesLoading]         = useState(false);
  const [changesError, setChangesError]             = useState("");

  const [showGdprDelete, setShowGdprDelete] = useState(false);
  const [gdprEmail, setGdprEmail]           = useState("");
  const [gdprLoading, setGdprLoading]       = useState(false);
  const [gdprError, setGdprError]           = useState("");

  // Profile draft review
  const [draftRejectNote, setDraftRejectNote]   = useState("");
  const [showDraftReject, setShowDraftReject]   = useState(false);
  const [draftActionLoading, setDraftActionLoading] = useState(null); // 'approve' | 'reject'
  const [draftActionError, setDraftActionError]     = useState("");

  // Tax export + yearly summary
  const [exportYear, setExportYear]     = useState(new Date().getFullYear());
  const [exporting, setExporting]       = useState(false);
  const [exportError, setExportError]   = useState("");
  const [summary, setSummary]               = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryStatus, setSummaryStatus]   = useState("ALL");

  const loadExpert = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getExpertDetail(id);
      setExpert(data);
    } catch {
      setError(t("expertDetail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { loadExpert(); }, [loadExpert]);

  const loadSummary = useCallback(async (year, status) => {
    setSummaryLoading(true);
    try {
      const data = await getExpertYearlySummary(id, year, status);
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [id]);

  useEffect(() => { loadSummary(exportYear, summaryStatus); }, [exportYear, summaryStatus, loadSummary]);

  const loadBookings = () => {
    if (bookingsLoaded) return;
    setBookingsLoading(true);
    listExpertBookings(id)
      .then((data) => { setBookings(data); setBookingsLoaded(true); })
      .catch(() => setBookings([]))
      .finally(() => setBookingsLoading(false));
  };

  const loadAuditLog = () => {
    if (auditLoaded) return;
    setAuditLoading(true);
    getAuditLog(parseInt(id), "EXPERT")
      .then((res) => { setAuditLog(res.data); setAuditLoaded(true); })
      .catch(() => setAuditLog([]))
      .finally(() => setAuditLoading(false));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "bookings") loadBookings();
    if (tab === "activity") loadAuditLog();
  };

  const clearFeedback = () => { setActionError(""); setActionSuccess(""); };

  useEffect(() => {
    if (!actionSuccess) return;
    const t = setTimeout(() => setActionSuccess(""), 5000);
    return () => clearTimeout(t);
  }, [actionSuccess]);

  const handleApproveLanguage = async (language) => {
    setLangConfirm(null);
    setLangActionLoading(language);
    try {
      const updated = await approveLanguage(expert.id, language);
      setExpert((e) => ({ ...e, languages: updated.languages, pending_languages: updated.pending_languages }));
    } catch (e) {
      setActionError(e?.response?.data?.error || t("expertDetail.profile.langApproveError"));
    } finally {
      setLangActionLoading(null);
    }
  };

  const handleRejectLanguage = async (language) => {
    setLangConfirm(null);
    setLangActionLoading(language);
    try {
      const updated = await rejectLanguage(expert.id, language);
      setExpert((e) => ({ ...e, languages: updated.languages, pending_languages: updated.pending_languages }));
    } catch (e) {
      setActionError(e?.response?.data?.error || t("expertDetail.profile.langRejectError"));
    } finally {
      setLangActionLoading(null);
    }
  };

  const handleApproveDraft = async () => {
    setDraftActionLoading("approve");
    setDraftActionError("");
    try {
      await approveProfileDraft(id);
      setShowDraftReject(false);
      setDraftRejectNote("");
      await loadExpert();
      setAuditLoaded(false);
    } catch (e) {
      setDraftActionError(e?.response?.data?.error || t("expertDetail.draft.approveError"));
    } finally {
      setDraftActionLoading(null);
    }
  };

  const handleRejectDraft = async () => {
    setDraftActionLoading("reject");
    setDraftActionError("");
    try {
      await rejectProfileDraft(id, draftRejectNote.trim() || undefined);
      setShowDraftReject(false);
      setDraftRejectNote("");
      setExpert((e) => ({
        ...e,
        profile_draft: { ...e.profile_draft, status: "REJECTED", rejection_note: draftRejectNote.trim() || null },
      }));
      setAuditLoaded(false);
    } catch (e) {
      setDraftActionError(e?.response?.data?.error || t("expertDetail.draft.rejectError"));
    } finally {
      setDraftActionLoading(null);
    }
  };

  const runAction = async (key, fn, successMsg) => {
    clearFeedback();
    setActionLoading(key);
    try {
      await fn();
      setActionSuccess(successMsg);
      await loadExpert();
      setBookingsLoaded(false);
      setAuditLoaded(false);
    } catch (e) {
      setActionError(e?.response?.data?.error || t("expertDetail.genericActionError"));
    } finally {
      setActionLoading(null);
    }
  };

  const [confirmAction, setConfirmAction] = useState(null); // 'approve' | 'reject' | 'suspend' | 'reactivate'

  const handleConfirmAction = async () => {
    const type = confirmAction;
    setConfirmAction(null);
    if (type === "approve")         await runAction("approve",     () => approveExpert(id),    t("expertDetail.statusActions.approveSuccess"));
    else if (type === "reject")     await runAction("reject",      () => rejectExpert(id),     t("expertDetail.statusActions.rejectSuccess"));
    else if (type === "suspend")    await runAction("suspend",     () => suspendExpert(id),    t("expertDetail.statusActions.suspendSuccess"));
    else if (type === "reactivate") await runAction("reactivate",  () => reactivateExpert(id), t("expertDetail.statusActions.reactivateSuccess"));
  };
  const handlePasswordReset      = () => runAction("passwordReset",      () => sendPasswordReset(id),   t("expertDetail.supportTools.passwordResetSuccess"));
  const handleResendVerification = () => runAction("resendVerification", () => resendVerification(id),  t("expertDetail.supportTools.resendVerificationSuccess"));
  const handleManualVerify       = () => runAction("manualVerify",       () => manuallyVerify(id),      t("expertDetail.supportTools.manualVerifySuccess"));

  const handleRequestChanges = async () => {
    if (!changesNote.trim()) { setChangesError(t("expertDetail.requestChanges.errorRequired")); return; }
    setChangesLoading(true);
    setChangesError("");
    try {
      await requestChanges(id, changesNote.trim());
      setExpert((prev) => ({
        ...prev,
        status: "CHANGES_REQUESTED",
        change_request_note: changesNote.trim(),
        change_requested_at: new Date().toISOString(),
      }));
      setShowRequestChanges(false);
      setChangesNote("");
      setActionSuccess(t("expertDetail.requestChanges.success"));
      setAuditLoaded(false);
    } catch (e) {
      setChangesError(e?.response?.data?.error || t("expertDetail.genericActionError"));
    } finally {
      setChangesLoading(false);
    }
  };

  const handleGdprDelete = async () => {
    setGdprLoading(true);
    setGdprError("");
    try {
      await gdprDeleteExpert(id, gdprEmail.trim());
      navigate("/dashboard/admin/experts");
    } catch (e) {
      setGdprError(e?.response?.data?.error || t("expertDetail.gdpr.deletionFailed"));
    } finally {
      setGdprLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    setExportError("");
    try {
      const blob = await exportTaxDataCsv(id, exportYear);
      const safeName = (expert?.user?.name || `expert-${id}`).replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tax_report_${safeName}_${exportYear}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setExportError(t("expertDetail.bizInfo.exportError"));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !expert) {
    return (
      <div className="text-center py-24">
        <p className="text-sm text-red-500 mb-4">{error || t("expertDetail.notFoundError")}</p>
        <button onClick={() => navigate("/dashboard/admin/experts")} className="text-sm text-[#445446] hover:underline">
          {t("expertDetail.backToList")}
        </button>
      </div>
    );
  }

  const name     = expert.user?.name || "—";
  const email    = expert.user?.email || "—";
  const photoUrl = getProfileImageUrl(expert.profile_image);
  const hasAddress = expert.address_street || expert.address_city || expert.address_postcode;
  const insurance  = expert.insurance;
  const expired    = insurance ? isInsuranceExpired(insurance.policy_expires_at) : false;

  return (
    <div>
      {/* Breadcrumb / back */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate("/dashboard/admin/experts")}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#445446] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          {t("expertDetail.breadcrumb")}
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-[#1F2933] truncate">{name}</span>
      </div>

      {/* Feedback banner */}
      {(actionError || actionSuccess) && (
        <div className="mb-4">
          {actionError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="flex-1">{actionError}</span>
              <button type="button" onClick={() => setActionError("")} className="p-0.5 text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          {actionSuccess && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <span className="flex-1">{actionSuccess}</span>
              <button type="button" onClick={() => setActionSuccess("")} className="p-0.5 text-green-400 hover:text-green-600 transition-colors flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

        {/* ── Left column: profile content ── */}
        <div className="space-y-0">

          {/* Identity card */}
          <div className="bg-white rounded-2xl border border-[#E4E7E4] p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt={name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#E4E7E4]"
                    onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                ) : null}
                <div className="w-16 h-16 rounded-full bg-[#445446] text-white flex items-center justify-center text-xl font-bold select-none"
                  style={{ display: photoUrl ? "none" : "flex" }}>
                  {getInitials(name)}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-[#1F2933]">{name}</p>
                {expert.position && <p className="text-sm font-medium text-[#445446] mt-0.5">{expert.position}</p>}
                <a href={`mailto:${email}`} className="text-sm text-gray-400 hover:text-[#445446] hover:underline block mt-0.5">{email}</a>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <StatusBadge status={expert.status} />
                  {expert.status === "APPROVED" && !expert.is_published && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200">
                      {t("expertDetail.badge.unlisted")}
                    </span>
                  )}
                  {expert.user?.is_verified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                      {t("expertDetail.badge.emailVerified")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      {t("expertDetail.badge.unverified")}
                    </span>
                  )}
                  {expert.user?.login_attempts > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      {t("expertDetail.badge.failedLogin", { count: expert.user.login_attempts })}
                    </span>
                  )}
                  {expert.user?.locked_until && new Date(expert.user.locked_until) > new Date() && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                      {t("expertDetail.badge.lockedUntil", { time: new Date(expert.user.locked_until).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) })}
                    </span>
                  )}
                  {expert.user?.created_at && (
                    <span className="text-xs text-gray-400">
                      {t("expertDetail.badge.joined", { date: formatDate(expert.user.created_at) })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden">
            <div className="flex border-b border-[#E4E7E4]">
              {[
                { key: "profile",  label: t("expertDetail.tabs.profile") },
                { key: "bookings", label: `${t("expertDetail.tabs.bookings")}${expert._count?.bookings ? ` (${expert._count.bookings})` : ""}` },
                { key: "activity", label: t("expertDetail.tabs.activity") },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => handleTabChange(key)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === key ? "border-[#445446] text-[#445446]" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-6">

              {/* ── Profile tab ── */}
              {activeTab === "profile" && (
                <>
                  {/* ── Pending draft review card ── */}
                  {expert.profile_draft?.status === "PENDING_REVIEW" && (() => {
                    const fmtSessionFormat = (val) => {
                      if (!val) return null;
                      return { ONLINE: "Online", IN_PERSON: "In-Person", BOTH: "Online & In-Person" }[val] || val;
                    };
                    const draftFields = [
                      { key: "Summary",            live: expert.summary,       proposed: expert.profile_draft.summary },
                      { key: "Bio",                live: expert.bio,           proposed: expert.profile_draft.bio },
                      { key: "Professional title", live: expert.position,      proposed: expert.profile_draft.position },
                      { key: "Session format",     live: fmtSessionFormat(expert.session_format), proposed: fmtSessionFormat(expert.profile_draft.session_format) },
                      { key: "Location",           live: [expert.address_street, expert.address_city, expert.address_postcode].filter(Boolean).join(", ") || null, proposed: [expert.profile_draft.address_street, expert.profile_draft.address_city, expert.profile_draft.address_postcode].filter(Boolean).join(", ") || null },
                      { key: "Timezone",           live: expert.timezone,      proposed: expert.profile_draft.timezone },
                      { key: "Languages",          live: expert.languages?.join(", ") || null, proposed: expert.profile_draft.languages?.join(", ") || null },
                      { key: "Instagram",          live: expert.instagram,     proposed: expert.profile_draft.instagram },
                      { key: "Facebook",           live: expert.facebook,      proposed: expert.profile_draft.facebook },
                      { key: "LinkedIn",           live: expert.linkedin,      proposed: expert.profile_draft.linkedin },
                      { key: "Expertise",          live: expert.expertise,     proposed: expert.profile_draft.expertise },
                    ];
                    return (
                      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 overflow-hidden mb-2">
                        {/* Card header */}
                        <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-amber-100 border-b border-amber-200">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-semibold text-amber-800">{t("expertDetail.draft.pendingTitle")}</span>
                            <span className="text-xs text-amber-600 ml-1">
                              {t("expertDetail.draft.submitted", { date: new Date(expert.profile_draft.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {draftActionError && <span className="text-xs text-red-600">{draftActionError}</span>}
                            {showDraftReject ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={draftRejectNote}
                                  onChange={(e) => setDraftRejectNote(e.target.value)}
                                  placeholder={t("expertDetail.draft.rejectionPlaceholder")}
                                  className="text-xs px-3 py-1.5 border border-amber-300 rounded-lg bg-white text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300 w-52"
                                />
                                <button
                                  onClick={handleRejectDraft}
                                  disabled={draftActionLoading === "reject"}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors"
                                >
                                  {draftActionLoading === "reject" ? t("expertDetail.draft.rejecting") : t("expertDetail.draft.confirmReject")}
                                </button>
                                <button
                                  onClick={() => { setShowDraftReject(false); setDraftRejectNote(""); setDraftActionError(""); }}
                                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                                >
                                  {t("expertDetail.draft.cancel")}
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={handleApproveDraft}
                                  disabled={draftActionLoading !== null}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#445446] hover:bg-[#3F4E41] text-white disabled:opacity-50 transition-colors"
                                >
                                  {draftActionLoading === "approve" ? t("expertDetail.draft.approving") : t("expertDetail.draft.approveBtn")}
                                </button>
                                <button
                                  onClick={() => setShowDraftReject(true)}
                                  disabled={draftActionLoading !== null}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                                >
                                  {t("expertDetail.draft.rejectBtn")}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Side-by-side diff */}
                        <div className="grid grid-cols-2 divide-x divide-amber-200">
                          {/* Live column */}
                          <div className="px-5 py-4 space-y-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t("expertDetail.draft.liveCol")}</p>
                            {draftFields.map(({ key, live, proposed }) => {
                              const changed = (live || "") !== (proposed || "");
                              return (
                                <div key={key}>
                                  <p className="text-xs font-medium text-gray-400 mb-0.5">{t(`expertDetail.draft.fields.${key}`)}</p>
                                  <p className={`text-sm leading-relaxed ${changed ? "text-[#1F2933]" : "text-gray-400"}`}>
                                    {live || <span className="italic text-gray-300">—</span>}
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          {/* Proposed column */}
                          <div className="px-5 py-4 space-y-4 bg-white">
                            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3">{t("expertDetail.draft.proposedCol")}</p>
                            {draftFields.map(({ key, live, proposed }) => {
                              const changed = (live || "") !== (proposed || "");
                              return (
                                <div key={key}>
                                  <p className="text-xs font-medium text-gray-400 mb-0.5">{t(`expertDetail.draft.fields.${key}`)}</p>
                                  <p className={`text-sm leading-relaxed ${changed ? "font-medium text-amber-800 bg-amber-100/60 px-1.5 py-0.5 rounded" : "text-gray-400"}`}>
                                    {proposed || <span className="italic text-gray-300">—</span>}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-4">
                    <div>
                      <SectionLabel>{t("expertDetail.profile.summary")}</SectionLabel>
                      {expert.summary
                        ? <p className="text-sm text-[#1F2933] leading-relaxed">{expert.summary}</p>
                        : <p className="text-sm text-gray-400 italic">{t("expertDetail.profile.noSummary")}</p>}
                    </div>
                    <div>
                      <SectionLabel>{t("expertDetail.profile.fullBio")}</SectionLabel>
                      {expert.bio
                        ? <p className="text-sm text-[#1F2933] leading-relaxed">{expert.bio}</p>
                        : <p className="text-sm text-gray-400 italic">{t("expertDetail.profile.noBio")}</p>}
                    </div>
                  </div>

                  <div>
                    <SectionLabel>{t("expertDetail.profile.sessionFormat")}</SectionLabel>
                    {expert.session_format ? (
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                        expert.session_format === "ONLINE"    ? "bg-blue-100 text-blue-700"   :
                        expert.session_format === "IN_PERSON" ? "bg-purple-100 text-purple-700" :
                        "bg-teal-100 text-teal-700"
                      }`}>
                        {{ ONLINE: "Online", IN_PERSON: "In-Person", BOTH: "Online & In-Person" }[expert.session_format]}
                      </span>
                    ) : <p className="text-sm text-gray-400 italic">{t("expertDetail.profile.noSessionFormat")}</p>}
                  </div>

                  <div>
                    <SectionLabel>{t("expertDetail.profile.languagesSpoken")}</SectionLabel>
                    {expert.languages?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {expert.languages.map((lang) => (
                          <span key={lang} className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#445446]/10 text-[#445446]">{lang}</span>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-400 italic">{t("expertDetail.profile.noLanguages")}</p>}
                  </div>

                  {expert.pending_languages?.length > 0 && (
                    <div>
                      <SectionLabel>{t("expertDetail.profile.pendingLanguages")}</SectionLabel>
                      <div className="flex flex-wrap gap-3">
                        {expert.pending_languages.map((lang) => {
                          const isConfirming = langConfirm?.lang === lang;
                          const isLoading    = langActionLoading === lang;
                          return (
                            <div key={lang} className="flex items-center gap-2.5 pl-4 pr-2.5 py-2 rounded-full text-sm font-medium bg-amber-50 border border-amber-200 text-amber-700">
                              <span>
                                {lang}
                                {isConfirming && (
                                  <span className="ml-1.5 font-normal text-amber-600">
                                    — {langConfirm.action === 'approve' ? t("expertDetail.profile.langApproveQuestion") : t("expertDetail.profile.langRejectQuestion")}
                                  </span>
                                )}
                              </span>

                              {isConfirming ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => langConfirm.action === 'approve' ? handleApproveLanguage(lang) : handleRejectLanguage(lang)}
                                    disabled={isLoading}
                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${langConfirm.action === 'approve' ? 'bg-green-100 hover:bg-green-200 text-green-700' : 'bg-red-100 hover:bg-red-200 text-red-600'}`}
                                  >
                                    {isLoading ? '…' : t("expertDetail.profile.langConfirm")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLangConfirm(null)}
                                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                                  >
                                    {t("expertDetail.profile.langCancel")}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setLangConfirm({ lang, action: 'approve' })}
                                    disabled={isLoading}
                                    title={t("expertDetail.profile.langApproveQuestion")}
                                    className="p-1.5 rounded-full bg-green-100 hover:bg-green-200 text-green-700 disabled:opacity-50 transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLangConfirm({ lang, action: 'reject' })}
                                    disabled={isLoading}
                                    title={t("expertDetail.profile.langRejectQuestion")}
                                    className="p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-600 disabled:opacity-50 transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <SectionLabel>{t("expertDetail.profile.location")}</SectionLabel>
                    {hasAddress
                      ? <p className="text-sm text-[#1F2933]">{[expert.address_street, expert.address_city, expert.address_postcode].filter(Boolean).join(", ")}</p>
                      : <p className="text-sm text-gray-400 italic">{t("expertDetail.profile.noLocation")}</p>}
                  </div>

                  <div>
                    <SectionLabel>{t("expertDetail.profile.qualifications")}</SectionLabel>
                    {expert.qualifications?.length > 0 ? (
                      <ul className="space-y-2">
                        {expert.qualifications.map((q) => (
                          <li key={q.id} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]">
                            <p className="text-sm font-medium text-[#1F2933]">
                              {q.type === "OTHER" ? q.custom_name : t(`expertMgmt.qual.${q.type}`, { defaultValue: q.type })}
                            </p>
                            <DocLink url={q.document_url} />
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-gray-400 italic">{t("expertDetail.profile.noQualifications")}</p>}
                  </div>

                  <div>
                    <SectionLabel>{t("expertDetail.profile.certifications")}</SectionLabel>
                    {expert.certifications?.length > 0 ? (
                      <ul className="space-y-2">
                        {expert.certifications.map((c) => (
                          <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]">
                            <p className="text-sm font-medium text-[#1F2933]">{c.name}</p>
                            <DocLink url={c.document_url} />
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-gray-400 italic">{t("expertDetail.profile.noCertifications")}</p>}
                  </div>

                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <SectionLabel>{t("expertDetail.bizInfo.title")}</SectionLabel>
                        <p className="text-xs text-gray-400 italic -mt-1">{t("expertDetail.bizInfo.subtitle")}</p>
                      </div>
                      {/* Year + status selectors */}
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <span className="text-xs text-gray-400">{t("expertDetail.bizInfo.yearLabel")}</span>
                        <select value={exportYear} onChange={(e) => setExportYear(Number(e.target.value))}
                          className="text-xs border border-[#E4E7E4] rounded-lg px-2 py-1.5 bg-white text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30">
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                        <span className="text-xs text-gray-400">{t("expertDetail.bizInfo.statusLabel")}</span>
                        <select value={summaryStatus} onChange={(e) => setSummaryStatus(e.target.value)}
                          className="text-xs border border-[#E4E7E4] rounded-lg px-2 py-1.5 bg-white text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30">
                          <option value="ALL">{t("expertDetail.bizInfo.statusAll")}</option>
                          <option value="CONFIRMED">{t("expertDetail.bizInfo.statusConfirmed")}</option>
                          <option value="COMPLETED">{t("expertDetail.bizInfo.statusCompleted")}</option>
                        </select>
                      </div>
                    </div>

                    {/* DAC7 reporting threshold flag */}
                    {expert.dac7?.threshold_reached && (
                      <div className="flex items-start gap-2.5 px-4 py-3 mb-3 rounded-xl border border-amber-300 bg-amber-50">
                        <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-amber-800">{t("expertDetail.bizInfo.dac7Title", { year: expert.dac7.year })}</p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            {expert.dac7.transaction_count} {t("expertDetail.bizInfo.dac7Transaction", { count: expert.dac7.transaction_count })} &middot; £{expert.dac7.gross_earnings.toFixed(2)} {t("expertDetail.bizInfo.dac7Gross")}
                            {expert.dac7.threshold_reason === "both"
                              ? t("expertDetail.bizInfo.dac7Suffix_both")
                              : expert.dac7.threshold_reason === "transactions"
                              ? t("expertDetail.bizInfo.dac7Suffix_transactions")
                              : t("expertDetail.bizInfo.dac7Suffix_amount")}
                            {" "}{t("expertDetail.bizInfo.dac7Advice")}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Financial summary cards */}
                    {summaryLoading ? (
                      <div className="flex justify-center py-4 mb-3">
                        <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                      </div>
                    ) : summary ? (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {(() => {
                          const cur = expert.services?.find(s => s.currency)?.currency || 'EUR';
                          const fmt = (n) => new Intl.NumberFormat('en', { style: 'currency', currency: cur }).format(n);
                          return [
                            { key: "gross",        value: fmt(summary.total_gross) },
                            { key: "fees",         value: fmt(summary.total_fees) },
                            { key: "net",          value: fmt(summary.total_net), highlight: true },
                            { key: "sessions",     value: summary.completed_sessions },
                            { key: "refundCount",  value: summary.refund_count },
                            { key: "refundTotal",  value: fmt(summary.total_refunded) },
                          ];
                        })().map(({ key, value, highlight }) => (
                          <div key={key} className={`rounded-xl p-3 border ${highlight ? "bg-[#445446]/5 border-[#445446]/20" : "bg-[#F5F7F5] border-[#E4E7E4]"}`}>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t(`expertDetail.bizInfo.cards.${key}`)}</p>
                            <p className={`text-sm font-bold ${highlight ? "text-[#445446]" : "text-[#1F2933]"}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* CSV export */}
                    <div className="flex items-center gap-2 mb-3">
                      <button onClick={handleExportCsv} disabled={exporting || !expert.business_info}
                        className="flex items-center gap-1.5 text-xs font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 disabled:opacity-40 px-3 py-1.5 rounded-lg transition-colors">
                        {exporting ? <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                        )}
                        {exporting ? t("expertDetail.bizInfo.exporting") : t("expertDetail.bizInfo.exportBtn")}
                      </button>
                      {!expert.business_info && (
                        <span className="text-xs text-gray-400">{t("expertDetail.bizInfo.exportNoBiz")}</span>
                      )}
                    </div>
                    {exportError && <p className="text-xs text-red-500 mb-2">{exportError}</p>}
                    {expert.business_info ? (() => {
                      const bi = expert.business_info;
                      const rows = [
                        [t("expertDetail.bizInfo.rows.entityType"), bi.entity_type === "INDIVIDUAL" ? t("expertDetail.bizInfo.rows.individual") : t("expertDetail.bizInfo.rows.company")],
                        [t("expertDetail.bizInfo.rows.legalName"), bi.legal_name],
                        ...(bi.entity_type === "INDIVIDUAL" && bi.date_of_birth ? [[t("expertDetail.bizInfo.rows.dob"), new Date(bi.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })]] : []),
                        [t("expertDetail.bizInfo.rows.street"), bi.address_street],
                        [t("expertDetail.bizInfo.rows.city"), bi.address_city],
                        [t("expertDetail.bizInfo.rows.postalCode"), bi.address_postal_code],
                        [t("expertDetail.bizInfo.rows.country"), bi.address_country],
                        [t("expertDetail.bizInfo.rows.tin"), bi.tin],
                        ...(bi.vat_number ? [[t("expertDetail.bizInfo.rows.vat"), bi.vat_number]] : []),
                        ...(bi.entity_type === "COMPANY" && bi.company_reg_number ? [[t("expertDetail.bizInfo.rows.companyReg"), bi.company_reg_number]] : []),
                        [t("expertDetail.bizInfo.rows.iban"), bi.iban],
                        [t("expertDetail.bizInfo.rows.bizEmail"), bi.business_email],
                        ...(bi.municipality ? [[t("expertDetail.bizInfo.rows.municipality"), bi.municipality]] : []),
                        ...(bi.business_address ? [[t("expertDetail.bizInfo.rows.bizAddress"), bi.business_address]] : []),
                      ];
                      return (
                        <div className="rounded-xl border border-[#E4E7E4] divide-y divide-[#F0F2F0] overflow-hidden">
                          {rows.map(([label, value]) => (
                            <div key={label} className="flex gap-3 px-4 py-2.5">
                              <span className="text-xs font-medium text-gray-400 w-40 flex-shrink-0">{label}</span>
                              <span className="text-xs text-[#1F2933] break-words min-w-0">{value || "—"}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })() : (
                      <div className="px-4 py-3.5 rounded-xl border border-amber-200 bg-amber-50">
                        <p className="text-xs font-semibold text-amber-700">{t("expertDetail.bizInfo.noBizInfo")}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <SectionLabel>{t("expertDetail.insurance.title")}</SectionLabel>
                    {insurance ? (
                      <div className={`px-4 py-3.5 rounded-xl border ${expired ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-sm font-semibold mb-0.5 ${expired ? "text-red-700" : "text-green-800"}`}>
                              {expired ? t("expertDetail.insurance.expired") : t("expertDetail.insurance.active")}
                            </p>
                            <p className={`text-xs ${expired ? "text-red-600" : "text-green-700"}`}>
                              {t("expertDetail.insurance.expiresLabel")} <span className="font-medium">{formatDate(insurance.policy_expires_at)}</span>
                            </p>
                          </div>
                          <DocLink url={insurance.document_url} label={t("expertDetail.insurance.viewPolicy")} />
                        </div>
                        {expired && <p className="mt-2 text-xs font-semibold text-red-600">{t("expertDetail.insurance.isExpired")}</p>}
                      </div>
                    ) : (
                      <div className="px-4 py-3.5 rounded-xl border border-amber-200 bg-amber-50">
                        <p className="text-xs font-semibold text-amber-700">{t("expertDetail.insurance.noInsurance")}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <SectionLabel>{t("expertDetail.services.title", { count: expert.services?.length ?? 0 })}</SectionLabel>
                    {expert.services?.length > 0 ? (
                      <div className="space-y-2">
                        {expert.services.map((svc) => (
                          <div key={svc.id} className="px-4 py-3 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-semibold text-[#1F2933]">{svc.title}</p>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {svc.format && FORMAT_BADGE_CLS[svc.format] && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FORMAT_BADGE_CLS[svc.format]}`}>
                                    {t(`expertDetail.formatBadge.${svc.format}`, { defaultValue: svc.format })}
                                  </span>
                                )}
                                {svc.cluster && CLUSTER_BADGE_CLS[svc.cluster] && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CLUSTER_BADGE_CLS[svc.cluster]}`}>
                                    {t(`expertDetail.clusterBadge.${svc.cluster}`, { defaultValue: svc.cluster })}
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${svc.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                                  {svc.is_active ? t("expertDetail.services.active") : t("expertDetail.services.inactive")}
                                </span>
                              </div>
                            </div>
                            {svc.description && <p className="text-xs text-gray-500 mb-1">{svc.description}</p>}
                            <p className="text-xs text-gray-400">{svc.duration_minutes} min · {new Intl.NumberFormat('en', { style: 'currency', currency: svc.currency || 'EUR' }).format(parseFloat(svc.price))}</p>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-400 italic">{t("expertDetail.services.noServices")}</p>}
                  </div>

                  <div>
                    <SectionLabel>{t("expertDetail.stripe.title")}</SectionLabel>
                    {expert.stripe_account_id ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                          {expert.stripe_account_id}
                        </span>
                        {expert.stripe_onboarding_complete ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" /></svg>
                            {t("expertDetail.stripe.connected")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
                            {t("expertDetail.stripe.pendingOnboarding")}
                          </span>
                        )}
                        <a
                          href={`https://dashboard.stripe.com/connect/accounts/${expert.stripe_account_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#635BFF] hover:underline"
                        >
                          {t("expertDetail.stripe.viewInStripe")}
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                        </a>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        {t("expertDetail.stripe.notConnected")}
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* ── Bookings tab ── */}
              {activeTab === "bookings" && (
                bookingsLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                    <span className="text-xs text-gray-400">{t("expertDetail.bookingsTab.loading")}</span>
                  </div>
                ) : bookings.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-4">{t("expertDetail.bookingsTab.noBookings")}</p>
                ) : (
                  <div className="space-y-2">
                    {bookings.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBookingId(b.id)}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-[#E4E7E4] bg-[#FAFAFA] hover:bg-[#F0F2F0] transition-colors text-left"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#1F2933] truncate">#{b.id} · {b.service?.title || t("expertDetail.bookingsTab.sessionFallback")}</p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-tight">
                            <span className="block">
                              {formatBookingTime(b.scheduled_at, expert.timezone).primary}
                              {b.parent?.name ? ` · ${b.parent.name}` : ""}
                              {b.amount ? ` · ${new Intl.NumberFormat('en', { style: 'currency', currency: b.currency || 'EUR' }).format(Number(b.amount))}` : ""}
                            </span>
                            <span className="block text-gray-300">
                              {formatBookingTime(b.scheduled_at, expert.timezone).utc}
                            </span>
                          </p>
                        </div>
                        <BookingStatusBadge status={b.status} />
                      </button>
                    ))}
                  </div>
                )
              )}

              {/* ── Activity tab ── */}
              {activeTab === "activity" && (
                auditLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                    <span className="text-xs text-gray-400">{t("expertDetail.activityTab.loading")}</span>
                  </div>
                ) : auditLog.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">{t("expertDetail.activityTab.noActivity")}</p>
                ) : (
                  <ol className="relative border-l border-[#E4E7E4] ml-2 space-y-4">
                    {(() => {
                      const latestChangeReqIdx = auditLog.findIndex(
                        (e) => e.action === "REQUEST_CHANGES"
                      );
                      return auditLog.map((entry, idx) => {
                        const isExpertAction = entry.action.startsWith("EXPERT_");
                        const isChangeReq    = entry.action === "REQUEST_CHANGES";
                        const isPending =
                          isChangeReq &&
                          idx === latestChangeReqIdx &&
                          expert.status === "CHANGES_REQUESTED";
                        const isResolved = isChangeReq && !isPending;

                        return (
                          <li key={entry.id} className="ml-4">
                            {isChangeReq ? (
                              <div className={`absolute -left-1.5 mt-1 w-3 h-3 rounded-full border-2 ${isPending ? "bg-amber-100 border-amber-400" : "bg-green-100 border-green-500"}`} />
                            ) : isExpertAction ? (
                              <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-blue-100 border-2 border-blue-400" />
                            ) : (
                              <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-[#445446]/20 border-2 border-[#445446]/40" />
                            )}

                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-semibold text-[#1F2933]">
                                {t(`expertDetail.actionLabels.${entry.action}`, { defaultValue: entry.action })}
                              </p>
                              {isExpertAction && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200">
                                  {t("expertDetail.activityTab.expertBadge")}
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                                  {t("expertDetail.activityTab.awaiting")}
                                </span>
                              )}
                              {isResolved && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" /></svg>
                                  {t("expertDetail.activityTab.resolved")}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-400 mt-0.5">
                              {isExpertAction ? `${entry.admin_name} ${t("expertDetail.activityTab.expertSuffix")}` : entry.admin_name} · {new Date(entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                            {entry.note && (
                              <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-3 py-2 border border-[#E4E7E4] whitespace-pre-wrap">{entry.note}</p>
                            )}
                          </li>
                        );
                      });
                    })()}
                  </ol>
                )
              )}
            </div>
          </div>
        </div>

        {/* ── Right column: actions ── */}
        <div className="space-y-4">

          {expert.user?.account_deleted ? (
            /* ── Account has been GDPR-erased — no actions available ── */
            <div className="bg-gray-50 rounded-2xl border border-[#E4E7E4] p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500 mb-1">{t("expertDetail.accountDeleted.title")}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{t("expertDetail.accountDeleted.message")}</p>
            </div>
          ) : (
            <>
              {/* Status actions */}
              <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5">
                <SectionLabel>{t("expertDetail.statusActions.title")}</SectionLabel>
                <div className="flex flex-col gap-2">
                  {expert.status === "SUSPENDED" ? (
                    <button onClick={() => setConfirmAction("reactivate")} disabled={!!actionLoading}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 transition-colors">
                      {actionLoading === "reactivate" ? t("expertDetail.statusActions.reactivating") : t("expertDetail.statusActions.reactivate")}
                    </button>
                  ) : expert.status === "APPROVED" ? (
                    <>
                      <button onClick={() => setConfirmAction("reject")} disabled={!!actionLoading}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors">
                        {actionLoading === "reject" ? t("expertDetail.statusActions.rejecting") : t("expertDetail.statusActions.reject")}
                      </button>
                      <button onClick={() => setConfirmAction("suspend")} disabled={!!actionLoading}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 transition-colors">
                        {actionLoading === "suspend" ? t("expertDetail.statusActions.suspending") : t("expertDetail.statusActions.suspend")}
                      </button>
                    </>
                  ) : expert.status === "REJECTED" ? (
                    <>
                      <button
                        onClick={() => setConfirmAction("approve")}
                        disabled={!!actionLoading || !expert.stripe_onboarding_complete}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {actionLoading === "approve" ? t("expertDetail.statusActions.approving") : t("expertDetail.statusActions.approve")}
                      </button>
                      {!expert.stripe_onboarding_complete && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                          {t("expertDetail.statusActions.cannotApprove")}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirmAction("approve")}
                        disabled={!!actionLoading || !expert.stripe_onboarding_complete}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {actionLoading === "approve" ? t("expertDetail.statusActions.approving") : t("expertDetail.statusActions.approve")}
                      </button>
                      {!expert.stripe_onboarding_complete && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                          {t("expertDetail.statusActions.cannotApprove")}
                        </p>
                      )}
                      <button onClick={() => setConfirmAction("reject")} disabled={!!actionLoading}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors">
                        {actionLoading === "reject" ? t("expertDetail.statusActions.rejecting") : t("expertDetail.statusActions.reject")}
                      </button>
                    </>
                  )}
                  {["PENDING", "APPROVED", "CHANGES_REQUESTED"].includes(expert.status) && (
                    <button onClick={() => { setChangesNote(expert.change_request_note || ""); setShowRequestChanges(true); }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
                      {t("expertDetail.statusActions.requestChanges")}
                    </button>
                  )}
                </div>
              </div>

              {/* Support tools */}
              <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5">
                <SectionLabel>{t("expertDetail.supportTools.title")}</SectionLabel>
                <div className="flex flex-col gap-2">
                  <button onClick={handlePasswordReset} disabled={!!actionLoading}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#E4E7E4] text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                    {actionLoading === "passwordReset" ? t("expertDetail.supportTools.sending") : t("expertDetail.supportTools.passwordReset")}
                  </button>
                  {!expert.user?.is_verified && (
                    <>
                      <button onClick={handleResendVerification} disabled={!!actionLoading}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#E4E7E4] text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                        {actionLoading === "resendVerification" ? t("expertDetail.supportTools.sending") : t("expertDetail.supportTools.resendVerification")}
                      </button>
                      <button onClick={handleManualVerify} disabled={!!actionLoading}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors">
                        {actionLoading === "manualVerify" ? t("expertDetail.supportTools.verifying") : t("expertDetail.supportTools.markVerified")}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Danger zone */}
              <div className="bg-white rounded-2xl border-2 border-dashed border-red-100 p-5">
                <SectionLabel>{t("expertDetail.dangerZone.title")}</SectionLabel>
                <p className="text-xs text-gray-400 mb-3">{t("expertDetail.dangerZone.subtitle")}</p>
                <button onClick={() => { setGdprEmail(""); setShowGdprDelete(true); }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                  {t("expertDetail.dangerZone.deleteBtn")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Booking detail modal ── */}
      {selectedBookingId && (
        <BookingDetailModal
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          onUpdated={() => { setBookingsLoaded(false); loadBookings(); }}
        />
      )}

      {/* ── Request Changes modal ── */}
      {showRequestChanges && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !changesLoading) setShowRequestChanges(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">{t("expertDetail.requestChanges.title")}</h3>
            <p className="text-sm text-gray-500 text-center mb-4">{t("expertDetail.requestChanges.subtitle")}</p>
            <textarea value={changesNote} onChange={(e) => { if (e.target.value.length <= 2000) setChangesNote(e.target.value); }}
              placeholder={t("expertDetail.requestChanges.placeholder")} rows={5}
              className="w-full px-3 py-2.5 text-sm border border-[#E4E7E4] rounded-lg text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none" />
            <p className="text-xs text-gray-400 text-right mb-3">{changesNote.length}/2000</p>
            {changesError && <p className="text-xs text-red-600 mb-3">{changesError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowRequestChanges(false); setChangesNote(""); setChangesError(""); }} disabled={changesLoading}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                {t("expertDetail.requestChanges.cancel")}
              </button>
              <button onClick={handleRequestChanges} disabled={changesLoading || !changesNote.trim()}
                className="flex-1 py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50">
                {changesLoading ? t("expertDetail.requestChanges.sending") : t("expertDetail.requestChanges.send")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status action confirm modal ── */}
      {confirmAction && (() => {
        const cfg = {
          approve: {
            title: t("expertDetail.confirmModal.approve_title"),
            body:  t("expertDetail.confirmModal.approve_body", { name }),
            iconBg: "bg-green-50",
            btnCls: "bg-green-600 hover:bg-green-700",
            icon: <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>,
          },
          reject: {
            title: t("expertDetail.confirmModal.reject_title"),
            body:  t("expertDetail.confirmModal.reject_body", { name }),
            iconBg: "bg-red-50",
            btnCls: "bg-red-500 hover:bg-red-600",
            icon: <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>,
          },
          suspend: {
            title: t("expertDetail.confirmModal.suspend_title"),
            body:  t("expertDetail.confirmModal.suspend_body", { name }),
            iconBg: "bg-orange-50",
            btnCls: "bg-orange-500 hover:bg-orange-600",
            icon: <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
          },
          reactivate: {
            title: t("expertDetail.confirmModal.reactivate_title"),
            body:  t("expertDetail.confirmModal.reactivate_body", { name }),
            iconBg: "bg-green-50",
            btnCls: "bg-green-600 hover:bg-green-700",
            icon: <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>,
          },
        }[confirmAction] || {};
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setConfirmAction(null); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${cfg.iconBg}`}>
                {cfg.icon}
              </div>
              <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">{cfg.title}</h3>
              <p className="text-sm text-gray-500 text-center mb-4">{cfg.body}</p>
              {confirmAction === "approve" && !expert.insurance && (
                <div className="flex items-start gap-2 px-3 py-2.5 mb-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-amber-800">{t("expertDetail.confirmModal.noInsurance")}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setConfirmAction(null)}
                  className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  {t("expertDetail.confirmModal.cancel")}
                </button>
                <button onClick={handleConfirmAction}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-white text-sm font-medium transition-colors ${cfg.btnCls}`}>
                  {t("expertDetail.confirmModal.confirm")}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── GDPR Delete modal ── */}
      {showGdprDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !gdprLoading) setShowGdprDelete(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-red-700 text-center mb-4">{t("expertDetail.gdpr.title")}</h3>
            {expert.pending_payout_count > 0 ? (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-xs text-red-800 space-y-1">
                  <p className="font-semibold">{t("expertDetail.gdpr.pendingTitle")}</p>
                  <p className="text-red-700 mt-1">
                    {t("expertDetail.gdpr.pendingBody", { count: expert.pending_payout_count })}
                  </p>
                </div>
                <button
                  onClick={() => { setShowGdprDelete(false); setGdprEmail(""); setGdprError(""); }}
                  className="w-full py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t("expertDetail.gdpr.close")}
                </button>
              </>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-2 text-xs text-red-700 space-y-1">
                  <p className="font-semibold">{t("expertDetail.gdpr.eraseTitle")}</p>
                  <ul className="list-disc list-inside space-y-0.5 text-red-600">
                    <li>{t("expertDetail.gdpr.erase1")}</li>
                    <li>{t("expertDetail.gdpr.erase2")}</li>
                    <li>{t("expertDetail.gdpr.erase3")}</li>
                    <li>{t("expertDetail.gdpr.erase4")}</li>
                    <li>{t("expertDetail.gdpr.erase5")}</li>
                  </ul>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">{t("expertDetail.gdpr.retainTitle")}</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    <li>{t("expertDetail.gdpr.retain1")}</li>
                    <li>{t("expertDetail.gdpr.retain2")}</li>
                    <li>{t("expertDetail.gdpr.retain3")}</li>
                    <li>{t("expertDetail.gdpr.retain4")}</li>
                  </ul>
                  <p className="mt-1 text-amber-600">{t("expertDetail.gdpr.gdprNote")}</p>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {t("expertDetail.gdpr.typeEmail")} <span className="font-medium text-[#1F2933]">{expert.user?.email}</span>
                </p>
                <input type="email" value={gdprEmail} onChange={(e) => setGdprEmail(e.target.value)}
                  placeholder={t("expertDetail.gdpr.emailPlaceholder")}
                  className="w-full px-3 py-2.5 text-sm border border-[#E4E7E4] rounded-lg text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 mb-3" />
                {gdprError && <p className="text-xs text-red-600 mb-3">{gdprError}</p>}
                <div className="flex gap-3">
                  <button onClick={() => { setShowGdprDelete(false); setGdprEmail(""); setGdprError(""); }} disabled={gdprLoading}
                    className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                    {t("expertDetail.gdpr.cancel")}
                  </button>
                  <button onClick={handleGdprDelete}
                    disabled={gdprLoading || gdprEmail.trim().toLowerCase() !== expert.user?.email?.toLowerCase()}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed">
                    {gdprLoading ? t("expertDetail.gdpr.erasing") : t("expertDetail.gdpr.eraseBtn")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExpertDetailSection;
