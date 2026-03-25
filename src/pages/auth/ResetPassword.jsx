import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import PasswordInput from '../../components/auth/PasswordInput';
import { resetPasswordApi } from '../../api/authApi';
import { checkPasswordStrength } from '../../utils/validation';

// 'form' | 'submitting' | 'success' | 'expired' | 'invalid'
const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('form');

  // Redirect immediately if no token in URL
  useEffect(() => {
    if (!token) navigate('/forgot-password', { replace: true });
  }, [token, navigate]);

  const validate = () => {
    const e = {};
    if (!password) {
      e.password = 'New password is required.';
    } else {
      const unmet = checkPasswordStrength(password).filter((c) => !c.ok);
      if (unmet.length > 0) e.password = unmet[0].label + ' is required.';
    }
    if (!confirm) e.confirm = 'Please confirm your new password.';
    else if (password !== confirm) e.confirm = 'Passwords do not match.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStatus('submitting');
    try {
      await resetPasswordApi({ token, password });
      setStatus('success');
    } catch (err) {
      const data = err?.response?.data;
      const code = err?.response?.status;
      if (data?.expired || code === 410) setStatus('expired');
      else setStatus('invalid');
    }
  };

  if (!token) return null; // redirect in progress

  // ── Success ──────────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[#1F2933] mb-2">Password updated!</h1>
          <p className="text-sm text-gray-500 mb-8">
            Your password has been updated successfully! Please Sign-In.
          </p>
          <Link
            to="/login"
            className="inline-block w-full bg-[#445446] hover:bg-[#3F4E41] text-white text-sm font-medium py-3 rounded-lg transition-colors"
          >
            Sign in with new password
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ── Expired ──────────────────────────────────────────────────────────────────
  if (status === 'expired') {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[#1F2933] mb-2">Link expired</h1>
          <p className="text-sm text-gray-500 mb-8">
            This reset link expired after 1 hour. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block w-full bg-[#445446] hover:bg-[#3F4E41] text-white text-sm font-medium py-3 rounded-lg transition-colors"
          >
            Request new reset link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ── Invalid ──────────────────────────────────────────────────────────────────
  if (status === 'invalid') {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[#1F2933] mb-2">Invalid link</h1>
          <p className="text-sm text-gray-500 mb-8">
            This reset link is invalid or has already been used. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block w-full bg-[#445446] hover:bg-[#3F4E41] text-white text-sm font-medium py-3 rounded-lg transition-colors"
          >
            Request new reset link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#445446]/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[#445446]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-[#1F2933] mb-1">Set new password</h1>
        <p className="text-sm text-gray-500">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#1F2933] mb-1.5">
            New password
          </label>
          <PasswordInput
            id="password"
            name="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
            placeholder="At least 8 characters"
            hasError={!!errors.password}
          />
          {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
          {password && (
            <ul className="mt-2 space-y-1">
              {checkPasswordStrength(password).map(({ label, ok }) => (
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

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-[#1F2933] mb-1.5">
            Confirm new password
          </label>
          <PasswordInput
            id="confirm"
            name="confirm"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: '' })); }}
            placeholder="Re-enter your password"
            hasError={!!errors.confirm}
          />
          {errors.confirm && <p className="mt-1.5 text-xs text-red-500">{errors.confirm}</p>}
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full bg-[#445446] hover:bg-[#3F4E41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors text-sm"
        >
          {status === 'submitting' ? 'Updating password…' : 'Update password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link to="/login" className="text-[#445446] font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ResetPassword;
