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

  const bookings   = data?.bookings ?? [];
  const total      = data?.total    ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

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
        <h1 className="text-2xl font-bold text-[#1F2933]">{t("bookingsMgmt.pageTitle")}</h1>
        <p className="text-sm text-gray-400 mt-1">{t("bookingsMgmt.pageSubtitle")}</p>
      </div>

      {/* Search + date range */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex flex-1 min-w-[260px] items-center gap-2 bg-white border border-[#E4E7E4] rounded-xl px-3 py-2 shadow-sm">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder={t("bookingsMgmt.searchPlaceholder")}
            className="flex-1 text-sm bg-transparent outline-none placeholder-gray-300 text-[#1F2933]"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(""); setPage(1); }}
              className="text-gray-300 hover:text-gray-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 bg-white border border-[#E4E7E4] rounded-xl px-3 py-2 shadow-sm">
          <span className="text-xs text-gray-400">{t("bookingsMgmt.from")}</span>
          <input type="date" value={fromDate} onChange={handleFromChange}
            className="text-sm outline-none bg-transparent text-[#1F2933]" />
          <span className="text-xs text-gray-400">{t("bookingsMgmt.to")}</span>
          <input type="date" value={toDate} onChange={handleToChange}
            className="text-sm outline-none bg-transparent text-[#1F2933]" />
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(""); setToDate(""); setPage(1); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {t("bookingsMgmt.clear")}
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap mb-4">
        {FILTER_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => applyFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === key
                ? "bg-[#445446] text-white"
                : "bg-white border border-[#E4E7E4] text-gray-500 hover:text-[#1F2933] hover:bg-gray-50"
            }`}
          >
            {t(`bookingsMgmt.filter.${key}`)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_160px_90px_120px] gap-3 px-4 py-3 bg-[#F5F7F5] border-b border-[#E4E7E4]">
          {[
            t("bookingsMgmt.col.id"),
            t("bookingsMgmt.col.parent"),
            t("bookingsMgmt.col.specialist"),
            t("bookingsMgmt.col.service"),
            t("bookingsMgmt.col.dateTime"),
            t("bookingsMgmt.col.amount"),
            t("bookingsMgmt.col.status"),
          ].map((h) => (
            <span key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">{t("bookingsMgmt.noBookings")}</p>
          </div>
        ) : (
          <div className={`divide-y divide-[#E4E7E4] ${isFetching ? "opacity-60 pointer-events-none" : ""}`}>
            {bookings.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className="w-full grid grid-cols-[60px_1fr_1fr_1fr_160px_90px_120px] gap-3 px-4 py-3 text-left hover:bg-[#F5F7F5] transition-colors"
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
              className="px-3 py-1.5 text-xs font-medium border border-[#E4E7E4] rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
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
                      : "border border-[#E4E7E4] text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isFetching}
              className="px-3 py-1.5 text-xs font-medium border border-[#E4E7E4] rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
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
