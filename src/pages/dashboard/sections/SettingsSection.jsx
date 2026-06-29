import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useTranslation, Trans } from "react-i18next";
import { useAuth } from "../../../context/AuthContext";
import {
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from "../../../api/expertApi";
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUpdateEmailMutation,
  useChangePasswordMutation,
  useGet2FAStatusQuery,
  useSendSetupOtpMutation,
  useEnable2FAMutation,
  useDisable2FAMutation,
  useDeleteAccountMutation,
} from "../../../api/userApi";
import { checkPasswordStrength } from "../../../utils/validation";
import {
  EyeOpenIcon, EyeOffBannerIcon, LockStrokeIcon, BellIcon, ShieldCheckIcon,
  UserIcon, EnvelopeIcon, WarningTriangleIcon, UserMinusIcon,
  CheckCircleFilledIcon, InfoCircleFilledIcon,
} from "../../../assets/icons";

const ToggleRow = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation("expertDashboard");
  return (
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
              {t("settings.comingSoon")}
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
};

// ─── Password field ───────────────────────────────────────────────────────────
const inputClass =
  "w-full px-4 py-3 rounded-lg border border-[#c5ceba] text-sm text-[#1F2933] placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition pr-10";

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
        {show[name] ? <EyeOpenIcon /> : <EyeOffBannerIcon className="w-4 h-4" />}
      </button>
    </div>
    {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
  </div>
);

// ─── Change Password card ─────────────────────────────────────────────────────
const STRENGTH_KEYS = ["minLength", "uppercase", "lowercase", "number", "special"];

