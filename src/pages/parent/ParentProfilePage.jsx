import { useState, useEffect, useRef } from "react";
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
    if (!name.trim()) errs.name = "Name is required.";
    if (!phone.trim()) {
      errs.phone = "Phone number is required.";
    } else if (!validatePhone(phone)) {
      errs.phone = "Please enter a valid phone number (e.g. +44 7700 900000).";
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
      setBanner({ type: "success", message: "Profile updated successfully." });
    } catch (err) {
      setBanner({
        type: "error",
        message: err?.response?.data?.error || "Could not save changes.",
      });
    } finally {
      setLoading(false);
    }
  };

  const isKnownTz = TIMEZONES.some((t) => t.value === timezone);

  return (
    <Section
      title="Personal information"
      description="Your name, contact details, and location."
    >
      <div className="space-y-4">
        <Banner type={banner?.type} message={banner?.message} />
        <Field label="Full name">
          <Input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })); }}
            placeholder="Jane Smith"
            error={!!fieldErrors.name}
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
        </Field>
        <div>
          <label className="block text-sm font-medium text-[#1F2933] mb-1.5">Phone number</label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setFieldErrors((p) => ({ ...p, phone: undefined })); }}
            placeholder="+44 7700 900000"
            error={!!fieldErrors.phone}
          />
          {fieldErrors.phone ? (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-400">So your expert can reach you about your session.</p>
          )}
        </div>
        <Field label="City / Location (optional)">
          <Input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. London"
          />
          <p className="mt-1 text-xs text-gray-400">Helps match you with nearby in-person specialists.</p>
        </Field>
        <div>
          <label className="block text-sm font-medium text-[#1F2933] mb-1.5">Timezone</label>
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
            Used to display session times correctly.
            {detectedTimezone && timezone !== detectedTimezone && (
              <button
                type="button"
                onClick={() => setTimezone(detectedTimezone)}
                className="ml-1.5 text-[#445446] hover:underline"
              >
                Reset to detected ({detectedTimezone})
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
            {loading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </Section>
  );
};

// ─── Email section ────────────────────────────────────────────────────────────
const EmailSection = ({ profile, onLogout }) => {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleChange = async () => {
    if (!newEmail.trim() || !password) {
      setBanner({
        type: "error",
        message: "New email and current password are required.",
      });
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
        message: err?.response?.data?.error || "Could not update email.",
      });
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Section
        title="Email address"
        description="Used to log in and receive notifications."
      >
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
            Verify your new email
          </p>
          <p className="text-sm text-gray-500 mb-4">
            We sent a verification link to <strong>{newEmail}</strong>.<br />
            Click it to activate your new address. You have been signed out.
          </p>
          <button
            onClick={onLogout}
            className="text-sm text-[#445446] font-medium hover:underline"
          >
            Sign in with new email
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section
      title="Email address"
      description="Used to log in and receive notifications."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4 py-3 bg-[#F5F7F5] rounded-lg border border-[#E4E7E4]">
          <span className="text-sm text-[#1F2933] font-medium">
            {profile.email}
          </span>
          {profile.is_verified ? (
            <span className="text-xs text-green-600 font-medium">Verified</span>
          ) : (
            <span className="text-xs text-amber-600 font-medium">
              Unverified
            </span>
          )}
        </div>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-[#445446] font-medium hover:underline"
          >
            Change email address
          </button>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              Changing your email will sign you out. You must verify the new
              address before logging back in.
            </div>
            <Banner type={banner?.type} message={banner?.message} />
            <Field label="New email address">
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com"
              />
            </Field>
            <Field label="Confirm with current password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your current password"
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
                Cancel
              </button>
              <button
                onClick={handleChange}
                disabled={loading}
                className="px-5 py-2.5 bg-[#445446] hover:bg-[#3a4a3b] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? "Sending…" : "Send verification"}
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
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  const handleSave = async () => {
    if (!current || !next || !confirm) {
      setBanner({ type: "error", message: "All fields are required." });
      return;
    }
    if (next.length < 8) {
      setBanner({
        type: "error",
        message: "New password must be at least 8 characters.",
      });
      return;
    }
    if (next !== confirm) {
      setBanner({ type: "error", message: "New passwords do not match." });
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      await changePasswordApi({ currentPassword: current, newPassword: next });
      setBanner({
        type: "success",
        message:
          "Password changed. You have been signed out of all other sessions.",
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      // Sign out current session too — user should re-login with new password
      setTimeout(onLogout, 2000);
    } catch (err) {
      setBanner({
        type: "error",
        message: err?.response?.data?.error || "Could not change password.",
      });
      setLoading(false);
    }
  };

  return (
    <Section
      title="Change password"
      description="Requires your current password for confirmation."
    >
      <div className="space-y-4">
        <Banner type={banner?.type} message={banner?.message} />
        <Field label="Current password">
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Enter current password"
          />
        </Field>
        <Field label="New password">
          <Input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Minimum 8 characters"
          />
        </Field>
        <Field label="Confirm new password">
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat new password"
          />
        </Field>
        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 bg-[#445446] hover:bg-[#3a4a3b] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </div>
      </div>
    </Section>
  );
};

// ─── Notification preferences section ────────────────────────────────────────
const NOTIF_ROWS = [
  {
    field: "notify_booking_confirmation",
    label: "Booking confirmation",
    description: "Receive an email when your payment is processed and your booking is confirmed.",
  },
  {
    field: "notify_session_reminder",
    label: "Session reminder",
    description: "Reminders sent 24 hours and 1 hour before your session.",
  },
  {
    field: "notify_expert_cancellation",
    label: "Cancellation by specialist",
    description: "Receive an email if your specialist cancels an upcoming session.",
  },
  {
    field: "notify_reschedule",
    label: "Reschedule confirmation",
    description: "Receive a confirmation email after you move a booking to a new time.",
  },
  {
    field: "notify_platform_updates",
    label: "Platform updates",
    description: "Occasional product news, tips, and announcements from Sage Nest.",
  },
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
      showToast("success", "Preference saved");
    } catch {
      setPrefs(prev);
      showToast("error", "Could not save — please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden">
      <div className="px-6 py-5 border-b border-[#E4E7E4] flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#1F2933]">
            Email notifications
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Choose which emails Sage Nest sends you.
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
          {NOTIF_ROWS.map(({ field, label, description }) => (
            <div key={field} className="flex items-start justify-between gap-6 px-6 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#1F2933]">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {description}
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
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
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
      setCodeError(err?.response?.data?.error || "Failed to send code. Try again.");
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
      setCodeError(err?.response?.data?.error || "Failed to resend. Try again.");
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
        setSuccessMsg("Two-factor authentication enabled.");
      } else {
        await disable2FAApi({ code: codeVal });
        setEnabled(false);
        setSuccessMsg("Two-factor authentication disabled.");
      }
      setStep("idle");
      setCode("");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.expired) {
        setCodeError("Code expired. Please request a new one.");
      } else {
        setCodeError(errData?.error || "Incorrect code. Please try again.");
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
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden">
      <div className="px-6 py-5 border-b border-[#E4E7E4] flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#1F2933]">
            Two-factor authentication
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Require an email code each time you sign in.
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
              {enabled
                ? "A 6-digit verification code is sent to your email each time you sign in."
                : "When enabled, you'll need to enter a one-time code sent to your email on every sign-in. This protects your account and payment information even if your password is compromised."}
            </p>

            {successMsg && (
              <Banner type="success" message={successMsg} />
            )}
            {codeError && (
              <Banner type="error" message={codeError} />
            )}

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
                  Sending code…
                </>
              ) : enabled ? (
                "Disable 2FA"
              ) : (
                "Enable 2FA"
              )}
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); doVerify(code); }}
            className="space-y-4"
          >
            <p className="text-sm text-gray-600 leading-relaxed">
              A 6-digit code was sent to your email. Enter it below to{" "}
              <strong>{intent === "enable" ? "enable" : "disable"}</strong>{" "}
              two-factor authentication.
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
                {saving ? "Verifying…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 text-sm font-medium border border-[#E4E7E4] rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <span className="ml-auto text-xs">
                {resendCooldown > 0 ? (
                  <span className="text-gray-400">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-[#445446] hover:underline"
                  >
                    Resend code
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
      setError("Could not generate your data export. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section
      title="Download my data"
      description="Export a copy of all personal data we hold about you (GDPR Article 20)."
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          Your export will include your name, email, phone number, full booking
          history, reviews you have left, and all consent records in a
          structured JSON file.
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
              Preparing…
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
              Download my data
            </>
          )}
        </button>
      </div>
    </Section>
  );
};

// ─── Legal consents section ───────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marketingSaving, setMarketingSaving] = useState(false);
  const [marketingBanner, setMarketingBanner] = useState(null);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  useEffect(() => {
    getLegalConsentsApi()
      .then(setData)
      .catch(() => setError("Could not load consent records."))
      .finally(() => setLoading(false));
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
        message: newValue
          ? "You have opted in to marketing emails."
          : "Marketing consent withdrawn. You will no longer receive marketing emails.",
      });
    } catch {
      setMarketingBanner({
        type: "error",
        message: "Could not update marketing consent. Please try again.",
      });
    } finally {
      setMarketingSaving(false);
    }
  };

  const latestPp = data?.privacy_policy?.[0];
  const latestTcReg = data?.terms_registration?.[0];
  const bookingTcCount = data?.terms_per_booking?.length ?? 0;
  const latestBookingTc = data?.terms_per_booking?.[0];

  return (
    <div className="bg-white rounded-2xl border border-[#E4E7E4] overflow-hidden">
      <div className="px-6 py-5 border-b border-[#E4E7E4]">
        <h3 className="text-base font-semibold text-[#1F2933]">Legal consents</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          A record of the legal documents you have accepted and your consent choices.
        </p>
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
            <ConsentRow label="Privacy Policy">
              {latestPp ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#1F2933] font-medium">
                      Version {latestPp.version}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Accepted {fmtDate(latestPp.accepted_at)}
                    </p>
                    {data.privacy_policy.length > 1 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Previously accepted {data.privacy_policy.length - 1} earlier version{data.privacy_policy.length > 2 ? "s" : ""}.
                      </p>
                    )}
                  </div>
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-xs text-[#445446] hover:underline font-medium"
                  >
                    View ↗
                  </a>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No record found.</p>
              )}
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Required to use Sage Nest. Cannot be withdrawn without deleting your account.
              </p>
            </ConsentRow>

            {/* Terms & Conditions */}
            <ConsentRow label="Terms &amp; Conditions">
              {latestTcReg ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#1F2933] font-medium">
                      Version {latestTcReg.version}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Accepted at registration {fmtDate(latestTcReg.accepted_at)}
                    </p>
                    {bookingTcCount > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Re-accepted {bookingTcCount} updated version{bookingTcCount !== 1 ? "s" : ""}
                        {latestBookingTc ? ` — most recently v${latestBookingTc.version} on ${fmtDate(latestBookingTc.accepted_at)}` : ""}.
                      </p>
                    )}
                  </div>
                  <a
                    href="/terms-and-conditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-xs text-[#445446] hover:underline font-medium"
                  >
                    View ↗
                  </a>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No record found.</p>
              )}
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Required to book sessions. Cannot be withdrawn without cancelling all bookings and deleting your account.
              </p>
            </ConsentRow>

            {/* Marketing consent */}
            <ConsentRow label="Marketing emails">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {data.marketing_consent ? (
                    <p className="text-sm text-[#1F2933] font-medium">
                      Opted in
                      {data.marketing_accepted_at && (
                        <span className="font-normal text-gray-500">
                          {" "}— since {fmtDate(data.marketing_accepted_at)}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-[#1F2933] font-medium">
                      Not opted in
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Occasional product news and tips from Sage Nest. Optional and independent of your bookings.
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
                    Withdrawing marketing consent means you will stop receiving product news and tips. Your bookings and account will not be affected.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarketingChange(false)}
                      disabled={marketingSaving}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {marketingSaving ? "Saving…" : "Yes, withdraw consent"}
                    </button>
                    <button
                      onClick={() => setShowWithdrawConfirm(false)}
                      className="px-4 py-2 border border-amber-300 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                You can withdraw or re-grant this consent at any time under GDPR Article 7(3). Withdrawal does not affect the lawfulness of processing based on consent before its withdrawal.
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!password) {
      setError("Please enter your password to confirm.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await deleteAccountApi({ password });
      onLogout();
    } catch (err) {
      const errData = err?.response?.data;
      setError(errData?.error || "Could not delete account. Please try again.");
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
        <h3 className="text-base font-semibold text-red-600">Delete account</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Permanently erase your personal data. This cannot be undone.
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
            <div className="text-sm text-gray-600 leading-relaxed space-y-2">
              <p>Deleting your account will immediately and permanently remove:</p>
              <ul className="list-disc list-inside text-gray-500 space-y-1 pl-2">
                <li>Your name, email address, and phone number</li>
                <li>Your password and login access</li>
              </ul>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                You must cancel any upcoming bookings and wait for all transactions
                to be settled before your account can be deleted.
              </p>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="px-5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-medium rounded-lg transition-colors"
            >
              Delete my account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              This action is <strong>permanent and irreversible</strong>. All
              your personal data will be erased immediately.
            </div>
            <Field label="Enter your password to confirm">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your current password"
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
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? "Deleting…" : "Yes, delete my account"}
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
  const { logout, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getProfileApi()
      .then(setProfile)
      .catch(() => setError("Could not load your profile."))
      .finally(() => setLoading(false));
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
        {error || "Could not load profile."}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-xl font-semibold text-[#1F2933]">My Profile</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage your personal information and account settings.
        </p>
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
