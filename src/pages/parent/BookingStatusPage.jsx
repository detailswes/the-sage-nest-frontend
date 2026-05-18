import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getBookingById, verifyPayment } from '../../api/bookingApi';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS        = 40; // ~2 minutes total

function formatLocation(expert) {
  return [expert?.address_street, expert?.address_city, expert?.address_postcode]
    .filter(Boolean).join(', ');
}

function formatDate(isoStr) {
  return new Date(isoStr).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatPrice(amount, currency = 'EUR') {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(Number(amount));
}

function formatDuration(mins) {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function bookingRef(booking) {
  const year = new Date(booking.created_at).getFullYear();
  return `SN-${year}-${String(booking.id).padStart(5, '0')}`;
}

// ─── Status icons / banners ───────────────────────────────────────────────────
const SuccessBanner = ({ booking }) => {
  const expertName = booking.expert?.user?.account_deleted
    ? 'Deleted specialist'
    : booking.expert?.user?.name;
  const location = formatLocation(booking.expert);
  const formatLabel = booking.format === 'ONLINE' ? 'Online' : 'In-Person';
  const duration = formatDuration(booking.duration_minutes);

  return (
    <div className="text-center">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#445446]/10 mb-4">
        <svg className="w-8 h-8 text-[#445446]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-[#1F2933] mb-2">Booking confirmed</h2>

      {/* Booking reference chip */}
      <span className="inline-block text-xs font-medium text-gray-500 bg-gray-100 border border-[#E4E7E4] px-3 py-1 rounded-full mb-6">
        Booking ref: {bookingRef(booking)}
      </span>

      {/* Detail table */}
      <div className="border border-[#E4E7E4] rounded-xl overflow-hidden mb-4 text-sm text-left">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E7E4]">
          <span className="text-gray-500">Expert</span>
          <span className="font-medium text-[#1F2933] text-right">{expertName}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E7E4]">
          <span className="text-gray-500">Service</span>
          <span className="font-medium text-[#1F2933] text-right max-w-[60%]">{booking.service?.title}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E7E4]">
          <span className="text-gray-500">Date &amp; time</span>
          <span className="font-medium text-[#1F2933] text-right">{formatDate(booking.scheduled_at)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E7E4]">
          <span className="text-gray-500">Format</span>
          <span className="font-medium text-[#1F2933]">
            {formatLabel}{duration ? ` · ${duration}` : ''}
          </span>
        </div>
        {booking.format === 'IN_PERSON' && location && (
          <div className="flex items-start justify-between px-4 py-3 border-b border-[#E4E7E4]">
            <span className="text-gray-500 flex-shrink-0">Location</span>
            <span className="font-medium text-[#1F2933] text-right ml-4">{location}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-gray-500">Total paid</span>
          <span className="font-semibold text-[#445446]">
            {formatPrice(booking.amount, booking.currency || 'EUR')}
          </span>
        </div>
      </div>

      {/* Email + session link notice */}
      <div className="flex items-start gap-3 px-4 py-3 bg-[#445446]/5 border border-[#445446]/20 rounded-xl mb-6 text-left">
        <svg className="w-4 h-4 text-[#445446] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
        <p className="text-xs text-[#445446] leading-relaxed">
          Confirmation email sent. Your expert will share a meeting link at least 24 hours before your session.
        </p>
      </div>

      <Link to="/dashboard/parent/upcoming"
        className="block w-full bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold py-3 rounded-lg transition-colors text-center">
        View my bookings
      </Link>
    </div>
  );
};

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
        // Polling exhausted — ask the backend to verify directly with Stripe
        // in case the webhook was delayed or missed.
        verifyPayment(id)
          .then((result) => setStatus(result.status))
          .catch(() => {}); // non-fatal; UI already shows fallback link
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
