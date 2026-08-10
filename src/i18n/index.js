import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enAuth from './locales/en/auth.json';
import itAuth from './locales/it/auth.json';
import enParentDashboard from './locales/en/parentDashboard.json';
import itParentDashboard from './locales/it/parentDashboard.json';
import enParentBookings from './locales/en/parentBookings.json';
import itParentBookings from './locales/it/parentBookings.json';
import enExpertDashboard from './locales/en/expertDashboard.json';
import itExpertDashboard from './locales/it/expertDashboard.json';
import enAdminDashboard from './locales/en/adminDashboard.json';
import itAdminDashboard from './locales/it/adminDashboard.json';
import enLegal from './locales/en/legal.json';
import itLegal from './locales/it/legal.json';

const STORAGE_KEY = 'sageNestLang';

// Apply ?lang= URL param on any entry page so Webflow can pre-set the language.
// This runs before React mounts, locking the language for the entire session.
const _urlLang = new URLSearchParams(window.location.search).get('lang');
if (_urlLang && ['en', 'it'].includes(_urlLang)) {
  localStorage.setItem(STORAGE_KEY, _urlLang);
} else if (window.location.pathname === '/book') {
  // No explicit ?lang= param. Detect from the Webflow referrer path:
  // Italian Webflow uses a /it/ path prefix; English has no prefix.
  // Default to 'en' when there's no referrer (direct link, bookmark, etc.)
  let _detectedLang = 'en';
  if (document.referrer) {
    try {
      if (/\/it(\/|$)/.test(new URL(document.referrer).pathname)) {
        _detectedLang = 'it';
      }
    } catch (_) {}
  }
  localStorage.setItem(STORAGE_KEY, _detectedLang);
} else if (window.location.pathname === '/register' && !localStorage.getItem(STORAGE_KEY)) {
  // Experts land here directly (no Webflow referrer, no ?lang= param), so
  // fall back to the browser's own PRIMARY language instead of defaulting
  // to English — this is also what keeps Chrome's translate prompt (and
  // the reconciliation crash it can trigger, see RegisterErrorBoundary)
  // from showing up for Italian-language browsers in the first place.
  //
  // Two safeguards keep this precise:
  // 1. Only the primary language (navigator.language / languages[0]) is
  //    checked, not the full navigator.languages list — a browser where
  //    Italian is merely a lower-priority secondary entry still gets
  //    English if that's the actual preference.
  // 2. This whole branch only runs when nothing is stored yet
  //    (!localStorage.getItem(STORAGE_KEY)) — i.e. a genuine first visit.
  //    Once a preference exists (from this detection, or from the
  //    on-page language tabs), it is never silently overwritten on a
  //    later visit — matching the original behavior for every other
  //    returning-user case.
  const _primaryLang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
  const _detectedLang = _primaryLang.toLowerCase().startsWith('it') ? 'it' : 'en';
  localStorage.setItem(STORAGE_KEY, _detectedLang);
  // TEMP DEBUG — remove once verified.
  console.log('[i18n] /register language detection:', { primaryLang: _primaryLang, detectedLang: _detectedLang });
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { auth: enAuth, parentDashboard: enParentDashboard, parentBookings: enParentBookings, expertDashboard: enExpertDashboard, adminDashboard: enAdminDashboard, legal: enLegal },
      it: { auth: itAuth, parentDashboard: itParentDashboard, parentBookings: itParentBookings, expertDashboard: itExpertDashboard, adminDashboard: itAdminDashboard, legal: itLegal },
    },
    lng: localStorage.getItem(STORAGE_KEY) || 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'it'],
    interpolation: { escapeValue: false },
  });

export { STORAGE_KEY };
export default i18n;
