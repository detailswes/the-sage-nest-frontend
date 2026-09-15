import { useState } from "react";
import { useTranslation } from "react-i18next";

const CenteredDateInput = ({ value, onChange, className }) => {
  const [open, setOpen] = useState(false);
  const { t, i18n } = useTranslation("common");

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
          <div
            className="bg-white rounded-2xl p-5 shadow-2xl flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="date"
              value={value}
              onChange={(e) => { onChange(e); setOpen(false); }}
              className="border border-[#c5ceba] rounded-lg px-3 py-2 text-sm text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446]"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CenteredDateInput;
