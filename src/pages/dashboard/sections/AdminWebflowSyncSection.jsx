import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  useGetWebflowSyncFailuresQuery,
  useRetryWebflowSyncFailureMutation,
  useRetryAllWebflowSyncFailuresMutation,
  useSyncAllWebflowMutation,
} from "../../../api/adminApi";

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

const StatusBadge = ({ status }) => {
  const { t } = useTranslation("adminDashboard");
  return status === "RESOLVED" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      {t("webflowSync.status.resolved")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
      {t("webflowSync.status.pendingRetry")}
    </span>
  );
};

const FILTER_KEYS = [
  { key: "PENDING_RETRY", tKey: "webflowSync.filter.pendingRetry" },
  { key: "all",           tKey: "webflowSync.filter.all" },
];

// Full-detail view for one failure row — the table only has room for a
// truncated snippet of last_error, which isn't enough to actually diagnose a
// Webflow validation error (those routinely run a few hundred characters,
// e.g. "... — [{"param":"short-description","description":"Expected value
// to be a single line: ..."}]"). This shows the whole thing, plus the exact
// payload that was sent, so admins don't need to go spelunking in Render
// logs to understand why a sync failed.
const WebflowSyncFailureDetailModal = ({ failure, onClose }) => {
  const { t } = useTranslation("adminDashboard");

  const handleCopy = () => {
    navigator.clipboard?.writeText(failure.last_error || "")
      .then(() => toast.success(t("webflowSync.detail.errorCopied")))
      .catch(() => {});
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl flex items-center justify-between px-6 py-4 border-b border-[#E4E7E4]">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-[#1F2933] capitalize">
              {t("webflowSync.detail.title")} — {failure.entity_type} #{failure.entity_id}
            </h2>
            <StatusBadge status={failure.status} />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="divide-y divide-[#E4E7E4]">
          {/* Meta */}
          <div className="px-6 py-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t("webflowSync.detail.attemptsLabel")}</p>
              <p className="text-sm font-medium text-[#1F2933]">{failure.attempts}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t("webflowSync.detail.statusLabel")}</p>
              <p className="text-sm font-medium text-[#1F2933]">{t(`webflowSync.status.${failure.status === "RESOLVED" ? "resolved" : "pendingRetry"}`)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t("webflowSync.detail.lastAttemptLabel")}</p>
              <p className="text-sm font-medium text-[#1F2933]">{formatDate(failure.updated_at)}</p>
            </div>
          </div>

          {/* Full error */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("webflowSync.detail.errorHeading")}</p>
              <button
                onClick={handleCopy}
                className="text-xs font-medium text-[#5e6d5b] hover:text-[#445446] transition-colors"
              >
                {t("webflowSync.detail.copyBtn")}
              </button>
            </div>
            <pre className="text-xs text-red-700 font-mono whitespace-pre-wrap break-words bg-red-50 border border-red-100 rounded-lg p-3 max-h-60 overflow-y-auto">
              {failure.last_error || "—"}
            </pre>
          </div>

          {/* Payload */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("webflowSync.detail.payloadHeading")}</p>
            {failure.payload && Object.keys(failure.payload).length > 0 ? (
              <pre className="text-xs text-[#1F2933] font-mono whitespace-pre-wrap break-words bg-[#F5F7F5] border border-[#E4E7E4] rounded-lg p-3 max-h-60 overflow-y-auto">
                {JSON.stringify(failure.payload, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-gray-400">{t("webflowSync.detail.noPayload")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminWebflowSyncSection = () => {
  const { t } = useTranslation("adminDashboard");

  const [status, setStatus] = useState("PENDING_RETRY");
  const [page,   setPage]   = useState(1);
  const [retryingId, setRetryingId] = useState(null);
  const [selectedFailure, setSelectedFailure] = useState(null);
 
  const queryParams = { page, status };
  const { data: result, isLoading, isFetching } = useGetWebflowSyncFailuresQuery(queryParams);
  const [retryOne]  = useRetryWebflowSyncFailureMutation();
  const [retryAll, { isLoading: retryingAll }] = useRetryAllWebflowSyncFailuresMutation();
  const [syncAll, { isLoading: syncingAll }]   = useSyncAllWebflowMutation();

  const rows       = result?.failures ?? [];
  const total      = result?.total ?? 0;
  const pages      = result?.pages ?? 1;
  const currentPage = result?.page ?? page;
  const loading    = isLoading || isFetching;

  const handleFilter = (f) => { setStatus(f); setPage(1); };

  const handleRetryOne = async (id) => {
    setRetryingId(id);
    try {
      const res = await retryOne(id).unwrap();
      if (res.synced) {
        toast.success(t("webflowSync.retry.success"));
      } else {
        toast.error(t("webflowSync.retry.stillFailing"));
      }
    } catch (e) {
      toast.error(e?.data?.error || t("webflowSync.retry.error"));
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryAll = async () => {
    try {
      const res = await retryAll().unwrap();
      if (res.failed > 0) {
        toast.error(t("webflowSync.retryAll.partial", { synced: res.synced, failed: res.failed }));
      } else {
        toast.success(t("webflowSync.retryAll.success", { synced: res.synced }));
      }
    } catch (e) {
      toast.error(e?.data?.error || t("webflowSync.retry.error"));
    }
  };

  const handleSyncAll = async () => {
    try {
      const res = await syncAll().unwrap();
      if (res.failed > 0) {
        toast.error(t("webflowSync.syncAll.partial", { synced: res.synced, failed: res.failed }));
      } else {
        toast.success(t("webflowSync.syncAll.success", { synced: res.synced }));
      }
    } catch (e) {
      toast.error(e?.data?.error || t("webflowSync.retry.error"));
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#445446]">{t("webflowSync.pageTitle")}</h2>
          <p className="text-sm text-[#5e6d5b] font-medium mt-0.5">{t("webflowSync.pageSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            title={t("webflowSync.syncAll.hint")}
            className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg border border-[#c5ceba] text-[#5e6d5b] hover:border-[#445446] hover:text-[#445446] hover:bg-[#dfe2d7]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
          >
            {syncingAll ? t("webflowSync.syncAll.inProgress") : t("webflowSync.syncAll.button")}
          </button>
          <button
            onClick={handleRetryAll}
            disabled={retryingAll || rows.length === 0}
            title={t("webflowSync.retryAll.hint")}
            className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg bg-[#445446] text-white hover:bg-[#374437] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {retryingAll ? t("webflowSync.retryAll.inProgress") : t("webflowSync.retryAll.button")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 bg-white rounded-2xl border-2 border-[#c5ceba] p-4">
        <div className="inline-flex items-center border border-[#c5ceba] rounded-xl p-1 gap-0.5">
          {FILTER_KEYS.map(({ key, tKey }) => (
            <button
              key={key}
              onClick={() => handleFilter(key)}
              className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                status === key
                  ? "bg-[#445446] text-white shadow-sm"
                  : "text-[#5e6d5b] hover:text-[#445446] hover:bg-[#dfe2d7]/50"
              }`}
            >
              {t(tKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Shared loading / empty states */}
      {loading ? (
        <div className="bg-white rounded-2xl border-2 border-[#c5ceba] flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-[#c5ceba] flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[#dfe2d7]/50 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-[#c5ceba]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#445446]">{t("webflowSync.empty")}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white rounded-2xl border-2 border-[#c5ceba] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#445446] border-b border-[#3a4a3b]">
                  {[
                    t("webflowSync.col.entity"),
                    t("webflowSync.col.lastError"),
                    t("webflowSync.col.attempts"),
                    t("webflowSync.col.status"),
                    t("webflowSync.col.lastAttempt"),
                    t("webflowSync.col.actions"),
                  ].map((h, i) => (
                    <th key={i} className={`text-xs font-semibold text-white uppercase tracking-wider px-5 py-3 ${i === 5 ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dfe2d7]">
                {rows.map((f) => (
                  <tr key={f.id} className="hover:bg-[#dfe2d7]/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[#1F2933] capitalize">{f.entity_type} #{f.entity_id}</p>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <button
                        onClick={() => setSelectedFailure(f)}
                        className="text-xs text-gray-500 font-mono truncate block w-full text-left hover:text-[#445446] hover:underline transition-colors"
                        title={t("webflowSync.viewDetails")}
                      >
                        {f.last_error}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-[#1F2933]">{f.attempts}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={f.status} /></td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">{formatDate(f.updated_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedFailure(f)}
                          className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg border border-[#c5ceba] text-[#5e6d5b] hover:border-[#445446] hover:text-[#445446] hover:bg-[#dfe2d7]/50 transition-all duration-150 whitespace-nowrap"
                        >
                          {t("webflowSync.viewDetails")}
                        </button>
                        <button
                          onClick={() => handleRetryOne(f.id)}
                          disabled={retryingId === f.id}
                          className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg border border-[#c5ceba] text-[#5e6d5b] hover:border-[#445446] hover:text-[#445446] hover:bg-[#dfe2d7]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 whitespace-nowrap"
                        >
                          {retryingId === f.id ? t("webflowSync.retry.inProgress") : t("webflowSync.retry.button")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {rows.map((f) => (
              <div key={f.id} className="bg-white rounded-xl border border-[#c5ceba] px-4 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-[#1F2933] capitalize">{f.entity_type} #{f.entity_id}</p>
                  <StatusBadge status={f.status} />
                </div>
                <button
                  onClick={() => setSelectedFailure(f)}
                  className="text-xs text-gray-500 font-mono break-words text-left hover:text-[#445446] hover:underline transition-colors"
                >
                  {f.last_error}
                </button>
                <div className="flex items-center justify-between border-t border-[#dfe2d7] pt-3 text-xs text-gray-400">
                  <span>{t("webflowSync.col.attempts")}: {f.attempts}</span>
                  <span>{formatDate(f.updated_at)}</span>
                </div>
                <button
                  onClick={() => setSelectedFailure(f)}
                  className="w-full inline-flex items-center justify-center text-xs font-medium px-3 py-2 rounded-lg border border-[#c5ceba] text-[#5e6d5b] hover:border-[#445446] hover:text-[#445446] hover:bg-[#dfe2d7]/50 transition-all duration-150"
                >
                  {t("webflowSync.viewDetails")}
                </button>
                <button
                  onClick={() => handleRetryOne(f.id)}
                  disabled={retryingId === f.id}
                  className="w-full inline-flex items-center justify-center text-xs font-medium px-3 py-2 rounded-lg border border-[#c5ceba] text-[#5e6d5b] hover:border-[#445446] hover:text-[#445446] hover:bg-[#dfe2d7]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                >
                  {retryingId === f.id ? t("webflowSync.retry.inProgress") : t("webflowSync.retry.button")}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            {t("webflowSync.pagination.page", { page: currentPage, pages })}{" "}·{" "}
            {total} {t("webflowSync.pagination.result", { count: total })}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-[#c5ceba] text-xs font-medium hover:bg-[#dfe2d7]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("webflowSync.pagination.previous")}
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={currentPage === pages}
              className="px-3 py-1.5 rounded-lg border border-[#c5ceba] text-xs font-medium hover:bg-[#dfe2d7]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("webflowSync.pagination.next")}
            </button>
          </div>
        </div>
      )}

      {selectedFailure && (
        <WebflowSyncFailureDetailModal
          failure={selectedFailure}
          onClose={() => setSelectedFailure(null)}
        />
      )}
    </div>
  );
};

export default AdminWebflowSyncSection;
