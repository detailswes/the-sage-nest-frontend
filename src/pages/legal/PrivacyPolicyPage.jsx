const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-lg font-semibold text-[#1F2933] mb-3">{title}</h2>
    <div className="text-sm text-gray-600 leading-relaxed space-y-3">{children}</div>
  </div>
);

const PrivacyPolicyPage = () => (
  <div className="min-h-screen bg-[#F5F7F5] py-10 px-4">
    <div className="max-w-2xl mx-auto">

      <div className="mb-8 text-center">
        <span className="text-xl font-bold text-[#1F2933]">Sage Nest</span>
        <h1 className="text-2xl font-semibold text-[#1F2933] mt-4 mb-1">Privacy Policy</h1>
        <p className="text-sm text-gray-400">Version 1.0 · Last updated March 2026</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E4E7E4] px-8 py-8">

        <Section title="1. Who we are">
          <p>Sage Nest is a booking platform that connects parents with independent wellness and parenting professionals ("experts"). References to "we", "us", or "our" in this policy refer to Sage Nest.</p>
        </Section>

        <Section title="2. What data we collect">
          <p>When you create an account we collect your name, email address, and phone number. We also collect information about your bookings, including the services you book and the dates and times of your sessions. We do not collect health information, medical history, or personal data about your children.</p>
        </Section>

        <Section title="3. Why we collect it">
          <p>We use your personal data to create and manage your account, to process bookings and payments, to send you booking confirmations and reminders, and to provide customer support. We will only send marketing emails if you have explicitly opted in.</p>
        </Section>

        <Section title="4. Legal basis for processing">
          <p>We process your data on the basis of contract performance (to provide the booking service you requested) and, where applicable, on the basis of your consent (for marketing communications).</p>
        </Section>

        <Section title="5. Data sharing">
          <p>We share your name and booking details with the expert you book so they can provide the session. We use Stripe to process payments — Stripe handles all payment card data and we never store your card details. We use SendGrid to send emails on our behalf.</p>
        </Section>

        <Section title="6. Data retention">
          <p>We retain your personal data for as long as your account is active. If you delete your account, your personal data (name, email, phone, password) is wiped immediately. Anonymised booking records may be retained for accounting purposes as permitted under applicable law.</p>
        </Section>

        <Section title="7. Your rights">
          <p>Under GDPR you have the right to access, correct, or delete your personal data. You may also withdraw consent for marketing at any time. To exercise these rights, please contact us at <a href="mailto:privacy@sagenest.co.uk" className="text-[#445446] underline">privacy@sagenest.co.uk</a>.</p>
        </Section>

        <Section title="8. Cookies">
          <p>We use a secure HTTP-only cookie to keep you logged in. This cookie does not track you across other websites and is deleted when you log out.</p>
        </Section>

        <Section title="9. Contact">
          <p>If you have questions about this policy or how we handle your data, please contact us at <a href="mailto:privacy@sagenest.co.uk" className="text-[#445446] underline">privacy@sagenest.co.uk</a>.</p>
        </Section>

        <p className="text-xs text-gray-400 border-t border-[#E4E7E4] pt-6 mt-2">
          This is a placeholder Privacy Policy. The final version will be reviewed and approved by the client's legal team before launch.
        </p>
      </div>
    </div>
  </div>
);

export default PrivacyPolicyPage;
