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

const STORAGE_KEY = 'sageNestLang';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { auth: enAuth, parentDashboard: enParentDashboard, parentBookings: enParentBookings, expertDashboard: enExpertDashboard, adminDashboard: enAdminDashboard },
      it: { auth: itAuth, parentDashboard: itParentDashboard, parentBookings: itParentBookings, expertDashboard: itExpertDashboard, adminDashboard: itAdminDashboard },
    },
    lng: localStorage.getItem(STORAGE_KEY) || 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'it'],
    interpolation: { escapeValue: false },
  });

export { STORAGE_KEY };
export default i18n;
