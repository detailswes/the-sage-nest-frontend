import { useTranslation } from 'react-i18next';
import { STORAGE_KEY } from '../i18n';

const LANGUAGES = [
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'it', label: 'IT', flag: '🇮🇹' },
];

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const current = i18n.language;

  const handleChange = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem(STORAGE_KEY, code);
  };

  return (
    <div className="flex items-center gap-1 px-1">
      {LANGUAGES.map(({ code, label, flag }) => (
        <button
          key={code}
          onClick={() => handleChange(code)}
          title={code === 'en' ? 'English' : 'Italiano'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
            current === code
              ? 'bg-[#445446]/10 text-[#445446]'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span>{flag}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSelector;
