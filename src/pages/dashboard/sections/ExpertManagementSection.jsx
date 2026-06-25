import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  useListExpertsQuery,
  useExportExpertsXlsxMutation,
  useApproveExpertMutation,
  useRejectExpertMutation,
  useSuspendExpertMutation,
  useReactivateExpertMutation,
  useSendPasswordResetMutation,
  useResendVerificationMutation,
  useManuallyVerifyMutation,
} from "../../../api/adminApi";
import { getProfileImageUrl } from "../../../utils/imageUrl";
import CenteredDateInput from "../../../components/CenteredDateInput";
import {
  TrashFilledIcon, CheckCircleFilledIcon, XCircleFilledIcon,
  PauseCircleFilledIcon, PencilFilledIcon, WarningTriangleFilledIcon,
  CheckIcon, XIcon, NoCircleIcon, BadgeCheckIcon,
  WarningTriangleIcon, SearchIcon, DownloadIcon,
  ChevronLeftIcon, ChevronRightIcon, EnvelopeIcon, UserIcon,
  LockStrokeIcon,
} from "../../../assets/icons";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 10;

const STATUS_FILTER_KEYS = ["all", "pending", "approved", "rejected", "suspended", "changes_requested", "deleted"];

const QUAL_OPTION_VALUES = [
  "",
  "LACTATION_CONSULTANT",
  "BREASTFEEDING_COUNSELLOR",
  "INFANT_SLEEP_CONSULTANT",
  "DOULA",
  "MIDWIFE",
  "BABY_OSTEOPATH",
  "PAEDIATRIC_NUTRITIONIST",
  "EARLY_YEARS_SPECIALIST",
  "POSTNATAL_PHYSIOTHERAPIST",
  "PARENTING_COACH",
  "OTHER",
];

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
    ? name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status, deleted }) => {
  const { t } = useTranslation("adminDashboard");
  if (deleted)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        <TrashFilledIcon />
        {t("expertMgmt.badge.deleted")}
      </span>
    );
  if (status === "APPROVED")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircleFilledIcon />
        {t("expertMgmt.badge.APPROVED")}
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
        <XCircleFilledIcon />
        {t("expertMgmt.badge.REJECTED")}
      </span>
    );
  if (status === "SUSPENDED")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        <PauseCircleFilledIcon />
        {t("expertMgmt.badge.SUSPENDED")}
      </span>
    );
  if (status === "CHANGES_REQUESTED")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
        <PencilFilledIcon />
        {t("expertMgmt.badge.CHANGES_REQUESTED")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <WarningTriangleFilledIcon />
      {t("expertMgmt.badge.PENDING")}
    </span>
  );
};

