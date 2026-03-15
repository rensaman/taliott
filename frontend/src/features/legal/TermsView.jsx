import '../setup/EventSetupForm.css';
import './LegalView.css';

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL ?? 'privacy@example.com';
const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'taliott';

export default function TermsView() {
  return (
    <div className="legal-shell">
      <header className="legal-header">
        <p className="wizard-wordmark">Taliott</p>
      </header>

      <main className="legal-body">
        <h1>Terms of Service</h1>
        <p><em>Last updated: 14 March 2026</em></p>

        <h2>1. Acceptance of terms</h2>
        <p>
          By creating an event or participating in an event on {APP_NAME}, you agree to these Terms
          of Service. If you do not agree, do not use the service.
        </p>

        <h2>2. Description of service</h2>
        <p>
          {APP_NAME} is a free group scheduling tool that helps groups find a mutually convenient
          time and geographically fair location to meet. It is provided &quot;as is&quot; and without
          warranty of any kind.
        </p>

        <h2>3. Eligibility</h2>
        <p>
          You must be at least 16 years old to use this service. If you are under 16, you must have
          verifiable parental or guardian consent before using {APP_NAME}.
        </p>

        <h2>4. Organiser responsibilities</h2>
        <p>
          If you create an event and provide other people&apos;s email addresses, you represent and
          warrant that:
        </p>
        <ul>
          <li>
            You have informed those individuals that you are sharing their email address with{' '}
            {APP_NAME} for the purpose of scheduling a group event;
          </li>
          <li>
            You have a lawful basis to do so under applicable data protection law (e.g. their
            consent, or a legitimate interest in organising the event with them); and
          </li>
          <li>
            You will not use {APP_NAME} to send unsolicited communications (spam).
          </li>
        </ul>
        <p>
          Where participants provide their personal data (such as location), the organiser
          acknowledges that this data is visible to them and must be handled in accordance with
          applicable law.
        </p>

        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use {APP_NAME} for any unlawful purpose;</li>
          <li>Attempt to gain unauthorised access to other users&apos; data;</li>
          <li>Reverse-engineer, scrape, or abuse the service;</li>
          <li>Use the service to transmit malicious code or conduct denial-of-service attacks.</li>
        </ul>

        <h2>6. Intellectual property</h2>
        <p>
          {APP_NAME} and its underlying software are the property of the service operator. Content
          you submit (event names, availability votes) remains yours; you grant us a limited licence
          to store and process it solely to operate the service.
        </p>

        <h2>7. Disclaimer of warranties</h2>
        <p>
          The service is provided <strong>&quot;as is&quot;</strong> and <strong>&quot;as
          available&quot;</strong>, without any express or implied warranties, including fitness for a
          particular purpose or uninterrupted availability. We do not guarantee that venue suggestions,
          travel-time estimates, or meeting-point calculations are accurate.
        </p>

        <h2>8. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, the operator of {APP_NAME} shall not be liable for
          any indirect, incidental, special, or consequential damages arising out of your use of the
          service, including but not limited to loss of data or failure to deliver emails. Our total
          liability for direct damages shall not exceed €100.
        </p>

        <h2>9. Termination</h2>
        <p>
          We reserve the right to suspend or terminate access to {APP_NAME} for any user or event
          that we reasonably believe violates these terms or applicable law, without notice.
        </p>

        <h2>10. Changes to these terms</h2>
        <p>
          We may update these terms from time to time. We will notify organisers by email of material
          changes at least 14 days before they take effect. Continued use after the effective date
          constitutes acceptance of the updated terms.
        </p>

        <h2>11. Governing law</h2>
        <p>
          These terms are governed by the laws of <strong>[JURISDICTION]</strong>. Any disputes shall
          be subject to the exclusive jurisdiction of the courts of <strong>[JURISDICTION]</strong>.
        </p>

        <h2>12. Contact</h2>
        <p>
          Questions about these terms can be sent to{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </main>

      <footer className="legal-footer">
        <a href="/">← Home</a>
        <a href="/privacy">Privacy Policy</a>
      </footer>
    </div>
  );
}
