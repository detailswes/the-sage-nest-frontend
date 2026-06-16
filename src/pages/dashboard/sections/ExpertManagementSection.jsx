import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  listExperts,
  exportExpertsXlsx,
  approveExpert,
  rejectExpert,
  suspendExpert,
  reactivateExpert,
  sendPasswordReset,
  resendVerification,
  manuallyVerify,
} from "../../../api/adminApi";
import { getProfileImageUrl } from "../../../utils/imageUrl";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 10;

// Keys only — labels resolved via t() at render time
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
    ? name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status, deleted }) => {
  const { t } = useTranslation("adminDashboard");
  if (deleted)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
        </svg>
        {t("expertMgmt.badge.deleted")}
      </span>
    );
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
        {t("expertMgmt.badge.APPROVED")}
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
        {t("expertMgmt.badge.REJECTED")}
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
        {t("expertMgmt.badge.SUSPENDED")}
      </span>
    );
  if (status === "CHANGES_REQUESTED")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2.695 14.763l-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
        </svg>
        {t("expertMgmt.badge.CHANGES_REQUESTED")}
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
      {t("expertMgmt.badge.PENDING")}
    </span>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────
const PaginationBar = ({ page, totalPages, total, limit, onPageChange, t }) => {
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
        {t("expertMgmt.pagination.showing")}{" "}
        <span className="font-medium text-[#1F2933]">
          {from}–{to}
        </span>{" "}
        {t("expertMgmt.pagination.of")}{" "}
        <span className="font-medium text-[#1F2933]">{total}</span>{" "}
        {t("expertMgmt.pagination.expert", { count: total })}
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
          {t("expertMgmt.pagination.prev")}
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
          {t("expertMgmt.pagination.next")}
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

// ─── Main component ───────────────────────────────────────────────────────────
const ExpertManagementSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("adminDashboard");

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
    DELETED: 0,
  });
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [confirmAction, setConfirmAction] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Search + additional filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [qualFilter, setQualFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const debounceRef = useRef(null);

  const handleSearchChange = (val) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  };

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

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (activeFilter !== "all") params.status = activeFilter.toUpperCase();
      if (search)    params.search = search;
      if (cityFilter) params.city  = cityFilter;
      if (qualFilter) params.qualification = qualFilter;
      if (fromDate)  params.from   = fromDate;
      if (toDate)    params.to     = toDate;

      const blob = await exportExpertsXlsx(params);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `experts_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — user can retry
    } finally {
      setExporting(false);
    }
  };

  const fetchExperts = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const params = { page, limit: PAGE_LIMIT };
      if (activeFilter !== "all") params.status = activeFilter.toUpperCase();
      if (search)    params.search = search;
      if (cityFilter) params.city  = cityFilter;
      if (qualFilter) params.qualification = qualFilter;
      if (fromDate)  params.from   = fromDate;
      if (toDate)    params.to     = toDate;

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
  }, [page, activeFilter, search, cityFilter, qualFilter, fromDate, toDate]);

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

  const requestAction = (type, expert) => {
    if (type === "_refresh") {
      fetchExperts();
      return;
    }
    setConfirmAction({ type, expert });
  };

  const SUCCESS_MSG = {
    "password-reset":       t("expertMgmt.success.passwordReset"),
    "resend-verification":  t("expertMgmt.success.resendVerification"),
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#1F2933]">{t("expertMgmt.pageTitle")}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t("expertMgmt.pageSubtitle")}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 text-sm font-medium text-[#445446] border border-[#445446]/30 hover:bg-[#445446]/5 disabled:opacity-50 px-3.5 py-2 rounded-lg transition-colors flex-shrink-0 ml-4"
        >
          {exporting ? (
            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          )}
          {exporting ? t("expertMgmt.exporting") : t("expertMgmt.exportBtn")}
        </button>
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
          placeholder={t("expertMgmt.searchPlaceholder")}
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
          {STATUS_FILTER_KEYS.map((key) => {
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
                {t(`expertMgmt.filter.${key}`)}
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
          placeholder={t("expertMgmt.cityPlaceholder")}
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
          {QUAL_OPTION_VALUES.map((value) => (
            <option key={value} value={value}>
              {value === "" ? t("expertMgmt.qual.all") : t(`expertMgmt.qual.${value}`)}
            </option>
          ))}
        </select>

        {/* Registration date range */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">{t("expertMgmt.registeredFrom")}</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className={filterInputCls}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">{t("expertMgmt.to")}</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className={filterInputCls}
          />
        </div>

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
            {t("expertMgmt.clear")}
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
          <p className="text-sm font-medium text-gray-500">{t("expertMgmt.noExpertsTitle")}</p>
          <p className="text-xs text-gray-400 mt-1">
            {hasActiveFilters || activeFilter !== "all"
              ? t("expertMgmt.noExpertsFiltered")
              : t("expertMgmt.noExpertsYet")}
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
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("expertMgmt.col.name")}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("expertMgmt.col.email")}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("expertMgmt.col.position")}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("expertMgmt.col.status")}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("expertMgmt.col.joined")}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("expertMgmt.col.bookings")}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider" title="EU Directive 2021/514 — DAC7 reporting threshold">{t("expertMgmt.col.dac7")}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">{t("expertMgmt.col.actions")}</p>
          </div>

          {experts.map((expert, idx) => {
            const isDeleted = !!expert.user?.account_deleted;
            const name  = isDeleted ? t("expertMgmt.badge.deleted") : (expert.user?.name  || "—");
            const email = isDeleted ? null               : (expert.user?.email || "—");
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
                  title={t("expertMgmt.col.name")}
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
                    {getInitials(isDeleted ? "D" : expert.user?.name)}
                  </div>
                  <span className="text-sm font-medium text-[#1F2933] group-hover:text-[#445446] group-hover:underline underline-offset-2 truncate transition-colors">
                    {name}
                  </span>
                </button>

                {/* Email */}
                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="text-sm text-gray-500 truncate hover:text-[#445446] hover:underline"
                  >
                    {email}
                  </a>
                ) : (
                  <span className="text-sm text-gray-300 italic">—</span>
                )}

                {/* Position */}
                <p className="text-sm text-gray-500 truncate">
                  {expert.position || (
                    <span className="italic text-gray-300">—</span>
                  )}
                </p>

                {/* Status */}
                <div>
                  <StatusBadge status={expert.status} deleted={isDeleted} />
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
                      title={t("expertMgmt.col.bookings")}
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
                      {t("expertMgmt.col.dac7")}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-300">—</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5">
                  {isDeleted ? (
                    <span className="text-xs text-gray-300 italic">—</span>
                  ) : isActioning ? (
                    <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin mx-auto" />
                  ) : expert.status === "SUSPENDED" ? (
                    <button
                      onClick={() => requestAction("reactivate", expert)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all duration-150"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      {t("expertMgmt.action.reactivate")}
                    </button>
                  ) : expert.status === "APPROVED" ? (
                    <>
                      <button
                        onClick={() => requestAction("reject", expert)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-all duration-150"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                        {t("expertMgmt.action.reject")}
                      </button>
                      <button
                        onClick={() => requestAction("suspend", expert)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 hover:border-orange-300 transition-all duration-150"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        {t("expertMgmt.action.suspend")}
                      </button>
                    </>
                  ) : expert.status === "REJECTED" ? (
                    <button
                      onClick={() => requestAction("approve", expert)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all duration-150"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      {t("expertMgmt.action.approve")}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => requestAction("approve", expert)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all duration-150"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        {t("expertMgmt.action.approve")}
                      </button>
                      <button
                        onClick={() => requestAction("reject", expert)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-all duration-150"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                        {t("expertMgmt.action.reject")}
                      </button>
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
        t={t}
      />

      {confirmAction &&
        (() => {
          const type = confirmAction.type;
          const cfg = {
            approve: {
              title: t("expertMgmt.confirmModal.approve_title"),
              prefix: t("expertMgmt.confirmModal.approve_prefix"),
              iconBg: "bg-green-50",
              btnCls: "bg-green-600 hover:bg-green-700",
              icon: (
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ),
            },
            reject: {
              title: t("expertMgmt.confirmModal.reject_title"),
              prefix: t("expertMgmt.confirmModal.reject_prefix"),
              iconBg: "bg-red-50",
              btnCls: "bg-red-500 hover:bg-red-600",
              icon: (
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              ),
            },
            suspend: {
              title: t("expertMgmt.confirmModal.suspend_title"),
              prefix: t("expertMgmt.confirmModal.suspend_prefix"),
              iconBg: "bg-orange-50",
              btnCls: "bg-orange-500 hover:bg-orange-600",
              icon: (
                <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ),
            },
            reactivate: {
              title: t("expertMgmt.confirmModal.reactivate_title"),
              prefix: t("expertMgmt.confirmModal.reactivate_prefix"),
              iconBg: "bg-green-50",
              btnCls: "bg-green-600 hover:bg-green-700",
              icon: (
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ),
            },
            "password-reset": {
              title: t("expertMgmt.confirmModal.password-reset_title"),
              prefix: t("expertMgmt.confirmModal.password-reset_prefix"),
              iconBg: "bg-gray-50",
              btnCls: "bg-[#445446] hover:bg-[#3F4E41]",
              icon: (
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              ),
            },
            "resend-verification": {
              title: t("expertMgmt.confirmModal.resend-verification_title"),
              prefix: t("expertMgmt.confirmModal.resend-verification_prefix"),
              iconBg: "bg-gray-50",
              btnCls: "bg-[#445446] hover:bg-[#3F4E41]",
              icon: (
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              ),
            },
            "manual-verify": {
              title: t("expertMgmt.confirmModal.manual-verify_title"),
              prefix: t("expertMgmt.confirmModal.manual-verify_prefix"),
              iconBg: "bg-blue-50",
              btnCls: "bg-blue-600 hover:bg-blue-700",
              icon: (
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                </svg>
              ),
            },
          }[type] || {};

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
                  {cfg.prefix}{" "}
                  <span className="font-medium text-[#1F2933]">
                    {expertName}
                  </span>
                  ?
                </p>
                {type === "approve" && !confirmAction.expert.insurance && (
                  <div className="flex items-start gap-2 px-3 py-2.5 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
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
