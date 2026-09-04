# Kiszedési Jegyzék Shopify - Dokumentáció és Fejlesztési Napló

Ez a dokumentum a projekt teljes leírását, technikai specifikációit és a fejlesztések részletes történetét tartalmazza. 
**Célja:** Minden munkamenet elején biztosítani a teljes kontextust az AI ágens számára.

---

## 🏗️ Projekt Specifikáció & Design Guidelines

**[KÖTELEZŐ OLVASMÁNY]** Kérlek olvasd el az `ARCHITECTURE.md` fájlt a projekt gyökerében, mielőtt bármilyen fejlesztésbe kezdesz. Ez tartalmazza az MVC/Moduláris architektúra szabályait, amiket szigorúan követni kell!

Az ágensnek minden módosításkor tartania kell magát az alábbi stack-hez és stílushoz:

- **Frontend**: Vanilla HTML5, CSS3.
- **Dizájn Irányzat**: Modern, Apple-stílusú **Glassmorphism** (áttetsző rétegek, blur effekt, lekerekített sarkok, tiszta tipográfia).
- **Logika**: Vanilla JavaScript (Szigorúan **ES Modules** architektúra, lásd `ARCHITECTURE.md`).
- **Adatbázis & Backend**: Google Firebase (Cloud Firestore & Authentication).
- **Alapszabály**: Minden Firebase/Firestore hívást aszinkron módon, `await` kulcsszóval kell kezelni (különösen a `HistoryManager` objektumban).

---

## 📦 A Projekt Célja és Működése
Egy böngészőből futtatható raktári szedőlista és elszámoló rendszer Shopify webáruházakhoz.
- **Kezdés:** A Shopify-ból exportált megrendelések CSV fájljának beolvasása (`PapaParse`).
- **Feldolgozás:** Automatikus termék formázás, duplikáció szűrés, és vizuális jelzések a problémás rendelésekről (pl. hiányzó utalás, lappangó utánvét).
- **Kimenet:** Nyomtatható Szedési Jegyzék és kétoldalas "Összesítő és Korrekciós lap" a futároknak.

---

- **Utolsó aktív modell**: Gemini 3.8 Flash (High)
- **Státusz**: A rendszer 100%-ban moduláris és stabil. ⚡ **A termékek teljes neve, mérete (pl. 280x122, 2.8m) és kiszerelése (pl. 5kg, 1kg) mostantól minden felületen csonkítás nélkül megjelenik**. A Shopify API és a CSV import integráció automatikusan megőrzi a variánsokat, a Sela súlybekérő és az áttekintő felület pedig kiemelt címkékkel és szótöréssel biztosítja a hibátlan beazonosíthatóságot (`v3.9.3`, 243/243 zöld unit teszt).

---

## 📌 Holnapi Teendők (TODO Lista)

1. ☁️ **Felhős Telepítés (Cloud Deployment - Render.com / Vercel)**:
   - Összekötni a GitHub repót a Render.com-mal (vagy Vercellel).
   - Beállítani az Environment Variables (`SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_SHOP`, stb.) értékeket.
   - Biztosítani az állandó, bárhonnan és bármilyen gépről/telefonról elérhető HTTPS webcímet.

---

## 📝 Fejlesztési Napló (Changelog)

### 2026. szeptember 4. (7. frissítés) - Termékek Teljes Neve, Mérete és Kiszerelése Minden Felületen (`v3.9.3`)
- **Shopify API Variánsok és Kiszerelések Megőrzése (`shopifyApiService.js`)**:
  - **Felhasználói visszajelzés**: „mindig legyen kiírva a termékek teljes neve, mert nem tudom rendesen beazonosítani a méretét és kiszerelését, ebből nem tudom a súlyát ha annyit látok hogy tr032 meg tapadóhíd több fajta van”.
  - **Hiba oka**: A korábbi API feldolgozás (`item.title || item.name`) elsőként az `item.title`-t vette figyelembe, amely a Shopify-ban kizárólag a szülő termék neve (pl. csak „TR-032” vagy „Tapadóhíd”). A variánsok (pl. „280 x 122 cm”, „5 kg”, „1 kg”) elvesztek.
  - **Megoldás**: A feldolgozó mostantól az `item.name`-et (teljes cím variánssal) vagy a `title + variant_title` összetételt menti el, így a tételnévben mindig hiánytalanul szerepel a pontos méret és kiszerelés.
- **Névformázó Tisztítás Megszüntetése (`shopify.js` - `formatItemName`)**:
  - A korábbi `formatItemName` levágta a profilok hosszméreteit (pl. 2.8m) és lerövidítette a táblaméreteket. Ezt letiltottuk, kizárólag a felesleges dupla szóközöket takarítja, a méretek és kiszerelések 100%-ig megmaradnak.
- **Dátumtisztítás Pontosítása a Súlykezelőben (`selaWeightService.js`)**:
  - A korábbi reguláris kifejezés (`\b\d{1,2}[./]\d{1,2}\b`) a törtszámokat (pl. 2.8 m, 1.5 kg) is dátumként értelmezhette. Átírtuk egy intelligens ellenőrzésre, amely a mértékegységek (`m`, `cm`, `mm`, `kg`, `liter`, `l`) előtti számokat szigorúan megvédi a törléstől.
  - Az ismeretlen termékek súlybekérésénél és a keresőkulcs generálásánál (`getItemWeightKey`, `suggestWeightForItem`) a rendszer a variánst is figyelembe veszi, így az 5 kg-os és 1 kg-os tapadóhíd különálló súlyt és automatikus javaslatot kap (5 kg -> 5.0 kg, 1 kg -> 1.0 kg).
- **Megjelenítés Javítása a Súlybekérőben és a Rendelés Kártyán (`selaMissingWeightsModal.js`, `orderOverviewView.js`)**:
  - A korábbi `white-space: nowrap; text-overflow: ellipsis` csonkítás helyett mostantól `word-break: break-word` biztosítja, hogy a teljes terméknév mindig látható legyen.
  - Dedikált, jól látható kék badge jelzi a pontos variánst / kiszerelést (pl. `Méret / Kiszerelés: 5 kg`, `Méret / Kiszerelés: 280 x 122 cm`).
- **Unit Tesztek Bővítése (`tests/unit_tests.js`)**:
  - 5 új teszt hozzáadva: profilméret védelem (2.8m), tapadóhíd 5kg vs 1kg külön kulcsok és helyes súlyjavaslatok (**238 / 238 zöld teszt**).

### 2026. szeptember 4. (6. frissítés) - Sela Export Gomb Hibajavítás & Firestore Időtúllépés Kezelés (`v3.9.1`)
- **Firestore RPC / WebChannel Újracsatlakozási Időtúllépés Megoldása (`selaWeightService.js`)**:
  - **Hiba oka**: Amikor a felhasználó böngészőjében a Firestore Listen stream újracsatlakozási állapotba került (`WebChannelConnection RPC 'Listen' stream transport errored: Qd`), az `initializeProductWeights()`-ban futó `await fb.getDoc()` végtelen ideig blokkolta az export gomb eseménykezelőjét.
  - **Megoldás**: A Firestore lekérést (`fb.getDoc`) egy 1500 ms-os `Promise.race` időtúllépéssel egészítettük ki. Ha a felhő lassú vagy épp újracsatlakozik, a rendszer 1.5 mp után azonnal a lokális gyorsítótárból (`localStorage`) dolgozik tovább, így a felhasználói felület sosem fagy le. Hasonló védelmet kapott a mentés is (`fb.setDoc` 2500 ms timeout).
- **Garantált Modál Stílusbetöltés (`selaModalStyles.js` & `css/style.css`)**:
  - **Hiba oka**: Ha a kiválasztott rendelésekben ismeretlen súlyú termék volt, a `SelaMissingWeightsModal` nyílt meg először, amelynek a CSS stílusai (`.sela-modal-overlay`, `.sela-modal-container`) eredetileg csak a `SelaExportModal` megjelenítésekor injektálódtak. Emiatt a felugró ablak formázatlanul és láthatatlanul a képernyő aljára került.
  - **Megoldás**: A modál stílusokat beemeltük a statikus `css/style.css`-be, valamint létrehoztunk egy központi `selaModalStyles.js` segédmodult (`ensureSelaModalStyles()`), amely a modálok megnyitása előtt ellenőrzi és biztosítja a szükséges CSS jelenlétét a DOM-ban.
- **Interaktív Visszajelzés a Sela Export Gombon (`app.js`)**:
  - Ha a felhasználó kijelölés nélkül kattint az export gombra, a rendszer mostantól nem csendben lép ki (`return;`), hanem egyértelmű figyelmeztető párbeszédablakot jelenít meg (`CustomDialog.alert`).
  - A gomb kattintásakor azonnali töltési animációt kap (`Előkészítés...`), és egy átfogó `try / catch` hibakezelő védi a folyamatot.
- **Unit Tesztek Frissítése (`tests/unit_tests.js`)**:
  - Node.js biztonságos modálstílus-futtatás tesztelve (233 / 233 zöld teszt).

### 2026. szeptember 4. (5. frissítés) - Táblánkénti és Cikkszám Szintű Súlykezelés & Hiányzó Súlyok Bekérése Sela Exportnál (`v3.9.0`)
- **Táblánkénti és Termékenkénti Súlykezelő Szolgáltatás (`selaWeightService.js`)**:
  - **Felhasználói elvárás**: Ne globális kategória-szorzók legyenek, hanem *táblánként, termékenként legyen rögzítve a súly*. Ha egy cikk még nem került exportálásra Sela-nak, a rendszer kérdezzen rá a felhasználónál.
  - **Szigorú Méretmegőrzés (`cleanItemNameForSelaWeight`)**: A tisztító algoritmus a beérkezési dátumokat (`(Beérkezés: 08.27)`) letakarítja, **de a méreteket szigorúan megtartja** (pl. `244x122` vs `280x122`, `278x60cm`, `5kg`), így az eltérő méretű táblák különálló súlyt kapnak.
  - **Kettős Perzisztencia**: A terméksúlyokat a rendszer mind a Firebase Firestore felhőben (`sela_settings / product_weights`), mind a böngésző `localStorage`-ban azonnal elmenti.
  - **Dinamikus ESM Loader**: A Firebase csak böngésző környezetben töltődik be dinamikusan, így a Node.js unit tesztek és szerver folyamatok zökkenőmentesen futnak (`ERR_UNSUPPORTED_ESM_URL_SCHEME` nélkül).
- **Hiányzó Súlyok Interaktív Bekérése (`selaMissingWeightsModal.js`)**:
  - A *[Sela Export]* gombra kattintáskor a rendszer átvizsgálja a kijelölt rendelések tételeit (az összekészített profilokat al-profilokra bontva).
  - Ha van olyan tábla vagy kellék, aminek a súlya még nem rögzített, megnyílik egy modern ablak, ahol a felhasználó közvetlenül megadhatja a cikkek darabsúlyát (`kg / db`).
  - A mezők kategória-alapú intelligens javaslattal indulnak (pl. 244-es PVC: 16 kg, 280-as PVC: 18.5 kg, Wide akupanel: 9 kg, Normál akupanel: 7 kg, 5kg-os tapadóhíd: 5 kg, ragasztó/profil: 0.5 kg).
  - A *[💾 Súlyok mentése és Folytatás]* gombra kattintva az adatok elmentődnek, és a folyamat automatikusan továbbugrik a Sela Export áttekintő táblázathoz.
- **Sela Export Modal Bővítés (`selaExportModal.js`)**:
  - A táblázat 13. oszlopában (`Összsúly (kg)`) az egér fölé mozgatásakor részletes bontási tooltip jelenik meg (pl. `PB-01 Fehér 280x122 (4 db × 18.5 kg = 74 kg) + T-Rex (2 db × 0.5 kg = 1 kg) | Összesen: 75 kg`).
  - A fejlécbe beépült egy **[⚖️ Terméksúlyok kezelése]** gomb, amellyel a felhasználó bármikor megtekintheti, módosíthatja vagy törölheti a korábban mentett cikkek súlyát.
- **Unit Tesztek Bővítése (`tests/unit_tests.js`)**:
  - 21 új teszteset hozzáadva (összesen: **233 / 233 zöld unit teszt**).

### 2026. szeptember 4. (4. frissítés) - Sela CSV Export: Rendelésenkénti Összsúly Számítás (13. Oszlop) & Súlykonfiguráció (`v3.8.9`)
- **Rendelésenkénti Súlyszámítás a Sela Exportban (`exporter.js`)**:
  - **Felhasználói igény**: A PannonXP-től független, önálló súlyszámítás a Sela export számára, plusz egy oszlopként hozzátűzve a CSV végére.
  - **13. oszlop bevezetése**: `"Összsúly (kg)"` oszlop került a Sela CSV végére (13. oszlop), kerekített 1 tizedes pontossággal.
  - **Alapértelmezett kategória-súlyok**:
    - PVC / SPC falpanelek és padlók: **18 kg / db**
    - Akusztikus falpanelek (akupanel): **7 kg / db**
    - Ragasztók, szilikonok: **0.5 kg / db**
    - Profilok (beleértve a szétbontott al-profilokat): **0.5 kg / db**
    - Tapadóhíd: **1.0 kg / db**
  - **Összekészített profilok intelligens kezelése**: Amennyiben egy rendelésben összekészített profil csomag van (`isCollapsedProfile`), a rendszer az al-tételek (`subItems`) darabszámait veszi alapul a súlyhoz.
- **Interaktív Súlykonfigurációs Panel a Modálban (`selaExportModal.js`)**:
  - A felugró Sela export modál tetején megjelent egy kompakt konfigurációs sáv a kategóriák egységsúlyainak beállítására.
  - Bármelyik súly módosításakor a táblázat minden sorának összsúlya, valamint a modál láblécében látható teljes kiszállítandó összsúly azonnal, valós időben újraszámolódik.
  - Az egyedi súlybeállítások a böngésző `localStorage`-ban automatikusan elmentődnek a következő használatra.
- **Unit Tesztek Bővítése (`tests/unit_tests.js`)**:
  - Sela CSV 13 oszlopos fejléc, súlykalkuláció és egyedi kategória-súlyok tesztelése (212/212 sikeres teszt).

### 2026. szeptember 4. (3. frissítés) - 7x-es Betöltési Sebességgyorsítás (15s ➔ 2.3s) & Kompakt Rendelésnézet (`v3.8.8`)
- **Radikális Shopify Betöltési Sebességgyorsítás (`server.js`)**:
  - **Probléma feltárása**: Korábban a betöltés ~15-16 másodpercig tartott, mert:
    1. A GraphQL `events(first: 10)` mezője miatt a Shopify adatbázisa minden egyes nyitott rendelésnél végigkutatta az összes korábbi rendszerlevelet (6.5 másodperc/oldal).
    2. A REST hívások és a GraphQL lekérdezések szekvenciálisan, egymás után futottak le.
    3. A 140 termék képeit a rendszer minden egyes frissítésnél újra lekérte a Shopify hálózatáról.
  - **Megvalósított megoldások**:
    - **Célzott GraphQL Lekérdezés**: Eltávolítottuk az `events(first: 10)` lekérdezést, közvetlenül a natív `displayFulfillmentStatus` és `fulfillmentOrders` mezőket vizsgáljuk. Ezzel a GraphQL idő 6.5 másodpercről **1.2 másodpercre** esett vissza!
    - **Párhuzamos Végrehajtás (`Promise.all`)**: A REST rendelések (`unfulfilled`, `partial`, `recent`), a GraphQL átvehető státuszok és a termékképek egyszerre, párhuzamos szálon futnak le.
    - **Helyi Képcache (`.tmp/products_cache.json`)**: A termék- és variánsképek leképezését a szerver memóriában és lemezen tárolja (6 órás TTL), így az azonnal (0 ms) rendelkezésre áll.
    - **Mért Eredmény**: 501 rendelés teljes feldolgozása, duplikáció-szűrése, PannonXP minősítése és képek csatolása **2.29 – 2.34 másodperc** alatt lefut (több mint 7-szeres sebességugrás)!
- **Kompakt Rendelésrészletező Felület (`orderOverviewView.js`)**:
  - A felhasználói visszajelzés alapján eltávolításra kerültek a felesleges akciógombok (`Fulfill`, `Sela címke`), így a lenyitott kártya alsó része teljesen letisztult és kompakt lett.
  - A jobb oldali oszlop pont a bal oldali terméklista magasságához igazodik, felesleges üres tér vagy vertikális túlnyúlás nélkül.
  - **Fizetési Státusz Jelvény Hibajavítás**: A lenyitott panel korábban egy leegyszerűsített `codAmount ? Utánvét : Kifizetve` feltételt használt, emiatt a még ki nem fizetett átutalásos rendeléseknél (`isBankDeposit && !isPaid`, pl. `#3934`) tévesen zöld "Kifizetve" badge jelent meg. A lenyitott panel mostantól a fejléc sávval azonos, precíz logikát alkalmaz: külön megjeleníti a `⚠️ Függő Utalás`, `Utánvét`, `Fizetetlen` és `✓ Kifizetve` státuszokat.
- **208/208 Unit Teszt Zöld** (`node tests/unit_tests.js`).

### 2026. szeptember 4. (2. frissítés) - Lenyitható Rendelés Panel Újratervezés & Prémium Dashboard Nézet (`v3.8.7`)
- **Lenyitható Rendelésrészletező (Accordion) Redesign (`orderOverviewView.js`, `app.js`)**:
  - **Megszűnt a „bumszli nagy” dizájn és a felesleges 66px-es bal behúzás**: A lenyitott felület mostantól elegáns, tiszta, teljes szélességű belső kártyaként jelenik meg (`padding: 12px 18px 14px 18px;`).
  - **Kétoszlopos Strukturált Elrendezés**:
    - **Bal hasáb (Megrendelt tételek)**:
      - Tömör, kényelmes sávos elrendezés (44px magasságú kártyák a korábbi 90px helyett).
      - **40x40px miniatűr termékképek** kattintható nagyítással (Lightbox).
      - **Kiemelt Mennyiség Kapszula**: Nagy kontrasztú kék badge (`[ X db ]`), hogy a raktáros egy pillantással azonnal lássa a darabszámot!
      - Egységár és tételes összeg jobbra rendezve.
      - Diszkrét áthúzott piros blokk a törölt tételeknek.
    - **Jobb hasáb (Logisztika, Ügyféladatok, Akciók)**:
      - **Címzett & Szállítás**: Cím, település, irányítószám, és egy beépített **`[📋 Másolás]`** gomb, ami azonnal vágólapra másolja az adatokat a futárhoz vagy fuvarlevélhez.
      - **Telefonszám**: Közvetlenül kattintható hívás link (`tel:`).
      - **Kiemelt Vásárlói Megjegyzés (Notes)**: Meleg borostyán/arany színű kártyán, azonnal olvashatóan kiemelve.
      - Pénzügy: Végösszeg + Utánvét badge vagy zöld Kifizetve jelvény.
      - **Akciógombok**: Egységes, kompakt gombok (`Fulfill`, `Ready for pickup`, `Sela címke`).
  - **Egybeépített Figyelmeztető Sáv**:
    - A korábbi egymás alá halmozott 4 darab 50px magas doboz helyett egyetlen kompakt, modern chip-sávba kerültek a státuszok (lemondott, hibás szállítás 2300 Ft, díjbekérő szükséges, számla hiányzik, terítésben).
- **208/208 Unit Teszt Zöld** (`node tests/unit_tests.js`).

### 2026. szeptember 4. - Automatikus PannonXP Címkézés a Háttérben (Shopify API) (`v3.8.6`)
- **Intelligens Termékszűrés & PannonXP Jogosultság (`js/utils/orderUtils.js`)**:
  - Elkészült a moduláris termékosztályozó és szűrő logika (`isPvcSpcOrFloorItem`, `isPickupOrder`, `isEligibleForAutoPannonXp`).
  - **Kizárva**: Minden olyan rendelés, amelyben legalább 1 db PVC falpanel, SPC falpanel vagy padlózat (PB, TR, LJ panelek, SPC panelek, padlózatok) szerepel.
  - **Engedélyezve (PannonXP-re mehet)**: Akusztikus falpanelek (aku, wide acoustic, akupanel), ragasztók, szilikonok, profilok, tapadóhíd, minták, csavarok és kiegészítők.
  - **Személyes Átvétel Védelem**: A bolti és raktári átvételek (`személyes`, `pickup`, bolti szállítási mód) szigorúan kizárva, nem kapnak téves PannonXP jelölést.
  - **Duplikáció & Státusz Védelem**: Már felcímkézett (`PannonXP`, `pxp`), Sela-nak küldött (`sela megr.`), járaton lévő (`terítésben`), törölt vagy már teljesített rendelések automatikusan kizárva.
- **0 Másodperces Felületi Késleltetés (Optimista UI Frissítés)**:
  - A szerver a `GET /api/shopify/orders` lekéréskor azonnal átadja az adatokat a böngészőnek (nem vár a Shopify címkementésekre).
  - A visszaküldött válaszban a jogosult rendelések már tartalmazzák a `PannonXP` címkét, így a szűrősáv, a darabszámlálók és a sorok melletti badge-ek azonnal a helyükre ugranak.
- **Kíméletes Háttérfolyamat (Rate-Limited Queue Worker a `server.js`-ben)**:
  - A szerver a válasz elküldése után a háttérben (`setImmediate`) sorban, 600 ms-os biztonsági időközzel menti le a `PannonXP` címkét a Shopify REST API-ba (`PUT /admin/api/2024-04/orders/{id}.json`).
  - Ezzel 100%-ban megelőzhető a Shopify API túlterhelése (`429 Too Many Requests`), és a felhasználónak egyetlen plusz másodpercet sem kell várnia betöltéskor.
  - Lock védelem: egyszerre csak egyetlen worker futhat, elkerülve a gyors egymásutáni frissítésekből adódó párhuzamos ütközéseket.
- **24 Új Automata Unit Teszt**:
  - Összesen **208/208 sikeres (zöld) teszt** ellenőrzi a termékek osztályozását, a szállítási módokat és a jogosultságokat (`node tests/unit_tests.js`).

### 2026. szeptember 3. (8. frissítés) - Interaktív Szállítói Export (Sela) Előnézet, 12 Oszlopos Struktúra, Dupla Rendelés Címke & Ultra-Kompakt Fejléc (`v3.8.5`)
- **Interaktív Előnézeti & Szerkesztő Táblázat (`SelaExportModal`)**:
  - A korábbi azonnali CSV letöltés helyett megnyílik egy modern, glassmorphic előnézeti modal.
  - Mind a 12 oszlop látható egy áttekinthető táblázatban, és a letöltés előtt **bármelyik cella (cím, telefon, darabszámok, utánvét) közvetlenül szerkeszthető/átírható**.
  - **Soronkénti Kuka (Törlés) Ikon**: Ha a felhasználó a táblázatban látja, hogy egy rendelést mégsem küldünk el most, a piros kuka gombra kattintva azonnal eltávolíthatja. A törölt tétel garantáltan **nem kerül bele a CSV-be**, és **nem kapja meg a `sela megr.` címkét** a Shopify-ban sem!
  - A felesleges felső összesítő dobozokat eltávolítottuk a felhasználó kérésére a tiszta, fókuszált munkaterület érdekében.
- **12 Oszlopos Sela Struktúra & Szabályok**:
  1. *Dátum*: Mai dátum (az export készítésének napja, pl. `2026.09.03`).
  2. *Rendelésszám*: `#3050`.
  3. *Irányítószám*: `1118`.
  4. *Település*: `Budapest`.
  5. *Utca és házszám*: Közterület és házszám (automatikusan megtisztítva az esetlegesen benne lévő telefonszámtól).
  6. *Telefonszám*: Fő telefonszám + más mezőkből (cím 2, emelet/ajtó, notes) kinyert alternatív telefonszám összefűzve (`+3630... / +3620...`). Szigorú regex védelemmel: irányítószám (pl. 3600) és házszám (pl. 36.) garantáltan nem kerül kinyerésre telefonszámként.
  7. *Címzett Neve*: Szigorúan a szállítási címzett neve (`shippingName`), garantáltan nem a számlázási név.
  8. *PVC/SPC falpanel és padlózatok (db)*: PVC és SPC falpanelek (PB, TR, LJ, SPC falpanel SKU/név) és padlózatok összesített darabszáma. Akusztikus panelek kizárva. Egy tételenkénti szigorú egyszeri számlálás (nem duplázódik, ha a névben egyszerre szerepel TR és PVC).
  9. *Akusztikus falpanelek (db)*: Akusztikus, aku, wide akusztikus, wide acoustic panelek összesített darabszáma.
  10. *Ragasztók, szilikonok (db)*: Ragasztók, T-Rex, HPR, szilikonok összesített darabszáma (mamut és fix all kizárva).
  11. *Profilok (db)*: Profilok és **skirting** (szegélylécek) összesített darabszáma.
  12. *Utánvét összege / tapadóhíd*:
      - Ha van utánvét: `45 000 Ft` (vagy tapadóhíd esetén `45 000 Ft, 3db tapadóhíd`).
      - Ha nincs utánvét: **`nincs utánvét`** (vagy tapadóhíd esetén `nincs utánvét, 3db tapadóhíd`).
- **Szigorú Díjbek.ki Utánvét-Védelem ("Ne engedje elfelejteni")**:
  - A rendszer felismeri a `díjbek.ki` címkés rendeléseket.
  - Ha a Notes-ban egyértelműen szerepel a 20.000, 25.000 vagy 30.000 Ft-os levonás vagy az új utánvét, automatikusan kitölti.
  - Ha a Notes üres vagy nem tartalmaz egyértelmű levonást: a mező piros kerettel és `⚠️ ADJ MEG UTÁNVÉTET!` jelzéssel jelenik meg.
  - **Letöltési blokkolás**: A rendszer nem engedi a CSV letöltését mindaddig, amíg minden díjbekérős tételnél be nem írják a pontos összeget (figyelmeztető modallal és a fókusz odaállításával).
