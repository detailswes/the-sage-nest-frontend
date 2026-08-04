import { useTranslation } from 'react-i18next';
import { COUNTRIES } from '../../utils/countries';
import { normalizeFiscalCode, isValidItalianFiscalCode } from '../../utils/fiscalCode';

// ─── Billing details — booking flow spec v1.7 §5.1 ───────────────────────────
// Billing trigger is the EXPERT's country, never the parent's. Italian
// experts need the full Italian invoicing block from every parent (including
// non-Italian ones); non-Italian experts need only an invoice holder name.
// Collected fresh on every booking — never saved to the parent's profile.
const inputCls = "w-full px-4 py-3 rounded-lg border border-[#E4E7E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446]";
const labelCls = "block text-xs font-medium text-gray-600 mb-1";

const BillingDetailsBlock = ({ isItalianExpert, billing, setBilling, fiscalCodeError, setFiscalCodeError, showErrors }) => {
  const { t } = useTranslation('parentBookings');

  const fiscalCodeMissing = !billing.noFiscalCode && !billing.fiscalCode.trim();
  const displayedFiscalCodeError = fiscalCodeError || (showErrors && fiscalCodeMissing ? t('errors.fiscalCodeRequired') : '');

  const handleChange = (field) => (e) => setBilling((b) => ({ ...b, [field]: e.target.value }));

  const handleFiscalCodeBlur = () => {
    if (billing.noFiscalCode) { setFiscalCodeError(''); return; }
    const normalized = normalizeFiscalCode(billing.fiscalCode);
    if (!normalized) { setFiscalCodeError(''); return; }
    setFiscalCodeError(isValidItalianFiscalCode(normalized) ? '' : t('errors.fiscalCodeInvalid'));
  };

  const handleNoFiscalCodeToggle = (e) => {
    const checked = e.target.checked;
    setBilling((b) => ({ ...b, noFiscalCode: checked, fiscalCode: checked ? '' : b.fiscalCode }));
    setFiscalCodeError('');
  };

  if (!isItalianExpert) {
    return (
      <div>
        <label className={labelCls}>{t('detailsStep.invoiceHolder')}</label>
        <input
          type="text"
          value={billing.invoiceHolder}
          onChange={handleChange('invoiceHolder')}
          className={inputCls}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>{t('detailsStep.invoiceHolder')}</label>
        <input type="text" value={billing.invoiceHolder} onChange={handleChange('invoiceHolder')} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>{t('detailsStep.address')}</label>
        <input type="text" value={billing.address} onChange={handleChange('address')} className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t('detailsStep.postcode')}</label>
          <input type="text" value={billing.postcode} onChange={handleChange('postcode')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('detailsStep.town')}</label>
          <input type="text" value={billing.town} onChange={handleChange('town')} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t('detailsStep.province')}</label>
          <input type="text" value={billing.province} onChange={handleChange('province')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('detailsStep.country')}</label>
          <select value={billing.country} onChange={handleChange('country')} className={inputCls}>
            <option value="">—</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>{t('detailsStep.fiscalCode')}</label>
        <input
          type="text"
          value={billing.fiscalCode}
          disabled={billing.noFiscalCode}
          onChange={handleChange('fiscalCode')}
          onBlur={handleFiscalCodeBlur}
          className={`${inputCls} ${billing.noFiscalCode ? 'bg-gray-50 text-gray-400' : ''}`}
        />
        <p className="mt-1 text-xs text-gray-400">{t('detailsStep.fiscalCodeHelper')}</p>
        {displayedFiscalCodeError && <p className="mt-1 text-xs text-red-500">{displayedFiscalCodeError}</p>}
        <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={billing.noFiscalCode}
            onChange={handleNoFiscalCodeToggle}
            className="accent-[#445446]"
          />
          <span className="text-xs text-gray-600">{t('detailsStep.noFiscalCode')}</span>
        </label>
      </div>
    </div>
  );
};

export default BillingDetailsBlock;
