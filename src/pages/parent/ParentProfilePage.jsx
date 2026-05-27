import { useState, useEffect, useRef } from "react";
import { useTranslation, Trans } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { validatePhone } from "../../utils/validation";
import {
  getProfileApi,
  updateProfileApi,
  updateEmailApi,
  changePasswordApi,
  deleteAccountApi,
  exportMyDataApi,
  get2FAStatusApi,
  sendSetupOtpApi,
  enable2FAApi,
  disable2FAApi,
  getParentNotificationPrefsApi,
  updateParentNotificationPrefsApi,
  getLegalConsentsApi,
  updateMarketingConsentApi,
} from "../../api/authApi";

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, description, children }) => (
  <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden">
    <div className="px-6 py-5 border-b border-[#E4E7E4]">
      <h3 className="text-base font-semibold text-[#1F2933]">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      )}
    </div>
    <div className="px-6 py-6">{children}</div>
  </div>
);

// ─── Field row ────────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-[#1F2933] mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

const Input = ({ error, ...props }) => (
  <input
    {...props}
    className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
      error ? "border-red-400" : "border-[#E4E7E4]"
    }`}
  />
);

// ─── Feedback banner ──────────────────────────────────────────────────────────
const Banner = ({ type, message }) => {
  if (!message) return null;
  const styles =
    type === "success"
      ? "bg-green-50 border-green-200 text-green-700"
      : "bg-red-50 border-red-200 text-red-600";
  return (
    <div className={`px-4 py-3 rounded-lg border text-sm ${styles}`}>
      {message}
    </div>
  );
};

// ─── Timezone list ────────────────────────────────────────────────────────────
const TIMEZONES = [
  { value: 'Europe/London',       label: 'London (GMT/BST)' },
  { value: 'Europe/Dublin',       label: 'Dublin (GMT/IST)' },
  { value: 'Europe/Paris',        label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin',       label: 'Berlin (CET/CEST)' },
  { value: 'Europe/Rome',         label: 'Rome / Italy (CET/CEST)' },
  { value: 'Europe/Madrid',       label: 'Madrid (CET/CEST)' },
  { value: 'Europe/Lisbon',       label: 'Lisbon (WET/WEST)' },
  { value: 'Europe/Warsaw',       label: 'Warsaw (CET/CEST)' },
  { value: 'Europe/Zurich',       label: 'Zurich (CET/CEST)' },
  { value: 'Europe/Amsterdam',    label: 'Amsterdam (CET/CEST)' },
  { value: 'Europe/Brussels',     label: 'Brussels (CET/CEST)' },
  { value: 'Europe/Athens',       label: 'Athens (EET/EEST)' },
  { value: 'Europe/Helsinki',     label: 'Helsinki (EET/EEST)' },
  { value: 'America/New_York',    label: 'New York (ET)' },
  { value: 'America/Chicago',     label: 'Chicago (CT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
  { value: 'America/Toronto',     label: 'Toronto (ET)' },
  { value: 'Asia/Dubai',          label: 'Dubai (GST)' },
];

const detectedTimezone = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; }
})();

// ─── Personal Info section ────────────────────────────────────────────────────
const PersonalInfoSection = ({ profile, onUpdated }) => {
  const { t } = useTranslation("parentDashboard");
  const [name,     setName]     = useState(profile.name     || "");
  const [phone,    setPhone]    = useState(profile.phone    || "");
  const [city,     setCity]     = useState(profile.city     || "");
  const [timezone, setTimezone] = useState(
    profile.timezone || detectedTimezone || TIMEZONES[0].value
  );
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  const handleSave = async () => {
    const errs = {};
    if (!name.trim()) errs.name = t("personalInfo.validation.nameRequired");
    if (!phone.trim()) {
      errs.phone = t("personalInfo.validation.phoneRequired");
    } else if (!validatePhone(phone)) {
      errs.phone = t("personalInfo.validation.phoneInvalid");
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    setBanner(null);
    try {
      const updated = await updateProfileApi({
        name:     name.trim(),
        phone:    phone.trim(),
        city:     city.trim() || null,
        timezone: timezone || null,
      });
      onUpdated(updated);
      setBanner({ type: "success", message: t("personalInfo.saveSuccess") });
    } catch (err) {
      setBanner({
        type: "error",
        message: err?.response?.data?.error || t("personalInfo.saveError"),
      });
    } finally {
      setLoading(false);
    }
  };

  const isKnownTz = TIMEZONES.some((tz) => tz.value === timezone);

  return (
    <Section
      title={t("personalInfo.title")}
      description={t("personalInfo.description")}
    >
      <div className="space-y-4">
        <Banner type={banner?.type} message={banner?.message} />
        <Field label={t("personalInfo.fullName")}>
          <Input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })); }}
            placeholder={t("personalInfo.fullNamePlaceholder")}
            error={!!fieldErrors.name}
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
        </Field>
        <div>
          <label className="block text-sm font-medium text-[#1F2933] mb-1.5">{t("personalInfo.phone")}</label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setFieldErrors((p) => ({ ...p, phone: undefined })); }}
            placeholder={t("personalInfo.phonePlaceholder")}
            error={!!fieldErrors.phone}
          />
          {fieldErrors.phone ? (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-400">{t("personalInfo.phoneHint")}</p>
          )}
        </div>
        <Field label={t("personalInfo.city")}>
          <Input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t("personalInfo.cityPlaceholder")}
          />
          <p className="mt-1 text-xs text-gray-400">{t("personalInfo.cityHint")}</p>
        </Field>
        <div>
          <label className="block text-sm font-medium text-[#1F2933] mb-1.5">{t("personalInfo.timezone")}</label>
          <select
            value={isKnownTz ? timezone : "__other__"}
            onChange={(e) => { if (e.target.value !== "__other__") setTimezone(e.target.value); }}
            className="w-full px-4 py-3 rounded-lg border border-[#E4E7E4] text-sm text-[#1F2933] bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
            {!isKnownTz && timezone && (
              <option value="__other__">{timezone}</option>
            )}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            {t("personalInfo.timezoneHint")}
            {detectedTimezone && timezone !== detectedTimezone && (
              <button
                type="button"
                onClick={() => setTimezone(detectedTimezone)}
                className="ml-1.5 text-[#445446] hover:underline"
              >
                {t("personalInfo.timezoneReset", { tz: detectedTimezone })}
              </button>
            )}
          </p>
        </div>
        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 bg-[#445446] hover:bg-[#3a4a3b] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? t("personalInfo.savingBtn") : t("personalInfo.saveBtn")}
          </button>
        </div>
      </div>
    </Section>
  );
};

// ─── Email section ────────────────────────────────────────────────────────────
const EmailSection = ({ profile, onLogout }) => {
  const { t } = useTranslation("parentDashboard");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleChange = async () => {
    if (!newEmail.trim() || !password) {
      setBanner({ type: "error", message: t("email.errors.required") });
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      await updateEmailApi({ email: newEmail.trim(), password });
      setEmailSent(true);
    } catch (err) {
      setBanner({
        type: "error",
        message: err?.response?.data?.error || t("email.errors.failed"),
      });
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Section title={t("email.title")} description={t("email.description")}>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-[#445446]/10 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-[#445446]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#1F2933] mb-1">
            {t("email.sentTitle")}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            <Trans i18nKey="email.sentLine1" ns="parentDashboard" values={{ email: newEmail }} components={[<span />, <strong />]} />
            <br />
            {t("email.sentLine2")}
          </p>
          <button
            onClick={onLogout}
            className="text-sm text-[#445446] font-medium hover:underline"
          >
            {t("email.signInNew")}
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section title={t("email.title")} description={t("email.description")}>
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4 py-3 bg-[#F5F7F5] rounded-lg border border-[#E4E7E4]">
          <span className="text-sm text-[#1F2933] font-medium">
            {profile.email}
          </span>
          {profile.is_verified ? (
            <span className="text-xs text-green-600 font-medium">{t("email.verified")}</span>
          ) : (
            <span className="text-xs text-amber-600 font-medium">{t("email.unverified")}</span>
          )}
        </div>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-[#445446] font-medium hover:underline"
          >
            {t("email.changeLink")}
          </button>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              {t("email.warning")}
            </div>
            <Banner type={banner?.type} message={banner?.message} />
            <Field label={t("email.newEmailLabel")}>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t("email.newEmailPlaceholder")}
              />
            </Field>
            <Field label={t("email.confirmPasswordLabel")}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("email.currentPasswordPlaceholder")}
              />
            </Field>
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => {
                  setShowForm(false);
                  setBanner(null);
                  setNewEmail("");
                  setPassword("");
                }}
                className="px-4 py-2.5 text-sm font-medium border border-[#E4E7E4] rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t("email.cancel")}
              </button>
              <button
                onClick={handleChange}
                disabled={loading}
                className="px-5 py-2.5 bg-[#445446] hover:bg-[#3a4a3b] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? t("email.sending") : t("email.sendVerification")}
              </button>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
};

// ─── Change Password section ──────────────────────────────────────────────────
const ChangePasswordSection = ({ onLogout }) => {
  const { t } = useTranslation("parentDashboard");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  const handleSave = async () => {
    if (!current || !next || !confirm) {
      setBanner({ type: "error", message: t("password.errors.allRequired") });
      return;
    }
    if (next.length < 8) {
      setBanner({ type: "error", message: t("password.errors.tooShort") });
      return;
    }
    if (next !== confirm) {
      setBanner({ type: "error", message: t("password.errors.mismatch") });
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      await changePasswordApi({ currentPassword: current, newPassword: next });
      setBanner({ type: "success", message: t("password.success") });
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(onLogout, 2000);
    } catch (err) {
      setBanner({
        type: "error",
        message: err?.response?.data?.error || t("password.errors.failed"),
      });
      setLoading(false);
    }
  };

  return (
    <Section title={t("password.title")} description={t("password.description")}>
      <div className="space-y-4">
        <Banner type={banner?.type} message={banner?.message} />
        <Field label={t("password.currentLabel")}>
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder={t("password.currentPlaceholder")}
          />
        </Field>
        <Field label={t("password.newLabel")}>
          <Input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder={t("password.newPlaceholder")}
          />
        </Field>
        <Field label={t("password.confirmLabel")}>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t("password.confirmPlaceholder")}
          />
        </Field>
        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 bg-[#445446] hover:bg-[#3a4a3b] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? t("password.updatingBtn") : t("password.updateBtn")}
          </button>
        </div>
      </div>
    </Section>
  );
};

// ─── Notification preferences section ────────────────────────────────────────
const NOTIF_ROWS = [
  { field: "notify_booking_confirmation", tKey: "bookingConfirmation" },
  { field: "notify_session_reminder",     tKey: "sessionReminder" },
  { field: "notify_expert_cancellation",  tKey: "expertCancellation" },
  { field: "notify_reschedule",           tKey: "reschedule" },
  { field: "notify_platform_updates",     tKey: "platformUpdates" },
];

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#445446] focus:ring-offset-2 ${
      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
    } ${checked ? "bg-[#445446]" : "bg-gray-200"}`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

