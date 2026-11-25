// ─── Shared booking display helpers ────────────────────────────────────────
// Used by parent (MyBookingsPage) and expert (dashboard sections / detail
// sheet) booking views. Locale-aware (falls back to en-GB for non-'it').

export function formatDate(isoStr, lng = 'en') {
  return new Date(isoStr).toLocaleDateString(lng === 'it' ? 'it-IT' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });
}

// Common European city names for the IT phrasing — mirrors the backend's
// emailDateTimeFormat.js so the dashboard and the transactional emails name
// the time zone identically.
const CITY_IT = {
  Copenhagen: 'Copenaghen', Rome: 'Roma', Milan: 'Milano', Naples: 'Napoli', Turin: 'Torino',
  Florence: 'Firenze', Venice: 'Venezia', London: 'Londra', Paris: 'Parigi', Berlin: 'Berlino',
  Athens: 'Atene', Lisbon: 'Lisbona', Dublin: 'Dublino', Brussels: 'Bruxelles',
  Stockholm: 'Stoccolma', Warsaw: 'Varsavia', Prague: 'Praga', Zurich: 'Zurigo',
};

// The viewer's own time zone: their saved profile zone, else the browser's.
export function resolveTimeZone(userTimezone) {
  if (userTimezone) {
    try { Intl.DateTimeFormat(undefined, { timeZone: userTimezone }); return userTimezone; } catch { /* invalid → fall through */ }
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

// "08:45 (CET — Copenhagen time)" / "08:45 (CET — ora di Copenaghen)" — same
// phrasing the transactional emails use, in the viewer's own time zone.
export function formatTimeWithZone(isoStr, userTimezone, lng = 'en') {
  const tz   = resolveTimeZone(userTimezone);
  const date = new Date(isoStr);
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
  }).format(date);
  const abbrev = new Intl.DateTimeFormat('en-GB', { timeZoneName: 'short', timeZone: tz })
    .formatToParts(date).find((p) => p.type === 'timeZoneName')?.value || tz;
  let city = tz.includes('/') ? tz.split('/').pop().replace(/_/g, ' ') : tz;
  if (lng === 'it' && CITY_IT[city]) city = CITY_IT[city];
  return lng === 'it'
    ? `${time} (${abbrev} — ora di ${city})`
    : `${time} (${abbrev} — ${city} time)`;
}

// ─── Event vs. session bookings ────────────────────────────────────────────
// Events (service.cluster === 'EVENT') have their own refund policy, wording
// and CTAs. Mirrors cancelBooking() in booking.controller.js — keep in sync.
export const EVENT_FULL_REFUND_HOURS = 7 * 24; // ≥ 168 h → full refund, else none

export function isEventBooking(booking) {
  return booking?.service?.cluster === 'EVENT';
}

export function isFreeBooking(booking) {
  return !Number(booking?.amount);
}

// Percentage the parent would get back if they cancelled right now — same
// tiers (and the same min_refund_percent floor) cancelBooking() applies.
export function refundPercentIfCancelledNow(booking) {
  const hrs = hoursUntil(booking.scheduled_at);
  const tier = isEventBooking(booking)
    ? (hrs >= EVENT_FULL_REFUND_HOURS ? 100 : 0)
    : (hrs >= 24 ? 100 : hrs >= 12 ? 50 : 0);
  return Math.min(tier, booking.min_refund_percent ?? 100);
}

export function formatDuration(minutes) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function hoursUntil(isoStr) {
  return (new Date(isoStr).getTime() - Date.now()) / (1000 * 60 * 60);
}

export function expertInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export function fmtCurrency(n, currency, lng = 'en') {
  if (!n) return null;
  return new Intl.NumberFormat(lng === 'it' ? 'it' : 'en', {
    style: 'currency', currency,
  }).format(Number(n));
}

export const STATUS_STYLES = {
  PENDING_PAYMENT:      'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED:            'bg-green-50 text-green-700 border-green-200',
  CANCELLED:            'bg-red-50 text-red-600 border-red-200',
  REFUNDED:             'bg-gray-100 text-gray-600 border-gray-200',
  REFUNDED_BY_EXPERT:   'bg-green-50 text-green-700 border-green-200',
  COMPLETED:            'bg-blue-50 text-blue-700 border-blue-200',
};

export function statusKey(booking) {
  if (booking.status === 'REFUNDED' && booking.cancellation_reason === 'Cancelled by expert') {
    return 'REFUNDED_BY_EXPERT';
  }
  return booking.status;
}
