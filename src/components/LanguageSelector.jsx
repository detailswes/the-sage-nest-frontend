import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { STORAGE_KEY } from '../i18n';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

const DROPDOWN_H = 96;  // approx height of 2-item dropdown
const DROPDOWN_W = 144; // w-36 = 144px

const LanguageSelector = () => {
  const { i18n } = useTranslation();
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
  };

  const dropdownPos = [
    dropUp   ? 'bottom-full mb-1' : 'top-full mt-1',
    dropRight ? 'right-0'         : 'left-0',
  ].join(' ');

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#5e6d5b] hover:text-[#445446] hover:bg-[#dfe2d7]/50 transition-all duration-150"
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
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
                <svg className="w-3 h-3 ml-auto text-[#445446]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
