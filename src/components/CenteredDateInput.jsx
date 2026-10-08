import { useState } from "react";
import { useTranslation } from "react-i18next";
import { it as dateFnsIt } from "date-fns/locale";
import { format } from "date-fns";
import ThemedCalendarGrid from "./calendar/ThemedCalendarGrid";

/**
 * CenteredDateInput — a single date field, opened as a centered popover on
 * click anywhere on the field. Shows the same sage-themed calendar grid used
 * throughout the app (BookingCalendar, the event date/time picker), rather
 * than the browser's native date picker.
 *
 * Props:
 *   value    — "YYYY-MM-DD" string | ""
 *   onChange — (e: { target: { value: string } }) => void — kept as an
 *              event-shaped callback so every existing caller (which all
 *              read e.target.value) needs no changes.
 *   min, max — Date, optional
 */
const CenteredDateInput = ({ value, onChange, className, min, max }) => {
  const [open, setOpen] = useState(false);
  const { t, i18n } = useTranslation("common");
  const weekdayLabels = t("calendar.weekdays", { returnObjects: true });
  const locale = i18n.language === "it" ? dateFnsIt : undefined;

  const display = value
    ? new Date(value + "T00:00:00").toLocaleDateString(i18n.language === "it" ? "it-IT" : "en-GB", {
        day: "numeric", month: "short", year: "numeric",
      })
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${className} text-left ${!display ? "text-gray-400" : "text-[#1F2933]"}`}
      >
        {display ?? t("datePlaceholder")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ThemedCalendarGrid
              selected={value ? new Date(value + "T00:00:00") : null}
              onSelect={(date) => {
                onChange({ target: { value: format(date, "yyyy-MM-dd") } });
                setOpen(false);
              }}
              minDate={min}
              maxDate={max ?? null}
              weekdayLabels={weekdayLabels}
              locale={locale}
            />
            <div className="flex justify-center mt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CenteredDateInput;
