import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { forgotPasswordApi } from '../../api/authApi';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    if (!email.trim()) return 'Email address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const err = validate();
    if (err) { setEmailError(err); return; }
    setEmailError('');
    setLoading(true);
    try {
      await forgotPasswordApi(email.trim());
      setSent(true);
    } catch (err) {
      const code = err?.response?.status;
      if (code === 429) {
        setServerError('Please wait a moment before requesting another reset email.');
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Email sent state ─────────────────────────────────────────────────────────
  if (sent) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#445446]/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-[#445446]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[#1F2933] mb-2">Check your email</h1>
          <p className="text-sm text-gray-500 mb-1">If an account exists for</p>
          <p className="text-sm font-semibold text-[#1F2933] mb-5">{email}</p>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            you'll receive a password reset link shortly.
            The link expires in <span className="font-medium text-red-600">1 hour</span>.
          </p>
          <div className="bg-[#F5F7F5] rounded-xl border border-[#E4E7E4] p-4 text-left mb-6">
            <p className="text-xs font-medium text-[#1F2933] mb-1">Can't find the email?</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Check your spam or junk folder. The subject line is{' '}
              <span className="font-medium">"Reset your Sage Nest password"</span>.
            </p>
          </div>
          <Link to="/login" className="text-sm text-[#445446] font-medium hover:underline">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ── Form state ───────────────────────────────────────────────────────────────
  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#445446]/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[#445446]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-[#1F2933] mb-1">Forgot your password?</h1>
        <p className="text-sm text-gray-500">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      {serverError && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#1F2933] mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(''); setServerError(''); }}
            placeholder="you@example.com"
            className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1F2933] placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446] ${
              emailError ? 'border-red-400' : 'border-[#E4E7E4]'
            }`}
          />
          {emailError && <p className="mt-1.5 text-xs text-red-500">{emailError}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors text-sm"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Remembered it?{' '}
        <Link to="/login" className="text-[#445446] font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ForgotPassword;
