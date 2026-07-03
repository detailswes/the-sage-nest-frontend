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
