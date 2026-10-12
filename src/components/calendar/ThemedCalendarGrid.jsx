import { useState, useEffect } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths,
  isSameDay, isSameMonth, isToday, isAfter, isBefore,
  format, startOfDay, getYear, getMonth,
} from 'date-fns';
import { ChevronLeftIcon as ChevronLeft, ChevronRightIcon as ChevronRight } from '../../assets/icons';

/**
 * ThemedCalendarGrid — the sage-themed month grid shared by every date
 * picker in the app (the parent-facing slot calendar, the event date/time
 * picker, and the admin "pick a date" popovers). Pure date selection only —
 * callers that also need a time pick it alongside this, separately.
 *
 * Props:
 *   selected       — Date | null
 *   onSelect       — (date: Date) => void
 *   minDate        — Date, defaults to today
 *   maxDate        — Date | null
 *   availableDates — Set<"yyyy-MM-dd"> | undefined — optional booking-only
 *                     availability dots/legend; omit entirely outside the
 *                     booking flow
 *   loadingDates   — boolean
 *   onMonthChange  — (year: number, month: number) => void, called on mount
 *                     + navigation (optional)
 *   legend         — { available: string, noSlots: string } | undefined —
 *                     only rendered when availableDates is also passed
 *   noAvailabilityTitle — string, tooltip for a no-slots day
 *   weekdayLabels  — string[7], e.g. ["Su","Mo",...]
 *   locale         — date-fns locale object, for month-name formatting
 */
const ThemedCalendarGrid = ({
  selected,
  onSelect,
  minDate = null,
  maxDate = null,
  availableDates,
  loadingDates = false,
  onMonthChange,
  legend,
  noAvailabilityTitle,
  weekdayLabels,
  locale,
}) => {
  // No default floor at "today" — plenty of callers (a parent's date of
  // birth, a historical filter) need past dates too. Only restrict when the
  // caller explicitly passes minDate/maxDate.
  const [viewDate, setViewDate] = useState(selected || minDate || new Date());

  useEffect(() => {
    onMonthChange?.(getYear(viewDate), getMonth(viewDate) + 1);
  }, [viewDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(viewDate),     { weekStartsOn: 0 }),
  });

  const isDisabled = (day) =>
    (minDate !== null && isBefore(startOfDay(day), minDate)) ||
    (maxDate !== null && isAfter(startOfDay(day), maxDate));

  const canGoPrev = minDate === null || !isBefore(endOfMonth(subMonths(viewDate, 1)), minDate);
  const canGoNext = !maxDate || !isAfter(startOfMonth(addMonths(viewDate, 1)), maxDate);

  return (
    <div className="bg-white border border-[#E4E7E4] rounded-xl p-4 max-w-sm select-none">

      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewDate((v) => subMonths(v, 1))}
          disabled={!canGoPrev}
          className="p-1.5 rounded-lg text-gray-400 hover:text-[#445446] hover:bg-[#445446]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#1F2933]">
            {format(viewDate, 'MMMM yyyy', { locale })}
          </span>
          {loadingDates && (
            <div className="w-3 h-3 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          )}
        </div>

        <button
          type="button"
          onClick={() => setViewDate((v) => addMonths(v, 1))}
          disabled={!canGoNext}
          className="p-1.5 rounded-lg text-gray-400 hover:text-[#445446] hover:bg-[#445446]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Legend — only when the caller tracks availability (booking flow) */}
      {legend && availableDates !== undefined && !loadingDates && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#445446] inline-block" />
            {legend.available}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
            {legend.noSlots}
          </span>
        </div>
      )}

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {weekdayLabels.map((d, i) => (
          <div key={`${d}-${i}`} className="text-xs font-medium text-gray-400 text-center py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const outside    = !isSameMonth(day, viewDate);
          const disabled    = isDisabled(day);
          const isSelected  = selected && isSameDay(day, selected);
          const today       = isToday(day);
          const isoDay      = format(day, 'yyyy-MM-dd');

          // Availability state (only meaningful when the caller passed it in)
          const dataReady  = availableDates !== undefined && !loadingDates;
          const hasSlots   = dataReady && availableDates.has(isoDay);
          const noSlots    = dataReady && !disabled && !hasSlots;

          if (outside) {
            return <div key={day.toISOString()} className="h-9" />;
          }

          let btnCls =
            'w-9 h-9 mx-auto flex items-center justify-center rounded-lg text-sm transition-colors relative';

          if (isSelected) {
            btnCls += ' bg-[#445446] text-white font-semibold';
          } else if (disabled) {
            btnCls += ' text-gray-300 cursor-not-allowed';
          } else if (noSlots) {
            btnCls += ' text-gray-300 cursor-not-allowed';
          } else {
            btnCls += ' text-[#1F2933] cursor-pointer hover:bg-[#445446]/10 hover:text-[#445446]';
            if (today) btnCls += ' font-semibold';
          }

          return (
            <div key={day.toISOString()} className="flex items-center justify-center py-0.5">
              <button
                type="button"
                disabled={disabled || noSlots}
                onClick={() => onSelect(day)}
                className={btnCls}
                title={noSlots ? noAvailabilityTitle : undefined}
              >
                {format(day, 'd')}

                {/* Green dot — date has available slots */}
                {hasSlots && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#445446]" />
                )}

                {/* Today marker when not selected and has slots (or data not yet loaded) */}
                {today && !isSelected && !hasSlots && !noSlots && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#445446]" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ThemedCalendarGrid;
