import { useTranslation } from 'react-i18next';

// ─── Invoicing details — expert/admin view only ──────────────────────────────
// Shown wherever an expert or admin looks at one specific booking's detail.
// Renders nothing if the parent has no fiscal code / billing address on file.
const BookingInvoicingInfo = ({ booking }) => {
  const { t } = useTranslation('expertDashboard');
  const parent = booking?.parent;
  if (!parent) return null;

  const address = [parent.address_street, parent.city, parent.address_country]
    .filter(Boolean)
    .join(', ');
  const fiscalCode = parent.fiscal_code;

  if (!address && !fiscalCode) return null;

  return (
    <div className="bg-[#F5F7F5] border border-[#E4E7E4] rounded-lg px-3 py-2.5">
      <p className="text-xs font-semibold text-[#445446] uppercase tracking-wide mb-1.5">
        {t('invoicing.heading')}
      </p>
      {fiscalCode && (
        <p className="text-xs text-[#1F2933]">
          <span className="text-gray-500">{t('invoicing.fiscalCode')}:</span> {fiscalCode}
        </p>
      )}
      {address && (
        <p className="text-xs text-[#1F2933] mt-0.5">
          <span className="text-gray-500">{t('invoicing.address')}:</span> {address}
        </p>
      )}
    </div>
  );
};

export default BookingInvoicingInfo;
