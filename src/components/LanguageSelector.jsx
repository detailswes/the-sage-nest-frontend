import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { STORAGE_KEY } from '../i18n';
import { ChevronDownIcon, CheckIcon } from '../assets/icons';
import { useAuth } from '../context/AuthContext';
import { updateLanguageApi } from '../api/authApi';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

const DROPDOWN_H = 96;  // approx height of 2-item dropdown
const DROPDOWN_W = 144; // w-36 = 144px

const LanguageSelector = ({ variant = 'default' }) => {
  const { i18n } = useTranslation();
  const { user, updateUser } = useAuth() || {};
  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];
  const [open, setOpen]       = useState(false);
  const [dropUp, setDropUp]   = useState(false);
  const [dropRight, setDropRight] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropUp(window.innerHeight - rect.bottom < DROPDOWN_H + 8);
      setDropRight(window.innerWidth - rect.left < DROPDOWN_W + 8);
    }
    setOpen((v) => !v);
  };

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem(STORAGE_KEY, code);
    setOpen(false);

    // Persist as the user's durable preference (used for future emails, etc.)
    // once they're logged in — not changeable back by browser/locale detection.
    if (user) {
      updateUser({ language: code });
      updateLanguageApi(code).catch(() => {
        // Best-effort — the UI already reflects the choice via i18n/localStorage.
      });
    }
  };

  // Inline variant — tab-style row, no floating dropdown
  if (variant === 'inline') {
    return (
      <div className="flex rounded-xl bg-[#F5F7F5] border border-[#E4E7E4] p-1 gap-1">
        {LANGUAGES.map(({ code, label, flag }) => (
          <button
            key={code}
            type="button"
            onClick={() => handleSelect(code)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              code === current.code
                ? 'bg-[#445446] text-white shadow-sm'
                : 'text-gray-500 hover:text-[#1F2933]'
            }`}
          >
            <span className="text-base leading-none">{flag}</span>
            <span>{label}</span>
            {code === current.code && (
              <CheckIcon className="w-3.5 h-3.5 opacity-80" />
            )}
          </button>
        ))}
      </div>
    );
  }

  const dropdownPos = [
    dropUp   ? 'bottom-full mb-1' : 'top-full mt-1',
    dropRight ? 'right-0'         : 'left-0',
  ].join(' ');

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleToggle}
        className={
          variant === 'pill'
            ? "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#c5ceba] bg-[#dfe2d7]/60 text-[#445446] hover:bg-[#dfe2d7] transition-all duration-150 shadow-sm"
            : "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#5e6d5b] hover:text-[#445446] hover:bg-[#dfe2d7]/50 transition-all duration-150"
        }
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDownIcon className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute ${dropdownPos} w-36 bg-white rounded-xl border border-[#c5ceba] shadow-lg overflow-hidden z-50`}>
          {LANGUAGES.map(({ code, label, flag }) => (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                code === current.code
                  ? 'bg-[#dfe2d7]/50 text-[#445446]'
                  : 'text-[#5e6d5b] hover:bg-[#dfe2d7]/30 hover:text-[#445446]'
              }`}
            >
              <span className="text-base">{flag}</span>
              <span>{label}</span>
              {code === current.code && (
                <CheckIcon className="w-3 h-3 ml-auto text-[#445446]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
