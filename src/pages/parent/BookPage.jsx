import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation, Trans } from 'react-i18next';
import { STORAGE_KEY } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { useGetExpertPublicQuery } from '../../api/expertApi';
import {
  useGetAvailableSlotsQuery,
  useGetAvailableDatesInMonthQuery,
  useCreateBookingMutation,
  useGetCurrentTcVersionQuery,
  useAcceptTcMutation,
  useLockSlotMutation,
  useReleaseLockMutation,
} from '../../api/bookingApi';
import { loginUser, registerUser, verifyOtpApi } from '../../api/authApi';
import { getProfileImageUrl } from '../../utils/imageUrl';
import { validateLoginForm, validateRegisterForm, checkPasswordStrength } from '../../utils/validation';
import PasswordInput from '../../components/auth/PasswordInput';
import useResendVerification from '../../hooks/useResendVerification';
import BookingCalendar from '../../components/booking/BookingCalendar';
import CancellationPolicy from '../../components/booking/CancellationPolicy';

const WEBFLOW_DIRECTORY_URL   = process.env.REACT_APP_WEBFLOW_DIRECTORY_URL   || 'https://the-sage-nest.webflow.io/experts';
const WEBFLOW_EXPERT_BASE_URL = process.env.REACT_APP_WEBFLOW_EXPERT_BASE_URL || 'https://the-sage-nest.webflow.io/experts';

// ─── Steps ───────────────────────────────────────────────────────────────────
const STEPS = { SERVICE: 'service', SLOT: 'slot', CONFIRM: 'confirm' };

// ─── Step indicator ───────────────────────────────────────────────────────────
const StepIndicator = ({ step }) => {
  const { t } = useTranslation('parentBookings');
  const steps = [
    { key: STEPS.SERVICE, label: t('steps.service') },
    { key: STEPS.SLOT,    label: t('steps.time') },
    { key: STEPS.CONFIRM, label: t('steps.confirm') },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-start w-full mb-8">
      {steps.flatMap((s, i) => {
        const done   = i < currentIndex;
        const active = i === currentIndex;
        const els = [
          <div key={s.key} className="flex flex-col items-center flex-shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              done   ? 'bg-[#445446] text-white'
              : active ? 'bg-[#445446] text-white ring-4 ring-[#445446]/20'
              : 'bg-[#E4E7E4] text-gray-400'
            }`}>
              {done ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            <span className={`text-xs mt-1 font-medium ${active ? 'text-[#445446]' : done ? 'text-[#445446]' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>,
        ];
        if (i < steps.length - 1) {
          els.push(
            <div key={`line-${i}`}
              className={`flex-1 h-px mt-3.5 mx-2 transition-colors ${done ? 'bg-[#445446]' : 'bg-[#E4E7E4]'}`} />
          );
        }
        return els;
      })}
    </div>
  );
};

// ─── T&C modal ───────────────────────────────────────────────────────────────
const TcModal = ({ isFirstBooking, onAccept, onDecline }) => {
  const { t } = useTranslation('parentBookings');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl border border-[#E4E7E4] shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[#1F2933] mb-2">
            {isFirstBooking ? t('tcModal.titleFirst') : t('tcModal.titleUpdated')}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            {isFirstBooking ? t('tcModal.bodyFirst') : t('tcModal.bodyUpdated')}
          </p>
        </div>
        <div className="bg-[#F5F7F5] rounded-xl border border-[#E4E7E4] p-4 mb-6 text-sm text-gray-600 leading-relaxed">
          <Trans i18nKey="tcModal.readFull" ns="parentBookings" components={[
            // eslint-disable-next-line jsx-a11y/anchor-has-content
            <a href="/terms-conditions" target="_blank" rel="noopener noreferrer" className="text-[#445446] font-medium underline" />,
          ]} />
        </div>
        <button onClick={onAccept} className="w-full py-3 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-lg transition-colors mb-3">
          {t('tcModal.acceptBtn')}
        </button>
        <button onClick={onDecline} className="w-full py-2 px-4 text-sm text-gray-500 hover:text-[#1F2933] transition-colors">
          {t('tcModal.cancelBtn')}
        </button>
      </div>
    </div>
  );
};

