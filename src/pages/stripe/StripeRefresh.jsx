import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCreateConnectLinkMutation } from '../../api/stripeApi';
import { LOGO_SVG } from '../../assets/images';

/**
 * Stripe redirects here when the onboarding link expires.
 * Automatically generates a fresh link and redirects back to Stripe.
 */
const StripeRefresh = () => {
  const { t } = useTranslation('expertDashboard');
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const [createConnectLink] = useCreateConnectLinkMutation();

  useEffect(() => {
    createConnectLink()
      .unwrap()
      .then((data) => {
        window.location.href = data.url;
      })
      .catch(() => setError(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen bg-[#f4eee5] bg-sage-stripes bg-stripe-size bg-repeat-x flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-[#E4E7E4] w-full max-w-md px-8 py-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <img
              src={LOGO_SVG}
              alt="Sage Nest"
              className="h-7"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="font-bold text-[#1F2933] text-base tracking-tight">Sage Nest</span>
          </div>
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[#1F2933] mb-2">{t('stripeConnect.refresh.errorTitle')}</h2>
          <p className="text-sm text-gray-500 mb-6">
            {t('stripeConnect.refresh.errorBody')}
          </p>
          <button
            onClick={() => navigate('/dashboard/expert/profile', { replace: true })}
            className="w-full py-2.5 px-4 rounded-lg bg-[#445446] hover:bg-[#3F4E41] text-white text-sm font-medium transition-colors"
          >
            {t('stripeConnect.refresh.backToProfile')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4eee5] bg-sage-stripes bg-stripe-size bg-repeat-x flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-[#E4E7E4] w-full max-w-md px-8 py-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img
            src={LOGO_SVG}
            alt="Sage Nest"
            className="h-7"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className="font-bold text-[#1F2933] text-base tracking-tight">Sage Nest</span>
        </div>
        <div className="w-16 h-16 rounded-full border-4 border-[#445446]/20 border-t-[#445446] animate-spin mx-auto mb-5" />
        <h2 className="text-lg font-semibold text-[#1F2933] mb-2">{t('stripeConnect.refresh.reconnecting')}</h2>
        <p className="text-sm text-gray-500">{t('stripeConnect.refresh.reconnectingBody')}</p>
      </div>
    </div>
  );
};

export default StripeRefresh;