// ─── Action buttons (shared between table row and card) ───────────────────────
const ExpertActionButtons = ({ expert, isActioning, onAction, t, compact = false }) => {
  const isDeleted = !!expert.user?.account_deleted;

  if (isDeleted) return <span className="text-xs text-gray-300 italic">—</span>;
  if (isActioning) return (
    <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin mx-auto" />
  );

  const btnBase = compact
    ? "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
    : "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex-1 justify-center";

  if (expert.status === "SUSPENDED") return (
    <button
      onClick={() => onAction("reactivate", expert)}
      className={`${btnBase} border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400`}
    >
      <CheckIcon className="w-3.5 h-3.5 flex-shrink-0" />
      {t("expertMgmt.action.reactivate")}
    </button>
  );

  if (expert.status === "APPROVED") return (
    <>
      <button
        onClick={() => onAction("reject", expert)}
        className={`${btnBase} border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-400`}
      >
        <XIcon className="w-3.5 h-3.5 flex-shrink-0" />
        {t("expertMgmt.action.reject")}
      </button>
      <button
        onClick={() => onAction("suspend", expert)}
        className={`${btnBase} border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 hover:border-orange-300`}
      >
        <NoCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
        {t("expertMgmt.action.suspend")}
      </button>
    </>
  );

  if (expert.status === "REJECTED") return (
    <button
      onClick={() => onAction("approve", expert)}
      className={`${btnBase} border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400`}
    >
      <CheckIcon className="w-3.5 h-3.5 flex-shrink-0" />
      {t("expertMgmt.action.approve")}
    </button>
  );

  // PENDING or CHANGES_REQUESTED
  return (
    <>
      <button
        onClick={() => onAction("approve", expert)}
        className={`${btnBase} border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400`}
      >
        <CheckIcon className="w-3.5 h-3.5 flex-shrink-0" />
        {t("expertMgmt.action.approve")}
      </button>
      <button
        onClick={() => onAction("reject", expert)}
        className={`${btnBase} border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-400`}
      >
        <XIcon className="w-3.5 h-3.5 flex-shrink-0" />
        {t("expertMgmt.action.reject")}
      </button>
    </>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────
const PaginationBar = ({ page, totalPages, total, limit, onPageChange, t }) => {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const buildPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
    return pages;
  };
  const btnBase = "inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all duration-150 select-none";
  const navBtnCls = (disabled) =>
    `${btnBase} gap-1 px-2.5 w-auto ${disabled ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-[#1F2933] hover:bg-gray-100"}`;

  return (
    <div className="flex items-center justify-between mt-4 px-1 gap-2">
      <p className="text-sm text-gray-500 shrink-0">
        {t("expertMgmt.pagination.showing")}{" "}
        <span className="font-medium text-[#1F2933]">{from}–{to}</span>{" "}
        {t("expertMgmt.pagination.of")}{" "}
        <span className="font-medium text-[#1F2933]">{total}</span>{" "}
        <span className="hidden sm:inline">{t("expertMgmt.pagination.expert", { count: total })}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className={navBtnCls(page === 1)}>
          <ChevronLeftIcon className="w-4 h-4" />
          {t("expertMgmt.pagination.prev")}
        </button>

        {/* Page numbers — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1">
          {buildPages().map((p, i) =>
            p === "…" ? (
              <span key={`e-${i}`} className="w-8 h-8 inline-flex items-center justify-center text-sm text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`${btnBase} ${p === page ? "bg-[#445446] text-white shadow-sm" : "text-gray-500 hover:text-[#1F2933] hover:bg-gray-100"}`}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Page indicator on mobile */}
        <span className="sm:hidden text-sm text-gray-500 px-2">{page} / {totalPages}</span>

        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className={navBtnCls(page === totalPages)}>
          {t("expertMgmt.pagination.next")}
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ─── Expert card (mobile / tablet view) ──────────────────────────────────────
const ExpertCard = ({ expert, isActioning, onAction, onNavigate, t }) => {
  const isDeleted = !!expert.user?.account_deleted;
  const name = isDeleted ? t("expertMgmt.badge.deleted") : (expert.user?.name || "—");
  const email = isDeleted ? null : (expert.user?.email || "—");
  const bookingCount = expert._count?.bookings ?? 0;
  const hasActions = !isDeleted;

  return (
    <div className="bg-white rounded-2xl border-2 border-[#c5ceba] overflow-hidden">
      {/* Tap target → detail page */}
      <button
        onClick={() => onNavigate(`/dashboard/admin/experts/${expert.id}`)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-[#dfe2d7]/30 active:bg-[#dfe2d7]/50 transition-colors"
      >
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          {getProfileImageUrl(expert.profile_image) ? (
            <img
              src={getProfileImageUrl(expert.profile_image)}
              alt={name}
              className="w-10 h-10 rounded-full object-cover border border-[#E4E7E4]"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="w-10 h-10 rounded-full bg-[#445446]/10 text-[#445446] flex items-center justify-center text-sm font-bold select-none"
            style={{ display: getProfileImageUrl(expert.profile_image) ? "none" : "flex" }}
          >
            {getInitials(isDeleted ? "D" : expert.user?.name)}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#1F2933] truncate">{name}</p>
            <StatusBadge status={expert.status} deleted={isDeleted} />
          </div>
          {email && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{email}</p>
          )}
          {expert.position && (
            <p className="text-xs text-[#5e6d5b] truncate mt-0.5">{expert.position}</p>
          )}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
            <span className="text-xs text-gray-400">
              {t("expertMgmt.col.joined")}: {formatDate(expert.user?.created_at)}
            </span>
            {bookingCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(`/dashboard/admin/bookings?search=${encodeURIComponent(expert.user?.name || "")}`);
                }}
                className="text-xs font-medium text-[#445446] hover:underline"
              >
                {bookingCount} {t("expertMgmt.col.bookings").toLowerCase()}
              </button>
            )}
            {expert.dac7?.threshold_reached && (
              <span
                title={`DAC7 threshold reached (${expert.dac7.year}): ${expert.dac7.transaction_count} transactions · £${expert.dac7.gross_earnings.toFixed(2)} gross`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300"
              >
                <WarningTriangleIcon className="w-2.5 h-2.5" />
                DAC7
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0 mt-2" />
      </button>

      {/* Action strip */}
      {hasActions && (
        <div className={`flex items-center gap-2 px-4 py-3 border-t border-[#dfe2d7] bg-[#f9faf8] ${isActioning ? "justify-center" : ""}`}>
          <ExpertActionButtons
            expert={expert}
            isActioning={isActioning}
            onAction={onAction}
            t={t}
            compact={false}
          />
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const ExpertManagementSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("adminDashboard");

  // ── Filter / pagination state ────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState("all");
  const [page,         setPage]         = useState(1);
  const [searchInput,  setSearchInput]  = useState("");
  const [search,       setSearch]       = useState("");
  const [cityFilter,   setCityFilter]   = useState("");
  const [qualFilter,   setQualFilter]   = useState("");
  const [fromDate,     setFromDate]     = useState("");
  const [toDate,       setToDate]       = useState("");

  // ── Action UI state ──────────────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  // ── Debounced search ─────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  // ── RTK query ────────────────────────────────────────────────────────────────
  const queryParams = {
    page,
    limit: PAGE_LIMIT,
    ...(activeFilter !== "all" && { status: activeFilter.toUpperCase() }),
    ...(search     && { search }),
    ...(cityFilter && { city: cityFilter }),
    ...(qualFilter && { qualification: qualFilter }),
    ...(fromDate   && { from: fromDate }),
    ...(toDate     && { to: toDate }),
  };

  const { data, isLoading, isFetching } = useListExpertsQuery(queryParams);
  const experts    = data?.data       ?? [];
  const pagination = data?.pagination ?? { total: 0, totalPages: 1 };
  const counts     = data?.counts     ?? { all: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, SUSPENDED: 0, CHANGES_REQUESTED: 0, DELETED: 0 };

  // ── RTK mutations ─────────────────────────────────────────────────────────────
  const [exportExpertsXlsx, { isLoading: exporting }] = useExportExpertsXlsxMutation();
  const [approveExpert]    = useApproveExpertMutation();
  const [rejectExpert]     = useRejectExpertMutation();
  const [suspendExpert]    = useSuspendExpertMutation();
  const [reactivateExpert] = useReactivateExpertMutation();
  const [sendPasswordReset]    = useSendPasswordResetMutation();
  const [resendVerification]   = useResendVerificationMutation();
  const [manuallyVerify]       = useManuallyVerifyMutation();

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const hasActiveFilters = search || cityFilter || qualFilter || fromDate || toDate;

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setCityFilter("");
    setQualFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

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

  const requestAction = (type, expert) => setConfirmAction({ type, expert });

  const handleExport = async () => {
    const params = {};
    if (activeFilter !== "all") params.status = activeFilter.toUpperCase();
    if (search)     params.search        = search;
    if (cityFilter) params.city          = cityFilter;
    if (qualFilter) params.qualification = qualFilter;
    if (fromDate)   params.from          = fromDate;
    if (toDate)     params.to            = toDate;
    try {
      const blob = await exportExpertsXlsx(params).unwrap();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `experts_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — user can retry
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    const { type, expert } = confirmAction;
    setConfirmAction(null);
    setActionLoading(expert.id);
    try {
      if      (type === "approve")              await approveExpert(expert.id).unwrap();
      else if (type === "reject")               await rejectExpert(expert.id).unwrap();
      else if (type === "suspend")              await suspendExpert(expert.id).unwrap();
      else if (type === "reactivate")           await reactivateExpert(expert.id).unwrap();
      else if (type === "manual-verify")        await manuallyVerify(expert.id).unwrap();
      else if (type === "password-reset") {
        await sendPasswordReset(expert.id).unwrap();
        toast.success(t("expertMgmt.success.passwordReset"));
      } else if (type === "resend-verification") {
        await resendVerification(expert.id).unwrap();
        toast.success(t("expertMgmt.success.resendVerification"));
      }
    } catch (e) {
      toast.error(e?.data?.error || `Failed to ${type.replace(/-/g, " ")} expert.`);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Initial loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  const tabCount = (key) => key === "all" ? counts.all : counts[key.toUpperCase()] ?? 0;

  const filterInputCls =
    "w-full px-3 py-2 text-sm border border-[#c5ceba] rounded-lg bg-white text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition";

  return (
    <>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#445446]">{t("expertMgmt.pageTitle")}</h2>
          <p className="text-sm text-[#5e6d5b] font-medium mt-1">{t("expertMgmt.pageSubtitle")}</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center justify-center gap-2 text-sm font-medium bg-[#445446] text-white hover:bg-[#3a4a3b] active:scale-95 disabled:opacity-50 px-4 py-2.5 rounded-lg transition-all duration-150 sm:flex-shrink-0 sm:ml-4 shadow-sm w-full sm:w-auto"
        >
          {exporting ? (
            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <DownloadIcon className="w-4 h-4" />
          )}
          {exporting ? t("expertMgmt.exporting") : t("expertMgmt.exportBtn")}
        </button>
      </div>

      {/* ── Search + Filters box ── */}
      <div className="mb-5 bg-white rounded-2xl border-2 border-[#c5ceba] p-4 space-y-3">

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("expertMgmt.searchPlaceholder")}
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-[#c5ceba] rounded-xl bg-white text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filter — native select on mobile, tab bar on lg+ */}
        <select
          value={activeFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="lg:hidden w-full px-3 py-2.5 text-sm border border-[#c5ceba] rounded-xl bg-white text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition"
        >
          {STATUS_FILTER_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`expertMgmt.filter.${key}`)} ({tabCount(key)})
            </option>
          ))}
        </select>

        <div className="hidden lg:inline-flex items-center bg-white border border-[#c5ceba] rounded-xl p-1 gap-0.5">
          {STATUS_FILTER_KEYS.map((key) => {
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive ? "bg-[#445446] text-white shadow-sm" : "text-gray-500 hover:text-[#1F2933] hover:bg-gray-50"
                }`}
              >
                {t(`expertMgmt.filter.${key}`)}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {tabCount(key)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Desktop: city · qual · date from · date to in one flex row */}
        <div className="hidden lg:flex items-center gap-2">
          <input
            type="text"
            value={cityFilter}
            placeholder={t("expertMgmt.cityPlaceholder")}
            onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
            className={`flex-1 min-w-0 ${filterInputCls}`}
          />
          <select
            value={qualFilter}
            onChange={(e) => { setQualFilter(e.target.value); setPage(1); }}
            className={`flex-1 min-w-0 ${filterInputCls}`}
          >
            {QUAL_OPTION_VALUES.map((value) => (
              <option key={value} value={value}>
                {value === "" ? t("expertMgmt.qual.all") : t(`expertMgmt.qual.${value}`)}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">{t("expertMgmt.registeredFrom")}</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="w-36 px-3 py-2 text-sm border border-[#c5ceba] rounded-lg bg-white text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition uppercase"
          />
          <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">{t("expertMgmt.to")}</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="w-36 px-3 py-2 text-sm border border-[#c5ceba] rounded-lg bg-white text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition uppercase"
          />
        </div>

        {/* Mobile: 2-col grid (city|qual on row 1, from|to on row 2) */}
        <div className="grid grid-cols-2 gap-2 lg:hidden">
          <input
            type="text"
            value={cityFilter}
            placeholder={t("expertMgmt.cityPlaceholder")}
            onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
            className={filterInputCls}
          />
          <select
            value={qualFilter}
            onChange={(e) => { setQualFilter(e.target.value); setPage(1); }}
            className={filterInputCls}
          >
            {QUAL_OPTION_VALUES.map((value) => (
              <option key={value} value={value}>
                {value === "" ? t("expertMgmt.qual.all") : t(`expertMgmt.qual.${value}`)}
              </option>
            ))}
          </select>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">{t("expertMgmt.registeredFrom")}</p>
            <CenteredDateInput
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className={filterInputCls}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">{t("expertMgmt.to")}</p>
            <CenteredDateInput
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className={filterInputCls}
            />
          </div>
        </div>

        {/* Clear + fetching indicator */}
        {(hasActiveFilters || isFetching) && (
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" />
                {t("expertMgmt.clear")}
              </button>
            )}
            {isFetching && (
              <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
            )}
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {experts.length === 0 && !isFetching ? (
        <div className="bg-white rounded-2xl border-2 border-[#c5ceba] flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[#dfe2d7]/50 flex items-center justify-center mb-3">
            <UserIcon className="w-5 h-5 text-[#c5ceba]" />
          </div>
          <p className="text-sm font-semibold text-[#445446]">{t("expertMgmt.noExpertsTitle")}</p>
          <p className="text-xs text-[#5e6d5b]/70 mt-1">
            {hasActiveFilters || activeFilter !== "all" ? t("expertMgmt.noExpertsFiltered") : t("expertMgmt.noExpertsYet")}
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop table (lg and above) ── */}
          <div
            className={`hidden lg:block bg-white rounded-2xl border-2 border-[#c5ceba] overflow-hidden transition-opacity duration-150 ${
              isFetching ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            {/* Header row */}
            <div className="grid grid-cols-[1.1fr_1.2fr_1fr_110px_105px_80px_60px_200px] gap-3 px-5 py-3 bg-[#445446] border-b border-[#3a4a3b]">
              <p className="text-xs font-semibold text-white uppercase tracking-wider">{t("expertMgmt.col.name")}</p>
              <p className="text-xs font-semibold text-white uppercase tracking-wider">{t("expertMgmt.col.email")}</p>
              <p className="text-xs font-semibold text-white uppercase tracking-wider">{t("expertMgmt.col.position")}</p>
              <p className="text-xs font-semibold text-white uppercase tracking-wider">{t("expertMgmt.col.status")}</p>
              <p className="text-xs font-semibold text-white uppercase tracking-wider">{t("expertMgmt.col.joined")}</p>
              <p className="text-xs font-semibold text-white uppercase tracking-wider">{t("expertMgmt.col.bookings")}</p>
              <p className="text-xs font-semibold text-white uppercase tracking-wider" title="EU Directive 2021/514 — DAC7 reporting threshold">{t("expertMgmt.col.dac7")}</p>
              <p className="text-xs font-semibold text-white uppercase tracking-wider text-right">{t("expertMgmt.col.actions")}</p>
            </div>

            {experts.map((expert, idx) => {
              const isDeleted   = !!expert.user?.account_deleted;
              const name        = isDeleted ? t("expertMgmt.badge.deleted") : (expert.user?.name  || "—");
              const email       = isDeleted ? null : (expert.user?.email || "—");
              const isActioning = actionLoading === expert.id;

              return (
                <div
                  key={expert.id}
                  className={`grid grid-cols-[1.1fr_1.2fr_1fr_110px_105px_80px_60px_200px] gap-3 px-5 py-3 items-center hover:bg-[#dfe2d7]/50 transition-colors bg-white ${idx > 0 ? "border-t border-[#dfe2d7]" : ""}`}
                >
                  {/* Name */}
                  <button
                    onClick={() => navigate(`/dashboard/admin/experts/${expert.id}`)}
                    className="flex items-center gap-2.5 text-left group"
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
                      style={{ display: getProfileImageUrl(expert.profile_image) ? "none" : "flex" }}
                    >
                      {getInitials(isDeleted ? "D" : expert.user?.name)}
                    </div>
                    <span className="text-sm font-medium text-[#1F2933] group-hover:text-[#445446] group-hover:underline underline-offset-2 truncate transition-colors">
                      {name}
                    </span>
                  </button>

                  {/* Email */}
                  {email ? (
                    <a href={`mailto:${email}`} className="text-sm text-gray-500 truncate hover:text-[#445446] hover:underline">
                      {email}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-300 italic">—</span>
                  )}

                  {/* Position */}
                  <p className="text-sm text-gray-500 truncate">
                    {expert.position || <span className="italic text-gray-300">—</span>}
                  </p>

                  {/* Status */}
                  <div><StatusBadge status={expert.status} deleted={isDeleted} /></div>

                  {/* Joined */}
                  <p className="text-xs text-gray-500">{formatDate(expert.user?.created_at)}</p>

                  {/* Bookings count */}
                  {(() => {
                    const count = expert._count?.bookings ?? 0;
                    return count > 0 ? (
                      <button
                        onClick={() => navigate(`/dashboard/admin/bookings?search=${encodeURIComponent(expert.user?.name || "")}`)}
                        className="text-sm font-medium text-[#445446] hover:underline text-left"
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
                        <WarningTriangleIcon className="w-2.5 h-2.5" />
                        {t("expertMgmt.col.dac7")}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-300">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5">
                    <ExpertActionButtons
                      expert={expert}
                      isActioning={isActioning}
                      onAction={requestAction}
                      t={t}
                      compact={true}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Mobile / tablet card list (below lg) ── */}
          <div
            className={`lg:hidden space-y-3 transition-opacity duration-150 ${
              isFetching ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            {experts.map((expert) => (
              <ExpertCard
                key={expert.id}
                expert={expert}
                isActioning={actionLoading === expert.id}
                onAction={requestAction}
                onNavigate={navigate}
                t={t}
              />
            ))}
          </div>
        </>
      )}

      <PaginationBar
        page={page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={PAGE_LIMIT}
        onPageChange={handlePageChange}
        t={t}
      />

      {/* ── Confirm modal ── */}
      {confirmAction && (() => {
        const type = confirmAction.type;
        const cfg = {
          approve: {
            title: t("expertMgmt.confirmModal.approve_title"),
            prefix: t("expertMgmt.confirmModal.approve_prefix"),
            iconBg: "bg-green-50", btnCls: "bg-green-600 hover:bg-green-700",
            icon: <CheckIcon className="w-6 h-6 text-green-600" />,
          },
          reject: {
            title: t("expertMgmt.confirmModal.reject_title"),
            prefix: t("expertMgmt.confirmModal.reject_prefix"),
            iconBg: "bg-red-50", btnCls: "bg-red-500 hover:bg-red-600",
            icon: <XIcon className="w-6 h-6 text-red-500" />,
          },
          suspend: {
            title: t("expertMgmt.confirmModal.suspend_title"),
            prefix: t("expertMgmt.confirmModal.suspend_prefix"),
            iconBg: "bg-orange-50", btnCls: "bg-orange-500 hover:bg-orange-600",
            icon: <NoCircleIcon className="w-6 h-6 text-orange-500" />,
          },
          reactivate: {
            title: t("expertMgmt.confirmModal.reactivate_title"),
            prefix: t("expertMgmt.confirmModal.reactivate_prefix"),
            iconBg: "bg-green-50", btnCls: "bg-green-600 hover:bg-green-700",
            icon: <CheckIcon className="w-6 h-6 text-green-600" />,
          },
          "password-reset": {
            title: t("expertMgmt.confirmModal.password-reset_title"),
            prefix: t("expertMgmt.confirmModal.password-reset_prefix"),
            iconBg: "bg-gray-50", btnCls: "bg-[#445446] hover:bg-[#3F4E41]",
            icon: <LockStrokeIcon className="w-6 h-6 text-gray-500" />,
          },
          "resend-verification": {
            title: t("expertMgmt.confirmModal.resend-verification_title"),
            prefix: t("expertMgmt.confirmModal.resend-verification_prefix"),
            iconBg: "bg-gray-50", btnCls: "bg-[#445446] hover:bg-[#3F4E41]",
            icon: <EnvelopeIcon className="w-6 h-6 text-gray-500" />,
          },
          "manual-verify": {
            title: t("expertMgmt.confirmModal.manual-verify_title"),
            prefix: t("expertMgmt.confirmModal.manual-verify_prefix"),
            iconBg: "bg-blue-50", btnCls: "bg-blue-600 hover:bg-blue-700",
            icon: <BadgeCheckIcon className="w-6 h-6 text-blue-600" />,
          },
        }[type] || {};

        const expertName = confirmAction.expert.user?.name || confirmAction.expert.user?.email;

        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setConfirmAction(null); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${cfg.iconBg}`}>
                {cfg.icon}
              </div>
              <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">{cfg.title}</h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                {cfg.prefix} <span className="font-medium text-[#1F2933]">{expertName}</span>?
              </p>
              {type === "approve" && !confirmAction.expert.insurance && (
                <div className="flex items-start gap-2 px-3 py-2.5 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
                  <WarningTriangleFilledIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-px" />
                  <p className="text-xs text-amber-800">{t("expertMgmt.confirmModal.noInsurance")}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t("expertMgmt.confirmModal.cancel")}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-white text-sm font-medium transition-colors ${cfg.btnCls}`}
                >
                  {t("expertMgmt.confirmModal.confirm")}
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
