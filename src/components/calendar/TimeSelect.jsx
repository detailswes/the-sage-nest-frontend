import { useTranslation } from 'react-i18next';

// Default: every 15 minutes across the full day. Callers with a narrower
// business rule (e.g. weekly availability hours, limited to 06:00–22:00 by
// the backend) pass their own `options` instead.
const FULL_DAY_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    FULL_DAY_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

/**
 * TimeSelect — the sage-themed "HH:MM" dropdown shared across the app
 * (weekly availability hours, blockout windows, and the event date/time
 * picker). A plain, native <select> styled to match — simpler and more
 * consistent than a custom time-wheel, and keyboard/screen-reader friendly
 * for free.
 *
 * Props:
 *   value     — "HH:MM" string | ""
 *   onChange  — (value: string) => void
 *   hasError  — boolean
 *   options   — string[] of "HH:MM" values, defaults to every 15 min, all day
 *   placeholder — optional override for the empty option's label
 */
const TimeSelect = ({ value, onChange, hasError, options = FULL_DAY_OPTIONS, placeholder }) => {
  const { t } = useTranslation('common');
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 rounded-lg border text-sm text-[#1F2933] bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] appearance-none pr-7 ${
          hasError ? 'border-red-400' : 'border-[#E4E7E4]'
        }`}
      >
        <option value="">{placeholder || t('timePlaceholder')}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <svg
        className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
      </svg>
    </div>
  );
};

export default TimeSelect;
