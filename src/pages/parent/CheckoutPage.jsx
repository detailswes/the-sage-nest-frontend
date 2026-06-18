import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAbandonBookingMutation } from '../../api/bookingApi';

function formatPrice(price, currency = 'EUR', lng = 'en') {
  return new Intl.NumberFormat(lng === 'it' ? 'it' : 'en', { style: 'currency', currency }).format(Number(price));
}
function formatSlotTime(isoStr, lng = 'en') {
  return new Date(isoStr).toLocaleString(lng === 'it' ? 'it-IT' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
const CheckoutPage = () => {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const { t, i18n } = useTranslation('parentBookings');
  const lng = i18n.language;

  const {
    bookingId, clientSecret,
    expertName, serviceTitle, amount, currency = 'EUR', scheduledAt, format, sessionLocation,
    paymentExpiresAt,
    restore,
  } = state || {};

  const [stripeReady,  setStripeReady]  = useState(false);
  const [paying,       setPaying]       = useState(false);
  const [payError,     setPayError]     = useState('');
  const [secsLeft,     setSecsLeft]     = useState(null);

  const [abandonBooking, { isLoading: abandoning }] = useAbandonBookingMutation();
  const [expired,      setExpired]      = useState(false);
  const stripeRef         = useRef(null);
  const elementsRef       = useRef(null);
  const paymentElementRef = useRef(null);
  const mountedRef        = useRef(false);

  // Scroll to top on mount so the order summary is the first thing visible
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);

  // Payment window countdown — counts down to paymentExpiresAt
  useEffect(() => {
    if (!paymentExpiresAt) return;
    const expiryMs = new Date(paymentExpiresAt).getTime();

    const tick = () => {
      const secs = Math.max(0, Math.round((expiryMs - Date.now()) / 1000));
      setSecsLeft(secs);
      if (secs === 0) setExpired(true);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [paymentExpiresAt]);

  // Guard: redirect if no booking state
  useEffect(() => {
    if (!bookingId || !clientSecret) {
      navigate('/dashboard/parent/upcoming', { replace: true });
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

  const handleEditBooking = async () => {
    try {
      await abandonBooking(bookingId).unwrap();
    } catch {
      // If abandon fails the PI will expire naturally — don't block the user
    }
    navigate('/book', { state: { restore } });
  };

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
    <div className="min-h-screen bg-[#f4eee5] bg-sage-stripes bg-stripe-size bg-repeat-x flex flex-col items-center justify-start py-10 px-4">
      {/* Header */}
      <div className="w-full max-w-lg mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleEditBooking}
          disabled={abandoning || paying}
          className="text-sm text-gray-500 hover:text-[#1F2933] flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {abandoning ? (
            <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          )}
          {abandoning ? t('checkout.releasingSlot') : t('checkout.editBooking')}
        </button>
        <span className="text-[#1F2933] font-bold text-lg tracking-tight ml-auto">Sage Nest</span>
      </div>

      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E4E7E4] shadow-lg overflow-hidden">

        {/* Booking summary */}
        <div className="bg-[#F5F7F5] border-b border-[#E4E7E4] px-6 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{t('checkout.summaryLabel')}</p>
          <p className="text-base font-semibold text-[#1F2933]">{serviceTitle}</p>
          <p className="text-sm text-gray-500 mt-0.5">{t('checkout.with', { name: expertName })}</p>
          <p className="text-sm text-gray-500 mt-0.5">{scheduledAt ? formatSlotTime(scheduledAt, lng) : ''}</p>
          {format === 'IN_PERSON' && sessionLocation && (
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-medium text-[#1F2933]">{t('checkout.locationLabel')}</span> {sessionLocation}
            </p>
          )}
          <div className="flex items-center justify-between mt-3">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              format === 'ONLINE'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-[#445446]/10 text-[#445446]'
            }`}>
              {format === 'ONLINE' ? t('checkout.formatOnline') : t('checkout.formatInPerson')}
            </span>
            <span className="text-xl font-bold text-[#1F2933]">{formatPrice(amount, currency, lng)}</span>
          </div>
        </div>

        {/* Payment form */}
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#1F2933]">{t('checkout.paymentDetails')}</p>

            {/* Payment window countdown */}
            {secsLeft !== null && !expired && (
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                secsLeft > 600 ? 'bg-green-50 text-green-700'
                : secsLeft > 180 ? 'bg-amber-50 text-amber-700'
                : 'bg-red-50 text-red-700'
              }`}>
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
                </svg>
                {t('checkout.timeLeftToPay', {
                  time: `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, '0')}`,
                })}
              </div>
            )}
          </div>

          {/* Expired — slot released, show message instead of form */}
          {expired ? (
            <div className="py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#1F2933] mb-1">{t('checkout.paymentExpiredTitle')}</p>
              <p className="text-xs text-gray-500 mb-5">
                {t('checkout.paymentExpiredBody')}
              </p>
              <button
                type="button"
                onClick={handleEditBooking}
                disabled={abandoning}
                className="w-full py-3 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {abandoning ? t('checkout.releasingSlot') : t('checkout.chooseNewTimeBtn')}
              </button>
            </div>
          ) : (
            <>
              {/* Loading spinner — outside the Stripe mount target so React never
                  renders children inside the div Stripe takes over */}
              {!stripeReady && (
                <div className="flex items-center gap-2 py-8 justify-center mb-4">
                  <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
                  <span className="text-sm text-gray-400">{t('checkout.loadingPayment')}</span>
                </div>
              )}

              {/* Stripe Payment Element mounts here — must stay empty, no React children */}
              <div id="payment-element" className="mb-4" />

              {payError && (
                <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {payError}
                </div>
              )}

              {/* Currency notice */}
              <div className="mb-4 p-3 bg-[#F5F7F5] border border-[#E4E7E4] rounded-lg text-xs text-gray-500 leading-relaxed">
                {t('checkout.currencyNotice', { currency })}
              </div>

              <button type="submit"
                disabled={!stripeReady || paying || abandoning}
                className="w-full py-3 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {paying ? t('checkout.processingBtn') : t('checkout.payBtn', { amount: formatPrice(amount, currency, lng) })}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                {t('checkout.stripeNote')}
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;
