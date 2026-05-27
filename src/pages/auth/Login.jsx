import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../components/auth/AuthLayout";
import PasswordInput from "../../components/auth/PasswordInput";
import useAuthForm from "../../hooks/useAuthForm";
import { validateLoginForm } from "../../utils/validation";
import { loginUser, verifyOtpApi, resendOtpApi } from "../../api/authApi";
import { useAuth } from "../../context/AuthContext";
import useResendVerification from "../../hooks/useResendVerification";

// ─── OTP step ─────────────────────────────────────────────────────────────────
const OtpStep = ({ otpToken, userEmail, onSuccess }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendStatus, setResendStatus] = useState(null); // 'sent' | 'error'
  const [expired, setExpired] = useState(false);
  const inputRef = useRef(null);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
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
        setError("Your code has expired. Please request a new one.");
      } else {
        setError(errData?.error || "Incorrect code. Please try again.");
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
          <svg className="w-6 h-6 text-[#445446]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-[#1F2933] mb-1">Check your email</h1>
        <p className="text-sm text-gray-500">
          We sent a 6-digit code to<br />
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
          New code sent — check your inbox.
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1F2933] mb-1.5">
            Verification code
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
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>

      <div className="mt-4 text-center">
        {resendCooldown > 0 ? (
          <p className="text-xs text-gray-400">Resend in {resendCooldown}s</p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="text-sm text-[#445446] hover:underline"
          >
            Resend code
          </button>
        )}
      </div>
    </>
  );
};

// ─── Login form ───────────────────────────────────────────────────────────────
const Login = () => {
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

  // Set when backend returns 403 email_not_verified
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [lockedMessage, setLockedMessage] = useState(null);
  // Set when backend returns two_factor_required
  const [otpPending, setOtpPending] = useState(null); // { otp_token, email }
  const { resend, status: resendStatus, countdown } = useResendVerification();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateLoginForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
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
      // GuestRoute reactively redirects to /dashboard once user state updates
    } catch (err) {
      const errData = err?.response?.data;
      if (errData?.email_not_verified) {
        setUnverifiedEmail(errData.email || form.email);
        setServerError("");
      } else if (errData?.locked) {
        setLockedMessage(errData.error);
        setServerError("");
      } else {
        const message =
          errData?.error ||
          errData?.message ||
          "Login failed. Please check your credentials.";
        setServerError(message);
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
            ← Back to sign in
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-[#1F2933] text-center mb-2">
        Welcome
      </h1>
      <p className="text-sm text-gray-500 text-center mb-8">
        Sign in to your Sage Nest account
      </p>

      {/* Account locked callout */}
      {lockedMessage && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-amber-600 flex-shrink-0 mt-px"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">
              Account temporarily locked
            </p>
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
            <svg
              className="w-5 h-5 text-amber-600 flex-shrink-0 mt-px"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">
                Email not verified
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Please verify{" "}
                <span className="font-medium">{unverifiedEmail}</span> before
                signing in.
              </p>
            </div>
          </div>

          {/* Resend row */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-amber-600">
              {resendStatus === "sent" && countdown > 0
                ? `Email sent! Resend in ${countdown}s`
                : resendStatus === "error"
                ? "Failed to send. Try again."
                : "Didn't get the email?"}
            </p>
            <button
              type="button"
              onClick={() => resend(unverifiedEmail)}
              disabled={resendStatus === "sending" || countdown > 0}
              className="flex-shrink-0 text-xs font-semibold text-amber-700 bg-white border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {resendStatus === "sending"
                ? "Sending…"
                : countdown > 0
                ? `Resend in ${countdown}s`
                : "Resend email"}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#1F2933] mb-1.5"
          >
            Email
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
            placeholder="you@example.com"
            className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
              errors.email ? "border-red-400" : "border-[#E4E7E4]"
            }`}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-[#1F2933]"
            >
              Password
            </label>
          </div>
          <PasswordInput
            id="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your password"
            hasError={!!errors.password}
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors duration-200 text-sm mt-2"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="text-[#445446] hover:underline">
          Forgot password?
        </Link>
      </p>

      <p className="mt-3 text-center text-sm text-gray-500">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="text-[#445446] font-medium hover:underline"
        >
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
