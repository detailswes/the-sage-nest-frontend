import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  listExperts,
  approveExpert,
  rejectExpert,
  suspendExpert,
  reactivateExpert,
  sendPasswordReset,
  resendVerification,
  manuallyVerify,
  exportTaxDataCsv,
  listExpertBookings,
  adminManualRefund,
  requestChanges,
  unpublishExpert,
  republishExpert,
  getAuditLog,
  gdprDeleteExpert,
} from "../../../api/adminApi";
import { getProfileImageUrl, getDocumentUrl } from "../../../utils/imageUrl";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 10;

const STATUS_FILTERS = [
  { key: "all",               label: "All" },
  { key: "pending",           label: "Pending" },
  { key: "approved",          label: "Approved" },
  { key: "rejected",          label: "Rejected" },
  { key: "suspended",         label: "Suspended" },
  { key: "changes_requested", label: "Changes Requested" },
];

const QUAL_OPTIONS = [
  { value: "", label: "All qualifications" },
  { value: "LACTATION_CONSULTANT", label: "Lactation Consultant (IBCLC)" },
  { value: "BREASTFEEDING_COUNSELLOR", label: "Breastfeeding Counsellor" },
  { value: "INFANT_SLEEP_CONSULTANT", label: "Infant Sleep Consultant" },
  { value: "DOULA", label: "Doula" },
  { value: "MIDWIFE", label: "Midwife" },
  { value: "BABY_OSTEOPATH", label: "Baby Osteopath" },
  { value: "PAEDIATRIC_NUTRITIONIST", label: "Paediatric Nutritionist" },
  { value: "EARLY_YEARS_SPECIALIST", label: "Early Years Specialist" },
  { value: "POSTNATAL_PHYSIOTHERAPIST", label: "Postnatal Physiotherapist" },
  { value: "PARENTING_COACH", label: "Parenting Coach" },
  { value: "OTHER", label: "Other" },
];

const CLUSTER_OPTIONS = [
  { value: "",            label: "All categories" },
  { value: "FOR_PARENTS", label: "For Parents" },
  { value: "FOR_BABY",    label: "For Baby" },
  { value: "PACKAGE",     label: "Package" },
  { value: "GIFT",        label: "Gift" },
  { value: "EVENT",       label: "Event" },
];

const QUAL_LABEL = Object.fromEntries(
  QUAL_OPTIONS.filter((q) => q.value).map((q) => [q.value, q.label])
);

const FORMAT_BADGE = {
  ONLINE:    { label: "Online",     cls: "bg-blue-100 text-blue-700" },
  IN_PERSON: { label: "In-Person",  cls: "bg-purple-100 text-purple-700" },
};
const CLUSTER_BADGE = {
  FOR_PARENTS: { label: "For Parents", cls: "bg-pink-100 text-pink-700" },
  FOR_BABY:    { label: "For Baby",    cls: "bg-cyan-100 text-cyan-700" },
  PACKAGE:     { label: "Package",     cls: "bg-amber-100 text-amber-700" },
  GIFT:        { label: "Gift",        cls: "bg-green-100 text-green-700" },
  EVENT:       { label: "Event",       cls: "bg-violet-100 text-violet-700" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const getInitials = (name) =>
  name
    ? name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

const isInsuranceExpired = (iso) => iso && new Date(iso) <= new Date();

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  if (status === "APPROVED")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
            clipRule="evenodd"
          />
        </svg>
        Approved
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
            clipRule="evenodd"
          />
        </svg>
        Rejected
      </span>
    );
  if (status === "SUSPENDED")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm5-2.25A.75.75 0 0 1 7.75 7h.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-.5a.75.75 0 0 1-.75-.75v-4.5Zm4 0a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-.5a.75.75 0 0 1-.75-.75v-4.5Z"
            clipRule="evenodd"
          />
        </svg>
        Suspended
      </span>
    );
  if (status === "CHANGES_REQUESTED")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2.695 14.763l-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
        </svg>
        Changes Requested
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
      Pending
    </span>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────
