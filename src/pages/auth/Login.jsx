import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthLayout from "../../components/auth/AuthLayout";
import PasswordInput from "../../components/auth/PasswordInput";
import LanguageSelector from "../../components/LanguageSelector";
import useAuthForm from "../../hooks/useAuthForm";
import { validateLoginForm } from "../../utils/validation";
import { loginUser, verifyOtpApi, resendOtpApi } from "../../api/authApi";
import { useAuth } from "../../context/AuthContext";
import useResendVerification from "../../hooks/useResendVerification";
import { EnvelopeIcon, LockFilledIcon, WarningTriangleFilledIcon } from "../../assets/icons";

// ─── OTP step ─────────────────────────────────────────────────────────────────
const OtpStep = ({ otpToken, userEmail, onSuccess }) => {
  const { t } = useTranslation("auth");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendStatus, setResendStatus] = useState(null); // 'sent' | 'error'
  const [expired, setExpired] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doVerify = async (codeVal) => {
    if (loading || expired || codeVal.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const data = await verifyOtpApi({ otp_token: otpToken, code: codeVal.trim() });
      onSuccess(data);
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.expired) {
        setExpired(true);
        setError(t("otp.errorExpired"));
      } else {
        setError(errData?.error || t("otp.errorIncorrect"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    doVerify(code);
  };

  const handleResend = async () => {
    setError("");
    setResendStatus(null);
    try {
      await resendOtpApi({ otp_token: otpToken });
      setExpired(false);
      setCode("");
      setResendCooldown(60);
      setResendStatus("sent");
    } catch {
      setResendStatus("error");
    }
  };

  return (
    <>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#445446]/10 mb-4">
          <EnvelopeIcon className="w-6 h-6 text-[#445446]" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1F2933] mb-1">{t("otp.title")}</h1>
        <p className="text-sm text-gray-500">
          {t("otp.sentTo")}<br />
          <span className="font-medium text-[#1F2933]">{userEmail}</span>
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {resendStatus === "sent" && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {t("otp.newCodeSent")}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1F2933] mb-1.5">
            {t("otp.codeLabel")}
          </label>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(val);
              if (error) setError("");
              if (val.length === 6) doVerify(val);
            }}
            placeholder="000000"
            disabled={expired}
            className={`w-full px-4 py-3 rounded-lg border text-sm text-center tracking-[0.5em] font-mono text-[#1F2933] placeholder-gray-300 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
              error ? "border-red-400" : "border-[#E4E7E4]"
            } ${expired ? "opacity-50 cursor-not-allowed" : ""}`}
          />
        </div>

        <button
          type="submit"
          disabled={loading || expired || code.length !== 6}
          className="w-full bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors duration-200 text-sm"
        >
          {loading ? t("otp.verifyingBtn") : t("otp.verifyBtn")}
        </button>
      </form>

      <div className="mt-4 text-center">
        {resendCooldown > 0 ? (
          <p className="text-xs text-gray-400">{t("otp.resendIn", { count: resendCooldown })}</p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="text-sm text-[#445446] hover:underline"
          >
            {t("otp.resendBtn")}
          </button>
        )}
      </div>
    </>
  );
};

