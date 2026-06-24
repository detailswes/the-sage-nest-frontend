import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useListAllBookingsQuery } from "../../../api/adminApi";
import BookingDetailModal, {
  BookingStatusBadge,
  DisputedBadge,
  formatCurrency,
} from "../../../components/admin/BookingDetailModal";
import { formatBookingTime } from "../../../utils/formatBookingTime";
import CenteredDateInput from "../../../components/CenteredDateInput";

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTER_KEYS = [
  "ALL",
  "UPCOMING",
  "CONFIRMED",
  "COMPLETED",
  "PENDING_PAYMENT",
  "CANCELLED",
  "REFUNDED",
  "DISPUTED",
];

const LIMIT = 25;

// ─── Main section ─────────────────────────────────────────────────────────────

const BookingsManagementSection = () => {
  const location = useLocation();
  const { t } = useTranslation("adminDashboard");

  // Initialize search from ?search= URL param on first render
  const [searchInput, setSearchInput] = useState(() => {
    const p = new URLSearchParams(location.search);
    return p.get("search") || "";
  });
  const [search,       setSearch]       = useState(() => {
    const p = new URLSearchParams(location.search);
    return p.get("search") || "";
  });
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [fromDate,     setFromDate]     = useState("");
  const [toDate,       setToDate]       = useState("");
  const [page,         setPage]         = useState(1);
  const [selectedId,   setSelectedId]   = useState(null);

  // Debounce searchInput → search
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const queryParams = {
    page,
    limit: LIMIT,
    ...(search ? { search } : {}),
    ...(activeFilter === "DISPUTED"
      ? { disputed: "true", status: "ALL" }
      : { status: activeFilter }),
    ...(fromDate ? { from: fromDate } : {}),
    ...(toDate   ? { to: toDate }     : {}),
  };

  const { data, isLoading, isFetching } = useListAllBookingsQuery(queryParams);

  const bookings     = data?.bookings ?? [];
  const total        = data?.total    ?? 0;
  const totalPages   = Math.ceil(total / LIMIT);
  const statusCounts = data?.counts   ?? {};

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
    setPage(1);
  };

  const handleFromChange = (e) => { setFromDate(e.target.value); setPage(1); };
  const handleToChange   = (e) => { setToDate(e.target.value);   setPage(1); };

  const applyFilter = (key) => { setActiveFilter(key); setPage(1); };

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#445446]">{t("bookingsMgmt.pageTitle")}</h2>
        <p className="text-sm text-[#5e6d5b] font-medium mt-1">{t("bookingsMgmt.pageSubtitle")}</p>
      </div>

      {/* Filter tabs + search — unified box */}
      <div className="mb-5 bg-white rounded-2xl border-2 border-[#c5ceba] p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder={t("bookingsMgmt.searchPlaceholder")}
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-[#c5ceba] rounded-xl bg-white text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition"
          />
          {searchInput && (
            <button
            onClick={() => { setSearchInput(""); setPage(1); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status pill tabs */}
        <div className="flex items-center flex-wrap gap-1 border border-[#c5ceba] rounded-xl p-1">
          {FILTER_KEYS.map((key) => {
            const count = statusCounts[key];
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() => applyFilter(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[#445446] text-white shadow-sm"
                    : "text-[#5e6d5b] hover:text-[#445446] hover:bg-[#dfe2d7]/50"
                }`}
              >
                {t(`bookingsMgmt.filter.${key}`)}
                {count != null && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#445446]/10 text-[#445446]"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Date range — mobile: CenteredDateInput modal picker */}
        <div className="lg:hidden flex items-center gap-2 border border-[#c5ceba] rounded-xl px-3 py-2">
          <span className="text-xs text-[#5e6d5b] flex-shrink-0">{t("bookingsMgmt.from")}</span>
          <CenteredDateInput
            value={fromDate}
            onChange={handleFromChange}
            className="flex-1 text-sm py-0.5 bg-transparent"
          />
          <span className="text-xs text-[#5e6d5b] flex-shrink-0">{t("bookingsMgmt.to")}</span>
          <CenteredDateInput
            value={toDate}
            onChange={handleToChange}
            className="flex-1 text-sm py-0.5 bg-transparent"
          />
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(""); setToDate(""); setPage(1); }}
              className="text-xs text-[#5e6d5b] hover:text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors flex-shrink-0"
            >
              {t("bookingsMgmt.clear")}
            </button>
          )}
        </div>

        {/* Date range — desktop: native date inputs */}
        <div className="hidden lg:flex items-center gap-2 border border-[#c5ceba] rounded-xl px-3 py-2">
          <span className="text-xs text-[#5e6d5b]">{t("bookingsMgmt.from")}</span>
          <input type="date" value={fromDate} onChange={handleFromChange}
            className="text-sm outline-none bg-transparent text-[#1F2933]" />
          <span className="text-xs text-[#5e6d5b]">{t("bookingsMgmt.to")}</span>
          <input type="date" value={toDate} onChange={handleToChange}
            className="text-sm outline-none bg-transparent text-[#1F2933]" />
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(""); setToDate(""); setPage(1); }}
              className="text-xs text-[#5e6d5b] hover:text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors"
            >
              {t("bookingsMgmt.clear")}
            </button>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white rounded-2xl border-2 border-[#c5ceba] overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_160px_90px_120px] gap-3 px-4 py-3 bg-[#445446] border-b border-[#3a4a3b]">
          {[
            t("bookingsMgmt.col.id"),
            t("bookingsMgmt.col.parent"),
            t("bookingsMgmt.col.specialist"),
            t("bookingsMgmt.col.service"),
            t("bookingsMgmt.col.dateTime"),
            t("bookingsMgmt.col.amount"),
            t("bookingsMgmt.col.status"),
          ].map((h) => (
            <span key={h} className="text-xs font-semibold text-white uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-[#dfe2d7]/50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[#c5ceba]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#445446]">{t("bookingsMgmt.noBookings")}</p>
          </div>
        ) : (
          <div className={`divide-y divide-[#dfe2d7] ${isFetching ? "opacity-60 pointer-events-none" : ""}`}>
            {bookings.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className="w-full grid grid-cols-[60px_1fr_1fr_1fr_160px_90px_120px] gap-3 px-4 py-3 text-left hover:bg-[#dfe2d7]/50 transition-colors"
              >
                <span className="text-sm font-mono text-gray-400">#{b.id}</span>
                <span className="text-sm text-[#1F2933] truncate">{b.parent?.name || "—"}</span>
                <span className="text-sm text-[#1F2933] truncate">{b.expert?.user?.name || "—"}</span>
                <span className="text-sm text-gray-500 truncate">{b.service?.title || "—"}</span>
                <span className="text-sm text-gray-500 leading-tight">
                  {(() => {
                    const { primary, utc } = formatBookingTime(b.scheduled_at, b.expert?.timezone);
                    return (
                      <>
                        <span className="block">{primary}</span>
                        {utc && <span className="block text-xs text-gray-400">{utc}</span>}
                      </>
                    );
                  })()}
                </span>
                <span className="text-sm font-medium text-[#1F2933]">{formatCurrency(b.amount)}</span>
                <div className="flex flex-col items-start gap-1">
                  <BookingStatusBadge status={b.status} />
                  {b.is_disputed && <DisputedBadge />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border-2 border-[#c5ceba]">
            <div className="w-12 h-12 rounded-full bg-[#dfe2d7]/50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[#c5ceba]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#445446]">{t("bookingsMgmt.noBookings")}</p>
          </div>
        ) : (
          <div className={`space-y-2 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}>
            {bookings.map((b) => {
              const { primary, utc } = formatBookingTime(b.scheduled_at, b.expert?.timezone);
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#c5ceba] bg-white hover:bg-[#dfe2d7]/50 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1F2933] truncate">
                      #{b.id}{b.service?.title ? ` · ${b.service.title}` : ""}
                    </p>
                    {b.parent?.name && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        <span className="text-gray-400">{t("bookingsMgmt.col.parent")}:</span> {b.parent.name}
                      </p>
                    )}
                    {b.expert?.user?.name && (
                      <p className="text-xs text-gray-500 truncate">
                        <span className="text-gray-400">{t("bookingsMgmt.col.specialist")}:</span> {b.expert.user.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{primary}</p>
                    {utc && <p className="text-xs text-gray-400">{utc}</p>}
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <BookingStatusBadge status={b.status} />
                    {b.is_disputed && <DisputedBadge />}
                    {b.amount && (
                      <span className="text-sm font-medium text-[#1F2933]">{formatCurrency(b.amount)}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400">
            {t("bookingsMgmt.pagination.showing")}{" "}
            <span className="font-medium text-[#1F2933]">
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)}
            </span>{" "}
            {t("bookingsMgmt.pagination.of")}{" "}
            <span className="font-medium text-[#1F2933]">{total}</span>{" "}
            {t("bookingsMgmt.pagination.booking", { count: total })}
          </p>
          <div className="flex gap-1">
            <button
               onClick={() => setPage((p) => Math.max(1, p - 1))}
               disabled={page === 1 || isFetching}
              className="px-3 py-1.5 text-xs font-medium border border-[#c5ceba] rounded-lg text-[#5e6d5b] hover:bg-[#dfe2d7]/50 disabled:opacity-40 transition-colors"
            >
              {t("bookingsMgmt.pagination.previous")}
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3;
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
              {t("bookingsMgmt.pagination.next")}
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedId && (
        <BookingDetailModal
          bookingId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => {}}
        />
      )}
    </div>
  );
};

export default BookingsManagementSection;
