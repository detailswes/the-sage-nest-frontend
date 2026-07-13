import { useTranslation } from 'react-i18next';
import { useGetLegalVersionsQuery } from '../../api/userApi';

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-lg font-semibold text-[#1F2933] mb-3">{title}</h2>
    <div className="text-sm text-gray-600 leading-relaxed space-y-3">{children}</div>
  </div>
);

const DATE_LOCALE = { en: 'en-GB', it: 'it-IT' };

const formatDate = (iso, language) =>
  new Date(iso).toLocaleDateString(DATE_LOCALE[language] ?? 'en-GB', { month: 'long', year: 'numeric' });

// English content is the final, client-approved Privacy Policy (last updated 9 July 2026).
// Italian content below is still placeholder text — see the disclaimer rendered at the
// bottom of the page (legal.privacyPolicy.placeholderNotice), shown only for PLACEHOLDER_LANGS.
const CONTENT = {
  en: () => (
    <>
      <Section title="1. Data Controller and Contact Details">
        <p>The Data Controller for the processing of personal data collected through the Sage Nest platform, website and mobile application (collectively, the "Platform") is: Sage Nest ApS, CVR no. 46566181, Mantuavej 6, 2300 Copenhagen, Denmark. Contact email: <a href="mailto:hello@sagenest.org" className="text-[#445446] underline">hello@sagenest.org</a>.</p>
        <p>The Company has appointed a Data Protection Officer (DPO), who can be contacted at <a href="mailto:privacy@sagenest.org" className="text-[#445446] underline">privacy@sagenest.org</a>.</p>
        <p>For any request relating to your personal data, you may contact us at the above email address.</p>
        <p>The following role allocation applies to your use of the Platform:</p>
        <ul className="list-disc pl-5 space-y-1 my-2">
          <li>Sage Nest acts as independent Data Controller for all personal data processed to manage your account, your use of the Platform, booking administration, payment facilitation, platform security, reviews, and compliance with our legal obligations.</li>
          <li>The Expert acts as an independent Data Controller for all personal data you share with them directly, or that we transmit to them for the purpose of providing the Session and the Services. The Expert is required to provide you with their own privacy notice. Sage Nest has no control over, and is not responsible for, the Expert's processing of your personal data.</li>
          <li>Stripe acts as an independent Data Controller for payment card data and payment instrument data processed through its platform. Please consult Stripe's privacy policy at stripe.com/privacy. Sage Nest retains and processes transaction metadata (booking reference, session date, Expert Fee amount, payment status, refund status) as Data Controller for the purposes set out in Section 3.</li>
        </ul>
      </Section>

      <Section title="2. Types of Data Processed, Purposes and Legal Basis">
        <p>The Controller processes the following categories of personal data through the Site:</p>
        <ul className="list-disc pl-5 space-y-3 my-2">
          <li><strong>Registration and contact data:</strong> name, surname, email address, telephone number, account credentials. Account creation and management, provision of Platform services (booking, search for Experts, communication via the Platform). Legal basis: performance of a contract to which you are a party, or pre-contractual measures at your request (Article 6(1)(b) GDPR).</li>
          <li><strong>Booking data and Transaction Metadata:</strong> type of Expert requested, session date and time, booking reference, Expert Fee amount, payment status, refund or chargeback status, confirmation logs. Provision of Platform services (booking management, session confirmation, facilitation of payments on behalf of the Expert). Legal basis: performance of a contract (Article 6(1)(b) GDPR). Legal and accounting compliance (see below). Enforcement (see below).</li>
          <li><strong>Consumer Rights Documentation:</strong> booking reference, session date, timestamp and content of the dual-consent checkbox (express request to perform the Session within the withdrawal period and acknowledgement of loss of the right of withdrawal), confirmation logs, withdrawal request data if submitted. Purpose: management of the statutory right of withdrawal, documentation of express consent to early performance, processing of refunds, compliance with consumer protection obligations, and maintenance of proof in accordance with our accountability obligations. Legal basis: compliance with a legal obligation (Article 6(1)(c) GDPR) and performance of a contract (Article 6(1)(b) GDPR).</li>
          <li><strong>Legal, accounting and tax data (practitioners only):</strong> full legal name, address, date of birth, tax identification number (CPR or CVR), earnings and transaction data. Purpose: compliance with EU Directive 2021/514 (DAC7) and mandatory annual reporting to Skattestyrelsen (the Danish Tax Agency). Legal basis: compliance with a legal obligation (Article 6(1)(c) GDPR).</li>
          <li><strong>Reviews and User-Generated Content:</strong> review text, star rating, reviewer account identifier, booking reference (used for verification), date and time of submission. Purpose: publication of verified reviews on the Platform, verification that reviews originate from Parents who have completed a Session with the reviewed Expert, prevention of false or fraudulent reviews, maintenance of Platform integrity. Legal basis: legitimate interest of Sage Nest in maintaining a trustworthy and transparent marketplace (Article 6(1)(f) GDPR). Our legitimate interest has been balanced against your rights and freedoms; only the minimum data necessary for verification is used. You may object to this processing at any time (see Section 9).</li>
          <li><strong>Special categories of data:</strong> The Site does not actively collect or process special categories of personal data (including health data). However, you may share such information directly with the specialist during a booked session. It is recommended to consider carefully the appropriateness of entering health-related information in any free-text fields on the Site. Information exchanged with the specialist is subject to their own privacy notices, which are outside the control of the Site's Controller. We strongly recommend that you do not enter health-related or sensitive information in any free-text fields on the Platform (e.g. booking notes, messaging functions). If you do so voluntarily, Sage Nest will treat that information with the utmost care, but you do so at your own risk and outside the Platform's intended design. Should Sage Nest inadvertently receive special categories of data through such fields, it will be processed exclusively to the extent necessary to provide the service requested, on the basis of Article 9(2)(a) GDPR (explicit consent by the voluntary submission) or Article 9(2)(f) GDPR (establishment, exercise or defence of legal claims where applicable).</li>
          <li><strong>Marketing Communications:</strong> email address. Purpose: sending newsletters, tips, expert advice and updates about Sage Nest services. Legal basis: your specific, freely given, informed and unambiguous consent (Article 6(1)(a) GDPR), collected via a clearly separate, non-pre-ticked checkbox at registration. Retention: until you withdraw your consent or unsubscribe. You may withdraw your consent at any time, without affecting the lawfulness of any processing carried out before withdrawal, by clicking the unsubscribe link in any marketing email or by contacting us at <a href="mailto:hello@sagenest.org" className="text-[#445446] underline">hello@sagenest.org</a>.</li>
          <li><strong>Payment data:</strong> The Site does not collect or store payment card data. Payment processing is handled by Stripe, who acts as an independent data controller. Please consult Stripe's privacy policy for further information.</li>
          <li><strong>Navigation data and cookies:</strong> IP address, browser type, pages visited, session duration, technical identifiers. Purpose: technical operation of the Platform, security, anonymous statistical analysis. Legal basis: legitimate interest (Article 6(1)(f) GDPR) for strictly necessary cookies; your consent for non-essential cookies. For full details, please consult our Cookie Policy.</li>
          <li><strong>Platform Security, Fraud Prevention, Enforcement and Complaints:</strong> navigation data, IP address, usage logs, account activity, booking history, payment metadata, communication records relating to disputes or complaints. Purpose: detecting, preventing and responding to fraud, unjustified chargebacks, payment abuse, and attempts to compromise Platform security; enforcing our Terms and Conditions, including account suspension and termination where a serious breach occurs; managing complaints and disputes, and defending or exercising legal claims. Legal basis: legitimate interest of Sage Nest (Article 6(1)(f) GDPR) in protecting the security and integrity of the Platform, protecting the Experts and users, and in the exercise or defence of legal claims. Where account suspension or termination is involved, processing is also necessary for the performance of the contract (Article 6(1)(b) GDPR).</li>
        </ul>
      </Section>

      <Section title="3. Automated Decision Making (ADM)">
        <p>Sage Nest does not make decisions with significant legal or similarly significant effects on you based solely on automated processing. Any account suspension or termination involves human review, in accordance with the procedure described in clause 4.3 of the Consumer Terms.</p>
      </Section>

      <Section title="4. Nature of Data Provision">
        <p>Providing personal data for account, booking, legal compliance, security and enforcement purposes is necessary to use the Platform. Refusal will make it impossible to create an account, make bookings or access the Platform's core features.</p>
        <p>Providing data for marketing is entirely optional and does not affect your ability to use any feature of the Platform.</p>
        <p>Marketing consent is collected via a clearly separate, unticked checkbox at registration. You may withdraw your consent at any time by clicking the unsubscribe link in any marketing email, or by contacting us at <a href="mailto:hello@sagenest.org" className="text-[#445446] underline">hello@sagenest.org</a>. Withdrawal of consent does not affect the lawfulness of any processing carried out prior to withdrawal.</p>
      </Section>

      <Section title="5. Data Retention Period">
        <p>Personal data is stored for a period not exceeding the achievement of the purposes for which it is processed, in compliance with the principle of storage limitation. Specifically:</p>
        <div className="overflow-x-auto -mx-2 px-2 my-2">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E4E7E4] text-left">
                <th className="py-2 pr-4 font-semibold text-[#1F2933]">Data Category</th>
                <th className="py-2 font-semibold text-[#1F2933]">Retention Period</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#E4E7E4]"><td className="py-2 pr-4 align-top">Account and registration data</td><td className="py-2 align-top">Duration of the contractual relationship + 5 years (Bogføringsloven)</td></tr>
              <tr className="border-b border-[#E4E7E4]"><td className="py-2 pr-4 align-top">Booking records (identifiers)</td><td className="py-2 align-top">3 years from the last booking or account closure, whichever is later</td></tr>
              <tr className="border-b border-[#E4E7E4]"><td className="py-2 pr-4 align-top">Transaction metadata (amounts, dates, references)</td><td className="py-2 align-top">7 years (accounting obligations)</td></tr>
              <tr className="border-b border-[#E4E7E4]"><td className="py-2 pr-4 align-top">Withdrawal documentation and consent logs</td><td className="py-2 align-top">7 years from the relevant transaction</td></tr>
              <tr className="border-b border-[#E4E7E4]"><td className="py-2 pr-4 align-top">Practitioner tax data (DAC7)</td><td className="py-2 align-top">7 years from the last transaction</td></tr>
              <tr className="border-b border-[#E4E7E4]"><td className="py-2 pr-4 align-top">Reviews</td><td className="py-2 align-top">Duration of Expert listing + 3 years</td></tr>
              <tr className="border-b border-[#E4E7E4]"><td className="py-2 pr-4 align-top">Marketing data</td><td className="py-2 align-top">Until withdrawal of consent or unsubscribe</td></tr>
              <tr className="border-b border-[#E4E7E4]"><td className="py-2 pr-4 align-top">Security / fraud / enforcement / complaints logs</td><td className="py-2 align-top">5 years from contract termination, or until resolution of any pending claim</td></tr>
              <tr><td className="py-2 pr-4 align-top">Cookie and navigation data</td><td className="py-2 align-top">See Cookie Policy</td></tr>
            </tbody>
          </table>
        </div>
        <p>Where data is retained after the service relationship has ended, it is retained exclusively for the purpose of compliance with legal obligations, the exercise or defence of legal claims, or the resolution of pending disputes, and access is restricted accordingly.</p>
      </Section>

      <Section title="6. Data Recipients">
        <p>Your personal data may be shared with the following categories of recipients:</p>
        <ul className="list-disc pl-5 space-y-1 my-2">
          <li>Experts with whom you have booked a Session, to the extent strictly necessary for the provision of the requested Session. The Expert receives your name, contact details and booking information. The Expert is an independent Data Controller for this data.</li>
          <li>Stripe: for payment processing. Stripe acts as an independent Data Controller for payment card data. Sage Nest shares booking reference, amount and transaction status with Stripe as necessary to process your payment and manage refunds and chargebacks.</li>
          <li>Third-party service providers acting as Data Processors on our behalf under a Data Processing Agreement (DPA) compliant with Article 28 GDPR.</li>
          <li>Skattestyrelsen (Danish Tax Agency): for mandatory DAC7 annual reporting of practitioner earnings.</li>
          <li>Public authorities, courts and regulators: to the extent required by law, court order, or to exercise or defend legal claims.</li>
          <li>Acquirers or successors in the context of corporate transactions: in the event of a merger, acquisition, or business transfer, in accordance with clause 14.4 of the Consumer Terms and with prior notice to you as required.</li>
        </ul>
        <p>We do not sell your personal data to third parties, and we do not share it for purposes other than those described in this Policy.</p>
      </Section>

      <Section title="7. International Data Transfers">
        <p>Your personal data is stored on servers located within the European Union. However, some of our service providers (e.g., Stripe, cloud service providers) may be based or have servers outside the European Economic Area, particularly in the United States. Any transfer of data to such countries is carried out in compliance with applicable law, with appropriate safeguards in place, such as an adequacy decision by the European Commission or through Standard Contractual Clauses (SCCs) approved by the European Commission. You may request further information about the specific transfer safeguards applicable to each provider by contacting us at <a href="mailto:hello@sagenest.org" className="text-[#445446] underline">hello@sagenest.org</a>. Where SCCs are used, a copy of the relevant clauses (or a link to them) will be provided upon request.</p>
      </Section>

      <Section title="8. Rights of the Data Subject">
        <p>As a data subject, you have the right to exercise at any time the rights provided by the GDPR, including:</p>
        <ul className="list-disc pl-5 space-y-1 my-2">
          <li><strong>Right of access (Article 15):</strong> Obtain confirmation as to whether personal data concerning you is being processed, and access to that data.</li>
          <li><strong>Right to rectification (Article 16):</strong> Obtain the correction of inaccurate personal data without undue delay.</li>
          <li><strong>Right to erasure (Article 17):</strong> Obtain the erasure of your personal data in the cases provided for by law. Please note that certain data may be retained to comply with legal obligations (e.g., accounting records).</li>
          <li><strong>Right to restriction of processing (Article 18):</strong> Obtain the restriction of processing where certain conditions apply.</li>
          <li><strong>Right to data portability (Article 20):</strong> Receive your personal data in a structured, commonly used, and machine-readable format, and transmit it to another controller where applicable.</li>
          <li><strong>Right to object (Article 21):</strong> Object at any time to the processing of data based on legitimate interest, and to object to processing for direct marketing purposes.</li>
          <li><strong>Right to withdraw consent (Article 7(3)):</strong> Withdraw consent at any time, without affecting the lawfulness of processing based on consent before its withdrawal.</li>
          <li><strong>Right to lodge a complaint:</strong> You have the right to lodge a complaint with a supervisory authority. As the Controller is established in Denmark, the competent authority is Datatilsynet (the Danish Data Protection Authority — www.datatilsynet.dk). You may also lodge a complaint with the supervisory authority of your country of habitual residence.</li>
        </ul>
        <p>You can exercise your rights by sending a communication to: <a href="mailto:hello@sagenest.org" className="text-[#445446] underline">hello@sagenest.org</a>. We will respond without undue delay and at the latest within one month of receiving your request.</p>
        <p>We will respond to your request without undue delay and in any event within one month of receipt. This period may be extended by a further two months where necessary, given the complexity or number of requests, with prior notice to you.</p>
      </Section>

      <Section title="9. Security Measures">
        <p>Sage Nest implements appropriate technical and organisational measures to ensure a level of security appropriate to the risk, taking into account the state of the art, the costs of implementation, and the nature, scope, context and purposes of the processing, as well as the risk for your rights and freedoms.</p>
        <p>These measures include, without limitation:</p>
        <ul className="list-disc pl-5 space-y-1 my-2">
          <li>encryption of data;</li>
          <li>access controls and role-based authorisation, ensuring that only authorised personnel access personal data on a need-to-know basis;</li>
          <li>password storage using industry-standard hashing algorithms;</li>
          <li>logging of access to personal data systems;</li>
          <li>regular review and testing of security measures;</li>
          <li>data breach detection and response procedures, including notification to Datatilsynet within 72 hours where required under Article 33 GDPR.</li>
        </ul>
        <p>Payment card data is never stored on Sage Nest's servers and is processed exclusively by Stripe.</p>
        <p>All third-party processors are subject to contractual requirements to implement equivalent security measures in accordance with Article 28(3)(c) GDPR.</p>
        <p>All third parties that process personal data on behalf of Sage Nest as data processors are bound by a Data Processing Agreement (DPA) that complies with the requirements of Article 28 GDPR covering in particular: the subject matter and duration of processing; the nature and purpose of processing; the type of personal data and categories of data subjects; the obligations and rights of Sage Nest as Data Controller; and restrictions on sub-processing. Sage Nest maintains a record of its data processors and will provide information about specific processors upon request to <a href="mailto:hello@sagenest.org" className="text-[#445446] underline">hello@sagenest.org</a>.</p>
      </Section>

      <Section title="10. Changes to the Privacy Policy">
        <p>The Controller reserves the right to update this policy at any time. Any changes will be published on this page with an updated effective date. If the changes are material, we will inform you by email. Continued use of the Site after such notification constitutes acceptance of the updated policy. If you do not agree with the updated policy, you may close your account by contacting us at <a href="mailto:hello@sagenest.org" className="text-[#445446] underline">hello@sagenest.org</a>. Closure does not affect data retained in compliance with our legal obligations.</p>
      </Section>
    </>
  ),
  it: () => (
    <>
      <Section title="1. Chi siamo">
        <p>Sage Nest è una piattaforma di prenotazione che mette in contatto i genitori con professionisti indipendenti del benessere e della genitorialità ("esperti"). I riferimenti a "noi" o "nostro" in questa informativa riguardano Sage Nest.</p>
      </Section>

      <Section title="2. Quali dati raccogliamo">
        <p>Quando crei un account raccogliamo il tuo nome, indirizzo email e numero di telefono. Raccogliamo inoltre informazioni sulle tue prenotazioni, inclusi i servizi prenotati e le date e gli orari delle sessioni. Non raccogliamo informazioni sanitarie, anamnesi mediche o dati personali relativi ai tuoi figli.</p>
      </Section>

      <Section title="3. Perché li raccogliamo">
        <p>Utilizziamo i tuoi dati personali per creare e gestire il tuo account, elaborare prenotazioni e pagamenti, inviarti conferme e promemoria delle prenotazioni e fornire assistenza clienti. Invieremo email di marketing solo se hai espressamente acconsentito.</p>
      </Section>

      <Section title="4. Base giuridica del trattamento">
        <p>Trattiamo i tuoi dati sulla base dell'esecuzione del contratto (per fornire il servizio di prenotazione richiesto) e, se applicabile, sulla base del tuo consenso (per le comunicazioni di marketing).</p>
      </Section>

      <Section title="5. Condivisione dei dati">
        <p>Condividiamo il tuo nome e i dettagli della prenotazione con l'esperto prenotato affinché possa fornire la sessione. Utilizziamo Stripe per elaborare i pagamenti — Stripe gestisce tutti i dati della carta di pagamento e non memorizziamo mai i dettagli della tua carta. Utilizziamo SendGrid per inviare email per nostro conto.</p>
      </Section>

      <Section title="6. Conservazione dei dati">
        <p>Conserviamo i tuoi dati personali per tutto il tempo in cui il tuo account rimane attivo. Se elimini il tuo account, i tuoi dati personali (nome, email, telefono, password) vengono cancellati immediatamente. I dati di prenotazione anonimizzati possono essere conservati a fini contabili come consentito dalla legge applicabile.</p>
      </Section>

      <Section title="7. I tuoi diritti">
        <p>Ai sensi del GDPR hai il diritto di accedere, correggere o eliminare i tuoi dati personali. Puoi inoltre revocare il consenso al marketing in qualsiasi momento. Per esercitare questi diritti, contattaci all'indirizzo <a href="mailto:privacy@sagenest.co.uk" className="text-[#445446] underline">privacy@sagenest.co.uk</a>.</p>
      </Section>

      <Section title="8. Cookie">
        <p>Utilizziamo un cookie sicuro HTTP-only per mantenere attivo il tuo accesso. Questo cookie non ti traccia su altri siti web e viene eliminato al momento del logout.</p>
      </Section>

      <Section title="9. Contatti">
        <p>Per domande su questa informativa o su come trattiamo i tuoi dati, contattaci all'indirizzo <a href="mailto:privacy@sagenest.co.uk" className="text-[#445446] underline">privacy@sagenest.co.uk</a>.</p>
      </Section>
    </>
  ),
};

