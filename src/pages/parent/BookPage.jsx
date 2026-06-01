import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { getExpertPublic } from '../../api/expertApi';
import { getAvailableSlots, getAvailableDatesInMonth, createBooking, getCurrentTcVersion, acceptTcApi, lockSlotApi, releaseLockApi } from '../../api/bookingApi';
import { loginUser, registerUser, verifyOtpApi } from '../../api/authApi';
import { getProfileImageUrl } from '../../utils/imageUrl';
import { validateLoginForm, validateRegisterForm } from '../../utils/validation';
import PasswordInput from '../../components/auth/PasswordInput';
import BookingCalendar from '../../components/booking/BookingCalendar';
import CancellationPolicy from '../../components/booking/CancellationPolicy';

const WEBFLOW_DIRECTORY_URL   = process.env.REACT_APP_WEBFLOW_DIRECTORY_URL   || 'https://the-sage-nest.webflow.io/experts';
const WEBFLOW_EXPERT_BASE_URL = process.env.REACT_APP_WEBFLOW_EXPERT_BASE_URL || 'https://the-sage-nest.webflow.io/experts';

// ─── Steps ───────────────────────────────────────────────────────────────────
const STEPS = { SERVICE: 'service', SLOT: 'slot', CONFIRM: 'confirm' };

