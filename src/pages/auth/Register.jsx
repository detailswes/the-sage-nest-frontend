import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthLayout from '../../components/auth/AuthLayout';
import PasswordInput from '../../components/auth/PasswordInput';
import useAuthForm from '../../hooks/useAuthForm';
import { validateRegisterForm, checkPasswordStrength } from '../../utils/validation';
import { registerUser } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import useResendVerification from '../../hooks/useResendVerification';

const ROLE_KEYS = ['EXPERT', 'PARENT'];

const Register = () => {
  const { t }  = useTranslation('auth');
  const { t: tConsent } = useTranslation('parentBookings');
  const { login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [emailSent, setEmailSent] = useState(null); // { email }
  const { resend, status: resendStatus, countdown } = useResendVerification();

  const roleParam = searchParams.get('user')?.toUpperCase();
  const activeRole = ROLE_KEYS.includes(roleParam) ? roleParam : 'EXPERT';

  const handleTabChange = (roleKey) => setSearchParams({ user: roleKey });

  const {
    form,
    errors,
    setErrors,
    loading,
    setLoading,
    serverError,
    setServerError,
    handleChange,
  } = useAuthForm({ name: '', email: '', password: '', confirmPassword: '', phone: '' });

  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted]                 = useState(false);
  const [marketingConsent, setMarketingConsent]           = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const rawErrors = validateRegisterForm({ ...form, role: activeRole });
    if (Object.keys(rawErrors).length > 0) {
      setErrors(Object.fromEntries(Object.entries(rawErrors).map(([k, v]) => [k, t(v)])));
      return;
    }

    if (!privacyPolicyAccepted) {
      setErrors((prev) => ({ ...prev, privacyPolicy: tConsent('consentLabels.privacyRequired') }));
      return;
    }
    if (!termsAccepted) {
      setErrors((prev) => ({ ...prev, termsConditions: tConsent('consentLabels.termsRequired') }));
      return;
    }

    setLoading(true);
    try {
      const detectedTz = (() => {
        try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; }
      })();

      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: activeRole,
        privacyPolicyAccepted: true,
        termsAccepted: true,
        marketingConsent,
        timezone: detectedTz,
      };
      if (activeRole === 'PARENT') payload.phone = form.phone.trim();

      const data = await registerUser(payload);

      if (data.verification_email_sent) {
        setEmailSent({ email: data.email });
      } else {
        login(data);
      }
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        t('register.defaultError');
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Email sent state ────────────────────────────────────────────────────────
  if (emailSent) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#445446]/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-[#445446]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-[#1F2933] mb-2">{t('emailSent.title')}</h1>
          <p className="text-sm text-gray-500 mb-1">{t('emailSent.sentTo')}</p>
          <p className="text-sm font-semibold text-[#1F2933] mb-6">{emailSent.email}</p>

          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            {t('emailSent.body')}
          </p>

          <div className="bg-[#F5F7F5] rounded-xl border border-[#E4E7E4] p-4 text-left mb-5">
            <p className="text-xs font-medium text-[#1F2933] mb-1">{t('emailSent.cantFind')}</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              {t('emailSent.spamNote')}{' '}
              <span className="font-medium">"{t('emailSent.subjectLine')}"</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => resend(emailSent.email)}
            disabled={resendStatus === 'sending' || countdown > 0}
            className="w-full mb-5 py-2.5 px-4 rounded-lg border border-[#445446]/30 text-sm font-medium text-[#445446] bg-white hover:bg-[#445446]/5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {resendStatus === 'sending' && t('emailSent.sendingBtn')}
            {resendStatus === 'sent' && countdown > 0 && t('emailSent.resentBtn', { count: countdown })}
            {resendStatus === 'error' && t('emailSent.errorBtn')}
            {(resendStatus === 'idle' || (resendStatus === 'sent' && countdown === 0)) && t('emailSent.resendBtn')}
          </button>

          {resendStatus === 'sent' && countdown > 0 && (
            <p className="text-xs text-green-600 mb-4">{t('emailSent.resentNote')}</p>
          )}

          <Link to="/login" className="text-sm text-[#445446] font-medium hover:underline">
            {t('emailSent.backToSignIn')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const submitLabel = loading
    ? t('register.submittingBtn')
    : t('register.submitBtn', {
        role: t(activeRole === 'EXPERT' ? 'register.expertRole' : 'register.parentRole'),
      });

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-[#1F2933] text-center mb-2">
        {t('register.title')}
      </h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        {t('register.subtitle')}
      </p>

      {/* Role Tabs */}
      <div className="mb-5">
        <div className="flex rounded-xl bg-[#F5F7F5] border border-[#E4E7E4] p-1">
          {ROLE_KEYS.map((roleKey) => {
            const isActive = activeRole === roleKey;
            return (
              <button
                key={roleKey}
                type="button"
                onClick={() => handleTabChange(roleKey)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#445446] text-white shadow-sm'
                    : 'text-gray-500 hover:text-[#1F2933]'
                }`}
              >
                {t(`register.roles.${roleKey}.label`)}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 text-center mt-2.5">
          {t(`register.roles.${activeRole}.description`)}
        </p>
      </div>

      {serverError && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Full name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[#1F2933] mb-1.5">
            {t('register.fullNameLabel')}
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder={t('register.fullNamePlaceholder')}
            className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
              errors.name ? 'border-red-400' : 'border-[#E4E7E4]'
            }`}
          />
          {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#1F2933] mb-1.5">
            {t('register.emailLabel')}
          </label>
          <input
            id="email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder={t('register.emailPlaceholder')}
            className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
              errors.email ? 'border-red-400' : 'border-[#E4E7E4]'
            }`}
          />
          {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
        </div>

        {/* Phone — Parent only */}
        {activeRole === 'PARENT' && (
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-[#1F2933] mb-1.5">
              {t('register.phoneLabel')}
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder={t('register.phonePlaceholder')}
              className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
                errors.phone ? 'border-red-400' : 'border-[#E4E7E4]'
              }`}
            />
            {errors.phone && <p className="mt-1.5 text-xs text-red-500">{errors.phone}</p>}
          </div>
        )}

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#1F2933] mb-1.5">
            {t('register.passwordLabel')}
          </label>
          <PasswordInput
            id="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder={t('register.passwordPlaceholder')}
            hasError={!!errors.password}
          />
          {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
          {/* Live strength checklist */}
          {form.password && (
            <ul className="mt-2 space-y-1">
              {checkPasswordStrength(form.password).map(({ key, ok }) => (
                <li key={key} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                  {ok ? (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-4.75a.75.75 0 0 0 1.5 0V8.75a.75.75 0 0 0-1.5 0v4.5Zm.75-7a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                    </svg>
                  )}
                  {t(key)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1F2933] mb-1.5">
            {t('register.confirmPasswordLabel')}
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder={t('register.confirmPasswordPlaceholder')}
            hasError={!!errors.confirmPassword}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Required consents + optional marketing */}
        <div className="space-y-3 pt-1">
          {/* Privacy Policy — required */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={privacyPolicyAccepted}
              onChange={(e) => {
                setPrivacyPolicyAccepted(e.target.checked);
                if (e.target.checked) setErrors((prev) => { const { privacyPolicy: _, ...rest } = prev; return rest; });
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#445446] focus:ring-[#445446]/30"
            />
            <span className="text-sm text-[#1F2933] leading-snug">
              {tConsent('consentLabels.privacyPrefix')}{' '}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#445446] font-medium underline">
                {tConsent('consentLabels.privacyLink')}
              </a>
              <span className="text-red-500 ml-0.5">*</span>
            </span>
          </label>
          {errors.privacyPolicy && (
            <p className="text-xs text-red-500 -mt-1 ml-7">{errors.privacyPolicy}</p>
          )}

          {/* Terms & Conditions — required */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked) setErrors((prev) => { const { termsConditions: _, ...rest } = prev; return rest; });
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#445446] focus:ring-[#445446]/30"
            />
            <span className="text-sm text-[#1F2933] leading-snug">
              {tConsent('consentLabels.termsPrefix')}{' '}
              <a href="/terms-conditions" target="_blank" rel="noopener noreferrer" className="text-[#445446] font-medium underline">
                {tConsent('consentLabels.termsLink')}
              </a>
              <span className="text-red-500 ml-0.5">*</span>
            </span>
          </label>
          {errors.termsConditions && (
            <p className="text-xs text-red-500 -mt-1 ml-7">{errors.termsConditions}</p>
          )}

          {/* Marketing consent — optional */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#445446] focus:ring-[#445446]/30"
            />
            <span className="text-sm text-gray-500 leading-snug">
              {tConsent('consentLabels.marketingOptIn')}
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !privacyPolicyAccepted || !termsAccepted}
          className="w-full bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors duration-200 text-sm mt-2"
        >
          {submitLabel}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t('register.hasAccount')}{' '}
        <Link to="/login" className="text-[#445446] font-medium hover:underline">
          {t('register.signIn')}
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Register;
