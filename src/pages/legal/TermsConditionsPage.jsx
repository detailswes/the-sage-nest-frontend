import { useState, useEffect } from 'react';
import { getLegalVersionsApi } from '../../api/authApi';

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-lg font-semibold text-[#1F2933] mb-3">{title}</h2>
    <div className="text-sm text-gray-600 leading-relaxed space-y-3">{children}</div>
  </div>
);

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

const TermsConditionsPage = () => {
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    getLegalVersionsApi()
      .then((data) => setDoc(data.terms_conditions))
      .catch(() => {});
  }, []);

  return (
  <div className="min-h-screen bg-[#F5F7F5] py-10 px-4">
    <div className="max-w-2xl mx-auto">

      <div className="mb-8 text-center">
        <span className="text-xl font-bold text-[#1F2933]">Sage Nest</span>
        <h1 className="text-2xl font-semibold text-[#1F2933] mt-4 mb-1">Terms &amp; Conditions</h1>
        <p className="text-sm text-gray-400">
          {doc
            ? `Version ${doc.version} · Last updated ${formatDate(doc.effective_from)}`
            : 'Loading…'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E4E7E4] px-8 py-8">

        <Section title="1. About Sage Nest">
          <p>Sage Nest is a booking platform, not a healthcare provider. We connect parents with independent professionals ("experts") who offer wellness and parenting services. Experts listed on this platform are independent contractors, not employees of Sage Nest.</p>
        </Section>

        <Section title="2. Booking and payment">
          <p>By completing a booking you agree to pay the stated session fee. Payment is processed securely by Stripe. Sage Nest retains a platform fee and the remainder is transferred to the expert after the session.</p>
        </Section>

        <Section title="3. Cancellation policy">
          <p>We understand that life happens and plans sometimes change. To honour the commitment made by both you and your expert — who has dedicated this time exclusively for you — the following cancellation policy applies to all bookings:</p>
          <ul className="list-disc pl-5 space-y-1 my-2">
            <li><strong>More than 24 hours</strong> before your session &rarr; Full refund</li>
            <li><strong>Between 12 and 24 hours</strong> before your session &rarr; 50% refund</li>
            <li><strong>Less than 12 hours</strong> before your session or no-show &rarr; No refund</li>
          </ul>
          <p>Need to change your time? You can reschedule for free as long as you do so more than 12 hours before your session — simply use the Reschedule option in your booking.</p>
          <p>If your expert cancels for any reason, you will always receive a full refund regardless of timing.</p>
          <p>Cancellations are processed based on the time your request is received by Sage Nest. If you have any questions, our support team is here to help.</p>
        </Section>

        <Section title="4. Health disclaimer">
          <p>Sage Nest is a booking platform, not a healthcare provider. Practitioners listed on this platform are independent professionals. Advice given during sessions does not constitute medical advice, diagnosis, or treatment and should not be relied upon as a substitute for professional medical care. Always seek the advice of a qualified healthcare provider if you have concerns about your or your child's health. If you believe you or your child need urgent medical care, contact emergency services immediately.</p>
        </Section>

        <Section title="5. Expert conduct">
          <p>Experts are responsible for the content and quality of their sessions. Sage Nest does not guarantee the outcome of any session. If you have a complaint about an expert, please contact us at <a href="mailto:support@sagenest.co.uk" className="text-[#445446] underline">support@sagenest.co.uk</a>.</p>
        </Section>

        <Section title="6. Limitation of liability">
          <p>To the fullest extent permitted by law, Sage Nest's liability in connection with the platform is limited to the amount you paid for the booking giving rise to the claim.</p>
        </Section>

        <Section title="7. Changes to these terms">
          <p>We may update these Terms & Conditions from time to time. When we do, we will notify you by email and ask you to accept the updated version before making a new booking.</p>
        </Section>

        <Section title="8. Contact">
          <p>For any questions about these terms, please contact us at <a href="mailto:support@sagenest.co.uk" className="text-[#445446] underline">support@sagenest.co.uk</a>.</p>
        </Section>

        <p className="text-xs text-gray-400 border-t border-[#E4E7E4] pt-6 mt-2">
          This is a placeholder Terms &amp; Conditions document. The final version will be reviewed and approved by the client's legal team before launch.
        </p>
      </div>
    </div>
  </div>
  );
};

export default TermsConditionsPage;
