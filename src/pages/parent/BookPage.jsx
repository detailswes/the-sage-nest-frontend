import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useGetExpertPublicQuery } from '../../api/expertApi';
import {
  useGetAvailableSlotsQuery,
  useGetAvailableDatesInMonthQuery,
  useCreateBookingMutation,
  useLockSlotMutation,
  useReleaseLockMutation,
} from '../../api/bookingApi';
import { useGetLegalVersionsQuery } from '../../api/userApi';
import { loginUser, registerUser, verifyOtpApi } from '../../api/authApi';
import { getProfileImageUrl } from '../../utils/imageUrl';
import { validateLoginForm, validateRegisterForm, checkPasswordStrength } from '../../utils/validation';
import PasswordInput from '../../components/auth/PasswordInput';
import useResendVerification from '../../hooks/useResendVerification';
import BookingCalendar from '../../components/booking/BookingCalendar';
import CancellationPolicy from '../../components/booking/CancellationPolicy';
import {
  CheckIcon, EnvelopeIcon,
  CheckCircleFilledIcon, InfoCircleFilledIcon, ChevronLeftIcon,
} from '../../assets/icons';

const WEBFLOW_DIRECTORY_URL   = process.env.REACT_APP_WEBFLOW_DIRECTORY_URL   || 'https://the-sage-nest.webflow.io/experts';
const WEBFLOW_EXPERT_BASE_URL = process.env.REACT_APP_WEBFLOW_EXPERT_BASE_URL || 'https://the-sage-nest.webflow.io/experts';
const WITHDRAWAL_WINDOW_MS    = 14 * 24 * 60 * 60 * 1000;

// Picks the PDF for the current UI language, falling back to the other
// language's PDF, then to the in-app page, if the admin hasn't uploaded
// both yet.
function resolveDocUrl(doc, lang, fallbackPath) {
  if (!doc) return fallbackPath;
  const preferred = lang === 'it' ? doc.file_url_it : doc.file_url_en;
  return preferred || doc.file_url_en || doc.file_url_it || fallbackPath;
}

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
                <CheckIcon className="w-3.5 h-3.5" />
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

// ─── Checkout consent block ───────────────────────────────────────────────────
// Mandatory T&C+cancellation-policy checkbox, conditional 14-day withdrawal
// checkbox, optional marketing checkbox, and a plain-text privacy notice.
// Every field starts unchecked on every visit — no prior acceptance is reused.
const ConsentBlock = ({
  legalVersions,
  withdrawalApplicable,
  tcAccepted, setTcAccepted,
  withdrawalAccepted, setWithdrawalAccepted,
  marketingConsent, setMarketingConsent,
}) => {
  const { t, i18n } = useTranslation('parentBookings');
  const [whyOpen, setWhyOpen] = useState(false);

  const termsHref        = resolveDocUrl(legalVersions?.terms_conditions, i18n.language, '/terms-conditions');
  const cancellationHref = resolveDocUrl(legalVersions?.cancellation_policy, i18n.language, '/cancellation-policy');
  const privacyHref      = resolveDocUrl(legalVersions?.privacy_policy, i18n.language, '/privacy-policy');

  const checkboxCls = "mt-px h-3.5 w-3.5 shrink-0 accent-[#445446] focus:outline-none focus:ring-2 focus:ring-[#445446]/30 rounded-sm";

  return (
    <div className="space-y-2.5">
      {/* Checkbox A — mandatory */}
      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={tcAccepted}
          onChange={(e) => setTcAccepted(e.target.checked)}
          className={checkboxCls}
        />
        <span className="text-xs text-[#1F2933] leading-relaxed">
          <Trans
            i18nKey="consentBlock.termsLabel"
            ns="parentBookings"
            components={[
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              <a href={termsHref} target="_blank" rel="noopener noreferrer" className="text-[#445446] font-medium underline" />,
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              <a href={cancellationHref} target="_blank" rel="noopener noreferrer" className="text-[#445446] font-medium underline" />,
            ]}
          />
        </span>
      </label>

      {/* Checkbox B — conditional withdrawal consent */}
      {withdrawalApplicable && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500 leading-relaxed">{t('consentBlock.withdrawalLeadIn')}</p>
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={withdrawalAccepted}
              onChange={(e) => setWithdrawalAccepted(e.target.checked)}
              className={checkboxCls}
            />
            <span className="text-xs text-[#1F2933] leading-relaxed">{t('consentBlock.withdrawalLabel')}</span>
          </label>
          <button
            type="button"
            onClick={() => setWhyOpen((o) => !o)}
            className="text-[11px] text-gray-400 hover:text-[#445446] underline ml-[22px]"
          >
            {t('consentBlock.withdrawalWhy')}
          </button>
          {whyOpen && (
            <p className="text-[11px] text-gray-400 leading-relaxed ml-[22px]">{t('consentBlock.withdrawalWhyBody')}</p>
          )}
        </div>
      )}

      {/* Checkbox C — optional marketing */}
      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          className={checkboxCls}
        />
        <span className="text-xs text-gray-500 leading-relaxed">{t('consentLabels.marketingOptIn')}</span>
      </label>

      {/* Plain-text privacy notice — no checkbox */}
      <p className="text-xs text-gray-400 leading-relaxed">
        <Trans
          i18nKey="consentBlock.privacyNotice"
          ns="parentBookings"
          components={[
            // eslint-disable-next-line jsx-a11y/anchor-has-content
            <a href={privacyHref} target="_blank" rel="noopener noreferrer" className="text-[#445446] underline" />,
          ]}
        />
      </p>
    </div>
  );
};

