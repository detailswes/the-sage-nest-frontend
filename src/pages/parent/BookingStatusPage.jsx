import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getBookingById } from '../../api/bookingApi';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS        = 40; // ~2 minutes total

function formatLocation(expert) {
  return [expert?.address_street, expert?.address_city, expert?.address_postcode]
    .filter(Boolean).join(', ');
}

function formatDate(isoStr) {
  return new Date(isoStr).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Status icons / banners ───────────────────────────────────────────────────
const SuccessBanner = ({ booking }) => (
  <div className="text-center">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </div>
    <h2 className="text-xl font-bold text-[#1F2933] mb-1">Booking Confirmed!</h2>
    <p className="text-sm text-gray-500 mb-6">
      Your session with <strong>{booking.expert?.user?.name}</strong> is confirmed.
    </p>
    <div className="bg-[#F5F7F5] rounded-xl border border-[#E4E7E4] p-5 text-left mb-6 space-y-2 text-sm">
      <p><span className="font-medium text-[#1F2933]">Service:</span> {booking.service?.title}</p>
      <p><span className="font-medium text-[#1F2933]">Date & Time:</span> {formatDate(booking.scheduled_at)}</p>
      <p><span className="font-medium text-[#1F2933]">Format:</span> {booking.format === 'ONLINE' ? 'Online' : 'In-Person'}</p>
      {booking.format === 'IN_PERSON' && formatLocation(booking.expert) && (
        <p><span className="font-medium text-[#1F2933]">Location:</span> {formatLocation(booking.expert)}</p>
      )}
      {booking.format === 'ONLINE' && (
        <div className="mt-3 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
          Your expert will send you a meeting link (Zoom / Teams) before the session.
        </div>
      )}
    </div>
    <Link to="/dashboard/parent/upcoming"
      className="inline-block bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors">
      View My Bookings
    </Link>
  </div>
);

const FailedBanner = ({ status }) => (
  <div className="text-center">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
      <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </div>
    <h2 className="text-xl font-bold text-[#1F2933] mb-1">
      {status === 'CANCELLED' ? 'Booking Cancelled' : 'Payment Failed'}
    </h2>
    <p className="text-sm text-gray-500 mb-6">
      {status === 'REFUNDED'
        ? 'Your booking has been refunded. Funds will appear in 5–10 business days.'
        : 'Your payment did not go through. Please try again.'}
    </p>
    <Link to="/dashboard/parent/browse"
      className="inline-block bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors">
      Try Again
    </Link>
  </div>
);

const PendingBanner = () => (
  <div className="text-center">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 mb-4">
      <div className="w-8 h-8 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" style={{ borderWidth: 3 }} />
    </div>
    <h2 className="text-xl font-bold text-[#1F2933] mb-1">Confirming your booking…</h2>
    <p className="text-sm text-gray-500">
      We're waiting for payment confirmation. This usually takes a few seconds.
    </p>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const BookingStatusPage = () => {
  const { id: paramId }   = useParams();
  const [searchParams]    = useSearchParams();
  // Support both /booking/status/:id (paramId) and /booking-confirmed?bookingId=X (query param)
  const id = paramId || searchParams.get('bookingId');
  const [booking,  setBooking]  = useState(null);
  const [status,   setStatus]   = useState('PENDING_PAYMENT');
  const [error,    setError]    = useState('');
  const pollCount = useRef(0);
  const timer     = useRef(null);

  // Check if Stripe redirected here after payment (adds ?redirect_status=succeeded etc.)
  const redirectStatus = searchParams.get('redirect_status');

  const fetchStatus = async () => {
    try {
      const data = await getBookingById(id);
      setBooking(data);
      setStatus(data.status);
      if (data.status !== 'PENDING_PAYMENT') {
        clearInterval(timer.current);
      }
    } catch (err) {
      setError('Could not load booking status.');
      clearInterval(timer.current);
    }
  };

  useEffect(() => {
    fetchStatus(); // immediate first check

    timer.current = setInterval(() => {
      pollCount.current += 1;
      if (pollCount.current >= MAX_POLLS) {
        clearInterval(timer.current);
        return;
      }
      fetchStatus();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="min-h-screen bg-[#F5F7F5] flex flex-col items-center justify-center py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E4E7E4] shadow-lg px-8 py-10">

        {/* Logo */}
        <p className="text-center font-bold text-[#1F2933] tracking-tight mb-8">Sage Nest</p>

        {error ? (
          <div className="text-center">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Link to="/dashboard/parent/upcoming" className="text-sm text-[#445446] underline">
              Go to My Bookings
            </Link>
          </div>
        ) : !booking ? (
          <PendingBanner />
        ) : status === 'CONFIRMED' ? (
          <SuccessBanner booking={booking} />
        ) : (status === 'CANCELLED' || status === 'REFUNDED') ? (
          <FailedBanner status={status} />
        ) : (
          <>
            <PendingBanner />
            {redirectStatus === 'succeeded' && (
              <p className="text-xs text-gray-400 text-center mt-4">
                Payment received — finalising confirmation…
              </p>
            )}
            {pollCount.current >= MAX_POLLS && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 mb-2">
                  This is taking longer than usual.
                </p>
                <Link to="/dashboard/parent/upcoming" className="text-sm text-[#445446] underline">
                  Check My Bookings
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BookingStatusPage;
