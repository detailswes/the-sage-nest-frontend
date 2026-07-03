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
// disclaimer rendered at the bottom of the page (legal.termsConditions.placeholderNotice).
const CONTENT = {
  en: () => (
    <>
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
    </>
  ),
  it: () => (
    <>
      <Section title="1. Chi è Sage Nest">
        <p>Sage Nest è una piattaforma di prenotazione, non un fornitore di servizi sanitari. Mettiamo in contatto i genitori con professionisti indipendenti ("esperti") che offrono servizi di benessere e genitorialità. Gli esperti presenti sulla piattaforma sono liberi professionisti, non dipendenti di Sage Nest.</p>
      </Section>

      <Section title="2. Prenotazione e pagamento">
        <p>Completando una prenotazione accetti di pagare la tariffa indicata per la sessione. Il pagamento viene elaborato in modo sicuro da Stripe. Sage Nest trattiene una commissione di piattaforma e il resto viene trasferito all'esperto dopo la sessione.</p>
      </Section>

      <Section title="3. Politica di cancellazione">
        <p>Sappiamo che gli imprevisti capitano e i programmi a volte cambiano. Per rispettare l'impegno preso sia da te che dal tuo esperto — che ha dedicato questo tempo esclusivamente a te — si applica a tutte le prenotazioni la seguente politica di cancellazione:</p>
        <ul className="list-disc pl-5 space-y-1 my-2">
          <li><strong>Più di 24 ore</strong> prima della sessione &rarr; Rimborso totale</li>
          <li><strong>Tra 12 e 24 ore</strong> prima della sessione &rarr; Rimborso del 50%</li>
          <li><strong>Meno di 12 ore</strong> prima della sessione o mancata presentazione &rarr; Nessun rimborso</li>
        </ul>
        <p>Devi cambiare l'orario? Puoi riprogrammare gratuitamente purché lo faccia più di 12 ore prima della sessione — utilizza semplicemente l'opzione Riprogramma nella tua prenotazione.</p>
        <p>Se il tuo esperto annulla per qualsiasi motivo, riceverai sempre un rimborso completo indipendentemente dai tempi.</p>
        <p>Le cancellazioni vengono elaborate in base all'orario in cui la richiesta viene ricevuta da Sage Nest. Per qualsiasi domanda, il nostro team di assistenza è a tua disposizione.</p>
      </Section>

      <Section title="4. Avvertenza sanitaria">
        <p>Sage Nest è una piattaforma di prenotazione, non un fornitore di servizi sanitari. I professionisti presenti sulla piattaforma sono liberi professionisti indipendenti. I consigli forniti durante le sessioni non costituiscono consulenza medica, diagnosi o trattamento e non devono essere considerati un sostituto dell'assistenza medica professionale. Rivolgiti sempre a un operatore sanitario qualificato in caso di dubbi sulla tua salute o su quella di tuo figlio. Se ritieni che tu o tuo figlio necessitiate di cure mediche urgenti, contatta immediatamente i servizi di emergenza.</p>
      </Section>

      <Section title="5. Condotta degli esperti">
        <p>Gli esperti sono responsabili dei contenuti e della qualità delle loro sessioni. Sage Nest non garantisce l'esito di alcuna sessione. Per reclami su un esperto, contattaci all'indirizzo <a href="mailto:support@sagenest.co.uk" className="text-[#445446] underline">support@sagenest.co.uk</a>.</p>
      </Section>

      <Section title="6. Limitazione di responsabilità">
        <p>Nella misura massima consentita dalla legge, la responsabilità di Sage Nest in relazione alla piattaforma è limitata all'importo pagato per la prenotazione che ha dato origine al reclamo.</p>
      </Section>

      <Section title="7. Modifiche ai presenti termini">
        <p>Potremmo aggiornare periodicamente questi Termini e Condizioni. In tal caso, ti informeremo via email e ti chiederemo di accettare la versione aggiornata prima di effettuare una nuova prenotazione.</p>
      </Section>

      <Section title="8. Contatti">
        <p>Per qualsiasi domanda su questi termini, contattaci all'indirizzo <a href="mailto:support@sagenest.co.uk" className="text-[#445446] underline">support@sagenest.co.uk</a>.</p>
      </Section>
    </>
  ),
};

const TermsConditionsPage = () => {
  const { t, i18n } = useTranslation('legal');
  const { data } = useGetLegalVersionsQuery();
  const doc = data?.terms_conditions ?? null;
  const lang = CONTENT[i18n.language] ? i18n.language : 'en';
  const Body = CONTENT[lang];

  return (
  <div className="min-h-screen bg-[#f4eee5] bg-sage-stripes bg-stripe-size bg-repeat-x py-10 px-4">
    <div className="max-w-2xl mx-auto">

      <div className="mb-8 text-center">
        <span className="text-xl font-bold text-[#1F2933]">{t('brand')}</span>
        <h1 className="text-2xl font-semibold text-[#1F2933] mt-4 mb-1">{t('termsConditions.pageTitle')}</h1>
        <p className="text-sm text-gray-400">
          {doc
            ? t('versionLine', { version: doc.version, date: formatDate(doc.effective_from, lang) })
            : t('loading')}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E4E7E4] px-8 py-8">
        <Body />

        <p className="text-xs text-gray-400 border-t border-[#E4E7E4] pt-6 mt-2">
          {t('termsConditions.placeholderNotice')}
        </p>
      </div>
    </div>
  </div>
  );
};

export default TermsConditionsPage;
