import LegalFooter from './LegalFooter.jsx';
import '../setup/EventSetupForm.css';
import './LegalView.css';

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL ?? 'privacy@example.com';
const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'taliott';

export default function TermsViewHu() {
  return (
    <div className="legal-shell">
      <header className="legal-header">
        <p className="wizard-wordmark">taliott</p>
      </header>

      <main className="legal-body">
        <h1>Általános szerződési feltételek</h1>
        <p><em>Utolsó frissítés: 2026. március 14.</em></p>

        <h2>1. Feltételek elfogadása</h2>
        <p>
          Azzal, hogy eseményt hozol létre vagy részt veszel egy eseményen a {APP_NAME}
          szolgáltatásban, elfogadod ezeket az Általános szerződési feltételeket. Ha nem értesz
          egyet, ne használd a szolgáltatást.
        </p>

        <h2>2. A szolgáltatás leírása</h2>
        <p>
          A {APP_NAME} egy ingyenes csoportos időpont-egyeztető eszköz, amely segít csoportoknak
          kölcsönösen megfelelő időpontot és földrajzilag igazságos találkozóhelyet találni.
          A szolgáltatás &quot;jelenlegi állapotában&quot; és mindenféle garancia nélkül kerül
          biztosításra.
        </p>

        <h2>3. Jogosultság</h2>
        <p>
          A szolgáltatás használatához legalább 16 évesnek kell lenned. Ha 16 évesnél fiatalabb
          vagy, a {APP_NAME} használata előtt igazolható szülői vagy gondviselői beleegyezéssel
          kell rendelkezned.
        </p>

        <h2>4. Szervező felelőssége</h2>
        <p>
          Ha eseményt hozol létre és más személyek e-mail-címét adod meg, kijelented és
          szavatolod, hogy:
        </p>
        <ul>
          <li>
            Tájékoztattad az érintett személyeket arról, hogy e-mail-címüket megosztod a{' '}
            {APP_NAME} szolgáltatással egy csoportos esemény szervezése céljából;
          </li>
          <li>
            Jogszerű alapod van erre az alkalmazandó adatvédelmi jog értelmében (pl. az érintett
            beleegyezése vagy az esemény velük való szervezéséhez fűződő jogos érdek); és
          </li>
          <li>
            Nem használod a {APP_NAME} szolgáltatást kéretlen kommunikáció (spam) küldésére.
          </li>
        </ul>
        <p>
          Ahol a résztvevők személyes adatokat (például helyszínt) adnak meg, a szervező
          tudomásul veszi, hogy ezek az adatok számára láthatók, és azokat az alkalmazandó
          jogszabályoknak megfelelően kell kezelni.
        </p>

        <h2>5. Elfogadható használat</h2>
        <p>Tilos:</p>
        <ul>
          <li>A {APP_NAME} szolgáltatást jogellenes célra használni;</li>
          <li>Más felhasználók adataihoz jogosulatlanul hozzáférni;</li>
          <li>A szolgáltatást visszafejteni, automatizált lekérdezésekkel terhelni vagy visszaélni;</li>
          <li>A szolgáltatást kártékony kód terjesztésére vagy szolgáltatásmegtagadási támadások végrehajtására használni.</li>
        </ul>

        <h2>6. Szellemi tulajdon</h2>
        <p>
          A {APP_NAME} és az alapjául szolgáló szoftver a szolgáltatás üzemeltetőjének tulajdona.
          Az általad beküldött tartalom (eseménynevek, elérhetőségi szavazatok) a tiéd marad;
          korlátozott licencet adsz nekünk a kizárólag a szolgáltatás üzemeltetéséhez szükséges
          tárolásra és feldolgozásra.
        </p>

        <h2>7. Garancia kizárása</h2>
        <p>
          A szolgáltatást <strong>&quot;jelenlegi állapotában&quot;</strong> és{' '}
          <strong>&quot;rendelkezésre állása szerint&quot;</strong> biztosítjuk, mindenféle
          kifejezett vagy hallgatólagos garancia nélkül, beleértve az adott célra való
          alkalmasságot vagy a megszakítás nélküli rendelkezésre állást. Nem garantáljuk, hogy
          a helyszín-javaslatok, az utazási idők becslései vagy a találkozóhely-számítások
          pontosak.
        </p>

        <h2>8. Felelősség korlátozása</h2>
        <p>
          A jogszabályok által megengedett legnagyobb mértékig a {APP_NAME} üzemeltetője nem
          vállal felelősséget semmilyen közvetett, véletlen, különleges vagy következményes
          kárért, amely a szolgáltatás használatából ered, beleértve az adatvesztést vagy az
          e-mailek kézbesítésének sikertelenségét. A közvetlen károkért való felelősségünk
          összege nem haladja meg a 100 eurót.
        </p>

        <h2>9. Megszüntetés</h2>
        <p>
          Fenntartjuk a jogot, hogy értesítés nélkül felfüggesszük vagy megszüntessük a{' '}
          {APP_NAME} szolgáltatáshoz való hozzáférést minden olyan felhasználó vagy esemény
          esetén, amelyről észszerű okkal feltételezzük, hogy megsérti ezeket a feltételeket
          vagy az alkalmazandó jogszabályokat.
        </p>

        <h2>10. A feltételek módosítása</h2>
        <p>
          Időről időre frissíthetjük ezeket a feltételeket. A lényeges változásokról e-mailben
          értesítjük a szervezőket legalább 14 nappal a hatályba lépés előtt. A hatályba lépés
          utáni folytatólagos használat a frissített feltételek elfogadásának minősül.
        </p>

        <h2>11. Irányadó jog</h2>
        <p>
          Ezekre a feltételekre <strong>Magyarország</strong> jogszabályai az irányadók.
          Minden jogvita <strong>Magyarország</strong> bíróságainak kizárólagos hatáskörébe
          tartozik.
        </p>

        <h2>12. Kapcsolat</h2>
        <p>
          A feltételekkel kapcsolatos kérdéseket az alábbi e-mail-címre küldd:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </main>

      <LegalFooter />
    </div>
  );
}
