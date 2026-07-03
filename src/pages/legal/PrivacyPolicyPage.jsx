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

// Placeholder body content per language. Not final legal text — see the
// disclaimer rendered at the bottom of the page (legal.privacyPolicy.placeholderNotice).
const CONTENT = {
  en: () => (
    <>
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

        <p className="text-xs text-gray-400 border-t border-[#E4E7E4] pt-6 mt-2">
          {t('privacyPolicy.placeholderNotice')}
        </p>
      </div>
    </div>
  </div>
  );
};

export default PrivacyPolicyPage;
