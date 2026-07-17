// Picks the PDF for the current UI language, falling back to the other
// language's PDF, then to the in-app page, if the admin hasn't uploaded
// both yet. Shared by every place that links to a legal document (signup,
// checkout, account pages) so the language resolution stays consistent.
export function resolveDocUrl(doc, lang, fallbackPath) {
  if (!doc) return fallbackPath;
  const preferred = lang === 'it' ? doc.file_url_it : doc.file_url_en;
  return preferred || doc.file_url_en || doc.file_url_it || fallbackPath;
}
