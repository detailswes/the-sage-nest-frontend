import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyStripeReturn } from '../../api/stripeApi';

// ─── Status illustrations ─────────────────────────────────────────────────────
const SuccessIcon = () => (
  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  </div>
);

const WarningIcon = () => (
  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
    <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  </div>
);

const ErrorIcon = () => (
  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
const StripeReturn = () => {
  const navigate = useNavigate();
  // 'verifying' | 'success' | 'incomplete' | 'error'
  const [status, setStatus] = useState('verifying');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    verifyStripeReturn()
      .then((data) => {
        if (data.onboarding_complete) {
          setStatus('success');
        } else {
          setStatus('incomplete');
        }
      })
      .catch(() => setStatus('error'));
  }, []);

  // Auto-redirect countdown on success
  useEffect(() => {
    if (status !== 'success') return;
    if (countdown === 0) {
      navigate('/dashboard/expert/profile?stripe=success', { replace: true });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown, navigate]);

  const goToProfile = () =>
    navigate('/dashboard/expert/profile', { replace: true });

  const goToProfileSuccess = () =>
    navigate('/dashboard/expert/profile?stripe=success', { replace: true });

  return (
    <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-[#E4E7E4] w-full max-w-md px-8 py-10 text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <img
            src="/assets/images/Sage-Nest_Final.svg"
            alt="Sage Nest"
            className="h-7"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className="font-bold text-[#1F2933] text-base tracking-tight">Sage Nest</span>
        </div>

        {/* Verifying */}
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 rounded-full border-4 border-[#445446]/20 border-t-[#445446] animate-spin mx-auto mb-5" />
            <h2 className="text-lg font-semibold text-[#1F2933] mb-2">Verifying your Stripe account…</h2>
            <p className="text-sm text-gray-500">Please wait while we confirm your setup.</p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <SuccessIcon />
            <h2 className="text-lg font-semibold text-[#1F2933] mb-2">Stripe account connected!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Your payment account is ready. You can now receive payouts from bookings.
            </p>
            <button
              onClick={goToProfileSuccess}
              className="w-full py-2.5 px-4 rounded-lg bg-[#445446] hover:bg-[#3F4E41] text-white text-sm font-medium transition-colors"
            >
              Back to Profile
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Redirecting automatically in {countdown}s…
            </p>
          </>
        )}

        {/* Incomplete */}
        {status === 'incomplete' && (
          <>
            <WarningIcon />
            <h2 className="text-lg font-semibold text-[#1F2933] mb-2">Setup not complete</h2>
            <p className="text-sm text-gray-500 mb-6">
              You haven't finished setting up your Stripe account. Go back to your profile and click
              <span className="font-medium text-[#1F2933]"> "Complete Stripe Setup"</span> to continue.
            </p>
            <button
              onClick={goToProfile}
              className="w-full py-2.5 px-4 rounded-lg bg-[#445446] hover:bg-[#3F4E41] text-white text-sm font-medium transition-colors"
            >
              Back to Profile
            </button>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <ErrorIcon />
            <h2 className="text-lg font-semibold text-[#1F2933] mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-6">
              We couldn't verify your Stripe account. Please try again from your profile.
            </p>
            <button
              onClick={goToProfile}
              className="w-full py-2.5 px-4 rounded-lg bg-[#445446] hover:bg-[#3F4E41] text-white text-sm font-medium transition-colors"
            >
              Back to Profile
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default StripeReturn;
