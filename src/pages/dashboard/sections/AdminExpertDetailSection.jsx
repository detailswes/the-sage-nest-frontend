import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  adminManualRefund,
  requestChanges,
  unpublishExpert,
  republishExpert,
  getAuditLog,
  gdprDeleteExpert,
  approveLanguage,
  rejectLanguage,
} from "../../../api/adminApi";
import { getProfileImageUrl, getDocumentUrl } from "../../../utils/imageUrl";

// ─── Shared helpers (mirrors ExpertManagementSection constants) ───────────────

const QUAL_LABEL = {
  LACTATION_CONSULTANT:       "Lactation Consultant (IBCLC)",
  BREASTFEEDING_COUNSELLOR:   "Breastfeeding Counsellor",
  INFANT_SLEEP_CONSULTANT:    "Infant Sleep Consultant",
  DOULA:                      "Doula",
  MIDWIFE:                    "Midwife",
  BABY_OSTEOPATH:             "Baby Osteopath",
  PAEDIATRIC_NUTRITIONIST:    "Paediatric Nutritionist",
  EARLY_YEARS_SPECIALIST:     "Early Years Specialist",
  POSTNATAL_PHYSIOTHERAPIST:  "Postnatal Physiotherapist",
  PARENTING_COACH:            "Parenting Coach",
  OTHER:                      "Other",
};

const FORMAT_BADGE = {
  ONLINE:    { label: "Online",     cls: "bg-blue-100 text-blue-700" },
  IN_PERSON: { label: "In-Person",  cls: "bg-purple-100 text-purple-700" },
};

const CLUSTER_BADGE = {
  FOR_MUM: { label: "For Mum",  cls: "bg-pink-100 text-pink-700" },
  FOR_BABY: { label: "For Baby", cls: "bg-cyan-100 text-cyan-700" },
  PACKAGE:  { label: "Package",  cls: "bg-amber-100 text-amber-700" },
  GIFT:     { label: "Gift",     cls: "bg-green-100 text-green-700" },
};

const ACTION_LABELS = {
  APPROVE:             "Approved",
  REJECT:              "Rejected",
  SUSPEND:             "Suspended",
  REACTIVATE:          "Reactivated",
  REQUEST_CHANGES:     "Changes requested",
  UNPUBLISH:           "Unpublished",
  REPUBLISH:           "Republished",
  MANUAL_VERIFY:       "Manually verified",
  MANUAL_REFUND:       "Manual refund issued",
  SEND_PASSWORD_RESET: "Password reset sent",
  RESEND_VERIFICATION: "Verification email resent",
  GDPR_DELETE:         "Account deleted (GDPR)",
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

const DocLink = ({ url, label = "View document" }) => {
  if (!url) return <span className="text-xs text-gray-400 italic">No document</span>;
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
      {label}
    </a>
  );
};

