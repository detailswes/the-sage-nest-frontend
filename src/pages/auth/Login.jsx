import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../components/auth/AuthLayout";
import PasswordInput from "../../components/auth/PasswordInput";
import useAuthForm from "../../hooks/useAuthForm";
import { validateLoginForm } from "../../utils/validation";
import { loginUser } from "../../api/authApi";
import { useAuth } from "../../context/AuthContext";
import useResendVerification from "../../hooks/useResendVerification";

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
