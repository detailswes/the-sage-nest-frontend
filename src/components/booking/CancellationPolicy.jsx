/**
 * CancellationPolicy
 *
 * Displays the approved three-tier cancellation policy copy.
 * Used on CheckoutPage and the booking slot step.
 *
 * Props:
 *   compact — boolean. When true shows a shorter single-row summary
 *             instead of the full policy block.
 */
const CancellationPolicy = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 leading-relaxed">
        <span className="font-semibold">Cancellation policy: </span>
        &gt;24 h before → full refund · 12–24 h before → 50% refund · &lt;12 h or no-show → no refund
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900 text-sm leading-relaxed space-y-3">

      <p>
        We understand that life happens and plans sometimes change. To honour the
        commitment made by both you and your expert — who has dedicated this time
        exclusively for you — the following cancellation policy applies to all bookings:
      </p>

      <ul className="space-y-1.5 pl-2">
        <li className="flex items-start gap-2">
          <span className="shrink-0 mt-px">•</span>
          <span>
            <span className="font-semibold">More than 24 hours</span> before your session
            &rarr; Full refund
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="shrink-0 mt-px">•</span>
          <span>
            <span className="font-semibold">Between 12 and 24 hours</span> before your
            session &rarr; 50% refund
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="shrink-0 mt-px">•</span>
          <span>
            <span className="font-semibold">Less than 12 hours</span> before your session
            or no-show &rarr; No refund
          </span>
        </li>
      </ul>

      <p>
        Need to change your time? You can reschedule for free as long as you do so more
        than 12 hours before your session — simply use the Reschedule option in your
        booking.
      </p>

      <p>
        If your expert cancels for any reason, you will always receive a{' '}
        <span className="font-semibold">full refund</span> regardless of timing.
      </p>

      <p className="text-xs text-amber-700">
        Cancellations are processed based on the time your request is received by Sage
        Nest. If you have any questions, our support team is here to help.
      </p>

    </div>
  );
};

export default CancellationPolicy;
