import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// A date as free text, typed as DD/MM/YYYY — far quicker than paging a calendar
// across years (date of birth, insurance expiry). Slashes are inserted as the
// user types. Allowed range is set per use via min / max.

/** "YYYY-MM-DD" (or full ISO string) → "DD/MM/YYYY"; "" when empty/invalid. */
export function isoToDob(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

const dayNumber = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * "DD/MM/YYYY" → "YYYY-MM-DD" if it's a real calendar date within [min, max]
 * (both optional Dates, compared by day), else "".
 */
export function textToIso(text, { min, max } = {}) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return "";
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1) return "";
  const dt = Date.UTC(y, mo - 1, d);
  const check = new Date(dt);
  // Rejects 31/02, 29/02 in a non-leap year, etc. (Date would roll them over).
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return "";
  if (min && dt < dayNumber(min)) return "";
  if (max && dt > dayNumber(max)) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// Digits only, max 8, with slashes inserted after day and month.
function maskDob(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Props:
 *   value    — "YYYY-MM-DD" | ""
 *   onChange — ({ target: { value } }) — ISO string once the typed date is
 *              complete and valid, "" otherwise (same shape as CenteredDateInput).
 *   min, max — Date, optional allowed range (inclusive, by day)
 *   invalidKey — common-namespace i18n key for the "invalid date" message
 */
const DateTextInput = ({ value, onChange, className, id, min, max, invalidKey = "dateInvalid", autoComplete }) => {
  const { t } = useTranslation("common");
  const [text, setText] = useState(isoToDob(value));
  const [touched, setTouched] = useState(false);

  // Follow external changes (e.g. the form loading saved data), but never
  // overwrite what the user is mid-way through typing.
  useEffect(() => {
    if ((value || "") !== textToIso(text, { min, max })) setText(isoToDob(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handle = (e) => {
    const masked = maskDob(e.target.value);
    setText(masked);
    onChange({ target: { value: textToIso(masked, { min, max }) } });
  };

  const invalid = touched && text.length > 0 && !textToIso(text, { min, max });

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete={autoComplete}
        maxLength={10}
        value={text}
        onChange={handle}
        onBlur={() => setTouched(true)}
        placeholder={t("datePlaceholder")}
        className={className}
      />
      {invalid && <p className="mt-1.5 text-xs text-red-500">{t(invalidKey)}</p>}
    </>
  );
};

export default DateTextInput;
