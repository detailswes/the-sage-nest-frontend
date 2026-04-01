import { useState, useEffect, useCallback, useRef } from "react";
import {
  listParents,
  listParentBookings,
  activateParent,
  deactivateParent,
  suspendParent,
  gdprDeleteParent,
} from "../../../api/adminApi";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_LIMIT = 10;

const STATUS_FILTERS = [
  { key: "all",         label: "All" },
  { key: "active",      label: "Active" },
  { key: "deactivated", label: "Deactivated" },
  { key: "suspended",   label: "Suspended" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

const formatCurrency = (amount) =>
  amount != null ? `€${parseFloat(amount).toFixed(2)}` : "—";

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
  if (status === "DEACTIVATED")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
        Deactivated
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
      Suspended
    </span>
  );
};

// ─── Booking status badge ─────────────────────────────────────────────────────
const BookingStatusBadge = ({ status }) => {
  const cfg = {
    CONFIRMED:       { cls: "bg-green-100 text-green-700",  label: "Confirmed" },
    COMPLETED:       { cls: "bg-blue-100 text-blue-700",    label: "Completed" },
    CANCELLED:       { cls: "bg-red-100 text-red-600",      label: "Cancelled" },
    REFUNDED:        { cls: "bg-gray-100 text-gray-600",    label: "Refunded" },
    PENDING_PAYMENT: { cls: "bg-amber-100 text-amber-700",  label: "Pending Payment" },
    PENDING:         { cls: "bg-amber-100 text-amber-700",  label: "Pending" },
  }[status] || { cls: "bg-gray-100 text-gray-500", label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
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

// ─── Parent Modal ─────────────────────────────────────────────────────────────
const ParentModal = ({ parent, onClose, onRefresh }) => {
  const [localParent, setLocalParent] = useState(parent);
  useEffect(() => { setLocalParent(parent); }, [parent]);

  const [bookings, setBookings]               = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError]     = useState("");
  const [showConfirm, setShowConfirm]     = useState(null); // 'activate' | 'deactivate' | 'suspend'

  const [showGdprDelete, setShowGdprDelete] = useState(false);
  const [gdprEmail, setGdprEmail]           = useState("");
  const [gdprLoading, setGdprLoading]       = useState(false);
  const [gdprError, setGdprError]           = useState("");

  useEffect(() => {
    if (!parent?.id) return;
    setBookingsLoading(true);
    listParentBookings(parent.id)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setBookingsLoading(false));
  }, [parent?.id]);

  const handleStatusChange = async (type) => {
    setShowConfirm(null);
    setActionLoading(type);
    setActionError("");
    try {
      if (type === "activate")   { await activateParent(localParent.id);   setLocalParent((p) => ({ ...p, parent_status: "ACTIVE" })); }
      if (type === "deactivate") { await deactivateParent(localParent.id); setLocalParent((p) => ({ ...p, parent_status: "DEACTIVATED" })); }
      if (type === "suspend")    { await suspendParent(localParent.id);    setLocalParent((p) => ({ ...p, parent_status: "SUSPENDED" })); }
      onRefresh();
    } catch (err) {
      setActionError(err?.response?.data?.error || "Action failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleGdprDelete = async () => {
    setGdprLoading(true);
    setGdprError("");
    try {
      await gdprDeleteParent(localParent.id, gdprEmail.trim());
      setShowGdprDelete(false);
      onClose();
      onRefresh();
    } catch (err) {
      setGdprError(err?.response?.data?.error || "Deletion failed. Please try again.");
    } finally {
      setGdprLoading(false);
    }
  };

  if (!localParent) return null;

  const status   = localParent.parent_status || "ACTIVE";
  const initials = getInitials(localParent.name);

  const CONFIRM_CFG = {
    activate: {
      title:  "Activate Account?",
      body:   `${localParent.name || "This parent"}'s account will be re-enabled and they will be able to log in again.`,
      btnCls: "bg-green-600 hover:bg-green-700",
      label:  "Activate",
    },
    deactivate: {
      title:  "Deactivate Account?",
      body:   `${localParent.name || "This parent"} will no longer be able to log in until their account is reactivated.`,
      btnCls: "bg-gray-700 hover:bg-gray-800",
      label:  "Deactivate",
    },
    suspend: {
      title:  "Suspend Account?",
      body:   `${localParent.name || "This parent"}'s account will be suspended and all active sessions will be invalidated immediately.`,
      btnCls: "bg-orange-600 hover:bg-orange-700",
      label:  "Suspend",
    },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E7E4] flex-shrink-0">
          <h2 className="text-base font-semibold text-[#1F2933]">Parent Account</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-[#1F2933] hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Identity */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-[#445446]/10 text-[#445446] flex items-center justify-center text-lg font-bold flex-shrink-0 select-none">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-[#1F2933]">{localParent.name || "—"}</h3>
                <StatusBadge status={status} />
                {!localParent.is_verified && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    Unverified
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{localParent.email}</p>
              {localParent.phone && (
                <p className="text-sm text-gray-400 mt-0.5">{localParent.phone}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Registered</p>
              <p className="text-sm font-medium text-[#1F2933]">{formatDate(localParent.created_at)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Total Bookings</p>
              <p className="text-sm font-medium text-[#1F2933]">
                {localParent._count?.bookings_as_parent ?? bookings.length}
              </p>
            </div>
          </div>

          {/* Action error */}
          {actionError && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {actionError}
            </div>
          )}

          {/* Account status controls */}
          <div className="border-t border-[#E4E7E4] pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account Status</p>
            <div className="flex flex-wrap gap-2">
              {status !== "ACTIVE" && (
                <button
                  onClick={() => setShowConfirm("activate")}
                  disabled={!!actionLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {actionLoading === "activate" ? "Activating…" : "Activate Account"}
                </button>
              )}
              {status !== "DEACTIVATED" && (
                <button
                  onClick={() => setShowConfirm("deactivate")}
                  disabled={!!actionLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#E4E7E4] text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  {actionLoading === "deactivate" ? "Deactivating…" : "Deactivate Account"}
                </button>
              )}
              {status !== "SUSPENDED" && (
                <button
                  onClick={() => setShowConfirm("suspend")}
                  disabled={!!actionLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  {actionLoading === "suspend" ? "Suspending…" : "Suspend Account"}
                </button>
              )}
            </div>
          </div>

          {/* Booking history */}
          <div className="border-t border-[#E4E7E4] pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Booking History</p>
            {bookingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
              </div>
            ) : bookings.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No bookings found.</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[#1F2933] truncate">
                        {b.service?.title || "Session"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {b.expert?.user?.name ? `with ${b.expert.user.name} · ` : ""}
                        {formatDateTime(b.scheduled_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className="text-xs font-medium text-gray-600">
                        {formatCurrency(b.amount)}
                      </span>
                      <BookingStatusBadge status={b.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GDPR Danger Zone */}
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

      {/* Status confirm modal */}
      {showConfirm && (() => {
        const cfg = CONFIRM_CFG[showConfirm] || {};
        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(null); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-base font-semibold text-[#1F2933] text-center mb-2">{cfg.title}</h3>
              <p className="text-sm text-gray-500 text-center mb-6">{cfg.body}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStatusChange(showConfirm)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-white text-sm font-medium transition-colors ${cfg.btnCls}`}
                >
                  {cfg.label}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* GDPR Delete modal */}
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
            <h3 className="text-base font-semibold text-red-700 text-center mb-2">Permanent Account Erasure</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-xs text-red-700 space-y-1">
              <p className="font-semibold">This action is irreversible. It will:</p>
              <ul className="list-disc list-inside space-y-0.5 text-red-600">
                <li>Cancel all future bookings and issue Stripe refunds</li>
                <li>Wipe all personal information from the database</li>
                <li>Invalidate all active sessions immediately</li>
                <li>Anonymise the account record (cannot be recovered)</li>
              </ul>
              <p className="text-red-500 mt-1">
                Booking records are retained in anonymised form for accounting compliance.
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Type the parent{"'"}s email address to confirm:{" "}
              <span className="font-medium text-[#1F2933]">{localParent.email}</span>
            </p>
            <input
              type="email"
              value={gdprEmail}
              onChange={(e) => setGdprEmail(e.target.value)}
              placeholder={localParent.email || "parent@email.com"}
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
                disabled={gdprLoading || gdprEmail.trim().toLowerCase() !== localParent.email?.toLowerCase()}
                className="flex-1 py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gdprLoading ? "Erasing…" : "Erase Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const ParentManagementSection = () => {
  const [parents, setParents]           = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching]         = useState(false);
  const [error, setError]               = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage]                 = useState(1);
  const [pagination, setPagination]     = useState({ total: 0, totalPages: 1 });
  const [counts, setCounts]             = useState({ all: 0, ACTIVE: 0, DEACTIVATED: 0, SUSPENDED: 0 });
  const [selectedParent, setSelectedParent] = useState(null);

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
              {count > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold ${
                    isActive ? "bg-[#445446] text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {count}
                </span>
              )}
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
                      onClick={() => setSelectedParent(p)}
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
                          onClick={(e) => { e.stopPropagation(); setSelectedParent(p); }}
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

      {selectedParent && (
        <ParentModal
          parent={selectedParent}
          onClose={() => setSelectedParent(null)}
          onRefresh={fetchParents}
        />
      )}
    </>
  );
};

export default ParentManagementSection;
