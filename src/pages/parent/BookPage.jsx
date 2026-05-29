import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { getExpertPublic } from '../../api/expertApi';
import { getAvailableSlots, getAvailableDatesInMonth, createBooking, getCurrentTcVersion, acceptTcApi, lockSlotApi, releaseLockApi } from '../../api/bookingApi';
import { getProfileImageUrl } from '../../utils/imageUrl';
import BookingCalendar from '../../components/booking/BookingCalendar';
import CancellationPolicy from '../../components/booking/CancellationPolicy';

const WEBFLOW_DIRECTORY_URL = process.env.REACT_APP_WEBFLOW_DIRECTORY_URL || 'https://www.sagenest.org/experts';

// ─── T&C acceptance modal ─────────────────────────────────────────────────────
const TcModal = ({ isFirstBooking, onAccept, onDecline }) => {
  const { t } = useTranslation('parentBookings');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl border border-[#E4E7E4] shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[#1F2933] mb-2">
            {isFirstBooking ? t('tcModal.titleFirst') : t('tcModal.titleUpdated')}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            {isFirstBooking ? t('tcModal.bodyFirst') : t('tcModal.bodyUpdated')}
          </p>
        </div>

        <div className="bg-[#F5F7F5] rounded-xl border border-[#E4E7E4] p-4 mb-6 text-sm text-gray-600 leading-relaxed">
          <Trans
            i18nKey="tcModal.readFull"
            ns="parentBookings"
            components={[
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              <a href="/terms-conditions" target="_blank" rel="noopener noreferrer" className="text-[#445446] font-medium underline" />,
            ]}
          />
        </div>

        <button
          onClick={onAccept}
          className="w-full py-3 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-lg transition-colors mb-3"
        >
          {t('tcModal.acceptBtn')}
        </button>
        <button
          onClick={onDecline}
          className="w-full py-2 px-4 text-sm text-gray-500 hover:text-[#1F2933] transition-colors"
        >
          {t('tcModal.cancelBtn')}
        </button>
      </div>
    </div>
  );
};

