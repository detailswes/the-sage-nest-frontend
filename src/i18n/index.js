import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enParentDashboard from './locales/en/parentDashboard.json';
import itParentDashboard from './locales/it/parentDashboard.json';
import enParentBookings from './locales/en/parentBookings.json';
import itParentBookings from './locales/it/parentBookings.json';
import enExpertDashboard from './locales/en/expertDashboard.json';
import itExpertDashboard from './locales/it/expertDashboard.json';

const STORAGE_KEY = 'sageNestLang';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { parentDashboard: enParentDashboard, parentBookings: enParentBookings, expertDashboard: enExpertDashboard },
      it: { parentDashboard: itParentDashboard, parentBookings: itParentBookings, expertDashboard: itExpertDashboard },
    },
    lng: localStorage.getItem(STORAGE_KEY) || 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'it'],
    interpolation: { escapeValue: false },
  });

export { STORAGE_KEY };
export default i18n;
