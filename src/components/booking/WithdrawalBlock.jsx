import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// ─── Withdrawal (14-day cooling-off) consent — booking flow spec v1.7 §5.3 ───
// Mandatory when rendered (session starts within 14 days of booking
// confirmation). Independent of the health consent block — neither triggers
// nor suppresses the other, and both often appear together.
const WithdrawalBlock = ({ accepted, setAccepted, showError }) => {
  const { t } = useTranslation('parentBookings');
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-px h-3.5 w-3.5 shrink-0 accent-[#445446] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 rounded-sm"
        />
        <span className="text-xs text-[#1F2933] leading-relaxed">{t('withdrawalBlock.label')}</span>
      </label>
      <button
        type="button"
        onClick={() => setWhyOpen((o) => !o)}
        className="text-[11px] text-gray-400 hover:text-[#445446] underline ml-[22px]"
      >
        {t('withdrawalBlock.why')}
      </button>
      {whyOpen && (
        <p className="text-[11px] text-gray-400 leading-relaxed ml-[22px]">{t('withdrawalBlock.whyBody')}</p>
      )}
      {showError && !accepted && (
        <p className="text-xs text-red-600 ml-[22px]">{t('errors.consentRequired')}</p>
      )}
    </div>
  );
};

export default WithdrawalBlock;