// ─── Cluster tags ─────────────────────────────────────────────────────────────
const CLUSTER_BADGE = {
  FOR_PARENTS: { label: 'For the Parents', cls: 'bg-pink-100 text-pink-700' },
  FOR_BABY:    { label: 'For the Baby',    cls: 'bg-cyan-100 text-cyan-700' },
  PACKAGE:     { label: 'Package',         cls: 'bg-amber-100 text-amber-700' },
  GIFT:        { label: 'Gift',            cls: 'bg-green-100 text-green-700' },
  EVENT:       { label: 'Event',           cls: 'bg-violet-100 text-violet-700' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatPrice(price, currency = 'EUR', lng = 'en') {
  return new Intl.NumberFormat(lng === 'it' ? 'it' : 'en', { style: 'currency', currency }).format(Number(price));
}

function formatDuration(mins, t = null) {
  if (!t) {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }
  if (mins < 60) return t('slotStep.duration.minutes', { count: mins });
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? t('slotStep.duration.hoursMinutes', { h, m }) : t('slotStep.duration.hours', { h });
}

function formatSlotTime(isoString, lng = 'en') {
  return new Date(isoString).toLocaleTimeString(lng === 'it' ? 'it-IT' : 'en-GB', {
    hour: '2-digit', minute: '2-digit',
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function maxDate(advanceDays) {
  if (!advanceDays) return undefined;
  const d = new Date();
  d.setDate(d.getDate() + advanceDays);
  return d.toISOString().slice(0, 10);
}

const DESCRIPTION_WORD_LIMIT = 20;

function truncateWords(text, limit) {
  const words = text.split(' ');
  if (words.length <= limit) return { short: text, truncated: false };
  return { short: words.slice(0, limit).join(' ') + '…', truncated: true };
}

// ─── Expert header — shown at top of service selection ───────────────────────
const ExpertHeader = ({ expert, returnUrl }) => {
  const [imgSrc, setImgSrc] = useState(getProfileImageUrl(expert?.profile_image));
  const initials = expert?.user?.name
    ? expert.user.name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="flex items-center gap-4 bg-white rounded-xl border border-[#E4E7E4] p-4 mb-6">
      {imgSrc ? (
        <img src={imgSrc} alt={expert?.user?.name}
          onError={() => setImgSrc(null)}
          className="w-16 h-16 rounded-full object-cover border border-[#E4E7E4] flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-[#445446] text-white flex items-center justify-center text-lg font-bold flex-shrink-0 select-none">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#1F2933] text-base">{expert?.user?.name}</p>
        {expert?.position && <p className="text-sm text-[#445446] mt-0.5">{expert.position}</p>}
        {expert?.summary && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{expert.summary}</p>}
      </div>
      {returnUrl && (
        <a href={returnUrl}
          className="flex-shrink-0 text-xs text-gray-400 hover:text-[#445446] transition-colors underline-offset-2 hover:underline">
          View profile
        </a>
      )}
    </div>
  );
};

// ─── Steps ───────────────────────────────────────────────────────────────────
const STEPS = { SERVICE: 'service', SLOT: 'slot' };

// ─── Main component ───────────────────────────────────────────────────────────
const BookPage = () => {
  const navigate               = useNavigate();
  const { state: locationState } = useLocation();
  const [searchParams]         = useSearchParams();
  const { t, i18n }            = useTranslation('parentBookings');
  const lng                    = i18n.language;

  // URL params — set by Webflow "Book a Meeting" button
  const expertIdParam  = searchParams.get('expertId');
  const serviceIdParam = searchParams.get('serviceId');
  const returnUrl      = searchParams.get('return_url') || WEBFLOW_DIRECTORY_URL;

  const [step, setStep]           = useState(STEPS.SERVICE);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

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
  const [expandedDesc,         setExpandedDesc]         = useState({});
  const [availableDates,       setAvailableDates]       = useState(undefined);
  const [loadingDates,         setLoadingDates]         = useState(false);
  const [tcAcceptanceRequired, setTcAcceptanceRequired] = useState(false);
  const [tcIsFirstBooking,     setTcIsFirstBooking]     = useState(false);
  const [tcModalOpen,          setTcModalOpen]          = useState(false);

  const [lockId,        setLockId]        = useState(null);
  const [lockExpiresAt, setLockExpiresAt] = useState(null);
  const [lockSecsLeft,  setLockSecsLeft]  = useState(null);
  const [locking,       setLocking]       = useState(false);
  const [lockErr,       setLockErr]       = useState('');
  const lockIdRef = useRef(null);

  const summaryRef = useRef(null);

  // ── Consume booking context from sessionStorage or URL params ──────────────
  useEffect(() => {
    // Clear saved booking context — we are now on the booking page
    sessionStorage.removeItem('sage_booking_ctx');

    // Restore from checkout "Edit booking" navigation
    if (locationState?.restore) {
      const { expert, service, format: fmt } = locationState.restore;
      if (expert) { setSelectedExpert(expert); setExpertDetail(expert); }
      if (service) setSelectedService(service);
      if (fmt) setSelectedFormat(fmt);
      if (expert && service) setStep(STEPS.SLOT);
      setLoading(false);
      return;
    }

    if (!expertIdParam) {
      setError('No expert specified. Please start from the expert directory.');
      setLoading(false);
      return;
    }

    getExpertPublic(Number(expertIdParam))
      .then((expert) => {
        setSelectedExpert(expert);
        setExpertDetail(expert);

        if (serviceIdParam) {
          const svc = (expert.services || []).find(
            (s) => s.id === Number(serviceIdParam) && s.is_active !== false,
          );
          if (svc) {
            setSelectedService(svc);
            if (svc.format) setSelectedFormat(svc.format);
            setStep(STEPS.SLOT);
          }
        }
      })
      .catch(() => setError('Could not load expert. Please try again.'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (lockIdRef.current) {
        releaseLockApi(lockIdRef.current).catch(() => {});
        lockIdRef.current = null;
      }
    };
  }, []);

  // Lock countdown timer
  useEffect(() => {
    if (!lockExpiresAt) { setLockSecsLeft(null); return; }
    const tick = () => {
      const secs = Math.max(0, Math.round((lockExpiresAt.getTime() - Date.now()) / 1000));
      setLockSecsLeft(secs);
      if (secs === 0) {
        lockIdRef.current = null;
        setLockId(null);
        setLockExpiresAt(null);
        setSelectedSlot(null);
        setLockErr(t('slotStep.lockExpired'));
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockExpiresAt, t]);

  // Scroll summary into view when slot is selected
  useEffect(() => {
    if (selectedSlot && summaryRef.current) {
      summaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedSlot]);

  // T&C status on mount
  useEffect(() => {
    getCurrentTcVersion()
      .then(({ version_updated, is_first_booking }) => {
        setTcAcceptanceRequired(!!version_updated);
        setTcIsFirstBooking(!!is_first_booking);
      })
      .catch(() => {});
  }, []);

  // Load slots when entering SLOT step
  const loadSlots = useCallback(async () => {
    if (!selectedExpert || !selectedService || !selectedDate) return;
    if (lockIdRef.current) {
      releaseLockApi(lockIdRef.current).catch(() => {});
      lockIdRef.current = null;
      setLockId(null);
      setLockExpiresAt(null);
      setLockErr('');
    }
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
    if (step === STEPS.SLOT) loadSlots();
  }, [step, loadSlots]);

  const handleSelectSlot = async (slot) => {
    if (locking) return;
    setLocking(true);
    setLockErr('');
    try {
      const { lockId: id, expiresAt } = await lockSlotApi(selectedExpert.id, slot.start);
      lockIdRef.current = id;
      setLockId(id);
      setLockExpiresAt(new Date(expiresAt));
      setSelectedSlot(slot);
    } catch (err) {
      if (err.response?.status === 409) {
        setLockErr(t('slotStep.lockConflict'));
      } else {
        setLockErr(t('slotStep.lockError'));
      }
      setSelectedSlot(null);
    } finally {
      setLocking(false);
    }
  };

  const handleBackToServices = () => {
    if (lockIdRef.current) {
      releaseLockApi(lockIdRef.current).catch(() => {});
      lockIdRef.current = null;
      setLockId(null);
      setLockExpiresAt(null);
      setLockErr('');
    }
    setStep(STEPS.SERVICE);
  };

  const fetchAvailableDates = useCallback(async (year, month) => {
    if (!selectedExpert) return;
    setLoadingDates(true);
    try {
      const dates = await getAvailableDatesInMonth(
        selectedExpert.id, year, month, selectedService?.id,
      );
      setAvailableDates(dates);
    } catch {
      setAvailableDates(undefined);
    } finally {
      setLoadingDates(false);
    }
  }, [selectedExpert, selectedService]);

  const handleSelectService = (service) => {
    setSelectedService(service);
    setAvailableDates(undefined);
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
        lockId,
      });
      lockIdRef.current = null;
      setLockId(null);
      setLockExpiresAt(null);
      const detail = expertDetail || selectedExpert;
      const sessionLocation = selectedFormat === 'IN_PERSON'
        ? [detail?.address_street, detail?.address_city, detail?.address_postcode]
            .filter(Boolean).join(', ')
        : null;

      navigate('/checkout', {
        state: {
          bookingId:    result.bookingId,
          clientSecret: result.clientSecret,
          expertName:   selectedExpert.user?.name,
          serviceTitle: selectedService.title,
          amount:       selectedService.price,
          currency:     result.currency || selectedService.currency || 'EUR',
          scheduledAt:  selectedSlot.start,
          format:       selectedFormat,
          sessionLocation,
          restore: {
            expert:  selectedExpert,
            service: selectedService,
            format:  selectedFormat,
          },
        },
      });
    } catch (err) {
      setBookErr(err.response?.data?.error || t('slotStep.bookError'));
      setBooking(false);
    }
  };

  const handleBook = () => {
    if (!selectedSlot) return;
    if (tcAcceptanceRequired) { setTcModalOpen(true); return; }
    proceedToPayment();
  };

  const handleTcAccept = async () => {
    setTcModalOpen(false);
    try { await acceptTcApi(); } catch { /* non-fatal */ }
    setTcAcceptanceRequired(false);
    proceedToPayment();
  };

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <a href={WEBFLOW_DIRECTORY_URL}
          className="text-sm text-[#445446] underline hover:text-[#3a4a3b]">
          Browse experts
        </a>
      </div>
    );
  }

  // ── Step: Select service ──────────────────────────────────────────────────
  if (step === STEPS.SERVICE) {
    const detail = expertDetail || selectedExpert;
    const services = (detail?.services || []).filter((s) => s.is_active !== false);

    return (
      <div>
        {/* Back → Webflow expert profile */}
        <a href={returnUrl}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1F2933] mb-5 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to expert profile
        </a>

        {/* Expert header */}
        <ExpertHeader expert={detail} returnUrl={null} />

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
            {services.map((service) => {
              const isPreSelected = service.id === Number(serviceIdParam);
              return (
                <button key={service.id} onClick={() => handleSelectService(service)}
                  className={`w-full text-left bg-white rounded-xl border p-5 hover:border-[#445446] hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#445446]/30 ${
                    isPreSelected ? 'border-[#445446] ring-1 ring-[#445446]/20' : 'border-[#E4E7E4]'
                  }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#1F2933]">{service.title}</p>
                        {isPreSelected && (
                          <span className="text-xs bg-[#445446]/10 text-[#445446] px-2 py-0.5 rounded-full font-medium">Selected</span>
                        )}
                      </div>
                      {service.description && (() => {
                        const { short, truncated } = truncateWords(service.description, DESCRIPTION_WORD_LIMIT);
                        const isExpanded = !!expandedDesc[service.id];
                        return (
                          <p className="text-sm text-gray-500 mt-1">
                            {isExpanded ? service.description : short}
                            {truncated && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); setExpandedDesc((p) => ({ ...p, [service.id]: !isExpanded })); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setExpandedDesc((p) => ({ ...p, [service.id]: !isExpanded })); }}}
                                className="ml-1 text-[#445446] font-medium cursor-pointer hover:underline"
                              >
                                {isExpanded ? 'Show less' : 'Read more'}
                              </span>
                            )}
                          </p>
                        );
                      })()}
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
                        {service.cluster && CLUSTER_BADGE[service.cluster] && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CLUSTER_BADGE[service.cluster].cls}`}>
                            {CLUSTER_BADGE[service.cluster].label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-lg font-bold text-[#1F2933]">{formatPrice(service.price, service.currency || 'EUR')}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Step: Select slot ─────────────────────────────────────────────────────
  return (
    <div>
      {tcModalOpen && (
        <TcModal
          isFirstBooking={tcIsFirstBooking}
          onAccept={handleTcAccept}
          onDecline={() => setTcModalOpen(false)}
        />
      )}

      {/* Back → service selection */}
      <button onClick={handleBackToServices}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1F2933] mb-5 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        {t('slotStep.backToServices')}
      </button>

      {/* Expert header — always visible */}
      <ExpertHeader expert={expertDetail || selectedExpert} returnUrl={returnUrl} />

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#1F2933]">{t('slotStep.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {selectedService?.title} · {formatDuration(selectedService?.duration_minutes, t)} ·{' '}
          <span className="font-medium text-[#1F2933]">{formatPrice(selectedService?.price, selectedService?.currency || 'EUR', lng)}</span>
        </p>
      </div>

      {/* Format selector — only if service supports both */}
      {!selectedService?.format && (
        <div className="mb-5 flex gap-3">
          {['ONLINE', 'IN_PERSON'].map((f) => (
            <button key={f} onClick={() => setSelectedFormat(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                selectedFormat === f
                  ? 'bg-[#445446] text-white border-[#445446]'
                  : 'bg-white text-gray-600 border-[#E4E7E4] hover:border-[#445446]'
              }`}>
              {f === 'ONLINE' ? t('slotStep.formatOnline') : t('slotStep.formatInPerson')}
            </button>
          ))}
        </div>
      )}

      {/* Date picker */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[#1F2933] mb-2">{t('slotStep.selectDate')}</label>
        <BookingCalendar
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          minDateISO={todayISO()}
          maxDateISO={maxDate(expertDetail?.advance_booking_days)}
          availableDates={availableDates}
          loadingDates={loadingDates}
          onMonthChange={fetchAvailableDates}
        />
      </div>

      {/* Slots */}
      {slotsLoading ? (
        <div className="flex items-center gap-2 py-4">
          <div className="w-5 h-5 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
          <span className="text-sm text-gray-500">{t('slotStep.loadingSlots')}</span>
        </div>
      ) : slots.length === 0 ? (
        <div className="py-6 text-center bg-white rounded-xl border border-[#E4E7E4]">
          <p className="text-sm font-medium text-gray-500">{t('slotStep.noSlots')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('slotStep.noSlotsHint')}</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-2">{t('slotStep.timezone')}</p>
          {lockErr && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{lockErr}</div>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-6">
            {slots.map((slot) => (
              <button key={slot.start} onClick={() => handleSelectSlot(slot)}
                disabled={locking}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all duration-150 disabled:opacity-60 ${
                  selectedSlot?.start === slot.start
                    ? 'bg-[#445446] text-white border-[#445446]'
                    : 'bg-white text-[#1F2933] border-[#E4E7E4] hover:border-[#445446]'
                }`}>
                {formatSlotTime(slot.start, lng)}
              </button>
            ))}
          </div>
        </>
      )}

      {!selectedSlot && <div className="mt-5"><CancellationPolicy /></div>}

      {selectedSlot && (
        <div ref={summaryRef} className="bg-white rounded-xl border border-[#E4E7E4] p-5 mt-2">
          <h3 className="text-sm font-semibold text-[#1F2933] mb-3">{t('slotStep.summary.title')}</h3>

          {lockSecsLeft !== null && (
            <div className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
              lockSecsLeft > 120 ? 'bg-green-50 border-green-200 text-green-700'
              : lockSecsLeft > 30 ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
              </svg>
              {t('slotStep.summary.reserved', {
                time: `${Math.floor(lockSecsLeft / 60)}:${String(lockSecsLeft % 60).padStart(2, '0')}`,
              })}
            </div>
          )}

          <div className="space-y-1 text-sm text-gray-600 mb-4">
            <p><span className="font-medium text-[#1F2933]">{t('slotStep.summary.expertLabel')}</span> {selectedExpert?.user?.name}</p>
            <p><span className="font-medium text-[#1F2933]">{t('slotStep.summary.serviceLabel')}</span> {selectedService?.title}</p>
            <p><span className="font-medium text-[#1F2933]">{t('slotStep.summary.dateLabel')}</span> {new Date(selectedSlot.start).toLocaleDateString(lng === 'it' ? 'it-IT' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p><span className="font-medium text-[#1F2933]">{t('slotStep.summary.timeLabel')}</span> {formatSlotTime(selectedSlot.start, lng)} <span className="text-xs text-gray-400">{t('slotStep.summary.localTime')}</span></p>
            <p><span className="font-medium text-[#1F2933]">{t('slotStep.summary.formatLabel')}</span> {selectedFormat === 'ONLINE' ? t('slotStep.formatOnline') : t('slotStep.formatInPerson')}</p>
            {selectedFormat === 'IN_PERSON' && (() => {
              const d = expertDetail || selectedExpert;
              const loc = [d?.address_street, d?.address_city, d?.address_postcode].filter(Boolean).join(', ');
              return loc ? <p><span className="font-medium text-[#1F2933]">{t('slotStep.summary.locationLabel')}</span> {loc}</p> : null;
            })()}
            <p><span className="font-medium text-[#1F2933]">{t('slotStep.summary.durationLabel')}</span> {formatDuration(selectedService?.duration_minutes, t)}</p>
            <p className="text-base font-semibold text-[#1F2933] mt-2">{formatPrice(selectedService?.price, selectedService?.currency || 'EUR', lng)}</p>
          </div>

          <div className="mb-4"><CancellationPolicy compact /></div>

          <div className="mb-4 p-3 bg-[#F5F7F5] border border-[#E4E7E4] rounded-lg text-xs text-gray-500 leading-relaxed">
            {t('slotStep.summary.currencyNotice', { currency: selectedService?.currency || 'EUR' })}
          </div>

          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
            {t('slotStep.summary.healthDisclaimer')}
          </div>

          {bookErr && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{bookErr}</div>
          )}

          <button onClick={handleBook} disabled={booking}
            className="w-full py-3 px-4 bg-[#445446] hover:bg-[#3a4a3b] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {booking ? t('slotStep.summary.creatingBtn') : t('slotStep.summary.proceedBtn')}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            {t('slotStep.summary.noChargeYet')}
          </p>
        </div>
      )}
    </div>
  );
};

export default BookPage;
