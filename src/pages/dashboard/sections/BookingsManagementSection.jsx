import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { listAllBookings } from "../../../api/adminApi";
import BookingDetailModal, {
  BookingStatusBadge,
  DisputedBadge,
  formatCurrency,
} from "../../../components/admin/BookingDetailModal";
import { formatBookingTime } from "../../../utils/formatBookingTime";

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTERS = [
  { key: "ALL",             label: "All" },
  { key: "UPCOMING",        label: "Upcoming" },
  { key: "CONFIRMED",       label: "Confirmed" },
  { key: "COMPLETED",       label: "Completed" },
  { key: "PENDING_PAYMENT", label: "Pending Payment" },
  { key: "CANCELLED",       label: "Cancelled" },
  { key: "REFUNDED",        label: "Refunded" },
  { key: "DISPUTED",        label: "Disputed" },
];

// ─── Main section ─────────────────────────────────────────────────────────────

const BookingsManagementSection = () => {
  const location = useLocation();

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
        <h1 className="text-2xl font-bold text-[#1F2933]">Booking Management</h1>
        <p className="text-sm text-gray-400 mt-1">
          Platform-wide booking list — search, filter and take action on any booking.
        </p>
      </div>

      {/* Search + date range */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex flex-1 min-w-[260px] items-center gap-2 bg-white border border-[#E4E7E4] rounded-xl px-3 py-2 shadow-sm">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by booking ID, parent or specialist name…"
            className="flex-1 text-sm bg-transparent outline-none placeholder-gray-300 text-[#1F2933]"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                if (debounceRef.current) clearTimeout(debounceRef.current);
                setPage(1);
                load({ search: "", page: 1, filter: activeFilter, from: fromDate, to: toDate });
              }}
              className="text-gray-300 hover:text-gray-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 bg-white border border-[#E4E7E4] rounded-xl px-3 py-2 shadow-sm">
          <span className="text-xs text-gray-400">From</span>
          <input type="date" value={fromDate} onChange={handleFromChange}
            className="text-sm outline-none bg-transparent text-[#1F2933]" />
          <span className="text-xs text-gray-400">To</span>
          <input type="date" value={toDate} onChange={handleToChange}
            className="text-sm outline-none bg-transparent text-[#1F2933]" />
          {(fromDate || toDate) && (
            <button
              onClick={() => {
                setFromDate(""); setToDate(""); setPage(1);
                load({ page: 1, search, filter: activeFilter, from: "", to: "" });
              }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap mb-4">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => applyFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === key
                ? "bg-[#445446] text-white"
                : "bg-white border border-[#E4E7E4] text-gray-500 hover:text-[#1F2933] hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_160px_90px_90px] gap-3 px-4 py-3 bg-[#F5F7F5] border-b border-[#E4E7E4]">
          {["ID", "Parent", "Specialist", "Service", "Date & Time", "Amount", "Status"].map((h) => (
            <span key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {initialLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">No bookings found.</p>
          </div>
        ) : (
          <div className={`divide-y divide-[#E4E7E4] ${fetching ? "opacity-60 pointer-events-none" : ""}`}>
            {bookings.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className="w-full grid grid-cols-[60px_1fr_1fr_1fr_160px_90px_90px] gap-3 px-4 py-3 text-left hover:bg-[#F5F7F5] transition-colors"
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
                <div className="flex flex-wrap gap-1">
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
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} bookings
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1 || fetching}
              className="px-3 py-1.5 text-xs font-medium border border-[#E4E7E4] rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Previous
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
                      : "border border-[#E4E7E4] text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages || fetching}
              className="px-3 py-1.5 text-xs font-medium border border-[#E4E7E4] rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Next
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