const ChangePasswordCard = () => {
  const { t } = useTranslation("expertDashboard");
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [fieldErrors, setFieldErrors] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const [changePassword, { isLoading: saving }] = useChangePasswordMutation();

  const handleChange = (e) => {
    const { name } = e.target;
    setForm((f) => ({ ...f, [name]: e.target.value }));
    if (fieldErrors[name]) setFieldErrors((fe) => ({ ...fe, [name]: "" }));
  };

  const getPasswordError = (password) => {
    if (!password || password.length < 8) return t("settings.password.errors.tooShort");
    if (!/[A-Z]/.test(password))          return t("settings.password.errors.noUppercase");
    if (!/[a-z]/.test(password))          return t("settings.password.errors.noLowercase");
    if (!/[0-9]/.test(password))          return t("settings.password.errors.noNumber");
    if (!/[^a-zA-Z0-9]/.test(password))  return t("settings.password.errors.noSpecial");
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = { current: "", next: "", confirm: "" };
    let hasError = false;

    if (!form.current.trim()) {
      errors.current = t("settings.password.errors.currentRequired");
      hasError = true;
    }

    const pwError = getPasswordError(form.next);
    if (pwError) {
      errors.next = pwError;
      hasError = true;
    } else if (form.current && form.current === form.next) {
      errors.next = t("settings.password.errors.sameAsCurrent");
      hasError = true;
    }

    if (!form.confirm) {
      errors.confirm = t("settings.password.errors.confirmRequired");
      hasError = true;
    } else if (form.next !== form.confirm) {
      errors.confirm = t("settings.password.errors.noMatch");
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({ current: "", next: "", confirm: "" });
    try {
      await changePassword({
        currentPassword: form.current,
        newPassword: form.next,
      }).unwrap();
      setForm({ current: "", next: "", confirm: "" });
      toast.success(t("settings.password.success"));
    } catch (err) {
      const msg =
        err?.data?.error ||
        t("settings.password.errors.saveFailed");
      if (
        msg.toLowerCase().includes("current") ||
        msg.toLowerCase().includes("incorrect")
      ) {
        setFieldErrors((fe) => ({ ...fe, current: msg }));
      } else {
        setFieldErrors((fe) => ({ ...fe, confirm: msg }));
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#c5ceba] px-6 py-5">
      <div className="flex items-center gap-2.5 mb-5">
        <LockStrokeIcon className="w-4 h-4 text-[#445446]" />
        <h2 className="text-sm font-semibold text-[#1F2933]">
          {t("settings.password.title")}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          name="current"
          label={t("settings.password.currentLabel")}
          placeholder={t("settings.password.currentPlaceholder")}
          show={show}
          setShow={setShow}
          value={form.current}
          onChange={handleChange}
          error={fieldErrors.current}
        />
        <div>
          <PasswordField
            name="next"
            label={t("settings.password.newLabel")}
            placeholder={t("settings.password.newPlaceholder")}
            show={show}
            setShow={setShow}
            value={form.next}
            onChange={handleChange}
            error={fieldErrors.next}
          />
          {form.next && (
            <ul className="mt-2 space-y-1">
              {checkPasswordStrength(form.next).map(({ ok }, i) => (
                <li
                  key={STRENGTH_KEYS[i]}
                  className={`flex items-center gap-1.5 text-xs ${
                    ok ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {ok ? (
                    <CheckCircleFilledIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <InfoCircleFilledIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  {t(`settings.password.strength.${STRENGTH_KEYS[i]}`)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <PasswordField
          name="confirm"
          label={t("settings.password.confirmLabel")}
          placeholder={t("settings.password.confirmPlaceholder")}
          show={show}
          setShow={setShow}
          value={form.confirm}
          onChange={handleChange}
          error={fieldErrors.confirm}
        />

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors duration-200"
          >
            {saving && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            {saving ? t("settings.password.savingBtn") : t("settings.password.updateBtn")}
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Notification Preferences card ───────────────────────────────────────────
const defaultNotifPrefs = { notify_new_booking: true, notify_cancellation: true };

const NotificationPreferencesCard = () => {
  const { t } = useTranslation("expertDashboard");
  const [localPrefs, setLocalPrefs] = useState(null);

  const { data: fetchedPrefs, isLoading: loading } = useGetNotificationPreferencesQuery();
  const [updatePrefs, { isLoading: saving }]       = useUpdateNotificationPreferencesMutation();

  const prefs = localPrefs ?? fetchedPrefs ?? defaultNotifPrefs;

  const handleToggle = async (field, value) => {
    const base = localPrefs ?? fetchedPrefs ?? defaultNotifPrefs;
    setLocalPrefs({ ...base, [field]: value });
    try {
      await updatePrefs({ [field]: value }).unwrap();
      setLocalPrefs(null);
      toast.success(t("settings.notifications.toastSuccess"));
    } catch {
      setLocalPrefs(null);
      toast.error(t("settings.notifications.toastError"));
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#c5ceba] px-6">
      <div className="flex items-center gap-2.5 py-4 border-b border-[#c5ceba]">
        <BellIcon className="w-4 h-4 text-[#445446]" />
        <span className="text-sm font-semibold text-[#1F2933]">
          {t("settings.notifications.title")}
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
            label={t("settings.notifications.newBooking.label")}
            description={t("settings.notifications.newBooking.description")}
            checked={prefs.notify_new_booking}
            onChange={(v) => handleToggle("notify_new_booking", v)}
          />
          <ToggleRow
            label={t("settings.notifications.cancellation.label")}
            description={t("settings.notifications.cancellation.description")}
            checked={prefs.notify_cancellation}
            onChange={(v) => handleToggle("notify_cancellation", v)}
          />
          <ToggleRow
            label={t("settings.notifications.messageReceived.label")}
            description={t("settings.notifications.messageReceived.description")}
            checked={false}
            disabled
          />
        </div>
      )}

    </div>
  );
};

// ─── Delete Account card ──────────────────────────────────────────────────────
const DeleteAccountCard = () => {
  const { t } = useTranslation("expertDashboard");
  const { logout, user } = useAuth();
  const isParent = user?.role === "PARENT";
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [deleteAccount, { isLoading: loading }] = useDeleteAccountMutation();

  const handleDelete = async () => {
    if (!password) {
      setError(t("settings.deleteAccount.confirm.passwordRequired"));
      return;
    }
    setError("");
    try {
      await deleteAccount({ password }).unwrap();
      logout();
    } catch (err) {
      const errData = err?.data;
      if (
        errData?.has_pending_payout ||
        errData?.has_upcoming_bookings ||
        errData?.has_pending_transactions
      ) {
        toast.error(errData?.error || t("settings.deleteAccount.confirm.saveFailed"));
        setShowConfirm(false);
        setPassword("");
      } else {
        setError(errData?.error || t("settings.deleteAccount.confirm.saveFailed"));
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-red-200 px-6 py-5">
      <div className="flex items-center gap-2.5 mb-1">
        <UserMinusIcon className="w-4 h-4 text-red-400" />
        <h2 className="text-sm font-semibold text-red-600">{t("settings.deleteAccount.title")}</h2>
      </div>

      {!showConfirm ? (
        <div className="mt-3 space-y-3">
          <div className="text-xs text-gray-500 leading-relaxed space-y-2">
            <p>
              <Trans
                i18nKey="settings.deleteAccount.permanentTitle"
                ns="expertDashboard"
                components={{ bold: <strong /> }}
              />
            </p>
            {isParent ? (
              <ul className="list-disc list-inside text-gray-400 space-y-0.5 pl-1">
                <li>{t("settings.deleteAccount.parentList.item1")}</li>
                <li>{t("settings.deleteAccount.parentList.item2")}</li>
                <li>{t("settings.deleteAccount.parentList.item3")}</li>
              </ul>
            ) : (
              <>
                <ul className="list-disc list-inside text-gray-400 space-y-0.5 pl-1">
                  <li>{t("settings.deleteAccount.expertList.item1")}</li>
                  <li>{t("settings.deleteAccount.expertList.item2")}</li>
                  <li>{t("settings.deleteAccount.expertList.item3")}</li>
                  <li>{t("settings.deleteAccount.expertList.item4")}</li>
                </ul>
                <p className="mt-2">
                  <Trans
                    i18nKey="settings.deleteAccount.retainedTitle"
                    ns="expertDashboard"
                    components={{ bold: <strong /> }}
                  />
                </p>
                <ul className="list-disc list-inside text-gray-400 space-y-0.5 pl-1">
                  <li>{t("settings.deleteAccount.retainedList.item1")}</li>
                  <li>{t("settings.deleteAccount.retainedList.item2")}</li>
                  <li>{t("settings.deleteAccount.retainedList.item3")}</li>
                </ul>
              </>
            )}
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {isParent
              ? t("settings.deleteAccount.warningParent")
              : t("settings.deleteAccount.warningExpert")}
          </p>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-medium rounded-lg transition-colors"
          >
            {t("settings.deleteAccount.deleteBtn")}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <Trans
              i18nKey="settings.deleteAccount.confirm.irreversibleMsg"
              ns="expertDashboard"
              components={{ bold: <strong /> }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1.5">
              {t("settings.deleteAccount.confirm.passwordLabel")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                placeholder={t("settings.deleteAccount.confirm.passwordPlaceholder")}
                className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition pr-10 ${error ? "border-red-400" : "border-[#c5ceba]"}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOpenIcon /> : <EyeOffBannerIcon className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setShowConfirm(false); setPassword(""); setError(""); }}
              className="flex-1 py-2.5 text-sm font-medium border border-[#c5ceba] rounded-lg text-[#5e6d5b] hover:bg-[#dfe2d7]/50 transition-colors"
            >
              {t("settings.deleteAccount.confirm.cancelBtn")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleDelete}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading
                ? t("settings.deleteAccount.confirm.deletingBtn")
                : t("settings.deleteAccount.confirm.confirmBtn")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Two-Factor Authentication card ──────────────────────────────────────────
const TwoFactorCard = () => {
  const { t } = useTranslation("expertDashboard");
  const [step, setStep] = useState("idle"); // 'idle' | 'entering_code'
  const [intent, setIntent] = useState(null); // 'enable' | 'disable'
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeInputRef = useRef(null);

  const { data: status2fa, isLoading: loadingStatus } = useGet2FAStatusQuery();
  const [sendOtp, { isLoading: sendingOtp }]      = useSendSetupOtpMutation();
  const [enable2FA, { isLoading: enablingFA }]    = useEnable2FAMutation();
  const [disable2FA, { isLoading: disablingFA }]  = useDisable2FAMutation();

  const enabled = status2fa?.enabled ?? false;
  const saving  = sendingOtp || enablingFA || disablingFA;

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendCode = async (intentType) => {
    setCodeError("");
    try {
      await sendOtp({
        purpose: intentType === "enable" ? "enable_2fa" : "disable_2fa",
      }).unwrap();
      setIntent(intentType);
      setStep("entering_code");
      setCode("");
      setResendCooldown(60);
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } catch (err) {
      toast.error(err?.data?.error || t("settings.twoFactor.errors.sendFailed"));
    }
  };

  const handleResend = async () => {
    setCodeError("");
    try {
      await sendOtp({
        purpose: intent === "enable" ? "enable_2fa" : "disable_2fa",
      }).unwrap();
      setCode("");
      setResendCooldown(60);
    } catch (err) {
      toast.error(err?.data?.error || t("settings.twoFactor.errors.resendFailed"));
    }
  };

  const doVerify = async (codeVal) => {
    if (saving || codeVal.length !== 6) return;
    setCodeError("");
    try {
      if (intent === "enable") {
        await enable2FA({ code: codeVal }).unwrap();
        toast.success(t("settings.twoFactor.successEnabled"));
      } else {
        await disable2FA({ code: codeVal }).unwrap();
        toast.success(t("settings.twoFactor.successDisabled"));
      }
      setStep("idle");
      setCode("");
    } catch (err) {
      const errData = err?.data;
      if (errData?.expired) {
        setCodeError(t("settings.twoFactor.errors.expired"));
      } else {
        setCodeError(errData?.error || t("settings.twoFactor.errors.incorrect"));
      }
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    doVerify(code);
  };

  const handleCancel = () => {
    setStep("idle");
    setCode("");
    setCodeError("");
    setIntent(null);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#c5ceba] px-6 py-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-1">
        <ShieldCheckIcon className="w-4 h-4 text-[#445446]" />
        <h2 className="text-sm font-semibold text-[#1F2933]">
          {t("settings.twoFactor.title")}
        </h2>
        {!loadingStatus && (
          <span
            className={`ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full ${
              enabled
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-gray-100 text-gray-500 border border-gray-200"
            }`}
          >
            {enabled ? t("settings.twoFactor.statusEnabled") : t("settings.twoFactor.statusDisabled")}
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
              ? t("settings.twoFactor.descEnabled")
              : t("settings.twoFactor.descDisabled")}
          </p>

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
            {saving
              ? t("settings.twoFactor.sendingBtn")
              : enabled
              ? t("settings.twoFactor.disableBtn")
              : t("settings.twoFactor.enableBtn")}
          </button>
        </>
      ) : (
        /* OTP entry */
        <form onSubmit={handleVerify} className="mt-3 space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            <Trans
              i18nKey={`settings.twoFactor.otp.${intent === "enable" ? "instructionEnable" : "instructionDisable"}`}
              ns="expertDashboard"
              components={{ bold: <strong /> }}
            />
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
                codeError ? "border-red-400" : "border-[#c5ceba]"
              }`}
            />
            <div className="flex items-center justify-between mt-1.5">
              {codeError && (
                <p className="text-xs text-red-500">{codeError}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || code.length !== 6}
              className="flex items-center gap-2 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
            >
              {saving && (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              )}
              {saving ? t("settings.twoFactor.otp.verifyingBtn") : t("settings.twoFactor.otp.confirmBtn")}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              {t("settings.twoFactor.otp.cancelBtn")}
            </button>
            {resendCooldown > 0 ? (
              <span className="ml-auto text-xs text-gray-400">
                {t("settings.twoFactor.otp.resendIn", { count: resendCooldown })}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="ml-auto text-xs text-[#445446] hover:underline"
              >
                {t("settings.twoFactor.otp.resendBtn")}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

// ─── Display Name card ────────────────────────────────────────────────────────
const DisplayNameCard = () => {
  const { t } = useTranslation("expertDashboard");
  const { updateUser } = useAuth();

  const { data: profile, isLoading: loadingProfile } = useGetProfileQuery();
  const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation();

  const [name, setName] = useState("");
  const [error, setError] = useState("");

  // Populate once profile loads
  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("settings.displayName.errors.required"));
      return;
    }
    setError("");
    try {
      const updated = await updateProfile({ name: name.trim() }).unwrap();
      if (updateUser) updateUser(updated);
      toast.success(t("settings.displayName.success"));
    } catch (err) {
      toast.error(err?.data?.error || t("settings.displayName.errors.saveFailed"));
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#c5ceba] px-6 py-5">
      <div className="flex items-center gap-2.5 mb-1">
        <UserIcon className="w-4 h-4 text-[#445446]" />
        <h2 className="text-sm font-semibold text-[#1F2933]">{t("settings.displayName.title")}</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">{t("settings.displayName.description")}</p>

      {loadingProfile ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
              placeholder={t("settings.displayName.placeholder")}
              className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition ${error ? "border-red-400" : "border-[#c5ceba]"}`}
            />
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
            <p className="mt-1.5 text-xs text-amber-600 leading-relaxed">{t("settings.displayName.legalNote")}</p>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors duration-200"
            >
              {saving && <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {saving ? t("settings.displayName.savingBtn") : t("settings.displayName.saveBtn")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ─── Phone card (expert) ──────────────────────────────────────────────────────
const PhoneCard = () => {
  const { t } = useTranslation("expertDashboard");

  const { data: profile, isLoading: loadingProfile } = useGetProfileQuery();
  const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation();

  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile !== undefined) setPhone(profile?.phone || "");
  }, [profile?.phone]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    const trimmed = phone.trim();
    if (trimmed && !/^\+[0-9\s\-().]{7,20}$/.test(trimmed)) {
      setError(t("settings.phone.errors.invalid"));
      return;
    }
    try {
      // updateProfile requires name — pass existing name so it isn't cleared
      await updateProfile({ name: profile?.name || "", phone: trimmed || null }).unwrap();
      toast.success(t("settings.phone.success"));
    } catch (err) {
      toast.error(err?.data?.error || t("settings.phone.errors.saveFailed"));
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#c5ceba] px-6 py-5">
      <div className="flex items-center gap-2.5 mb-1">
        <svg className="w-4 h-4 text-[#445446]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
        </svg>
        <h2 className="text-sm font-semibold text-[#1F2933]">{t("settings.phone.title")}</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">{t("settings.phone.description")}</p>

      {loadingProfile ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); if (error) setError(""); }}
              placeholder={t("settings.phone.placeholder")}
              className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition ${error ? "border-red-400" : "border-[#c5ceba]"}`}
            />
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
            <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{t("settings.phone.hint")}</p>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors duration-200"
            >
              {saving && <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {saving ? t("settings.phone.savingBtn") : t("settings.phone.saveBtn")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ─── Email Change card ────────────────────────────────────────────────────────
const EmailChangeCard = () => {
  const { t } = useTranslation("expertDashboard");
  const { logout } = useAuth();

  const { data: profile, isLoading: loadingProfile } = useGetProfileQuery();
  const [updateEmail, { isLoading: sending }] = useUpdateEmailMutation();

  const [showForm, setShowForm]   = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [newEmail, setNewEmail]   = useState("");
  const [password, setPassword]   = useState("");
  const [errors, setErrors]       = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!newEmail.trim()) errs.email = t("settings.emailChange.errors.emailRequired");
    if (!password)        errs.password = t("settings.emailChange.errors.passwordRequired");
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    try {
      await updateEmail({ email: newEmail.trim(), password }).unwrap();
      setEmailSent(true);
    } catch (err) {
      const msg = err?.data?.error || t("settings.emailChange.errors.failed");
      if (msg.toLowerCase().includes("password") || msg.toLowerCase().includes("incorrect")) {
        setErrors({ password: msg });
      } else if (msg.toLowerCase().includes("email") || msg.toLowerCase().includes("use")) {
        setErrors({ email: msg });
      } else {
        toast.error(msg);
      }
    }
  };

  if (loadingProfile) return null;

  if (emailSent) {
    return (
      <div className="bg-white rounded-2xl border-2 border-[#c5ceba] px-6 py-5">
        <div className="flex items-center gap-2.5 mb-4">
          <EnvelopeIcon className="w-4 h-4 text-[#445446]" />
          <h2 className="text-sm font-semibold text-[#1F2933]">{t("settings.emailChange.title")}</h2>
        </div>
        <div className="text-center py-2">
          <p className="text-sm text-[#1F2933] font-medium mb-1">{t("settings.emailChange.sentTitle")}</p>
          <p className="text-xs text-gray-500 mb-4">{t("settings.emailChange.sentBody", { email: newEmail })}</p>
          <button onClick={logout} className="text-sm text-[#445446] font-medium hover:underline">
            {t("settings.emailChange.signOutLink")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-[#c5ceba] px-6 py-5">
      <div className="flex items-center gap-2.5 mb-1">
        <EnvelopeIcon className="w-4 h-4 text-[#445446]" />
        <h2 className="text-sm font-semibold text-[#1F2933]">{t("settings.emailChange.title")}</h2>
      </div>

      {/* Current email + pending badge */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#f5f7f5] rounded-lg border border-[#c5ceba] mb-4 mt-3">
        <span className="text-sm text-[#1F2933] font-medium flex-1">{profile?.email}</span>
        <span className="text-xs text-green-600 font-medium">{t("settings.emailChange.verified")}</span>
      </div>

      {profile?.pending_email && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mb-4">
          <WarningTriangleIcon className="w-4 h-4 flex-shrink-0" />
          {t("settings.emailChange.pendingNotice", { email: profile.pending_email })}
        </div>
      )}

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="text-sm text-[#445446] font-medium hover:underline">
          {t("settings.emailChange.changeLink")}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            {t("settings.emailChange.warning")}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1.5">{t("settings.emailChange.newEmailLabel")}</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
              placeholder={t("settings.emailChange.newEmailPlaceholder")}
              className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition ${errors.email ? "border-red-400" : "border-[#c5ceba]"}`}
            />
            {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1F2933] mb-1.5">{t("settings.emailChange.passwordLabel")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
              placeholder={t("settings.emailChange.passwordPlaceholder")}
              className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] transition ${errors.password ? "border-red-400" : "border-[#c5ceba]"}`}
            />
            {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewEmail(""); setPassword(""); setErrors({}); }}
              className="px-4 py-2.5 text-sm font-medium border border-[#c5ceba] rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {t("settings.emailChange.cancelBtn")}
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors duration-200"
            >
              {sending && <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {sending ? t("settings.emailChange.sendingBtn") : t("settings.emailChange.sendBtn")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ─── Main section ─────────────────────────────────────────────────────────────
const SettingsSection = () => {
  const { t } = useTranslation("expertDashboard");
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[#445446]">{t("settings.heading")}</h2>
        <p className="text-sm text-[#5e6d5b] font-medium mt-1">
          {t("settings.subheading")}
        </p>
      </div>

      <DisplayNameCard />

      <EmailChangeCard />

      <PhoneCard />

      <ChangePasswordCard />

      <NotificationPreferencesCard />

      <TwoFactorCard />

      <DeleteAccountCard />
    </div>
  );
};

export default SettingsSection;
