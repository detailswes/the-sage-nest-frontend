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
