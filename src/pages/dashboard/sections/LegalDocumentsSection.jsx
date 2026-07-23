import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useGetLegalDocumentsQuery, useBumpLegalDocumentMutation } from "../../../api/adminApi";

// Accepts x.x, x.x.x, 2.0.1, etc. — at least two numeric segments.
const VERSION_RE = /^\d+(\.\d+)+$/;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Renders a compact "EN 12 · IT 4" breakdown from { en: 12, it: 4 }, omitting zero counts.
const formatByLanguage = (byLanguage) => {
  if (!byLanguage) return null;
  const parts = Object.entries(byLanguage)
    .filter(([, count]) => count > 0)
    .map(([lang, count]) => `${lang.toUpperCase()} ${count.toLocaleString()}`);
  return parts.length > 0 ? parts.join(" · ") : null;
};

// ─── Version history table ─────────────────────────────────────────────────────
const VersionHistory = ({ docs, type }) => {
  const { t } = useTranslation("adminDashboard");
  const history = docs.slice(1); // everything after the current (latest) version
  const isPrivacy = type === "PRIVACY_POLICY";

  if (history.length === 0) return null;

  return (
    <div className="mt-4 border-t border-[#c5ceba] pt-4">
      <div className="rounded-xl border border-[#c5ceba] overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-4 py-2.5 bg-[#445446]">
          <span className="text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
            {t("legalDocs.versionHistory.col.version")}
          </span>
          <span className="text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
            {t("legalDocs.versionHistory.col.published")}
          </span>
          <span className="text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap text-right">
            {isPrivacy ? t("legalDocs.versionHistory.col.shownTo") : t("legalDocs.versionHistory.col.acceptances")}
          </span>
        </div>
        {/* Data rows */}
        <div className="divide-y divide-[#E4E7E4]">
          {history.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 px-4 py-3 items-center hover:bg-[#dfe2d7]/30 transition-colors">
              <span className="text-sm font-mono font-semibold text-[#445446] whitespace-nowrap">
                v{row.version}
              </span>
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {formatDate(row.effective_from)}
              </span>
              <span className="text-sm text-right">
                {row.accepted_count > 0 ? (
                  <span className="inline-flex flex-col items-end gap-0.5">
                    <span className="inline-flex items-center gap-1 font-medium text-[#1F2933]">
                      {row.accepted_count.toLocaleString()}
                      <span className="text-gray-400 font-normal text-xs">
                        {t(isPrivacy ? "legalDocs.versionHistory.shownToUser" : "legalDocs.versionHistory.user", { count: row.accepted_count })}
                      </span>
                    </span>
                    {formatByLanguage(row.accepted_count_by_language) && (
                      <span className="text-[11px] text-gray-400 font-normal">
                        {formatByLanguage(row.accepted_count_by_language)}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DOC_PATH = {
  PRIVACY_POLICY: "/privacy-policy",
  TERMS_CONDITIONS: "/terms-conditions",
  CANCELLATION_POLICY: "/cancellation-policy",
};

// ─── Doc card ──────────────────────────────────────────────────────────────────
const DocCard = ({ type, docs }) => {
  const { t } = useTranslation("adminDashboard");
  const [bumpLegalDocument, { isLoading: loading }] = useBumpLegalDocumentMutation();

  const [version,        setVersion]        = useState("");
  const [fileEn,         setFileEn]         = useState(null);
  const [fileIt,         setFileIt]         = useState(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [historyOpen,    setHistoryOpen]    = useState(false);

  const currentDoc   = docs?.[0] ?? null;
  const historyCount = docs ? Math.max(0, docs.length - 1) : 0;

  const trimmed      = version.trim();
  const versionValid = VERSION_RE.test(trimmed);
  const showFmtHint  = trimmed.length > 0 && !versionValid;
  const canPublish   = versionValid && !!fileEn && !!fileIt;

  const docLabel = t(`legalDocs.docType.${type}`);
  const docPath  = DOC_PATH[type];

  const handleBump = () => {
    if (!canPublish) return;
    setConfirmPending(true);
  };

  const resetForm = () => { setVersion(""); setFileEn(null); setFileIt(null); };

  const handleConfirmedBump = async () => {
    setConfirmPending(false);
    try {
      await bumpLegalDocument({ type, version: trimmed, documentEn: fileEn, documentIt: fileIt }).unwrap();
      resetForm();
      toast.success(t("legalDocs.card.publishSuccess", { version: trimmed, docLabel }));
    } catch (err) {
      toast.error(err?.data?.error || t("legalDocs.card.publishError"));
    }
  };

  return (
    <>
      {confirmPending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) { setConfirmPending(false); resetForm(); }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">
              {t("legalDocs.confirmModal.title", { docLabel, version: trimmed })}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {t("legalDocs.confirmModal.body")}
              {type === "PRIVACY_POLICY"
                ? t("legalDocs.confirmModal.bodyPrivacy")
                : type === "TERMS_CONDITIONS"
                ? t("legalDocs.confirmModal.bodyTerms")
                : t("legalDocs.confirmModal.bodyCancellation")}
              {t("legalDocs.confirmModal.cannotUndo")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmPending(false); resetForm(); }}
                className="flex-1 py-2.5 px-4 rounded-lg border-2 border-[#c5ceba] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t("legalDocs.confirmModal.cancel")}
              </button>
              <button
                onClick={handleConfirmedBump}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-medium transition-colors"
              >
                {t("legalDocs.confirmModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border-2 border-[#c5ceba] p-6 flex flex-col">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-semibold text-[#1F2933]">{docLabel}</p>
            {currentDoc ? (
              <p className="text-xs text-gray-500 mt-1">
                <span className="font-semibold text-[#1F2933]">
                  {t("legalDocs.card.version", { v: currentDoc.version })}
                </span>
                <span className="mx-1.5 text-gray-300">—</span>
                {t("legalDocs.card.published", { date: formatDate(currentDoc.effective_from) })}
                {currentDoc.accepted_count > 0 && (
                  <span className="ml-2 text-gray-400">
                    · {currentDoc.accepted_count.toLocaleString()}{" "}
                    {type === "PRIVACY_POLICY"
                      ? t("legalDocs.card.shownAtSignup", { count: currentDoc.accepted_count })
                      : t("legalDocs.card.acceptance", { count: currentDoc.accepted_count })}
                    {formatByLanguage(currentDoc.accepted_count_by_language) && (
                      <span className="ml-1 text-gray-300">
                        ({formatByLanguage(currentDoc.accepted_count_by_language)})
                      </span>
                    )}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-red-500 mt-1">{t("legalDocs.card.noVersion")}</p>
            )}
          </div>
          <div className="flex-shrink-0 self-start flex flex-col gap-1.5 items-end">
            {currentDoc?.file_url_en || currentDoc?.file_url_it ? (
              <>
                {currentDoc?.file_url_en && (
                  <a
                    href={currentDoc.file_url_en}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c5ceba] text-xs font-medium text-[#445446] hover:bg-[#f0f2ed] transition-colors whitespace-nowrap"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    {t("legalDocs.card.viewCurrentPdfEn")}
                  </a>
                )}
                {currentDoc?.file_url_it && (
                  <a
                    href={currentDoc.file_url_it}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c5ceba] text-xs font-medium text-[#445446] hover:bg-[#f0f2ed] transition-colors whitespace-nowrap"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    {t("legalDocs.card.viewCurrentPdfIt")}
                  </a>
                )}
              </>
            ) : (
              <a
                href={docPath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c5ceba] text-xs font-medium text-[#445446] hover:bg-[#f0f2ed] transition-colors whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                {t("legalDocs.card.viewCurrent")}
              </a>
            )}
          </div>
        </div>

        {/* Publish controls */}
        <div className="space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            {t("legalDocs.card.instructions", { path: docPath })}
            {type === "PRIVACY_POLICY"
              ? t("legalDocs.card.reacceptPrivacy")
              : type === "TERMS_CONDITIONS"
              ? t("legalDocs.card.reacceptTerms")
              : ""}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={version}
              onChange={(e) => { setVersion(e.target.value); }}
              placeholder={t("legalDocs.card.versionPlaceholder")}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 transition-colors ${
                showFmtHint
                  ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400/20"
                  : "border-[#E4E7E4] focus:border-[#445446]"
              }`}
            />
          </div>
          {showFmtHint && (
            <p className="text-xs text-red-500">{t("legalDocs.card.formatHint")}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#c5ceba] text-xs text-gray-500 cursor-pointer hover:border-[#445446] hover:text-[#445446] transition-colors truncate">
              <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-4 rounded-sm bg-gray-100 text-[10px] font-bold text-gray-500">EN</span>
              <span className="truncate">{fileEn ? fileEn.name : t("legalDocs.card.choosePdfEn")}</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFileEn(e.target.files?.[0] || null)}
              />
            </label>
            <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#c5ceba] text-xs text-gray-500 cursor-pointer hover:border-[#445446] hover:text-[#445446] transition-colors truncate">
              <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-4 rounded-sm bg-gray-100 text-[10px] font-bold text-gray-500">IT</span>
              <span className="truncate">{fileIt ? fileIt.name : t("legalDocs.card.choosePdfIt")}</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFileIt(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleBump}
              disabled={loading || !canPublish}
              className="px-4 py-2 rounded-lg bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? t("legalDocs.card.publishing") : t("legalDocs.card.publishBtn")}
            </button>
          </div>
        </div>

        {/* Version history — collapsible */}
        {historyCount > 0 && (
          <div className="mt-4 border-t border-[#c5ceba] pt-4">
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
              {t("legalDocs.card.versionHistoryBtn")}
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                {historyCount}
              </span>
            </button>

            {historyOpen && <VersionHistory docs={docs} type={type} />}
          </div>
        )}
      </div>
    </>
  );
};

// ─── Main section ──────────────────────────────────────────────────────────────
const LegalDocumentsSection = () => {
  const { t } = useTranslation("adminDashboard");
  const { data, isLoading, isError } = useGetLegalDocumentsQuery();

  const privacyDocs      = data?.privacy_policy      ?? [];
  const termsDocs        = data?.terms_conditions    ?? [];
  const cancellationDocs = data?.cancellation_policy ?? [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#445446]">{t("legalDocs.pageTitle")}</h2>
        <p className="text-sm text-[#5e6d5b] font-medium mt-1">{t("legalDocs.pageSubtitle")}</p>
      </div>

      {isError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {t("legalDocs.loadError")}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 py-10">
          <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          <span className="text-sm text-gray-400">{t("legalDocs.loading")}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <DocCard type="PRIVACY_POLICY"      docs={privacyDocs}      />
          <DocCard type="TERMS_CONDITIONS"    docs={termsDocs}        />
          <DocCard type="CANCELLATION_POLICY" docs={cancellationDocs} />
        </div>
      )}
    </div>
  );
};

export default LegalDocumentsSection;
