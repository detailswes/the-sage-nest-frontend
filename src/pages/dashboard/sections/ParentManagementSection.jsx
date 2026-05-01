import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  listParents,
} from "../../../api/adminApi";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 10;

const STATUS_FILTERS = [
  { key: "all",       label: "All" },
  { key: "active",    label: "Active" },
  { key: "suspended", label: "Suspended" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const getInitials = (name) =>
  name
    ? name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  if (!status || status === "ACTIVE")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
        Active
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
      Suspended
    </span>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────
const PaginationBar = ({ page, totalPages, total, limit, onPageChange }) => {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);
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
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-sm text-gray-500">
        Showing{" "}
        <span className="font-medium text-[#1F2933]">{from}–{to}</span> of{" "}
        <span className="font-medium text-[#1F2933]">{total}</span> parent{total !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={`${btnBase} gap-1 px-2.5 w-auto ${page === 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-[#1F2933] hover:bg-gray-100"}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Prev
        </button>
        {buildPages().map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="text-gray-400 px-1">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`${btnBase} ${p === page ? "bg-[#445446] text-white" : "text-gray-500 hover:bg-gray-100"}`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className={`${btnBase} gap-1 px-2.5 w-auto ${page === totalPages ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-[#1F2933] hover:bg-gray-100"}`}
        >
          Next
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const ParentManagementSection = () => {
  const navigate = useNavigate();
  const [parents, setParents]           = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching]         = useState(false);
  const [error, setError]               = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage]                 = useState(1);
  const [pagination, setPagination]     = useState({ total: 0, totalPages: 1 });
  const [counts, setCounts]             = useState({ all: 0, ACTIVE: 0, SUSPENDED: 0 });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");
  const [fromDate, setFromDate]       = useState("");
  const [toDate, setToDate]           = useState("");
  const debounceRef = useRef(null);

  const handleSearchChange = (val) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(val); setPage(1); }, 400);
  };

  const fetchParents = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const params = { page, limit: PAGE_LIMIT };
      if (activeFilter !== "all") params.status = activeFilter.toUpperCase();
      if (search)   params.search = search;
      if (fromDate) params.from   = fromDate;
      if (toDate)   params.to     = toDate;

      const result = await listParents(params);
      setParents(result.data);
      setPagination(result.pagination);
      setCounts(result.counts);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load parents.");
    } finally {
      setFetching(false);
      setInitialLoading(false);
    }
  }, [page, activeFilter, search, fromDate, toDate]);

  useEffect(() => { fetchParents(); }, [fetchParents]);

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

  const tabCount = (key) =>
    key === "all" ? counts.all : counts[key.toUpperCase()] ?? 0;

  const filterInputCls =
    "px-3 py-2 text-sm border border-[#E4E7E4] rounded-lg bg-white text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition";

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#1F2933]">Parent Management</h2>
        <p className="text-sm text-gray-500 mt-1">
          Review and manage parent accounts on the platform.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-[#E4E7E4]">
        {STATUS_FILTERS.map(({ key, label }) => {
          const count    = tabCount(key);
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? "text-[#445446] border-[#445446]"
                  : "text-gray-500 border-transparent hover:text-[#1F2933] hover:border-gray-300"
              }`}
            >
              {label}
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold ${
                  isActive ? "bg-[#445446] text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={`${filterInputCls} pl-9 w-full`}
          />
        </div>
        {/* Date range */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Registered from</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className={filterInputCls}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">to</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className={filterInputCls}
          />
        </div>
        {(search || fromDate || toDate) && (
          <button
            onClick={() => {
              setSearchInput(""); setSearch(""); setFromDate(""); setToDate(""); setPage(1);
            }}
            className="text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4E7E4] bg-gray-50/50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                  Parent
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                  Joined
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                  Bookings
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7E4]">
              {fetching && parents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="w-6 h-6 rounded-full border-2 border-[#445446] border-t-transparent animate-spin mx-auto" />
                  </td>
                </tr>
              ) : parents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-gray-400">
                    No parents found.
                  </td>
                </tr>
              ) : (
                parents.map((p) => {
                  const status   = p.parent_status || "ACTIVE";
                  const initials = getInitials(p.name);
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${fetching ? "opacity-60" : ""}`}
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
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-gray-600">
                        {p._count?.bookings_as_parent ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/admin/parents/${p.id}`); }}
                          className="text-xs font-medium text-[#445446] hover:underline whitespace-nowrap"
                        >
                          View
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

      <PaginationBar
        page={page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={PAGE_LIMIT}
        onPageChange={handlePageChange}
      />

    </>
  );
};

export default ParentManagementSection;
