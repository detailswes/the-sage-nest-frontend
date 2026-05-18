import { useState, useEffect } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths,
  isSameDay, isSameMonth, isToday, isAfter, isBefore,
  format, parseISO, startOfDay, getYear, getMonth,
} from 'date-fns';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function ChevronLeft() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

/**
 * BookingCalendar
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
  const selected = selectedDate ? parseISO(selectedDate) : null;
  const minDate  = minDateISO  ? parseISO(minDateISO)  : startOfDay(new Date());
  const maxDate  = maxDateISO  ? parseISO(maxDateISO)  : null;

  const [viewDate, setViewDate] = useState(selected || minDate);

  // Notify parent of the current view month on mount and every navigation
  useEffect(() => {
    onMonthChange?.(getYear(viewDate), getMonth(viewDate) + 1);
  }, [viewDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(viewDate),     { weekStartsOn: 0 }),
  });

  const isDisabled = (day) =>
    isBefore(startOfDay(day), minDate) ||
    (maxDate !== null && isAfter(startOfDay(day), maxDate));

  const canGoPrev = !isBefore(endOfMonth(subMonths(viewDate, 1)), minDate);
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
            {format(viewDate, 'MMMM yyyy')}
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

      {/* Legend */}
      {availableDates !== undefined && !loadingDates && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#445446] inline-block" />
            Available
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
            No slots
          </span>
        </div>
      )}

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-xs font-medium text-gray-400 text-center py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const outside    = !isSameMonth(day, viewDate);
          const disabled   = isDisabled(day);
          const isSelected = selected && isSameDay(day, selected);
          const today      = isToday(day);
          const isoDay     = format(day, 'yyyy-MM-dd');

          // Availability state (only meaningful when data has loaded and day is not disabled)
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
                onClick={() => onSelect(isoDay)}
                className={btnCls}
                title={noSlots ? 'No availability on this date' : undefined}
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

export default BookingCalendar;
