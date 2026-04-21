const FORMAT_LABELS = {
  ONLINE:    'Online',
  IN_PERSON: 'In-Person',
  BOTH:      'Online & In-Person',
};

// Maps a raw ServiceFormat / SessionFormat enum value to a display label.
// Returns the value unchanged if unrecognised, and '—' for null/undefined.
export function formatFormat(val) {
  if (!val) return '—';
  return FORMAT_LABELS[val] ?? val;
}

// Format a booking's scheduled_at in the expert's timezone with a UTC reference.
// Falls back to the browser's local timezone if no expertTimezone is supplied.
//
// Returns { primary: "21 Apr 2026, 14:00 GMT+2", utc: "12:00 UTC" }
//
export function formatBookingTime(iso, expertTimezone) {
  if (!iso) return { primary: '—', utc: null };

  const date = new Date(iso);
  const tz   = expertTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const primary = new Intl.DateTimeFormat('en-GB', {
    day:          'numeric',
    month:        'short',
    year:         'numeric',
    hour:         '2-digit',
    minute:       '2-digit',
    timeZone:     tz,
    timeZoneName: 'shortOffset',
  }).format(date);

  const utcTime = new Intl.DateTimeFormat('en-GB', {
    hour:     '2-digit',
    minute:   '2-digit',
    timeZone: 'UTC',
  }).format(date);

  return { primary, utc: `${utcTime} UTC` };
}

// Returns a human-readable transfer/payout status label for a booking object.
// Takes the full booking so it can inspect status, refund_status, is_disputed,
// scheduled_at, and transfer_due_at for context-aware messaging.
export function formatTransferStatus(booking) {
  if (!booking) return '—';

  const ts           = booking.transfer_status;
  const bookingStatus = booking.status;
  const refundStatus  = booking.refund_status;
  const isDisputed    = booking.is_disputed;
  const scheduledAt   = booking.scheduled_at ? new Date(booking.scheduled_at) : null;
  const transferDueAt = booking.transfer_due_at ? new Date(booking.transfer_due_at) : null;
  const now           = new Date();

  if (!ts) return '—';

  if (ts === 'completed') return 'Payout sent';

  if (ts === 'failed') return 'Failed — manual action required';

  if (ts === 'skipped') {
    if (bookingStatus === 'REFUNDED') return 'Skipped — booking refunded';
    if (bookingStatus === 'CANCELLED') return 'Skipped — booking cancelled';
    if (refundStatus && refundStatus !== 'none') return 'Skipped — partial refund issued';
    return 'Skipped';
  }

  if (ts === 'pending') {
    if (isDisputed) return 'On hold — disputed';
    if (scheduledAt && scheduledAt > now) return 'Pending — awaiting session';
    if (transferDueAt && transferDueAt > now) {
      const dueLabel = transferDueAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return `Pending — payout due ${dueLabel}`;
    }
    if (transferDueAt && transferDueAt <= now) return 'Pending — payout overdue';
    return 'Pending transfer';
  }

  return ts;
}
