import { useTranslation } from 'react-i18next';
import { it as dateFnsIt } from 'date-fns/locale';
import { parseISO, startOfDay, format } from 'date-fns';
import ThemedCalendarGrid from '../calendar/ThemedCalendarGrid';

/**
 * BookingCalendar
 *
 * Thin, booking-flow-specific wrapper around the shared ThemedCalendarGrid —
 * keeps this component's own ISO-string API (used throughout BookPage.jsx)
 * while the actual grid rendering lives in one place shared across the app.
 *
 * Props:
 *   selectedDate   — ISO date string "YYYY-MM-DD"
 *   onSelect       — (isoString: string) => void
 *   minDateISO     — ISO date string, defaults to today
 *   maxDateISO     — ISO date string or undefined
 *   availableDates — Set<"YYYY-MM-DD"> of dates that have ≥1 slot (undefined = loading/unknown)
 *   loadingDates   — boolean, true while fetching availability for this month
 *   onMonthChange  — (year: number, month: number) => void, called on mount + navigation
 */
const BookingCalendar = ({
  selectedDate,
  onSelect,
  minDateISO,
  maxDateISO,
  availableDates,
  loadingDates = false,
  onMonthChange,
}) => {
  const { t, i18n } = useTranslation('parentBookings');
  const weekdayLabels = t('calendar.weekdays', { returnObjects: true });
  const locale = i18n.language === 'it' ? dateFnsIt : undefined;

  return (
    <ThemedCalendarGrid
      selected={selectedDate ? parseISO(selectedDate) : null}
      onSelect={(date) => onSelect(format(date, 'yyyy-MM-dd'))}
      minDate={minDateISO ? parseISO(minDateISO) : startOfDay(new Date())}
      maxDate={maxDateISO ? parseISO(maxDateISO) : null}
      availableDates={availableDates}
      loadingDates={loadingDates}
      onMonthChange={onMonthChange}
      legend={{ available: t('calendar.available'), noSlots: t('calendar.noSlots') }}
      noAvailabilityTitle={t('calendar.noAvailabilityTitle')}
      weekdayLabels={weekdayLabels}
      locale={locale}
    />
  );
};

export default BookingCalendar;
