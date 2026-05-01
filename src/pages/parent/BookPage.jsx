import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { listExperts, getExpertPublic } from '../../api/expertApi';
import { getAvailableSlots, createBooking, getCurrentTcVersion } from '../../api/bookingApi';
import { getProfileImageUrl } from '../../utils/imageUrl';
import BookingCalendar from '../../components/booking/BookingCalendar';
import CancellationPolicy from '../../components/booking/CancellationPolicy';

// ─── T&C acceptance modal — blocks booking until parent accepts ───────────────
const TcModal = ({ isFirstBooking, onAccept, onDecline }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
    <div className="bg-white rounded-2xl border border-[#E4E7E4] shadow-xl w-full max-w-md p-8">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[#1F2933] mb-2">
          {isFirstBooking ? 'Terms & Conditions' : 'Terms & Conditions Updated'}
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          {isFirstBooking
            ? 'Please review and accept our Terms & Conditions before making a booking.'
            : 'Our Terms & Conditions have been updated since your last booking. You must review and accept the new version before making a new booking.'}
        </p>
      </div>

      <div className="bg-[#F5F7F5] rounded-xl border border-[#E4E7E4] p-4 mb-6 text-sm text-gray-600 leading-relaxed">
        You can read the full{' '}
        <a href="/terms-conditions" target="_blank" rel="noopener noreferrer" className="text-[#445446] font-medium underline">
          Terms &amp; Conditions
        </a>{' '}
        before accepting.
      </div>

      <button
        onClick={onAccept}
        className="w-full py-3 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-lg transition-colors mb-3"
      >
        I accept the Terms &amp; Conditions
      </button>
      <button
        onClick={onDecline}
        className="w-full py-2 px-4 text-sm text-gray-500 hover:text-[#1F2933] transition-colors"
      >
        Cancel and go back
      </button>
    </div>
  </div>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatPrice(price) {
  return `£${Number(price).toFixed(2)}`;
}

function formatDuration(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function formatSlotTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function minDate() {
  return todayISO();
}

function maxDate(advanceDays) {
  if (!advanceDays) return undefined;
  const d = new Date();
  d.setDate(d.getDate() + advanceDays);
  return d.toISOString().slice(0, 10);
}

// ─── Expert card ─────────────────────────────────────────────────────────────
const ExpertCard = ({ expert, onSelect }) => {
  const [imgSrc, setImgSrc] = useState(getProfileImageUrl(expert.profile_image));
  const initials = expert.user?.name
    ? expert.user.name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <button
      onClick={() => onSelect(expert)}
      className="w-full text-left bg-white rounded-xl border border-[#E4E7E4] p-5 hover:border-[#445446] hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#445446]/30"
    >
      <div className="flex items-start gap-4">
        {imgSrc ? (
          <img src={imgSrc} alt={expert.user?.name}
            onError={() => setImgSrc(null)}
            className="w-14 h-14 rounded-full object-cover border border-[#E4E7E4] flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-[#445446] text-white flex items-center justify-center text-base font-bold flex-shrink-0 select-none">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#1F2933]">{expert.user?.name}</p>
          {expert.position && (
            <p className="text-sm text-[#445446] mt-0.5">{expert.position}</p>
          )}
          {expert.summary && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{expert.summary}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {expert.address_city && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {expert.address_city}
              </span>
            )}
            {expert.session_format && (
              <span className="text-xs bg-[#445446]/10 text-[#445446] px-2 py-0.5 rounded-full">
                {expert.session_format === 'BOTH' ? 'Online & In-Person'
                  : expert.session_format === 'ONLINE' ? 'Online' : 'In-Person'}
              </span>
            )}
          </div>
          {expert.services?.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {expert.services.length} service{expert.services.length !== 1 ? 's' : ''} ·
              from {formatPrice(Math.min(...expert.services.map((s) => Number(s.price))))}
            </p>
          )}
        </div>
      </div>
    </button>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const STEPS = { BROWSE: 'browse', SERVICE: 'service', SLOT: 'slot' };

const BookPage = () => {
  const navigate = useNavigate();

  const [step, setStep]           = useState(STEPS.BROWSE);
  const [experts, setExperts]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Selections
  const [selectedExpert,  setSelectedExpert]  = useState(null);
  const [expertDetail,    setExpertDetail]    = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate,    setSelectedDate]    = useState(todayISO());
  const [slots,           setSlots]           = useState([]);
  const [slotsLoading,    setSlotsLoading]    = useState(false);
  const [selectedSlot,    setSelectedSlot]    = useState(null);
  const [selectedFormat,  setSelectedFormat]  = useState('ONLINE');
  const [booking,              setBooking]              = useState(false);
  const [bookErr,              setBookErr]              = useState('');
  const [tcAcceptanceRequired, setTcAcceptanceRequired] = useState(false);
  const [tcIsFirstBooking,     setTcIsFirstBooking]     = useState(false);
  const [tcModalOpen,          setTcModalOpen]          = useState(false);

  const summaryRef = useRef(null);

  // Scroll the booking summary into view whenever a slot is selected
  useEffect(() => {
    if (selectedSlot && summaryRef.current) {
      summaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedSlot]);

  // Check T&C status on mount — used to gate "Proceed to payment".
  // Does NOT block browsing; the modal only fires when the button is clicked.
  useEffect(() => {
    getCurrentTcVersion()
      .then(({ version_updated, is_first_booking }) => {
        setTcAcceptanceRequired(!!version_updated);
        setTcIsFirstBooking(!!is_first_booking);
      })
      .catch(() => {}); // non-fatal — backend also validates tcAccepted
  }, []);

  // Load expert list on mount
  useEffect(() => {
    listExperts()
      .then(setExperts)
      .catch(() => setError('Could not load experts. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  // Load expert detail when selected
  useEffect(() => {
    if (!selectedExpert) return;
    getExpertPublic(selectedExpert.id)
      .then(setExpertDetail)
      .catch(() => setExpertDetail(selectedExpert));
  }, [selectedExpert]);

  // Load slots when date or service changes (step = SLOT)
  const loadSlots = useCallback(async () => {
    if (!selectedExpert || !selectedService || !selectedDate) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const data = await getAvailableSlots(selectedExpert.id, selectedDate, selectedService.id);
      setSlots(data);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [selectedExpert, selectedService, selectedDate]);

  useEffect(() => {
    if (step === STEPS.SLOT) {
      loadSlots();
    }
  }, [step, loadSlots]);

  const handleSelectExpert = (expert) => {
    setSelectedExpert(expert);
    setSelectedService(null);
    setSelectedSlot(null);
    setStep(STEPS.SERVICE);
  };

  const handleSelectService = (service) => {
    setSelectedService(service);
    // Auto-set format based on service format
    if (service.format) setSelectedFormat(service.format);
    setStep(STEPS.SLOT);
  };

  const proceedToPayment = async () => {
    setBooking(true);
    setBookErr('');
    try {
      const result = await createBooking({
        expertId:    selectedExpert.id,
        serviceId:   selectedService.id,
        scheduledAt: selectedSlot.start,
        format:      selectedFormat,
        tcAccepted:  true,
      });
      const detail = expertDetail || selectedExpert;
      const sessionLocation = selectedFormat === 'IN_PERSON'
        ? [detail?.address_street, detail?.address_city, detail?.address_postcode]
            .filter(Boolean).join(', ')
        : null;

      navigate('/checkout', {
        state: {
          bookingId:       result.bookingId,
          clientSecret:    result.clientSecret,
          expertName:      selectedExpert.user?.name,
          serviceTitle:    selectedService.title,
          amount:          selectedService.price,
          scheduledAt:     selectedSlot.start,
          format:          selectedFormat,
          sessionLocation,
        },
      });
    } catch (err) {
      setBookErr(err.response?.data?.error || 'Could not create booking. Please try again.');
      setBooking(false);
    }
  };

  const handleBook = () => {
    if (!selectedSlot) return;
    if (tcAcceptanceRequired) {
      setTcModalOpen(true);
      return;
    }
    proceedToPayment();
  };

  const handleTcAccept = () => {
    setTcModalOpen(false);
    setTcAcceptanceRequired(false);
    proceedToPayment();
  };

  // ── Step: Browse ──────────────────────────────────────────────────────────
  if (step === STEPS.BROWSE) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#1F2933]">Find an Expert</h2>
          <p className="text-sm text-gray-500 mt-1">Browse our vetted experts and book a session.</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          </div>
        ) : experts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-gray-500">No experts available yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
            {experts.map((e) => (
              <ExpertCard key={e.id} expert={e} onSelect={handleSelectExpert} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Step: Select service ──────────────────────────────────────────────────
  if (step === STEPS.SERVICE) {
    const detail = expertDetail || selectedExpert;
    const services = (detail?.services || []).filter((s) => s.is_active !== false);

    return (
      <div>
        {/* Back */}
        <button onClick={() => setStep(STEPS.BROWSE)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1F2933] mb-5 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to experts
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#1F2933]">
            Book with {selectedExpert?.user?.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">Select a service to continue.</p>
        </div>

        {services.length === 0 ? (
          <p className="text-sm text-gray-500">This expert has no active services yet.</p>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <button key={service.id} onClick={() => handleSelectService(service)}
                className="w-full text-left bg-white rounded-xl border border-[#E4E7E4] p-5 hover:border-[#445446] hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#445446]/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1F2933]">{service.title}</p>
                    {service.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {formatDuration(service.duration_minutes)}
                      </span>
                      {service.format && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          service.format === 'ONLINE'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-[#445446]/10 text-[#445446]'
                        }`}>
                          {service.format === 'ONLINE' ? 'Online' : 'In-Person'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-bold text-[#1F2933]">{formatPrice(service.price)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Step: Select slot ─────────────────────────────────────────────────────
  return (
    <div>
      {/* T&C acceptance modal — shown when "Proceed to payment" is clicked */}
      {tcModalOpen && (
        <TcModal
          isFirstBooking={tcIsFirstBooking}
          onAccept={handleTcAccept}
          onDecline={() => setTcModalOpen(false)}
        />
      )}
      {/* Back */}
      <button onClick={() => setStep(STEPS.SERVICE)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1F2933] mb-5 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to services
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#1F2933]">Choose a time</h2>
        <p className="text-sm text-gray-500 mt-1">
          {selectedService?.title} · {formatDuration(selectedService?.duration_minutes)} ·{' '}
          <span className="font-medium text-[#1F2933]">{formatPrice(selectedService?.price)}</span>
        </p>
      </div>

      {/* Format selector — only show if service supports both */}
      {!selectedService?.format && (
        <div className="mb-5 flex gap-3">
          {['ONLINE', 'IN_PERSON'].map((f) => (
            <button key={f} onClick={() => setSelectedFormat(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                selectedFormat === f
                  ? 'bg-[#445446] text-white border-[#445446]'
                  : 'bg-white text-gray-600 border-[#E4E7E4] hover:border-[#445446]'
              }`}>
              {f === 'ONLINE' ? 'Online' : 'In-Person'}
            </button>
          ))}
        </div>
      )}

      {/* Date picker */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[#1F2933] mb-2">Select date</label>
        <BookingCalendar
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          minDateISO={minDate()}
          maxDateISO={maxDate(expertDetail?.advance_booking_days)}
        />
      </div>

      {/* Slots grid */}
      {slotsLoading ? (
        <div className="flex items-center gap-2 py-4">
          <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          <span className="text-sm text-gray-500">Loading available times…</span>
        </div>
      ) : slots.length === 0 ? (
        <div className="py-6 text-center bg-white rounded-xl border border-[#E4E7E4]">
          <p className="text-sm font-medium text-gray-500">No available slots on this date.</p>
          <p className="text-xs text-gray-400 mt-1">Try selecting a different date.</p>
        </div>
      ) : (
        <>
        <p className="text-xs text-gray-400 mb-2">Times shown in your local timezone.</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-6">
          {slots.map((slot) => (
            <button key={slot.start} onClick={() => setSelectedSlot(slot)}
              className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all duration-150 ${
                selectedSlot?.start === slot.start
                  ? 'bg-[#445446] text-white border-[#445446]'
                  : 'bg-white text-[#1F2933] border-[#E4E7E4] hover:border-[#445446]'
              }`}>
              {formatSlotTime(slot.start)}
            </button>
          ))}
        </div>
        </>
      )}

      {/* Cancellation policy — always visible on slot step */}
      <div className="mt-5">
        <CancellationPolicy />
      </div>

      {/* Summary + Book button */}
      {selectedSlot && (
        <div ref={summaryRef} className="bg-white rounded-xl border border-[#E4E7E4] p-5 mt-2">
          <h3 className="text-sm font-semibold text-[#1F2933] mb-3">Booking summary</h3>
          <div className="space-y-1 text-sm text-gray-600 mb-4">
            <p><span className="font-medium text-[#1F2933]">Expert:</span> {selectedExpert?.user?.name}</p>
            <p><span className="font-medium text-[#1F2933]">Service:</span> {selectedService?.title}</p>
            <p><span className="font-medium text-[#1F2933]">Date:</span> {new Date(selectedSlot.start).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p><span className="font-medium text-[#1F2933]">Time:</span> {formatSlotTime(selectedSlot.start)} <span className="text-xs text-gray-400">(your local time)</span></p>
            <p><span className="font-medium text-[#1F2933]">Format:</span> {selectedFormat === 'ONLINE' ? 'Online' : 'In-Person'}</p>
            {selectedFormat === 'IN_PERSON' && (() => {
              const d = expertDetail || selectedExpert;
              const loc = [d?.address_street, d?.address_city, d?.address_postcode].filter(Boolean).join(', ');
              return loc ? <p><span className="font-medium text-[#1F2933]">Location:</span> {loc}</p> : null;
            })()}
            <p><span className="font-medium text-[#1F2933]">Duration:</span> {formatDuration(selectedService?.duration_minutes)}</p>
            <p className="text-base font-semibold text-[#1F2933] mt-2">{formatPrice(selectedService?.price)}</p>
          </div>

          {/* Health disclaimer */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
            Sage Nest is a booking platform, not a healthcare provider. Practitioners listed on this platform are independent professionals. Advice given during sessions does not constitute medical advice, diagnosis, or treatment and should not be relied upon as a substitute for professional medical care. Always seek the advice of a qualified healthcare provider if you have concerns about your or your child's health. If you believe you or your child need urgent medical care, contact emergency services immediately.
          </div>

          {bookErr && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{bookErr}</div>
          )}

          <button onClick={handleBook} disabled={booking}
            className="w-full py-3 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {booking ? 'Creating booking…' : 'Proceed to payment'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            You won't be charged until payment is confirmed on the next step.
          </p>
        </div>
      )}
    </div>
  );
};

export default BookPage;
