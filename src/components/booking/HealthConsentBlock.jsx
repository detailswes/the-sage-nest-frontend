import { useTranslation } from 'react-i18next';

// ─── Health-data consent — booking flow spec v1.7 §5.2 ───────────────────────
// Own bordered/tinted block — must not read as one row in a list of tick
// boxes. Unticked by default, mandatory when rendered. Exactly one wording
// (flow A = parents, flow B = baby) renders, chosen by the service's
// recipient — never both. The helper line is part of the consent, not
// decoration. Independent of the withdrawal block — neither triggers nor
// suppresses the other.
const HealthConsentBlock = ({ flow, given, setGiven, showError }) => {
  const { t } = useTranslation('parentBookings');
  const body = flow === 'B' ? t('healthConsent.flowB') : t('healthConsent.flowA');

  return (
    <div className="rounded-xl border-2 border-teal-200 bg-teal-50/60 p-4">
      <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide mb-2">
        {t('healthConsent.heading')}
      </p>
      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={given}
          onChange={(e) => setGiven(e.target.checked)}
          className="mt-px h-3.5 w-3.5 shrink-0 accent-[#445446] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 rounded-sm"
        />
        <span className="text-xs text-[#1F2933] leading-relaxed">{body}</span>
      </label>
      <p className="text-[11px] text-teal-700/80 leading-relaxed mt-2 ml-[22px]">
        {t('healthConsent.helper')}
      </p>
      {showError && !given && (
        <p className="text-xs text-red-600 mt-2 ml-[22px]">{t('errors.consentRequired')}</p>
      )}
    </div>
  );
};

export default HealthConsentBlock;
