import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import PasswordInput from '../../components/auth/PasswordInput';
import useAuthForm from '../../hooks/useAuthForm';
import { validateRegisterForm, checkPasswordStrength } from '../../utils/validation';
import { registerUser } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import useResendVerification from '../../hooks/useResendVerification';

const ROLES = [
  {
    key: 'EXPERT',
    label: 'Expert',
    description: 'Offer your expertise and services',
  },
  {
    key: 'PARENT',
    label: 'Parent',
    description: 'Find trusted experts for your family',
  },
];

const Register = () => {
  const { login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [emailSent, setEmailSent] = useState(null); // { email } when verification sent
  const { resend, status: resendStatus, countdown } = useResendVerification();

  const roleParam = searchParams.get('user')?.toUpperCase();
  const activeRole = ROLES.find((r) => r.key === roleParam) ? roleParam : 'EXPERT';

  const handleTabChange = (roleKey) => {
    setSearchParams({ user: roleKey });
  };

  const {
    form,
    errors,
    setErrors,
    loading,
    setLoading,
    serverError,
    setServerError,
    handleChange,
  } = useAuthForm({ name: '', email: '', password: '', confirmPassword: '', phone: '' });

  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent]           = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateRegisterForm({ ...form, confirmPassword: form.confirmPassword, role: activeRole });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!privacyPolicyAccepted) {
      setErrors((prev) => ({ ...prev, privacyPolicy: 'You must accept the Privacy Policy to continue.' }));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: activeRole,
        privacyPolicyAccepted: true,
        marketingConsent,
      };
      if (activeRole === 'PARENT') payload.phone = form.phone.trim();

      const data = await registerUser(payload);

      if (data.verification_email_sent) {
        // EXPERT — show inline "check your email" state
        setEmailSent({ email: data.email });
      } else {
        // PARENT — auto-login and redirect
        login(data);
      }
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Registration failed. Please try again.';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };
             
  const textFields = [
    { id: 'name', label: 'Full name', type: 'text', placeholder: 'Jane Smith' },
    { id: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
  ];

  // ── Email sent state ────────────────────────────────────────────────────────
  if (emailSent) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#445446]/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-[#445446]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-[#1F2933] mb-2">Check your email</h1>
          <p className="text-sm text-gray-500 mb-1">We sent a verification link to</p>
          <p className="text-sm font-semibold text-[#1F2933] mb-6">{emailSent.email}</p>

          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            Click the link in the email to verify your account and get started.
            The link will open Sage Nest and activate your profile automatically.
          </p>

          <div className="bg-[#F5F7F5] rounded-xl border border-[#E4E7E4] p-4 text-left mb-5">
            <p className="text-xs font-medium text-[#1F2933] mb-1">Can't find the email?</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Check your spam or junk folder. The email comes from Sage Nest with the
              subject <span className="font-medium">"Verify your Sage Nest email address"</span>.
            </p>
          </div>

          {/* Resend button */}
          <button
            type="button"
            onClick={() => resend(emailSent.email)}
            disabled={resendStatus === 'sending' || countdown > 0}
            className="w-full mb-5 py-2.5 px-4 rounded-lg border border-[#445446]/30 text-sm font-medium text-[#445446] bg-white hover:bg-[#445446]/5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {resendStatus === 'sending' && 'Sending…'}
            {resendStatus === 'sent' && countdown > 0 && `Email sent — resend in ${countdown}s`}
            {resendStatus === 'error' && 'Failed to send — try again'}
            {(resendStatus === 'idle' || (resendStatus === 'sent' && countdown === 0)) && 'Resend verification email'}
          </button>

          {/* Success feedback */}
          {resendStatus === 'sent' && countdown > 0 && (
            <p className="text-xs text-green-600 mb-4">
              A new verification email is on its way.
            </p>
          )}

          <Link
            to="/login"
            className="text-sm text-[#445446] font-medium hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-[#1F2933] text-center mb-2">
        Create your account
      </h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        Join Sage Nest and start connecting
      </p>

      {/* Role Tabs */}
      <div className="mb-5">
        <div className="flex rounded-xl bg-[#F5F7F5] border border-[#E4E7E4] p-1">
          {ROLES.map((role) => {
            const isActive = activeRole === role.key;
            return (
              <button
                key={role.key}
                type="button"
                onClick={() => handleTabChange(role.key)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#445446] text-white shadow-sm'
                    : 'text-gray-500 hover:text-[#1F2933]'
                }`}
              >
                {role.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 text-center mt-2.5">
          {ROLES.find((r) => r.key === activeRole)?.description}
        </p>
      </div>

      {serverError && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {textFields.map(({ id, label, type, placeholder }) => (
          <div key={id}>
            <label
              htmlFor={id}
              className="block text-sm font-medium text-[#1F2933] mb-1.5"
            >
              {label}
            </label>
            <input
              id={id}
              type={type}
              name={id}
              value={form[id]}
              onChange={handleChange}
              placeholder={placeholder}
              className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
                errors[id] ? 'border-red-400' : 'border-[#E4E7E4]'
              }`}
            />
            {errors[id] && (
              <p className="mt-1.5 text-xs text-red-500">{errors[id]}</p>
            )}
          </div>
        ))}

        {/* Phone — Parent only */}
        {activeRole === 'PARENT' && (
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-[#1F2933] mb-1.5">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+44 7700 900000"
              className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
                errors.phone ? 'border-red-400' : 'border-[#E4E7E4]'
              }`}
            />
            {errors.phone && (
              <p className="mt-1.5 text-xs text-red-500">{errors.phone}</p>
            )}
          </div>
        )}

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#1F2933] mb-1.5">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="At least 8 characters"
            hasError={!!errors.password}
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>
          )}
          {/* Live strength checklist */}
          {form.password && (
            <ul className="mt-2 space-y-1">
              {checkPasswordStrength(form.password).map(({ label, ok }) => (
                <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                  {ok ? (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-4.75a.75.75 0 0 0 1.5 0V8.75a.75.75 0 0 0-1.5 0v4.5Zm.75-7a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                    </svg>
                  )}
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1F2933] mb-1.5">
            Confirm password
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter your password"
            hasError={!!errors.confirmPassword}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Privacy Policy — required */}
        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={privacyPolicyAccepted}
              onChange={(e) => {
                setPrivacyPolicyAccepted(e.target.checked);
                if (e.target.checked) setErrors((prev) => { const { privacyPolicy: _, ...rest } = prev; return rest; });
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#445446] focus:ring-[#445446]/30"
            />
            <span className="text-sm text-[#1F2933] leading-snug">
              I have read and agree to the{' '}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#445446] font-medium underline">
                Privacy Policy
              </a>
              <span className="text-red-500 ml-0.5">*</span>
            </span>
          </label>
          {errors.privacyPolicy && (
            <p className="text-xs text-red-500 -mt-1">{errors.privacyPolicy}</p>
          )}

          {/* Marketing consent — optional */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#445446] focus:ring-[#445446]/30"
            />
            <span className="text-sm text-gray-500 leading-snug">
              I'd like to receive tips, expert advice, and updates from Sage Nest by email. You can unsubscribe at any time.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !privacyPolicyAccepted}
          className="w-full bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors duration-200 text-sm mt-2"
        >
          {loading
            ? 'Creating account...'
            : `Create ${activeRole === 'EXPERT' ? 'Expert' : 'Parent'} account`}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-[#445446] font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Register;