const StatusBadge = ({ status }) => {
  const cfg = {
    APPROVED:          { cls: "bg-green-100 text-green-700",   label: "Approved" },
    REJECTED:          { cls: "bg-red-100 text-red-600",       label: "Rejected" },
    SUSPENDED:         { cls: "bg-orange-100 text-orange-700", label: "Suspended" },
    PENDING:           { cls: "bg-amber-100 text-amber-700",   label: "Pending Review" },
    CHANGES_REQUESTED: { cls: "bg-violet-100 text-violet-700", label: "Changes Requested" },
  }[status] || { cls: "bg-gray-100 text-gray-500", label: status };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const BookingStatusBadge = ({ status }) => {
  const cfg = {
    CONFIRMED:       { cls: "bg-green-100 text-green-700",  label: "Confirmed" },
    COMPLETED:       { cls: "bg-blue-100 text-blue-700",    label: "Completed" },
    CANCELLED:       { cls: "bg-red-100 text-red-600",      label: "Cancelled" },
    REFUNDED:        { cls: "bg-gray-100 text-gray-600",    label: "Refunded" },
    PENDING_PAYMENT: { cls: "bg-amber-100 text-amber-700",  label: "Pending Payment" },
  }[status] || { cls: "bg-gray-100 text-gray-500", label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const AdminExpertDetailSection = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [expert, setExpert]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError]     = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [langActionLoading, setLangActionLoading] = useState(null); // language being actioned
  const [langConfirm, setLangConfirm] = useState(null); // { lang, action: 'approve' | 'reject' }

  // Tabs
  const [activeTab, setActiveTab]   = useState("profile");

  // Bookings tab
  const [bookings, setBookings]         = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsLoaded, setBookingsLoaded]   = useState(false);
  const [refundPending, setRefundPending]     = useState(null);
  const [refundingId, setRefundingId]         = useState(null);
  const [refundError, setRefundError]         = useState("");

  // Activity tab
  const [auditLog, setAuditLog]       = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditLoaded, setAuditLoaded]   = useState(false);

  // Action modals
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [changesNote, setChangesNote]               = useState("");
  const [changesLoading, setChangesLoading]         = useState(false);
  const [changesError, setChangesError]             = useState("");

  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [publishLoading, setPublishLoading]             = useState(false);
  const [publishError, setPublishError]                 = useState("");

  const [showGdprDelete, setShowGdprDelete] = useState(false);
  const [gdprEmail, setGdprEmail]           = useState("");
  const [gdprLoading, setGdprLoading]       = useState(false);
  const [gdprError, setGdprError]           = useState("");

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
      setError("Expert not found or failed to load.");
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  const handleApproveLanguage = async (language) => {
    setLangConfirm(null);
    setLangActionLoading(language);
    try {
      const updated = await approveLanguage(expert.id, language);
      setExpert((e) => ({ ...e, languages: updated.languages, pending_languages: updated.pending_languages }));
    } catch (e) {
      setActionError(e?.response?.data?.error || "Failed to approve language.");
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
      setActionError(e?.response?.data?.error || "Failed to reject language.");
    } finally {
      setLangActionLoading(null);
    }
  };

  const runAction = async (label, fn) => {
    clearFeedback();
    setActionLoading(label);
    try {
      await fn();
      setActionSuccess(`${label} successfully.`);
      await loadExpert();
      setBookingsLoaded(false);
      setAuditLoaded(false);
    } catch (e) {
      setActionError(e?.response?.data?.error || `${label} failed.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove    = () => runAction("Approved",    () => approveExpert(id));
  const handleReject     = () => runAction("Rejected",    () => rejectExpert(id));
  const handleSuspend    = () => runAction("Suspended",   () => suspendExpert(id));
  const handleReactivate = () => runAction("Reactivated", () => reactivateExpert(id));
  const handlePasswordReset      = () => runAction("Password reset sent",         () => sendPasswordReset(id));
  const handleResendVerification = () => runAction("Verification email resent",   () => resendVerification(id));
  const handleManualVerify       = () => runAction("Marked as verified",          () => manuallyVerify(id));

  const handleRequestChanges = async () => {
    if (!changesNote.trim()) { setChangesError("Please enter a note."); return; }
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
      setActionSuccess("Change request sent.");
      setAuditLoaded(false);
    } catch (e) {
      setChangesError(e?.response?.data?.error || "Failed to send request.");
    } finally {
      setChangesLoading(false);
    }
  };

  const handlePublishToggle = async () => {
    setPublishLoading(true);
    setPublishError("");
    try {
      if (expert.is_published) {
        await unpublishExpert(id);
        setExpert((prev) => ({ ...prev, is_published: false }));
      } else {
        await republishExpert(id);
        setExpert((prev) => ({ ...prev, is_published: true }));
      }
      setShowUnpublishConfirm(false);
      setAuditLoaded(false);
      setActionSuccess(expert.is_published ? "Expert unpublished." : "Expert republished.");
    } catch (e) {
      setPublishError(e?.response?.data?.error || "Action failed.");
    } finally {
      setPublishLoading(false);
    }
  };

  const handleGdprDelete = async () => {
    setGdprLoading(true);
    setGdprError("");
    try {
      await gdprDeleteExpert(id, gdprEmail.trim());
      navigate("/dashboard/admin/experts");
    } catch (e) {
      setGdprError(e?.response?.data?.error || "Deletion failed.");
    } finally {
      setGdprLoading(false);
    }
  };

  const handleRefund = async (booking) => {
    setRefundPending(null);
    setRefundingId(booking.id);
    setRefundError("");
    try {
      await adminManualRefund(booking.id, "Admin manual refund");
      setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: "REFUNDED" } : b));
    } catch (e) {
      setRefundError(e?.response?.data?.error || "Refund failed.");
    } finally {
      setRefundingId(null);
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
      a.download = `tax_report_${safeName}_${exportYear}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Export failed. Please try again.");
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
        <p className="text-sm text-red-500 mb-4">{error || "Expert not found."}</p>
        <button onClick={() => navigate("/dashboard/admin/experts")} className="text-sm text-[#445446] hover:underline">
          ← Back to expert list
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
          Expert Management
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-[#1F2933] truncate">{name}</span>
      </div>

      {/* Feedback banner */}
      {(actionError || actionSuccess) && (
        <div className="mb-4">
          {actionError   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{actionError}</p>}
          {actionSuccess && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">{actionSuccess}</p>}
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
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200">Unlisted</span>
                  )}
                  {expert.user?.is_verified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">Email Verified</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Unverified</span>
                  )}
                  {expert.session_format && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#445446]/10 text-[#445446] font-medium">
                      {expert.session_format === "ONLINE" ? "Online" : expert.session_format === "IN_PERSON" ? "In-Person" : "Online & In-Person"}
                    </span>
                  )}
                  {expert.user?.login_attempts > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      {expert.user.login_attempts} failed login{expert.user.login_attempts !== 1 ? "s" : ""}
                    </span>
                  )}
                  {expert.user?.locked_until && new Date(expert.user.locked_until) > new Date() && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                      Locked until {new Date(expert.user.locked_until).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  {expert.user?.created_at && (
                    <span className="text-xs text-gray-400">Joined {formatDate(expert.user.created_at)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden">
            <div className="flex border-b border-[#E4E7E4]">
              {[
                { key: "profile",  label: "Profile" },
                { key: "bookings", label: `Bookings${expert._count?.bookings ? ` (${expert._count.bookings})` : ""}` },
                { key: "activity", label: "Activity" },
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
                  {(expert.summary || expert.bio) && (
                    <div className="space-y-4">
                      {expert.summary && <div><SectionLabel>Summary</SectionLabel><p className="text-sm text-[#1F2933] leading-relaxed">{expert.summary}</p></div>}
                      {expert.bio && <div><SectionLabel>Full Bio</SectionLabel><p className="text-sm text-[#1F2933] leading-relaxed">{expert.bio}</p></div>}
                    </div>
                  )}

                  {expert.languages?.length > 0 && (
                    <div>
                      <SectionLabel>Languages Spoken</SectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {expert.languages.map((lang) => (
                          <span key={lang} className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#445446]/10 text-[#445446]">{lang}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {expert.pending_languages?.length > 0 && (
                    <div>
                      <SectionLabel>Pending Language Approvals</SectionLabel>
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
                                    — {langConfirm.action === 'approve' ? 'Approve?' : 'Reject?'}
                                  </span>
                                )}
                              </span>

                              {isConfirming ? (
                                /* Confirmation row */
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => langConfirm.action === 'approve' ? handleApproveLanguage(lang) : handleRejectLanguage(lang)}
                                    disabled={isLoading}
                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${langConfirm.action === 'approve' ? 'bg-green-100 hover:bg-green-200 text-green-700' : 'bg-red-100 hover:bg-red-200 text-red-600'}`}
                                  >
                                    {isLoading ? '…' : 'Confirm'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLangConfirm(null)}
                                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                /* Default approve / reject icons */
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setLangConfirm({ lang, action: 'approve' })}
                                    disabled={isLoading}
                                    title="Approve"
                                    className="p-1.5 rounded-full bg-green-100 hover:bg-green-200 text-green-700 disabled:opacity-50 transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLangConfirm({ lang, action: 'reject' })}
                                    disabled={isLoading}
                                    title="Reject"
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

                  {hasAddress && (
                    <div>
                      <SectionLabel>Location</SectionLabel>
                      <p className="text-sm text-[#1F2933]">
                        {[expert.address_street, expert.address_city, expert.address_postcode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}

                  <div>
                    <SectionLabel>Qualifications</SectionLabel>
                    {expert.qualifications?.length > 0 ? (
                      <ul className="space-y-2">
                        {expert.qualifications.map((q) => (
                          <li key={q.id} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]">
                            <p className="text-sm font-medium text-[#1F2933]">{q.type === "OTHER" ? q.custom_name : QUAL_LABEL[q.type] || q.type}</p>
                            <DocLink url={q.document_url} />
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-gray-400 italic">No qualifications added.</p>}
                  </div>

                  <div>
                    <SectionLabel>Certifications</SectionLabel>
                    {expert.certifications?.length > 0 ? (
                      <ul className="space-y-2">
                        {expert.certifications.map((c) => (
                          <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]">
                            <p className="text-sm font-medium text-[#1F2933]">{c.name}</p>
                            <DocLink url={c.document_url} />
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-gray-400 italic">No certifications added.</p>}
                  </div>

                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <SectionLabel>Business Information</SectionLabel>
                        <p className="text-xs text-gray-400 italic -mt-1">Information collected for compliance purposes</p>
                      </div>
                      {/* Year + status selectors */}
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <span className="text-xs text-gray-400">Year</span>
                        <select value={exportYear} onChange={(e) => setExportYear(Number(e.target.value))}
                          className="text-xs border border-[#E4E7E4] rounded-lg px-2 py-1.5 bg-white text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30">
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                        <select value={summaryStatus} onChange={(e) => setSummaryStatus(e.target.value)}
                          className="text-xs border border-[#E4E7E4] rounded-lg px-2 py-1.5 bg-white text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30">
                          <option value="ALL">All</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </div>
                    </div>

                    {/* Financial summary cards */}
                    {summaryLoading ? (
                      <div className="flex justify-center py-4 mb-3">
                        <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                      </div>
                    ) : summary ? (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                          { label: "Gross Earnings",     value: `£${summary.total_gross.toFixed(2)}` },
                          { label: "Fees Deducted",      value: `£${summary.total_fees.toFixed(2)}` },
                          { label: "Net Earnings",       value: `£${summary.total_net.toFixed(2)}`, highlight: true },
                          { label: "Completed Sessions", value: summary.completed_sessions },
                          { label: "Refunds Issued",     value: summary.refund_count },
                          { label: "Total Refunded",     value: `£${summary.total_refunded.toFixed(2)}` },
                        ].map(({ label, value, highlight }) => (
                          <div key={label} className={`rounded-xl p-3 border ${highlight ? "bg-[#445446]/5 border-[#445446]/20" : "bg-[#F5F7F5] border-[#E4E7E4]"}`}>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
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
                        {exporting ? "Exporting…" : "Export CSV"}
                      </button>
                      {!expert.business_info && (
                        <span className="text-xs text-gray-400">CSV export requires business info on file</span>
                      )}
                    </div>
                    {exportError && <p className="text-xs text-red-500 mb-2">{exportError}</p>}
                    {expert.business_info ? (() => {
                      const bi = expert.business_info;
                      const rows = [
                        ["Entity type", bi.entity_type === "INDIVIDUAL" ? "Individual" : "Company / Legal Entity"],
                        ["Full legal name", bi.legal_name],
                        ...(bi.entity_type === "INDIVIDUAL" && bi.date_of_birth ? [["Date of birth", new Date(bi.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })]] : []),
                        ["Primary address", bi.primary_address],
                        ["TIN", bi.tin],
                        ...(bi.vat_number ? [["VAT number", bi.vat_number]] : []),
                        ...(bi.entity_type === "COMPANY" && bi.company_reg_number ? [["Company reg. number", bi.company_reg_number]] : []),
                        ["IBAN / Bank account", bi.iban],
                        ["Email address", bi.business_email],
                        ["Website", bi.website],
                        ...(bi.municipality ? [["Municipality", bi.municipality]] : []),
                        ...(bi.business_address ? [["Business address", bi.business_address]] : []),
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
                        <p className="text-xs font-semibold text-amber-700">⚠️ No business information submitted.</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <SectionLabel>Professional Insurance</SectionLabel>
                    {insurance ? (
                      <div className={`px-4 py-3.5 rounded-xl border ${expired ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-sm font-semibold mb-0.5 ${expired ? "text-red-700" : "text-green-800"}`}>
                              {expired ? "Insurance Expired" : "Insurance Active"}
                            </p>
                            <p className={`text-xs ${expired ? "text-red-600" : "text-green-700"}`}>
                              Expires: <span className="font-medium">{formatDate(insurance.policy_expires_at)}</span>
                            </p>
                          </div>
                          <DocLink url={insurance.document_url} label="View policy" />
                        </div>
                        {expired && <p className="mt-2 text-xs font-semibold text-red-600">⚠️ Insurance has expired.</p>}
                      </div>
                    ) : (
                      <div className="px-4 py-3.5 rounded-xl border border-amber-200 bg-amber-50">
                        <p className="text-xs font-semibold text-amber-700">⚠️ No insurance uploaded.</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <SectionLabel>Services ({expert.services?.length ?? 0})</SectionLabel>
                    {expert.services?.length > 0 ? (
                      <div className="space-y-2">
                        {expert.services.map((svc) => (
                          <div key={svc.id} className="px-4 py-3 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-semibold text-[#1F2933]">{svc.title}</p>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {svc.format && FORMAT_BADGE[svc.format] && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FORMAT_BADGE[svc.format].cls}`}>{FORMAT_BADGE[svc.format].label}</span>
                                )}
                                {svc.cluster && CLUSTER_BADGE[svc.cluster] && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CLUSTER_BADGE[svc.cluster].cls}`}>{CLUSTER_BADGE[svc.cluster].label}</span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${svc.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                                  {svc.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>
                            {svc.description && <p className="text-xs text-gray-500 mb-1">{svc.description}</p>}
                            <p className="text-xs text-gray-400">{svc.duration_minutes} min · £{parseFloat(svc.price).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-400 italic">No services added yet.</p>}
                  </div>

                  <div>
                    <SectionLabel>Stripe Account</SectionLabel>
                    {expert.stripe_account_id ? (
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{expert.stripe_account_id}</span>
                    ) : <p className="text-sm text-gray-400 italic">Not connected</p>}
                  </div>
                </>
              )}

              {/* ── Bookings tab ── */}
              {activeTab === "bookings" && (
                bookingsLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                    <span className="text-xs text-gray-400">Loading bookings…</span>
                  </div>
                ) : bookings.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-4">No bookings on record.</p>
                ) : (
                  <div className="space-y-2">
                    {refundError && <p className="text-xs text-red-600 mb-1">{refundError}</p>}
                    {bookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-[#E4E7E4] bg-[#FAFAFA]">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#1F2933] truncate">#{b.id} · {b.service?.title || "Session"}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(b.scheduled_at)}
                            {b.parent?.name ? ` · ${b.parent.name}` : ""}
                            {b.amount ? ` · £${Number(b.amount).toFixed(2)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <BookingStatusBadge status={b.status} />
                          {b.status === "CONFIRMED" && (
                            <button onClick={() => setRefundPending(b)} disabled={refundingId === b.id}
                              className="text-xs font-medium px-2.5 py-1 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors">
                              {refundingId === b.id ? "Refunding…" : "Refund"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ── Activity tab ── */}
              {activeTab === "activity" && (
                auditLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                    <span className="text-xs text-gray-400">Loading activity…</span>
                  </div>
                ) : auditLog.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No activity recorded yet.</p>
                ) : (
                  <ol className="relative border-l border-[#E4E7E4] ml-2 space-y-4">
                    {auditLog.map((entry) => (
                      <li key={entry.id} className="ml-4">
                        <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-[#445446]/20 border-2 border-[#445446]/40" />
                        <p className="text-xs font-semibold text-[#1F2933]">{ACTION_LABELS[entry.action] || entry.action}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {entry.admin_name} · {new Date(entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {entry.note && (
                          <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-3 py-2 border border-[#E4E7E4] whitespace-pre-wrap">{entry.note}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                )
              )}
            </div>
          </div>
        </div>

        {/* ── Right column: actions ── */}
        <div className="space-y-4">

          {/* Status actions */}
          <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5">
            <SectionLabel>Status Actions</SectionLabel>
            <div className="flex flex-col gap-2">
              {expert.status !== "APPROVED" && expert.status !== "SUSPENDED" && (
                <button onClick={handleApprove} disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 transition-colors">
                  {actionLoading === "Approved" ? "Approving…" : "Approve Expert"}
                </button>
              )}
              {expert.status !== "REJECTED" && expert.status !== "SUSPENDED" && (
                <button onClick={handleReject} disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors">
                  {actionLoading === "Rejected" ? "Rejecting…" : "Reject Expert"}
                </button>
              )}
              {expert.status === "APPROVED" && (
                <button onClick={handleSuspend} disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 transition-colors">
                  {actionLoading === "Suspended" ? "Suspending…" : "Suspend Expert"}
                </button>
              )}
              {expert.status === "SUSPENDED" && (
                <button onClick={handleReactivate} disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 transition-colors">
                  {actionLoading === "Reactivated" ? "Reactivating…" : "Reactivate Expert"}
                </button>
              )}
              {["PENDING", "APPROVED", "CHANGES_REQUESTED"].includes(expert.status) && (
                <button onClick={() => { setChangesNote(expert.change_request_note || ""); setShowRequestChanges(true); }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
                  Request Changes
                </button>
              )}
              {expert.status === "APPROVED" && (
                <button onClick={() => setShowUnpublishConfirm(true)}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    expert.is_published
                      ? "border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100"
                      : "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                  }`}>
                  {expert.is_published ? "Force Unpublish" : "Republish"}
                </button>
              )}
            </div>
          </div>

          {/* Support tools */}
          <div className="bg-white rounded-2xl border border-[#E4E7E4] p-5">
            <SectionLabel>Support Tools</SectionLabel>
            <div className="flex flex-col gap-2">
              <button onClick={handlePasswordReset} disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#E4E7E4] text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                {actionLoading === "Password reset sent" ? "Sending…" : "Send Password Reset"}
              </button>
              {!expert.user?.is_verified && (
                <>
                  <button onClick={handleResendVerification} disabled={!!actionLoading}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#E4E7E4] text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                    {actionLoading === "Verification email resent" ? "Sending…" : "Resend Verification Email"}
                  </button>
                  <button onClick={handleManualVerify} disabled={!!actionLoading}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors">
                    {actionLoading === "Marked as verified" ? "Verifying…" : "Mark as Verified"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-2xl border-2 border-dashed border-red-100 p-5">
            <SectionLabel>Danger Zone</SectionLabel>
            <p className="text-xs text-gray-400 mb-3">Permanently erase all personal data. This cannot be undone.</p>
            <button onClick={() => { setGdprEmail(""); setShowGdprDelete(true); }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
              Delete Account (GDPR Erasure)
            </button>
          </div>
        </div>
      </div>

      {/* ── Refund confirmation ── */}
      {refundPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setRefundPending(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">Issue Refund?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Issue a full refund for booking <span className="font-medium text-[#1F2933]">#{refundPending.id} · {refundPending.service?.title || "Session"}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRefundPending(null)} className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleRefund(refundPending)} className="flex-1 py-2.5 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium">Yes, refund</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Request Changes modal ── */}
      {showRequestChanges && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !changesLoading) setShowRequestChanges(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">Request Profile Changes</h3>
            <p className="text-sm text-gray-500 text-center mb-4">Describe what needs to be corrected. The specialist will receive this note by email.</p>
            <textarea value={changesNote} onChange={(e) => { if (e.target.value.length <= 2000) setChangesNote(e.target.value); }}
              placeholder="e.g. Please upload a clearer copy of your insurance certificate." rows={5}
              className="w-full px-3 py-2.5 text-sm border border-[#E4E7E4] rounded-lg text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none" />
            <p className="text-xs text-gray-400 text-right mb-3">{changesNote.length}/2000</p>
            {changesError && <p className="text-xs text-red-600 mb-3">{changesError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowRequestChanges(false); setChangesNote(""); setChangesError(""); }} disabled={changesLoading}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={handleRequestChanges} disabled={changesLoading || !changesNote.trim()}
                className="flex-1 py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50">
                {changesLoading ? "Sending…" : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unpublish / Republish confirm ── */}
      {showUnpublishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !publishLoading) setShowUnpublishConfirm(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">
              {expert.is_published ? "Hide from Search?" : "Restore to Search?"}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {expert.is_published
                ? "This specialist will no longer appear in parent search results. You can restore them at any time."
                : "This specialist will reappear in parent search results immediately."}
            </p>
            {publishError && <p className="text-xs text-red-600 mb-3 text-center">{publishError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowUnpublishConfirm(false); setPublishError(""); }} disabled={publishLoading}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={handlePublishToggle} disabled={publishLoading}
                className={`flex-1 py-2.5 px-4 rounded-lg text-white text-sm font-medium disabled:opacity-50 ${expert.is_published ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"}`}>
                {publishLoading ? "Saving…" : expert.is_published ? "Yes, Hide" : "Yes, Restore"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GDPR Delete modal ── */}
      {showGdprDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !gdprLoading) setShowGdprDelete(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-red-700 text-center mb-2">Permanent Account Erasure</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-xs text-red-700 space-y-1">
              <p className="font-semibold">This action is irreversible. It will:</p>
              <ul className="list-disc list-inside space-y-0.5 text-red-600">
                <li>Cancel all future bookings and issue Stripe refunds</li>
                <li>Delete all uploaded files (photos, documents)</li>
                <li>Wipe all personal information from the database</li>
                <li>Invalidate all active sessions immediately</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Type the specialist's email to confirm: <span className="font-medium text-[#1F2933]">{expert.user?.email}</span>
            </p>
            <input type="email" value={gdprEmail} onChange={(e) => setGdprEmail(e.target.value)}
              placeholder={expert.user?.email || "specialist@email.com"}
              className="w-full px-3 py-2.5 text-sm border border-[#E4E7E4] rounded-lg text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 mb-3" />
            {gdprError && <p className="text-xs text-red-600 mb-3">{gdprError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowGdprDelete(false); setGdprEmail(""); setGdprError(""); }} disabled={gdprLoading}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={handleGdprDelete}
                disabled={gdprLoading || gdprEmail.trim().toLowerCase() !== expert.user?.email?.toLowerCase()}
                className="flex-1 py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50">
                {gdprLoading ? "Erasing…" : "Erase Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExpertDetailSection;
