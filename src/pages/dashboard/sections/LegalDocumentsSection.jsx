import { useState, useEffect } from "react";
import { getLegalDocuments, bumpLegalDocument } from "../../../api/adminApi";

const DOC_LABELS = {
  PRIVACY_POLICY:   "Privacy Policy",
  TERMS_CONDITIONS: "Terms & Conditions",
};

// Accepts x.x, x.x.x, 2.0.1, etc. — at least two numeric segments.
const VERSION_RE = /^\d+(\.\d+)+$/;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// ─── Version history table ─────────────────────────────────────────────────────
const VersionHistory = ({ docs }) => {
  const history = docs.slice(1); // everything after the current (latest) version

  if (history.length === 0) return null;

  return (
    <div className="mt-4 border-t border-[#E4E7E4] pt-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Version History
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#E4E7E4]">
              <th className="text-left font-semibold text-gray-400 pb-2 pr-4 whitespace-nowrap">Version</th>
              <th className="text-left font-semibold text-gray-400 pb-2 pr-4 whitespace-nowrap">Published</th>
              <th className="text-right font-semibold text-gray-400 pb-2 whitespace-nowrap">Acceptances</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F2F0]">
            {history.map((row) => (
              <tr key={row.id} className="group">
                <td className="py-2 pr-4 font-mono text-[#445446] font-semibold whitespace-nowrap">
                  v{row.version}
                </td>
                <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                  {formatDate(row.effective_from)}
                </td>
                <td className="py-2 text-right">
                  {row.accepted_count > 0 ? (
                    <span className="inline-flex items-center gap-1 font-medium text-[#1F2933]">
                      {row.accepted_count.toLocaleString()}
                      <span className="text-gray-400 font-normal">
                        user{row.accepted_count !== 1 ? "s" : ""}
                      </span>
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Doc card ──────────────────────────────────────────────────────────────────
const DocCard = ({ type, docs, onBumped }) => {
  const [version,        setVersion]        = useState("");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [confirmPending, setConfirmPending] = useState(false);
  const [historyOpen,    setHistoryOpen]    = useState(false);

  const currentDoc   = docs?.[0] ?? null;
  const historyCount = docs ? Math.max(0, docs.length - 1) : 0;

  const trimmed      = version.trim();
  const versionValid = VERSION_RE.test(trimmed);
  const showFmtHint  = trimmed.length > 0 && !versionValid;

  const handleBump = () => {
    if (!versionValid) return;
    setConfirmPending(true);
  };

  const handleConfirmedBump = async () => {
    setConfirmPending(false);
    setLoading(true);
    setError("");
    try {
      const updatedDocs = await bumpLegalDocument(type, version.trim());
      onBumped(type, updatedDocs);
      setVersion("");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to publish version.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {confirmPending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) { setConfirmPending(false); setVersion(""); }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">
              Publish {DOC_LABELS[type]} v{trimmed}?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Make sure the updated content is already live on the page before confirming.
              {type === "PRIVACY_POLICY"
                ? " All users (parents and experts) will be prompted to re-accept on their next login."
                : " All parents will be prompted to re-accept before their next booking."}{" "}
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmPending(false); setVersion(""); }}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedBump}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-medium transition-colors"
              >
                Yes, publish
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E4E7E4] p-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-semibold text-[#1F2933]">{DOC_LABELS[type]}</p>
            {currentDoc ? (
              <p className="text-xs text-gray-500 mt-1">
                <span className="font-semibold text-[#1F2933]">Version {currentDoc.version}</span>
                <span className="mx-1.5 text-gray-300">—</span>
                published {formatDate(currentDoc.effective_from)}
                {currentDoc.accepted_count > 0 && (
                  <span className="ml-2 text-gray-400">
                    · {currentDoc.accepted_count.toLocaleString()} acceptance{currentDoc.accepted_count !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-red-500 mt-1">No version published yet</p>
            )}
          </div>
          <a
            href={type === "PRIVACY_POLICY" ? "/privacy-policy" : "/terms-conditions"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#445446] font-medium underline whitespace-nowrap"
          >
            View current
          </a>
        </div>

        {/* Publish controls */}
        <div className="space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            Make sure the updated content is already live on the{" "}
            {type === "PRIVACY_POLICY" ? "/privacy-policy" : "/terms-conditions"}{" "}
            page before publishing.
            {type === "PRIVACY_POLICY"
              ? " All users (parents and experts) will be prompted to re-accept on their next login."
              : " All parents will be prompted to re-accept before their next booking."}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={version}
              onChange={(e) => { setVersion(e.target.value); setError(""); }}
              placeholder="e.g. 1.1 or 2.0.1"
              className={`flex-1 px-3 py-2 rounded-lg border text-sm text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 transition-colors ${
                showFmtHint
                  ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400/20"
                  : "border-[#E4E7E4] focus:border-[#445446]"
              }`}
            />
            <button
              onClick={handleBump}
              disabled={loading || !versionValid}
              className="px-4 py-2 rounded-lg bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Publishing…" : "Publish"}
            </button>
          </div>
          {showFmtHint && !error && (
            <p className="text-xs text-red-500">Use numeric format e.g. 1.1 or 2.0.1</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Version history — collapsible */}
        {historyCount > 0 && (
          <div className="mt-4 border-t border-[#E4E7E4] pt-4">
            <button
              onClick={() => setHistoryOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#1F2933] transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${historyOpen ? "rotate-90" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              Version history
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                {historyCount}
              </span>
            </button>

            {historyOpen && <VersionHistory docs={docs} />}
          </div>
        )}
      </div>
    </>
  );
};

// ─── Main section ──────────────────────────────────────────────────────────────
const LegalDocumentsSection = () => {
  const [docs,    setDocs]    = useState({ privacy_policy: [], terms_conditions: [] });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    getLegalDocuments()
      .then(setDocs)
      .catch(() => setError("Could not load legal document versions."))
      .finally(() => setLoading(false));
  }, []);

  const handleBumped = (type, updatedDocs) => {
    const key = type === "PRIVACY_POLICY" ? "privacy_policy" : "terms_conditions";
    setDocs((prev) => ({ ...prev, [key]: updatedDocs }));
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#1F2933]">Legal Documents</h2>
        <p className="text-sm text-gray-500 mt-1">
          View current versions and publish updates after the page content has been updated by developers.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-10">
          <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          <span className="text-sm text-gray-400">Loading…</span>
        </div>
      ) : (
        <div className="space-y-4 max-w-lg">
          <DocCard type="PRIVACY_POLICY"   docs={docs.privacy_policy}   onBumped={handleBumped} />
          <DocCard type="TERMS_CONDITIONS" docs={docs.terms_conditions} onBumped={handleBumped} />
        </div>
      )}
    </div>
  );
};

export default LegalDocumentsSection;
