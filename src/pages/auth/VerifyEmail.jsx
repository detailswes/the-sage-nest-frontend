import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useVerifyEmailMutation } from '../../api/userApi';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/auth/AuthLayout';
import useResendVerification from '../../hooks/useResendVerification';

// ─── Shared resend form used in expired/invalid/error states ─────────────────
const ResendForm = ({ title, description }) => {
  const [email, setEmail] = useState('');
  const { resend, status, countdown } = useResendVerification();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) resend(email.trim());
  };

  return (
    <>
      <p className="text-sm text-gray-500 mb-5">{description}</p>

      {status === 'sent' && countdown > 0 ? (
        <div className="w-full mb-4 py-3 px-4 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 text-center">
          Email sent! Check your inbox. Resend available in {countdown}s.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full px-4 py-3 rounded-lg border border-[#E4E7E4] text-sm text-[#1F2933] placeholder-gray-400 bg-white mb-3 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 focus:border-[#445446]"
          />
          <button
            type="submit"
            disabled={status === 'sending' || !email.trim()}
            className="w-full py-2.5 px-4 rounded-lg bg-[#445446] hover:bg-[#3F4E41] text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === 'sending' ? 'Sending…' : status === 'error' ? 'Failed — try again' : 'Resend verification email'}
          </button>
        </form>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 border-t border-[#E4E7E4]" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 border-t border-[#E4E7E4]" />
      </div>

      <Link
        to="/register"
        className="inline-block w-full py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-500 hover:text-[#1F2933] hover:border-[#445446]/40 text-center transition-colors"
      >
        {title}
      </Link>
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
// states: 'verifying' | 'success' | 'already_verified' | 'expired' | 'invalid' | 'error'
const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status,   setStatus]   = useState('verifying');
  const [returnTo, setReturnTo] = useState(null);
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [verifyEmail] = useVerifyEmailMutation();
  // Prevents React StrictMode's double-invocation from consuming the verification
  // code twice (second call would fail with "already verified" and not return tokens).
  const hasRanRef = useRef(false);

  useEffect(() => {
    if (hasRanRef.current) return;
    hasRanRef.current = true;

    const userId           = searchParams.get('userId');
    const verificationCode = searchParams.get('verificationCode');
    const rt               = searchParams.get('returnTo');

    if (!userId || !verificationCode) {
      setStatus('invalid');
      return;
    }

    verifyEmail({ userId, verificationCode })
      .unwrap()
      .then((data) => {
        // Auto-login only on first-time verification (tokens are only returned then).
        // The already_verified case intentionally omits tokens — issuing them without
        // re-checking the verification code would be a security gap.
        if (data.accessToken && data.user) {
          login(data);
        }
        // Validate returnTo is a relative path before trusting it
        const safeReturnTo = rt && rt.startsWith('/') ? rt : null;
        setReturnTo(safeReturnTo);
        setStatus(data.already_verified ? 'already_verified' : 'success');
      })
      .catch((err) => {
        const errData = err?.data;
        const code    = err?.status;
        if (errData?.expired) setStatus('expired');
        else if (code === 400 || code === 404) setStatus('invalid');
        else setStatus('error');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthLayout>
      <div className="text-center">

        {/* Verifying */}
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 rounded-full border-4 border-[#445446]/20 border-t-[#445446] animate-spin mx-auto mb-5" />
            <h1 className="text-xl font-semibold text-[#1F2933] mb-2">Verifying your email…</h1>
            <p className="text-sm text-gray-500">Just a moment while we activate your account.</p>
          </>
        )}
 
        {/* Success — auto-logged in, redirect to booking or dashboard */}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[#1F2933] mb-2">Email verified!</h1>
            <p className="text-sm text-gray-500 mb-8">
              {returnTo?.startsWith('/book')
                ? 'Your account is active and you are signed in. Continue to complete your booking.'
                : 'Your account is now active and you are signed in.'}
            </p>
            <button
              onClick={() => navigate(returnTo || '/')}
              className="w-full bg-[#445446] hover:bg-[#3F4E41] text-white text-sm font-medium py-3 rounded-lg transition-colors duration-200"
            >
              {returnTo?.startsWith('/book') ? 'Continue to booking →' : 'Go to my dashboard'}
            </button>
          </>
        )}

        {/* Already verified — user must sign in manually (no token issued for security) */}
        {status === 'already_verified' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[#1F2933] mb-2">Already verified!</h1>
            <p className="text-sm text-gray-500 mb-8">
              {returnTo?.startsWith('/book')
                ? 'Your account is already active. Sign in to continue your booking.'
                : 'Your account is already active. Sign in to continue.'}
            </p>
            <Link
              to="/login"
              className="inline-block w-full bg-[#445446] hover:bg-[#3F4E41] text-white text-sm font-medium py-3 rounded-lg transition-colors duration-200"
            >
              Sign in to your account
            </Link>
          </>
        )}

        {/* Expired link */}
        {status === 'expired' && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[#1F2933] mb-3">Link expired</h1>
            <ResendForm
              title="Register with a new account"
              description="This link expired after 24 hours. Enter your email to get a fresh one, or register again."
            />
          </>
        )}

        {/* Invalid link */}
        {status === 'invalid' && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[#1F2933] mb-3">Invalid link</h1>
            <ResendForm
              title="Register with a new account"
              description="This verification link is invalid. Enter your email to resend, or register again."
            />
          </>
        )}

        {/* Server error */}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[#1F2933] mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-500 mb-8">
              We couldn't verify your email right now. Please try clicking the link again or contact support.
            </p>
            <Link
              to="/login"
              className="text-sm text-[#445446] font-medium hover:underline"
            >
              Back to sign in
            </Link>
          </>
        )}

      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;
