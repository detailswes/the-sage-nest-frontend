import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

function formatPrice(price) {
  return `£${Number(price).toFixed(2)}`;
}
function formatSlotTime(isoStr) {
  return new Date(isoStr).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
const CheckoutPage = () => {
  const { state } = useLocation();
  const navigate  = useNavigate();

  const {
    bookingId, clientSecret,
    expertName, serviceTitle, amount, scheduledAt, format, sessionLocation,
  } = state || {};

  const [stripeReady, setStripeReady]   = useState(false);
  const [paying,      setPaying]        = useState(false);
  const [payError,    setPayError]      = useState('');
  const stripeRef         = useRef(null);
  const elementsRef       = useRef(null);
  const paymentElementRef = useRef(null);
  const mountedRef        = useRef(false);

  // Guard: redirect if no booking state
  useEffect(() => {
    if (!bookingId || !clientSecret) {
      navigate('/dashboard/parent/browse', { replace: true });
    }
  }, [bookingId, clientSecret, navigate]);

  // Initialise Stripe Payment Element after Stripe.js CDN has loaded
  useEffect(() => {
    if (!clientSecret || mountedRef.current) return;

    const pk = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
    if (!pk) {
      setPayError('Stripe publishable key is not configured.');
      return;
    }

    let paymentElement = null;

    // Poll until window.Stripe is available (CDN loads async)
    const interval = setInterval(() => {
      if (!window.Stripe) return;
      clearInterval(interval);

      const stripe   = window.Stripe(pk);
      stripeRef.current = stripe;

      const elements = stripe.elements({ clientSecret });
      elementsRef.current = elements;

      paymentElement = elements.create('payment');
      paymentElementRef.current = paymentElement;
      paymentElement.mount('#payment-element');
      paymentElement.on('ready', () => setStripeReady(true));
      paymentElement.on('change', () => setPayError(''));

      mountedRef.current = true;
    }, 100);

    return () => {
      clearInterval(interval);
      // Unmount Stripe's DOM nodes before React removes the container —
      // without this React throws "removeChild: node is not a child" errors
      if (paymentElement) {
        paymentElement.unmount();
        paymentElementRef.current = null;
      }
      mountedRef.current = false;
    };
  }, [clientSecret]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripeRef.current || !elementsRef.current) return;
    setPaying(true);
    setPayError('');

    // confirmPayment redirects to return_url on success.
    // On failure it returns an error object instead.
    const { error } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: {
        return_url: `${window.location.origin}/booking-confirmed?bookingId=${bookingId}`,
      },
    });

    // Only reached if confirmPayment did NOT redirect (i.e., an error occurred).
    // Validation errors (incomplete fields) are already shown inline by the
    // Payment Element — suppress the banner for those to avoid duplication.
    if (error) {
      if (error.type !== 'validation_error') {
        setPayError(error.message || 'Payment failed. Please try again.');
      }
      setPaying(false);
    }
  };

  if (!bookingId || !clientSecret) return null;

  return (
    <div className="min-h-screen bg-[#F5F7F5] flex flex-col items-center justify-start py-10 px-4">
      {/* Header */}
      <div className="w-full max-w-lg mb-6 flex items-center gap-3">
        <Link to="/dashboard/parent/browse"
          className="text-sm text-gray-500 hover:text-[#1F2933] flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Cancel
        </Link>
        <span className="text-[#1F2933] font-bold text-lg tracking-tight ml-auto">Sage Nest</span>
      </div>

      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E4E7E4] shadow-lg overflow-hidden">

        {/* Booking summary */}
        <div className="bg-[#F5F7F5] border-b border-[#E4E7E4] px-6 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Booking summary</p>
          <p className="text-base font-semibold text-[#1F2933]">{serviceTitle}</p>
          <p className="text-sm text-gray-500 mt-0.5">with {expertName}</p>
          <p className="text-sm text-gray-500 mt-0.5">{scheduledAt ? formatSlotTime(scheduledAt) : ''}</p>
          {format === 'IN_PERSON' && sessionLocation && (
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-medium text-[#1F2933]">Location:</span> {sessionLocation}
            </p>
          )}
          <div className="flex items-center justify-between mt-3">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              format === 'ONLINE'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-[#445446]/10 text-[#445446]'
            }`}>
              {format === 'ONLINE' ? 'Online' : 'In-Person'}
            </span>
            <span className="text-xl font-bold text-[#1F2933]">{formatPrice(amount)}</span>
          </div>
        </div>

        {/* Payment form */}
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <p className="text-sm font-medium text-[#1F2933] mb-4">Payment details</p>

          {/* Loading spinner — outside the Stripe mount target so React never
              renders children inside the div Stripe takes over */}
          {!stripeReady && (
            <div className="flex items-center gap-2 py-8 justify-center mb-4">
              <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
              <span className="text-sm text-gray-400">Loading payment form…</span>
            </div>
          )}

          {/* Stripe Payment Element mounts here — must stay empty, no React children */}
          <div id="payment-element" className="mb-4" />

          {payError && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {payError}
            </div>
          )}

          {/* Cancellation policy — visible before payment is committed */}
          <div className="mb-4 px-3 py-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
            <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Cancellation policy:</span> Free cancellation up to 24 hours before the session. Cancellations made within 24 hours of the session are not eligible for a refund.
            </p>
          </div>

          <button type="submit"
            disabled={!stripeReady || paying}
            className="w-full py-3 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {paying ? 'Processing…' : `Pay ${formatPrice(amount)}`}
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            Secured by Stripe. Your card details are never stored by Sage Nest.
          </p>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;
