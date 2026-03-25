import { useState, useEffect } from "react";
import { getLegalDocuments, bumpLegalDocument } from "../../../api/adminApi";

const DOC_LABELS = {
  PRIVACY_POLICY: "Privacy Policy",
  TERMS_CONDITIONS: "Terms & Conditions",
};

const DocCard = ({ type, doc, onBumped }) => {
  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmPending, setConfirmPending] = useState(false);

  const handleBump = () => {
    if (!version.trim()) {
      setError("Enter a version number e.g. 1.1");
      return;
    }
    setConfirmPending(true);
  };

  const handleConfirmedBump = async () => {
    setConfirmPending(false);
    setLoading(true);
    setError("");
    try {
      const updated = await bumpLegalDocument(type, version.trim());
      onBumped(type, updated);
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
            if (e.target === e.currentTarget) { setConfirmPending(false); setVersion(''); }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 mx-auto mb-4">
              <svg
                className="w-6 h-6 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">
              Publish {DOC_LABELS[type]} v{version.trim()}?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Make sure the updated content is already live on the page before
              confirming.
              {type === "PRIVACY_POLICY"
                ? " All users (parents and experts) will be prompted to re-accept on their next login."
                : " All parents will be prompted to re-accept before their next booking."}{" "}
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmPending(false); setVersion(''); }}
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
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-semibold text-[#1F2933]">
              {DOC_LABELS[type]}
            </p>
            {doc ? (
              <p className="text-xs text-gray-500 mt-1">
                Current version:{" "}
                <span className="font-semibold text-[#445446]">
                  v{doc.version}
                </span>
                {" · "}effective{" "}
                {new Date(doc.effective_from).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            ) : (
              <p className="text-xs text-red-500 mt-1">No version found</p>
            )}
          </div>
          <a
            href={
              type === "PRIVACY_POLICY"
                ? "/privacy-policy"
                : "/terms-conditions"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#445446] font-medium underline whitespace-nowrap"
          >
            View current
          </a>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            Make sure the updated content is already live on the{" "}
            {type === "PRIVACY_POLICY"
              ? "/privacy-policy"
              : "/terms-conditions"}{" "}
            page before publishing.
            {type === "PRIVACY_POLICY"
              ? " All users (parents and experts) will be prompted to re-accept on their next login."
              : " All parents will be prompted to re-accept before their next booking."}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={version}
              onChange={(e) => {
                setVersion(e.target.value);
                setError("");
              }}
              placeholder="New version e.g. 1.1"
              className="flex-1 px-3 py-2 rounded-lg border border-[#E4E7E4] text-sm text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446]"
            />
            <button
              onClick={handleBump}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Publishing…" : "Publish"}
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
    </>
  );
};

const LegalDocumentsSection = () => {
  const [docs, setDocs] = useState({
    privacy_policy: null,
    terms_conditions: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getLegalDocuments()
      .then(setDocs)
      .catch(() => setError("Could not load legal document versions."))
      .finally(() => setLoading(false));
  }, []);

  const handleBumped = (type, newDoc) => {
    setDocs((prev) => ({
      ...prev,
      [type === "PRIVACY_POLICY" ? "privacy_policy" : "terms_conditions"]:
        newDoc,
    }));
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#1F2933]">
          Legal Documents
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          View current versions and publish updates after the page content has
          been updated by developers.
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
          <DocCard
            type="PRIVACY_POLICY"
            doc={docs.privacy_policy}
            onBumped={handleBumped}
          />
          <DocCard
            type="TERMS_CONDITIONS"
            doc={docs.terms_conditions}
            onBumped={handleBumped}
          />
        </div>
      )}
    </div>
  );
};

export default LegalDocumentsSection;
