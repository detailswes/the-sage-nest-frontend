import { useTranslation, Trans } from 'react-i18next';

const CancellationPolicy = ({ compact = false, small = false }) => {
  const { t } = useTranslation('parentBookings');

  if (compact) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 leading-relaxed">
        <span className="font-semibold">{t('cancellationPolicy.compactPrefix')}</span>
        {t('cancellationPolicy.compactBody')}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900 leading-relaxed space-y-3 ${small ? 'text-xs' : 'text-sm'}`}>
      <p>{t('cancellationPolicy.intro')}</p>

      <ul className="space-y-1.5 pl-2">
        <li className="flex items-start gap-2">
          <span className="shrink-0 mt-px">•</span>
          <span>
            <span className="font-semibold">{t('cancellationPolicy.tier1Label')}</span>
            {t('cancellationPolicy.tier1Suffix')}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="shrink-0 mt-px">•</span>
          <span>
            <span className="font-semibold">{t('cancellationPolicy.tier2Label')}</span>
            {t('cancellationPolicy.tier2Suffix')}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="shrink-0 mt-px">•</span>
          <span>
            <span className="font-semibold">{t('cancellationPolicy.tier3Label')}</span>
            {t('cancellationPolicy.tier3Suffix')}
          </span>
        </li>
      </ul>

      <p>{t('cancellationPolicy.rescheduleNote')}</p>

      <p>
        <Trans
          i18nKey="cancellationPolicy.expertCancelNote"
          ns="parentBookings"
          components={[<span />, <span className="font-semibold" />]}
        />
      </p>

      <p className={`text-amber-700 ${small ? 'text-[10px]' : 'text-xs'}`}>
        {t('cancellationPolicy.footer')}
      </p>
    </div>
  );
};

export default CancellationPolicy;
