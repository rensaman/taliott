import '../setup/EventSetupForm.css';
import './LegalView.css';

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL ?? 'privacy@example.com';
const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'taliott';

export default function PrivacyPolicyViewHu() {
  return (
    <div className="legal-shell">
      <header className="legal-header">
        <p className="wizard-wordmark">Taliott</p>
      </header>

      <main className="legal-body">
        <h1>Adatvédelmi tájékoztató</h1>
        <p><em>Utolsó frissítés: 2026. március 14.</em></p>

        <h2>1. Kik vagyunk</h2>
        <p>
          A {APP_NAME} egy csoportos időpont-egyeztető szolgáltatás. Az EU általános adatvédelmi
          rendelete (GDPR) értelmében az adatkezelő a szolgáltatás üzemeltetője. Az adatvédelemmel
          kapcsolatos kérdésekben kérjük, vedd fel velünk a kapcsolatot:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>2. Milyen személyes adatokat kezelünk és miért</h2>

        <h3>Eseményszervezők</h3>
        <ul>
          <li>
            <strong>E-mail-cím</strong> — megerősítő e-mail küldéséhez, amely tartalmazza a privát
            adminisztrátori linket, a szavazási határidő lejártakor értesítés küldéséhez, valamint
            a véglegesített esemény részleteinek megküldéséhez.
          </li>
        </ul>

        <h3>Résztvevők (e-mailes meghívású eseménynél)</h3>
        <ul>
          <li>
            <strong>E-mail-cím</strong> — az eseményszervező adja meg. Meghívó küldéséhez, majd az
            esemény véglegesítése után naptármeghívó küldéséhez használjuk.
          </li>
        </ul>

        <h3>Résztvevők (megosztott linkkel csatlakozó eseménynél)</h3>
        <ul>
          <li>
            <strong>E-mail-cím</strong> — a csatlakozáskor te adod meg. Csatlakozás-visszaigazolás
            és az esemény végleges részleteinek megküldéséhez használjuk.
          </li>
          <li>
            <strong>Név</strong> (nem kötelező) — a szervező számára jelzi, ki válaszolt.
          </li>
        </ul>

        <h3>Minden résztvevő</h3>
        <ul>
          <li>
            <strong>Otthoni helyszín</strong> (nem kötelező, szélességi/hosszúsági fok) — az
            címkeresőn keresztül adod meg. Kizárólag a csoport számára földrajzilag igazságos
            találkozóhely kiszámításához használjuk. A pontos koordinátáid az eseményszervező
            számára láthatók, a többi résztvevőnek nem.
          </li>
          <li>
            <strong>Közlekedési mód</strong> (gyalog / kerékpár / autó / tömegközlekedés) — a
            találkozóhely-számítás súlyozásához használjuk.
          </li>
          <li>
            <strong>Elérhetőségi szavazatok</strong> (igen / talán / nem / semleges időslototonként)
            — a szervező számára látható csoportos hőtérkép elkészítéséhez.
          </li>
          <li>
            <strong>Válasz időbélyege</strong> — a válasz megerősítésekor rögzítjük, hogy a
            szervező láthassa, ki válaszolt.
          </li>
        </ul>

        <h2>3. Az adatkezelés jogalapja</h2>
        <p>
          A személyes adatokat a GDPR 6. cikke szerinti következő jogalapok alapján kezeljük:
        </p>
        <ul>
          <li>
            <strong>Szerződés teljesítése (6. cikk (1) b) pont)</strong> — a meghívók,
            visszaigazolások és értesítések küldése szükséges az általad vagy az eseményszervező
            által igényelt ütemezési szolgáltatás nyújtásához.
          </li>
          <li>
            <strong>Jogos érdek (6. cikk (1) f) pont)</strong> — utazási idők kiszámítása a
            csoport számára igazságos helyszín javaslatához.
          </li>
        </ul>

        <h2>4. Kivel osztjuk meg az adataidat</h2>
        <p>
          Személyes adatokat nem értékesítünk. Korlátozott adatokat az alábbi harmadik feles
          szolgáltatásokkal osztunk meg, kizárólag az alkalmazás üzemeltetése érdekében:
        </p>
        <ul>
          <li>
            <strong>OpenStreetMap Nominatim</strong> — a címkeresési lekérdezések (a beírt szöveg,
            nem a személyazonosságod) szerveroldalon kerülnek továbbításra a cím koordinátákká
            alakításához.
          </li>
          <li>
            <strong>OpenRouteService</strong> — a résztvevők koordinátái és közlekedési módja
            kerülnek elküldésre az otthoni helyszínek és a jelölt találkozóhely közötti utazási
            idők kiszámításához.
          </li>
          <li>
            <strong>Overpass API (OpenStreetMap)</strong> — a kiszámított találkozóhely
            koordinátáit közeli helyszínek keresésére használjuk. Személyes adatokat nem
            tartalmaz.
          </li>
          <li>
            <strong>E-mail / SMTP szolgáltató</strong> — az e-mail-címeket és az esemény részleteit
            a tranzakciós e-mail szolgáltatónknak továbbítjuk az üzenetek kézbesítéséhez. A
            szolgáltatóval a GDPR 28. cikke szerint adatfeldolgozási szerződést kötöttünk.
          </li>
          <li>
            <strong>OpenStreetMap tile kiszolgálók</strong> — a böngésződ közvetlenül az
            OpenStreetMap szervereiről tölti le a térkép csempéket. Ezekre a kérésekre az
            OpenStreetMap saját adatvédelmi tájékoztatója vonatkozik.
          </li>
        </ul>
        <p>
          A tömegközlekedési útvonaltervezést (a &quot;tömegközlekedés&quot; közlekedési módhoz)
          saját üzemeltetésű OpenTripPlanner példány végzi. A tranzitszámítások során az
          infrastruktúránkon kívülre nem kerülnek adatok.
        </p>

        <h2>5. Adatmegőrzés</h2>
        <p>
          Az eseményeket és az összes kapcsolódó résztvevői adatot a szavazási határidő lejárta
          után 90 nappal automatikusan töröljük, miután az esemény le van zárva vagy véglegesítve.
          Korábbi törlést bármikor kérhetsz (lásd a 6. pontot).
        </p>

        <h2>6. Jogaid a GDPR alapján</h2>
        <p>Ha az Európai Gazdasági Térségben tartózkodsz, az alábbi jogok illetnek meg:</p>
        <ul>
          <li>
            <strong>Hozzáférés (15. cikk)</strong> — a rólad tárolt adatokat letöltheted a
            részvételi oldalon a &quot;Adataim letöltése&quot; gombra kattintva.
          </li>
          <li>
            <strong>Törlés (17. cikk)</strong> — személyes adataidat bármikor törölheted a
            részvételi oldalon az &quot;Adataim törlése&quot; gombra kattintva. Az
            eseményszervezők az adminisztrátori oldalukról törölhetik az egész eseményt (és az
            összes kapcsolódó adatot).
          </li>
          <li>
            <strong>Helyesbítés (16. cikk)</strong> — neveidet és helyszínedet a részvételi
            oldalon frissítheted, amíg az esemény nyitva van.
          </li>
          <li>
            <strong>Adathordozhatóság (20. cikk)</strong> — az adatexport (lásd Hozzáférés fent)
            géppel olvasható JSON formátumban kerül biztosításra.
          </li>
          <li>
            <strong>Tiltakozás / korlátozás (21–22. cikk)</strong> — vedd fel velünk a kapcsolatot
            a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> címen, és 30 napon belül
            válaszolunk.
          </li>
          <li>
            <strong>Panasz benyújtása</strong> — jogod van panaszt benyújtani a nemzeti
            adatvédelmi felügyeleti hatóságnál (pl. Magyarországon a Nemzeti Adatvédelmi és
            Információszabadság Hatóságnál, NAIH).
          </li>
        </ul>

        <h2>7. Sütik és nyomkövetés</h2>
        <p>
          Nem használunk sütiket, helyi tárolást vagy bármilyen nyomkövető technológiát. Nem
          használunk elemzőszoftvert, hirdetési hálózatokat vagy nyomkövető képpontokat.
        </p>

        <h2>8. Kiskorúak</h2>
        <p>
          Ez a szolgáltatás nem irányul 16 év alatti gyermekekhez. A {APP_NAME} használatával
          megerősíted, hogy legalább 16 éves vagy, vagy hogy igazolható szülői beleegyezéssel
          rendelkezel a GDPR 8. cikke értelmében.
        </p>

        <h2>9. A tájékoztató módosítása</h2>
        <p>
          A tájékoztató lényeges módosításairól e-mailben értesítjük a résztvevőket, mielőtt azok
          hatályba lépnének.
        </p>

        <h2>10. Kapcsolat</h2>
        <p>
          Adatvédelmi kérdésekkel vagy kérésekkel fordulj hozzánk:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </main>

      <footer className="legal-footer">
        <a href="/">← Vissza</a>
        <a href="/terms/hu">Általános szerződési feltételek</a>
      </footer>
    </div>
  );
}
