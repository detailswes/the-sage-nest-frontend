import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getParentDetail,
  listParentBookings,
  activateParent,
  deactivateParent,
  suspendParent,
  gdprDeleteParent,
  getAuditLog,
} from "../../../api/adminApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";

const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

const formatCurrency = (amount) =>
  amount != null ? `£${parseFloat(amount).toFixed(2)}` : "—";

const getInitials = (name) =>
  name ? name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?";

const ACTION_LABELS = {
  ACTIVATE_PARENT:   "Account activated",
  DEACTIVATE_PARENT: "Account deactivated",
  SUSPEND_PARENT:    "Account suspended",
  GDPR_DELETE_PARENT: "Account deleted (GDPR)",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  if (!status || status === "ACTIVE")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active
      </span>
    );
  if (status === "DEACTIVATED")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Deactivated
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Suspended
    </span>
  );
};

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

// ─── Main component ───────────────────────────────────────────────────────────

const AdminParentDetailSection = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [parent, setParent]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);

  const [bookings, setBookings]             = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const [auditLog, setAuditLog]   = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'bookings' | 'activity'

  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError]     = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [showConfirm, setShowConfirm]     = useState(null);

  const [showGdprDelete, setShowGdprDelete] = useState(false);
  const [gdprEmail, setGdprEmail]           = useState("");
  const [gdprLoading, setGdprLoading]       = useState(false);
  const [gdprError, setGdprError]           = useState("");

  // Load parent detail
  const loadParent = useCallback(async () => {
    try {
      const data = await getParentDetail(id);
      setParent(data);
    } catch (err) {
      if (err?.response?.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load bookings
  useEffect(() => {
    listParentBookings(id)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setBookingsLoading(false));
  }, [id]);

  // Load audit log
  useEffect(() => {
    getAuditLog(id, "PARENT", 1)
      .then((res) => setAuditLog(res.data || []))
      .catch(() => setAuditLog([]))
      .finally(() => setAuditLoading(false));
  }, [id]);

  useEffect(() => { loadParent(); }, [loadParent]);

  // ── Status actions ────────────────────────────────────────────────────────

  const CONFIRM_CFG = {
    activate: {
      title:  "Activate Account?",
      body:   `${parent?.name || "This parent"}'s account will be re-enabled and they will be able to log in again.`,
      btnCls: "bg-green-600 hover:bg-green-700",
      label:  "Activate",
    },
    deactivate: {
      title:  "Deactivate Account?",
      body:   `${parent?.name || "This parent"} will no longer be able to log in until their account is reactivated.`,
      btnCls: "bg-gray-700 hover:bg-gray-800",
      label:  "Deactivate",
    },
    suspend: {
      title:  "Suspend Account?",
      body:   `${parent?.name || "This parent"}'s account will be suspended and all active sessions will be invalidated immediately.`,
      btnCls: "bg-orange-600 hover:bg-orange-700",
      label:  "Suspend",
    },
  };

  const handleStatusChange = async (type) => {
    setShowConfirm(null);
    setActionLoading(type);
    setActionError("");
    setActionSuccess("");
    try {
      if (type === "activate")   await activateParent(id);
      if (type === "deactivate") await deactivateParent(id);
      if (type === "suspend")    await suspendParent(id);
      setActionSuccess("Account status updated successfully.");
      await loadParent();
      // Refresh audit log
      getAuditLog(id, "PARENT", 1).then((res) => setAuditLog(res.data || [])).catch(() => {});
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
      await gdprDeleteParent(id, gdprEmail.trim());
      navigate("/dashboard/admin/parents");
    } catch (err) {
      setGdprError(err?.response?.data?.error || "Deletion failed. Please try again.");
    } finally {
      setGdprLoading(false);
    }
  };

  // ── Render states ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound || !parent) {
    return (
      <div className="text-center py-24">
        <p className="text-lg font-semibold text-[#1F2933] mb-2">Parent not found</p>
        <Link to="/dashboard/admin/parents" className="text-sm text-[#445446] hover:underline">
          ← Back to Parent Management
        </Link>
      </div>
    );
  }

  const status   = parent.parent_status || "ACTIVE";
  const initials = getInitials(parent.name);

  const TABS = [
    { key: "overview",  label: "Overview" },
    { key: "bookings",  label: `Bookings (${parent._count?.bookings_as_parent ?? bookings.length})` },
    { key: "activity",  label: "Activity" },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/dashboard/admin/parents" className="hover:text-[#445446] transition-colors">
          Parent Management
        </Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-[#1F2933] font-medium truncate">{parent.name || "Parent"}</span>
      </div>

      <div className="flex gap-6 items-start">

        {/* ── Left: main content ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Identity card */}
          <div className="bg-white rounded-2xl border border-[#E4E7E4] shadow-sm px-6 py-5 mb-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-[#445446]/10 text-[#445446] flex items-center justify-center text-xl font-bold flex-shrink-0 select-none">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-[#1F2933]">{parent.name || "—"}</h1>
                  <StatusBadge status={status} />
                  {!parent.is_verified && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      Unverified email
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{parent.email}</p>
                {parent.phone && (
                  <p className="text-sm text-gray-400 mt-0.5">{parent.phone}</p>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-400">Registered</p>
                    <p className="text-sm font-medium text-[#1F2933]">{formatDate(parent.created_at)}</p>
                  </div>
                  <div className="w-px h-8 bg-[#E4E7E4]" />
                  <div>
                    <p className="text-xs text-gray-400">Total Bookings</p>
                    <p className="text-sm font-medium text-[#1F2933]">
                      {parent._count?.bookings_as_parent ?? bookings.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback banner */}
          {(actionError || actionSuccess) && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${actionError ? "bg-red-50 border border-red-200 text-red-600" : "bg-green-50 border border-green-200 text-green-700"}`}>
              {actionError || actionSuccess}
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-0 mb-5 border-b border-[#E4E7E4]">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === key
                    ? "text-[#445446] border-[#445446]"
                    : "text-gray-500 border-transparent hover:text-[#1F2933] hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Overview tab ─────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="bg-white rounded-2xl border border-[#E4E7E4] shadow-sm px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email</span>
                      <span className="font-medium text-[#1F2933]">{parent.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-medium text-[#1F2933]">{parent.phone || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email verified</span>
                      <span className={`font-medium ${parent.is_verified ? "text-green-700" : "text-amber-600"}`}>
                        {parent.is_verified ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <StatusBadge status={status} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Registered</span>
                      <span className="font-medium text-[#1F2933]">{formatDate(parent.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total bookings</span>
                      <span className="font-medium text-[#1F2933]">
                        {parent._count?.bookings_as_parent ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Bookings tab ─────────────────────────────────────────── */}
          {activeTab === "bookings" && (
            <div className="bg-white rounded-2xl border border-[#E4E7E4] shadow-sm overflow-hidden">
              {bookingsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-7 h-7 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-400">No bookings found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/60 border-b border-[#E4E7E4]">
                      {["Service", "Specialist", "Date & Time", "Amount", "Status"].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E7E4]">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-[#1F2933] truncate max-w-[160px]">
                            {b.service?.title || "—"}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">#{b.id}</p>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">
                          {b.expert?.user?.name || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                          {formatDateTime(b.scheduled_at)}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-[#1F2933]">
                          {formatCurrency(b.amount)}
                        </td>
                        <td className="px-5 py-3.5">
                          <BookingStatusBadge status={b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Activity tab ─────────────────────────────────────────── */}
          {activeTab === "activity" && (
            <div className="bg-white rounded-2xl border border-[#E4E7E4] shadow-sm px-6 py-5">
              {auditLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-7 h-7 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                </div>
              ) : auditLog.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No activity recorded yet.</p>
              ) : (
                <ol className="relative border-l border-[#E4E7E4] ml-2 space-y-4">
                  {auditLog.map((entry) => (
                    <li key={entry.id} className="ml-4">
                      <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-[#445446]/20 border-2 border-[#445446]" />
                      <p className="text-xs font-semibold text-[#1F2933]">
                        {ACTION_LABELS[entry.action] || entry.action}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {entry.admin_name} · {formatDate(entry.created_at)}
                      </p>
                      {entry.note && (
                        <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-3 py-2">
                          {entry.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

        </div>

        {/* ── Right: sidebar actions ──────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* Account status */}
          <div className="bg-white rounded-2xl border border-[#E4E7E4] shadow-sm px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account Status</p>
            <div className="flex flex-col gap-2">
              {status !== "ACTIVE" && (
                <button
                  onClick={() => setShowConfirm("activate")}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50"
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
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-[#E4E7E4] text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  {actionLoading === "suspend" ? "Suspending…" : "Suspend Account"}
                </button>
              )}
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-2xl border-2 border-dashed border-red-200 shadow-sm px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Danger Zone</p>
            <p className="text-xs text-gray-400 mb-3">
              Permanently erase all personal data. This cannot be undone.
            </p>
            <button
              onClick={() => { setGdprEmail(""); setShowGdprDelete(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors w-full"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Delete Account (GDPR)
            </button>
          </div>

        </div>
      </div>

      {/* ── Status confirm modal ─────────────────────────────────────────────── */}
      {showConfirm && (() => {
        const cfg = CONFIRM_CFG[showConfirm] || {};
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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

      {/* ── GDPR delete modal ─────────────────────────────────────────────────── */}
      {showGdprDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Type the parent's email address to confirm:{" "}
              <span className="font-medium text-[#1F2933]">{parent.email}</span>
            </p>
            <input
              type="email"
              value={gdprEmail}
              onChange={(e) => setGdprEmail(e.target.value)}
              placeholder={parent.email}
              className="w-full px-3 py-2.5 text-sm border border-[#E4E7E4] rounded-lg text-[#1F2933] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition mb-3"
            />
            {gdprError && <p className="text-xs text-red-600 mb-3 px-1">{gdprError}</p>}
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
                disabled={gdprLoading || gdprEmail.trim().toLowerCase() !== parent.email?.toLowerCase()}
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

export default AdminParentDetailSection;