- **Összeg & Fizetés Oszlop Duplikáció Megszüntetése ([orderOverviewView.js](file:///c:/Users/Intel/OneDrive/Asztali%20g%C3%A9p/Projektek/Kiszed%C3%A9si%20jegyz%C3%A9k%20shopify/js/views/orderOverviewView.js))**:
  - Korábban az utánvétes rendeléseknél kétszer jelent meg az összeg egymás mellett (pl. `31 240 Ft [UV: 31 240 Ft]`).
  - Finomhangoltuk: ha a végösszeg megegyezik az utánvéttel, csak az összeg és egy letisztult **`[Utánvét]`** badge látható (`31 240 Ft [Utánvét]`).
  - Ha az utánvét eltér a végösszegtől (pl. előleg/díjbekérő vagy részfizetés esetén), akkor továbbra is indokoltan kiírja a pontos UV összeget (pl. `300 000 Ft [UV: 275 000 Ft]`).
- **Függő Utalás Jelzése a CSV Szerkesztőben (Felugró ablak nélkül)**:
  - A rendszer a CSV szerkesztő táblázatban narancssárga `⚠️ Függő Utalás` badge-dzsel és kiemelt sorháttérrel, valamint a fejlécben figyelmeztető sávval jelzi a még nem fizetett banki utalásokat (pontosan úgy, mint a díjbekérőt).
  - A letöltéskor a felhasználó kérésére **nem jelenik meg plusz felugró ablak**, így a folyamat gyors és zökkenőmentes marad.
- **Több Aktív Rendelés (Unfulfilled Duplikáció) Jelzése & Címke ([orderUtils.js](file:///c:/Users/Intel/OneDrive/Asztali%20g%C3%A9p/Projektek/Kiszed%C3%A9si%20jegyz%C3%A9k%20shopify/js/utils/orderUtils.js), [orderOverviewView.js](file:///c:/Users/Intel/OneDrive/Asztali%20g%C3%A9p/Projektek/Kiszed%C3%A9si%20jegyz%C3%A9k%20shopify/js/views/orderOverviewView.js))**:
  - A rendszer intelligensen megvizsgálja az összes aktív (unfulfilled/nem törölt) rendelést, és felismeri, ha ugyanannak a vásárlónak több megrendelése is folyamatban van (telefonszám, email vagy név + cím egyezés alapján).
  - **Kilógó Címke**: A "Rossz szállítást választott!" címke mintájára egy külön lila hanging badge jelenik meg a sor bal oldalán: **`2x rendelés (#3048)`** (több rendelésnél `3x rendelés (#3048, #3049)`).
  - **Gyorsszűrő Chip**: A fejlécben külön szűrőgombot kapott (**`Több rendelés (X db)`**), amivel 1 kattintással listázhatók az összevonható, dupla vagy többszörös rendelések.
- **Ultra-Kompakt 1-Soros Előzmények Fejléc & Pill Tab-Sáv ([index.html](file:///c:/Users/Intel/OneDrive/Asztali%20g%C3%A9p/Projektek/Kiszed%C3%A9si%20jegyz%C3%A9k%20shopify/index.html), [app.js](file:///c:/Users/Intel/OneDrive/Asztali%20g%C3%A9p/Projektek/Kiszed%C3%A9si%20jegyz%C3%A9k%20shopify/js/app.js), [style.css](file:///c:/Users/Intel/OneDrive/Asztali%20g%C3%A9p/Projektek/Kiszed%C3%A9si%20jegyz%C3%A9k%20shopify/css/style.css))**:
  - A korábban különálló, túlméretezett címsávot és fül-sávot (~135px magasság) összevontuk egyetlen **38px magas modern egybeépített fejléccé**.
  - Bal oldalon: Letisztult cím és ikon (`Előzmények és Keresés`).
  - Középen: Kapszula (segmented pill) stílusú kompakt fülek (`Elszámolások`, `Statisztika`, `Számlaellenőrzés`).
  - Jobb oldalon: Szemetes (`🗑️`) és Bezárás (`✕`) gombok.
  - A szűrősáv és az összesítő sáv margóit lecsökkentettük, így **több mint 90px függőleges hasznos tér** szabadult fel a képernyőn a fuvarok listájához.
- **Opcionális Shopify Címkézés**:
  - A modal alján egy jelölőnégyzettel (`[x] Rendelések megjelölése "sela megr." címkével a Shopify-ban`) választható a címkézés futtatása vagy elhagyása.
- **184/184 Unit Teszt Zöld** (`node tests/unit_tests.js`).

### 2026. szeptember 3. (7. frissítés) - Céges Gép Konfiguráció & Shopify API Környezet (`v3.8.5`)
- **Céges Gépes Beállítás & `.env` Konfiguráció**:
  - Konfiguráltuk a céges gép helyi környezeti változóit (`SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_SCOPES`, `SHOPIFY_ACCESS_TOKEN`).
  - Újraindítottuk a helyi szervert (`node server.js` - `http://localhost:8080`), és ellenőriztük a Shopify OAuth API végpontot.
  - Sikeresen lekérdezésre került 501 élő Shopify rendelés.
- **Git Biztonság Verifikáció**:
  - Ellenőriztük a [.gitignore](file:///c:/Users/CH_001/Desktop/Projektek/kiszedesi/.gitignore) fájlt, a `.env` biztonságosan figyelmen kívül van hagyva (nem kerül pusholásra/pullolásra).
- **122/122 Unit Teszt Zöld** (`node tests/unit_tests.js`).

### 2026. szeptember 3. (6. frissítés) - Ultra-Kompakt Előzmények és Elszámolások Felület & CSV Import Fix (`v3.8.4`)
- **1-Soros Szuper-Kompakt Szűrősáv az Előzmények Modalban**:
  - Összevontuk az elszórt 2-soros szűrőterületet (Globális kereső, Cégválasztó, Kezdő/Záró dátum, Szűrés, Törlés, `Csak függő fuvarok` opció és `Export CSV` gomb) egyetlen 32px magas, rendkívül tiszta és helytakarékos sorba.
- **Kompakt Összesítő Sáv ("SZŰRT KÖVETELÉSEK ÖSSZESEN")**:
  - A korábbi magas, 76px-es sötét kártyát egy 34px-es elegáns glassmorphic összefoglaló sávvá alakítottuk át, így jóval több fuvar fér el a képernyőn görgetés nélkül.
- **Letisztult, Kompakt Cégcsoport Fejlécek és Terítés Kártyák**:
  - Csökkentettük a kártyák padding-jait, gombméreteit és ikontávolságait. A nyomtatási és betöltési ikongombok tömör 24x24px méretet kapnak.
- **Export CSV Import Bug Fix**:
  - Bekötöttük az [app.js](file:///c:/Users/CH_001/Desktop/Projektek/kiszedesi/js/app.js)-be a hiányzó `getRunPaymentTotals` és `getPaymentDetails` importokat.
- **122/122 Unit Teszt Zöld** (`node tests/unit_tests.js`).

### 2026. szeptember 3. (5. frissítés) - Sela + Szállítmányra Várás Kombinált Ikon & Szűrő, Letisztult Oldalsó Szegélyek (`v3.8.3`)
- **Szállítmányra Váró + Sela Elküldve Kombinált Jelvény**:
  - Ha egy szállítmányra váró rendelés már el lett küldve a Selának (`sela megr.`), a piros homokóra jobb alsó sarkában egy **apró zöld teherautó jelvény** jelenik meg.
  - A felugró szövegbuborékban a várás oka alatt zölddel kiemelve látható: `🚚 Szállítónak elküldve (sela megr.)`.
- **Külön „Sela elküldve” Gyorsszűrő Chip**:
  - Bekerült a gyorsszűrő sávba a zöld `Sela elküldve` gomb a darabszámmal, így azonnal szűrhetők az elküldött tételek.
- **Oldalsó Színes Csíkok Eltávolítása**:
  - A sorok bal oldali vastag szegélyeit (lila, piros, arany csíkok) teljesen megszüntettük, tiszta háttérszínekkel és egységes elválasztó vonallal.
- **122/122 Unit Teszt Zöld** (`node tests/unit_tests.js`).

### 2026. szeptember 3. (4. frissítés) - Viszonteladó Arany Kiemelés, Rikító Kék Futár Ikon, Homokóra Prioritás, Fül-Specifikus Számlálók & Szuper-Kompakt Header (`v3.8.2`)
- **Viszonteladó Sorok Arany Kiemelése**:
  - A `viszonteladó` tag-es rendelések meleg, karakteres arany háttérszínt (`#fef9c3`) és határozott arany szegélyt kapnak.
  - Ha egy rendelés egyszerre viszonteladó és személyes átvételes, a **viszonteladó arany szín az elsődleges**, megelőzi a lila színt.
- **Személyes Átvétel Erősített Lila Árnyalata**:
  - A sima személyes átvételes sorok határozottabb, elegáns lila árnyalattal (`#f3e8ff` háttér, `#ddd6fe` szegély, `#8b5cf6` bal csík) jelennek meg.
- **Rikító Kék Futár Ikon (Terítésben)**:
  - Ha egy rendelés már felkerült egy kiszállítási járatra (terítésben van), a logisztikai ikon rikító, élénk égkék kisautóként (`#0284c7`, sky blue kerettel) jelenik meg.
- **Szállítmányra Várás Prioritása a Személyes Átvétellel Szemben**:
  - Ha egy személyes átvételes rendelésen rajta van egy szállítmányra/anyagra várós tag (pl. `spc szállítmányra vár`), akkor a **piros homokóra jelenik meg hover buborékkal**, és nem a lila storefront gomb, így nem lehet véletlenül sem átállítani átvehetőre (`ready for pickup`).
- **Fül-Specifikus (Dinamikus) Szűrőszámlálók**:
  - A gyorsszűrő chip-eken látható darabszámok mostantól mindig a **kiválasztott fő fülre (pl. Unfulfilled)** vonatkoznak (pl. `Unfulfilled` fülön a Személyes gomb csak az unfulfilled személyes rendelések számát mutatja).
- **Szuper-Kompakt Felső App Header & Rendelésáttekintő Térközök**:
  - A felső alkalmazás fejléc (`.top-toolbar`) magasságát 64px-ről 44px-re csökkentettük, a navigációs fülek és a logó ultra-kompakt méretet kaptak.
  - A Rendelésáttekintő sormagasságait és paddingjait maximalizáltuk a helytakarékosság érdekében.
- **122/122 Unit Teszt Zöld** (`node tests/unit_tests.js`).

### 2026. szeptember 3. (3. frissítés) - Logisztikai Tooltip Buborék, Manuális Személyes Tag Kezelés, Tiszta Címoszlop & Kompakt Szűrősáv (`v3.8.1`)
- **Látványos Szövegbuborék (Tooltip) a Szállítmányra Váró Ikonhoz**:
  - A piros homokóra hoverjére egy elegáns, sötét tónusú szövegbuborék (`.logi-tooltip-bubble`) ugrik fel, amely tisztán és látványosan mutatja a várás pontos okát (pl. `spc szállítmányra vár`, `profilra vár`), felesleges sallang nélkül.
- **Manuálisan 'személyes' Címkével Ellátott Rendelések**:
  - Ha egy rendelésen szerepel a `személyes` vagy `szemelyes` tag (még ha eredetileg kiszállításos volt is), a rendszer automatikusan átvehetőnek (`pickup_ready`) tekinti és alapból a **zöld bolt ikont** jeleníti meg hozzá az interaktív gomb helyett.
- **Személyes Átvétel Szállítási Cím Oszlop Letisztítása**:
  - Személyes átvételes rendeléseknél a `Szállítási Cím` oszlop mostantól teljesen üres marad, így vizuálisan azonnal elkülönül a kiszállításos rendelésektől és nincs zavaró duplikáció.
- **Felső Szűrősáv Átdolgozása (Szuper Kompakt & Logikus)**:
  - A korábbi sok elszórt színes gomb helyett egy tiszta, 2 csoportos sáv készült:
    1. **Logisztikai csatornák** (Mind, Sela küldendő, PannonXP, Személyes, Terítésben, Járatra vár).
    2. **Teendők & Figyelmeztetések** (Szállítmányra vár, Rossz szállítás 2300 Ft, Számlázni!, Díjbekérő, Függő utalás) — ezek **csak akkor jelennek meg**, ha ténylegesen van velük teendő!
  - A kereső, dátum és tag szűrők a felső sávba rendeződtek a státuszfülek mellé.
- **Oszloptérközök és Rács Normalizálása**:
  - A felesleges nagy üres hézag a szállítási cím és az összeg között megszűnt, az arányok stabilak és kompaktak (`max-width: 1560px`).
- **121/121 Unit Teszt Zöld** (`node tests/unit_tests.js`).

### 2026. szeptember 3. (2. frissítés) - Logisztikai Állapot Ikon & Rendelésáttekintő Letisztítás (`v3.8.0`)
- **Zsúfolt Szöveges Badge-ek és Kilógó Címkék Eltávolítása**:
  - Eltávolítottuk a korábbi zavaró, nehezen átlátható `Sela küldendő`, `Sela elküldve`, `PannonXP`, `Ready for pickup` szöveges gombokat és badge-eket a szállítási cím oszlopából.
  - A bal oldali kilógó címkék közül eltávolítottuk a felesleges szállítmányra váró címkét is, mivel a sor eleji piros homokóra ikon hoverjében megjelenik a teljes részletes kiírás.
  - A szállítási oszlop mostantól 100%-ban tiszta és azonnal olvasható (csak a település és a közterület látható, vagy személyes átvételnél az üzlet neve).
- **Közvetlen Logisztikai Állapot Ikon a Sor Elején (Checkbox és Rendelésszám Között)**:
  - 🏪 **Lila bolt gomb (1-kattintásos)**: Személyes átvétel, ami még nincs összekészítve. Rákattintva azonnal felugrik a megerősítés és átállítható átvehetőre (`Ready for pickup`)!
  - 🟢 **Zöld bolt**: Személyes átvétel, ami már átvehető (`Ready for pickup`, vevő értesítve).
  - ⏳ **Piros homokóra**: Szállítmányra / anyagra váró rendelés. Rámutatva (hover) pontosan kiírja, hogy mire várunk (pl. `Szállítmányra vár: spc szállítmányra vár`).
  - 🏷️ **Narancssárga vonalkód**: PannonXP csomagküldés, ami még nincs felcímkézve.
  - 🏷️ **Zöld vonalkód**: PannonXP rendelés kinyomtatott / elkészített címkével (kiküldés után fulfilmentelhető).
  - 🚚 **Zöld teherautó**: Szállítónak elküldve (`sela megr.` címkés rendelés).
  - 🚚 **Narancs teherautó**: Szállítónak küldendő nyitott kiszállítás.
  - 🚚 **Türkiz teherautó**: Saját körben terítés alatt.
- **Automata Unit Tesztek**: 119/119 sikeres teszt (`node tests/unit_tests.js`).

### 2026. szeptember 3. - Ready for Pickup Címke Generálás Megszüntetése (`v3.7.2`)
- **Felesleges `ready for pickup` Címke (Tag) Létrehozásának Eltávolítása**:
  - Amikor az appban átállítunk egy személyes átvételes rendelést "Ready for pickup" (Átvehető) állapotra, a rendszer mostantól **kizárólag a natív Shopify GraphQL Fulfillment Order mutációt (`fulfillmentOrderLineItemsPreparedForPickup`) hajtja végre**, amely hivatalosan átállítja az állapotot és kiküldi a vevőnek az értesítést.
  - Megszüntettük a rendeléshez feleslegesen hozzáadott `ready for pickup` Shopify címke (`tags`) írását mind a szerveroldalon (`POST /api/shopify/ready-for-pickup`), mind az adatok beolvasásakor (`GET /api/shopify/orders`), mind a kliensoldali felületen (`js/app.js`).
- **Automata Unit Tesztek**: 109/109 sikeres teszt (`node tests/unit_tests.js`).

### 2026. szeptember 2. - Shopify Bolti Jogosultságok & GraphQL Ready for Pickup Élesítés (`v3.7.1`)
- **Shopify Bolti Helyszínek & Fulfillment Orders Jogosultságok**:
  - A Shopify Admin Develop Apps és a [.env](file:///c:/Users/Intel/OneDrive/Asztali%20g%C3%A9p/Projektek/Kiszed%C3%A9si%20jegyz%C3%A9k%20shopify/.env) beállításaiban élesítettük a teljes jogosultsági kört (`read_merchant_managed_fulfillment_orders`, `write_merchant_managed_fulfillment_orders`, `read_locations`, `read_third_party_fulfillment_orders`, `write_third_party_fulfillment_orders`).
- **Natív Bolti Átvehető Állapot (GraphQL `fulfillmentOrderLineItemsPreparedForPickup`)**:
  - A `POST /api/shopify/ready-for-pickup` szerver végpontot átállítottuk a Shopify modern GraphQL mutációjára (`fulfillmentOrderLineItemsPreparedForPickup`), amely hivatalosan átbillenti a bolti átvételi (Local Pickup) Fulfillment Ordert a Shopify Adminban, és kiküldi a vásárlónak az átvételi értesítőt.
- **Személyes Átvétel Számlázási Szabály Pontosítása (Utánvét vs Kártya)**:
  - Az utánvétes/helyszínen fizetendő személyes átvételes rendeléseknél (`isPickup && !isPaid`) kikapcsoltuk a "Számlázni!" figyelmeztetést (`hasNoInvoice: false`), mivel a számla/nyugtaadás személyesen a bolti átvételkor történik.
  - Az online/bankkártyával már kifizetett személyes átvételeknél (`isPickup && isPaid`) a "Számlázni!" jelzés továbbra is aktív marad mindaddig, amíg rá nem kerül a `számla ki` címke.
- **Sela Küldendőből Szállítmányra Várók Kizárása**:
  - A `Sela küldendő` státusz és gyors-szűrő mostantól automatikusan kiszűri és kihagyja azokat a rendeléseket, amelyek valamilyen anyagra vagy szállítmányra várnak (pl. `spc szállítmányra vár`, `profilra vár`, `tr szállítmányra vár`).
- **Erőteljes Vizuális Megkülönböztetés (Szállítmányra vár vs. Rossz szállítás)**:
  - **Szállítmányra váró címkék**: Mély Petrolkék / Cián (`#0e7490`) stílust és ciánkék homokóra ikont kaptak (`ph-hourglass-medium`), a felső szűrő chip is tiszta ciánkék lett.
  - **Rossz szállítás (2300 Ft)**: Megtartotta a harsány, vibráló Vérvörös (`#dc2626`) stílust nyolcszögű vészjelző ikonnal (`ph-warning-octagon`).
- **Szedőlista Termék Sorrendezés (7 Kategóriás Intelligens Prioritás)**:
  - A szedőlista nyomtatásában (`printer.js`), felületi nézetében (`ordersView.js`) és PDF generálásában (`printTemplates.js`) bevezetésre került a 7 szintű termékprioritás:
    1. **PVC falpanelek & "PB" kezdetű termékek** (`^pb` vagy `pvc falpanel/panel/falburkolat`)
    2. **SPC falpanelek** (`spc` és `falpanel`)
    3. **Padlózatok** (`padló` / `padlózat` — fekete háttérrel kiemelve)
    4. **Akusztikus falpanelek** (`aku` / `akusztikus`)
    5. **Ragasztók & Segédanyagok** (`ragasztó`, `hpr`, `t-rex`, `trex`)
    6. **Profilok** (`profil`)
    7. **Minden egyéb termék**
- **Automata Unit Tesztek**: 108/108 sikeres teszt (`node tests/unit_tests.js`).

### 2026. szeptember 1. - Sela & PannonXP Logisztikai Állapotkövetés, Gyors-Chipek, Ready for Pickup, Shopify Note & Címke Szerkesztők (`v3.7.0`)
- **Intelligens Logisztikai Állapot-Besorolás**:
  - A rendszer a Shopify címkék (`tags`) és a szállítási adatok alapján automatikusan megkülönbözteti a rendelések logisztikai státuszát:
    - 🚚 **`Sela küldendő`**: Kiszállításos rendelés, amin még nincs sem `sela megr.`, sem `PannonXP` címke, nincs belső járaton és nem személyes átvétel. Kiemelt narancssárga badge-et kap a sorban.
    - ✓ **`Sela elküldve`**: Már rendelkezik a `sela megr.` címkével. Zöld badge-et kap.
    - 🏷️ **`PannonXP`**: Rendelkezik a `PannonXP` címkével. Kék badge-et kap.
    - 🚚 **`Terítésben (Járaton)`**: Kiosztva a saját járatra. Türkiz badge.
    - 🟣 **`Személyes Átvétel`**: Boltban/raktárban átveendő rendelés. Lila háttérrel és lila badge-el kiemelve.
- **1-Kattintásos Gyors-Szűrő Chipek**:
  - 🔥 **`Sela küldendő (X db)`**: Egyetlen kattintással leszűri kizárólag a még elintézendő, szállítónak küldendő tételeket.
  - **`Sela elküldve (Y db)`**: Kilistázza a már leadott rendeléseket.
  - **`PannonXP (Z db)`**: Kilistázza a PannonXP címkés rendeléseket.
  - **`⏳ Szállítmányra vár (X db)`**: Kigyűjti a készlethiányos/beérkezésre váró tételeket.
- **Személyes Átvétel "Ready for pickup (Átvehető)" Állapot & Shopify Végpont**:
  - Elkészült a `POST /api/shopify/ready-for-pickup` szerver végpont, amely meghívja a natív Shopify Fulfillment Order `mark_as_ready_for_pickup` API-t, valamint hozzáadja a `ready for pickup` címkét a rendeléshez.
  - **Egyedi & Csoportos Átállítás**: A lenyitott kártyán és az alsó lebegő akciósávban is elérhető a **`[🔔 Átállítás: Ready for pickup]`** gomb.
  - **Vizuális Jelzés**: Az átvehető rendelések zöld pipa jelvényt kapnak a személyes átvétel badge mellett.
- **Közvetlen Shopify Címke Kezelés (`/api/shopify/update-tags`)**:
  - Elkészült az egyedi és csoportos Shopify címkefrissítő végpont a helyi szerveren.
  - **Kézi Átbillentés**: A rendelést lenyitva azonnal elérhető a **`[Sela címke hozzáadása / levétele]`** gomb, amely valós időben frissíti a Shopify API-t és az alkalmazás állapotát.
- **Lebegő Akciósáv Szállítói Export (`btn-hub-export-sela`)**:
  - Kijelölés után a **`[ 🚚 Szállítói Export (Sela) ]`** gomb letölti a táblázatot és felajánlja a rendelések automatikus megjelölését a `sela megr.` címkével.
- **Viszonteladó Tag Kivétel (`viszonteladó` / `viszonterladó`)**:
  - Ha a rendelés címkéi között szerepel a viszonteladó tag, a rendszer automatikusan kikapcsolja a díjbekérő követelményt (`needsProforma: false`) és a hiányzó számla figyelmeztetést (`hasNoInvoice: false`). Nem jelenik meg felesleges "Számlázni!" vagy "Díjbekérő szükséges" jelzés sem a sorok mellett, sem a statisztikákban.
- **Szállítmányra Váró Címkék Pontos Kilógó Megjelenítése (pl. `spc szállítmányra vár`, `profilra vár`, `tr szállítmányra vár`)**:
  - A rendszer kigyűjti a Shopify rendeléshez tartozó összes árura/szállítmányra váró taget, és a sor bal oldalán lévő kilógó címkesávban pontosan a megadott szöveggel jeleníti meg őket elegáns mély rubinvörös (`#be123c`) `[ ⌛ CÍMKE SZÖVEGE ]` jelvényként.
- **Bal Oldali Színes Szegélycsíkok Eltávolítása**:
  - Eltávolítottuk a zavaró, nehezen értelmezhető zöld, kék, narancssárga és lila oldalsó szegélycsíkokat. A sorok letisztultak, csak a hibás szállítás kapott piros kiemelést, illetve a személyes átvétel a jól látható lila háttérrel emelkedik ki.
- **Díjbekérő Címkék Finomhangolása ("Díjbek szükséges" & "Díjbeket várjuk")**:
  - A korábbi "Díjbekérő szükséges" feliratot lerövidítettük a kért **`Díjbek szükséges`** címkére.
  - Ha a rendeléshez hozzá van adva a `díjbek.ki` címke, de még nincs `számla ki`, a sor bal oldalán automatikusan megjelenik az új indigókék **`[ ⏳ Díjbeket várjuk ]`** címke!
  - Amint rákerül a `számla ki` címke, mind a számla, mind a díjbekérő figyelmeztetés automatikusan eltűnik.
- **Közvetlen Shopify Megjegyzés (Notes) Ikon & Élő Szerkesztő Modal**:
  - Minden egyes rendelési sorban (a rendelésszám mellett) megjelent egy interaktív Notes ikon.
  - Ha van megjegyzés a rendeléshez, az ikon sárga kiemeléssel jelzi a szöveget, és fölé húzva az egeret azonnal olvasható a megjegyzés.
  - Az ikonra kattintva megnyílik a modern **Megjegyzés Szerkesztő Ablak**, ahonnan a megjegyzés 1 kattintással közvetlenül menthető a Shopify-ba (`POST /api/shopify/update-note`) és az appban is azonnal frissül!
- **Automata Unit Tesztek**: 83/83 sikeres teszt (`node tests/unit_tests.js`).

### 2026. augusztus 31. - Terméknév Tisztító (Beérkezés & Dátum Szűrés), CSV Import Fix & Favicon (`v3.6.5`)
- **Intelligens Terméknév & Beérkezési Dátum Szűrés (`cleanItemNameForMapping`)**:
  - A Shopify terméknevekben szereplő logisztikai megjegyzések (pl. `Beérkezés:08.27`, `(Beérkezés: 08.27)`, `[Várható érkezés: 2026.09.01]`, `Preorder`, `Előrendelés`) korábban szétcsúsztatták a termékfelismerést és ábécébe rendezett furcsa kulcsokat eredményeztek (`"27 akusztikus beérkezés:08..."`).
  - Beépítettünk egy automatikus szűrőt, amely levágja ezeket a változó dátumokat, így a beérkezéses rendelések automatikusan és hibátlanul összekapcsolódnak a már létező termékbeállításokkal (pl. `Wide Pecan`).
- **Emberileg Olvasható Terméknév a PannonXP Beállító Modalban**:
  - A felugró ablakban a technikai kulcs helyett a termék valódi, eredeti neve jelenik meg: `Kiválasztott termék: "Prémium Akusztikus Falpanel - Wide Pecan (278x60cm)"`.
- **CSV Import & Reset ReferenceError Javítása (`js/app.js`)**:
  - Megszüntettük az `Uncaught (in promise) ReferenceError: activeMainTab is not defined` és `pxpOrders is not defined` hibákat a központi Store metódusok következetes használatával.
- **Beágyazott SVG Favicon**:
  - Az `index.html`-be beépítettünk egy beágyazott SVG raktári ikont, megszüntetve a `favicon.ico 404` hibát.
- **Automata Unit Tesztek**: 51/51 sikeres teszt (`node tests/unit_tests.js`).

### 2026. augusztus 29. (18. frissítés) - Közvetlen Shopify Rendelés Teljesítés (Egyedi & Csoportos Fulfill) (`v3.6.4`)
- **Közvetlen Shopify Teljesítés (Fulfillment)**:
  - Elkészült a `/api/shopify/fulfill` és a `/api/shopify/bulk-fulfill` végpont.
  - **Egyedi Teljesítés**: A rendelést lenyitva a tételek felett megjelenik a **`[📦 Teljesítés a Shopify-ban (Fulfill)]`** gomb.
  - **Csoportos Teljesítés**: Az alsó lebegő akciósávban kijelölt rendelések egyszerre teljesíthetők a **`[📦 Teljesítés Shopify-ban (X)]`** gombbal.
- **Valós Idejű Állapotfrissítés**:
  - A teljesített rendelések azonnal átváltanak szürke `● Fulfilled` státuszra, és átkerülnek a `Fulfilled` fül alá a Shopify és a vevők azonnali értesítésével.
- **Új Terítési Szűrő Chipek**:
  - 🚚 **`Terítésben (X)`**: Egyetlen kattintással leszűri az összes járatra kiosztott rendelést.
  - 📦 **`Járatra vár (Y)`**: Kigyűjti azokat a rendeléseket, amelyek még nincsenek beosztva egyetlen kiszállítási körbe sem.
- **Részletes Kiszállítási Kártya a Lenyitható Panelben**:
  - Megjeleníti a kiszállítás tervezett napját, a futár és cég nevét, a fizetés és elszámolás állapotát, valamint a járat azonosítóját.
- **Interaktív Akció-Chipek (Action Chips)**:
  - 🔴 `Rossz szállítás (4)`, 🔵 `Díjbekérő kell (16)`, 🟡 `Számlázni! (46)`, 🟣 `Személyes Átvétel (44)`, `Csak Kiszállítás (82)`, 💵 `Utánvét (127)`, 🏦 `Függő Utalás (1)`.
  - Intelligens kapcsoló: egyetlen kattintással szűr, ismételt kattintásra visszaáll `Mind`-re.
- **Shopify Eredeti Szürke Fulfilled & Cancelled Badge-ek**:
  - A `Fulfilled` státusz natív szürke hátteret (`#e4e5e7`), sötétszürke szöveget (`#303030`) és szürke pontot kapott, a `Cancelled` szintén szürke.

### 2026. augusztus 29. (3. frissítés) - Személyes Átvétel Elkülönítése & Nagyfelbontású Kép Lightbox (`v3.4.2`)
- **Személyes Átvétel Intelligens Kezelése**:
  - A rendszer a `tags` (`személyes`, `pickup`) és a `shipping_lines` alapján automatikusan azonosítja a személyes/raktári átvételt (`order.isPickup`).
  - **Külön Szűrő & Statisztika**: A Rendelésáttekintő tetején külön gomb és számláló jelenik meg: `Személyes Átvétel (X)`, valamint a `Kiszállításra vár` gomb csak a valós kiszállítós rendeléseket listázza.
  - **Szállítás Módja Szűrő**: Legördülő szűrő: `Szállítás: Mind`, `Csak Kiszállítás`, `Csak Személyes Átvétel`.
  - **Vizuális Megkülönböztetés**: Lila bal oldali szegély és `Személyes átvétel` jelvény a sorban.
  - **Átjárhatóság**: Ha nem jönnek érte és mégis ki kell szállítani, a checkbox bepipálásával 1 kattintással átküldhető a Szedőlistába (`Átdobás Szedőlistába`), ahol szintén jól látható a `Személyes átvétel` jelvény.
- **Nagyfelbontású Termékképek & Lightbox**:
  - A kártyákon megnöveltük a miniatűrök méretét (`74x74px`) kontrasztos, tiszta megjelenítéssel (`image-rendering: -webkit-optimize-contrast`).
  - **Kattintásra Nagyítás (Lightbox)**: A termékképre kattintva egy elegáns, sötétített hátterű ablakban megjelenik a termék nagy felbontású képe a nevével és variánsával.

### 2026. augusztus 29. (2. frissítés) - Szuper-Kompakt Rendelésáttekintő, Lenyitható Termékképek & Teljes Emoji-mentesítés (`v3.4.1`)
- **Szuper-Kompakt Sűrű Táblázat**:
  - Tömör, letisztult sormagasság és professzionális elrendezés (egyszerre 15-20 rendelés látható a képernyőn).
  - Oszlopok: Kijelölő, Lenyitó Chevron, Rendelésszám, Dátum, Címzett & Település, Tételek gyorsnézet, Összeg & Fizetési mód, Státusz, Címkék.
- **Lenyitható Termékrészletező Panel KÉPEKKEL**:
  - A szerver (`server.js`) a Shopify API-ból automatikusan lekéri és a tételekhez csatolja a valós termékképeket (`image_url`).
  - Sorra kattintva lenyílik a részletező nézet: nagy felbontású thumbnail képek, megnevezés, variáns, SKU, darabszám és egyedi/összesített ár, részletes szállítási cím, telefon és Notes megjegyzések.
- **0 Emoji Szabály (Teljes Rendszertakarítás)**:
  - Az egész alkalmazásból (`js/`, `index.html`) eltávolítottuk az összes emojit (📦, ⏳, 💵, 💳, 🏦, ⚠️, ✓, ✏️ stb.).
  - Helyettük professzionális, egységes Phosphor vektoros SVG ikonokat és tiszta tipográfiát alkalmazunk.
- **Görgetési Javítás (Flexbox Min-Height)**:
  - A szülő tárolókon beállítottuk a `min-height: 0; overflow-y: auto;` szabályokat, így a szedőlista és a rendelésáttekintő is folyamatosan és akadálymentesen görgethető.

### 2026. augusztus 29. - Rendelésáttekintő (Shopify Order Hub) & Élő API Integráció (`v3.4.0`)
- **Shopify OAuth Hitelesítés és API Proxy (`server.js`)**:
  - Létrehoztuk a közvetlen Shopify Dev Dashboard integrációt (`GET /api/shopify/auth`, `GET /api/auth/callback`, `GET /api/shopify/orders`, `GET /api/shopify/status`).
  - A szerver automatikusan lekéri és a `.env` fájlban tárolja a végleges, le nem járó `SHOPIFY_ACCESS_TOKEN`-t.
- **Központi Modell Átalakító (`js/services/shopifyApiService.js`)**:
  - Elkészítettük az élő API JSON objektumokat a belső app rendelési formátumra alakító modult, megőrizve az összes létező üzleti szabályt (név- és címtisztítás, hibadetektálás, profil összevonás, PannonXP referenciaszám és csomagkalkuláció).
- **Rendelésáttekintő Nézet Modul (`js/views/orderOverviewView.js`)**:
  - **Gyors Statisztikai Kártyák**: Összes, Teljesítetlen, Függő Utalás, Utánvétes, Teljesített rendelések számlálói 1-kattintásos szűrőfunkcióval.
  - **Kereső & Többszörös Szűrőrendszer**: Valós idejű szöveges kereső, Fulfillment státusz, Pénzügyi státusz, Dinamikusan generált Shopify Tag szűrő és Dátumszűrő.
  - **Táblázat & Kijelölések**: Checkboxos kijelölés soronként vagy egyszerre az összes látható elemre, státusz badge-ekkel és tételelőnézettel.
  - **Lebegő Csoportos Akciósáv (Floating Action Bar)**: Kijelölés esetén felúszó sáv: `[ 📋 Átdobás Szedőlistába ]`, `[ 🏷️ Átdobás PannonXP-be ]`, `[ 🚚 Szállítói Export ]`.
- **Központosított Store Állapotkezelés (`js/store/state.js`)**:
  - Bővítettük a Store-t `shopifyHubOrders`, `selectedHubOrderIds`, `hubFilters` állapotokkal és tiszta setter/getter függvényekkel.
- **Automata Unit Tesztek Bővítése**: 48/48 sikeres teszt (`node tests/unit_tests.js`).

### 2026. augusztus 28. (2. session) - Előzmények és Elszámolás Felület Tisztítása & Konszolidáció
- **Redundáns Fülek Megszüntetése**: Eltávolítottuk a felesleges "Szedések" és "Rendelések" füleket a History (Előzmények) felugró ablakból. Az Előzmények immár közvetlenül az "Elszámolások" felületet jeleníti meg.
- **Kompakt Kártya Akciógombok**: Az elszámolás kártyák fejléceibe és soraiba beépítettük a kompakt, helytakarékos akciógombokat: Nyomtatások (Szedőlista, Szállítólevél, Összesítő, Csomag), Kör visszatöltése és Kör törlése (Szemetesbe küldés).
- **Kör Betöltése Hibajavítás**: Kijavítottuk a `btn-load-run` eseménykezelőjét a `js/app.js`-ben (`e.target.closest('button')`), biztosítva a megbízható működést az ikonos gomboknál is.
- **Modultakarítás**: Töröltük a szükségtelenné vált `js/views/history/historyList.js` és `historyOrders.js` fájlokat, megtisztítottuk a `historyView.js` és `js/app.js` importjait.

### 2026. augusztus 28. - Független Importálás és Lista Törlése
- **Importálás Szétválasztása**: A Shopify CSV beolvasása mostantól az éppen aktív fül alapján történik. Ha a "Szedőlista" fülön történik az importálás, az adatok kizárólag a szedőlistába kerülnek bele (`Store.orders`). Ha a "PannonXP Címkék" fülön, akkor kizárólag a PannonXP táblázatba.
- **Automatikus Szinkronizáció Eltávolítása**: Eltávolítottuk a `syncPxpOrdersFromStore` funkciót, így a fülek között való átkattintáskor már nem húzódnak át automatikusan a rendelések. A két modul immár 100%-ban függetlenül működik.
- **Lista Törlése (Kuka) Gomb Optimalizálása**: A piros kuka ikonnal elindított lista ürítése immár nem mindkét listát törli, hanem intelligensen csak annak a fülnek a listáját, amelyen éppen áll a felhasználó.

### 2026. augusztus 13. - Rendszerszintű Csomagolási Architektúra & Vegyes Panelek Kombinálása (`v3.3.0`)
- **💡 1. Ragasztó-elnyelés Explicit Szabály (`allowAdhesiveInside`)**:
  - Megszüntettük a merev kategóriafüggést. Minden kategória kapott egy explicit `allowAdhesiveInside` tulajdonságot, amely a **Beállítások -> Termék & Csomagolási Szabályok** fülön felületen is ki-be pipálható (`[x] Ragasztó / segédanyag bepakolható a dobozba (<7 db esetén)`).
  - **Akusztikus panelek (`cat_acoustic`, `cat_wide_acoustic`)**: `allowAdhesiveInside: true` (1-6 db ragasztó automatikusan bekerül a panel dobozába extra csomag nyitása nélkül).
  - **SPC padlók (`cat_spcwood`, `cat_spcstone`)**: `allowAdhesiveInside: false` (A ragasztó nem kerül az SPC dobozba, mindenképp külön 2. dobozt kap).
- **💡 2. Ragasztó Kapacitási és Dobozolási Szabályok (`cat_adhesive`)**:
  - Egy különálló ragasztó doboz kapacitása **15 db** flakonig terjed (`maxQty: 15`).
  - **1-6 db ragasztó**: Akupanel esetén elnyelve a panel dobozban. SPC esetén 1 külön doboz (1.3 kg).
  - **7-15 db ragasztó**: Akupanel és SPC esetén is 1 külön dobozba kerül.
  - **16-30 db ragasztó**: Akupanel és SPC esetén is 2 külön dobozba kerül.
- **💡 3. Vegyes Panelek Összevont Csomagolása (`packagingGroup`)**:
  - Bevezettük a `packagingGroup` mezőt (pl. `acoustic_family`). Amennyiben a vásárló többféle akusztikus panelt rendel (pl. 2 db Sima Akusztikus + 2 db Wide Akusztikus), a rendszer az azonos családba tartozó tételeket összeadja (4 db panel).
  - **Csomagszám**: Mivel a 4 db panel belefér az 5 db-os maximális dobozkapacitásba, a rendszer **1 közös dobozba** sorolja őket 2 külön csomag helyett.
  - **Méret**: A csomag méretét a családban lévő legszélesebb/legnagyobb panel (Wide panel) méretkártyájából veszi át.
  - **Összsúly**: A csomag súlya a benne lévő egyedi tételek pontos összsúlya (pl. 2×6.5 kg + 2×9.0 kg = 31,0 kg).
- **Automata Unit Tesztek**: 32/32 sikeres teszt (`node tests/unit_tests.js`).

- **💡 1. TANULSÁG (Üzleti / Elszámolási Szabály)**:
  - **Probléma**: Amikor a raktárban létrejött egy új terítés (pl. *Bábel Ádám* fuvar), az a futár lebuktatása/elszámolása előtt automatikusan sárga *Függő KP* státuszt és *KP megjött* gombot kapott. Ez téves volt, mert a sofőrnél lévő utánvétes fizetésekről még nem lehet tudni, hogy KP-s vagy Kártyás lesz-e.
  - **Szabály**: Egy terítés **KIZÁRÓLAG akkor számít elszámoltnak/lebuktatottnak**, ha az elszámolási ablakban explicit megerősítették (`run.isSettled === true` vagy `typeof run.settledAt !== 'undefined'`). SOHA nem szabad feltételezni vagy megelőlegezni a KP fizetési módot a lebuktatás előtt.
  - **Megoldás**: Új/elszámolatlan fuvarok esetén a felület letisztult **fehér `⏳ Elszámolásra vár: [Összeg] Ft`** státusz badge-et, fehér rendelési chipeket és az elsődleges kék **`📋 Elszámolás`** gombot jeleníti meg. Az elszámolási ablak elmentése után váltanak át a tételek a valós KP (sárga Függő KP) és Kártya (kék Utalásra vár) státuszokra.
- **💡 2. TANULSÁG (Több Kódbázis / Mappa Szinkronizálási Szabály)**:
  - **Probléma**: Az éles felhős Vercel alkalmazás a `PABUonSteroid` (`c:\Users\CH_001\Desktop\Projektek\PABUonSteroid`) mappából és GitHub tárolóból (`5926q6swn2-bot/PABUonSteroid.git`) frissül.
  - **Szabály**: Bármilyen fejlesztésnél a módosításokat **mindkét projektmappába (`PABUonSteroid` és `kiszedesi`) és mindkét GitHub repóba ki kell pusholni**, biztosítva, hogy az élő Vercel felület és a helyi/teszt környezetek mindig 100%-os szinkronban maradjanak!

---

### 2026. augusztus 5. - Utánvét Elszámolás Export Javítás & Kártyás Utánvétek Kezelése (`v3.1.1`)
- **A hiba gyökere**:
  1. Az elszámolások CSV exportőrében (`ExporterService.exportAccountingToCsv`) a kártyás utánvétek (`paymentMethods = 'card'` vagy bontott fizetés) és az objektum alapú elszámolási státuszok (`paymentStatusMap`) esetén a kód szigorú string egyenlőséget (`status === 'pending'`) vizsgálott.
  2. Korábban mentett Firestore dokumentumoknál, ha az elszámolási dialogusban a futár lebukásakor elmentették a kört, a korábbi kód tévesen `paymentStatusMap[o.id] = 'received'` státuszt írt az adatbázisba a kártyás rendelésekhez is. Az adatok betöltésekor a rendszer ebből azt hitte, hogy a kártyás pénz már beérkezett a cég számlájára.
- **Központi Fizetési Segédmodul (`js/utils/paymentUtils.js`) & Szigorú Kártyás Utalási Szabály**:
  - Létrehoztuk a `getPaymentDetails` és `getRunPaymentTotals` egységes segédfüggvényeket.
  - Szigorítottuk a kártyás és átutalásos tételek elszámolását: egy kártyás utánvét **kizárólag akkor tekinthető beérkezettnek (`receivedCard`)**, ha a szállítási kör dokumentumában a banki átutalás explicit igazolva lett (`run.isTransferSettled === true`). Mindaddig, amíg a kártyás átutalás le nem zárult, a kártyás összeg automatikusan és felülbírálhatatlanul **`pendingCard` (Kártyás utalásra vár)** státuszban marad, még akkor is, ha a Firestore-ban korábban tévesen `received` felirat volt mentve!
- **Kártyás fizetések alapértelmezett függő státusza**: Az elszámolási ablakban (`showSettlementDialog`) a Bankkártyás (`💳 Kártya`) és Banki utalás (`🏦 Utalás`) fizetési módok kiválasztásakor a *"Nálunk van"* jelölőnégyzet alapértelmezés szerint KIKAPCSOLVA marad.
- **Következetes Kör Státusz & Vizuális Jelzések**: Egy szállítási kör kizárólag akkor kaphat zöld *"Elszámolva"* státuszt, ha az ÖSSZES megrendelésének kártyás és készpénzes utánvétje hiánytalanul beérkezett (`isFullySettled`). A kártyás utalásra váró fuvarok kék *"Utalásra vár"* jelvényt kapnak.
- **Unit Tesztek Bővítése**: A `tests/unit_tests.js` tesztkészletet kibővítettük a kártyás, bontott és legacy Firestore felülbírálási elszámolások ellenőrzésével (24/24 sikeres unit teszt).

### 2026. augusztus 4. - PannonXP Import Hiba Megfejtése & ES Modul Szegmentáció Megszüntetése
- **Probléma Gyökere (ES Module Fragmentation)**: A böngésző konzolban megjelenő `getProductMappings called before initializeMappings! Returning local storage fallback.` és `getPackagingRules called before initialize! Returning local storage fallback.` figyelmeztetéseket az okozta, hogy a belső JS fájlok eltérő URL query paraméterekkel (`?v=193`, `?v=206`, `?v=150`, `?v=173`, `?v=42` stb.) importálták egymást. Az ES modul specifikáció szerint a böngészők a query paramétereket eltérő modul-példányként kezelik, ezért a `pannonxp.js` szolgáltatás kétszer példányosodott: az `app.js` a `v=206`-os példányt inicializálta a Firestore-ból, míg a `shopify.js` a `v=193`-as nem-inicializált példányról próbálta lekérni a termékrövidítéseket (`mappingsCache = null`). Ezért a rendelések importálásakor és referenciaszám-generálásakor a termékrövidítések és csomagolási szabályok üresek maradtak.
- **Belső Modul Importok Megtisztítása**: Eltávolítottuk az összes belső JS fájlból (`app.js`, `shopify.js`, `pannonxp.js`, `history.js`, `manualOrderController.js`, `pannonxpView.js`, `pannonxpTable.js`, `pannonxpSettings.js`, `historyList.js`, `historyOrders.js`, `historyAccounting.js`, `historyTrash.js`, `auditView.js`, `stats.js`) a verziós számokat a relatív `import` utasításokból. Így a teljes alkalmazás egyetlen közös Singleton példányt használ az összes szolgáltatásból (`PannonXPService`, `HistoryManager`, `firebase-config` stb.).
- **Local Dev Server & Verziókezelés**: A `server.js` fut, letiltott böngésző gyorsítótárazással (`no-cache`). Az `index.html`-ben a fő belépési pont verzióját `v3.1.0`-ra frissítettük.
- **Azonnali CSV Szinkronizáció Minden Fülön (`processShopifyData`)**: Megszüntettük azt a hibát, amely miatt a CSV behúzásakor az adatok csak az éppen aktív fülön dolgozódtak fel, így a PannonXP fül üres maradt, amíg a felhasználó nem váltott fület vissza-hova. A `processShopifyData` funkciót és a fülváltó eseménykezelőt úgy módosítottuk, hogy a CSV betöltésekor azonnal, szinkron módon feltöltse és kirajzolja mind a Szedőlista (`Store.orders`), mind a PannonXP címkenyomtató (`pxpOrders`) rendeléseit, függetlenül attól, hogy melyik fülön áll a felhasználó.
- **Automata Unit Tesztek**: 9/9 sikeres teszt lefutott (`node tests/unit_tests.js`).

### 2026. augusztus 3. (2. session) - Architektúra & Moduláris Nézet-szétbontás (2. Fázis)
- **Store Állapotkezelés Központosítása**: Bővítettük a `js/store/state.js` központi Store objektumot (`activeMainTab`, `pxpOrders` állapotokkal, getterekkel és setterekkel).
- **`historyView.js` Moduláris Szétbontása (139 KB)**: A korábbi 2084 soros monolitikus nézetfájlt 4 tiszta, független al-modulra bontottuk szét a `js/views/history/` könyvtárban:
  - `historyList.js`: Szedések fül, kártyák és nyomtatás.
  - `historyOrders.js`: Rendelések fül és keresési találatok.
  - `historyAccounting.js`: Elszámolások fül és a részletes `showSettlementDialog` elszámoló modal.
  - `historyTrash.js`: Szemetes fül és 90 napos visszaállítási műveletek.
- **`pannonxpView.js` Moduláris Szétbontása (122 KB)**: A korábbi 1867 soros nézetfájlt 2 al-modulra bontottuk a `js/views/pannonxp/` könyvtárban:
  - `pannonxpTable.js`: Címzettek és csomagok táblázata, inline szerkesztők és csomagkalkulációk.
  - `pannonxpSettings.js`: Rendszerbeállítások modal, feladó profilok, termékrövidítések és csomagolási kategória modalok.
- **Verziófrissítés & Cache-Busting**: Emeltük az `APP_CONFIG.VERSION` verziószámot `v3.1.0`-ra a `js/config.js` fájlban.
- **Automata Unit Tesztek**: 9/9 sikeres teszt a `node tests/unit_tests.js` lefuttatásával.

### 2026. augusztus 3. - Rendszer Architektúra Refaktorálás & Kód Optimalizálás (1. Fázis)
- **Gyökérkönyvtár megtisztítása**: Az átmeneti refaktoráló scriptek és diff fájlok (`clean_index.js`, `cleanup_merge.js`, `fix_app_js.js`, `fix_events.js`, `app_diff.txt`, `replace_step1.ps1`, `replace_step2.ps1`, `replace_step3.ps1`) elcsomagolásra és átmozgatásra kerültek a `scratch/legacy/` mappába.
- **Központi konfiguráció & Szerver No-Cache**: Létrejött a `js/config.js` központi verziókezelő modul (`APP_CONFIG.VERSION = 'v3.0.1'`), a `server.js` pedig automatikus `Cache-Control: no-cache, no-store, must-revalidate` fejléceket kapott, így fejlesztés alatt nem ragadnak be a módosított `.js` modulok a böngésző gyorsítótárában.
- **Moduláris Auth Szolgáltatás**: Az `index.html` aljáról kiszerveztük az beágyazott inline belépési modult az önálló `js/services/auth.js` ES modulba, kiküszöbölve az HTML kódba égetett scriptet.
- **Automata Unit Tesztek**: Elkészítettük a `tests/unit_tests.js` tesztkészletet Node.js alá a címtisztítás (`cleanAddress`), névtisztítás (`cleanName`), ékezet-korrekció (`fixHungarianAccents`) és telefonszám-formázás (`formatHungarianPhoneNumber`) azonnali ellenőrzésére (9/9 sikeres teszt).
- **Nyomtatási Duplikáció Megszüntetése**: A `js/services/printer.js` átállt a `printTemplates.js` központi moduláris nyomtatási sablonjainak használatára, megszüntetve a duplikált HTML generáló kódsorokat.

### 2026. július 23. - Hiányos Címek Kiszűrése & PannonXP Import Hibák Megoldása
- **Hiányzó utcanév (hiányos cím) detektálása**: Ha a vásárló elmulasztotta megadni az utcanevet, és csak egy szám (pl. `24` vagy `12`) szerepel a szállítási címnél, a rendszer mostantól felismeri ezt a hiányosságot, letiltja a nyomtatást/exportálást, és feltűnő piros figyelmeztetéssel jelzi: *„⚠️ Hiányos szállítási cím! (Hívni kell a vásárlót)”*.
- **PannonXP Számlázási és exportőri beállítások visszavonása**: A felhasználó kérésére teljesen visszaállítottuk a PannonXP CSV-generátor működését a korábbi állapotra (visszaálltak a számlázási oszlopok alapértelmezett értékei).
- **Sortörések és pontosvesszők automatikus szűrése a CSV-ben**: Kiderült, hogy a beállításokban szereplő „Tartalom” (szl_tartalom) vagy a vevőcímek/jegyzetek sortörést (új sort) tartalmaztak, ami elvágta a CSV sorát. Bevezettünk egy automatikus szűrőt (`escapeCsvValue`), ami a pontosvesszőket és sortöréseket szóközre cseréli.
- **PannonXP 1024 karakteres sor-korlát áthidalása (csoportosítás)**: Felfedeztük, hogy a PannonXP futárszoftver CSV beolvasója elavult, 1024 karakteres puffer-limittel rendelkezik, így a nagyon hosszú sorokat (pl. 7 csomag részletes JSON adataival, ami 1112 karakter hosszú sorhoz vezetett) pontosan az 1024. karakternél (a `falpanel, falpane` és `lekhez kiegészítő` szavak között) elvágta, és új sorba tette a maradékot, szétcsúsztatva a táblázatot. Ennek javítására bevezettük a **csomagok csoportosítását** (`db` paraméter használatával) a JSON generátorban, így a 7 különálló JSON elem helyett az azonos típusú csomagok összevontan szerepelnek (pl. 6db panel egy csoportban + 1db panel a másikban). Ezzel a CSV sora 1112 karakterről 763 karakterre rövidült, teljesen elkerülve a 1024 karakteres elcsúszási korlátot.
- **Cache-Busting és verziókezelés**: Megemeltük az érintett fájlok importálási cache verzióit `v193`-ra a böngészők frissítésének kikényszerítéséhez.

### 2026. július 22. - PannonXP Elszámolás Függő Összegek Javítása
- **Szállítócég függő követelések kalkulációjának korrekciója**: Kijavítottuk az elszámolás nézetben (`js/views/historyView.js`) a szállítócégek (futárok) csoportosításánál megjelenő „Függőben” összeget. Korábban a rendszer a még le nem zárt körök esetén vakon hozzáadta az összes utánvétes rendelés teljes értékét, figyelmen kívül hagyva, hogy az egyes rendelések már beérkezettnek (`received`) vagy kiesettnek/meghiúsultnak (`uncollected`) voltak jelölve. Ezentúl a futár függő összege pontosan megegyezik a még ténylegesen átvételre vagy utalásra váró (függő státuszú) tételek összegével.
- **Cache-Busting és verziókezelés**: Megemeltük az érintett fájlok importálási cache verzióit `v188`-re a böngészők frissítésének kikényszerítéséhez.

### 2026. július 21. - Termék Mennyiség Szerkesztés & Cég név megtisztítása
- **Szerkeszthető termékmennyiségek**: A PannonXP táblázat Címzett Név oszlopában megjelenő termékek darabszámai ezentúl szerkeszthető input mezők. A darabszám módosításakor a rendszer valós időben újraszámolja a referenciaszámokat, a csomagszámokat és az összsúlyt. Ha a mennyiséget 0-ra állítja a felhasználó, a termék automatikusan törlődik a címkéből.
- **Cég név megtisztítása**: Ha a szállítási cég neve megegyezik a megrendelő (vevő) nevével, a rendszer ezen a mezőn is automatikusan lefuttatja a név-tisztítási szabályokat (accent javítás, zárójelek/számok eltávolítása, 4. névtag levágása stb.). Ezen felül a cégneveken mostantól függetlenül is **mindig lefut a magyar ékezet-javító eljárás (`fixHungarianAccents`)**, így pl. a `Lányi lorànd` vagy `Bànhidai` típusú, rossz irányba álló ékezetek automatikusan javításra kerülnek.
- **Cím ellenőrzés egyszerűsítése (Csak irányítószám)**: Eltávolítottuk a szigorú utca/házszám ellenőrzési logikát, ami miatt sokszor tévesen blokkolta a jó címeket a rendszer. Ezentúl a címeknél **kizárólag az irányítószám (ZIP) meglétét ellenőrzi a program**, így elkerülve a téves figyelmeztetéseket, miközben az ékezet-javítás az utcaneveknél is automatikusan lefut.
- **Házszám és perjel ismétlődések szűrése**: Továbbfejlesztettük az automatikus címtisztítót (`cleanAddress`), hogy felismerje és automatikusan leegyszerűsítse az ismételt perjelekkel és házszámokkal elrontott címeket (pl. a `38/38/38/38` mintákat egyetlen `38`-ra redukálja).
- **Cache-Busting és verziókezelés**: Megemeltük az érintett fájlok importálási cache verzióit `v187`-re a böngészők frissítésének kikényszerítéséhez.

### 2026. július 20. - Ragasztó Csomagolás Szabály Módosítása, Névtisztító & Címtisztító Rendszer
- **Külön csomag ragasztóknak 7 db felett**: Módosítottuk a PannonXP csomagolási algoritmusát (`js/services/pannonxp.js`). Ezentúl, ha egy megrendelésben 7 vagy annál több ragasztó szerepel, a rendszer nem teszi be őket az akusztikus panelek mellé doboz nélkül, hanem mindenképp külön dobozba (csomagba) helyezi el őket a beállított csomagolási szabályoknak megfelelően.
- **Szerkeszthető feladó profil név**: A PannonXP beállítások panelen mostantól a feladó profil neve (Megjelenítési név) is közvetlenül szerkeszthetővé vált.
- **Automatikus név-tisztítás (`cleanName`)**: Bevezettünk egy globális névtisztító eljárást a [js/services/shopify.js](file:///c:/Users/CH_001/Desktop/Projektek/kiszedesi/js/services/shopify.js) fájlban, ami mind a feladó (profil név, cég név, kapcsolattartó név), mind a címzett (Shopify CSV importált és manuálisan megadott vevőnevek) esetén automatikusan lefut:
  - Kijavítja a hibás irányba álló elütött ékezeteket.
  - Törli a zárójeleket és a bennük szereplő kiegészítéseket (pl. `(raktár)` $\rightarrow$ törlésre kerül).
  - Kiszűri a pontokat, számokat és bármilyen egyéb nem betű karaktert (szóközök és kötőjelek megtartása mellett).
  - Rendbe rakja a dupla szóközöket.
  - **4 vagy több szóból álló nevek levágása**: Ha a megtisztított név 4 vagy több szóból áll, a rendszer automatikusan levágja a név legutolsó tagját (pl. `Kovács István Tamás Gábor` $\rightarrow$ `Kovács István Tamás`).
- **Szerkeszthető vevőnevek a táblázatban**: A PannonXP táblázatban a „Címzett Név” Plain Text helyett szintén szerkeszthető input mezővé vált, így exportálás előtt a vevők nevei is teljesen átírhatóak.
- **Automatikus szállítási cím deduplikáció (`cleanAddress`)**: Létrehoztunk egy új címtisztító funkciót a [js/services/shopify.js](file:///c:/Users/CH_001/Desktop/Projektek/kiszedesi/js/services/shopify.js) fájlban, amely automatikusan lefut a Shopify CSV beolvasásakor és a PannonXP táblázatbeli kézi címszerkesztéskor:
  - Felismeri és törli az ismétlődő, szóközökkel elválasztott házszámszerű mintázatokat (pl. `30/3 30/3` $\rightarrow$ `30/3`).
  - Felismeri és deduplikálja a perjelekkel halmozott házszámokat (pl. `30/3/3` $\rightarrow$ `30/3`).
  - Eltávolítja a vesszővel elválasztott ismétlődő címkomponenseket vagy utótagokat (pl. `Fő utca 30/3, 30/3` $\rightarrow$ `Fő utca 30/3`).
- **Automatikus címvalidáció (`checkAddressValidity`)**: Bevezettünk egy szigorú ellenőrzést a hiányos vagy hibás szállítási címek kiszűrésére (pl. ha a közterület hiányzik és csak a házszám van megadva, mint a `3521, MISKOLC-SZIRMA, 4`, vagy ha a házszám hiányzik):
  - Az ilyen hibás rendelések sora piros színnel jelenik meg és figyelmeztető szöveget kap.
  - Az exportálás gomb le van tiltva, amíg ki nem javítják a hibás címet.
- **Címke referencia formátum módosítása**: Módosítottuk az automatikus referencia generálást (`generateDefaultReference`) a [js/services/shopify.js](file:///c:/Users/CH_001/Desktop/Projektek/kiszedesi/js/services/shopify.js) fájlban a felhasználó kérése alapján:
  - **Nincsenek vesszők**: A rövidítések nem vesszővel, hanem egyszerű szóközzel vannak elválasztva (pl. `AP5-5 RAG1`).
  - **Nincsenek felesleges szóközök**: A termék rövidítése és a hozzá tartozó mennyiség/csomagszámok között nincs szóköz (pl. `AP 5-5` $\rightarrow$ `AP5-5`).
- **Közterület címek vesszőinek eltávolítása**: Eltávolítottuk a vesszőket a közterületek/utcák címeiből (pl. `Jókai utca, 4` helyett `Jókai utca 4` lesz) a Shopify importálásakor, a PannonXP táblázatbeli kézi szerkesztéskor és a végső CSV exportáláskor is.
- **Cím ellenőrzés robusztussági hibajavítás**: Kijavítottuk a hibát, ami miatt a meglévő vagy korábban mentett rendelések esetén a hiányzó részletes címadat-mezők miatt a validátor akkor is hibát jelzett, ha a cím egyébként helyes volt:
  - Ha az ellenőrzéskor hiányzik az irányítószám vagy utca mező, a rendszer on-the-fly felbontja a teljes cím szövegét, így megbízhatóan felismeri a helyes címeket.
  - **Futtató fájl felülírási hiba javítása**: Megszüntettük azt a hibát a [js/app.js](file:///c:/Users/CH_001/Desktop/Projektek/kiszedesi/js/app.js) fájlban, ami az importálás végén a `matchingRow` adatokkal üresre írta felül a helyesen beolvasott `address1` (utca) értéket, ha a CSV-ben az `Address1` oszlop üres volt (de a `Shipping Street`-ben szerepelt a cím).
- **Cache-Busting és verziókezelés**: Megemeltük az érintett fájlok importálási cache verzióit `v181`-re a böngészők frissítésének kikényszerítéséhez.

### 2026. július 17. - PannonXP Cím szerkesztés és Kézi Csomag-kezelés
- **Szerkeszthető szállítási címek és telefonok**: A PannonXP címkekészítő táblázatában (`js/views/pannonxpView.js`) a címek és telefonszámok sima szöveg helyett szerkeszthető input mezőkké váltak, így közvetlenül javíthatóak exportálás előtt.
- **Automatikus magyar cím-elemzés**: Bevezettünk egy `parseHungarianAddress` segédfüggvényt, amely a manuálisan átírt szállítási címből valós időben kinyeri az irányítószámot (ZIP), a várost és a közterület nevét, majd ezeket frissíti a háttérben. Ezáltal a cím módosításával a *"Hiányzó irányítószám!"* figyelmeztetés is automatikusan eltűnik és javul a CSV exportban is.
- **Automatikus ékezet- és gépelési javítás**: Létrehoztuk a `fixHungarianAccents` funkciót, amely automatikusan felismeri és javítja a mobil billentyűzeteken elcsúszott ékezeteket (pl. `à` -> `á`, `è` -> `é`, `Bànhidai` -> `Bánhidai`) mind a Shopify CSV beolvasásakor, mind a PannonXP címek manuális szerkesztésekor.
- **Kézi csomag hozzáadás és törlés**: A csomagszám melletti doboz ikonra kattintva megnyíló részletes modalban egyedileg is lehet új csomagot hozzáadni vagy meglévőt törölni. Ez teljes kézi szabadságot ad a csomagkonfiguráció átalakítására (pl. több tétel, mint a ragasztók vagy profilok egyetlen közös dobozba vonására).
- **Nem fizetett utalásos rendelések blokkolása**: Ha egy megrendelés fizetési módja utalásos (Bank Deposit), de a státusza még nincs kifizetve (unpaid), a rendszer mostantól piros figyelmeztetéssel jelzi és blokkolja a PannonXP CSV exportálást a kiválasztott elemek között, így megelőzve az fizetetlen árukiszállítást.

### 2026. július 16. - Elszámolás CSV Export Szállítócégenkénti Csoportosítása és Részösszesítői
- **Szállítócégenkénti csoportosítás**: Az elszámolások CSV exportja (`js/services/exporter.js`) mostantól nem ömlesztve, hanem szállítócégek (`company`) szerint ABC-rendbe rendezve menti le a rendeléseket.
- **KP és Kártyás részösszesítők cégeken belül**: Minden egyes szállítócég rendelési blokkjának a végén egy dedikált részösszesítő sor jelenik meg (pl. `GLS ÖSSZESEN`), amelyben a függő készpénzes (KP) és a kártyás utalásra váró (kártya) kintlévőségek összege külön-külön összesítve szerepel a megfelelő oszlopokban.
- **Üres elválasztó sorok**: A különböző szállítócégek blokkjai közé üres sorokat szúr be a CSV generáló, hogy Excelben megnyitva könnyen áttekinthető legyen a dokumentum.

### 2026. július 15. - Visszaszállítások Rendszeren Belüli Követése
- **Előzmények Szedések fül (History)**: A befejezett/mentett körök legördülő rendelés-előnézeti chipjeiben a visszaszállításos megrendelések mostantól egyedi lila szegéllyel (`border: 1.5px solid #d8b4fe`), halvány lila háttérrel, lila betűszínnel és egy vissza-nyíl (⟲) ikonnal jelennek meg a könnyebb vizuális azonosítás érdekében.
- **Rendelések fül**: A megrendelések történetében a visszaszállításos tételek kártyái egyedi lila bal oldali szegélyt kapnak, és az utánvét státuszuk helyén egy dedikált **"Visszahozva"** (lila) vagy **"Meghiúsult visszahozatal"** (piros, indokkal) badge látható.
- **Elszámolások fül**:
  - A körök kártyájának fejlécében lévő utánvét badge-ek közé bekerültek a visszaszállításos rendelések is, lila színű státuszjelzőként (pl. `[ #3086 - Visszahozva ]` vagy `[ #3086 - Meghiúsult ]`).
  - Az elszámolás részleteiben (rendelés-listában) a visszaszállított tételek státusza nem az *"átadva"*/*"nem lett átadva"* szöveggel, hanem a valós visszáru helyzettel: **"visszahozva"** (lila) vagy **"meghiúsult visszahozatal"** (piros/narancs, sofőr által megadott kiesési indokkal) felirattal szerepel.
  - **Elszámolás Módosító / Rögzítő Dialogus**: Az elszámolás rögzítése során a visszaszállításos megrendelések mellett a lila *"Visszaszállítás"* badge látható. Amennyiben a visszahozatal meghiúsult (a felhasználó kiveszi a pipát), a rendszer a visszárura szabott hibajelzést és indoklás-bekérőt jeleníti meg (*"A visszaszállítás meghiúsult. Kérlek add meg az okot"*).

### 2026. július 14. - Visszaszállítás (Visszáru) Funkció Implementálása
- **Visszaszállítás Checkbox a Szerkesztőben**: Bekerült egy új "Visszaszállítás (Korábbi kiszállítás visszahozatala)" jelölőmező a manuális rendelés és a rendelés szerkesztése modalba (`index.html`, `js/controllers/manualOrderController.js`). Jelölés esetén az utánvét összege le lesz tiltva és automatikusan 0 Ft-ra áll be.
- **Lila Visszaszállítás Badge**: A visszaszállítandó rendelés kártyáján egy egyedi, feltűnő lila badge jelenik meg a fő képernyőn (`js/views/ordersView.js`).
- **Kiszedési Jegyzék Szűrés**: A visszaszállításos tételek teljesen elkerülik a Kiszedési Jegyzéket (`generatePickingHtml`, `generatePdfHtml`), mivel ezeket nem kell a raktárból összekészíteni.
- **Összesítő és Korrekciós Lap Kiegészítések**:
  - Az Összesítő lapon nem adódnak hozzá a raktárból sofőrnek kiadott áruk számához a visszaszállított tételek, továbbá a lila visszárus blokkból teljesen eltávolítottuk a redundáns összesítő táblázatot. Mostantól kizárólag a **"Visszahozandó megrendelések részletesen (Vevőtől vissza)"** lista szerepel rendelésszámmal, névvel és termékekkel, ami rendkívül helytakarékos és egyértelmű.
  - Az Összesítő lap lábjegyzetét frissítettük a sértetlen átvételre vonatkozó kikötéssel (ha nem sértetlen az átadás, egyeztetés szükséges).
  - A Korrekciós lapon az utánvét helyett lila "Visszaszállítás" szöveg jelenik meg, és a Megjegyzés rovatban is listázzuk a visszahozandó árukat (a terméknevek betűvastagságát csökkentettük, hogy csak a "Visszajön:" prefix legyen vastag, elkerülve a feleslegesen nehéz megjelenést).
  - A nyomtatási stílusokat és a táblázat-magasságokat (`height: auto`) finomhangoltuk, továbbá letiltottuk a tördelést (`white-space: nowrap`) az ID, Vevő és Utánvét oszlopokban, illetve csökkentettük a cellák belső margóját (`padding: 4px 8px`), hogy a nevek ne törjenek több sorba, így a sorok magassága feleslegesen ne nyúljon meg.
  - A Korrekciós lap aljáról teljesen **eltávolítottuk** a meghiúsult szállítmányok kézi rögzítésére szolgáló dotted-lines dobozt ("Meghiúsult kiszállításból visszahozott áruk részletezése"), mivel a felhasználó visszajelzése alapján ez felesleges volt és értékes helyet foglalt el a lapon.
- **Visszaszállítási Szállítólevél**: Ha a tétel visszaszállításos, a szállítólevél megnevezése **"VISSZASZÁLLÍTÁSI JEGYZÉK"** lesz, a fizetendő utánvét helyett a **"Visszaszállítás (Pénzmozgás nem történik)"** tájékoztató jelenik meg, az aláírások pedig Átadó (Vevő) / Átvevő (Szállító) formában szerepelnek.
- **Konzisztens Nyomtatás**: A fenti sablonváltoztatások mind az aktív kör nyomtatásában (`js/services/printer.js`), mind a korábbi körök előzményekből történő nyomtatásában (`js/utils/printTemplates.js`) átvezetésre kerültek.

### 2026. június 30. - Részleges Nyomtatási Folyamat Bővítése Összesítő Csomaggal & Elszámolás Szűrő Fix & Időrend Megőrzés
- **Összesítő és Korrekciós Lap Részleges Nyomtatása**: Módosítottuk a rendelések utólagos szerkesztése/módosítása utáni mentési folyamatot a `js/app.js` fájlban. Amennyiben a felhasználó a részleges nyomtatást választja ("Részleges (összesítő + új/módosított szállítók)"), a rendszer mostantól nemcsak a konkrétan módosított/új szállítóleveleket nyomtatja ki, hanem automatikusan újragenerálja és kinyomtatja a teljes frissített összesítő csomagot is (Összesítő átadás-átvételi lap + Korrekciós lap). Ez biztosítja, hogy az utánvét összegek, a termékmennyiségek és a futár elszámoló lap adatai mindig szinkronban legyenek a valós módosításokkal.
- **Elszámolás Szűrő Valós Idejű Frissítése**: Javítottuk a "Csak a kiegyenlítésre váró fuvarok mutatása" checkbox viselkedését a `js/app.js` fájlban. Eseménykezelőt rendeltünk hozzá, így a checkbox ki-be jelölése azonnal, valós időben frissíti az elszámolások listáját (`renderAccountingRuns()`), szükségtelenné téve a lapok közötti navigációt.
- **Körök Időrendjének Megőrzése Módosításkor**: Kijavítottuk a körök újrarendeződésének hibáját a `js/services/history.js` `updateRun` metódusában. A módosítás során eltávolítottuk a `timestamp: Date.now()` felülírást. Ezzel a kör megőrzi az eredeti létrehozási időbélyegét, így utólagos szerkesztés vagy elszámolás esetén sem ugrik a lista elejére, hanem megtartja eredeti helyét a kronológiai sorrendben.
- **Explicit Kronológiai Sorrendbe Rendezés**: Mivel a korábban módosított körök időbélyegei már felülíródtak az adatbázisban, a `js/views/historyView.js` fájlban explicit rendezést vezettünk be. A betöltött köröket megjelenítés előtt a kiszállítás dátuma (`date` mező, YYYY-MM-DD formátum) szerint csökkenő, azon belül pedig a létrehozási időbélyeg (`timestamp`) szerint csökkenő sorrendbe rendezzük a Szedések, Keresés, Elszámolások és Szemetes füleken. Ez garantálja a tökéletesen pontos időrendet az összes meglévő adatnál is.
- **Egységes Termékbeállító Modal a PannonXP Lapról**: Összevontuk a termékrövidítés hozzáadását és a csomagolási kategória hozzárendelését egyetlen egységes, kényelmes **"Termék beállítása PannonXP-hez"** felugró ablakba. Ez a modal mind a piros "Rövidítés hiányzik" (Hozzáadás gomb), mind a narancssárga "Nincs kategória rendelve" (Hozzárendelés gomb) figyelmeztetéseknél megnyílik. Megjeleníti a megrendelésben lévő termékek listáját kontextusként, és egyszerre engedi megadni vagy módosítani a termék egyedi rövidítését és kiválasztani annak csomagolási kategóriáját. Ezzel elkerülhető, hogy a kategória megadásakor a rendszer automatikusan egy alapértelmezett, nem kívánt (túl hosszú) rövidítést mentsen el a termékhez.
- **PannonXP Standard CSV Export Formátum**: Módosítottuk a PannonXP CSV generálási logikáját a `js/services/pannonxp.js` fájlban, igazodva a standard CSV importálók elvárásaihoz. Teljesen eltávolítottuk az `ID:` index-sort (0-tól 54-ig terjedő legelső számsor), a fejléc legelső oszlopából a `Mezőnév:` jelölést, valamint az adatsorok elé szánt üres előtag-oszlopot is. Így az exportált CSV-fájl legelső sora közvetlenül és tisztán a mezőnevekkel kezdődik (az első oszlop az `uc_ugyfelkod` lesz), az adatsorok pedig azonnal a megfelelő értékekkel követik azt.
- **Továbbfejlesztett Telefonszám-Tisztító Logika**: Frissítettük a `js/utils/phoneFormatter.js` segédfüggvényt, hogy kiküszöböljük a hibás vagy nem szabványos telefonszám-formátumok (pl. a `0036...` előtaggal kezdődő adatok, kötőjelek, szóközök, slessek) elcsúszását. A rendszer mostantól a `0036` előtagot is azonnal standard `+36` formátumra javítja a háttérben, garantálva a tiszta, szóközmentes, PannonXP-kompatibilis telefonszámokat a letöltött CSV-ben.
- **Excel-féle Aposztrófok Automatikus Eltávolítása**: Beépítettünk egy automatikus szanálási logikát a `js/app.js` CSV-beolvasási fázisába (`Papa.parse` callback). Amennyiben a CSV állományt korábban megnyitották és elmentették Excelben (amely ilyenkor hajlamos a szám-szerű mezők, például az irányítószámok `'1107` vagy telefonszámok elé egy `'` aposztrófot tenni a vezető nullák megőrzésére), a rendszer ezeket az aposztrófokat teljesen eltávolítja a háttérben. Ez megakadályozza, hogy az aposztrófok bekerüljenek az adatbázisba, megjelenjenek a felületen vagy elrontsák az exportokat.
- **Referenciaszám Kezdő Hash (#) Karakterének Eltávolítása**: Bár a generált referenciaszámok (`pxp_referencia`) elejéről korábban már levágtuk a `#` karaktert, előfordulhatott, hogy hiányzó referencia esetén a kód a Shopify nyers rendelési azonosítójára (`order.id`) esett vissza, amely még tartalmazta a `#` jelet (pl. `#3036`). A `js/services/pannonxp.js` CSV-exportálójában mostantól explicit módon garantáljuk, hogy a referenciaszám mezőből (`szl_referenciaszam`) minden körülmények között eltávolításra kerül a kezdő `#` karakter.
- **CSV Elválasztó Karakter Megtartása Pontosvesszőként (`;`)**: Bár kísérletet tettünk a vesszős elválasztásra, a felhasználó kérésének megfelelően a generált CSV mezőelválasztó karakterét végül meghagytuk az eredeti **pontosvesszőnél (`;`)** a `js/services/pannonxp.js` fájlban, és az `escapeCsvValue` logikát is pontosvessző-érzékenyre állítottuk vissza. Ez garantálja, hogy a pontosvesszőt tartalmazó adatok (pl. a csomag JSON) továbbra is biztonságosan idézőjelbe kerülnek.
- **Címzett Fejléc Mezőnevek Javítása (Typo Fix)**: Kijavítottunk 4 elírt fejléc mezőnevet a `js/services/pannonxp.js` fájl `COLUMNS` tömbjében. A címzett (második) blokk végén szereplő országhívó, közterület, megjegyzés és adószám mezőneveit tévesen a feladó `uc_` előtagjával jelöltük (`uc_ceg_cim_orszag`, `uc_ceg_cim_kozterulet`, `uc_ceg_cim_megjegyzes`, `uc_ceg_adoszam`), ami miatt a PannonXP importálója nem tudta párosítani a mezőket és elutasította a teljes importot. Ezeket átírtuk a helyes `ucc_` előtagra (`ucc_ceg_cim_orszag`, `ucc_ceg_cim_kozterulet`, `ucc_ceg_cim_megjegyzes`, `ucc_ceg_adoszam`), biztosítva a hibátlan adatpárosítást a PXP rendszerében.

### 2026. június 13. - Hasonló Termékek Intelligens Társítása (Fuzzy Match), Linkek Vizuális Követése & Görgetési Fix
- **Intelligens Termék Társítás (Fuzzy Match)**: A `js/services/pannonxp.js` szolgáltatásba beépítettünk egy karakter-alapú Levenshtein hasonlósági algoritmust (`getStringSimilarity`). Ismeretlen termék importálásakor, ha a rendszer legalább **75%-os** hasonlóságot talál egy már beállított termékkel, aszinkron megerősítő ablakot jelenít meg. Elfogadás esetén a termék megkapja a meglévő termék adatait, és a kapcsolat létrejön.
- **Társítások Megjelenítése és Visszavonása**: A társított termékeket a `pxp_settings/product_mappings` adatbázisban a `linkedTo` tulajdonsággal jelöljük meg. A **Beállítások -> Termék Rövidítések** listában a terméknév alatt kék lánc ikon és felirat jelzi a kapcsolatot: `🔗 Párosítva: [Eredeti Terméknév]`. A sor végén lévő piros szemetes ikonnal a kapcsolat bármikor törölhető/szétválasztható.
- **PannonXP Lap Görgetési Fix**: Kijavítottuk az `index.html` állományban a `#pannonxp-container` stílusát (`flex: 1; overflow-y: auto;`), így a PannonXP lap 50+ megrendelés betöltése esetén is zökkenőmentesen és teljesen görgethetővé vált.
- **Cache-Busting és Verziókezelés**: A böngésző agresszív gyorsítótárazásának elkerülésére hozzáadtuk a `?v=145` lekérdezési paramétert a belső moduláris importálásokhoz az `app.js`, `pannonxpView.js`, `pannonxp.js`, `shopify.js` és `manualOrderController.js` fájlokban.
- **References Lookup Bugfix**: Kijavítottunk egy kritikus hibát a `generateDefaultReference` függvényben, amely a nyers leképezések helyett most már a normalizált leképezéseket használja (`getNormalizedProductMappings`), így az egyedi termékrövidítések azonnal és helyesen jelennek meg a referenciaszámokban.

### 2026. június 12. - Telefonszámok formázása és Referenciaszám okos rövidítése (Shopify Termék CSV importálással)
- **Telefonszám Formázó Utility**: Létrejött a `js/utils/phoneFormatter.js` segédfájl a magyar telefonszámok standardizálására.
- **Shopify Parser**: A Shopify megrendelések beolvasásakor a vevők telefonszáma azonnal formázásra kerül.
- **Manuális rendelések**: Új megrendelés felvitelekor és szerkesztésekor a telefonszám automatikusan +36 formátumot kap.
- **PannonXP Exportőr**: A CSV exportálás során a feladó (`uc_tel`) és a címzett (`ucc_tel`) telefonszámai is átfutnak a formázón a maximális kompatibilitás érdekében.
- **Feladó Profil**: A beállításokban a feladó profil mentésekor a rendszer automatikusan formázza a megadott telefonszámot.
- **Referenciaszám okos tömörítése**: Új `generateDefaultReference` függvény a `js/services/shopify.js`-ben, ami a megrendelt termékek neveit és darabszámait okosan tömörítve fűzi össze a rendelésazonosító után (pl. `1024 Sonoma2,trex5` — a `#` karakter és a kettőspont eltávolításával, illetve szóköz és szorzójel nélkül). Amennyiben a hossz túllépné a 40 karakteres korlátot, a referenciaszám automatikusan a `[rendelésszám] kérdezd Mátét` formátumra vált (pl. `1024 kérdezd Mátét`).
- **Interaktív Referenciaszerkesztő**: A PannonXP tab táblázatában megjelent egy külön "Referencia" oszlop, ahol a generált referenciaszámok importálás után közvetlenül szerkeszthetők, felülírhatók és ellenőrizhetők az exportálás előtt.
- **Shopify Termék CSV Feltöltés & Méret-szűrés**: Létrehoztunk egy importálót a beállítások fülön, amellyel a Shopify termék export fájlja közvetlenül beolvasható. A parser automatikusan kiszűri a méretváltozatokat (pl. `280 cm`, `244 cm`, `122 cm`) és a fizikai paramétereket, így csak a tiszta termékneveket és színeket párosítja a rövidítésekhez. A rendelések referenciaszámainál is automatikusan a tisztított név alapján történik az illesztés és az ellenőrzés.
- **Dinamikus Inline Rövidítés Szerkesztés**: A regisztrált termékek táblázatában a rövidítések plain text helyett szerkeszthető beviteli mezőkké lettek alakítva. A módosítások azonnal mentésre kerülnek az adatbázisba, a referenciaszámok és hibajelzések pedig valós időben újraszámolódnak a háttérben.
- **Firebase Firestore Felhő alapú Adattárolás**: A termékrövidítések helyi böngészőtárolóból (localStorage) átkerültek Firebase Firestore felhős tárolásba (`pxp_settings/product_mappings`). Az alkalmazás indításakor egyszer tölti be az adatokat a felhőből a memóriába (in-memory cache) a gyors működésért. Automatikus migrációt biztosítottunk: ha a felhőben még nincsenek adatok, a korábbi helyi tárolóból tölti fel azokat.
- **Szigorú Blokkolás**: Amennyiben olyan termék szerepel egy kijelölt megrendelésben, amely nincs regisztrálva az adatbázisban rövidítéssel, a PannonXP export gomb letiltódik, és piros színnel jelzi a hiányzó terméket.

### 2026. június 11. (2. session) - PannonXP Csomagolási Szabályok és Részletes Csomagszerkesztő
- **Dinamikus Csomagolási Szabályok**: Új konfigurációs panel a bal oldali sávban az akusztikus panelek egyedi méreteinek és súlyainak beállítására, mely a localStorage-ban tárolódik. Mentéskor azonnal frissíti a betöltött rendelések csomagjait.
- **Részletes Szerkesztő Modal**: A táblázatban a csomagszám mellett megjelent egy csomag ikon, amellyel egyénileg is beállítható a megrendelés minden egyes dobozának súlya, hossza, szélessége és magassága.
- **Szinkronizáció**: Ha a csomagszám vagy a súly közvetlenül a táblázatban változik, a rendszer egyenletesen elosztja a súlyokat és újragenerálja a csomagok listáját a háttérben.
- **Cache verzió frissítve**: `app.js?v=120`

### 2026. június 11. - PannonXP Címkekonvertáló modul integráció
- **Címkekonvertáló fül:** Új főoldali navigációs fül ("PannonXP Címkék") a fejlécben, amivel a szedőlista és a címke-előkészítő között lehet váltani.
- **PannonXP exportáló szolgáltatás:** Létrejött a `js/services/pannonxp.js` szolgáltatás az 54 oszlopos pontosvesszős CSV és a `szl_csomagok` JSON generáláshoz.
- **Interaktív Csomagbeállító és Feladó Profilok:** Létrejött a `js/views/pannonxpView.js` nézet a rendelések csomagszámának és súlyának exportálás előtti szerkesztéséhez. Bevezettünk többszörös menthető/törölhető feladó profilokat (`Capsula Houses Kft.`, `Minta cég Kft.`) profilválasztóval.
- **Dizájn optimalizáció:** A feladó kártya maximális magasságot és görgetősávot kapott, így nem lóg ki alul a kisebb képernyőkről sem.
- **Dinamikus súly- és csomagkalkuláció:** A CSV importálásakor automatikusan kiszámoljuk a csomagsúlyt és a csomagszámot:
  - Akusztikus panelek: 1 panel = 7kg, 2 panel = 13kg, 3 panel = 19kg, 4 panel = 26kg, 5 panel = 32kg.
  - Csomagbontás: 5 db feletti akusztikus panelnél több csomagra bontja egyenletesen elosztva (pl. 6 panel = 3-3 két csomagban, 9 panel = 5-4 két csomagban).
  - Ragasztók: 0kg.
  - Profilok: 1kg/db.
- **Karakterkódolás:** A letöltött CSV UTF-8 BOM kódolással rendelkezik, így a magyar ékezetes karakterek közvetlenül megnyithatók és szerkeszthetők Excelben.
- **Cache verzió frissítve:** `app.js?v=119`

### 2026. június 5. - Szállítócég elszámolás export & UI badge-ek
- **Elszámolás CSV export:** Bevezettük az `#btn-export-accounting-csv` gombot az Elszámolások tab filter sávjába, amivel a szűrt terítések/elszámolások részletesen kimenthetők Excel-kompatibilis CSV formátumban. Az export tartalmazza a rendelés státuszát, a futár által begyűjtött összeget és a szállító kintlévőségét/tartozását.
- **Utánvétes badge-ek a kártyákon:** Az elszámolás kártyákon azonnal, lenyitás nélkül megjelennek az utánvétes rendelések számai kis színes státusz badge-ek formájában (szürke = függő, kék = utalva, sárga = részleges, zöld = elszámolva, piros = kiesett).
- **Exporter Service:** Létrejött a `js/services/exporter.js` moduláris szolgáltatás.
- **Cache verzió frissítve:** `app.js?v=116`

### 2026. június 4. - Kisebb hibajavítás
- **manualController Edit Bug:** Kijavítva a `TypeError: manualController.editOrder is not a function` hiba. Az `app.js` mostantól a helyes `openEditModal` függvényt hívja a rendelések szerkesztésekor.
- **Cache verzió frissítve:** `app.js?v=112`

### Legutóbbi frissítés: 2026. május 6. (Rendszer javítások és szépítések)
- **Utánvét Felismerés Javítás:** A Shopify Notes mezőből az "uv" kulcsszó felismerése regex-re állítva, hogy az `uv:12000`, `uv12000`, `12000 uv` formátumok mind megfelelően feldolgozódjanak. A lappangó utánvét ellenőrzés is robusztusabb lett.
- **Drag & Drop Sorrend Szinkronizálás:** A kártyák drag & drop mozgatásakor a belső `orders[]` tömb is frissül, így a szállítólevelek és a nyomtatás sorrendje mindig a felhasználó által beállított sorrendet követi.
- **Cég Badge az Elszámolásokon:** Az elszámolás kártyák jobb felső sarkában most feltűnő sötét badge mutatja a szállító cég nevét.
- **Összesítő Nyomtatott Lapon Cég Név:** Az Összesítő (Átadás-Átvétel) nyomtatott lapon a cég neve nagy, kitöltött blokkban jelenik meg.
- **Nyomtatási Sorrend:** Új sorrend: 2× Összesítő lap, 1× Korrekciós lap, majd az összes szállítólevél kétszer egymás után (1-N, majd 1-N).
- **Szállítólevelek Dátum Törlése:** Az egyedi szállítólevelek aláírás blokkjaiból törölve a felesleges dátumozási sorok.
- **Profilok Nyomtatásban:** Az "Összekészített profilok" sor alatt a részletes profillista nyomtatáskor is látszódik (a szedőlistán és az egyedi szállítóleveleken is).
- **Nyomtatási Elrendezés Finomhangolása:** A lábléc ("Nem minősül számlának") helyzete és az oldalszegélyek optimalizálva lettek az A4-es papírhoz az elcsúszások elkerülése érdekében.
- **Szemetes (Trash) Rendszer:** A törölt szállítási körök nem törlődnek véglegesen, hanem egy 90 napos megőrzésű szemetesbe kerülnek, ahonnan bármikor visszaállíthatók.
- **Elszámolás Követése:** Az Elszámolások fülön mostantól cégek szerint csoportosítva láthatók a fuvarok, cégre lebontott összesített kintlévőség kijelzéssel.
- **Fix és Dinamikus Partnerlista:** A mentéskor választható fix partnerlista (LétaiSela, Sela, stb.) kiegészült az új partnerek felvételének lehetőségével. Az új partnerek automatikusan bekerülnek a szűrők közé is.

### 2026. május 6. - Logisztikai Statisztika & Kompakt Dizájn
- **Statisztika (Lead Time) rendszer:** Munkanap-alapú késéskövetés (>6 nap), időszaki szűréssel és ignorálási lehetőséggel.
- **Kompakt Nyomtatási Kép:** Dinamikus sor-magasság és optimalizált térkihasználás A4 lapra.
- **Szemetes 90 nap:** Adatmegőrzési idő kitolása.
- **Partnerkezelés:** Dinamikus lista és cégcsoportosított elszámolás.
- **UI/UX:** Flex-layout alapú címke igazítás és munkanap-badge.

---
### 2026. május 7. - Kritikus Hibajavítások & GitHub Pages Optimalizálás
- **Beépített Login (Hybrid Auth):** A GitHub Pages-en fellépő modul-betöltési és gyorsítótár (cache) problémák miatt a bejelentkezési logika közvetlenül az `index.html`-be került beágyazásra. Ez garantálja a hozzáférést akkor is, ha az `app.js` betöltése késik vagy blokkolva van.
- **Firebase SDK Import Javítás:** Pótolva lettek a hiányzó Firestore függvények (`where`, `limit`, `getDoc`, `setDoc`, `writeBatch`, `deleteField`, `arrayUnion`, `arrayRemove`, `increment`) a `firebase-config.js` fájlban. Ezek hiánya miatt az `app.js` korábban nem tudott elindulni.
- **DOM Referencia Tisztítás:** Eltávolítva az összes olyan JavaScript hivatkozás (`global-drag-overlay`, `edit-overlay`), amely nem létező HTML elemekre mutatott, megállítva ezzel a script futását.
- **Cache-Busting Technika:** Verziózott script betöltés (`app.js?v=3`) bevezetése, hogy a böngészők kényszerítve legyenek a legfrissebb kód letöltésére.
- **Stabilitás:** A rendszer újra elérhető, a bejelentkezés után a gombok és a funkciók (Importálás, HistoryManager) újra működőképesek.

---
### 2026. május 7. (Este) - Előzmények UI Redesign, Phosphor Ikoncsere, Nyomtatás Egyszerűsítés

- **Előzmények Vezérlőpult Redesign:** A history modal kártyái flex-alapú, tágas elrendezést kaptak (20px padding, 24px gap, 20px border-radius). Minden sorban 3 szekció: bal (dátum/meta), közép (cég+futár + nyomtatási gombok), jobb (Kör betöltése + Törlés).
- **Phosphor Bold ikonkönyvtár:** Bevezettük a `@phosphor-icons/web` CDN-t (`<head>`-be, CSS elé). Az összes emojit és korábbi FontAwesome ikont lecseréltük egységes, vastag vonalú Phosphor Bold ikonokra (`ph-clipboard-text`, `ph-truck`, `ph-file-text`, `ph-printer`, `ph-trash`, `ph-user`, `ph-calendar`, `ph-check-circle`, `ph-hourglass`, `ph-map-pin`, `ph-package`).
- **Teljes Emoji-mentesítés:** Az egész UI-ból eltávolítottuk az összes emojit (státusz badge-ek, keresési találatok, szedőlista print fejléc).
- **Nyomtatási Workflow Egyszerűsítés:** Eltávolítottuk a "Szállítólevelek nyomtatása is" jelölőnégyzetet. A "Mentés és Nyomtatás" mostantól mindig teljes csomagot nyomtat. Külön nyomtatáshoz az Előzmények 4 dedikált gombja áll rendelkezésre.
- **Gombfeliratok:** `Össz.` → `Összesítő`, `CSOMAG` → `TELJES NYOMTATÁSI CSOMAG`.
- **Törlés gomb:** 54×54px, halvány piros háttér (`#fee2e2`), `ph-trash` (24px) ikon.

#### Tanulságok:
- **Emojik tiltottak a UI-ban** — üzleti szoftverben azonnal olcsóvá teszik a megjelenést. Mindig vektoros ikont kell használni.
- **Ikonkönyvtár a session elején döntendő** — egy projekt = egy könyvtár (Phosphor Bold).
- **`view_file` előbb, `replace_file_content` utána** — minden módosítás előtt kötelező ellenőrizni a TargetContent pontos szövegét.

---

### 2026. május 7. (2. session) - Profilok nyomtatásban & Előzmények Apple UI

- **Profilok a nyomtatott szedőlistán:** A `generatePickingHtml` függvényben az "Összekészített profilok" sor alatt kicsiben (9px, szürke) megjelennek az egyedi profilok (`• N db Profil neve`), hogy a szedő ellenőrizni tudja. Az összesített mennyiség cella üresen marad (a "1 db" félrevezető lett volna).
- **Előzmények modal — Apple-inspired redesign:** Mind a 4 fül (Szedések, Elszámolások, Szemetes, Statisztika) egységes `history-apple-card` kártyarendszert kapott. Elvek: fehér kártya, nincs színes fejléccsík, tipográfiai hierarchia, szürke footer szekció a másodlagos akcióknak.
  - **Szedések:** Header (dátum + cég fekete pill + futár), Footer (4 nyomtatási gomb + Betöltés + törlés ikon).
  - **Elszámolások:** Kártya header (dátum + opcionális "Elszámolva" zöld badge + cég pill + futár + összeg), akciógombok jobbra.
  - **Szemetes:** Dátum + cég + futár + "törölve" idő, Visszaállítás + végleges törlés.
  - **Statisztika:** Ügyfélnév + piros késés-badge + meta (rendelés ID, dátumok, cég), Rendben gomb.
- **Info-hierarchia javítása:** Minden kártyán egységesen: cég = sötét fekete pill (`hac-company`), futár = félkövér sötétszürke (`font-weight:600; color:#374151`), dátum = nagy vastag (`15px, 700`), másodlagos info = halványszürke (`#94a3b8`).
- **Elszámolások fül egyszerűsítés:** Az agresszív piros FÜGGŐ fejléccsík eltávolítva — az elszámolás státusz kis zöld badge-ként jelenik meg a dátum mellett, nem teljes szélességű sávként.

#### Tanulságok:
- **Colored header bar = nem Apple.** Fehér kártya + tipográfiai hierarchia sokkal elegánsabb, mint színes fejlécsávok.
- **Info-hierarchia:** Cég és futár neve mindig legyen egyformán kiemelve minden fülön — konzisztencia a kulcs.
- **Footer szekció:** A másodlagos akciók (nyomtatás) footer szürke sávba kerülnek — szűk nézetben eltűnhet, ez szándékos.

---

---

### 2026. május 9. - Utólagos Módosítás Kezelése

- **`isPrinted: true`** flag minden új `saveRun()`-nál.
- **`isModified: true` + `modifiedAt`** flag minden `updateRun()`-nál (felülíráskor).
- **"Módosítva" badge** — sárga pill az előzmény kártyán ha `run.isModified`.
- **Nyomtatási choice felülírás után** — "Teljes csomag újra" vs "Csak szállítólevelek" dialog.
- **`currentLoadedRunId` bug javítva** — az előzmények fülről betöltött körök mostantól helyen állítják be `currentLoadedRunId`-t, így a "Felülírás" opció rájuk is működik.

### 2026. május 9. - Szerkesztett Adatok Prioritása & Save Handler Javítás

- **`btnSaveManual` click handler pótolva:** A "Hozzáadás" / "Mentés" gombnak korábban semmilyen eseménykezelője nem volt — a manuális hozzáadás és a szerkesztés néma volt. A handler most teljes rendelés-objektumot ír az `orders[]`-ba szerkesztéskor (felülírás) és új felvitelkor (push), majd `renderOrders()` + `updatePrintButtonState()` hívással frissíti a UI-t.
- **`isManuallyEdited: true` flag:** Minden kézzel szerkesztett vagy manuálisan létrehozott rendelés kap egy flag-et.
- **Gombfelirat kontextus szerint:** Szerkesztési módban "Mentés", új felvitelnél "Hozzáadás".
- **Előzmények is helyes:** A mentés `orders[]` deep copy-ját menti Firestore-ba, így az előzményben is a szerkesztett adatok jelennek meg.

### 2026. május 9. - Utánvét Ft-alapú Felismerés

- **`matchFt` regex hozzáadva:** A notes mezőből mostantól a `NUMBER Ft` minta is felismeri az utánvét összeget, `uv`/`utánvét` kulcsszó nélkül is. Támogatott formátumok: `448 120Ft`, `448.120 Ft`, `448120Ft`, `448 120 ft` stb. (pont és szóköz ezresválasztóként).
- **Lappangó Utánvét figyelmeztetés szűkítve:** Csak akkor tüzel, ha sem `uv`/`utánvét` kulcsszó, sem Ft-összeg nem szerepel a notes-ban.

### 2026. május 9. - Drag & Drop Kompakt Mód & Fluiditás

- **Natív DnD visszaállítva:** `forceFallback: true` eltávolítva — a böngésző natív HTML5 drag & drop API-ját használja, ami jóval fluidabb mint a JavaScript egéresemény-alapú fallback.
- **Kompakt drag kép (`setDragImage`):** A `dragstart` eseményen egyszer regisztrált listener egy off-screen div-et (badge + rendelésszám) illeszt be drag képként a natív API-on keresztül, majd azonnal eltávolítja azt a DOM-ból.
- **Pozíció badge a ghost-on:** Az `onMove` callbackben a `.sortable-ghost` (a lista-beli helyőrző elem) `.order-index` badge-e dinamikusan frissül az aktuális ejtési pozícióra, így a felhasználó látja az új sorszámot mielőtt elengedné.
- **Ghost stílus:** Kék szegély, kék badge, `height: 52px` — kompakt és egyértelmű helyfoglaló.
- **Szövegkijelölés tiltva:** `user-select: none` CSS + JS `body.style.userSelect` az `onStart`/`onEnd` pároson — húzás közben semmi nem jelölődik ki.
- **`animation: 80`, easing finomhangolva:** Gyorsabb kártyaátrendező animáció (Material Design easing: `cubic-bezier(0.4, 0, 0.2, 1)`).
- **`dataset.dragImgListenerSet` guard:** A `dragstart` listener egyszer kerül fel az `orderList`-re (nem halmozódik `renderOrders()` újrahívásakor).

---

### 2026. május 11. - Shopify CSV Bugok Kezelése & Rendezési Mód

#### Hibajavítások (Shopify CSV korlátai)

- **Teljes cím a nyomtatott szállítóleveleken:** A szállítólevelek fejlécében `order.fullAddress || order.address` fallback — a teljes cím (ország + irányítószám + város + utca) minden esetben látszik, nem csak az utca.
- **"Removed" tételek szűrése CSV-ből:** Shopify nem jelöl meg eltávolított tételeket a CSV-ben — két védelmi réteg:
  1. Ha a rendelés `fulfilled` és az adott sornak `Lineitem fulfillment status = pending` → a tétel ki van zárva (utólag eltávolított elem).
  2. Ha a rendelésen van `removed` Shopify tag → nyomtatás le van tiltva piros hibaüzenettel ("Törölt tétel van a megrendelésben, kérlek ellenőrizd le a Shopifyban!").
- **Utánvét Eltérés hamis pozitív javítása (Shopify Outstanding Balance bug):** Shopify CSV editált rendelések után hibás `Outstanding Balance`-t exportál (összeadja az újat, de nem vonja le a régit). Auto-detektálás: ha `(Subtotal + Shipping) × VAT` **vagy** `(Subtotal + Shipping)` egyezik a notes-ban lévő utánvét összeggel, de az `Outstanding Balance` eltér → a notes értékét fogadjuk el, nem keletkezik hiba. Mindkét ÁFA-számítási módot ellenőrzi (ÁFA-s és ÁFA-n felüli árstruktúra).
- **"Összekészített profilok" alatti részletek hiányának javítása:** Az `isProfile()` regex (`/profil/i`) véletlenül matchelte az "Összekészített profilok" nevet is → a profilok újra összecsuklottak magukba. Javítás: `isProfile()` kizárja a névegyezést. A `generatePickingHtml` is defenzíven ellenőrzi az `item.isCollapsedProfile || item.name === "Összekészített profilok"` feltételt.
- **Cache-busting:** `index.html`-ben `app.js?v=4` → böngésző mindig a legfrissebb kódot tölti be.

#### Technikai tanulságok (Shopify CSV):
- Az `Outstanding Balance` mező **nem megbízható** szerkesztett rendeléseknél.
- Az `items` szûrés egyetlen megbízható módja teljesített rendelésnél: `isFulfilled === true && lineFulfillmentStatus === 'pending'` kombináció.
- A `removed` tag munkafolyamat szükséges a teljesítés előtti esetekhez.

---

#### Rendezési Mód (Sort Mode)

- **"Rendezés" toggle gomb a dynamic island-ban** (print előtt, saját sziget-szakasz nélkül). Aktív állapotban sárga-borostyán kiemelés (`sort-mode-btn-active`).
- **Kompakt kártyanézet aktív módban:** Az összes kártya drasztikusan kisebb — csak a sorszám badge és a rendelésszám látszik, minden más (tételek, cím, vevő, gombok, drag handle) el van rejtve CSS-sel (nem újrarenderelés).
- **Teljes kártya drag handle:** Sort módban az egész kártya húzható (nem csak a kis handle ikon) — `initSortable()` keretben `handle: sortModeActive ? '.order-card' : '.drag-handle'`.
- **`initSortable()` kiemelve:** A Sortable.js inicializálás külön függvénybe kerül, amelyet `renderOrders()` és a toggle gomb is hív — nincs kódduplikáció.
- **Reset-nél sort mode visszaáll:** Ha a lista törlődik, `sortModeActive = false` és az összes CSS class visszaáll.

#### DnD vizuálok teljes átdolgozása (sort módban):
- **Fogott kártya ("chosen"):** `scale(1.04) rotate(1.2deg)` + nagy kék árnyék + fehér háttér + kék szegély — egyértelműen "felemelkedett" hatás.
- **Landing zone ("ghost"):** Élénk kék fill (`#dbeafe`), kék szegély + 5px glowing outline, belső tartalom rejtett, `::after` pseudo-elem mutatja: **"↕  ide kerül"** szöveg középre igazítva.
- **Többi kártya húzás közben:** `opacity: 0.45` — a figyelem a fogott és a célpont kártyán van, minden más háttérbe kerül.

---

---

### 2026. május 13. - Előzmények UI kompaktosítás, Preview és Összevonás

#### Kompakt kártyalayout (Szedések fül)
- **Egysor design:** A 2-soros (header + footer) kártyák egyetlen ~50px-es sorrá sűrűsödtek. Bal: cég pill + dátum + módosítás badge + futár + rendelésszám + időpont. Közép: 3 ikon-only nyomtatógomb + fekete "Teljes" gomb. Jobb: Betöltés + törlés + preview toggle.
- **Modal padding csökkentve:** `32px → 16px`, kártyák közötti rés `10px → 5px`. Egyszerre 6-8 szedés látszik laptopon (volt 2-3).
- **Trash / Statisztika kártyák érintetlenek.**

#### Rendelés Preview
- **Chevron toggle gomb** minden kártyán — kattintásra kinyílik egy chip-sor az összes rendelésszámmal és vevőnévvel.
- **Chip hover:** kék keret, tooltip mutatja a szállítási címet.
- **CSS:** `max-height` animáció, `open` class toggle.

#### Szedések Összevonása
- **"Összevonás" toggle gomb** a Korábbi Szállítási Körök fejléce mellett.
- Aktív módban checkboxok jelennek meg a kártyákon, lila sticky action bar alul (kijelölt körök száma + Összevon gomb).
- **Merge modal:** új dátum / szállítócég / futár megadása (előre kitöltve az első kör adataival).
- **Adatmodell:** összevont kör kap `isMerged: true`, `mergedFromIds[]`, `mergedFromDocIds[]` flageket. Eredeti körök `isMergedInto` flaget kapnak és eltűnnek a listából.
- **Összevont badge:** lila "Összevont (N kör)" jelzés az összevont kör kártyáján.
- **Visszavon gomb:** sárga "Visszavon" gomb az összevont kártyán — confirm után visszaállítja az eredetieket (`isMergedInto` törlése), az összevont kör törlődik.
- **Többszörös összevonás:** biztonságos, szintenkénti undo (AB+C→ABC visszavon → AB és C jön vissza, AB saját visszavonója megmarad).
- **Cache-busting:** `app.js?v=7`

#### Technikai tanulságok:
- Az összevont és eredeti körök elkülönítése `isMergedInto` flaggel (nem külön kollekció) — egyszerű, Firestore-barát megoldás.
- `mergedFromDocIds` (Firestore doc ID-k) tárolása a merged runban kulcsfontosságú a pontos visszavonáshoz.
- Szintenkénti undo: `revertMerge` csak egy szintet von vissza — nem kell rekurzió, a mélységi lánc minden eleme önálló entitás.

---

---

### 2026. május 14. - Gyors Szállítólevél, Előzmények UI újratervezés, Elszámolások, Statisztika térkép

#### Gyors Szállítólevél (Gyors SzL)
- **Új funkció:** Ad-hoc szállítólevél kiállítása CSV import nélkül, Dynamic Island gombból.
- **Modal mezők:** Feladó (select), Szállító Cég (szabad szöveg), Átvevő (név/cég/cím/telefon), tételek (dinamikus sorok).
- **Mentés:** Firestore-ba menti `isQuickDelivery: true` flaggel + `quickDeliveryData` payloaddal.
- **Terminológia:** "Futár" → "Szállító" az egész UI-ban és nyomtatott lapokon.
- **COD nincs:** Gyors szállítóleveleken nem jelenik meg utánvét szekció.
- **2 példány** nyomtatva.
- **Saját "⚡ Gyors SzL" fül** az Előzmények modalban — szűrve a normál Szedések fülről.

#### Előzmények UI/UX újratervezés
- **"Előzmények" gomb** kikerült a headerből → saját floating pill jobb alul (`#history-island`, azonos stílus mint Dynamic Island, de `right: 30px`).
- **Szemetes** kikerült a tabok közül → modal header ikonja; kattintásra slide-in panel nyílik "← Vissza" gombbal, tab sor eltűnik.
- **4 tab maradt:** Szedések | ⚡ Gyors SzL | Elszámolások | Statisztika.

#### Elszámolások tab — teljes átírás
- **COD szűrő:** csak utánvétes fuvarok látszanak.
- **Checkbox alapból bejelölve:** kipipált fuvar azonnal eltűnik; kikapcsolva visszajönnek.
- **Részleges elszámolás:** `settledAmount` + `uncollectedOrderIds` tárolva Firestoreban.
- **3 vizuális állapot:** szürke kör (függőben), narancssárga (részleges), zöld (elszámolva).
- **Részleges + elszámolt egyaránt eltűnik** a "csak függőben" filterből.
- **`showSettlementDialog(run, runCOD)`:** custom glassmorphism modal, COD rendelések checkboxokkal, élő összesítő, "−X Ft hiányzik" visszajelzés.
- **Order chips kibővítve:** nem beérkezett rendelések áthúzva + "nem érkezett" badge.
- **`HistoryManager.revertToPending(docId)`** új függvény.

#### Statisztika tab — teljes újraírás
- Régi késési statisztika befagyasztva (kód megmarad).
- **6 új szekció:**
  1. Szállítói összesítő (terítés / rendelés / COD összeg / kiesett per courier)
  2. Havi forgalom (CSS sávok)
  3. Havi utánvét volumen (beérkezett/kiesett/függőben szegmentált sávval)
  4. Top 15 szállított termék (qty-vel súlyozva)
  5. Területi sűrűség — **Leaflet.js térkép** (CartoDB Positron tiles)
  6. Többször szállított rendelések (cross-run duplicate order ID-k)
- **Dátumszűrő** terítés napja alapján + "Összes" gomb.

#### Területi sűrűség térkép
- **Budapest egybe kezelve** — minden 1xxx zip egy pont Budapest közepén.
- **HU_ZIP lookup tábla** (~120 entry): Budapest 23 kerület (3-jegyű prefix) + ~80 vidéki város.
- **Nominatim fallback** ismeretlen zip-ekre, 1.1s rate limit, `localStorage` cache (`hu_zip_geocache_v1`).
- **Kompakt tömör pontok:** sqrt-skálán méretezve (4–14px), sötétkék, fehér szegély.
- **`statsLeafletMap`** module-level változó — destroy + reinit dátumváltáskor.

#### Technikai tanulságok
- `window.prompt()` kerülendő — mindig `showSettlementDialog`-féle custom modal illeszkedik jobban a glassmorphism UI-hoz.
- Leaflet `.remove()` kötelező mielőtt ugyanazon div-en újrainicializálunk.
- Budapest összes zip kód egy pontba vonandó — körzetenként külön pont nem ad értékes info-t.
- `sqrt`-skála a körök méretezésénél sokkal jobb mint lineáris: 200 vs 10 rendelés nem 20× méretű pontot eredményez.

#### Cache verzió
`app.js?v=19`

---

### 2026. május 16. - Elszámolás Visszavonás Javítás, Statisztika Bento Box Redesign, Kiesett Összevonás, Térkép Tooltip

#### Elszámolás "Visszavonás" bugjavítás
- **Probléma:** Visszavonás után a futár körök "5 kiesett" badge-et mutattak, holott visszaálltak függőbe.
- **Ok:** A régi handler `updateSettlementStatus(docId, 0, totalCOD, allCodIds, {}, {})` hívott — az összes COD rendelést uncollected-ként írta vissza Firestore-ba.
- **Javítás:** `btn-nullify-settlement` handler mostantól `revertToPending(docId)`-t hív.
- **`revertToPending` kibővítve:** `deleteField()` törli az összes settlement-mezőt (`uncollectedOrderIds`, `uncollectedReasons`, `partialOrders`, `settledAmount`, `settledAt`, `isSettled: false`).
- **Visszavonás gomb láthatóság:** A gomb megjelenik ha `run.isSettled || isPartial || uncollected.length > 0` — korábban az `uncollected.length > 0` feltétel hiányzott, így visszavonás utáni újratöltésnél a gomb eltűnt, holott a badge megmaradt.

#### Statisztika Bento Box Layout
- **`stats-runs-container`:** `display: flex; flex-direction: column` → `display: grid; grid-template-columns: 1fr 1fr; gap: 14px; grid-auto-flow: row dense`
- **`makeSection()` frissítve:** `fullWidth` paraméter hozzáadva — Szállítói összesítő, Top termékek, Kiesett rendelések teljes szélességűek; Havi forgalom és Havi utánvét kétoszlopos grid-ben oldalra kerülnek.
- **Tömörebb padding:** `24px/28px → 10px/14px`, flex layout.
- **Lenyitható szekciók:** `makeCollapsible(rowsArr, label, visible=5)` helper — alapból top 5 látszik, "Összes mutatása (N)" gombra nyílik ki; egyedi ID-kkel több szekció egymástól független.

#### Térkép Fejlesztések
- **Görgetésvédelem:** `scrollWheelZoom: false` — az oldal görgethető a térkép felett.
- **Magyarország fitBounds:** `fitBounds([[45.7, 16.1], [48.6, 22.9]])` — az összes megye, enyhe padding.
- **Magasság:** `350px → 460px`.
- **Hover tooltip:** kattintás helyett `bindTooltip` minden markeren — megjelenik a helységnév, rendelések száma, és az összes rendelésszám (numerikusan rendezve).
- **Dinamikus tooltip grid:** 1-5 rendelés → 1 oszlop (130px max), 6-14 → 2 oszlop (210px), 15+ → 3 oszlop (300px).
- **`zipMap[key].orderIds[]`** tömb tárolva minden helységnél, order ID-k összegyűjtéséhez.

#### Kiesett + Többször Szállított Összevonás
- **"Többször szállított rendelések" szekció eltávolítva** — információja beolvadt a Kiesett rendelésekbe.
- **`orderRunsMap` (Map):** cross-run nyomon követés — minden rendelés ID-hoz tárolja az összes körben való megjelenését (dátum, futár, `isUncollected`, `isPartial`, `wasReceived`, `wasPartialReceived`).
- **Re-delivery sub-sor:** Ha egy kiesett rendelés egy LATER körben is megjelenik, alatta `renderLaterEntries()` mutatja az eredményt (zöld ✓, sárga ≈, piros ✗ badge).
- **Sorrendezés:** Kiesett rendelések — utólag átvett rendelések mindig a lista végére kerülnek; azon belül dátum szerint csökkenő sorrend.
- **Szürke COD összeg:** Ha egy kiesett rendelés utólag `wasReceived || wasPartialReceived` → a COD összeg szürkén jelenik meg (`#94a3b8`), nem fekete.
- **Kiesett sor layout:** ID 70px fix, vevőnév `flex:1`, jobb oldal `flex-shrink:0` — megszűnt a felesleges középső tér.

#### Nem-COD Rendelések az Elszámolásdialogban
- **`showSettlementDialog` átírva:** COD és nem-COD rendelések egymástól elkülönítetten kezelve.
- **Nem-COD sorok:** "Nem utánvétes" badge, egyszerű átadva/nem lett átadva toggle, indoklás dropdown.
- **`updateTotal()`:** Csak a `data-is-cod="true"` sorokat számolja.
- **Save handler:** Mindkét típus `uncollectedOrderIds`-ba kerül ha kiesett/nem átadva.
- **Order chips:** `isUncollected` check eltávolítva az `o.isCOD &&` feltételtől → nem-COD rendelések is mutatják a "nem lett átadva" / "átadva" állapotot.

#### Kritikus Bug: Duplikált `const overlay` szintaktikai hiba
- **Tünet:** Visszavonás után az összes gomb leállt — sem Előzmények, sem Gyors SzL, sem semmi nem működött.
- **Ok:** `showSettlementDialog` többlépéses átírásánál az eredeti `const overlay = document.createElement('div')` deklaráció (2040. sor) bent maradt, majd egy másik edit újra hozzáadta (2100. sor). Az ES modul SyntaxError-ral megállt.
- **Detektálás:** `node --input-type=module < js/app.js 2>&1` — azonnali hibajelzés.
- **`isPrinted: true`** flag minden új `saveRun()`-nál.
- **`isModified: true` + `modifiedAt`** flag minden `updateRun()`-nál (felülíráskor).
- **"Módosítva" badge** — sárga pill az előzmény kártyán ha `run.isModified`.
- **Nyomtatási choice felülírás után** — "Teljes csomag újra" vs "Csak szállítólevelek" dialog.
- **`currentLoadedRunId` bug javítva** — az előzmények fülről betöltött körök mostantól helyen állítják be `currentLoadedRunId`-t, így a "Felülírás" opció rájuk is működik.

### 2026. május 9. - Szerkesztett Adatok Prioritása & Save Handler Javítás

- **`btnSaveManual` click handler pótolva:** A "Hozzáadás" / "Mentés" gombnak korábban semmilyen eseménykezelője nem volt — a manuális hozzáadás és a szerkesztés néma volt. A handler most teljes rendelés-objektumot ír az `orders[]`-ba szerkesztéskor (felülírás) és új felvitelkor (push), majd `renderOrders()` + `updatePrintButtonState()` hívással frissíti a UI-t.
- **`isManuallyEdited: true` flag:** Minden kézzel szerkesztett vagy manuálisan létrehozott rendelés kap egy flag-et.
- **Gombfelirat kontextus szerint:** Szerkesztési módban "Mentés", új felvitelnél "Hozzáadás".
- **Előzmények is helyes:** A mentés `orders[]` deep copy-ját menti Firestore-ba, így az előzményben is a szerkesztett adatok jelennek meg.

### 2026. május 9. - Utánvét Ft-alapú Felismerés

- **`matchFt` regex hozzáadva:** A notes mezőből mostantól a `NUMBER Ft` minta is felismeri az utánvét összeget, `uv`/`utánvét` kulcsszó nélkül is. Támogatott formátumok: `448 120Ft`, `448.120 Ft`, `448120Ft`, `448 120 ft` stb. (pont és szóköz ezresválasztóként).
- **Lappangó Utánvét figyelmeztetés szűkítve:** Csak akkor tüzel, ha sem `uv`/`utánvét` kulcsszó, sem Ft-összeg nem szerepel a notes-ban.

### 2026. május 9. - Drag & Drop Kompakt Mód & Fluiditás

- **Natív DnD visszaállítva:** `forceFallback: true` eltávolítva — a böngésző natív HTML5 drag & drop API-ját használja, ami jóval fluidabb mint a JavaScript egéresemény-alapú fallback.
- **Kompakt drag kép (`setDragImage`):** A `dragstart` eseményen egyszer regisztrált listener egy off-screen div-et (badge + rendelésszám) illeszt be drag képként a natív API-on keresztül, majd azonnal eltávolítja azt a DOM-ból.
- **Pozíció badge a ghost-on:** Az `onMove` callbackben a `.sortable-ghost` (a lista-beli helyőrző elem) `.order-index` badge-e dinamikusan frissül az aktuális ejtési pozícióra, így a felhasználó látja az új sorszámot mielőtt elengedné.
- **Ghost stílus:** Kék szegély, kék badge, `height: 52px` — kompakt és egyértelmű helyfoglaló.
- **Szövegkijelölés tiltva:** `user-select: none` CSS + JS `body.style.userSelect` az `onStart`/`onEnd` pároson — húzás közben semmi nem jelölődik ki.
- **`animation: 80`, easing finomhangolva:** Gyorsabb kártyaátrendező animáció (Material Design easing: `cubic-bezier(0.4, 0, 0.2, 1)`).
- **`dataset.dragImgListenerSet` guard:** A `dragstart` listener egyszer kerül fel az `orderList`-re (nem halmozódik `renderOrders()` újrahívásakor).

---

### 2026. május 11. - Shopify CSV Bugok Kezelése & Rendezési Mód

#### Hibajavítások (Shopify CSV korlátai)

- **Teljes cím a nyomtatott szállítóleveleken:** A szállítólevelek fejlécében `order.fullAddress || order.address` fallback — a teljes cím (ország + irányítószám + város + utca) minden esetben látszik, nem csak az utca.
- **"Removed" tételek szűrése CSV-ből:** Shopify nem jelöl meg eltávolított tételeket a CSV-ben — két védelmi réteg:
  1. Ha a rendelés `fulfilled` és az adott sornak `Lineitem fulfillment status = pending` → a tétel ki van zárva (utólag eltávolított elem).
  2. Ha a rendelésen van `removed` Shopify tag → nyomtatás le van tiltva piros hibaüzenettel ("Törölt tétel van a megrendelésben, kérlek ellenőrizd le a Shopifyban!").
- **Utánvét Eltérés hamis pozitív javítása (Shopify Outstanding Balance bug):** Shopify CSV editált rendelések után hibás `Outstanding Balance`-t exportál (összeadja az újat, de nem vonja le a régit). Auto-detektálás: ha `(Subtotal + Shipping) × VAT` **vagy** `(Subtotal + Shipping)` egyezik a notes-ban lévő utánvét összeggel, de az `Outstanding Balance` eltér → a notes értékét fogadjuk el, nem keletkezik hiba. Mindkét ÁFA-számítási módot ellenőrzi (ÁFA-s és ÁFA-n felüli árstruktúra).
- **"Összekészített profilok" alatti részletek hiányának javítása:** Az `isProfile()` regex (`/profil/i`) véletlenül matchelte az "Összekészített profilok" nevet is → a profilok újra összecsuklottak magukba. Javítás: `isProfile()` kizárja a névegyezést. A `generatePickingHtml` is defenzíven ellenőrzi az `item.isCollapsedProfile || item.name === "Összekészített profilok"` feltételt.
- **Cache-busting:** `index.html`-ben `app.js?v=4` → böngésző mindig a legfrissebb kódot tölti be.

#### Technikai tanulságok (Shopify CSV):
- Az `Outstanding Balance` mező **nem megbízható** szerkesztett rendeléseknél.
- Az `items` szûrés egyetlen megbízható módja teljesített rendelésnél: `isFulfilled === true && lineFulfillmentStatus === 'pending'` kombináció.
- A `removed` tag munkafolyanat szükséges a teljesítés előtti esetekhez.

---

#### Rendezési Mód (Sort Mode)

- **"Rendezés" toggle gomb a dynamic island-ban** (print előtt, saját sziget-szakasz nélkül). Aktív állapotban sárga-borostyán kiemelés (`sort-mode-btn-active`).
- **Kompakt kártyanézet aktív módban:** Az összes kártya drasztikusan kisebb — csak a sorszám badge és a rendelésszám látszik, minden más (tételek, cím, vevő, gombok, drag handle) el van rejtve CSS-sel (nem újrarenderelés).
- **Teljes kártya drag handle:** Sort módban az egész kártya húzható (nem csak a kis handle ikon) — `initSortable()` keretben `handle: sortModeActive ? '.order-card' : '.drag-handle'`.
- **`initSortable()` kiemelve:** A Sortable.js inicializálás külön függvénybe kerül, amelyet `renderOrders()` és a toggle gomb is hív — nincs kódduplikáció.
- **Reset-nél sort mode visszaáll:** Ha a lista törlődik, `sortModeActive = false` és az összes CSS class visszaáll.

#### DnD vizuálok teljes átdolgozása (sort módban):
- **Fogott kártya ("chosen"):** `scale(1.04) rotate(1.2deg)` + nagy kék árnyék + fehér háttér + kék szegély — egyértelműen "felemelkedett" hatás.
- **Landing zone ("ghost"):** Élénk kék fill (`#dbeafe`), kék szegély + 5px glowing outline, belső tartalom rejtett, `::after` pseudo-elem mutatja: **"↕  ide kerül"** szöveg középre igazítva.
- **Többi kártya húzás közben:** `opacity: 0.45` — a figyelem a fogott és a célpont kártyán van, minden más háttérbe kerül.

---

---

### 2026. május 13. - Előzmények UI kompaktosítás, Preview és Összevonás

#### Kompakt kártyalayout (Szedések fül)
- **Egysor design:** A 2-soros (header + footer) kártyák egyetlen ~50px-es sorrá sűrűsödtek. Bal: cég pill + dátum + módosítás badge + futár + rendelésszám + időpont. Közép: 3 ikon-only nyomtatógomb + fekete "Teljes" gomb. Jobb: Betöltés + törlés + preview toggle.
- **Modal padding csökkentve:** `32px → 16px`, kártyák közötti rés `10px → 5px`. Egyszerre 6-8 szedés látszik laptopon (volt 2-3).
- **Trash / Statisztika kártyák érintetlenek.**

#### Rendelés Preview
- **Chevron toggle gomb** minden kártyán — kattintásra kinyílik egy chip-sor az összes rendelésszámmal és vevőnévvel.
- **Chip hover:** kék keret, tooltip mutatja a szállítási címet.
- **CSS:** `max-height` animáció, `open` class toggle.

#### Szedések Összevonása
- **"Összevonás" toggle gomb** a Korábbi Szállítási Körök fejléce mellett.
- Aktív módban checkboxok jelennek meg a kártyákon, lila sticky action bar alul (kijelölt körök száma + Összevon gomb).
- **Merge modal:** új dátum / szállítócég / futár megadása (előre kitöltve az első kör adataival).
- **Adatmodell:** összevont kör kap `isMerged: true`, `mergedFromIds[]`, `mergedFromDocIds[]` flageket. Eredeti körök `isMergedInto` flaget kapnak és eltűnnek a listából.
- **Összevont badge:** lila "Összevont (N kör)" jelzés az összevont kör kártyáján.
- **Visszavon gomb:** sárga "Visszavon" gomb az összevont kártyán — confirm után visszaállítja az eredetieket (`isMergedInto` törlése), az összevont kör törlődik.
- **Többszörös összevonás:** biztonságos, szintenkénti undo (AB+C→ABC visszavon → AB és C jön vissza, AB saját visszavonója megmarad).
- **Cache-busting:** `app.js?v=7`

#### Technikai tanulságok:
- Az összevont és eredeti körök elkülönítése `isMergedInto` flaggel (nem külön kollekció) — egyszerű, Firestore-barát megoldás.
- `mergedFromDocIds` (Firestore doc ID-k) tárolása a merged runban kulcsfontosságú a pontos visszavonáshoz.
- Szintenkénti undo: `revertMerge` csak egy szintet von vissza — nem kell rekurzió, a mélységi lánc minden eleme önálló entitás.

---

---

### 2026. május 14. - Gyors Szállítólevél, Előzmények UI újratervezés, Elszámolások, Statisztika térkép

#### Gyors Szállítólevél (Gyors SzL)
- **Új funkció:** Ad-hoc szállítólevél kiállítása CSV import nélkül, Dynamic Island gombból.
- **Modal mezők:** Feladó (select), Szállító Cég (szabad szöveg), Átvevő (név/cég/cím/telefon), tételek (dinamikus sorok).
- **Mentés:** Firestore-ba menti `isQuickDelivery: true` flaggel + `quickDeliveryData` payloaddal.
- **Terminológia:** "Futár" → "Szállító" az egész UI-ban és nyomtatott lapokon.
- **COD nincs:** Gyors szállítóleveleken nem jelenik meg utánvét szekció.
- **2 példány** nyomtatva.
- **Saját "⚡ Gyors SzL" fül** az Előzmények modalban — szűrve a normál Szedések fülről.

#### Előzmények UI/UX újratervezés
- **"Előzmények" gomb** kikerült a headerből → saját floating pill jobb alul (`#history-island`, azonos stílus mint Dynamic Island, de `right: 30px`).
- **Szemetes** kikerült a tabok közül → modal header ikonja; kattintásra slide-in panel nyílik "← Vissza" gombbal, tab sor eltűnik.
- **4 tab maradt:** Szedések | ⚡ Gyors SzL | Elszámolások | Statisztika.

#### Elszámolások tab — teljes átírás
- **COD szűrő:** csak utánvétes fuvarok látszanak.
- **Checkbox alapból bejelölve:** kipipált fuvar azonnal eltűnik; kikapcsolva visszajönnek.
- **Részleges elszámolás:** `settledAmount` + `uncollectedOrderIds` tárolva Firestoreban.
- **3 vizuális állapot:** szürke kör (függőben), narancssárga (részleges), zöld (elszámolva).
- **Részleges + elszámolt egyaránt eltűnik** a "csak függőben" filterből.
- **`showSettlementDialog(run, runCOD)`:** custom glassmorphism modal, COD rendelések checkboxokkal, élő összesítő, "−X Ft hiányzik" visszajelzés.
- **Order chips kibővítve:** nem beérkezett rendelések áthúzva + "nem érkezett" badge.
- **`HistoryManager.revertToPending(docId)`** új függvény.

#### Statisztika tab — teljes újraírás
- Régi késési statisztika befagyasztva (kód megmarad).
- **6 új szekció:**
  1. Szállítói összesítő (terítés / rendelés / COD összeg / kiesett per courier)
  2. Havi forgalom (CSS sávok)
  3. Havi utánvét volumen (beérkezett/kiesett/függőben szegmentált sávval)
  4. Top 15 szállított termék (qty-vel súlyozva)
  5. Területi sűrűség — **Leaflet.js térkép** (CartoDB Positron tiles)
  6. Többször szállított rendelések (cross-run duplicate order ID-k)
- **Dátumszűrő** terítés napja alapján + "Összes" gomb.

#### Területi sűrűség térkép
- **Budapest egybe kezelve** — minden 1xxx zip egy pont Budapest közepén.
- **HU_ZIP lookup tábla** (~120 entry): Budapest 23 kerület (3-jegyű prefix) + ~80 vidéki város.
- **Nominatim fallback** ismeretlen zip-ekre, 1.1s rate limit, `localStorage` cache (`hu_zip_geocache_v1`).
- **Kompakt tömör pontok:** sqrt-skálán méretezve (4–14px), sötétkék, fehér szegély.
- **`statsLeafletMap`** module-level változó — destroy + reinit dátumváltáskor.

#### Technikai tanulságok
- `window.prompt()` kerülendő — mindig `showSettlementDialog`-féle custom modal illeszkedik jobban a glassmorphism UI-hoz.
- Leaflet `.remove()` kötelező mielőtt ugyanazon div-en újrainicializálunk.
- Budapest összes zip kód egy pontba vonandó — körzetenként külön pont nem ad értékes info-t.
- `sqrt`-skála a körök méretezésénél sokkal jobb mint lineáris: 200 vs 10 rendelés nem 20× méretű pontot eredményez.

#### Cache verzió
`app.js?v=19`

---

### 2026. május 16. - Elszámolás Visszavonás Javítás, Statisztika Bento Box Redesign, Kiesett Összevonás, Térkép Tooltip

#### Elszámolás "Visszavonás" bugjavítás
- **Probléma:** Visszavonás után a futár körök "5 kiesett" badge-et mutattak, holott visszaálltak függőbe.
- **Ok:** A régi handler `updateSettlementStatus(docId, 0, totalCOD, allCodIds, {}, {})` hívott — az összes COD rendelést uncollected-ként írta vissza Firestore-ba.
- **Javítás:** `btn-nullify-settlement` handler mostantól `revertToPending(docId)`-t hív.
- **`revertToPending` kibővítve:** `deleteField()` törli az összes settlement-mezőt (`uncollectedOrderIds`, `uncollectedReasons`, `partialOrders`, `settledAmount`, `settledAt`, `isSettled: false`).
- **Visszavonás gomb láthatóság:** A gomb megjelenik ha `run.isSettled || isPartial || uncollected.length > 0` — korábban az `uncollected.length > 0` feltétel hiányzott, így visszavonás utáni újratöltésnél a gomb eltűnt, holott a badge megmaradt.

#### Statisztika Bento Box Layout
- **`stats-runs-container`:** `display: flex; flex-direction: column` → `display: grid; grid-template-columns: 1fr 1fr; gap: 14px; grid-auto-flow: row dense`
- **`makeSection()` frissítve:** `fullWidth` paraméter hozzáadva — Szállítói összesítő, Top termékek, Kiesett rendelések teljes szélességűek; Havi forgalom és Havi utánvét kétoszlopos grid-ben oldalra kerülnek.
- **Tömörebb padding:** `24px/28px → 10px/14px`, flex layout.
- **Lenyitható szekciók:** `makeCollapsible(rowsArr, label, visible=5)` helper — alapból top 5 látszik, "Összes mutatása (N)" gombra nyílik ki; egyedi ID-kkel több szekció egymástól független.

#### Térkép Fejlesztések
- **Görgetésvédelem:** `scrollWheelZoom: false` — az oldal görgethető a térkép felett.
- **Magyarország fitBounds:** `fitBounds([[45.7, 16.1], [48.6, 22.9]])` — az összes megye, enyhe padding.
- **Magasság:** `350px → 460px`.
- **Hover tooltip:** kattintás helyett `bindTooltip` minden markeren — megjelenik a helységnév, rendelések száma, és az összes rendelésszám (numerikusan rendezve).
- **Dinamikus tooltip grid:** 1-5 rendelés → 1 oszlop (130px max), 6-14 → 2 oszlop (210px), 15+ → 3 oszlop (300px).
- **`zipMap[key].orderIds[]`** tömb tárolva minden helységnél, order ID-k összegyűjtéséhez.

#### Kiesett + Többször Szállított Összevonás
- **"Többször szállított rendelések" szekció eltávolítva** — információja beolvadt a Kiesett rendelésekbe.
- **`orderRunsMap` (Map):** cross-run nyomon követés — minden rendelés ID-hoz tárolja az összes körben való megjelenését (dátum, futár, `isUncollected`, `isPartial`, `wasReceived`, `wasPartialReceived`).
- **Re-delivery sub-sor:** Ha egy kiesett rendelés egy LATER körben is megjelenik, alatta `renderLaterEntries()` mutatja az eredményt (zöld ✓, sárga ≈, piros ✗ badge).
- **Sorrendezés:** Kiesett rendelések — utólag átvett rendelések mindig a lista végére kerülnek; azon belül dátum szerint csökkenő sorrend.
- **Szürke COD összeg:** Ha egy kiesett rendelés utólag `wasReceived || wasPartialReceived` → a COD összeg szürkén jelenik meg (`#94a3b8`), nem fekete.
- **Kiesett sor layout:** ID 70px fix, vevőnév `flex:1`, jobb oldal `flex-shrink:0` — megszűnt a felesleges középső tér.

#### Nem-COD Rendelések az Elszámolásdialogban
- **`showSettlementDialog` átírva:** COD és nem-COD rendelések egymástól elkülönítetten kezelve.
- **Nem-COD sorok:** "Nem utánvétes" badge, egyszerű átadva/nem lett átadva toggle, indoklás dropdown.
- **`updateTotal()`:** Csak a `data-is-cod="true"` sorokat számolja.
- **Save handler:** Mindkét típus `uncollectedOrderIds`-ba kerül ha kiesett/nem átadva.
- **Order chips:** `isUncollected` check eltávolítva az `o.isCOD &&` feltételtől → nem-COD rendelések is mutatják a "nem lett átadva" / "átadva" állapotot.

#### Kritikus Bug: Duplikált `const overlay` szintaktikai hiba
- **Tünet:** Visszavonás után az összes gomb leállt — sem Előzmények, sem Gyors SzL, sem semmi nem működött.
- **Ok:** `showSettlementDialog` többlépéses átírásánál az eredeti `const overlay = document.createElement('div')` deklaráció (2040. sor) bent maradt, majd egy másik edit újra hozzáadta (2100. sor). Az ES modul SyntaxError-ral megállt.
- **Detektálás:** `node --input-type=module < js/app.js 2>&1` — azonnali hibajelzés.
- **Tanulság:** Komplex függvény több lépéses átírásakor **mindig futtatni kell syntax check-et** a befejezés előtt.

### 2026. május 29. - Statisztika Al-oldalak Refaktora & Modul Betöltési Optimalizáció
- **Statisztika Lap Al-oldalas Rendszere:** A régi bento box elrendezést egy modern Apple segmented control fül-alapú navigációra cseréltük (`Futárok` | `Diagramok` | `Termékek` | `Térkép` | `Kiesett rendelések`). Csak az aktív fül renderelődik, így a térkép és a kiesett rendelések nem futnak feleslegesen a háttérben.
- **Térkép Optimalizáció:** A Leaflet térkép és a Nominatim API geokódolója most már kizárólag a Térkép fül megnyitásakor inicializálódik, ami megszünteti a méretarány- és rendering hibákat, és javítja a betöltési sebességet.
- **Modul Betöltési Race Condition Elkerülése (Kritikus hiba):** Javítottunk egy rejtett, de kritikus ES Modul hibát. Ha az `app.js` modulként való betöltése (és cachingje) lassabb volt, vagy épp gyorsabb volt, mint az HTML betöltése, a `DOMContentLoaded` esemény már lefutott, mire a script feliratkozott rá, így a gombok teljesen működésképtelenek maradtak. Mostantól az `app.js` ellenőrzi a `document.readyState`-et, és ha the DOM már kész, azonnal lefut a `initApp()`, teljesen kizárva a gombok működésképtelenségét.
- **Firebase Duplikált Inicializáció Javítása:** Megszüntettük a Firebase `duplicate-app` hibát, amit az okozott, hogy az `index.html` inline scriptje és az `app.js` által importált `firebase-config.js` is meghívta az `initializeApp()`-et az alapértelmezett beállításokkal. Bevezettük a `getApps().length > 0` ellenőrzést, így a Firebase-t csak egyszer, biztonságosan inicializáljuk.
- **Mély-Import Cache-busting (Kritikus hiba):** Mivel az `app.js` sima `import ... from './firebase-config.js'` deklarációt használt, a böngésző a cache-elt `firebase-config.js`-t hívta meg a duplicate-app ellenőrzések bevezetése előtt is. Hozzáadtuk a `?v=38` lekérdező paramétert az import útvonalhoz az `app.js`-ben (`from './firebase-config.js?v=38'`), így a böngésző kénytelen a frissített konfigurációs fájlt betölteni.
- **Cache-busting:** `index.html`-ben `app.js?v=38` → böngésző mindig a legfrissebb kódot tölti be.

### 2026. június 2. - Kereső bővítése és Elszámolás Bugfix
- **Kereső bővítése:** A globális kereső (Előzmények fülön) mostantól a találatok fejlécében megjeleníti a futár nevét (egy világoskék címkén) és az elszámolás státuszát (pl. Készpénzben elszámolva, Utólag elutalva, Függőben lévő elszámolás).
- **Elszámolás típuseltérés Bugfix:** Javítva egy rejtett hiba, ami miatt a rendszer a kiesett rendeléseket tartalmazó köröket hibásan 'Függőben lévő'-ként mentette az adatbázisba (szöveg vs szám azonosító típuseltérés miatt). Az updateSettlementStatus algoritmus szigorú konverziókat kapott.
- **Kereső dinamikus státusz kalkuláció:** Mivel a régi hibás adatbázis-bejegyzések miatt a kereső továbbra is fals státuszt mutatna, a kereső mostantól dinamikusan élőben újraszámolja (a javított algoritmussal) a kör elszámolási státuszát, ha az az adatbázis szerint még függőben lenne.
- **Architektúra Szabályok:** ARCHITECTURE.md és egy belső knowledge bázis bejegyzés létrehozva a monolitikus  pp.js védelmére: új funkciók csak modulárisan, külön fájlban készíthetőek.

## Következő Lépések (TODO)
- [x] **Keresési találatok elszámolás-kapcsolata és indokok:** Megoldva.
- [x] **Előzmények szűrés újraírása:** Megoldva.
- [x] **Drag & Drop fluiditás:** Megoldva.
- [x] **Szerkesztett adatok prioritása:** Megoldva.
- [x] **Utólagos módosítás kezelése:** Megoldva.
- [x] **Sorrend mód gomb:** Megoldva.
- [x] **Előzmények kompakt layout + preview + összevonás:** Megoldva.
- [x] **Gyors Szállítólevél, Előzmények UI redesign, Elszámolások, Statisztika térkép:** Megoldva (2026-05-14).
- [ ] **Egyszerűsített Elszámolás:** Az elszámolás folyamatának logikáját és UI-ját jelentősen egyszerűsíteni kell.
- [ ] **Architektúra Refaktorálás:** A kódbázis rendbetétele az  pp.js szétdarabolásával (vagy funkciók ésszerű kiszervezésével), elkerülve a spagetti kódot, szigorúan betartva az eseménykezelők biztonságát.
- [ ] **Részleges visszahozatal / Utólagos elszámolás**: mi van ha csak visszahoznak lapokat, mert nem vették át egy kör egyik címét, viszont mivel nem Létai-s nem hozzák vissza az utánvétet csak a panelt és az utánvét később kerül átadásra stbstb

### 2026. június 3. - Keresési találatok UI finomítása & Elszámolás integráció
- **Nyomtatási gombok eltávolítása a keresőből:** A keresési találatok közül kivettük az összes felesleges nyomtatási gombot (szedőlista, szállítólevél, összesítő és csomag nyomtatása), mivel itt nem akarjuk kinyomtatni a kört.
- **Közvetlen elszámolás megnyitása:** A "Kör betöltése" helyett bevezettünk egy közvetlen "Elszámolás megnyitása" gombot a találati kártyákon. Erre kattintva azonnal felugrik az adott szállítási kör elszámolási ablaka (showSettlementDialog), ahol látható a teljes kör és minden korábbi elszámolási állapot.
- **Sikertelen kézbesítés indokának és felelősének megjelenítése:** Ha egy keresett rendelés szerepel a sikertelenül kézbesített ("kiesett") rendelések között az adott körben, a keresési találat alatt egy narancssárga figyelmeztető dobozban megjelenik a rögzített indoklás és a felelősség (pl. "Visszaérkezett / Nem kereste: Vevő lemondta - Felelős: Vevő").
- **Külön "Rendelések" fül bevezetése:** Létrehoztunk egy új "Rendelések" fület az Előzmények modalban. Itt az összes kör összes rendelése egyetlen nagy listában böngészhető kompakt, lekerekített kártyákon.
- **Keresés és Szűrés a Rendelések fülön:** A Rendelések fül is teljes mértékben támogatja a globális keresést (név, ID, cím, termék, telefon alapján) és a cég/dátum szűrőket. Ha nincs keresési kifejezés, a legutóbbi 200 megrendelés jelenik meg alapértelmezetten.
- **Keresés finomítása a Szedések fülön:** A Szedések fülön történő keresés mostantól nem szedi szét a köröket kártyákra, hanem a teljes szállítási köröket szűri az alapján, hogy szerepel-e bennük a keresett kifejezés vagy rendelés.
- **Keresési és renderelési Bugfix (Robusztus szövegpárosítás):** Megoldottunk egy hibát, ami miatt az üres vagy szám típusú rendelés-paraméterek (pl. `shippingName` hiánya vagy numerikus `id`) esetén a szövegkereső TypeError-t dobott és összeomlasztotta a kártyák renderelését (ezért üres maradt a lista). Mostantól minden mezőt defenzíven `String()` konverzióval kezelünk.
- **DOM Nesting Hiba Javítása (Rendelések Fül Láthatósága):** Kijavítottuk a DOM struktúrát az `index.html`-ben: a `#tab-content-history` (`Szedések` fül) tárolója nem volt lezárva a `Rendelések` (`#tab-content-orders`) és más fülek előtt. Emiatt az összes többi fül beágyazódott a `Szedések` fül alá, és amikor a `Szedések` fület elrejtettük (`display: none`), a `Rendelések` fül is láthatatlan maradt. A megfelelő lezárással a fülváltás hibátlanul működik és azonnal megjelennek a megrendelés kártyák.
- **Kattintható Kör-adatok (Gyors Elszámolás elérés):** A rendelési kártyákon a kör dátumára (naptár ikon) vagy a futár nevére (teherautó ikon) kattintva is azonnal megnyílik az adott kör részletes elszámolási ablaka (dialog), pont úgy, mint az "Elszámolás" gombra kattintva.
- **Nem utánvétes körök elszámolásának támogatása:** Eltávolítottuk az `Elszámolások` fülről az utánvét-kényszerítő szűrőt (`runs.some(o => o.isCOD)`). Mostantól a kizárólag nem utánvétes (pl. bankkártyával, átutalással előre kifizetett) körök is megjelennek a listában, így ellenőrizhető és rögzíthető a sikeres kézbesítés vagy a kiesések indoklása pénzmozgás nélkül is.
- **Gyors Szállítólevél (Gyors SzL) funkció teljes eltávolítása:** A felhasználó kérésére teljesen megszüntettük a "Gyors SzL" (villám ikonos) ad-hoc szállítólevél generálót és a hozzá kapcsolódó összes felületi elemet (gombok az irányítópulton és az előzményekben, külön modal a felvételhez, fül az előzményeknél). Az app.js-ből, index.html-ből és a nyomtatási szolgáltatásokból is kitöröltük a hozzá tartozó kódokat.
- **Régi gyors szállítólevelek elrejtése/szűrése:** A Firestore-ból betöltött korábbi adatok közül a lekérdezéskor (`getAllRuns`) automatikusan kiszűrjük és figyelmen kívül hagyjuk a `isQuickDelivery: true` tulajdonságú bejegyzéseket, így azok nem jelennek meg sehol az előzményekben vagy elszámolásoknál.
- **Cache-busting:** `index.html`-ben `app.js?v=111`.

### 2026. június 11. - PannonXP Ragasztó Csomagolás Egyszerűsítés, Dobozsúly és Hibaellenőrzés
- **Ragasztó csomagolás egyszerűsítése:** Ha a rendelésben van akusztikus panel (akupanel), a ragasztó súlya nem adódik hozzá a csomaghoz (teljesen ingyen bekerül az akupanel mellé, nem képez külön csomagot), csupán a csomag leírásához kerül hozzá a ` (+ragasztó)` megjegyzés. Amennyiben nincs akupanel a rendelésben, a ragasztó saját csomagot kap a beállított maximális darabszám és méretek szerint.
- **Doboz súly támogatása ragasztónál:** A beállítások menüben a "Ragasztók & Segédanyagok" kategóriához is bevezettük a "Doboz súlya (kg)" mezőt. Ha a ragasztó külön csomagot kap (mert nincs akupanel a rendelésben), a csomag súlyának kiszámításakor a doboz saját súlya is hozzáadódik a termékek összsúlyához.
- **Ismeretlen termékek detektálása és piros jelzése:** Bevezettünk egy hibaellenőrzést a csomagolás-kalkulációba (`hasUnmatched`). Ha egy terméket nem sikerült besorolni egyik kategóriába sem (nem egyezett a kulcsszavakra), a rendelés sora halvány piros hátteret kap, és megjelenik a `⚠️ Ismeretlen termék!` figyelmeztetés.
- **Szigorú exportálási védelem:** Ha a kijelölt (exportálandó) megrendelések között bármelyik piros/hibás (hiányzó irányítószám vagy ismeretlen termék miatt), a "PannonXP CSV Exportálása" gomb letiltódik, így nem generálható hibás CSV fájl.
- **Validáció enyhítése (Telefonszám és Email):** A felhasználó kérésére a telefonszám hiányát kivettük a kritikus hibák közül. Ha egy rendelésnél nincs telefonszám megadva, az többé nem színezi pirosra a sort, és nem gátolja az exportálást sem.
- **SPC Padlócsoportosítás jegelése:** A korábbi bonyolult SPC padló és egyéb kategória-összevonási csoportosításokat a felhasználó kérésére lejegeltük és eltávolítottuk a kódból.
- **Cache-busting:** `index.html`-ben `app.js?v=132`.

### 2026. június 13. - Shopify Product CSV variáns propagáció és PannonXP leírások egységesítése
- **Shopify Termék CSV variáns parser javítása**: Kijavítottuk a termék CSV-k beolvasását (`pannonxpView.js`-ben). Mivel a Shopify a `Title` és `Option Name` mezőket csak a termékek legelső variánsának sorában exportálja, a parser korábban átugrotta a további variánsokat. Mostantól a rendszer megjegyzi és automatikusan továbbviszi a hiányzó adatokat a többi variáns sorára is, így az összes variáns (pl. Élzáró Profil ezüst, arany, fekete) sikeresen beolvasásra kerül a táblázatba.
- **Csomag leírások egységesítése**: Standardizáltuk a PannonXP csomagok leírását a felületen (`pannonxp.js`-ben) és a letöltött CSV-fájl tartalom (`szl_tartalom`) mezőjében egységesen a **"Panelburkolatok és kiegészítők"** szövegre, lefedve minden szállítási forgatókönyvet.
- **Cache verzió frissítve**: `index.html`-ben `app.js?v=133` (és megegyezően a többi modul-hivatkozásnál).

### 2026. június 16. - Szállítási cím és Notes utánvét dátum-ütközési hiba javítása
- **Robusztus szállítási cím feldolgozás**: A `js/services/shopify.js`-ben a `fullShippingAddress` összeállításánál beépítettük a `row['Shipping Street']` mező elsődleges használatát. Ha a Shopify CSV-ben a `Shipping Address1` és `Shipping Address2` mezők üresek vagy hiányosak lennének, a rendszer a teljes utca+házszám adatot tartalmazó `Shipping Street` mezőből nyeri ki a címet, megakadályozva, hogy a pontos cím elvesszen és csak az irányítószám+város kerüljön a szállítólevélre.
- **Szerkesztéskori címtörlési hiba (Address Wipeout) javítása**: A `js/controllers/manualOrderController.js`-ben javítottuk az `openEditModal` működését. Korábban a szerkesztő modal megnyitásakor az `address` (ami csak irányítószámot és várost tartalmazott a kompakt lista-megjelenítés miatt) került betöltésre a beviteli mezőbe a `fullAddress` helyett. Mentéskor ez felülírta a Firestore-ban lévő teljes címet, így törlődött a pontos szállítási cím. Mostantól a modal a teljes címet (`order.fullAddress || order.address`) tölti be szerkesztésre, megvédve a pontos utcaneveket.
- **Notes dátumok szűrése az utánvét-kalkuláció előtt**: Megoldottuk azt a hibát, hogy a notes mezőben szereplő dátumokat (pl. `06.16` vagy `2026.06.16`) a rendszer tévesen utánvét összegnek (pl. 616 Ft) nézte. A `js/services/shopify.js` parser-ben az utánvét-kereső regex futtatása előtt egy robusztus szűrővel eltávolítjuk a dátum-mintázatokat, valamint megcseréltük az egyezések prioritását (először a konkrét `utánvét: X` típusú mintát keressük, és csak végső esetben esünk vissza a sima számokra), így teljesen kizártuk a hamis utánvét-felismeréseket.
- **Cache-busting frissítve**: `index.html`-ben és az importokban a verziót `?v=147`-re emeltük.

### 2026. július 1. - Logisztikai átadás és Pénzügyi rendezettség rendelés szintű különválasztása
- **Rendelés szintű fizetési státusz**: Teljesen függetlenítettük a logisztikai kézbesítést az utánvét kifizetésének fizikai beérkezésétől. A `showSettlementDialog` felületen a sikeres COD rendelések mellé bevezettünk egy **"Nálunk van"** checkboxot. Ezzel külön-külön jelezhető, hogy az adott tétel összege már megérkezett hozzánk (pl. a futár odaadta a KP-t, a vevő azonnal utalt), vagy még függőben van (kártyás utalásra várunk a szállítótól, vagy a futár csak másnap hozza a KP-t).
- **Finomhangolt összesítő panel**: A rögzítő modal alján a korábbi 3 helyett 4 részletes zónára osztottuk a kalkulációt: *💵 Nálunk lévő KP*, *⏳ Várható KP (futártól)*, *💳 Kártyás utalásra vár (szállítótól)* és *🏦 Közvetlen utalások (vevőtől)*. A "Nálunk van" checkbox állapota és a fizetési módok (KP / Kártya / Utalás) dinamikusan és azonnal újraszámolják ezeket.
- **Dinamikus fizetési badge-ek és státusz chipek**: Az Elszámolások tabon a terítések kártyáján külön jelennek meg a függőségek: **Függő KP: N Ft** (narancssárga) és **Utalásra vár: N Ft** (kék). A rendelések chipes listáján az ikonok mellett a `⏳` (függő) és `✓` (rendezve) szimbólumok jelzik az egyes tételek pénzügyi állapotát.
- **Csoportos beérkezések kezelése**: A terítés kártyájára két új akciógombot integráltunk: **💵 KP megjött** és **💳 Kártya utalva**. Ezekkel egyetlen kattintással és megerősítéssel lezárható az adott kör összes függő KP-s vagy kártyás követelése, így a terítés azonnal átvált zöld, teljesen elszámolt státuszra, amint minden tétel rendezetté válik.
- **Firebase és Service Layer bővítés**: A `HistoryManager`-ben elmentjük a `paymentStatusMap` (`{ [orderId]: 'received' | 'pending' }`) térképet, és bevezettük a `settlePaymentGroup(docId, type)` metódust a cash/card típusú követelések csoportos rendezéséhez.
- **Szűrt követelések összesítő panel**: Az Elszámolások tab tetejére beépítettünk egy prémium, dinamikus statisztikai sávot, ami a dátum és a szállítócég szűrők alapján azonnal kiszámolja az aktív időszakra vonatkozó összesített kintlévőséget (Függő KP és Kártyás utalásra váró összegek).
- **Visszakompatibilitási réteg a régi adatokhoz**: Felkészítettük a rendszert a régi (még a `paymentStatusMap` bevezetése előtt rögzített) részleges elszámolások kezelésére. A `renderAccountingRuns` betöltésekor automatikusan legenerálunk egy virtuális állapot-térképet a régi elszámolások tényadatai alapján. Ezzel elértük, hogy a régi, lezárt részleges terítések is helyesen, zöld színnel (teljesen elszámoltként) jelennek meg, és eltűnnek a "Csak függőben lévő fuvarok" szűrő alól.
- **Hibakezelés és biztonsági try-catch**: A Visszavonás és Visszaállítás funkciókat kliens oldali és Firebase tranzakció-szintű hibakezeléssel vérteztük fel (alert és try-catch blokkokkal), valamint a Firestore `deleteField()` törlését is finomhangoltuk.
- **Cache-busting verzió**: Az `index.html`-ben a script hivatkozást `js/app.js?v=158`-ra, a CSS stílust pedig `css/style.css?v=40`-re emeltük.

### 2026. július 2. - Elszámolás CSV Export és Státuszszínek Javítása
- **Szűrési Logika Szinkronizációja**: Kijavítottuk a hibát, ami miatt az Elszámolások fülön lévő "Export CSV" gomb megnyomásakor a rendszer tévesen azt jelezte, hogy nincs exportálható adat. A szűrést a felülettel azonos módon a `paymentStatusMap[o.id] === 'pending'` állapot szerint végezzük.
- **Rendelés szintű függő szűrés**: Kiterjesztettük a CSV exportálót egy opcionális `onlyPending` paraméterrel, így ha be van jelölve a szűrő, csak a még függő kintlévőséges rendeléseket mentjük el.
- **Letisztultabb CSV struktúra & Kintlévőségek követése**:
  - Eltávolítottuk a zajos oszlopokat (pl. Terítés ID, Cím, Telefon, Utánvétes?, Szállító tartozása, Felelős, Elvárt Utánvét).
  - A beérkezett összegek helyett a még kézhez nem kapott összegeket mentjük a **Függő KP (futártól) (Ft)** és a **Kártyás utalásra vár (szállítótól) (Ft)** oszlopokba (amik 0 Ft-ot mutatnak, ha a státusz már rendezett vagy közvetlen utalásos).
- **Körök Státuszszíneinek Finomhangolása**: Az elszámolandó körök bal szélén lévő státuszjelző körök színét frissítettük:
  - **Piros (`#ef4444`)**: Ha a kör még egyáltalán nincs elszámolva (a rögzítés még nem futott le, és `settledAt` hiányzik, valamint nincsenek részleges összegek vagy rögzített kiesett rendelések sem). Ez a kezdeti és a teljesen visszavont (resetelt) állapot.
  - **Sárga/Citromsárga (`#eab308`)**: Ha már elindult az elszámolás, de még készpénzt (KP) várunk a futártól (a vásárlóknak megérkezett, de a pénz még nincs nálunk).
  - **Kék (`#2563eb`)**: Ha a készpénzes rész lezárult (a vevők megkapták), de már csak kártyás utalások beérkezésére várunk a szállítócégtől.
  - **Zöld (`#22c55e`)**: Ha minden kész (minden tétel maradéktalanul kiegyenlítésre került és nálunk van).
- **Elszámolatlan Körök Javítása (Függő KP / Gombok Rejtése)**: Megoldottuk azt a hibát, hogy az elszámolatlan (piros) körök is tévesen sárgának mutatták magukat "Függő KP" felirattal és "KP megjött" gombbal. Mostantól ha egy kör még nincs elszámolva (`isNeverSettled`), a rendszer a függő összegeket 0-nak tekinti a felületen, elrejti a gyors gombokat, és tisztán a **Piros** állapotot mutatja.
- **Cache-busting frissítve**: Az `index.html`-ben az `app.js` hivatkozás verzióját `?v=168`-re emeltük.

### 2026. július 2. - PannonXP CSV export UTF-8 BOM eltávolítása
- **BOM Karakter Eltávolítása**: A PannonXP IT csapatának kérésére a PannonXP export generálásánál (`js/app.js`) a Blob fájl letöltéséből eltávolítottuk a fájl elejére fűzött UTF-8 Byte Order Mark (BOM) bájtsorozatot (`[0xEF, 0xBB, 0xBF]`). Ezzel a CSV export tisztán UTF-8 (BOM nélkül) kódolású lett, megkönnyítve a zökkenőmentes importálást a PannonXP rendszerébe.
- **GitHub Pages Build Javítás (.nojekyll)**: Létrehoztunk egy `.nojekyll` fájlt a gyökérkönyvtárban, hogy a GitHub Pages kihagyja a Jekyll fordítási lépést. Ez megelőzi a Jekyll szintaktikai/kódolási hibák miatti build-elakadásokat és azonnali sikeres telepítést biztosít.

### 2026. július 3. - Rendelés Szintű Elszámolási Badge-ek Javítása
- **Pontos Rendelés Státusz Megjelenítés**: Kijavítottuk azt a hibát, hogy az Előzmények fülön a globális keresési találatokban a megrendelések (pl. a #2830-as rendelés) tévesen zöld "Elszámolva" badge-et kaptak akkor is, ha a rögzítő felületen még nem voltak pénzügyileg rendezve (azaz a "Nálunk van" checkbox üres volt).
- **Integráció a paymentStatusMap-pel**: A keresési listázót (`historyView.js`) felkészítettük az új, rendelés szintű állapot-térkép lekérdezésére. Ha az adott rendelés kintlévősége függőben van (`status === 'pending'`), a státusza zöld "Elszámolva" helyett helyesen sárga/amber **"Függőben"** (vagy a kis chipeken szürke **"Függő"**) színnel jelenik meg a felületeken.
- **Cache-busting frissítve**: Az `index.html`-ben az `app.js` hivatkozás verzióját `?v=170`-re emeltük.

### 2026. július 3. - Számlaellenőrzés (Audit Panel) Bevezetése
- **Új Audit Panel**: Létrehoztunk egy új **Számlaellenőrzés** fület a történeti modalban (`js/views/auditView.js`), amellyel ellenőrizhetők a szállító cégek számlái a vitás/duplázott tételek kizárásához.
- **Részletes szűrés és vizualizáció**:
  - Dátum (kezdő/záró) és szállító cég szerinti szűrés.
  - A kiesett, részleges és duplikált megrendelések kártyái **3 oszlopos rácsos (grid) elrendezésben** jelennek meg a jobb helykihasználás érdekében.
  - **Duplikáció szűrő**: Összegyűjti és megjeleníti azokat a rendeléseket, amelyek többször is rákerültek egy-egy futárkörre, bemutatva a kísérletek történeti idővonalát (mikor, melyik futárral, milyen eredménnyel és megjegyzéssel futott le a szállítás).
- **Audit CSV Export**: Beépítettünk egy CSV exportálót, ami pontosvesszős elválasztással, UTF-8 kódolással (BOM nélkül a szállítói rendszerek elvárásának megfelelően) kimenti a szűrt audit listát az Excel alapú összevetés megkönnyítésére.

### 2026. július 8. - Számlaellenőrzés Csoportosítás & Globális Szűrők Integrációja
- **Szállító Hibás és Csoportosított Rendelések**: Az Audit Panelt (`js/views/auditView.js`) átalakítottuk úgy, hogy csak azok a rendelések látszódjanak, ahol legalább egy kiszállítási kísérlet felelőse a **szállító** volt.
- **Kiszállítási Kísérletek Összevonása**: Ha egy megrendelést többször próbáltak meg kiszállítani, az nem szerepel többször külön kártyaként. Ehelyett egyetlen kártyába csoportosítva jelenik meg, feltüntetve az összes kiszállítási kísérlet részleteit (dátum, cég, futár, státusz/eredmény, egyedi kommentek és az adott kísérletért felelős személy).
- **Felesleges Duplikált Szűrők Eltávolítása**: Eltávolítottuk az Audit panel saját, redundáns szűrősávját. A Számlaellenőrzés fül mostantól zökkenőmentesen a történeti modal tetején lévő közös, globális szűrőket (Globális keresés, Szállító cég dropdown, Kezdő/Záró dátum) használja. Az ehhez kapcsolódó eseménykezelőket (`js/app.js`) is frissítettük a valós idejű szűrés érdekében.
- **Kompakt Fejléc és CSV Export**: A helyi szűrők helyén egy letisztult, informatív fejléc kapott helyet, amely tartalmazza a CSV exportálás gombot is.
- **Sikeres kísérletek tisztítása**: A sikeresen végződött kiszállítási kísérleteknél teljesen elrejtettük a felelős kiválasztására szolgáló alsó sávot és gombokat, hiszen a sikeres átvételnél értelmezhetetlen a hibás felelős megjelölése.

### 2026. július 9. - Szedőlista Címkerubrikák Eltávolítása & Falpanel és Padlózat Kiemelés
- **Címke Checkboxok Eltávolítása**: Eltávolítottuk a korábbi "címke" oszlopot és jelölőnégyzeteket a szedőlista felületéről (`js/views/ordersView.js`), a nyomtatási sablonból (`js/services/printer.js`) és a PDF generálóból (`js/utils/printTemplates.js`), mivel ezekre már nincs szükség.
- **Padlózat Szó Kiemelése és Inverzálása**: Bevezettünk egy `highlightItemName` segédfüggvényt, amely a tétel nevében szereplő "padlózat" (vagy ragozott formái, pl. "padlózatok") szót keresi meg, és kizárólag ezt a szót emeli ki/inverzálja a szövegben (fekete háttér fehér betűkkel, félkövér betűstílussal). Ez a kiemelés a felületen és a kinyomtatott lapon (PDF-ben is) megjelenik, így fekete-fehér nyomtatásnál is azonnal és kontrasztosan felismerhetővé teszi a padlózat tételeket.
- **Cache-Busting Frissítés**: Az `index.html`-ben és az `app.js`-ben megemeltük az importálási verziókat (`?v=172`-re).

### 2026. július 10. - Osztott fizetés és terítési elszámolás kibővítése
- **Osztott fizetések kezelése**: Az elszámolási ablakban (`showSettlementDialog`) az utánvétes rendelésekhez bevezettünk egy teljesen új, külön mezős fizetési bontást. A korábbi választógombos (KP/Kártya/Utalás) módszer helyett mindhárom mezőhöz (Készpénz, Kártya, Utalás) külön érték bevitelt biztosítunk.
- **Független „Nálunk van” státusz**: Mindhárom fizetési részhez külön-külön bejelölhető a „Nálunk van” (received) jelölőnégyzet. Így rögzíthető pl. ha a vevő az összeg felét kp-ban kifizette (nálunk van), a másik felét pedig kártyával egyenlítette ki (amely még függőben van az elszámolásig).
- **Intelligens részleges fizetés**: Ha a megadott összegek összege kevesebb a teljes elvárt utánvétnél, a rendszer automatikusan részleges fizetésként kezeli a megrendelést, megjeleníti a hiányzó összeget, és megnyitja a részleges indoklási panelt a felelősségválasztóval.
- **Élő összesítő számítások**: Frissítettük az elszámolási ablak lábjegyzetében lévő élő kalkulátorokat (Nálunk lévő KP, Várható KP, Kártyás utalásra vár, Közvetlen utalások), hogy a megosztott értékek alapján pontosan jelenítsék meg a végösszegeket.
- **Kompatibilis adatbázis & cache-busting**: Az új osztott struktúra (`{ cash: X, card: Y, bank: Z }`) és a státusztömbök Firestore mentése teljesen visszafelé kompatibilis a korábbi egyszerű fizetési típusokkal. A cache-busting verziókat megemeltük `?v=173`-ra.
- **Nyomtatványok és bizonylatok testreszabása**:
  - Az **Összesítő lapon** diszkrét, dőlt betűs, keret nélküli apró lábjegyzetként feltüntettük a nyilatkozatot: `* Az alább felsorolt panelek sértetlen állapotban lettek átadva.`.
  - Az Összesítő lap fejlécébe egy 4 oszlopos, letisztult kategória összesítő szekciót ágyaztunk be, amely automatikusan összesíti és kiírja az adott körhöz tartozó **Falpanel**, **Ragasztó**, **Profil** és **Padlózat** darabszámokat.
  - Az Összesítő lapon a besorolhatatlan egyéb termékek automatikusan egy különálló sorban tételesen listázásra kerülnek: `Egyéb átadott termékek: plusz ... (db)`.
  - A **Korrekciós és Elszámoló lap** táblázatából eltávolítottuk a redundáns *Nem vette át* és *Utalás* oszlopokat, így közvetlenül a könnyen beikszelhető **KP** és **Kártya** rubrikák szerepelnek a rendelési sorok mellett.
  - A korrekciós lap elszámolási részét letisztítottuk (emojik nélkül), az *Utalással kifizetve* mező felkerült a többi fizetési mód közé a vonal fölé, a vonal alá pedig vastag kiemeléssel a leadandó fizikai készpénzt jelző **Átadott KP rész** került.
  - A Korrekciós lap fejlécében elhelyeztük a **gépjármű rendszámának** kitöltendő mezőjét (`Rendszám: ........................`).
  - A Korrekciós lap alján a hitelesítés megerősítésére bekerült az elismerő nyilatkozat: `Az aláírással elismerem, hogy a fenti adatok a valóságnak megfelelnek.`.
  - A korrekciós aláírás szekcióban pontosítottuk a **Sofőr aláírása** mezőt a futár nevével, és az átvevő aláírásához az **Elszámolás időpontja** rovatot rendeltük.
- **Szedőlista tételek automatikus rendezése**:
  - Mind a képernyős szedőlistán (rendeléskártyákon belül), mind a nyomtatott Kiszedési Jegyzéken automatikus rendezést vezettünk be: a tételek közül mindig a **falpanelek** kerülnek legfelülre, őket közvetlenül a **padlózatok** követik, az egyéb profilok, ragasztók és kiegészítők pedig a lista végére rendeződnek az átláthatóbb raktári munka érdekében.
- **Verziók & Cache-Busting**: A cache-busting verziókat frissítettük a böngészők kényszerített újratöltéséhez.

### 2026. július 13. - PannonXP Termékregisztrációs és Duplikációs Javítások
- **Szeparált Szedőlista betöltés**: Megszüntettük a termékek automatikus regisztrációját és a rövidítések kérését, amikor a megrendeléseket a normál **Szedőlista** (picking list) lapra töltik fel. A PannonXP-specifikus regisztráció kizárólag a **PannonXP Címkék** fül alatt végzett betöltésekre korlátozódik.
- **Rövidítések automatikus újraszámolása társítás után**: Kijavítottuk a hibát, ami miatt fuzzy match/hasonló termék elfogadása után a referenciaszámban továbbra is `?` szerepelt az új rövidítés helyett. A rendszer mostantól azonnal újragenerálja a referenciaszámokat (`pxp_referencia`), miután a felhasználó jóváhagyta az új variáció társítását.
- **Automatikus Adatbázis Deduplikáció és Üres Elemek Törlése**: Beépítettünk egy automatikus tisztító és összefésülő logikát a `PannonXPService.initializeMappings()` betöltési fázisába. Ez kiszűri és összevonja a termékvariációk miatti duplikált rekordokat (pl. Vintage Oak több sorban való ismétlődését), megtartva a már kitöltött legértékesebb (rövidítéssel bíró) adatokat. Emellett a korábbi szedőlistás feltöltésekből bent maradt teljesen üres (se rövidítéssel, se kategóriával nem rendelkező) bejegyzéseket is automatikusan törli a Firestore adatbázisból betöltéskor, így a beállítások táblázatban ezentúl minden termékcsalád tisztán, csak egyszer szerepel.
- **Rövidítések ABC sorrendbe rendezése és Összevont Sorok Elrejtése**: A termékbeállítások modal "Termék rövidítések" táblázatát átalakítottuk:
  - A már más termékhez párosított/összevont variációk (amelyek rendelkeznek `linkedTo` mutatóval) nem jelennek meg külön sorként, így elkerülhető, hogy a Vintage Oak és származékai 2 vagy több sorban is látszódjanak a listában.
  - A regisztrált terméklistát a megadott **rövidítések alapján ABC rendbe** állítva jelenítjük meg, a még kitöltetlen rövidítéssel bíró termékeket pedig a lista végére gyűjtjük.
- **Hasonló termék figyelmeztetések eltávolítása és automatikus rövidítés alapú összevonás**:
  - Teljesen eltávolítottuk a Levenshtein-hasonlóság alapján feldobott, zavaró *"A termék nagyon hasonlít egy már beállított termékre..."* megerősítő párbeszédpaneleket az új termékek regisztrációjakor.
  - Az új termékek csendesen, üres rövidítéssel és kategóriával kerülnek bejegyzésre, a raktárosnak csak a kategóriát és a rövidítést kell manuálisan megadnia.
  - Bevezettünk egy automatikus háttér-összevonási eljárást (`consolidateMappings`): ha a felhasználó elment egy új rövidítést, és az megegyezik egy már korábban regisztrált termékével (pl. mindkettőnek `"VO"` a rövidítése), a rendszer automatikusan összekapcsolja őket (`linkedTo` szülő-gyermek relációval). Így a beállított azonos rövidítésű variációk azonnal egyetlen sorba vonódnak össze a listában, megszüntetve a Vintage Oak és más azonos rövidítésű termékek ismétlődését.
- **Rendelések variálása a PannonXP táblázatban**:
  - **Szerkeszthető Utánvét (COD)**: A PannonXP lap táblázatában az utánvét oszlopot egy beviteli mezőre (`pxp-input-cod`) cseréltük. Így a megrendelések utánvét összegei exportálás előtt szabadon átírhatók, nullázhatók, vagy új összegek adhatók meg, és ez alapján a megrendelés COD státusza is automatikusan frissül.
  - **Termékek dinamikus törlése a címkéből**: A címzettek neve alatt megjelenítjük az adott megrendelésben szereplő termékek listáját. Minden terméksor mellett elhelyeztünk egy kis piros törlés ikont (`pxp-btn-delete-item`). Erre kattintva a termék véglegesen törlődik az adott PannonXP címkéből, ami után a rendszer automatikusan újraszámolja a referenciaszámokat, a csomagszámokat, a súlyokat és a hiányzó rövidítésre vonatkozó figyelmeztetéseket.
- **Részletes Csomagosztás a Referenciaszámban (Akusztikus Panelek)**:
  - Módosítottuk a referenciaszámok generálását a `generateDefaultReference` függvényben (`js/services/shopify.js`).
  - Az akusztikus paneleknél (`cat_acoustic` kategória) a teljes mennyiség egyben történő kiírása helyett a referenciaszámban megjelenítjük, hogy melyik dobozba hány darab kerül a maximális 5 db/csomag szabály alapján (pl. 6 darab panel és 7 ragasztó esetén a referencia formátuma: `2345 Pecan 3-3, HPR7` lesz).
  - Az egyes tételeket a referenciában a korábbi vesszős elválasztás helyett egy sokkal olvashatóbb szóközös-vesszős formátumra cseréltük (pl. `, `).
  - **Pontok utáni automatikus szóköz**: A referenciaszámban előforduló pontok (`.`) után automatikusan szóközt teszünk, ha ott még nem szerepel (pl. `ar.W2` helyett `ar. W2` formátumban kerül beírásra), hogy elkerüljük az importálási hibákat.

- **„Removed” tag ellenőrzése a PannonXP lapon**:
  - Bevezettük a Shopify `removed` tag ellenőrzését a PannonXP címkegyártó felületére is.
  - Ha egy megrendelésen szerepel a `removed` tag, a rendszer egy feltűnő piros hibaüzenetet jelenít meg a sorban (*„⚠️ Törölt tétel van a megrendelésben, kérlek ellenőrizd a Shopifyban!”*), és egy piros **Ellenőrizve** (`btn-ack-pxp-removed`) jóváhagyó gombot kínál fel.
  - A PannonXP CSV exportálás gombja mindaddig le van tiltva, amíg a kiválasztott megrendelések között van jóváhagyatlan törölt tétel hiba, garantálva a hibás adatexportok elkerülését.

- **Osztott (bontott) fizetések elszámolásának javítása**:
  - Javítottuk a hátralévő függő összegek kiszámítását (`pendingKpAmount` és `pendingCardAmount` / `pendingBankAmount`): a rendszer mostantól helyesen kezeli az objektum alapú (bontott) fizetési státuszokat és összegeket is a szállítási kör összesítőjében.
  - Ha egy bontott fizetésben a kártyás rész még nincs utalva, a kör kék színűvé válik, kiírja a pontos várakozó kártyás összeget („Utalásra vár: X Ft”), és a fejlécben megjelenik a **Kártya utalva** jóváhagyó gomb.
  - A rendelés-szintű kis jelvény (badge) is kékké változik és mutatja a még be nem érkezett összeget (pl. *„Vár: 241 000 Ft”*), valamint a részletes nézetben külön zöld pipával (`✓`) vagy sárga homokórával (`⏳`) jelezzük az egyes fizetési módok (KP, Kártya, Utalás) egyéni státuszát (pl. *Bontott: 100 000 Ft KP ✓ + 241 000 Ft Kártya ⏳*).

### 2026. július 29. - PannonXP Termék Rövidítések Mentés Gomb & Validáció
- **Termék Rövidítések Szerkesztésének Mentéshez Kötése**: A PannonXP Beállítások **Termék Rövidítések** fülén megszűnt az azonnali, automatikus mentés gépelés/változtatás közben. A felületre bekerült egy dedikált **"Termék Rövidítések Mentése"** gomb (`#pxp-settings-abbreviations-form`).
- **Módosítások mentése és újraszámolás**: A rövidítések és kategóriák átírása csak a mentés gombra kattintás után rögzül az adatbázisban és lép életbe a megrendelések referenciaszámainak és csomagolási adatainak újraszámolásánál.
### 2026. július 31. - Gyors Utánvét-Szerkesztő Felület & Utánvéthiba Gyors-Akciók (UI Kezelhetőség)
- **Gyors Utánvét-Javítás a Hiba Boxokban**: Az Utánvét eltérés, Lappangó utánvét és Fizetési anomália hibajelzéseknél közvetlenül a piros hiba boxban megjelentek az 1-kattintásos gyorsbeállító gombok (pl. `[ 12 000 Ft (Notes) ]`, `[ 15 000 Ft (Shopify) ]`, `[ 0 Ft (Nincs UV) ]`), valamint egy egyedi Ft összeg beviteli mező `[ Mentés ]` gombbal.
- **Kattintható Utánvét Badge**: A Szedőlista rendeléskártyáinak fejlécében lévő utánvét badge-ek (`UTÁNVÉT: X Ft`, `UTALÁST VÁRUNK`, `Fizetve / Nincs Utánvét`) mostantól kattinthatóvá váltak (kis ceruza ikonnal `✏️`). Rákattintva egy gyors felugró ablakban azonnal felülírható az utánvét összege a teljes szerkesztő modal megnyitása nélkül.
- **Cache-Busting és verziókezelés**: Megemeltük a hivatkozott modulok cache verzióját `v195`-re (`app.js?v=195`, `ordersView.js?v=195`, `shopify.js?v=195`).

### 2026. július 31. (2. session) - Görgetési Elakadás Fix Drag & Drop Kártyamozgatásnál
- **CSS Grid Layout váltás (`column-count: 2` leváltása)**: Megszüntettük a böngészők elavult multi-column motorja miatti görgetési beragadási hibát. Az `.order-list` átállt tiszta, reszponzív CSS Grid elrendezésre (`grid-template-columns: repeat(2, 1fr)`). Ez garantálja, hogy a böngésző a kártyák átrendezésekor azonnal és tökéletesen újraszámolja a görgetési magasságot (`scrollHeight`), elkerülve a lefele görgetés elakadását.
- **Automata Görgetés és Drag State Tisztítás**: A `Sortable.js` konfigurációt kibővítettük automatikus görgetési beállításokkal (`bubbleScroll: true`, `scrollSensitivity: 100`, `scrollSpeed: 20`), valamint az `onUnchoose`, `onSpill`, `mouseup` és `touchend` eseményekre regisztráltunk egy automatikus állapot-takarítót (`cleanupDragState`), ami a húzás befejeztével azonnal visszaállítja a normál görgetést és kijelölést.
- **Cache-Busting és verziókezelés**: Frissítettük a modulok verzióit `v196`-ra (`app.js?v=196`, `style.css?v=41`).

### 2026. augusztus 3. - Házszám Hiány Validáció, Shopify CSV Idézőjel-Hámozás, `app.js` Address2 Fix & PannonXP Export Duplikáció Fix
- **Gyökeres Fix: `app.js` Címösszefűzés (`v206`)**: Megtaláltuk a hibajelzések valódi okát a feltöltött `orders_export - 2026-08-03T111423.826.csv` elemzésével: a Shopify a házszámokat a `Shipping Address2` oszlopba teszi (pl. `Address1: Barátság útja`, `Address2: 2/b. 1/19.`). Az `app.js`-ben a `processShopifyData` tévesen felülírta a címet csak az `Address1` értékével. Kijavítottuk: az `app.js` összefűzi az `Address1` + `Address2` mezőket (`"Barátság útja 2/b. 1/19."`), beimportáltuk a `cleanAddress` függvényt.
- **PannonXP Export Cím-Duplikálás Fix (`pannonxp.js`)**: A PannonXP CSV generálásakor megszüntettük a házszámok kétszeri hozzáfűzését (pl. `Barátság útja 2/b. 19. 2/b. 1/19.` $\rightarrow$ `Barátság útja 2/b. 19.`).
- **PannonXP cleanAddress ReferenceError Fix**: Kijavítottuk a hiányzó `cleanAddress` importot a [js/services/pannonxp.js](file:///c:/Users/CH_001/Desktop/Projektek/kiszedesi/js/services/pannonxp.js) fájlban, ami exportáláskor hibát okozott.
- **PannonXP Nézet Import Cache Fix**: A `pannonxpView.js`, `pannonxp.js` és `manualOrderController.js` belső importjait megemeltük a legújabb verzióra (`v206`).
- **Shopify CSV Irányítószám Idézőjel-Takarítás (`cleanZip`)**: Automatikusan letakarítjuk a Shopify által berakott egyes-idézőjelet (pl. `'1132` $\rightarrow$ `1132`).
- **Függőleges Oszlopfolyam Visszaállítása (Sorrendszinkronizálás Fix)**: A felhasználó kérésére visszaállítottuk mind a képernyős, mind a nyomtatási nézetet a tiszta függőleges oszlopfolyamra (`column-count: 2`). Ezzel a kártyák sorszámozása oszloponként fentről lefelé halad egymás után (a bal oldali oszlopban 1, 2, 3, 4, a jobb oldali oszlopban 5, 6, 7, 8). Így a bejárási útvonal, a sorszámok, a nyomtatott szállítólevelek sorrendje és az elszámolópapír tökéletesen szinkronba kerültek egymással.
- **Scroll-Height Beragadási Hiba Javítása (Reflow trigger)**: A `column-count: 2` elrendezésnél fellépő görgetési elakadást (amikor a kártyák átrendezése után a böngésző nem számolta újra a magasságot) szoftveresen orvosoltuk: a drag & drop elengedésekor (`onEnd` és `cleanupDragState` a [js/app.js](file:///c:/Users/CH_001/Desktop/Projektek/kiszedesi/js/app.js) fájlban) kényszerítettünk egy azonnali böngésző-reflow-t a `.order-list` elem rövid elrejtésével és megjelenítésével. Ez a görgetést tökéletesen fluidan tartja.
- **Cache-Busting és verziókezelés**: Frissítettük az összes modul hivatkozási verzióját `v206`-ra (`app.js?v=206`, `shopify.js?v=206`, `pannonxpView.js?v=206`, `pannonxp.js?v=206`), a stílusfájlt pedig `style.css?v=43`-ra emeltük.

### 2026. augusztus 17. - PannonXP Termékrövidítés Sanitizer & Referenciaszám Generálás Védelem (v3.3.1)
- **Termékrövidítés Tisztító Függvény (`sanitizeAbbreviation`)**: Létrehoztunk egy központi sanitizert a `js/services/pannonxp.js`-ben, amely automatikusan levágja a termékrövidítésekből a véletlenül odakerült záró számokat, csomagosztásokat és másodlagos ragasztó-kulcsszavakat (pl. `Wson1trex1` $\rightarrow$ `Wson`, `Wchicago2` $\rightarrow$ `Wchicago`, `Sonoma2` $\rightarrow$ `Sonoma`, `Chicago 4-4-3` $\rightarrow$ `Chicago`).
- **Memória és Betöltési Szintű Védelem**: A `normalizeMappings` és `initializeMappings` függvényekben beépítettük az automatikus tisztítást, így a korábban felhőbe (Firestore) vagy localStorage-ba mentett számmal terhelt rövidítések is a betöltés pillanatában azonnal tiszta formára alakulnak.
- **Mentési és CSV Import Védelem**: A `saveProductMappings` és a Shopify termék CSV importáló is szigorúan szűri az összes mentendő rövidítést, megakadályozva, hogy a jövőben számmal vagy összetett szöveggel mentődjön el termék.
- **Generátor Futásidejű Védelem (`generateDefaultReference`)**: A `shopify.js`-ben a referenciaszám generálásakor runtime védelemként a rövidítést átfuttatjuk a `sanitizeAbbreviation`-ön, garantálva, hogy a hivatkozásokban a darabszám soha ne duplázódjon (pl. `#6164` $\rightarrow$ `6164 Wson1 trex1`, `#6229` $\rightarrow$ `6229 Wchicago4 trex4`).
- **UI és Felugró Ablak Finomhangolás**: A termékbeállító modalban a félrevezető placeholdert megtisztítottuk (`pl. Sonoma, Wson, trex, ezustsorolo`), és egy tájékoztató szöveget helyeztünk el, jelezve, hogy csak a tiszta betűkódot kell megadni, a darabszámot a rendszer automatikusan kezeli.
- **Unit Tesztek Bővítése**: 13 új unit teszttel bővítettük a `tests/unit_tests.js` tesztcsomagot az összes létező rövidítés és edge-case validálására (45 sikeres teszt).
- **Cache-Busting és verziókezelés**: `index.html`-ben a verziót `app.js?v=3.3.1`-re emeltük.


---

## 📌 Jövőbeli Tervek & Roadmap (Rugalmas Általános Irányvonalak)

Ez a moduláris felépítésű projekt alapot nyújt a jövőbeli bővítésekhez és másoláshoz/továbbfejlesztéshez. A megvalósítási technológia és architektúra szabadon választható (akár Vercel, Node backend, REST/GraphQL API-k vagy egyedi микро-szolgáltatások):

### 1. 🔄 Élő Adatszinkronizáció (Shopify API & Webhooks)
- A manuális CSV beolvasás mellett vagy helyett élő API adatszinkronizáció bevezetése.
- Fail-safe tartalékként a CSV import megőrzése.

### 2. 🏬 Több Webshop & Piactér Kezelése (Multi-Store & Marketplaces)
- Több különálló Shopify áruház és egyéb piacterek (pl. Amazon, Temu, Allegro) rendeléseinek egyablakos kezelése.
- Központi szedés, csomagolás és futárcímke-nyomtatás egyetlen felületről.

### 3. 📦 Központi Készletkezelés & WMS / ERP Funkciók
- SKU alapú központi készletnyilvántartás és visszaszinkronizálás a csatornák felé.
- Automatikus készletlevonás rendelés lezárásakor és túladás-védelem.

### 4. 📧 Automata Értesítések & Riportok
- Vevői e-mail/SMS értesítők csomagfeladáskor és csomagszámmal.
- Vezetői napi/heti elszámolási és statisztikai riportok.
