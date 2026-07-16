import { useTranslation } from 'react-i18next';
import { useGetLegalVersionsQuery } from '../../api/userApi';
import CancellationPolicy from '../../components/booking/CancellationPolicy';

const DATE_LOCALE = { en: 'en-GB', it: 'it-IT' };

const formatDate = (iso, language) =>
  new Date(iso).toLocaleDateString(DATE_LOCALE[language] ?? 'en-GB', { month: 'long', year: 'numeric' });

const CancellationPolicyPage = () => {
  const { t, i18n } = useTranslation('legal');
  const { data } = useGetLegalVersionsQuery();
  const doc = data?.cancellation_policy ?? null;
  const lang = DATE_LOCALE[i18n.language] ? i18n.language : 'en';

  return (
    <div className="min-h-screen bg-[#f4eee5] bg-sage-stripes bg-stripe-size bg-repeat-x py-10 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8 text-center">
          <span className="text-xl font-bold text-[#1F2933]">{t('brand')}</span>
          <h1 className="text-2xl font-semibold text-[#1F2933] mt-4 mb-1">{t('cancellationPolicy.pageTitle')}</h1>
          <p className="text-sm text-gray-400">
            {doc
              ? t('versionLine', { version: doc.version, date: formatDate(doc.effective_from, lang) })
              : t('loading')}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E4E7E4] px-8 py-8">
          <CancellationPolicy />
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicyPage;