const PaginationBar = ({ page, totalPages, total, limit, onPageChange }) => {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const buildPages = () => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (page > 3) pages.push("…");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    )
      pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  };
  const btnBase =
    "inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all duration-150 select-none";
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-sm text-gray-500">
        Showing{" "}
        <span className="font-medium text-[#1F2933]">
          {from}–{to}
        </span>{" "}
        of <span className="font-medium text-[#1F2933]">{total}</span> expert
        {total !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={`${btnBase} gap-1 px-2.5 w-auto ${
            page === 1
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-500 hover:text-[#1F2933] hover:bg-gray-100"
          }`}
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
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Prev
        </button>
        {buildPages().map((p, i) =>
          p === "…" ? (
            <span
              key={`e-${i}`}
              className="w-8 h-8 inline-flex items-center justify-center text-sm text-gray-400"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`${btnBase} ${
                p === page
                  ? "bg-[#445446] text-white shadow-sm"
                  : "text-gray-500 hover:text-[#1F2933] hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className={`${btnBase} gap-1 px-2.5 w-auto ${
            page === totalPages
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-500 hover:text-[#1F2933] hover:bg-gray-100"
          }`}
        >
          Next
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
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ─── Modal helpers ────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
    {children}
  </p>
);

const DocLink = ({ url, label = "View document" }) => {
  if (!url)
    return <span className="text-xs text-gray-400 italic">No document</span>;
  return (
    <a
      href={getDocumentUrl(url)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-[#445446] hover:underline flex-shrink-0"
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
        />
      </svg>
      {label}
    </a>
  );
};

// ─── Expert Detail Modal ──────────────────────────────────────────────────────
const ACTION_LABELS = {
  APPROVE:              "Approved",
  REJECT:               "Rejected",
  SUSPEND:              "Suspended",
  REACTIVATE:           "Reactivated",
  REQUEST_CHANGES:      "Changes requested",
  UNPUBLISH:            "Unpublished",
  REPUBLISH:            "Republished",
  MANUAL_VERIFY:        "Manually verified",
  MANUAL_REFUND:        "Manual refund issued",
  SEND_PASSWORD_RESET:  "Password reset sent",
  RESEND_VERIFICATION:  "Verification email resent",
  GDPR_DELETE:          "Account deleted (GDPR)",
};

const ExpertModal = ({ expert, onClose, onActionRequest }) => {
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // Bookings tab
  const [activeTab, setActiveTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [refundingId, setRefundingId] = useState(null);
  const [refundError, setRefundError] = useState("");
  const [refundPending, setRefundPending] = useState(null);

  // Activity tab
  const [auditLog, setAuditLog] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditLoaded, setAuditLoaded] = useState(false);

  // Request changes modal
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [changesNote, setChangesNote] = useState("");
  const [changesLoading, setChangesLoading] = useState(false);
  const [changesError, setChangesError] = useState("");

  // Unpublish / republish confirm
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState("");

  // GDPR delete modal
  const [showGdprDelete, setShowGdprDelete] = useState(false);
  const [gdprEmail, setGdprEmail] = useState("");
  const [gdprLoading, setGdprLoading] = useState(false);
  const [gdprError, setGdprError] = useState("");

  // Local expert state so modal reflects actions taken without a full refetch
  const [localExpert, setLocalExpert] = useState(expert);
  useEffect(() => { setLocalExpert(expert); }, [expert]);

  useEffect(() => {
    if (!expert?.id) return;
    setBookingsLoading(true);
    listExpertBookings(expert.id)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setBookingsLoading(false));
  }, [expert?.id]);

  const loadAuditLog = () => {
    if (auditLoaded) return;
    setAuditLoading(true);
    getAuditLog(localExpert.id, "EXPERT")
      .then((res) => { setAuditLog(res.data); setAuditLoaded(true); })
      .catch(() => setAuditLog([]))
      .finally(() => setAuditLoading(false));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "activity") loadAuditLog();
  };

  const handleRequestChanges = async () => {
    if (!changesNote.trim()) {
      setChangesError("Please enter a note explaining what needs to be corrected.");
      return;
    }
    setChangesLoading(true);
    setChangesError("");
    try {
      await requestChanges(localExpert.id, changesNote.trim());
      setLocalExpert((prev) => ({
        ...prev,
        status: "CHANGES_REQUESTED",
        change_request_note: changesNote.trim(),
        change_requested_at: new Date().toISOString(),
      }));
      setShowRequestChanges(false);
      setChangesNote("");
      setAuditLoaded(false); // invalidate so next open refreshes
      onActionRequest("_refresh", localExpert); // signal parent to refetch list
    } catch (err) {
      setChangesError(err?.response?.data?.error || "Failed to send request. Please try again.");
    } finally {
      setChangesLoading(false);
    }
  };

  const handlePublishToggle = async () => {
    setPublishLoading(true);
    setPublishError("");
    try {
      if (localExpert.is_published) {
        await unpublishExpert(localExpert.id);
        setLocalExpert((prev) => ({ ...prev, is_published: false }));
      } else {
        await republishExpert(localExpert.id);
        setLocalExpert((prev) => ({ ...prev, is_published: true }));
      }
      setShowUnpublishConfirm(false);
      setAuditLoaded(false);
      onActionRequest("_refresh", localExpert);
    } catch (err) {
      setPublishError(err?.response?.data?.error || "Action failed. Please try again.");
    } finally {
      setPublishLoading(false);
    }
  };

  const handleGdprDelete = async () => {
    setGdprLoading(true);
    setGdprError("");
    try {
      await gdprDeleteExpert(localExpert.id, gdprEmail.trim());
      setShowGdprDelete(false);
      onClose();
      onActionRequest("_refresh", localExpert);
    } catch (err) {
      setGdprError(err?.response?.data?.error || "Deletion failed. Please try again.");
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
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id ? { ...b, status: "REFUNDED" } : b
        )
      );
    } catch (err) {
      setRefundError(
        err?.response?.data?.error || "Refund failed. Please try again."
      );
    } finally {
      setRefundingId(null);
    }
  };

  if (!localExpert) return null;

  const handleExportCsv = async () => {
    setExporting(true);
    setExportError("");
    try {
      const blob = await exportTaxDataCsv(localExpert.id, exportYear);
      const safeName = (localExpert.user?.name || `expert-${localExpert.id}`)
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
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

  // Use localExpert so status / is_published updates reflect immediately in the modal
  const name = localExpert.user?.name || "—";
  const email = localExpert.user?.email || "—";
  const photoUrl = getProfileImageUrl(localExpert.profile_image);
  const hasAddress =
    localExpert.address_street || localExpert.address_city || localExpert.address_postcode;
  const insurance = localExpert.insurance;
  const expired = insurance
    ? isInsuranceExpired(insurance.policy_expires_at)
    : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E7E4] flex-shrink-0">
          <h2 className="text-base font-semibold text-[#1F2933]">
            Expert Profile
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-[#1F2933] hover:bg-gray-100 rounded-lg transition-colors"
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
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* Identity */}
          <div className="px-6 py-5 flex items-start gap-4 border-b border-[#E4E7E4]">
            <div className="flex-shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#E4E7E4]"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className="w-16 h-16 rounded-full bg-[#445446] text-white flex items-center justify-center text-xl font-bold select-none"
                style={{ display: photoUrl ? "none" : "flex" }}
              >
                {getInitials(name)}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-[#1F2933]">{name}</p>
              {expert.position && (
                <p className="text-sm font-medium text-[#445446] mt-0.5">
                  {expert.position}
                </p>
              )}
              <a
                href={`mailto:${email}`}
                className="text-sm text-gray-400 hover:text-[#445446] hover:underline block mt-0.5"
              >
                {email}
              </a>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StatusBadge status={localExpert.status} />
                {localExpert.status === "APPROVED" && !localExpert.is_published && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                    Unlisted
                  </span>
                )}
                {localExpert.user?.is_verified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M2.166 4.999A11.954 11.954 0 0 0 10 1.944 11.954 11.954 0 0 1 17.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001Zm11.541 3.708a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Email Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Unverified
                  </span>
                )}
                {expert.user?.created_at && (
                  <span className="text-xs text-gray-400">
                    Joined {formatDate(expert.user.created_at)}
                  </span>
                )}
                {localExpert.session_format && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#445446]/10 text-[#445446] font-medium">
                    {localExpert.session_format === "ONLINE"
                      ? "Online"
                      : localExpert.session_format === "IN_PERSON"
                      ? "In-Person"
                      : "Online & In-Person"}
                  </span>
                )}
                {/* Security — failed login attempts */}
                {expert.user?.login_attempts > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {expert.user.login_attempts} failed login
                    {expert.user.login_attempts !== 1 ? "s" : ""}
                  </span>
                )}
                {/* Security — account locked */}
                {expert.user?.locked_until &&
                  new Date(expert.user.locked_until) > new Date() && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Locked until{" "}
                      {new Date(expert.user.locked_until).toLocaleTimeString(
                        "en-GB",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  )}
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Summary + Bio */}
            {(expert.summary || expert.bio) && (
              <div className="space-y-4">
                {expert.summary && (
                  <div>
                    <SectionLabel>Summary</SectionLabel>
                    <p className="text-sm text-[#1F2933] leading-relaxed">
                      {expert.summary}
                    </p>
                  </div>
                )}
                {expert.bio && (
                  <div>
                    <SectionLabel>Full Bio</SectionLabel>
                    <p className="text-sm text-[#1F2933] leading-relaxed">
                      {expert.bio}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Languages */}
            {expert.languages?.length > 0 && (
              <div>
                <SectionLabel>Languages Spoken</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {expert.languages.map((lang) => (
                    <span
                      key={lang}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#445446]/10 text-[#445446]"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            {hasAddress && (
              <div>
                <SectionLabel>Location</SectionLabel>
                <p className="text-sm text-[#1F2933]">
                  {[
                    expert.address_street,
                    expert.address_city,
                    expert.address_postcode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            )}

            {/* Qualifications */}
            <div>
              <SectionLabel>Qualifications</SectionLabel>
              {expert.qualifications?.length > 0 ? (
                <ul className="space-y-2">
                  {expert.qualifications.map((q) => (
                    <li
                      key={q.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]"
                    >
                      <p className="text-sm font-medium text-[#1F2933]">
                        {q.type === "OTHER"
                          ? q.custom_name
                          : QUAL_LABEL[q.type] || q.type}
                      </p>
                      <DocLink url={q.document_url} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No qualifications added.
                </p>
              )}
            </div>

            {/* Certifications */}
            <div>
              <SectionLabel>Certifications</SectionLabel>
              {expert.certifications?.length > 0 ? (
                <ul className="space-y-2">
                  {expert.certifications.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]"
                    >
                      <p className="text-sm font-medium text-[#1F2933]">
                        {c.name}
                      </p>
                      <DocLink url={c.document_url} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No certifications added.
                </p>
              )}
            </div>

            {/* Business Information — compliance section, admin-only */}
            <div>
              {/* Header row: label + CSV export controls */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <SectionLabel>Business Information</SectionLabel>
                  <p className="text-xs text-gray-400 italic -mt-1">
                    Information collected for compliance purposes
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <select
                    value={exportYear}
                    onChange={(e) => setExportYear(Number(e.target.value))}
                    disabled={!localExpert.business_info}
                    className="text-xs border border-[#E4E7E4] rounded-lg px-2 py-1.5 bg-white text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-50"
                  >
                    {Array.from(
                      { length: 5 },
                      (_, i) => new Date().getFullYear() - i
                    ).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={exporting || !localExpert.business_info}
                    title={
                      !localExpert.business_info
                        ? "No business information on file"
                        : undefined
                    }
                    className="flex items-center gap-1.5 text-xs font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {exporting ? (
                      <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : (
                      <svg
                        className="w-3.5 h-3.5"
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
                    )}
                    {exporting ? "Exporting…" : "Export CSV"}
                  </button>
                </div>
              </div>
              {exportError && (
                <p className="text-xs text-red-500 mb-2">{exportError}</p>
              )}
              {localExpert.business_info ? (
                (() => {
                  const bi = localExpert.business_info;
                  const rows = [
                    [
                      "Entity type",
                      bi.entity_type === "INDIVIDUAL"
                        ? "Individual"
                        : "Company / Legal Entity",
                    ],
                    ["Full legal name", bi.legal_name],
                    ...(bi.entity_type === "INDIVIDUAL" && bi.date_of_birth
                      ? [
                          [
                            "Date of birth",
                            new Date(bi.date_of_birth).toLocaleDateString(
                              "en-GB",
                              { day: "numeric", month: "long", year: "numeric" }
                            ),
                          ],
                        ]
                      : []),
                    ["Primary address", bi.primary_address],
                    ["TIN", bi.tin],
                    ...(bi.vat_number ? [["VAT number", bi.vat_number]] : []),
                    ...(bi.entity_type === "COMPANY" && bi.company_reg_number
                      ? [["Company reg. number", bi.company_reg_number]]
                      : []),
                    ["IBAN / Bank account", bi.iban],
                    ["Email address", bi.business_email],
                    ["Website", bi.website],
                    ...(bi.municipality
                      ? [["Municipality", bi.municipality]]
                      : []),
                    ...(bi.business_address
                      ? [["Business address", bi.business_address]]
                      : []),
                  ];
                  return (
                    <div className="rounded-xl border border-[#E4E7E4] divide-y divide-[#F0F2F0] overflow-hidden">
                      {rows.map(([label, value]) => (
                        <div key={label} className="flex gap-3 px-4 py-2.5">
                          <span className="text-xs font-medium text-gray-400 w-40 flex-shrink-0">
                            {label}
                          </span>
                          <span className="text-xs text-[#1F2933] break-words min-w-0">
                            {value || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <div className="px-4 py-3.5 rounded-xl border border-amber-200 bg-amber-50">
                  <p className="text-xs font-semibold text-amber-700">
                    ⚠️ No business information submitted — expert has not
                    completed this compliance section.
                  </p>
                </div>
              )}
            </div>

            {/* Insurance */}
            <div>
              <SectionLabel>Professional Insurance</SectionLabel>
              {insurance ? (
                <div
                  className={`px-4 py-3.5 rounded-xl border ${
                    expired
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-sm font-semibold mb-0.5 ${
                          expired ? "text-red-700" : "text-green-800"
                        }`}
                      >
                        {expired ? "Insurance Expired" : "Insurance Active"}
                      </p>
                      <p
                        className={`text-xs ${
                          expired ? "text-red-600" : "text-green-700"
                        }`}
                      >
                        Expires:{" "}
                        <span className="font-medium">
                          {formatDate(insurance.policy_expires_at)}
                        </span>
                      </p>
                    </div>
                    <DocLink url={insurance.document_url} label="View policy" />
                  </div>
                  {expired && (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      ⚠️ Insurance has expired — do not approve until a valid
                      policy is uploaded.
                    </p>
                  )}
                </div>
              ) : (
                <div className="px-4 py-3.5 rounded-xl border border-amber-200 bg-amber-50">
                  <p className="text-xs font-semibold text-amber-700">
                    ⚠️ No insurance uploaded — profile must not be approved
                    until insurance is provided.
                  </p>
                </div>
              )}
            </div>

            {/* Services */}
            <div>
              <SectionLabel>
                Services ({expert.services?.length ?? 0})
              </SectionLabel>
              {expert.services?.length > 0 ? (
                <div className="space-y-2">
                  {expert.services.map((svc) => (
                    <div
                      key={svc.id}
                      className="px-4 py-3 bg-[#F5F7F5] rounded-xl border border-[#E4E7E4]"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-[#1F2933]">
                          {svc.title}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {svc.format && FORMAT_BADGE[svc.format] && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                FORMAT_BADGE[svc.format].cls
                              }`}
                            >
                              {FORMAT_BADGE[svc.format].label}
                            </span>
                          )}
                          {svc.cluster && CLUSTER_BADGE[svc.cluster] && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                CLUSTER_BADGE[svc.cluster].cls
                              }`}
                            >
                              {CLUSTER_BADGE[svc.cluster].label}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              svc.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            {svc.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      {svc.description && (
                        <p className="text-xs text-gray-500 mb-1">
                          {svc.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {svc.duration_minutes} min · €
                        {parseFloat(svc.price).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No services added yet.
                </p>
              )}
            </div>

            {/* Stripe */}
            <div>
              <SectionLabel>Stripe Account</SectionLabel>
              {expert.stripe_account_id ? (
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                  {expert.stripe_account_id}
                </span>
              ) : (
                <p className="text-sm text-gray-400 italic">Not connected</p>
              )}
            </div>

            {/* Bookings / Activity tabs */}
            <div className="border-t border-[#E4E7E4] pt-5">
              <div className="flex items-center gap-1 mb-4 border-b border-[#E4E7E4]">
                {[
                  { key: "bookings",  label: "Recent Bookings" },
                  { key: "activity",  label: "Activity History" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleTabChange(key)}
                    className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                      activeTab === key
                        ? "border-[#445446] text-[#445446]"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Activity History tab */}
              {activeTab === "activity" && (
                auditLoading ? (
                  <div className="flex items-center gap-2 py-3">
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
                        <p className="text-xs font-semibold text-[#1F2933]">
                          {ACTION_LABELS[entry.action] || entry.action}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {entry.admin_name} · {new Date(entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {entry.note && (
                          <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-3 py-2 border border-[#E4E7E4] whitespace-pre-wrap">
                            {entry.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )
              )}

              {/* Recent Bookings tab */}
              {activeTab === "bookings" && (bookingsLoading ? (
                <div className="flex items-center gap-2 py-3">
                  <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                  <span className="text-xs text-gray-400">
                    Loading bookings…
                  </span>
                </div>
              ) : bookings.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  No bookings on record.
                </p>
              ) : (
                <div className="space-y-2">
                  {refundError && (
                    <p className="text-xs text-red-600 mb-1">{refundError}</p>
                  )}
                  {bookings.map((b) => {
                    const isConfirmed = b.status === "CONFIRMED";
                    const statusColors = {
                      CONFIRMED: "bg-green-50 text-green-700 border-green-200",
                      CANCELLED: "bg-red-50 text-red-600 border-red-200",
                      REFUNDED: "bg-gray-100 text-gray-500 border-gray-200",
                    };
                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-[#E4E7E4] bg-[#FAFAFA]"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#1F2933] truncate">
                            #{b.id} · {b.service?.title || "Session"}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(b.scheduled_at).toLocaleDateString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                            {b.parent?.name ? ` · ${b.parent.name}` : ""}
                            {b.amount
                              ? ` · £${Number(b.amount).toFixed(2)}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                              statusColors[b.status] ||
                              "bg-gray-100 text-gray-500 border-gray-200"
                            }`}
                          >
                            {b.status.charAt(0) +
                              b.status.slice(1).toLowerCase()}
                          </span>
                          {isConfirmed && (
                            <button
                              onClick={() => setRefundPending(b)}
                              disabled={refundingId === b.id}
                              className="text-xs font-medium px-2.5 py-1 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {refundingId === b.id ? "Refunding…" : "Refund"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Admin Support Tools */}
            <div className="border-t border-[#E4E7E4] pt-5">
              <SectionLabel>Admin Support Tools</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {/* Password reset */}
                <button
                  onClick={() => onActionRequest("password-reset", localExpert)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#E4E7E4] text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                    />
                  </svg>
                  Send Password Reset
                </button>

                {/* Resend verification — only if not yet verified */}
                {!localExpert.user?.is_verified && (
                  <button
                    onClick={() =>
                      onActionRequest("resend-verification", localExpert)
                    }
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#E4E7E4] text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                      />
                    </svg>
                    Resend Verification Email
                  </button>
                )}

                {/* Manual verify — only if not yet verified */}
                {!localExpert.user?.is_verified && (
                  <button
                    onClick={() => onActionRequest("manual-verify", localExpert)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
                      />
                    </svg>
                    Mark as Verified
                  </button>
                )}

                {/* Request changes — PENDING, APPROVED, or CHANGES_REQUESTED */}
                {["PENDING", "APPROVED", "CHANGES_REQUESTED"].includes(localExpert.status) && (
                  <button
                    onClick={() => { setChangesNote(localExpert.change_request_note || ""); setShowRequestChanges(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                    </svg>
                    Request Changes
                  </button>
                )}

                {/* Unpublish / Republish — APPROVED experts only */}
                {localExpert.status === "APPROVED" && (
                  localExpert.is_published ? (
                    <button
                      onClick={() => setShowUnpublishConfirm(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                      Force Unpublish
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowUnpublishConfirm(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                      Republish
                    </button>
                  )
                )}

                {/* Suspend — only if currently APPROVED */}
                {localExpert.status === "APPROVED" && (
                  <button
                    onClick={() => onActionRequest("suspend", localExpert)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Suspend Expert
                  </button>
                )}

                {/* Reactivate — only if currently SUSPENDED */}
                {localExpert.status === "SUSPENDED" && (
                  <button
                    onClick={() => onActionRequest("reactivate", localExpert)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Reactivate Expert
                  </button>
                )}
              </div>
            </div>

            {/* GDPR Deletion — separated visually, destructive zone */}
            <div className="border-t-2 border-dashed border-red-100 pt-5 mt-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Danger Zone</p>
              <p className="text-xs text-gray-400 mb-3">
                Permanently erase all personal data for this account. This action cannot be undone.
              </p>
              <button
                onClick={() => { setGdprEmail(""); setShowGdprDelete(true); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                Delete Account (GDPR Erasure)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Refund confirmation modal ── */}
      {refundPending && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setRefundPending(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">Issue Refund?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Issue a full refund for booking{' '}
              <span className="font-medium text-[#1F2933]">
                #{refundPending.id} · {refundPending.service?.title || 'Session'}
              </span>
              ? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRefundPending(null)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRefund(refundPending)}
                className="flex-1 py-2.5 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                Yes, refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Request Changes modal ── */}
      {showRequestChanges && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !changesLoading) setShowRequestChanges(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-violet-50 mx-auto mb-4">
              <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">Request Profile Changes</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              Describe what needs to be corrected. The specialist will receive this note by email and their profile will be set to <span className="font-medium text-violet-600">Changes Requested</span>.
            </p>
            <div className="relative mb-1">
              <textarea
                value={changesNote}
                onChange={(e) => {
                  if (e.target.value.length <= 2000) setChangesNote(e.target.value);
                }}
                placeholder="e.g. Please upload a clearer copy of your insurance certificate. The current upload is too blurry to read."
                rows={5}
                className="w-full px-3 py-2.5 text-sm border border-[#E4E7E4] rounded-lg text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none transition"
              />
            </div>
            <p className="text-xs text-gray-400 text-right mb-3">{changesNote.length}/2000</p>
            {changesError && (
              <p className="text-xs text-red-600 mb-3 px-1">{changesError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRequestChanges(false); setChangesNote(""); setChangesError(""); }}
                disabled={changesLoading}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestChanges}
                disabled={changesLoading || !changesNote.trim()}
                className="flex-1 py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changesLoading ? "Sending…" : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unpublish / Republish confirmation modal ── */}
      {showUnpublishConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !publishLoading) setShowUnpublishConfirm(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${localExpert.is_published ? "bg-orange-50" : "bg-green-50"}`}>
              {localExpert.is_published ? (
                <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </div>
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">
              {localExpert.is_published ? "Hide from Search?" : "Restore to Search?"}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {localExpert.is_published
                ? "This specialist will no longer appear in parent search results. Their account remains active and approved — you can restore them at any time."
                : "This specialist will reappear in parent search results immediately."}
            </p>
            {publishError && (
              <p className="text-xs text-red-600 mb-3 text-center">{publishError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUnpublishConfirm(false); setPublishError(""); }}
                disabled={publishLoading}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishToggle}
                disabled={publishLoading}
                className={`flex-1 py-2.5 px-4 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 ${localExpert.is_published ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"}`}
              >
                {publishLoading
                  ? "Saving…"
                  : localExpert.is_published ? "Yes, Hide" : "Yes, Restore"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GDPR Delete modal ── */}
      {showGdprDelete && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !gdprLoading) setShowGdprDelete(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-red-700 text-center mb-4">Permanent Account Erasure</h3>
            {localExpert.pending_payout_count > 0 ? (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-xs text-red-800 space-y-1">
                  <p className="font-semibold">This account cannot be deleted until all pending payouts have cleared.</p>
                  <p className="text-red-700 mt-1">
                    {localExpert.pending_payout_count} payout{localExpert.pending_payout_count !== 1 ? "s are" : " is"} still pending. Payouts typically clear within 24 hours of a completed session. Return here once all payouts have settled.
                  </p>
                </div>
                <button
                  onClick={() => { setShowGdprDelete(false); setGdprEmail(""); setGdprError(""); }}
                  className="w-full py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-2 text-xs text-red-700 space-y-1">
                  <p className="font-semibold">This action is irreversible. The following will be deleted:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-red-600">
                    <li>Profile, bio, photo, login credentials, and uploaded documents</li>
                    <li>All future bookings cancelled and Stripe refunds issued</li>
                    <li>All active sessions invalidated immediately</li>
                    <li>Specialist name shown as "Deleted specialist" in parent booking history</li>
                  </ul>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">Retained for a minimum of 5 years under DAC7 (EU Directive 2021/514):</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    <li>Full legal name and tax identification number (TIN)</li>
                    <li>Bank account / IBAN</li>
                    <li>All earnings and booking records tied to financial transactions</li>
                  </ul>
                  <p className="mt-1 text-amber-600">This data must remain identifiable for tax reporting and cannot be anonymised.</p>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Type the specialist{"'"}s email address to confirm:{" "}
                  <span className="font-medium text-[#1F2933]">{localExpert.user?.email}</span>
                </p>
                <input
                  type="email"
                  value={gdprEmail}
                  onChange={(e) => setGdprEmail(e.target.value)}
                  placeholder={localExpert.user?.email || "specialist@email.com"}
                  className="w-full px-3 py-2.5 text-sm border border-[#E4E7E4] rounded-lg text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition mb-3"
                />
                {gdprError && (
                  <p className="text-xs text-red-600 mb-3 px-1">{gdprError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowGdprDelete(false); setGdprEmail(""); setGdprError(""); }}
                    disabled={gdprLoading}
                    className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGdprDelete}
                    disabled={gdprLoading || gdprEmail.trim().toLowerCase() !== localExpert.user?.email?.toLowerCase()}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {gdprLoading ? "Erasing…" : "Erase Account"}
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

// ─── Main component ───────────────────────────────────────────────────────────
const ExpertManagementSection = () => {
  const navigate = useNavigate();
  const [experts, setExperts] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [counts, setCounts] = useState({
    all: 0,
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    SUSPENDED: 0,
    CHANGES_REQUESTED: 0,
  });
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  // Search + additional filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [qualFilter, setQualFilter] = useState("");
  const [clusterFilter, setClusterFilter] = useState("");
  const debounceRef = useRef(null);

  const handleSearchChange = (val) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  };

  const hasActiveFilters = search || cityFilter || qualFilter || clusterFilter;

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setCityFilter("");
    setQualFilter("");
    setClusterFilter("");
    setPage(1);
  };

  const fetchExperts = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const params = { page, limit: PAGE_LIMIT };
      if (activeFilter !== "all") params.status = activeFilter.toUpperCase();
      if (search) params.search = search;
      if (cityFilter) params.city = cityFilter;
      if (qualFilter) params.qualification = qualFilter;
      if (clusterFilter) params.cluster = clusterFilter;

      const result = await listExperts(params);
      setExperts(result.data);
      setPagination(result.pagination);
      setCounts(result.counts);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load experts.");
    } finally {
      setFetching(false);
      setInitialLoading(false);
    }
  }, [page, activeFilter, search, cityFilter, qualFilter, clusterFilter]);

  useEffect(() => {
    fetchExperts();
  }, [fetchExperts]);

  const handleFilterChange = (key) => {
    if (key === activeFilter) return;
    setPage(1);
    setActiveFilter(key);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Close modal first so the confirm dialog stacks cleanly above nothing
  const requestAction = (type, expert) => {
    if (type === "_refresh") {
      fetchExperts();
      return;
    }
    setSelectedExpert(null);
    setConfirmAction({ type, expert });
  };

  // Success messages for non-status-changing actions
  const SUCCESS_MSG = {
    "password-reset": "Password reset email sent successfully.",
    "resend-verification": "Verification email resent successfully.",
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    const { type, expert } = confirmAction;
    setConfirmAction(null);
    setActionLoading(expert.id);
    setActionError("");
    setActionSuccess("");
    try {
      if (type === "approve") await approveExpert(expert.id);
      else if (type === "reject") await rejectExpert(expert.id);
      else if (type === "suspend") await suspendExpert(expert.id);
      else if (type === "reactivate") await reactivateExpert(expert.id);
      else if (type === "manual-verify") await manuallyVerify(expert.id);
      else if (type === "password-reset") await sendPasswordReset(expert.id);
      else if (type === "resend-verification")
        await resendVerification(expert.id);

      // Email-only actions: show success banner, no refetch needed
      if (SUCCESS_MSG[type]) {
        setActionSuccess(SUCCESS_MSG[type]);
      } else {
        await fetchExperts();
      }
    } catch (err) {
      setActionError(
        err?.response?.data?.error ||
          `Failed to ${type.replace(/-/g, " ")} expert.`
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  const tabCount = (key) =>
    key === "all" ? counts.all : counts[key.toUpperCase()] ?? 0;
  const filterInputCls =
    "px-3 py-2 text-sm border border-[#E4E7E4] rounded-lg bg-white text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition";

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#1F2933]">
          Expert Management
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Review and manage expert accounts on the platform.
        </p>
      </div>

      {/* Errors / success */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
      {actionError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
              clipRule="evenodd"
            />
          </svg>
          {actionSuccess}
          <button
            onClick={() => setActionSuccess("")}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <svg
              className="w-3.5 h-3.5"
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
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative">
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
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search experts by name…"
          className="w-full pl-10 pr-10 py-2.5 text-sm border border-[#E4E7E4] rounded-xl bg-white text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition"
        />
        {searchInput && (
          <button
            onClick={() => handleSearchChange("")}
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

      {/* Status tabs + filter controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex items-center bg-white border border-[#E4E7E4] rounded-xl p-1 gap-0.5">
          {STATUS_FILTERS.map(({ key, label }) => {
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[#445446] text-white shadow-sm"
                    : "text-gray-500 hover:text-[#1F2933] hover:bg-gray-50"
                }`}
              >
                {label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tabCount(key)}
                </span>
              </button>
            );
          })}
        </div>

        {/* City */}
        <input
          type="text"
          value={cityFilter}
          placeholder="Filter by city…"
          onChange={(e) => {
            setCityFilter(e.target.value);
            setPage(1);
          }}
          className={`${filterInputCls} w-36`}
        />

        {/* Qualification */}
        <select
          value={qualFilter}
          onChange={(e) => {
            setQualFilter(e.target.value);
            setPage(1);
          }}
          className={`${filterInputCls} max-w-[200px]`}
        >
          {QUAL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Cluster */}
        <select
          value={clusterFilter}
          onChange={(e) => {
            setClusterFilter(e.target.value);
            setPage(1);
          }}
          className={filterInputCls}
        >
          {CLUSTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
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
            Clear
          </button>
        )}

        {fetching && (
          <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin ml-auto" />
        )}
      </div>

      {/* Table */}
      {experts.length === 0 && !fetching ? (
        <div className="bg-white rounded-2xl border border-[#E4E7E4] p-14 text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-200 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            />
          </svg>
          <p className="text-sm font-medium text-gray-500">No experts found</p>
          <p className="text-xs text-gray-400 mt-1">
            {hasActiveFilters || activeFilter !== "all"
              ? "Try adjusting your search or filters."
              : "No expert accounts registered yet."}
          </p>
        </div>
      ) : (
        <div
          className={`bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden transition-opacity duration-150 ${
            fetching ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          {/* Header row */}
          <div className="grid grid-cols-[1.1fr_1.2fr_1fr_110px_105px_80px_60px_200px] gap-3 px-5 py-3 bg-[#F5F7F5] border-b border-[#E4E7E4]">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Name
            </p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Email
            </p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Position
            </p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Status
            </p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Joined
            </p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Bookings
            </p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider" title="EU Directive 2021/514 — DAC7 reporting threshold">
              DAC7
            </p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">
              Actions
            </p>
          </div>

          {experts.map((expert, idx) => {
            const name = expert.user?.name || "—";
            const email = expert.user?.email || "—";
            const isActioning = actionLoading === expert.id;

            return (
              <div
                key={expert.id}
                className={`grid grid-cols-[1.1fr_1.2fr_1fr_110px_105px_80px_60px_200px] gap-3 px-5 py-4 items-center hover:bg-gray-50 transition-colors ${
                  idx > 0 ? "border-t border-[#E4E7E4]" : ""
                }`}
              >
                {/* Name — opens detail page */}
                <button
                  onClick={() => navigate(`/dashboard/admin/experts/${expert.id}`)}
                  className="flex items-center gap-2.5 text-left group"
                  title="View full profile"
                >
                  {getProfileImageUrl(expert.profile_image) ? (
                    <img
                      src={getProfileImageUrl(expert.profile_image)}
                      alt={name}
                      className="w-8 h-8 rounded-full object-cover border border-[#E4E7E4] flex-shrink-0"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="w-8 h-8 rounded-full bg-[#445446]/10 text-[#445446] flex items-center justify-center text-xs font-bold flex-shrink-0 select-none group-hover:bg-[#445446] group-hover:text-white transition-colors"
                    style={{
                      display: getProfileImageUrl(expert.profile_image)
                        ? "none"
                        : "flex",
                    }}
                  >
                    {getInitials(name)}
                  </div>
                  <span className="text-sm font-medium text-[#1F2933] group-hover:text-[#445446] group-hover:underline underline-offset-2 truncate transition-colors">
                    {name}
                  </span>
                </button>

                {/* Email */}
                <a
                  href={`mailto:${email}`}
                  className="text-sm text-gray-500 truncate hover:text-[#445446] hover:underline"
                >
                  {email}
                </a>

                {/* Position */}
                <p className="text-sm text-gray-500 truncate">
                  {expert.position || (
                    <span className="italic text-gray-300">—</span>
                  )}
                </p>

                {/* Status */}
                <div>
                  <StatusBadge status={expert.status} />
                </div>

                {/* Joined */}
                <p className="text-xs text-gray-500">
                  {formatDate(expert.user?.created_at)}
                </p>

                {/* Bookings count */}
                {(() => {
                  const count = expert._count?.bookings ?? 0;
                  return count > 0 ? (
                    <button
                      onClick={() => navigate(`/dashboard/admin/bookings?search=${encodeURIComponent(expert.user?.name || "")}`)}
                      className="text-sm font-medium text-[#445446] hover:underline text-left"
                      title="View bookings for this expert"
                    >
                      {count}
                    </button>
                  ) : (
                    <span className="text-sm text-gray-300">0</span>
                  );
                })()}

                {/* DAC7 flag */}
                <div>
                  {expert.dac7?.threshold_reached ? (
                    <span
                      title={`DAC7 threshold reached (${expert.dac7.year}): ${expert.dac7.transaction_count} transactions · £${expert.dac7.gross_earnings.toFixed(2)} gross`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 cursor-default"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                      </svg>
                      DAC7
                    </span>
                  ) : (
                    <span className="text-sm text-gray-300">—</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5">
                  {isActioning ? (
                    <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin mx-auto" />
                  ) : expert.status === "SUSPENDED" ? (
                    /* Suspended — only show Reactivate */
                    <button
                      onClick={() => requestAction("reactivate", expert)}
                      title="Reactivate this expert"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all duration-150"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                      Reactivate
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => requestAction("approve", expert)}
                        disabled={expert.status === "APPROVED"}
                        title={
                          expert.status === "APPROVED"
                            ? "Already approved"
                            : "Approve"
                        }
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                          expert.status === "APPROVED"
                            ? "border-green-200 text-green-400 bg-green-50 cursor-not-allowed"
                            : "border-green-300 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400"
                        }`}
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                        Approve
                      </button>
                      <button
                        onClick={() => requestAction("reject", expert)}
                        disabled={expert.status === "REJECTED"}
                        title={
                          expert.status === "REJECTED"
                            ? "Already rejected"
                            : "Reject"
                        }
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                          expert.status === "REJECTED"
                            ? "border-red-200 text-red-300 bg-red-50 cursor-not-allowed"
                            : "border-red-300 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-400"
                        }`}
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18 18 6M6 6l12 12"
                          />
                        </svg>
                        Reject
                      </button>
                      {/* Suspend icon button — only for APPROVED experts */}
                      {expert.status === "APPROVED" && (
                        <button
                          onClick={() => requestAction("suspend", expert)}
                          title="Suspend this expert"
                          className="p-1.5 rounded-lg text-orange-400 border border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-all duration-150"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                            />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PaginationBar
        page={page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={PAGE_LIMIT}
        onPageChange={handlePageChange}
      />


      {confirmAction &&
        (() => {
          const cfg =
            {
              approve: {
                title: "Approve Expert?",
                verb: "approve",
                iconBg: "bg-green-50",
                btnCls: "bg-green-600 hover:bg-green-700",
                icon: (
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                ),
              },
              reject: {
                title: "Reject Expert?",
                verb: "reject",
                iconBg: "bg-red-50",
                btnCls: "bg-red-500 hover:bg-red-600",
                icon: (
                  <svg
                    className="w-6 h-6 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                ),
              },
              suspend: {
                title: "Suspend Expert?",
                verb: "suspend",
                iconBg: "bg-orange-50",
                btnCls: "bg-orange-500 hover:bg-orange-600",
                icon: (
                  <svg
                    className="w-6 h-6 text-orange-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                ),
              },
              reactivate: {
                title: "Reactivate Expert?",
                verb: "reactivate",
                iconBg: "bg-green-50",
                btnCls: "bg-green-600 hover:bg-green-700",
                icon: (
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                ),
              },
              "password-reset": {
                title: "Send Password Reset?",
                verb: "send a reset email to",
                iconBg: "bg-gray-50",
                btnCls: "bg-[#445446] hover:bg-[#3F4E41]",
                icon: (
                  <svg
                    className="w-6 h-6 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                    />
                  </svg>
                ),
              },
              "resend-verification": {
                title: "Resend Verification Email?",
                verb: "resend verification to",
                iconBg: "bg-gray-50",
                btnCls: "bg-[#445446] hover:bg-[#3F4E41]",
                icon: (
                  <svg
                    className="w-6 h-6 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                    />
                  </svg>
                ),
              },
              "manual-verify": {
                title: "Mark Account as Verified?",
                verb: "manually verify",
                iconBg: "bg-blue-50",
                btnCls: "bg-blue-600 hover:bg-blue-700",
                icon: (
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
                    />
                  </svg>
                ),
              },
            }[confirmAction.type] || {};
          const expertName =
            confirmAction.expert.user?.name || confirmAction.expert.user?.email;
          return (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
              onClick={(e) => {
                if (e.target === e.currentTarget) setConfirmAction(null);
              }}
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${cfg.iconBg}`}
                >
                  {cfg.icon}
                </div>
                <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">
                  {cfg.title}
                </h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  Are you sure you want to {cfg.verb}{" "}
                  <span className="font-medium text-[#1F2933]">
                    {expertName}
                  </span>
                  ?
                </p>
                {confirmAction.type === "approve" && !confirmAction.expert.insurance && (
                  <div className="flex items-start gap-2 px-3 py-2.5 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-amber-800">This expert has no insurance uploaded. Please confirm that you wish to proceed.</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-white text-sm font-medium transition-colors ${cfg.btnCls}`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
};

export default ExpertManagementSection;