// ─── Login form ───────────────────────────────────────────────────────────────
const Login = () => {
  const { t } = useTranslation("auth");
  const { login } = useAuth();
  const {
    form,
    errors,
    setErrors,
    loading,
    setLoading,
    serverError,
    setServerError,
    handleChange,
  } = useAuthForm({ email: "", password: "" });

  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [lockedMessage, setLockedMessage] = useState(null);
  const [otpPending, setOtpPending] = useState(null); // { otp_token, email }
  const { resend, status: resendStatus, countdown } = useResendVerification();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const rawErrors = validateLoginForm(form);
    if (Object.keys(rawErrors).length > 0) {
      setErrors(rawErrors);
      return;
    }

    setLoading(true);
    setUnverifiedEmail(null);
    setLockedMessage(null);
    try {
      const data = await loginUser(form);
      if (data.two_factor_required) {
        setOtpPending({ otp_token: data.otp_token, email: form.email });
        return;
      }
      login(data);
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.email_not_verified) {
        setUnverifiedEmail(errData.email || form.email);
        setServerError("");
      } else if (errData?.locked) {
        setLockedMessage(errData.error);
        setServerError("");
      } else {
        setServerError(errData?.error || errData?.message || t("login.defaultError"));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── OTP screen ──────────────────────────────────────────────────────────────
  if (otpPending) {
    return (
      <AuthLayout>
        <OtpStep
          otpToken={otpPending.otp_token}
          userEmail={otpPending.email}
          onSuccess={(data) => login(data)}
        />
        <p className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setOtpPending(null)}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            {t("otp.backToSignIn")}
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-[#1F2933] text-center mb-2">
        {t("login.title")}
      </h1>
      <p className="text-sm text-gray-500 text-center mb-8">
        {t("login.subtitle")}
      </p>

      {/* Account locked callout */}
      {lockedMessage && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 flex items-start gap-3">
          <LockFilledIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-px" />
          <div>
            <p className="text-sm font-medium text-amber-800">{t("locked.title")}</p>
            <p className="text-xs text-amber-700 mt-0.5">{lockedMessage}</p>
          </div>
        </div>
      )}

      {/* Generic error */}
      {serverError && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {serverError}
        </div>
      )}

      {/* Email not verified callout */}
      {unverifiedEmail && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <div className="flex items-start gap-3 mb-3">
            <WarningTriangleFilledIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-px" />
            <div>
              <p className="text-sm font-medium text-amber-800">{t("unverified.title")}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {t("unverified.message", { email: unverifiedEmail })}
              </p>
            </div>
          </div>

          {/* Resend row */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-amber-600">
              {resendStatus === "sent" && countdown > 0
                ? t("unverified.sentCountdown", { count: countdown })
                : resendStatus === "error"
                ? t("unverified.sendError")
                : t("unverified.didntGet")}
            </p>
            <button
              type="button"
              onClick={() => resend(unverifiedEmail)}
              disabled={resendStatus === "sending" || countdown > 0}
              className="flex-shrink-0 text-xs font-semibold text-amber-700 bg-white border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {resendStatus === "sending"
                ? t("unverified.sending")
                : countdown > 0
                ? t("unverified.resendCountdown", { count: countdown })
                : t("unverified.resendBtn")}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#1F2933] mb-1.5">
            {t("login.emailLabel")}
          </label>
          <input
            id="email"
            type="email"
            name="email"
            value={form.email}
            onChange={(e) => {
              handleChange(e);
              setUnverifiedEmail(null);
            }}
            placeholder={t("login.emailPlaceholder")}
            className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
              errors.email ? "border-red-400" : "border-[#E4E7E4]"
            }`}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-500">{t(errors.email)}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[#1F2933]">
              {t("login.passwordLabel")}
            </label>
          </div>
          <PasswordInput
            id="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder={t("login.passwordPlaceholder")}
            hasError={!!errors.password}
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-500">{t(errors.password)}</p>
          )}
        </div>

        {/* Language selector */}
        <div>
          <p className="text-xs text-gray-400 text-center mb-2">
            {t("login.chooseLanguage")}
          </p>
          <LanguageSelector variant="inline" />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors duration-200 text-sm mt-2"
        >
          {loading ? t("login.submittingBtn") : t("login.submitBtn")}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="text-[#445446] hover:underline">
          {t("login.forgotPassword")}
        </Link>
      </p>

      <p className="mt-3 text-center text-sm text-gray-500">
        {t("login.noAccount")}{" "}
        <Link to="/register" className="text-[#445446] font-medium hover:underline">
          {t("login.createOne")}
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
