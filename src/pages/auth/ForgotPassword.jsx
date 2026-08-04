import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import AuthLayout from '../../components/auth/AuthLayout';
import { forgotPasswordApi } from '../../api/authApi';
import { EnvelopeIcon, LockStrokeIcon } from '../../assets/icons';
import { validateEmail } from '../../utils/validation';

const ForgotPassword = () => {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    if (!email.trim()) return t('forgotPassword.emailRequired');
    if (!validateEmail(email)) return t('forgotPassword.emailInvalid');
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const err = validate();
    if (err) { setEmailError(err); return; }
    setEmailError('');
    setLoading(true);
    try {
      await forgotPasswordApi(email.trim());
      setSent(true);
    } catch (err) {
      const code = err?.response?.status;
      if (code === 429) {
        setServerError(t('forgotPassword.rateLimited'));
      } else {
        setServerError(t('forgotPassword.genericError'));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Email sent state ─────────────────────────────────────────────────────────
  if (sent) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#445446]/10 flex items-center justify-center mx-auto mb-5">
            <EnvelopeIcon className="w-8 h-8 text-[#445446]" />
          </div>
          <h1 className="text-2xl font-semibold text-[#1F2933] mb-2">{t('forgotPassword.sent.title')}</h1>
          <p className="text-sm text-gray-500 mb-1">{t('forgotPassword.sent.ifAccountExists')}</p>
          <p className="text-sm font-semibold text-[#1F2933] mb-5">{email}</p>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            <Trans
              i18nKey="forgotPassword.sent.body"
              ns="auth"
              components={[<span className="font-medium text-red-600" />]}
            />
          </p>
          <div className="bg-[#F5F7F5] rounded-xl border border-[#E4E7E4] p-4 text-left mb-6">
            <p className="text-xs font-medium text-[#1F2933] mb-1">{t('forgotPassword.sent.cantFind')}</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              {t('forgotPassword.sent.spamNote')}{' '}
              <span className="font-medium">"{t('forgotPassword.sent.subjectLine')}"</span>.
            </p>
          </div>
          <Link to="/login" className="text-sm text-[#445446] font-medium hover:underline">
            {t('forgotPassword.sent.backToSignIn')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ── Form state ───────────────────────────────────────────────────────────────
  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#445446]/10 flex items-center justify-center mx-auto mb-4">
          <LockStrokeIcon className="w-7 h-7 text-[#445446]" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1F2933] mb-1">{t('forgotPassword.title')}</h1>
        <p className="text-sm text-gray-500">
          {t('forgotPassword.subtitle')}
        </p>
      </div>

      {serverError && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#1F2933] mb-1.5">
            {t('forgotPassword.emailLabel')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(''); setServerError(''); }}
            placeholder={t('forgotPassword.emailPlaceholder')}
            className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
              emailError ? 'border-red-400' : 'border-[#E4E7E4]'
            }`}
          />
          {emailError && <p className="mt-1.5 text-xs text-red-500">{emailError}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors text-sm"
        >
          {loading ? t('forgotPassword.submittingBtn') : t('forgotPassword.submitBtn')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t('forgotPassword.rememberedIt')}{' '}
        <Link to="/login" className="text-[#445446] font-medium hover:underline">
          {t('forgotPassword.backToSignIn')}
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ForgotPassword;
