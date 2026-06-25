import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useListParentsQuery,
  useExportParentsXlsxMutation,
} from "../../../api/adminApi";
import CenteredDateInput from "../../../components/CenteredDateInput";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 10;

const STATUS_FILTER_KEYS = ["all", "active", "suspended"];

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
const StatusBadge = ({ status }) => {
  const { t } = useTranslation("adminDashboard");
  if (!status || status === "ACTIVE")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
        {t("parentMgmt.badge.active")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
      {t("parentMgmt.badge.suspended")}
    </span>
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
        {t("parentMgmt.pagination.showing")}{" "}
        <span className="font-medium text-[#1F2933]">{from}–{to}</span>{" "}
        {t("parentMgmt.pagination.of")}{" "}
        <span className="font-medium text-[#1F2933]">{total}</span>{" "}
        <span className="hidden sm:inline">{t("parentMgmt.pagination.parent", { count: total })}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className={navBtnCls(page === 1)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          {t("parentMgmt.pagination.prev")}
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
          {t("parentMgmt.pagination.next")}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ─── Parent card (mobile / tablet view) ──────────────────────────────────────
const ParentCard = ({ parent, isFetching, onNavigate, t }) => {
  const status = parent.parent_status || "ACTIVE";
  const initials = getInitials(parent.name);
  const bookingCount = parent._count?.bookings_as_parent ?? 0;

  return (
    <button
      onClick={() => onNavigate(`/dashboard/admin/parents/${parent.id}`)}
      className={`w-full bg-white rounded-2xl border-2 border-[#c5ceba] overflow-hidden text-left transition-opacity ${isFetching ? "opacity-60" : ""}`}
    >
      {/* Main info */}
      <div className="flex items-start gap-3 p-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-[#445446]/10 text-[#445446] flex items-center justify-center text-sm font-bold flex-shrink-0 select-none">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#1F2933] truncate">{parent.name || "—"}</p>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">{parent.email}</p>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
            <span className="text-xs text-gray-400">
              {t("parentMgmt.col.joined")}: {formatDate(parent.created_at)}
            </span>
            {bookingCount > 0 && (
              <span className="text-xs font-medium text-[#445446]">
                {bookingCount} {t("parentMgmt.col.bookings").toLowerCase()}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>

      {/* View strip */}
      <div className="px-4 py-2.5 border-t border-[#dfe2d7] bg-[#f9faf8] flex items-center justify-between">
        <span className="text-xs font-medium text-[#445446]">{t("parentMgmt.viewBtn")}</span>
        <svg className="w-3.5 h-3.5 text-[#445446]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </button>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const ParentManagementSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("adminDashboard");

  const [searchInput, setSearchInput] = useState("");
  const [search,      setSearch]      = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page,        setPage]        = useState(1);
  const [fromDate,    setFromDate]    = useState("");
  const [toDate,      setToDate]      = useState("");

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const queryParams = {
    page,
    limit: PAGE_LIMIT,
    ...(activeFilter !== "all" ? { status: activeFilter.toUpperCase() } : {}),
    ...(search   ? { search }         : {}),
    ...(fromDate ? { from: fromDate } : {}),
    ...(toDate   ? { to: toDate }     : {}),
  };

  const { data, isLoading, isFetching, isError } = useListParentsQuery(queryParams);
  const [exportParentsXlsx, { isLoading: exporting }] = useExportParentsXlsxMutation();

  const parents    = data?.data       ?? [];
  const pagination = data?.pagination ?? { total: 0, totalPages: 1 };
  const counts     = data?.counts     ?? { all: 0, ACTIVE: 0, SUSPENDED: 0 };

  const hasActiveFilters = search || fromDate || toDate;

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

  const handleSearchChange = (val) => {
    setSearchInput(val);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const blob = await exportParentsXlsx(queryParams).unwrap();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `parents_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — user can retry
    }
  };

  const tabCount = (key) => key === "all" ? counts.all ?? 0 : counts[key.toUpperCase()] ?? 0;

  const filterInputCls =
    "w-full px-3 py-2 text-sm border border-[#c5ceba] rounded-lg bg-white text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#445446]">{t("parentMgmt.pageTitle")}</h2>
          <p className="text-sm text-[#5e6d5b] font-medium mt-1">{t("parentMgmt.pageSubtitle")}</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center justify-center gap-2 text-sm font-medium bg-[#445446] text-white hover:bg-[#3a4a3b] active:scale-95 disabled:opacity-50 px-4 py-2.5 rounded-lg transition-all duration-150 sm:flex-shrink-0 sm:ml-4 shadow-sm w-full sm:w-auto"
        >
          {exporting ? (
            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          )}
          {exporting ? t("parentMgmt.exporting") : t("parentMgmt.exportBtn")}
        </button>
      </div>

      {isError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {t("parentMgmt.loadError")}
        </div>
      )}

      {/* ── Search + Filters box ── */}
      <div className="mb-5 bg-white rounded-2xl border-2 border-[#c5ceba] p-4 space-y-3">

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder={t("parentMgmt.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-[#c5ceba] rounded-xl bg-white text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition"
          />
          {searchInput && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Mobile: native select for status */}
        <select
          value={activeFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="lg:hidden w-full px-3 py-2.5 text-sm border border-[#c5ceba] rounded-xl bg-white text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition"
        >
          {STATUS_FILTER_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`parentMgmt.filter.${key}`)} ({tabCount(key)})
            </option>
          ))}
        </select>

        {/* Desktop: status tabs + date range all in one row */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="inline-flex items-center border border-[#c5ceba] rounded-xl p-1 gap-0.5 flex-shrink-0">
            {STATUS_FILTER_KEYS.map((key) => {
              const isActive = activeFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => handleFilterChange(key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive ? "bg-[#445446] text-white shadow-sm" : "text-[#5e6d5b] hover:text-[#445446] hover:bg-[#dfe2d7]/50"
                  }`}
                >
                  {t(`parentMgmt.filter.${key}`)}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {tabCount(key)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Date filters inline */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">{t("parentMgmt.registeredFrom")}</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="w-36 px-3 py-2 text-sm border border-[#c5ceba] rounded-lg bg-white text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition uppercase"
            />
            <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">{t("parentMgmt.to")}</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="w-36 px-3 py-2 text-sm border border-[#c5ceba] rounded-lg bg-white text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition uppercase"
            />
          </div>
        </div>

        {/* Mobile: date range grid */}
        <div className="grid grid-cols-2 gap-2 lg:hidden">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">{t("parentMgmt.registeredFrom")}</p>
            <CenteredDateInput
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className={filterInputCls}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">{t("parentMgmt.to")}</p>
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
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
                {t("parentMgmt.clearFilters")}
              </button>
            )}
            {isFetching && (
              <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
            )}
          </div>
        )}
      </div>

      {/* ── Desktop table (lg and above) ── */}
      <div className={`hidden lg:block bg-white rounded-2xl border-2 border-[#c5ceba] overflow-hidden transition-opacity duration-150 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#445446] border-b border-[#3a4a3b]">
                <th className="text-left text-xs font-semibold text-white uppercase tracking-wider px-5 py-3">{t("parentMgmt.col.parent")}</th>
                <th className="text-left text-xs font-semibold text-white uppercase tracking-wider px-4 py-3">{t("parentMgmt.col.joined")}</th>
                <th className="text-left text-xs font-semibold text-white uppercase tracking-wider px-4 py-3">{t("parentMgmt.col.status")}</th>
                <th className="text-right text-xs font-semibold text-white uppercase tracking-wider px-4 py-3">{t("parentMgmt.col.bookings")}</th>
                <th className="text-right text-xs font-semibold text-white uppercase tracking-wider px-4 py-3">{t("parentMgmt.col.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfe2d7]">
              {isFetching && parents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="w-6 h-6 rounded-full border-2 border-[#445446] border-t-transparent animate-spin mx-auto" />
                  </td>
                </tr>
              ) : parents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#dfe2d7]/50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#c5ceba]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-[#445446]">{t("parentMgmt.noParents")}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                parents.map((p) => {
                  const status = p.parent_status || "ACTIVE";
                  const initials = getInitials(p.name);
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#dfe2d7]/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/dashboard/admin/parents/${p.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#445446]/10 text-[#445446] flex items-center justify-center text-xs font-bold flex-shrink-0 select-none">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[#1F2933] truncate">{p.name || "—"}</p>
                            <p className="text-xs text-gray-400 truncate">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{formatDate(p.created_at)}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={status} /></td>
                      <td className="px-4 py-3.5 text-right font-medium text-gray-600">{p._count?.bookings_as_parent ?? "—"}</td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/admin/parents/${p.id}`); }}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#c5ceba] text-[#5e6d5b] hover:border-[#445446] hover:text-[#445446] hover:bg-[#dfe2d7]/50 transition-all duration-150 whitespace-nowrap"
                        >
                          {t("parentMgmt.viewBtn")}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile / tablet card list (below lg) ── */}
      {parents.length === 0 && !isFetching ? (
        <div className="lg:hidden bg-white rounded-2xl border-2 border-[#c5ceba] flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[#dfe2d7]/50 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-[#c5ceba]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#445446]">{t("parentMgmt.noParents")}</p>
        </div>
      ) : (
        <div className={`lg:hidden space-y-3 transition-opacity duration-150 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}>
          {parents.map((p) => (
            <ParentCard
              key={p.id}
              parent={p}
              isFetching={isFetching}
              onNavigate={navigate}
              t={t}
            />
          ))}
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
    </>
  );
};

export default ParentManagementSection;
