import { useTranslation } from 'react-i18next';

// ─── Invoicing details — expert/admin view only ──────────────────────────────
// Shown wherever an expert or admin looks at one specific booking's detail.
// Billing details are a per-booking snapshot on booking.consent (booking flow
// spec v1.7 §8) — collected fresh at booking time, never read from/saved to
// the parent's profile. Renders nothing if the booking has no snapshot
// (e.g. a non-Italian expert, where only the invoice holder is collected).
const BookingInvoicingInfo = ({ booking }) => {
  const { t } = useTranslation('expertDashboard');
  const consent = booking?.consent;
  if (!consent) return null;

  const invoiceHolder = consent.billing_invoice_holder;
  const address = [
    consent.billing_address, consent.billing_postcode, consent.billing_town,
    consent.billing_province, consent.billing_country,
  ].filter(Boolean).join(', ');
  const fiscalCode = consent.billing_fiscal_code;
  const noFiscalCode = consent.billing_no_fiscal_code;

  if (!invoiceHolder && !address && !fiscalCode && !noFiscalCode) return null;

  return (
    <div className="bg-[#F5F7F5] border border-[#E4E7E4] rounded-lg px-3 py-2.5">
      <p className="text-xs font-semibold text-[#445446] uppercase tracking-wide mb-1.5">
        {t('invoicing.heading')}
      </p>
      {invoiceHolder && (
        <p className="text-xs text-[#1F2933]">
          <span className="text-gray-500">{t('invoicing.invoiceHolder')}:</span> {invoiceHolder}
        </p>
      )}
      {address && (
        <p className="text-xs text-[#1F2933] mt-0.5">
          <span className="text-gray-500">{t('invoicing.address')}:</span> {address}
        </p>
      )}
      {fiscalCode && (
        <p className="text-xs text-[#1F2933] mt-0.5">
          <span className="text-gray-500">{t('invoicing.fiscalCode')}:</span> {fiscalCode}
        </p>
      )}
      {!fiscalCode && noFiscalCode && (
        <p className="text-xs text-gray-500 mt-0.5 italic">{t('invoicing.noFiscalCode')}</p>
      )}
    </div>
  );
};

export default BookingInvoicingInfo;