// Languages whose body content above is still placeholder text, pending translation
// of the final English policy. Remove a language here once its real text is added.
const PLACEHOLDER_LANGS = ['it'];

const PrivacyPolicyPage = () => {
  const { t, i18n } = useTranslation('legal');
  const { data } = useGetLegalVersionsQuery();
  const doc = data?.privacy_policy ?? null;
  const lang = CONTENT[i18n.language] ? i18n.language : 'en';
  const Body = CONTENT[lang];

  return (
  <div className="min-h-screen bg-[#f4eee5] bg-sage-stripes bg-stripe-size bg-repeat-x py-10 px-4">
    <div className="max-w-2xl mx-auto">

      <div className="mb-8 text-center">
        <span className="text-xl font-bold text-[#1F2933]">{t('brand')}</span>
        <h1 className="text-2xl font-semibold text-[#1F2933] mt-4 mb-1">{t('privacyPolicy.pageTitle')}</h1>
        <p className="text-sm text-gray-400">
          {doc
            ? t('versionLine', { version: doc.version, date: formatDate(doc.effective_from, lang) })
            : t('loading')}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E4E7E4] px-8 py-8">
        <Body />

        {PLACEHOLDER_LANGS.includes(lang) && (
          <p className="text-xs text-gray-400 border-t border-[#E4E7E4] pt-6 mt-2">
            {t('privacyPolicy.placeholderNotice')}
          </p>
        )}
      </div>
    </div>
  </div>
  );
};

export default PrivacyPolicyPage;