// ─── Step indicator ───────────────────────────────────────────────────────────
const StepIndicator = ({ step }) => {
  const steps = [
    { key: STEPS.SERVICE, label: 'Service' },
    { key: STEPS.SLOT,    label: 'Time' },
    { key: STEPS.CONFIRM, label: 'Confirm' },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const done    = i < currentIndex;
        const active  = i === currentIndex;
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center">
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
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-12 mx-1 mb-4 transition-colors ${i < currentIndex ? 'bg-[#445446]' : 'bg-[#E4E7E4]'}`} />
            )}
          </div>
        );
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
const InlineLogin = ({ onSuccess }) => {
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
      setError(err?.response?.data?.error || 'Login failed. Please try again.');
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
const InlineRegister = ({ onSuccess }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const { login } = useAuth();

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateRegisterForm({ ...form, role: 'PARENT' });
    if (!privacyAccepted) errs.privacyPolicy = 'You must accept the Privacy Policy.';
    if (!termsAccepted)   errs.termsConditions = 'You must accept the Terms & Conditions.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setServerError('');
    try {
      const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } })();
      const data = await registerUser({
        name: form.name, email: form.email, password: form.password,
        role: 'PARENT', phone: form.phone.trim(),
        privacyPolicyAccepted: true, termsAccepted: true,
        marketingConsent: marketing, timezone: tz,
      });
      // Parents are auto-logged in (no email verification)
      login(data);
      onSuccess();
    } catch (err) {
      setServerError(err?.response?.data?.error || 'Registration failed. Please try again.');
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
          { id: 'terms',   checked: termsAccepted,   onChange: () => setTermsAccepted((v) => !v),   label: <>I agree to Sage Nest's <a href="/terms-conditions" target="_blank" rel="noopener noreferrer" className="text-[#445446] underline">Terms of Service</a></>, err: errors.termsConditions },
          { id: 'privacy', checked: privacyAccepted, onChange: () => setPrivacyAccepted((v) => !v), label: <>I have read the <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#445446] underline">Privacy Policy</a></>,           err: errors.privacyPolicy },
          { id: 'mkt',     checked: marketing,       onChange: () => setMarketing((v) => !v),       label: 'I\'d like occasional parenting tips from Sage Nest (optional)' },
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

  const [effectiveReturnUrl, setEffectiveReturnUrl] = useState(returnUrlParam || WEBFLOW_DIRECTORY_URL);

  const [step,            setStep]           = useState(STEPS.SERVICE);
  const [loading,         setLoading]        = useState(true);
  const [error,           setError]          = useState('');

  const [selectedExpert,  setSelectedExpert]  = useState(null);
  const [expertDetail,    setExpertDetail]    = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate,    setSelectedDate]    = useState(todayISO());
  const [slots,           setSlots]           = useState([]);
  const [slotsLoading,    setSlotsLoading]    = useState(false);
  const [selectedSlot,    setSelectedSlot]    = useState(null);
  const [selectedFormat,  setSelectedFormat]  = useState('ONLINE');
  const [availableDates,  setAvailableDates]  = useState(undefined);
  const [loadingDates,    setLoadingDates]    = useState(false);
  const [expandedDesc,    setExpandedDesc]    = useState({});

  // Confirm + payment state
  const [authTab,              setAuthTab]              = useState('register'); // 'login' | 'register'
  const [proceeding,           setProceeding]           = useState(false);
  const [proceedErr,           setProceedErr]           = useState('');
  const [tcAcceptanceRequired, setTcAcceptanceRequired] = useState(false);
  const [tcIsFirstBooking,     setTcIsFirstBooking]     = useState(false);
  const [tcModalOpen,          setTcModalOpen]          = useState(false);

  // Slot lock (held during CONFIRM after auth)
  const [lockId,        setLockId]        = useState(null);
  const [lockExpiresAt, setLockExpiresAt] = useState(null);
  const [lockSecsLeft,  setLockSecsLeft]  = useState(null);
  const [locking,       setLocking]       = useState(false);
  const [lockErr,       setLockErr]       = useState('');
  const lockIdRef    = useRef(null);
  const continueRef  = useRef(null);

  // ── Init: load expert from URL params ─────────────────────────────────────
  useEffect(() => {
    sessionStorage.removeItem('sage_booking_ctx');

    // Restore from checkout "Edit booking" navigation
    if (locationState?.restore) {
      const { expert, service, format: fmt } = locationState.restore;
      if (expert) { setSelectedExpert(expert); setExpertDetail(expert); }
      if (service) setSelectedService(service);
      if (fmt) setSelectedFormat(fmt);
      if (expert && service) setStep(STEPS.CONFIRM);
      setLoading(false);
      return;
    }

    if (!expertIdParam) {
      setError('No expert specified. Please start from the expert directory.');
      setLoading(false);
      return;
    }

    getExpertPublic(Number(expertIdParam))
      .then((expert) => {
        setSelectedExpert(expert);
        setExpertDetail(expert);
        if (!returnUrlParam && expert.webflow_slug) {
          setEffectiveReturnUrl(`${WEBFLOW_EXPERT_BASE_URL}/${expert.webflow_slug}`);
        }
        if (serviceIdParam) {
          const svc = (expert.services || []).find(
            (s) => s.id === Number(serviceIdParam) && s.is_active !== false,
          );
          if (svc) {
            setSelectedService(svc);
            if (svc.format) setSelectedFormat(svc.format);
            setStep(STEPS.SLOT);
          }
        }
      })
      .catch(() => setError('Could not load expert. Please try again.'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (lockIdRef.current) {
        releaseLockApi(lockIdRef.current).catch(() => {});
        lockIdRef.current = null;
      }
    };
  }, []);

  // Lock countdown
  useEffect(() => {
    if (!lockExpiresAt) { setLockSecsLeft(null); return; }
    const tick = () => {
      const secs = Math.max(0, Math.round((lockExpiresAt.getTime() - Date.now()) / 1000));
      setLockSecsLeft(secs);
      if (secs === 0) {
        lockIdRef.current = null;
        setLockId(null); setLockExpiresAt(null); setLockErr('Slot reservation expired. Please select a new time.');
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockExpiresAt]);

  // Auto-scroll to Continue button when slot is selected
  useEffect(() => {
    if (selectedSlot && continueRef.current) {
      continueRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedSlot]);

  // T&C status
  useEffect(() => {
    getCurrentTcVersion()
      .then(({ version_updated, is_first_booking }) => {
        setTcAcceptanceRequired(!!version_updated);
        setTcIsFirstBooking(!!is_first_booking);
      })
      .catch(() => {});
  }, [user]); // re-check after auth

  // Load slots
  const loadSlots = useCallback(async () => {
    if (!selectedExpert || !selectedService || !selectedDate) return;
    if (lockIdRef.current) {
      releaseLockApi(lockIdRef.current).catch(() => {});
      lockIdRef.current = null;
      setLockId(null); setLockExpiresAt(null); setLockErr('');
    }
    setSlotsLoading(true); setSelectedSlot(null);
    try {
      setSlots(await getAvailableSlots(selectedExpert.id, selectedDate, selectedService.id));
    } catch { setSlots([]); }
    finally { setSlotsLoading(false); }
  }, [selectedExpert, selectedService, selectedDate]);

  useEffect(() => {
    if (step === STEPS.SLOT) loadSlots();
  }, [step, loadSlots]);

  const fetchAvailableDates = useCallback(async (year, month) => {
    if (!selectedExpert) return;
    setLoadingDates(true);
    try {
      setAvailableDates(await getAvailableDatesInMonth(selectedExpert.id, year, month, selectedService?.id));
    } catch { setAvailableDates(undefined); }
    finally { setLoadingDates(false); }
  }, [selectedExpert, selectedService]);

  // ── Slot lock (called after auth, before createBooking) ──────────────────
  const lockSlot = async () => {
    setLocking(true); setLockErr('');
    try {
      const { lockId: id, expiresAt } = await lockSlotApi(selectedExpert.id, selectedSlot.start);
      lockIdRef.current = id;
      setLockId(id); setLockExpiresAt(new Date(expiresAt));
      return id;
    } catch (err) {
      const msg = err.response?.status === 409
        ? 'This slot was just taken. Please go back and choose another time.'
        : 'Could not reserve the slot. Please try again.';
      setLockErr(msg);
      return null;
    } finally { setLocking(false); }
  };

  // ── Proceed to payment (lock → createBooking → checkout) ────────────────
  const doCheckout = async (existingLockId) => {
    setProceeding(true); setProceedErr('');
    try {
      const lid = existingLockId || (await lockSlot());
      if (!lid) { setProceeding(false); return; }

      const result = await createBooking({
        expertId: selectedExpert.id, serviceId: selectedService.id,
        scheduledAt: selectedSlot.start, format: selectedFormat, lockId: lid,
      });
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
          restore: { expert: selectedExpert, service: selectedService, format: selectedFormat },
        },
      });
    } catch (err) {
      setProceedErr(err.response?.data?.error || t('slotStep.bookError'));
      setProceeding(false);
    }
  };

  const handleProceed = () => {
    if (tcAcceptanceRequired) { setTcModalOpen(true); return; }
    doCheckout(lockId || null);
  };

  const handleTcAccept = async () => {
    setTcModalOpen(false);
    try { await acceptTcApi(); } catch { /* non-fatal */ }
    setTcAcceptanceRequired(false);
    doCheckout(lockId || null);
  };

  // Called after inline auth succeeds
  const handleAuthSuccess = () => {
    if (tcAcceptanceRequired) { setTcModalOpen(true); return; }
    doCheckout(null);
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
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1F2933] mb-5 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to expert profile
        </a>

        <StepIndicator step={STEPS.SERVICE} />
        <ExpertHeader expert={detail} />

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#1F2933]">Book with {selectedExpert?.user?.name}</h2>
          <p className="text-sm text-gray-500 mt-1">Select a service to continue.</p>
        </div>

        {services.length === 0 ? (
          <p className="text-sm text-gray-500">This expert has no active services yet.</p>
        ) : (
          <div className="space-y-3">
            {services.map((service) => {
              const isPreSelected = service.id === Number(serviceIdParam);
              return (
                <button key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setAvailableDates(undefined);
                    if (service.format) setSelectedFormat(service.format);
                    setStep(STEPS.SLOT);
                  }}
                  className={`w-full text-left bg-white rounded-xl border p-5 hover:border-[#445446] hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 ${
                    isPreSelected ? 'border-[#445446] ring-1 ring-[#445446]/20' : 'border-[#E4E7E4]'
                  }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#1F2933]">{service.title}</p>
                        {isPreSelected && <span className="text-xs bg-[#445446]/10 text-[#445446] px-2 py-0.5 rounded-full font-medium">Selected</span>}
                      </div>
                      {service.description && (() => {
                        const { short, truncated } = truncateWords(service.description, DESCRIPTION_WORD_LIMIT);
                        const isExpanded = !!expandedDesc[service.id];
                        return (
                          <p className="text-sm text-gray-500 mt-1">
                            {isExpanded ? service.description : short}
                            {truncated && (
                              <span role="button" tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); setExpandedDesc((p) => ({ ...p, [service.id]: !isExpanded })); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setExpandedDesc((p) => ({ ...p, [service.id]: !isExpanded })); }}}
                                className="ml-1 text-[#445446] font-medium cursor-pointer hover:underline">
                                {isExpanded ? 'Show less' : 'Read more'}
                              </span>
                            )}
                          </p>
                        );
                      })()}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{formatDuration(service.duration_minutes)}</span>
                        {service.format && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${service.format === 'ONLINE' ? 'bg-blue-50 text-blue-600' : 'bg-[#445446]/10 text-[#445446]'}`}>
                            {service.format === 'ONLINE' ? 'Online' : 'In-Person'}
                          </span>
                        )}
                        {service.cluster && CLUSTER_BADGE[service.cluster] && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CLUSTER_BADGE[service.cluster].cls}`}>
                            {CLUSTER_BADGE[service.cluster].label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-lg font-bold text-[#1F2933]">{formatPrice(service.price, service.currency || 'EUR')}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Step: SLOT ────────────────────────────────────────────────────────────
  if (step === STEPS.SLOT) {
    return (
      <div>
        <button onClick={() => setStep(STEPS.SERVICE)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1F2933] mb-5 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to services
        </button>

        <StepIndicator step={STEPS.SLOT} />

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#1F2933]">Select a time</h2>
          <p className="text-sm text-gray-500 mt-1">
            {selectedService?.title} · {formatDuration(selectedService?.duration_minutes)} ·{' '}
            <span className="font-medium text-[#1F2933]">{formatPrice(selectedService?.price, selectedService?.currency || 'EUR', lng)}</span>
          </p>
        </div>

        {/* Format selector — only if service supports both */}
        {!selectedService?.format && (
          <div className="mb-5 flex gap-3">
            {['ONLINE', 'IN_PERSON'].map((f) => (
              <button key={f} onClick={() => setSelectedFormat(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedFormat === f ? 'bg-[#445446] text-white border-[#445446]' : 'bg-white text-gray-600 border-[#E4E7E4] hover:border-[#445446]'
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
          <div className="py-6 text-center bg-white rounded-xl border border-[#E4E7E4]">
            <p className="text-sm font-medium text-gray-500">{t('slotStep.noSlots')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('slotStep.noSlotsHint')}</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-2 text-center">{t('slotStep.timezone')}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-6">
              {slots.map((slot) => (
                <button key={slot.start} onClick={() => setSelectedSlot(slot)}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all duration-150 ${
                    selectedSlot?.start === slot.start
                      ? 'bg-[#445446] text-white border-[#445446]'
                      : 'bg-white text-[#1F2933] border-[#E4E7E4] hover:border-[#445446]'
                  }`}>
                  {formatSlotTime(slot.start, lng)}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-6">
          <CancellationPolicy compact />
        </div>

        {/* Continue button — only when slot selected */}
        {selectedSlot && (
          <button ref={continueRef} onClick={() => setStep(STEPS.CONFIRM)}
            className="w-full mt-4 py-3.5 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-xl transition-colors">
            Continue →
          </button>
        )}
      </div>
    );
  }

  // ── Step: CONFIRM ─────────────────────────────────────────────────────────
  return (
    <div>
      {tcModalOpen && (
        <TcModal isFirstBooking={tcIsFirstBooking} onAccept={handleTcAccept} onDecline={() => setTcModalOpen(false)} />
      )}

      <button onClick={() => { setLockErr(''); setStep(STEPS.SLOT); }}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1F2933] mb-5 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to time selection
      </button>

      <StepIndicator step={STEPS.CONFIRM} />

      <h2 className="text-xl font-semibold text-[#1F2933] mb-1">Confirm your booking</h2>
      <p className="text-sm text-gray-500 mb-6">Review your details below before proceeding to payment.</p>

      {/* Single card: booking summary + auth/proceed + footer text */}
      <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden">

        {/* Booking summary */}
        <div className="p-5 border-b border-[#E4E7E4]">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#E4E7E4]">
            {(() => {
              const imgSrc = getProfileImageUrl(detail?.profile_image);
              const initials = detail?.user?.name
                ? detail.user.name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                : '?';
              return imgSrc ? (
                <img src={imgSrc} alt={detail?.user?.name} className="w-10 h-10 rounded-full object-cover border border-[#E4E7E4] flex-shrink-0" />
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
              { label: 'Format',   value: selectedFormat === 'ONLINE' ? 'Online (video call)' : 'In-person' },
              { label: 'When',     value: `${formatSlotDate(selectedSlot?.start, lng)}, ${formatSlotTime(selectedSlot?.start, lng)}` },
              { label: 'Duration', value: formatDuration(selectedService?.duration_minutes, t) },
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
                  <span className="text-gray-500">Location</span>
                  <span className="text-[#1F2933] font-medium text-right">{loc}</span>
                </div>
              ) : null;
            })()}
            <div className="flex justify-between gap-4 pt-3 border-t border-[#E4E7E4] mt-3">
              <span className="font-semibold text-[#1F2933]">Total</span>
              <span className="font-bold text-lg text-[#1F2933]">{formatPrice(selectedService?.price, selectedService?.currency || 'EUR', lng)}</span>
            </div>
          </div>

          {lockSecsLeft !== null && (
            <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
              lockSecsLeft > 120 ? 'bg-green-50 border-green-200 text-green-700'
              : lockSecsLeft > 30 ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
              </svg>
              Slot reserved for {Math.floor(lockSecsLeft / 60)}:{String(lockSecsLeft % 60).padStart(2, '0')}
            </div>
          )}
          {lockErr && (
            <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{lockErr}</div>
          )}
        </div>

        {/* Auth / proceed */}
        <div className="p-5">
          {user ? (
            <>
              {proceedErr && <p className="mb-3 text-sm text-red-600">{proceedErr}</p>}
              <button onClick={handleProceed} disabled={proceeding || locking}
                className="w-full py-3.5 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {proceeding || locking ? 'Preparing payment…' : 'Proceed to payment →'}
              </button>
            </>
          ) : (
            <>
              {authTab === 'login' ? (
                <>
                  <p className="text-base font-semibold text-[#1F2933] mb-4">Sign in to continue</p>
                  <InlineLogin onSuccess={handleAuthSuccess} />
                  <p className="text-sm text-gray-500 text-center mt-4">
                    Don't have an account?{' '}
                    <button onClick={() => setAuthTab('register')} className="text-[#445446] font-medium hover:underline">
                      Create one
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-[#1F2933] mb-1">Your Details</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Already have an account?{' '}
                    <button onClick={() => setAuthTab('login')} className="text-[#445446] font-medium hover:underline">
                      Sign in
                    </button>
                  </p>
                  <InlineRegister onSuccess={handleAuthSuccess} />
                </>
              )}
              {proceedErr && <p className="mt-3 text-sm text-red-600">{proceedErr}</p>}
            </>
          )}
        </div>

        {/* Footer text */}
        <div className="px-5 pb-5 space-y-3">
          <p className="text-xs text-gray-400 text-center">{t('slotStep.summary.noChargeYet')}</p>
          <div className="p-3 bg-[#F5F7F5] border border-[#E4E7E4] rounded-lg text-xs text-gray-500 leading-relaxed">
            {t('slotStep.summary.currencyNotice', { currency: selectedService?.currency || 'EUR' })}
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
            {t('slotStep.summary.healthDisclaimer')}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BookPage;
