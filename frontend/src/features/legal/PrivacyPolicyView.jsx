import LegalFooter from './LegalFooter.jsx';
import LanguageSelector from '../setup/LanguageSelector.jsx';
import '../setup/EventSetupForm.css';
import './LegalView.css';

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL ?? 'privacy@example.com';
const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'taliott';

export default function PrivacyPolicyView() {
  return (
    <div className="legal-shell">
      <header className="legal-header">
        <div className="legal-header-nav">
          <button type="button" className="legal-back-btn" onClick={() => window.history.back()} data-testid="legal-back-btn">← Back</button>
          <a href="/" className="wizard-wordmark">{APP_NAME}</a>
          <LanguageSelector />
        </div>
      </header>

      <main className="legal-body">
        <h1>Privacy Policy</h1>
        <p><em>Last updated: 14 March 2026</em></p>

        <h2>1. Who we are</h2>
        <p>
          {APP_NAME} is a group scheduling service. For the purposes of the EU General Data Protection
          Regulation (GDPR), the data controller is the operator of this service. To contact us about
          privacy matters, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>2. What personal data we collect and why</h2>

        <h3>Event organisers</h3>
        <ul>
          <li>
            <strong>Email address</strong> — to send you a confirmation containing your private admin
            link, to notify you when the voting deadline expires, and to send you the finalised event
            details.
          </li>
        </ul>

        <h3>Participants (email-invite events)</h3>
        <ul>
          <li>
            <strong>Email address</strong> — provided by the event organiser. Used to send you an
            invitation and, once the event is finalised, a calendar invite.
          </li>
        </ul>

        <h3>Participants (shared-link events)</h3>
        <ul>
          <li>
            <strong>Email address</strong> — provided by you when you join. Used to send you a join
            confirmation and the final event details.
          </li>
          <li>
            <strong>Name</strong> (optional) — displayed to the organiser so they know who has
            responded.
          </li>
        </ul>

        <h3>All participants</h3>
        <ul>
          <li>
            <strong>Home location</strong> (optional, latitude/longitude) — provided by you via the
            address search. Used solely to calculate a geographically fair meeting point for the group.
            Your exact coordinates are visible to the event organiser but not to other participants.
          </li>
          <li>
            <strong>Travel mode</strong> (walking / cycling / driving / transit) — used to weight the
            meeting-point calculation.
          </li>
          <li>
            <strong>Availability votes</strong> (yes / maybe / no / neutral per time slot) — used to
            produce the group heatmap visible to the organiser.
          </li>
          <li>
            <strong>Response timestamp</strong> — recorded when you confirm your response, so the
            organiser can see who has replied.
          </li>
        </ul>

        <h2>3. Legal basis for processing</h2>
        <p>
          We process personal data on the following legal bases under GDPR Article 6:
        </p>
        <ul>
          <li>
            <strong>Performance of a contract (Art. 6(1)(b))</strong> — sending invitations,
            confirmations, and notifications is necessary to provide the scheduling service you or the
            event organiser requested.
          </li>
          <li>
            <strong>Legitimate interest (Art. 6(1)(f))</strong> — calculating travel times to suggest
            a fair venue for the group.
          </li>
        </ul>

        <h2>4. Who we share your data with</h2>
        <p>
          We do not sell personal data. We share limited data with the following third-party services
          strictly to operate the application:
        </p>
        <ul>
          <li>
            <strong>OpenStreetMap Nominatim</strong> — address search queries (the text you type, not
            your identity) are forwarded server-side to geocode your address into coordinates.
          </li>
          <li>
            <strong>OpenRouteService</strong> — participant coordinates and travel mode are sent to
            calculate travel durations between home locations and the candidate meeting point.
          </li>
          <li>
            <strong>Overpass API (OpenStreetMap)</strong> — the computed meeting-point coordinates are
            used to search for nearby venues. No personal data is included.
          </li>
          <li>
            <strong>Email / SMTP provider</strong> — email addresses and event details are transmitted
            to our transactional email provider to deliver messages. We hold a Data Processing
            Agreement with this provider as required by GDPR Art. 28.
          </li>
          <li>
            <strong>OpenStreetMap tile servers</strong> — your browser fetches map tiles directly from
            OpenStreetMap servers. OpenStreetMap&apos;s own privacy policy applies to those requests.
          </li>
        </ul>
        <p>
          Transit routing (for the &quot;public transit&quot; travel mode) is handled by a
          self-hosted OpenTripPlanner instance. No data leaves our infrastructure for transit
          calculations. Transit schedule data is provided by{' '}
          <strong>BKK (Budapest Közlekedési Központ)</strong> under their open data licence; this
          data is used locally within our infrastructure and no participant data is shared with BKK.
        </p>

        <h2>5. Data retention</h2>
        <p>
          Events and all associated participant data are deleted automatically 90 days after the
          voting deadline, once the event is locked or finalised. You can also request earlier
          deletion at any time (see Section 6).
        </p>

        <h2>6. Your rights under GDPR</h2>
        <p>If you are in the European Economic Area, you have the following rights:</p>
        <ul>
          <li>
            <strong>Access (Art. 15)</strong> — you can download the data we hold about you by
            visiting your participation page and clicking &quot;Download my data&quot;.
          </li>
          <li>
            <strong>Erasure (Art. 17)</strong> — you can delete your personal data at any time by
            clicking &quot;Delete my data&quot; on your participation page. Event organisers can
            delete an entire event (and all associated data) from their admin page.
          </li>
          <li>
            <strong>Rectification (Art. 16)</strong> — you can update your name and location on your
            participation page while the event is open.
          </li>
          <li>
            <strong>Portability (Art. 20)</strong> — your data export (see Access above) is provided
            in machine-readable JSON format.
          </li>
          <li>
            <strong>Objection / restriction (Arts. 21–22)</strong> — contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will respond within 30
            days.
          </li>
          <li>
            <strong>Lodge a complaint</strong> — you have the right to lodge a complaint with your
            national data protection supervisory authority (e.g. the NAIH in Hungary, the CNIL in
            France, the ICO in the UK, or the Datenschutzbehörde in Austria).
          </li>
        </ul>

        <h2>7. Cookies, local storage, and analytics</h2>
        <p>
          We do not use cookies or tracking technologies. We store one key in your browser&apos;s
          local storage — <code>taliott_feedback_sent</code> — after you submit or dismiss the
          one-time feedback form, solely to prevent it from reappearing. This key contains no
          personal data and is never transmitted to our server. No consent is required under the
          ePrivacy Directive as this is strictly necessary for the form&apos;s functionality.
        </p>
        <p>
          We use a self-hosted instance of <strong>Umami</strong>, a cookieless open-source
          analytics tool, to measure aggregate page traffic. Umami records page URL, referrer, and
          anonymised browser and OS metadata. IP addresses are anonymised before storage and are not
          retained. Umami runs on our own infrastructure; no analytics data is transmitted to any
          third party. We do not use advertising networks or tracking pixels.
        </p>

        <h2>8. Children</h2>
        <p>
          This service is not directed at children under 16. By using {APP_NAME}, you confirm that
          you are at least 16 years old, or that you have obtained verifiable parental consent in
          accordance with GDPR Article 8.
        </p>

        <h2>9. Changes to this policy</h2>
        <p>
          We will notify participants by email of any material changes to this policy before they
          take effect.
        </p>

        <h2>10. Contact</h2>
        <p>
          For any privacy-related questions or requests, contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </main>

      <LegalFooter />
    </div>
  );
}