const NotificationSection = () => {
  const { t } = useTranslation("parentDashboard");
  const defaultPrefs = Object.fromEntries(
    NOTIF_ROWS.map((r) => [r.field, r.field === "notify_platform_updates" ? false : true])
  );
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getParentNotificationPrefsApi()
      .then(setPrefs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = async (field, value) => {
    const prev = prefs;
    setPrefs((p) => ({ ...p, [field]: value }));
    setSaving(true);
    try {
      const saved = await updateParentNotificationPrefsApi({ [field]: value });
      setPrefs((p) => ({ ...p, ...saved }));
      showToast("success", t("notifications.toastSuccess"));
    } catch {
      setPrefs(prev);
      showToast("error", t("notifications.toastError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden">
      <div className="px-6 py-5 border-b border-[#E4E7E4] flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#1F2933]">
            {t("notifications.title")}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {t("notifications.description")}
          </p>
        </div>
        {saving && (
          <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin flex-shrink-0" />
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="divide-y divide-[#F0F2F0]">
          {NOTIF_ROWS.map(({ field, tKey }) => (
            <div key={field} className="flex items-start justify-between gap-6 px-6 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#1F2933]">{t(`notifications.rows.${tKey}.label`)}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {t(`notifications.rows.${tKey}.description`)}
                </p>
              </div>
              <Toggle
                checked={!!prefs[field]}
                onChange={(v) => handleToggle(field, v)}
                disabled={saving}
              />
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white z-50 transition-opacity ${
            toast.type === "success" ? "bg-[#445446]" : "bg-red-500"
          }`}
        >
          {toast.type === "success" ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
};

// ─── Two-Factor Authentication section ───────────────────────────────────────
const TwoFactorSection = () => {
  const { t } = useTranslation("parentDashboard");
  const [enabled, setEnabled] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [step, setStep] = useState("idle"); // 'idle' | 'entering_code'
  const [intent, setIntent] = useState(null); // 'enable' | 'disable'
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [successMsg, setSuccessMsg] = useState("");
  const codeInputRef = useRef(null);

  useEffect(() => {
    get2FAStatusApi()
      .then((data) => setEnabled(data.enabled))
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendCode = async (intentType) => {
    setSaving(true);
    setCodeError("");
    try {
      await sendSetupOtpApi({
        purpose: intentType === "enable" ? "enable_2fa" : "disable_2fa",
      });
      setIntent(intentType);
      setStep("entering_code");
      setCode("");
      setResendCooldown(60);
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } catch (err) {
      setCodeError(err?.response?.data?.error || t("twoFactor.errors.sendFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async () => {
    setCodeError("");
    try {
      await sendSetupOtpApi({
        purpose: intent === "enable" ? "enable_2fa" : "disable_2fa",
      });
      setCode("");
      setResendCooldown(60);
    } catch (err) {
      setCodeError(err?.response?.data?.error || t("twoFactor.errors.sendFailed"));
    }
  };

  const doVerify = async (codeVal) => {
    if (saving || codeVal.length !== 6) return;
    setSaving(true);
    setCodeError("");
    try {
      if (intent === "enable") {
        await enable2FAApi({ code: codeVal });
        setEnabled(true);
        setSuccessMsg(t("twoFactor.enabledMsg"));
      } else {
        await disable2FAApi({ code: codeVal });
        setEnabled(false);
        setSuccessMsg(t("twoFactor.disabledMsg"));
      }
      setStep("idle");
      setCode("");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.expired) {
        setCodeError(t("twoFactor.errors.expired"));
      } else {
        setCodeError(errData?.error || t("twoFactor.errors.incorrect"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setStep("idle");
    setCode("");
    setCodeError("");
    setIntent(null);
  };

  const titleRight = !loadingStatus && (
    <span
      className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
        enabled
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-gray-100 text-gray-500 border-gray-200"
      }`}
    >
      {enabled ? t("twoFactor.statusEnabled") : t("twoFactor.statusDisabled")}
    </span>
  );

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden">
      <div className="px-6 py-5 border-b border-[#E4E7E4] flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#1F2933]">
            {t("twoFactor.title")}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {t("twoFactor.description")}
          </p>
        </div>
        {titleRight}
      </div>

      <div className="px-6 py-6">
        {loadingStatus ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          </div>
        ) : step === "idle" ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              {enabled ? t("twoFactor.bodyEnabled") : t("twoFactor.bodyDisabled")}
            </p>

            {successMsg && <Banner type="success" message={successMsg} />}
            {codeError && <Banner type="error" message={codeError} />}

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSendCode(enabled ? "disable" : "enable")}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                enabled
                  ? "border-red-200 text-red-600 hover:bg-red-50"
                  : "bg-[#445446] hover:bg-[#3a4a3b] text-white border-transparent"
              }`}
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  {t("twoFactor.sendingCode")}
                </>
              ) : enabled ? (
                t("twoFactor.disableBtn")
              ) : (
                t("twoFactor.enableBtn")
              )}
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); doVerify(code); }}
            className="space-y-4"
          >
            <p className="text-sm text-gray-600 leading-relaxed">
              {intent === "enable"
                ? t("twoFactor.codeInstructEnable")
                : t("twoFactor.codeInstructDisable")}
            </p>

            <div>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(val);
                  if (codeError) setCodeError("");
                  if (val.length === 6) doVerify(val);
                }}
                placeholder="000000"
                className={`w-full px-4 py-3 rounded-lg border text-sm text-center tracking-[0.5em] font-mono text-[#1F2933] placeholder-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition ${
                  codeError ? "border-red-400" : "border-[#E4E7E4]"
                }`}
              />
              {codeError && (
                <p className="mt-1.5 text-xs text-red-500">{codeError}</p>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="submit"
                disabled={saving || code.length !== 6}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#445446] hover:bg-[#3a4a3b] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving && (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                )}
                {saving ? t("twoFactor.verifyingBtn") : t("twoFactor.confirmBtn")}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 text-sm font-medium border border-[#E4E7E4] rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t("twoFactor.cancelBtn")}
              </button>
              <span className="ml-auto text-xs">
                {resendCooldown > 0 ? (
                  <span className="text-gray-400">{t("twoFactor.resendIn", { count: resendCooldown })}</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-[#445446] hover:underline"
                  >
                    {t("twoFactor.resendCode")}
                  </button>
                )}
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Data Export section ──────────────────────────────────────────────────────
const DataExportSection = () => {
  const { t } = useTranslation("parentDashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await exportMyDataApi();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sage-nest-data-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("dataExport.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section title={t("dataExport.title")} description={t("dataExport.description")}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          {t("dataExport.body")}
        </p>
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
        <button
          onClick={handleExport}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#445446] hover:bg-[#3a4a3b] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              {t("dataExport.preparingBtn")}
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              {t("dataExport.downloadBtn")}
            </>
          )}
        </button>
      </div>
    </Section>
  );
};

// ─── Legal consents section ───────────────────────────────────────────────────
function fmtDate(iso, lng = "en") {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(lng === "it" ? "it-IT" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ConsentRow = ({ label, children }) => (
  <div className="py-4 first:pt-0 last:pb-0">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
      {label}
    </p>
    {children}
  </div>
);

const LegalConsentsSection = () => {
  const { t, i18n } = useTranslation("parentDashboard");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marketingSaving, setMarketingSaving] = useState(false);
  const [marketingBanner, setMarketingBanner] = useState(null);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  useEffect(() => {
    getLegalConsentsApi()
      .then(setData)
      .catch(() => setError(t("legalConsents.loadError")))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarketingChange = async (newValue) => {
    if (!newValue && !showWithdrawConfirm) {
      setShowWithdrawConfirm(true);
      return;
    }
    setShowWithdrawConfirm(false);
    setMarketingSaving(true);
    setMarketingBanner(null);
    try {
      const updated = await updateMarketingConsentApi(newValue);
      setData((prev) => ({
        ...prev,
        marketing_consent: updated.marketing_consent,
        marketing_accepted_at: updated.marketing_accepted_at,
      }));
      setMarketingBanner({
        type: "success",
        message: newValue ? t("legalConsents.optInSuccess") : t("legalConsents.optOutSuccess"),
      });
    } catch {
      setMarketingBanner({ type: "error", message: t("legalConsents.updateError") });
    } finally {
      setMarketingSaving(false);
    }
  };

  const lng = i18n.language;
  const latestPp = data?.privacy_policy?.[0];
  const latestTcReg = data?.terms_registration?.[0];
  const bookingTcCount = data?.terms_per_booking?.length ?? 0;
  const latestBookingTc = data?.terms_per_booking?.[0];

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden">
      <div className="px-6 py-5 border-b border-[#E4E7E4]">
        <h3 className="text-base font-semibold text-[#1F2933]">{t("legalConsents.title")}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{t("legalConsents.description")}</p>
      </div>

      <div className="px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <div className="divide-y divide-[#F0F2F0] space-y-0">

            {/* Privacy Policy */}
            <ConsentRow label={t("legalConsents.ppLabel")}>
              {latestPp ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#1F2933] font-medium">
                      {t("legalConsents.version", { version: latestPp.version })}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t("legalConsents.accepted", { date: fmtDate(latestPp.accepted_at, lng) })}
                    </p>
                    {data.privacy_policy.length > 1 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {t("legalConsents.previousVersions", { count: data.privacy_policy.length - 1 })}
                      </p>
                    )}
                  </div>
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-xs text-[#445446] hover:underline font-medium"
                  >
                    {t("legalConsents.viewLink")}
                  </a>
                </div>
              ) : (
                <p className="text-sm text-gray-400">{t("legalConsents.noRecord")}</p>
              )}
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {t("legalConsents.ppRequired")}
              </p>
            </ConsentRow>

            {/* Terms & Conditions */}
            <ConsentRow label={t("legalConsents.tcLabel")}>
              {latestTcReg ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#1F2933] font-medium">
                      {t("legalConsents.version", { version: latestTcReg.version })}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t("legalConsents.acceptedAtReg", { date: fmtDate(latestTcReg.accepted_at, lng) })}
                    </p>
                    {bookingTcCount > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {t("legalConsents.reaccepted", { count: bookingTcCount })}
                        {latestBookingTc
                          ? t("legalConsents.reacceptedLatest", {
                              version: latestBookingTc.version,
                              date: fmtDate(latestBookingTc.accepted_at, lng),
                            })
                          : ""}.
                      </p>
                    )}
                  </div>
                  <a
                    href="/terms-and-conditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-xs text-[#445446] hover:underline font-medium"
                  >
                    {t("legalConsents.viewLink")}
                  </a>
                </div>
              ) : (
                <p className="text-sm text-gray-400">{t("legalConsents.noRecord")}</p>
              )}
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {t("legalConsents.tcRequired")}
              </p>
            </ConsentRow>

            {/* Marketing consent */}
            <ConsentRow label={t("legalConsents.marketingLabel")}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {data.marketing_consent ? (
                    <p className="text-sm text-[#1F2933] font-medium">
                      {t("legalConsents.optedIn")}
                      {data.marketing_accepted_at && (
                        <span className="font-normal text-gray-500">
                          {" "}{t("legalConsents.since", { date: fmtDate(data.marketing_accepted_at, lng) })}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-[#1F2933] font-medium">
                      {t("legalConsents.notOptedIn")}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {t("legalConsents.marketingBody")}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={data.marketing_consent}
                  disabled={marketingSaving}
                  onClick={() => handleMarketingChange(!data.marketing_consent)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#445446] focus:ring-offset-2 ${
                    marketingSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  } ${data.marketing_consent ? "bg-[#445446]" : "bg-gray-200"}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                      data.marketing_consent ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {marketingBanner && (
                <div
                  className={`mt-3 px-4 py-3 rounded-lg border text-sm ${
                    marketingBanner.type === "success"
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-red-50 border-red-200 text-red-600"
                  }`}
                >
                  {marketingBanner.message}
                </div>
              )}

              {showWithdrawConfirm && (
                <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                  <p className="text-sm text-amber-800">
                    {t("legalConsents.withdrawWarning")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarketingChange(false)}
                      disabled={marketingSaving}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {marketingSaving ? t("legalConsents.saving") : t("legalConsents.withdrawConfirm")}
                    </button>
                    <button
                      onClick={() => setShowWithdrawConfirm(false)}
                      className="px-4 py-2 border border-amber-300 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      {t("legalConsents.cancel")}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                {t("legalConsents.gdprNote")}
              </p>
            </ConsentRow>

          </div>
        )}
      </div>
    </div>
  );
};

// ─── Delete Account section ───────────────────────────────────────────────────
const DeleteAccountSection = ({ onLogout }) => {
  const { t } = useTranslation("parentDashboard");
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!password) {
      setError(t("deleteAccount.errors.passwordRequired"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await deleteAccountApi({ password });
      onLogout();
    } catch (err) {
      const errData = err?.response?.data;
      setError(errData?.error || t("deleteAccount.errors.failed"));
      if (errData?.has_upcoming_bookings || errData?.has_pending_transactions) {
        setShowConfirm(false);
        setPassword("");
      }
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-red-100">
        <h3 className="text-base font-semibold text-red-600">{t("deleteAccount.title")}</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {t("deleteAccount.description")}
        </p>
      </div>
      <div className="px-6 py-6">
        {error && !showConfirm && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
        {!showConfirm ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 leading-relaxed space-y-3">
              <div>
                <p className="font-medium text-gray-700 mb-1">{t("deleteAccount.permanentlyDeleted")}</p>
                <ul className="list-disc list-inside text-gray-500 space-y-1 pl-2">
                  <li>{t("deleteAccount.itemName")}</li>
                  <li>{t("deleteAccount.itemCredentials")}</li>
                  <li>{t("deleteAccount.itemTextContent")}</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">{t("deleteAccount.retainedAnon")}</p>
                <ul className="list-disc list-inside text-gray-500 space-y-1 pl-2">
                  <li>{t("deleteAccount.itemBookings")}</li>
                  <li>{t("deleteAccount.itemTransactions")}</li>
                </ul>
              </div>
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                {t("deleteAccount.privacyNote")}
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {t("deleteAccount.warning")}
              </p>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="px-5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-medium rounded-lg transition-colors"
            >
              {t("deleteAccount.deleteBtn")}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-1">
              <Trans
                i18nKey="deleteAccount.irreversibleWarning"
                ns="parentDashboard"
                components={[<span />, <strong />]}
              />
              <p className="text-red-600">
                {t("deleteAccount.irreversibleNote")}
              </p>
            </div>
            <Field label={t("deleteAccount.confirmPasswordLabel")}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("deleteAccount.currentPasswordPlaceholder")}
                error={!!error}
              />
            </Field>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setPassword("");
                  setError("");
                }}
                className="flex-1 py-2.5 text-sm font-medium border border-[#E4E7E4] rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t("deleteAccount.cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? t("deleteAccount.deleting") : t("deleteAccount.confirmBtn")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const ParentProfilePage = () => {
  const { t } = useTranslation("parentDashboard");
  const { logout, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getProfileApi()
      .then(setProfile)
      .catch(() => setError(t("profile.loadError")))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileUpdated = (updated) => {
    setProfile((prev) => ({ ...prev, ...updated }));
    if (updateUser) updateUser(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        {error || t("profile.loadErrorFallback")}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-xl font-semibold text-[#1F2933]">{t("profile.title")}</h2>
        <p className="text-sm text-gray-500 mt-1">{t("profile.subtitle")}</p>
      </div>

      <div className="space-y-6">
        <PersonalInfoSection
          profile={profile}
          onUpdated={handleProfileUpdated}
        />
        <EmailSection profile={profile} onLogout={logout} />
        <NotificationSection />
        <ChangePasswordSection onLogout={logout} />
        <TwoFactorSection />
        <DataExportSection />
        <LegalConsentsSection />
        <DeleteAccountSection onLogout={logout} />
      </div>
    </div>
  );
};

export default ParentProfilePage;
