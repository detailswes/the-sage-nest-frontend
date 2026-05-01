import { useState, useEffect, useRef } from "react";
import {
  changePasswordApi,
  get2FAStatusApi,
  sendSetupOtpApi,
  enable2FAApi,
  disable2FAApi,
  deleteAccountApi,
} from "../../../api/authApi";
import { useAuth } from "../../../context/AuthContext";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../../../api/expertApi";
import { checkPasswordStrength } from "../../../utils/validation";

// ─── Shared helpers ───────────────────────────────────────────────────────────

const EyeIcon = ({ open }) =>
  open ? (
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
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  ) : (
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
        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );

const ToggleRow = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => (
  <div className="flex items-start justify-between gap-4 py-4">
    <div className="min-w-0">
      <p
        className={`text-sm font-medium ${
          disabled ? "text-gray-400" : "text-[#1F2933]"
        }`}
      >
        {label}
        {disabled && (
          <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            Coming soon
          </span>
        )}
      </p>
      <p
        className={`text-xs mt-0.5 ${
          disabled ? "text-gray-300" : "text-gray-500"
        }`}
      >
        {description}
      </p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#445446] focus:ring-offset-2 ${
        disabled
          ? "cursor-not-allowed bg-gray-200"
          : checked
          ? "bg-[#445446] cursor-pointer"
          : "bg-gray-200 cursor-pointer"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          checked && !disabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

// ─── Password strength rules (mirror backend validatePasswordStrength) ─────────
function getPasswordError(password) {
  if (!password || password.length < 8) return "At least 8 characters";
  if (!/[A-Z]/.test(password)) return "At least one uppercase letter";
  if (!/[a-z]/.test(password)) return "At least one lowercase letter";
  if (!/[0-9]/.test(password)) return "At least one number";
  if (!/[^a-zA-Z0-9]/.test(password))
    return "At least one special character (e.g. !, @, #)";
  return null;
}

// ─── Password field (must be outside ChangePasswordCard to avoid focus loss) ───
const inputClass =
  "w-full px-4 py-3 rounded-lg border border-[#E4E7E4] text-sm text-[#1F2933] placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition pr-10";

const PasswordField = ({
  name,
  label,
  placeholder,
  show,
  setShow,
  value,
  onChange,
  error,
}) => (
  <div>
    <label className="block text-sm font-medium text-[#1F2933] mb-1.5">
      {label}
    </label>
    <div className="relative">
      <input
        type={show[name] ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={name === "current" ? "current-password" : "new-password"}
        className={`${inputClass} ${
          error ? "border-red-400 focus:border-red-400 focus:ring-red-200" : ""
        }`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => ({ ...s, [name]: !s[name] }))}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        tabIndex={-1}
      >
        <EyeIcon open={show[name]} />
      </button>
    </div>
    {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
  </div>
);

// ─── Change Password card ─────────────────────────────────────────────────────
const ChangePasswordCard = () => {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name } = e.target;
    setForm((f) => ({ ...f, [name]: e.target.value }));
    if (fieldErrors[name]) setFieldErrors((fe) => ({ ...fe, [name]: "" }));
    if (success) setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = { current: "", next: "", confirm: "" };
    let hasError = false;

    if (!form.current.trim()) {
      errors.current = "Current password is required.";
      hasError = true;
    }

    const pwError = getPasswordError(form.next);
    if (pwError) {
      errors.next = pwError;
      hasError = true;
    } else if (form.current && form.current === form.next) {
      errors.next =
        "New password must be different from your current password.";
      hasError = true;
    }

    if (!form.confirm) {
      errors.confirm = "Please confirm your new password.";
      hasError = true;
    } else if (form.next !== form.confirm) {
      errors.confirm = "Passwords do not match.";
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(errors);
      setSuccess(false);
      return;
    }

    setSaving(true);
    setFieldErrors({ current: "", next: "", confirm: "" });
    setSuccess(false);
    try {
      await changePasswordApi({
        currentPassword: form.current,
        newPassword: form.next,
      });
      setForm({ current: "", next: "", confirm: "" });
      setSuccess(true);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        "Failed to change password. Please try again.";
      // "Current password is incorrect" → attach to current field
      if (
        msg.toLowerCase().includes("current") ||
        msg.toLowerCase().includes("incorrect")
      ) {
        setFieldErrors((fe) => ({ ...fe, current: msg }));
      } else {
        setFieldErrors((fe) => ({ ...fe, confirm: msg }));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E4E7E4] px-6 py-5">
      <div className="flex items-center gap-2.5 mb-5">
        <svg
          className="w-4 h-4 text-[#445446]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
        <h2 className="text-sm font-semibold text-[#1F2933]">
          Change Password
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          name="current"
          label="Current password"
          placeholder="Enter your current password"
          show={show}
          setShow={setShow}
          value={form.current}
          onChange={handleChange}
          error={fieldErrors.current}
        />
        <div>
          <PasswordField
            name="next"
            label="New password"
            placeholder="Min 8 chars, uppercase, number, symbol"
            show={show}
            setShow={setShow}
            value={form.next}
            onChange={handleChange}
            error={fieldErrors.next}
          />
          {form.next && (
            <ul className="mt-2 space-y-1">
              {checkPasswordStrength(form.next).map(({ label, ok }) => (
                <li
                  key={label}
                  className={`flex items-center gap-1.5 text-xs ${
                    ok ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {ok ? (
                    <svg
                      className="w-3.5 h-3.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-3.5 h-3.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-4.75a.75.75 0 0 0 1.5 0V8.75a.75.75 0 0 0-1.5 0v4.5Zm.75-7a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <PasswordField
          name="confirm"
          label="Confirm new password"
          placeholder="Repeat your new password"
          show={show}
          setShow={setShow}
          value={form.confirm}
          onChange={handleChange}
          error={fieldErrors.confirm}
        />

        {success && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                clipRule="evenodd"
              />
            </svg>
            Password changed successfully. All other devices have been signed
            out.
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors duration-200"
          >
            {saving && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            {saving ? "Saving…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Notification Preferences card ───────────────────────────────────────────
const NotificationPreferencesCard = () => {
  const [prefs, setPrefs] = useState({
    notify_new_booking: true,
    notify_cancellation: true,
    notify_reminder: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getNotificationPreferences()
      .then((data) => setPrefs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (field, value) => {
    const prev = prefs;
    setPrefs((p) => ({ ...p, [field]: value }));
    setSaving(true);
    try {
      const saved = await updateNotificationPreferences({ [field]: value });
      setPrefs((p) => ({ ...p, ...saved }));
      showToast("success", "Preferences saved");
    } catch {
      setPrefs(prev);
      showToast("error", "Failed to save — please try again");
    } finally {
      setSaving(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E4E7E4] px-6">
      <div className="flex items-center gap-2.5 py-4 border-b border-[#E4E7E4]">
        <svg
          className="w-4 h-4 text-[#445446]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        <span className="text-sm font-semibold text-[#1F2933]">
          Email Notifications
        </span>
        {saving && (
          <div className="ml-auto w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="divide-y divide-[#F0F2F0]">
          <ToggleRow
            label="New booking"
            description="Receive an email when a parent books a session with you."
            checked={prefs.notify_new_booking}
            onChange={(v) => handleToggle("notify_new_booking", v)}
          />
          <ToggleRow
            label="Cancellation"
            description="Receive an email when a parent cancels a booking."
            checked={prefs.notify_cancellation}
            onChange={(v) => handleToggle("notify_cancellation", v)}
          />
          <ToggleRow
            label="Session reminders"
            description="Receive reminder emails 24 hours and 1 hour before each session."
            checked={prefs.notify_reminder}
            onChange={(v) => handleToggle("notify_reminder", v)}
          />
          <ToggleRow
            label="Message received"
            description="Receive an email when a parent sends you a message."
            checked={false}
            disabled
          />
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white z-50 ${
            toast.type === "success" ? "bg-[#445446]" : "bg-red-500"
          }`}
        >
          {toast.type === "success" ? (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
};

// ─── Delete Account card ──────────────────────────────────────────────────────
const DeleteAccountCard = () => {
  const { logout, user } = useAuth();
  const isParent = user?.role === "PARENT";
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      logout();
    } catch (err) {
      const errData = err?.response?.data;
      setError(errData?.error || "Could not delete account. Please try again.");
      // Any blocking condition — collapse back to the card-level view so the
      // message is clearly visible rather than buried inside the confirm form.
      if (
        errData?.has_pending_payout ||
        errData?.has_upcoming_bookings ||
        errData?.has_pending_transactions
      ) {
        setShowConfirm(false);
        setPassword("");
      }
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-red-200 px-6 py-5">
      <div className="flex items-center gap-2.5 mb-1">
        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
        </svg>
        <h2 className="text-sm font-semibold text-red-600">Delete Account</h2>
      </div>

      {error && !showConfirm && (
        <div className="mt-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {error}
        </div>
      )}

      {!showConfirm ? (
        <div className="mt-3 space-y-3">
          {isParent ? (
            <div className="text-xs text-gray-500 leading-relaxed space-y-2">
              <p>The following will be <strong>permanently deleted:</strong></p>
              <ul className="list-disc list-inside text-gray-400 space-y-0.5 pl-1">
                <li>Your name, email, and contact details</li>
                <li>Your password and login access</li>
                <li>All booking history and account data</li>
              </ul>
            </div>
          ) : (
            <div className="text-xs text-gray-500 leading-relaxed space-y-2">
              <p>The following will be <strong>permanently deleted:</strong></p>
              <ul className="list-disc list-inside text-gray-400 space-y-0.5 pl-1">
                <li>Profile photo, biography, and expertise</li>
                <li>Address, social links, and contact details</li>
                <li>Qualifications, certifications, and insurance documents</li>
                <li>Your password and login access</li>
              </ul>
              <p className="mt-2">The following will be <strong>retained for 5 years</strong> under DAC7 (EU tax reporting obligations):</p>
              <ul className="list-disc list-inside text-gray-400 space-y-0.5 pl-1">
                <li>Your full name and tax identification number</li>
                <li>Bank account details (IBAN)</li>
                <li>Earnings and booking records tied to financial transactions</li>
              </ul>
            </div>
          )}
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {isParent
              ? "Deletion is blocked if you have upcoming bookings, pending refunds, or open disputes. Please resolve these first."
              : "Deletion is blocked if you have a pending payout. Please wait for it to clear first."}
          </p>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-medium rounded-lg transition-colors"
          >
            Delete my account
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            This action is <strong>permanent and irreversible.</strong> Your profile and login access will be deleted immediately.
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1.5">
              Enter your password to confirm
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                placeholder="Your current password"
                className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition pr-10 ${error ? "border-red-400" : "border-[#E4E7E4]"}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setShowConfirm(false); setPassword(""); setError(""); }}
              className="flex-1 py-2.5 text-sm font-medium border border-[#E4E7E4] rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleDelete}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? "Deleting…" : "Yes, delete my account"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


// ─── Two-Factor Authentication card ──────────────────────────────────────────
const TwoFactorCard = () => {
  const [enabled, setEnabled] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [step, setStep] = useState("idle"); // 'idle' | 'entering_code'
  const [intent, setIntent] = useState(null); // 'enable' | 'disable'
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [saving, setSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [successMsg, setSuccessMsg] = useState("");
  const codeInputRef = useRef(null);

  useEffect(() => {
    get2FAStatusApi()
      .then((data) => setEnabled(data.enabled))
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, []);

  // OTP expiry countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  // Resend cooldown ticker
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
      setTimeLeft(60);
      setResendCooldown(30);
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } catch (err) {
      const msg =
        err?.response?.data?.error || "Failed to send code. Try again.";
      setCodeError(msg);
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
      setTimeLeft(60);
      setResendCooldown(30);
    } catch (err) {
      setCodeError(
        err?.response?.data?.error || "Failed to resend. Try again."
      );
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setCodeError("Enter the 6-digit code from your email.");
      return;
    }
    setSaving(true);
    setCodeError("");
    try {
      if (intent === "enable") {
        await enable2FAApi({ code });
        setEnabled(true);
        setSuccessMsg("Two-factor authentication enabled.");
      } else {
        await disable2FAApi({ code });
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
        setTimeLeft(0);
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
    setTimeLeft(0);
    setIntent(null);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E4E7E4] px-6 py-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-1">
        <svg
          className="w-4 h-4 text-[#445446]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
          />
        </svg>
        <h2 className="text-sm font-semibold text-[#1F2933]">
          Two-Factor Authentication
        </h2>
        {!loadingStatus && (
          <span
            className={`ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full ${
              enabled
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-gray-100 text-gray-500 border border-gray-200"
            }`}
          >
            {enabled ? "Enabled" : "Disabled"}
          </span>
        )}
      </div>

      {loadingStatus ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
        </div>
      ) : step === "idle" ? (
        <>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            {enabled
              ? "A verification code is sent to your email each time you sign in."
              : "When enabled, you'll need to enter a code sent to your email each time you sign in."}
          </p>

          {successMsg && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                  clipRule="evenodd"
                />
              </svg>
              {successMsg}
            </div>
          )}

          {codeError && (
            <p className="mb-3 text-xs text-red-500">{codeError}</p>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSendCode(enabled ? "disable" : "enable")}
            className={`text-sm font-medium py-2 px-4 rounded-lg border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              enabled
                ? "border-red-200 text-red-600 hover:bg-red-50"
                : "border-[#445446] text-[#445446] hover:bg-[#445446]/5"
            }`}
          >
            {saving ? "Sending code…" : enabled ? "Disable 2FA" : "Enable 2FA"}
          </button>
        </>
      ) : (
        /* OTP entry */
        <form onSubmit={handleVerify} className="mt-3 space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">
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
              }}
              placeholder="000000"
              disabled={timeLeft === 0}
              className={`w-full px-4 py-3 rounded-lg border text-sm text-center tracking-[0.5em] font-mono text-[#1F2933] placeholder-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition ${
                codeError ? "border-red-400" : "border-[#E4E7E4]"
              } ${timeLeft === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            />
            <div className="flex items-center justify-between mt-1.5">
              {codeError ? (
                <p className="text-xs text-red-500">{codeError}</p>
              ) : (
                <span />
              )}
              {timeLeft > 0 && (
                <p
                  className={`text-xs ${
                    timeLeft <= 10 ? "text-red-500" : "text-gray-400"
                  }`}
                >
                  Expires in {timeLeft}s
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || code.length !== 6 || timeLeft === 0}
              className="flex items-center gap-2 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
            >
              {saving && (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              )}
              {saving ? "Verifying…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
            {resendCooldown > 0 ? (
              <span className="ml-auto text-xs text-gray-400">
                Resend in {resendCooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="ml-auto text-xs text-[#445446] hover:underline"
              >
                Resend code
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

// ─── Main section ─────────────────────────────────────────────────────────────
const SettingsSection = () => (
  <div className="max-w-2xl space-y-5">
    {/* Header */}
    <div>
      <h1 className="text-xl font-bold text-[#1F2933]">Settings</h1>
      <p className="text-sm text-gray-500 mt-1">
        Manage your account security and notification preferences.
      </p>
    </div>

    <ChangePasswordCard />

    <NotificationPreferencesCard />

    <TwoFactorCard />

    <DeleteAccountCard />
  </div>
);

export default SettingsSection;