// ─── Verification pending panel ───────────────────────────────────────────────
const VerificationPendingPanel = ({ email, returnTo, onSwitchToLogin }) => {
  const { resend, status, countdown } = useResendVerification();
  return (
    <div className="text-center py-2">
      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-[#1F2933] mb-2">Check your inbox</h3>
      <p className="text-sm text-gray-500 mb-1">We sent a verification link to</p>
      <p className="text-sm font-medium text-[#1F2933] mb-5 break-all">{email}</p>
      <p className="text-xs text-gray-400 leading-relaxed mb-5">
        Click the link in the email to verify your account — you'll be returned here to complete your booking.
      </p>
      {status === 'sent' && countdown > 0 ? (
        <div className="w-full mb-3 py-2.5 px-4 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 text-center">
          Email sent! Resend available in {countdown}s.
        </div>
      ) : (
        <button
          onClick={() => resend(email, returnTo)}
          disabled={status === 'sending' || countdown > 0}
          className="w-full mb-3 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:border-[#445446] hover:text-[#445446] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === 'sending' ? 'Sending…' : status === 'error' ? 'Failed — try again' : 'Resend verification email'}
        </button>
      )}
      <button
        onClick={onSwitchToLogin}
        className="w-full py-2 text-sm text-[#445446] font-medium hover:underline"
      >
        Already verified? Sign in
      </button>
    </div>
  );
};

// ─── Cluster badges ───────────────────────────────────────────────────────────
const CLUSTER_BADGE = {
  FOR_PARENTS: { label: 'For the Parents', cls: 'bg-pink-100 text-pink-700' },
  FOR_BABY:    { label: 'For the Baby',    cls: 'bg-cyan-100 text-cyan-700' },
  PACKAGE:     { label: 'Package',         cls: 'bg-amber-100 text-amber-700' },
  GIFT:        { label: 'Gift',            cls: 'bg-green-100 text-green-700' },
  EVENT:       { label: 'Event',           cls: 'bg-violet-100 text-violet-700' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatPrice(price, currency = 'EUR', lng = 'en') {
  return new Intl.NumberFormat(lng === 'it' ? 'it' : 'en', { style: 'currency', currency }).format(Number(price));
}

function formatDuration(mins, t = null) {
  if (!t) {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }
  if (mins < 60) return t('slotStep.duration.minutes', { count: mins });
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? t('slotStep.duration.hoursMinutes', { h, m }) : t('slotStep.duration.hours', { h });
}

function formatSlotTime(isoString, lng = 'en') {
  return new Date(isoString).toLocaleTimeString(lng === 'it' ? 'it-IT' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatSlotDate(isoString, lng = 'en') {
  return new Date(isoString).toLocaleDateString(lng === 'it' ? 'it-IT' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function maxDate(days) {
  if (!days) return undefined;
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const DESCRIPTION_WORD_LIMIT = 20;
function truncateWords(text, limit) {
  const words = text.split(' ');
  if (words.length <= limit) return { short: text, truncated: false };
  return { short: words.slice(0, limit).join(' ') + '…', truncated: true };
}

// ─── Expert header (SERVICE step only) ───────────────────────────────────────
const ExpertHeader = ({ expert }) => {
  const [imgSrc, setImgSrc] = useState(getProfileImageUrl(expert?.profile_image));
  const initials = expert?.user?.name
    ? expert.user.name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="flex items-center gap-3 mb-6">
      {imgSrc ? (
        <img src={imgSrc} alt={expert?.user?.name} onError={() => setImgSrc(null)}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-[#445446] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 select-none">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <p className="font-semibold text-[#1F2933]">{expert?.user?.name}</p>
        {expert?.position && <p className="text-sm text-[#445446]">{expert.position}</p>}
      </div>
    </div>
  );
};

// ─── Inline Login form ────────────────────────────────────────────────────────
const InlineLogin = ({ onSuccess, onVerificationNeeded }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [otpToken, setOtpToken] = useState(null);
  const [otp, setOtp]           = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = validateLoginForm({ email, password });
    if (Object.keys(errs).length) { setError(errs.email || errs.password || 'Invalid credentials'); return; }
    setLoading(true); setError('');
    try {
      const data = await loginUser({ email, password });
      if (data.otp_token) { setOtpToken(data.otp_token); }
      else { login(data); onSuccess(); }
    } catch (err) {
      if (err?.response?.data?.email_not_verified && onVerificationNeeded) {
        onVerificationNeeded(email);
      } else {
        setError(err?.response?.data?.error || 'Login failed. Please try again.');
      }
    } finally { setLoading(false); }
  };

  const handleOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setOtpError('Enter your 6-digit code'); return; }
    setOtpLoading(true); setOtpError('');
    try {
      const data = await verifyOtpApi({ otp_token: otpToken, code: otp });
      login(data); onSuccess();
    } catch (err) {
      setOtpError(err?.response?.data?.error || 'Incorrect code. Please try again.');
    } finally { setOtpLoading(false); }
  };

  if (otpToken) {
    return (
      <form onSubmit={handleOtp} className="space-y-3">
        <p className="text-sm text-gray-600">Enter the 6-digit code sent to your email.</p>
        <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000" maxLength={6}
          className="w-full px-4 py-3 rounded-lg border border-[#E4E7E4] text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446]" />
        {otpError && <p className="text-xs text-red-600">{otpError}</p>}
        <button type="submit" disabled={otpLoading}
          className="w-full py-3 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
          {otpLoading ? 'Verifying…' : 'Verify & continue'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
          className="w-full px-4 py-3 rounded-lg border border-[#E4E7E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446]" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full py-3 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
        {loading ? 'Signing in…' : 'Sign in & continue'}
      </button>
    </form>
  );
};

// ─── Inline Register form ─────────────────────────────────────────────────────
const InlineRegister = ({ onVerificationSent, returnTo }) => {
  const { t } = useTranslation('parentBookings');
  const { t: tAuth } = useTranslation('auth');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateRegisterForm({ ...form, role: 'PARENT' });
    if (!privacyAccepted) errs.privacyPolicy = t('consentLabels.privacyRequired');
    if (!termsAccepted)   errs.termsConditions = t('consentLabels.termsRequired');
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setServerError('');
    try {
      const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } })();
      await registerUser({
        name: form.name, email: form.email, password: form.password,
        role: 'PARENT', phone: form.phone.trim(),
        privacyPolicyAccepted: true, termsAccepted: true,
        marketingConsent: marketing, timezone: tz,
        returnTo,
      });
      onVerificationSent(form.email);
    } catch (err) {
      if (err?.response?.status === 409) {
        setServerError('This email is already registered. Check your inbox for a verification link, or sign in instead.');
      } else {
        setServerError(err?.response?.data?.error || 'Registration failed. Please try again.');
      }
    } finally { setLoading(false); }
  };

  const field = (id, label, type = 'text', placeholder = '') => (
    <div key={id}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} name={id} value={form[id]} onChange={handleChange} placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${errors[id] ? 'border-red-400' : 'border-[#E4E7E4]'}`} />
      {errors[id] && <p className="text-xs text-red-500 mt-0.5">{errors[id]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {field('name', 'Full name', 'text', 'Jane Smith')}
      {field('email', 'Email', 'email', 'you@example.com')}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
        <PasswordInput name="password" value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Create a password" hasError={!!errors.password} />
        {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password}</p>}
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
                {tAuth(key)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Confirm password</label>
        <PasswordInput name="confirmPassword" value={form.confirmPassword}
          onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="Repeat password" hasError={!!errors.confirmPassword} />
        {errors.confirmPassword && <p className="text-xs text-red-500 mt-0.5">{errors.confirmPassword}</p>}
      </div>
      {field('phone', 'Phone number', 'tel', '+45 12 34 56 78')}

      <div className="space-y-2 pt-1">
        {[
          { id: 'terms',   checked: termsAccepted,   onChange: () => setTermsAccepted((v) => !v),   label: <>{t('consentLabels.termsPrefix')} <a href="/terms-conditions" target="_blank" rel="noopener noreferrer" className="text-[#445446] underline">{t('consentLabels.termsLink')}</a></>, err: errors.termsConditions },
          { id: 'privacy', checked: privacyAccepted, onChange: () => setPrivacyAccepted((v) => !v), label: <>{t('consentLabels.privacyPrefix')} <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#445446] underline">{t('consentLabels.privacyLink')}</a></>,           err: errors.privacyPolicy },
          { id: 'mkt',     checked: marketing,       onChange: () => setMarketing((v) => !v),       label: t('consentLabels.marketingOptInShort') },
        ].map(({ id, checked, onChange, label, err }) => (
          <div key={id}>
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 accent-[#445446] flex-shrink-0" />
              <span className="text-xs text-gray-600 leading-relaxed">{label}</span>
            </label>
            {err && <p className="text-xs text-red-500 ml-5">{err}</p>}
          </div>
        ))}
      </div>

      {serverError && <p className="text-xs text-red-600">{serverError}</p>}
      <button type="submit" disabled={loading}
        className="w-full py-3 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
        {loading ? 'Creating account…' : 'Create account & continue'}
      </button>
    </form>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const BookPage = () => {
  const navigate               = useNavigate();
  const { state: locationState } = useLocation();
  const [searchParams]         = useSearchParams();
  const { t, i18n }            = useTranslation('parentBookings');
  const { user }               = useAuth();
  const lng                    = i18n.language;

  const expertIdParam  = searchParams.get('expertId');
  const serviceIdParam = searchParams.get('serviceId');
  const returnUrlParam = searchParams.get('return_url');
  const slotStartParam = searchParams.get('slotStart');
  const formatParam    = searchParams.get('format');
  const langParam      = searchParams.get('lang');

  // Apply ?lang= URL param on first render so Webflow can pre-set the language
  useEffect(() => {
    if (langParam && ['en', 'it'].includes(langParam) && i18n.language !== langParam) {
      i18n.changeLanguage(langParam);
      localStorage.setItem(STORAGE_KEY, langParam);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [effectiveReturnUrl, setEffectiveReturnUrl] = useState(returnUrlParam || WEBFLOW_DIRECTORY_URL);
  const fromPastBookings = !!locationState?.restore?.fromPastBookings;

  const [step,            setStep]           = useState(STEPS.SERVICE);
  const [error,           setError]          = useState('');

  const [selectedExpert,  setSelectedExpert]  = useState(() => locationState?.restore?.expert || null);
  const [expertDetail,    setExpertDetail]    = useState(() => locationState?.restore?.expert || null);
  const [selectedService, setSelectedService] = useState(() => locationState?.restore?.service || null);
  const [selectedDate,    setSelectedDate]    = useState(todayISO());
  const [selectedSlot,    setSelectedSlot]    = useState(null);
  const [selectedFormat,  setSelectedFormat]  = useState(() => locationState?.restore?.format || 'ONLINE');
  const [monthArgs,       setMonthArgs]       = useState(null);
  const [expandedDesc,    setExpandedDesc]    = useState({});

  // Confirm + payment state
  const [authTab,              setAuthTab]              = useState('register');
  const [tcAcceptanceRequired, setTcAcceptanceRequired] = useState(false);
  const [tcIsFirstBooking,     setTcIsFirstBooking]     = useState(false);
  const [tcModalOpen,          setTcModalOpen]          = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(null);

  // Slot lock
  const [lockId,        setLockId]        = useState(null);
  const [lockExpiresAt, setLockExpiresAt] = useState(null);
  const lockIdRef    = useRef(null);
  const continueRef  = useRef(null);
  // Tracks first-time data population from expert query
  const expertInitialized = useRef(false);

  // ── RTK mutations ─────────────────────────────────────────────────────────
  const [lockSlotFn, { isLoading: locking }] = useLockSlotMutation();
  const [releaseLock]                        = useReleaseLockMutation();
  const [createBooking, { isLoading: creating }] = useCreateBookingMutation();
  const [acceptTcFn]                         = useAcceptTcMutation();

  // ── RTK queries ───────────────────────────────────────────────────────────
  // Expert public profile — skip when restore path or no expertId
  const {
    data: fetchedExpert,
    isLoading: expertLoading,
    isError: expertIsError,
  } = useGetExpertPublicQuery(
    Number(expertIdParam),
    { skip: !expertIdParam || !!locationState?.restore }
  );

  // Available slots — only fetch when on SLOT step
  const {
    data: slots = [],
    isFetching: slotsLoading,
    refetch: refetchSlots,
  } = useGetAvailableSlotsQuery(
    { expertId: selectedExpert?.id, date: selectedDate, serviceId: selectedService?.id },
    { skip: step !== STEPS.SLOT || !selectedExpert || !selectedService }
  );

  // Available dates for calendar month navigation
  const { data: availableDatesRaw, isFetching: loadingDates } = useGetAvailableDatesInMonthQuery(
    monthArgs,
    { skip: !monthArgs }
  );
  const availableDates = useMemo(
    () => (availableDatesRaw ? new Set(availableDatesRaw) : undefined),
    [availableDatesRaw]
  );

  // T&C version — skip until user is authenticated; refetch after inline auth
  const { data: tcData, refetch: refetchTc } = useGetCurrentTcVersionQuery(undefined, {
    skip: !user,
  });

  // ── Derive loading/error from query state ─────────────────────────────────
  const loading = !locationState?.restore && !!expertIdParam && expertLoading;

  // ── Init effects ──────────────────────────────────────────────────────────

  // Handle restore path and missing expertId on mount
  useEffect(() => {
    sessionStorage.removeItem('sage_booking_ctx');
    if (locationState?.restore) {
      const { expert, service, format: fmt } = locationState.restore;
      if (expert && service) setStep(STEPS.SLOT);
      if (fmt) setSelectedFormat(fmt);
      return;
    }
    if (!expertIdParam) {
      setError('No expert specified. Please start from the expert directory.');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Populate state from fetched expert (runs once on first successful fetch)
  useEffect(() => {
    if (!fetchedExpert || expertInitialized.current) return;
    expertInitialized.current = true;

    setSelectedExpert(fetchedExpert);
    setExpertDetail(fetchedExpert);

    if (!returnUrlParam && fetchedExpert.webflow_slug) {
      setEffectiveReturnUrl(`${WEBFLOW_EXPERT_BASE_URL}/${fetchedExpert.webflow_slug}`);
    }
    if (serviceIdParam) {
      const svc = (fetchedExpert.services || []).find(
        (s) => String(s.id) === String(serviceIdParam),
      );
      if (svc) {
        setSelectedService(svc);
        const fmt = formatParam || svc.format;
        if (fmt) setSelectedFormat(fmt);
        if (slotStartParam) {
          setSelectedSlot({ start: slotStartParam });
          setStep(STEPS.CONFIRM);
        }
      }
    }
  }, [fetchedExpert]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync error from expert query failure
  useEffect(() => {
    if (expertIsError) setError('Could not load expert. Please try again.');
  }, [expertIsError]);

  // Sync T&C state from query (re-runs when user logs in and query fetches)
  useEffect(() => {
    if (!tcData) return;
    setTcAcceptanceRequired(!!tcData.version_updated);
    setTcIsFirstBooking(!!tcData.is_first_booking);
  }, [tcData]);

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (lockIdRef.current) {
        releaseLock(lockIdRef.current).catch(() => {});
        lockIdRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Release any held lock and reset selected slot when date/service changes on SLOT step
  useEffect(() => {
    if (step !== STEPS.SLOT) return;
    setSelectedSlot(null);
    if (lockIdRef.current) {
      releaseLock(lockIdRef.current).catch(() => {});
      lockIdRef.current = null;
      setLockId(null); setLockExpiresAt(null);
    }
  }, [step, selectedDate, selectedService?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock countdown
  useEffect(() => {
    if (!lockExpiresAt) return;
    const tick = () => {
      const secs = Math.max(0, Math.round((lockExpiresAt.getTime() - Date.now()) / 1000));
      if (secs === 0) {
        lockIdRef.current = null;
        setLockId(null); setLockExpiresAt(null); toast.error(t('slotStep.lockExpired'));
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockExpiresAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to top on every step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  // Unauthenticated: scroll to Continue as soon as a slot is selected
  useEffect(() => {
    if (selectedSlot && !user && continueRef.current) {
      continueRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedSlot]); // eslint-disable-line react-hooks/exhaustive-deps

  // Authenticated: scroll only after the lock confirms the slot is available
  useEffect(() => {
    if (lockId && step === STEPS.SLOT && continueRef.current) {
      continueRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [lockId, step]);

  // ── Callbacks ─────────────────────────────────────────────────────────────

  const fetchAvailableDates = useCallback((year, month) => {
    if (!selectedExpert) return;
    setMonthArgs({ expertId: selectedExpert.id, year, month, serviceId: selectedService?.id });
  }, [selectedExpert, selectedService?.id]);

  // ── Slot lock ─────────────────────────────────────────────────────────────
  // slotArg: pass slot directly from click handler to avoid reading stale state.
  const lockSlot = async (slotArg = null) => {
    const slot = slotArg || selectedSlot;
    if (!slot) return null;
    try {
      const { lockId: id, expiresAt } = await lockSlotFn({
        expertId: selectedExpert.id, slotStart: slot.start,
      }).unwrap();
      lockIdRef.current = id;
      setLockId(id); setLockExpiresAt(new Date(expiresAt));
      return id;
    } catch (err) {
      if (err?.status === 409) {
        toast.error(t('slotStep.slotUnavailable'));
        setSelectedSlot(null);
      } else {
        toast.error(t('slotStep.lockError'));
      }
      return null;
    }
  };

  // ── Proceed to payment (lock → createBooking → checkout) ─────────────────
  const doCheckout = async (existingLockId) => {
    try {
      const lid = existingLockId || (await lockSlot());
      if (!lid) return;

      const result = await createBooking({
        expertId: selectedExpert.id, serviceId: selectedService.id,
        scheduledAt: selectedSlot.start, format: selectedFormat, lockId: lid,
      }).unwrap();
      lockIdRef.current = null;
      setLockId(null); setLockExpiresAt(null);

      const detail = expertDetail || selectedExpert;
      const sessionLocation = selectedFormat === 'IN_PERSON'
        ? [detail?.address_street, detail?.address_city, detail?.address_postcode].filter(Boolean).join(', ')
        : null;

      navigate('/checkout', {
        state: {
          bookingId: result.bookingId, clientSecret: result.clientSecret,
          expertName: selectedExpert.user?.name, serviceTitle: selectedService.title,
          amount: selectedService.price, currency: result.currency || selectedService.currency || 'EUR',
          scheduledAt: selectedSlot.start, format: selectedFormat, sessionLocation,
          paymentExpiresAt: result.paymentExpiresAt,
          restore: { expert: selectedExpert, service: selectedService, format: selectedFormat },
        },
      });
    } catch (err) {
      toast.error(err?.data?.error || t('slotStep.bookError'));
    }
  };

  const handleProceed = () => {
    if (tcAcceptanceRequired) { setTcModalOpen(true); return; }
    doCheckout(lockId || null);
  };

  const handleTcAccept = async () => {
    setTcModalOpen(false);
    try { await acceptTcFn().unwrap(); } catch { /* non-fatal */ }
    setTcAcceptanceRequired(false);
  };

  // Called after inline auth succeeds — re-check T&C with the fresh auth token.
  const handleAuthSuccess = async () => {
    try {
      const result = await refetchTc().unwrap();
      if (result?.version_updated) {
        setTcAcceptanceRequired(true);
        setTcIsFirstBooking(!!result.is_first_booking);
        setTcModalOpen(true);
      }
    } catch {
      // Non-fatal — backend validates T&C on createBooking
    }
  };

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <a href={WEBFLOW_DIRECTORY_URL} className="text-sm text-[#445446] underline">Browse experts</a>
      </div>
    );
  }

  const detail = expertDetail || selectedExpert;

  // ── Step: SERVICE ─────────────────────────────────────────────────────────
  if (step === STEPS.SERVICE) {
    const services = (detail?.services || []).filter((s) => s.is_active !== false);
    return (
      <div>
        <a href={effectiveReturnUrl}
          className="flex items-center gap-1 text-sm text-[#5e6d5b] hover:text-[#445446] mb-4 transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          {t('serviceStep.back')}
        </a>

        <div className="bg-white rounded-2xl border-2 border-[#c5ceba] p-6">
          <StepIndicator step={STEPS.SERVICE} />
          <ExpertHeader expert={detail} />

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#445446]">{t('serviceStep.title', { name: selectedExpert?.user?.name })}</h2>
            <p className="text-sm text-[#5e6d5b] font-medium mt-1">{t('serviceStep.subtitle')}</p>
          </div>

          {services.length === 0 ? (
            <p className="text-sm text-gray-500">This expert has no active services yet.</p>
          ) : (
          <div className="space-y-3">
            {services.map((service) => {
              const isSelected = selectedService?.id === service.id;
              return (
                <div key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    if (service.format) setSelectedFormat(service.format);
                  }}
                  className={`rounded-xl border p-4 cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-[#dfe2d7]/20 border-[#445446] ring-1 ring-[#445446]/20 shadow-sm'
                      : 'bg-[#dfe2d7]/10 border-[#c5ceba] hover:border-[#445446]/50 hover:shadow-sm'
                  }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1F2933]">{service.title}</p>
                      {service.description && (() => {
                        const { short, truncated } = truncateWords(service.description, DESCRIPTION_WORD_LIMIT);
                        const isExpanded = !!expandedDesc[service.id];
                        return (
                          <p className="text-xs text-gray-500 mt-1">
                            {isExpanded ? service.description : short}
                            {truncated && (
                              <span role="button" tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); setExpandedDesc((p) => ({ ...p, [service.id]: !isExpanded })); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setExpandedDesc((p) => ({ ...p, [service.id]: !isExpanded })); }}}
                                className="ml-1 text-[#445446] font-medium cursor-pointer hover:underline">
                                {isExpanded ? t('serviceStep.showLess') : t('serviceStep.readMore')}
                              </span>
                            )}
                          </p>
                        );
                      })()}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{formatDuration(service.duration_minutes)}</span>
                        {service.format && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${service.format === 'ONLINE' ? 'bg-blue-50 text-blue-600' : 'bg-[#445446]/10 text-[#445446]'}`}>
                            {service.format === 'ONLINE' ? 'Online' : 'In-Person'}
                          </span>
                        )}
                        {service.cluster && CLUSTER_BADGE[service.cluster] && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CLUSTER_BADGE[service.cluster].cls}`}>
                            {CLUSTER_BADGE[service.cluster].label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-[#1F2933]">{formatPrice(service.price, service.currency || 'EUR')}</p>
                    </div>
                  </div>

                  {/* Check Availability button — always visible */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedService(service);
                      if (service.format) setSelectedFormat(service.format);
                      setMonthArgs(null);
                      setStep(STEPS.SLOT);
                    }}
                    className={`mt-3 w-full py-2 px-4 text-xs font-semibold rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-[#445446] hover:bg-[#3a4a3b] text-white'
                        : 'bg-white hover:bg-[#dfe2d7]/50 text-[#445446] border border-[#c5ceba]'
                    }`}>
                    {t('serviceStep.checkAvailability')}
                  </button>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>
    );
  }

  // ── Step: SLOT ────────────────────────────────────────────────────────────
  if (step === STEPS.SLOT) {
    return (
      <div>
        <button
          onClick={() => fromPastBookings ? navigate('/dashboard/parent/past') : setStep(STEPS.SERVICE)}
          className="flex items-center gap-1 text-sm text-[#5e6d5b] hover:text-[#445446] mb-4 transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          {fromPastBookings ? t('slotStep.backToBookings') : t('slotStep.backToServices')}
        </button>

        <div className="bg-white rounded-2xl border-2 border-[#c5ceba] p-6">
        <StepIndicator step={STEPS.SLOT} />

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#445446]">{t('slotStep.title')}</h2>
          <p className="text-sm text-[#5e6d5b] font-medium mt-1">
            {selectedService?.title} · {formatDuration(selectedService?.duration_minutes)} ·{' '}
            <span className="font-semibold text-[#445446]">{formatPrice(selectedService?.price, selectedService?.currency || 'EUR', lng)}</span>
          </p>
        </div>

        {/* Format selector — only if service supports both */}
        {!selectedService?.format && (
          <div className="mb-5 flex gap-3">
            {['ONLINE', 'IN_PERSON'].map((f) => (
              <button key={f} onClick={() => setSelectedFormat(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedFormat === f ? 'bg-[#445446] text-white border-[#445446]' : 'bg-[#dfe2d7]/20 text-[#5e6d5b] border-[#c5ceba] hover:border-[#445446] hover:text-[#445446]'
                }`}>
                {f === 'ONLINE' ? t('slotStep.formatOnline') : t('slotStep.formatInPerson')}
              </button>
            ))}
          </div>
        )}

        {/* Calendar — centered */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#1F2933] mb-3 text-center">{t('slotStep.selectDate')}</label>
          <div className="flex justify-center">
            <BookingCalendar
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
              minDateISO={todayISO()}
              maxDateISO={maxDate(expertDetail?.advance_booking_days)}
              availableDates={availableDates}
              loadingDates={loadingDates}
              onMonthChange={fetchAvailableDates}
            />
          </div>
        </div>

        {/* Slots */}
        {slotsLoading ? (
          <div className="flex items-center gap-2 py-4 justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
            <span className="text-sm text-gray-500">{t('slotStep.loadingSlots')}</span>
          </div>
        ) : slots.length === 0 ? (
          <div className="py-6 text-center bg-[#dfe2d7]/20 rounded-xl border border-[#c5ceba]">
            <p className="text-sm font-medium text-gray-500">{t('slotStep.noSlots')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('slotStep.noSlotsHint')}</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-2 text-center">{t('slotStep.timezone')}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-6">
              {slots.map((slot) => (
                <button key={slot.start} onClick={() => {
                    setSelectedSlot(slot);
                    if (user) lockSlot(slot); // start 10-min lock immediately if authenticated
                  }}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all duration-150 ${
                    selectedSlot?.start === slot.start
                      ? 'bg-[#445446] text-white border-[#445446]'
                      : 'bg-white text-[#5e6d5b] border-[#c5ceba] hover:border-[#445446] hover:text-[#445446]'
                  }`}>
                  {formatSlotTime(slot.start, lng)}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-4">
          <CancellationPolicy small />
        </div>

        {/* Continue button — only when slot selected */}
        {selectedSlot && !locking && (
          <button ref={continueRef} onClick={async () => {
              // Authenticated: lock is already active — no re-fetch needed
              if (lockId) {
                setStep(STEPS.CONFIRM);
                return;
              }
              // Not authenticated: do a quick freshness check before proceeding
              const fresh = await refetchSlots().unwrap().catch(() => null);
              if (fresh !== null) {
                const stillAvailable = (fresh || []).some((s) => s.start === selectedSlot.start);
                if (!stillAvailable) {
                  setSelectedSlot(null);
                  toast.error(t('slotStep.lockConflict'));
                  return;
                }
              }
              setStep(STEPS.CONFIRM);
            }}
            className="w-full mt-4 py-3.5 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-xl transition-colors">
            {t('slotStep.continueBtn')} →
          </button>
        )}
        </div>
      </div>
    );
  }

  // ── Step: CONFIRM ─────────────────────────────────────────────────────────
  return (
    <div>
      {tcModalOpen && (
        <TcModal isFirstBooking={tcIsFirstBooking} onAccept={handleTcAccept} onDecline={() => setTcModalOpen(false)} />
      )}

      <button onClick={() => { setSelectedSlot(null); setStep(STEPS.SLOT); }}
        className="flex items-center gap-1 text-sm text-[#5e6d5b] hover:text-[#445446] mb-4 transition-colors font-medium">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        {t('confirmStep.back')}
      </button>

      {/* Single card: step indicator + summary + auth/proceed + footer text */}
      <div className="bg-white rounded-2xl border-2 border-[#c5ceba] overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-[#c5ceba]">
          <StepIndicator step={STEPS.CONFIRM} />
          <h2 className="text-xl font-semibold text-[#445446] mb-1">{t('confirmStep.title')}</h2>
          <p className="text-sm text-[#5e6d5b] font-medium">{t('confirmStep.subtitle')}</p>
        </div>

        {/* Booking summary */}
        <div className="p-5 border-b border-[#c5ceba]">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#c5ceba]">
            {(() => {
              const imgSrc = getProfileImageUrl(detail?.profile_image);
              const initials = detail?.user?.name
                ? detail.user.name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                : '?';
              return imgSrc ? (
                <img src={imgSrc} alt={detail?.user?.name} className="w-10 h-10 rounded-full object-cover border border-[#c5ceba] flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#445446] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{initials}</div>
              );
            })()}
            <div>
              <p className="font-semibold text-[#1F2933] text-sm">{detail?.user?.name}</p>
              <p className="text-xs text-gray-500">{selectedService?.title}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {[
              { label: t('confirmStep.labelFormat'),   value: selectedFormat === 'ONLINE' ? t('confirmStep.formatOnline') : t('confirmStep.formatInPerson') },
              { label: t('confirmStep.labelWhen'),     value: `${formatSlotDate(selectedSlot?.start, lng)}, ${formatSlotTime(selectedSlot?.start, lng)}` },
              { label: t('confirmStep.labelDuration'), value: formatDuration(selectedService?.duration_minutes, t) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-gray-500">{label}</span>
                <span className="text-[#1F2933] font-medium text-right">{value}</span>
              </div>
            ))}
            {selectedFormat === 'IN_PERSON' && (() => {
              const loc = [detail?.address_street, detail?.address_city, detail?.address_postcode].filter(Boolean).join(', ');
              return loc ? (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">{t('confirmStep.labelLocation')}</span>
                  <span className="text-[#1F2933] font-medium text-right">{loc}</span>
                </div>
              ) : null;
            })()}
            <div className="flex justify-between gap-4 pt-3 border-t border-[#c5ceba] mt-3">
              <span className="font-semibold text-[#1F2933]">{t('confirmStep.labelTotal')}</span>
              <span className="font-bold text-lg text-[#1F2933]">{formatPrice(selectedService?.price, selectedService?.currency || 'EUR', lng)}</span>
            </div>
          </div>

        </div>

        {/* Health disclaimer — must appear before the payment button */}
        <div className="px-5 pt-4 pb-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
            {t('slotStep.summary.healthDisclaimer')}
          </div>
        </div>

        {/* Auth / proceed */}
        <div className="p-5 pt-0">
          {user ? (
            <>
              <button onClick={handleProceed} disabled={creating || locking}
                className="w-full py-3.5 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {creating || locking ? t('confirmStep.preparingBtn') : t('confirmStep.proceedBtn')}
              </button>
            </>
          ) : pendingVerificationEmail ? (
            <VerificationPendingPanel
              email={pendingVerificationEmail}
              returnTo={
                `/book?expertId=${expertIdParam || ''}` +
                ((serviceIdParam || selectedService?.id) ? `&serviceId=${serviceIdParam || selectedService?.id}` : '') +
                (selectedSlot?.start ? `&slotStart=${selectedSlot.start}` : '') +
                (selectedFormat ? `&format=${selectedFormat}` : '')
              }
              onSwitchToLogin={() => { setPendingVerificationEmail(null); setAuthTab('login'); }}
            />
          ) : (
            <>
              {authTab === 'login' ? (
                <>
                  <p className="text-base font-semibold text-[#1F2933] mb-4">{t('confirmStep.signInTitle')}</p>
                  <InlineLogin
                    onSuccess={handleAuthSuccess}
                    onVerificationNeeded={setPendingVerificationEmail}
                  />
                  <p className="text-sm text-gray-500 text-center mt-4">
                    {t('confirmStep.noAccount')}{' '}
                    <button onClick={() => setAuthTab('register')} className="text-[#445446] font-medium hover:underline">
                      {t('confirmStep.createOne')}
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-[#1F2933] mb-1">{t('confirmStep.yourDetails')}</p>
                  <p className="text-sm text-gray-500 mb-4">
                    {t('confirmStep.haveAccount')}{' '}
                    <button onClick={() => setAuthTab('login')} className="text-[#445446] font-medium hover:underline">
                      {t('confirmStep.signIn')}
                    </button>
                  </p>
                  <InlineRegister
                    onVerificationSent={setPendingVerificationEmail}
                    returnTo={
                      `/book?expertId=${expertIdParam || ''}` +
                      ((serviceIdParam || selectedService?.id) ? `&serviceId=${serviceIdParam || selectedService?.id}` : '') +
                      (selectedSlot?.start ? `&slotStart=${selectedSlot.start}` : '') +
                      (selectedFormat ? `&format=${selectedFormat}` : '')
                    }
                  />
                </>
              )}
            </>
          )}
        </div>

        {/* Footer text */}
        <div className="px-5 pb-5 space-y-3">
          <p className="text-xs text-gray-400 text-center">{t('slotStep.summary.noChargeYet')}</p>
          <div className="p-3 bg-[#dfe2d7]/30 border border-[#c5ceba] rounded-lg text-xs text-[#5e6d5b] leading-relaxed">
            {t('slotStep.summary.currencyNotice', { currency: selectedService?.currency || 'EUR' })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BookPage;