// ─── Verification pending panel ───────────────────────────────────────────────
const VerificationPendingPanel = ({ email, returnTo, onSwitchToLogin }) => {
  const { resend, status, countdown } = useResendVerification();
  return (
    <div className="text-center py-2">
      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
        <EnvelopeIcon className="w-6 h-6 text-blue-500" />
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
  FOR_FAMILY:  { label: 'For the Family',  cls: 'bg-teal-100 text-teal-700' },
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateRegisterForm({ ...form, role: 'PARENT' });
    if (!termsAccepted)   errs.termsConditions = t('consentLabels.termsRequired');
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setServerError('');
    try {
      const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } })();
      await registerUser({
        name: form.name, email: form.email, password: form.password,
        role: 'PARENT', phone: form.phone.trim(),
        termsAccepted: true,
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
                  <CheckCircleFilledIcon className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <InfoCircleFilledIcon className="w-3.5 h-3.5 flex-shrink-0" />
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
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(null);

  // Checkout consent — always starts unchecked, never restored/reused across visits.
  const [tcAccepted,          setTcAccepted]          = useState(false);
  const [withdrawalAccepted,  setWithdrawalAccepted]  = useState(false);
  const [marketingConsent,    setMarketingConsent]    = useState(false);

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

  // Live legal document versions/links for the checkout consent block
  const { data: legalVersions } = useGetLegalVersionsQuery();

  // 14-day cooling-off period, measured from now (the moment of booking creation) —
  // mirrors the server-side check in createBooking().
  const withdrawalApplicable = !!(
    selectedSlot &&
    new Date(selectedSlot.start).getTime() - Date.now() <= WITHDRAWAL_WINDOW_MS
  );

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

  // Reset checkout consent whenever the selected slot changes — never carry
  // acceptance across a different session date/time.
  useEffect(() => {
    setTcAccepted(false);
    setWithdrawalAccepted(false);
  }, [selectedSlot?.start]);

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
        tcAccepted,
        withdrawalAccepted: withdrawalApplicable ? withdrawalAccepted : undefined,
        marketingConsent,
        language: i18n.language,
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
    if (!tcAccepted) return;
    if (withdrawalApplicable && !withdrawalAccepted) return;
    doCheckout(lockId || null);
  };

  // Called after inline auth succeeds — nothing to re-check; the consent block
  // is always shown fresh below, regardless of any prior acceptance.
  const handleAuthSuccess = () => {};

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
          <ChevronLeftIcon className="w-4 h-4" />
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
          <ChevronLeftIcon className="w-4 h-4" />
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
      <button onClick={() => { setSelectedSlot(null); setStep(STEPS.SLOT); }}
        className="flex items-center gap-1 text-sm text-[#5e6d5b] hover:text-[#445446] mb-4 transition-colors font-medium">
        <ChevronLeftIcon className="w-4 h-4" />
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
              <ConsentBlock
                legalVersions={legalVersions}
                withdrawalApplicable={withdrawalApplicable}
                tcAccepted={tcAccepted} setTcAccepted={setTcAccepted}
                withdrawalAccepted={withdrawalAccepted} setWithdrawalAccepted={setWithdrawalAccepted}
                marketingConsent={marketingConsent} setMarketingConsent={setMarketingConsent}
              />
              <button onClick={handleProceed}
                disabled={creating || locking || !tcAccepted || (withdrawalApplicable && !withdrawalAccepted)}
                className="w-full mt-4 py-3.5 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
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
