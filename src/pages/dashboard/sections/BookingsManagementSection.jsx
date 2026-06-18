import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { listAllBookings } from "../../../api/adminApi";
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

// ─── Main section ─────────────────────────────────────────────────────────────

const BookingsManagementSection = () => {
  const location = useLocation();
  const { t } = useTranslation("adminDashboard");

  const [bookings, setBookings]         = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching]         = useState(false);

  const [search, setSearch]             = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [fromDate, setFromDate]         = useState("");
  const [toDate, setToDate]             = useState("");

  const [selectedId, setSelectedId]     = useState(null);
  const debounceRef                     = useRef(null);

  const LIMIT = 25;

  const load = useCallback(async (opts = {}) => {
    const isInitial = opts.initial;
    if (isInitial) setInitialLoading(true); else setFetching(true);
    try {
      const resolvedSearch = opts.search !== undefined ? opts.search : search;
      const resolvedFilter = opts.filter ?? activeFilter;
      const resolvedPage   = opts.page   ?? page;
      const resolvedFrom   = opts.from   !== undefined ? opts.from  : fromDate;
      const resolvedTo     = opts.to     !== undefined ? opts.to    : toDate;
      const params = {
        page:   resolvedPage,
        limit:  LIMIT,
        search: resolvedSearch,
        ...(resolvedFilter === "DISPUTED"
          ? { disputed: "true", status: "ALL" }
          : { status: resolvedFilter }),
        ...(resolvedFrom ? { from: resolvedFrom } : {}),
        ...(resolvedTo   ? { to:   resolvedTo   } : {}),
      };
      const data = await listAllBookings(params);
      setBookings(data.bookings);
      setTotal(data.total);
    } catch {
      // silently keep existing list on error
    } finally {
      if (isInitial) setInitialLoading(false); else setFetching(false);
    }
  }, [page, search, activeFilter, fromDate, toDate]);

  // On mount: read ?search= from URL (e.g. coming from expert listing bookings count link)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("search") || "";
    setSearch(q);
    load({ initial: true, search: q });
  }, []); // eslint-disable-line

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      load({ search: val, page: 1, filter: activeFilter, from: fromDate, to: toDate });
    }, 400);
  };

  const handleFromChange = (e) => {
    const val = e.target.value;
    setFromDate(val);
    setPage(1);
    load({ page: 1, search, filter: activeFilter, from: val, to: toDate });
  };

  const handleToChange = (e) => {
    const val = e.target.value;
    setToDate(val);
    setPage(1);
    load({ page: 1, search, filter: activeFilter, from: fromDate, to: val });
  };

  const applyFilter = (key) => {
    setActiveFilter(key);
    setPage(1);
    load({ filter: key, page: 1, search, from: fromDate, to: toDate, initial: !bookings.length });
  };

  const goToPage = (p) => {
    setPage(p);
    load({ page: p, search, filter: activeFilter, from: fromDate, to: toDate });
  };

  const totalPages = Math.ceil(total / LIMIT);

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
            value={search}
            onChange={handleSearchChange}
            placeholder={t("bookingsMgmt.searchPlaceholder")}
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-[#c5ceba] rounded-xl bg-white text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                if (debounceRef.current) clearTimeout(debounceRef.current);
                setPage(1);
                load({ search: "", page: 1, filter: activeFilter, from: fromDate, to: toDate });
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status pill tabs + date range */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center border border-[#c5ceba] rounded-xl p-1 gap-0.5">
            {FILTER_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => applyFilter(key)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  activeFilter === key
                    ? "bg-[#445446] text-white shadow-sm"
                    : "text-[#5e6d5b] hover:text-[#445446] hover:bg-[#dfe2d7]/50"
                }`}
              >
                {t(`bookingsMgmt.filter.${key}`)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border border-[#c5ceba] rounded-xl px-3 py-2">
            <span className="text-xs text-[#5e6d5b]">{t("bookingsMgmt.from")}</span>
            <input type="date" value={fromDate} onChange={handleFromChange}
              className="text-sm outline-none bg-transparent text-[#1F2933]" />
            <span className="text-xs text-[#5e6d5b]">{t("bookingsMgmt.to")}</span>
            <input type="date" value={toDate} onChange={handleToChange}
              className="text-sm outline-none bg-transparent text-[#1F2933]" />
            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate(""); setToDate(""); setPage(1);
                  load({ page: 1, search, filter: activeFilter, from: "", to: "" });
                }}
                className="text-xs text-[#5e6d5b] hover:text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors"
              >
                {t("bookingsMgmt.clear")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border-2 border-[#c5ceba] overflow-hidden">
        {/* Table header */}
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

        {initialLoading ? (
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
          <div className={`divide-y divide-[#dfe2d7] ${fetching ? "opacity-60 pointer-events-none" : ""}`}>
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
              onClick={() => goToPage(page - 1)}
              disabled={page === 1 || fetching}
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
                  onClick={() => goToPage(p)}
                  disabled={fetching}
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
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages || fetching}
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
          onUpdated={() => load({ page, search, filter: activeFilter })}
        />
      )}
    </div>
  );
};

export default BookingsManagementSection;
