# Kiszedési Jegyzék Shopify - Dokumentáció és Fejlesztési Napló

Ez a dokumentum a projekt teljes leírását, technikai specifikációit és a fejlesztések részletes történetét tartalmazza. 
**Célja:** Minden munkamenet elején biztosítani a teljes kontextust az AI ágens számára.

---

## ️ Projekt Specifikáció & Design Guidelines

**[KÖTELEZŐ OLVASMÁNY]** Kérlek olvasd el az `ARCHITECTURE.md` fájlt a projekt gyökerében, mielőtt bármilyen fejlesztésbe kezdesz. Ez tartalmazza az MVC/Moduláris architektúra szabályait, amiket szigorúan követni kell!

Az ágensnek minden módosításkor tartania kell magát az alábbi stack-hez és stílushoz:

- **Frontend**: Vanilla HTML5, CSS3.
- **Dizájn Irányzat**: Modern, Apple-stílusú **Glassmorphism** (áttetsző rétegek, blur effekt, lekerekített sarkok, tiszta tipográfia).
- **Logika**: Vanilla JavaScript (Szigorúan **ES Modules** architektúra, lásd `ARCHITECTURE.md`).
- **Adatbázis & Backend**: Google Firebase (Cloud Firestore & Authentication).
- **Alapszabály**: Minden Firebase/Firestore hívást aszinkron módon, `await` kulcsszóval kell kezelni (különösen a `HistoryManager` objektumban).
- **Emoji Tilalom (Szigorú szabály)**: A felületen, generált e-mailekben, kódban és naplókban szigorúan TILOS bármilyen emoji használata. Mindig tiszta, puritán, professzionális szövegezést kell alkalmazni.

---

##  A Projekt Célja és Működése
Egy böngészőből futtatható raktári szedőlista és elszámoló rendszer Shopify webáruházakhoz.
- **Kezdés:** A Shopify-ból exportált megrendelések CSV fájljának beolvasása (`PapaParse`).
- **Feldolgozás:** Automatikus termék formázás, duplikáció szűrés, és vizuális jelzések a problémás rendelésekről (pl. hiányzó utalás, lappangó utánvét).
- **Kimenet:** Nyomtatható Szedési Jegyzék és kétoldalas "Összesítő és Korrekciós lap" a futároknak.

---

- **Utolsó aktív modell**: Gemini 3.8 Flash (High)
- **Státusz**: A rendszer stabil, Render felhőre kész. Elszámolások egységes időrendi nézetben (v4.6.7, 522/522 zöld unit teszt). Futár terminál utánvét elszámolások auditálva (3 Excel fájl vs. Előzmények adatbázis).


---

## Aktív / Következő Teendők (TODO Lista)

1. **Heti és Reggeli Riport Funkció Újratervezése & Kidolgozása**:
   - Az automatikus cron időzítő a szerveren ideiglenesen leállítva (`ENABLE_MORNING_REPORT_CRON = false`).
   - A riport pontos tartalmának, szekcióinak, szűrési logikájának és címzettjeinek részletes kidolgozása a felhasználói egyeztetések alapján, majd a funkció stabil visszakapcsolása.

2. **Számla Nélküli Rendelés E-mail Értesítő**:
   - Resend fiók sikeresen összekötve: Az `info@panelburkolat.com` fiók API kulcsa beállítva a `.env`-be, a közvetlen éles kézbesítés hibátlanul működik és tesztelve.
   - Az automatikus e-mail pontos tartalmának, elrendezésének és szövegezésének személyre szabása az `emailService.js` sablonban a felhasználó kérései alapján (ha szükséges).

3. **Opcionális Céges PIN Kód / Belépési Védelem a Felhős Címhez**:
   - Igény esetén egyszerű PIN kódos védelem hozzáadása, hogy idegenek ne láthassák a rendelési adatokat a publikus linken.

4. **Feketelista Kezelő (Blacklist Manager) & Automata Kockázatos Vevő Szűrés**:
   - Megbízhatatlan / lebeszélt időpontban át nem vett rendelések vevőinek központi rögzítése (többszörös telefonszámok, szállítási címek, nevek, e-mail címek + indoklás).
   - Új Shopify rendelés letöltésekor automatikus egyeztetés a feketelistával, és azonnali piros figyelmeztető doboz generálása a raktári felületen (opcionális automatikus `feketelista` tageléssel a Shopify-ban).

### 2026. szeptember 22. (1. frissítés) - Szerveroldali Gyorsítótár (Cache), CORS Preflight & API Védelem (`v4.6.8`)
- **Szerveroldali Gyorsítótár (Shopify API 429 Rate-Limit Védelem)**:
  - A `server.js` `/api/shopify/orders` végpontja 4 másodperces in-memory gyorsítótárat (`ordersCache`) kapott.
  - A kliensek 6 másodperces pollingja és a többfelhasználós egyidejű használat nem indít felesleges párhuzamos REST és GraphQL lekéréseket a Shopify felé. Az azonos kérések 2.3 másodperc helyett ~10-15 ms alatt szolgálódnak ki (`X-Cache: HIT`).
  - Bármely módosító művelet (POST: fulfillment, címkefrissítés, státuszállítás, megjegyzés mentés) azonnal érvényteleníti a gyorsítótárat (`invalidateOrdersCache()`).
- **Globális CORS és Preflight (OPTIONS) Támogatás**:
  - A szerver globális fejléc-kezelést kapott (`Access-Control-Allow-Origin: *`, metódusok és fejlécek), valamint automatikus `OPTIONS` 204 választ, biztosítva a zavartalan kommunikációt GitHub Pages és Render között.
- **Opcionális API Secret Védelem a Felhőhöz**:
  - A szerver felkészült a védelemre: ha a `.env`-ben az `API_SECRET_TOKEN` beállításra kerül, a védett `/api/*` végpontok kizárólag érvényes `x-api-key` fejléccel vagy paraméterrel hívhatók meg.
  - A `shopifyApiService.js`, `pannonxp.js` és `history.js` kliensoldalon automatikusan továbbítja az API kulcsot, ha az elérhető.
- **Fájlrendszer- és Projekt-Takarítás**:
  - A korábbi maradványfájlok törölve (`scratch/`, `.claude/`), a `fejlesztesi_naplo.md` archiválva és 94%-kal karcsúsítva (`fejlesztesi_naplo_archiv.md`).
- **Unit Tesztek & Stabilitás**:
  - 522/522 sikeres zöld unit teszt lefutva (`tests/unit_tests.js`).

---

### 2026. szeptember 21. (10. frissítés) - Terminál Utánvét Elszámolások Auditálása & History Sync Frissítés
- **Futár Előzmények Szinkronizáció Részletezése (`js/services/history.js`)**:
  - A `HistoryManager.doSync` metódus frissítésre került, hogy a felületről ne csak darabszámos összefoglalót, hanem a **teljes rendelési struktúrát** (rendelésszámok, kártyás/készpénzes összegek, vevőnevek, kiegyenlítési és átutalási státuszok) szinkronizálja a fejlesztői háttérszolgáltatás felé (`/api/debug/sync-couriers`).
  - Unit tesztek lefutva és hiánytalanul zöldek (522 / 522 sikeres).
- **3 Terminál Utánvét Excel Fájl Elemzése a Saját Előzmények Adatbázissal Szemben**:
  - **Fájlok átvizsgálva**: 2026.06.30 - 07.31 (52 rendelés), 2026.08.03 - 08.13 (31 rendelés), 2026.08.17 - 08.31 (37 rendelés).
  - **Feltárt eltérés (#3831 - Molnárné Kiszely Mária)**: A futár 2026.08.28-án átvett 13 920 Ft kártyás utánvétet, azonban a 3. Excel táblázat főtáblázatából kimaradt ez a tétel.
  - **Duplázás feltárása (#3035 és #3247)**: A 3. Excel táblázat aljára lábjegyzetként hozzáfűzött 2 rendelés (275 739 Ft) az 1. táblázatban már szerepelt és el lett számolva, így a 3. időszak bruttó időszaki összege 4 890 180 Ft (35 rendelés), a valós kötelezettség pedig a kimaradt #3831-el együtt 4 904 100 Ft (36 rendelés).

### 2026. szeptember 21. (9. frissítés) - Sela Export: Akusztikus Panelek Összevonása Sima Panelekkel & Közös Oszlop (`v4.6.7`)
- **Akusztikus Panelek Sima Panelként Történő Számolása (`exporter.js`)**:
  - A `classifyItemForSela` besorolási logikában az akusztikus panelek (akusztik, aku, akupanel, wide akusztikus, wide acoustic) mostantól automatikusan a panelek (`pvc_spc_floor`) kategóriába sorolódnak.
  - A `prepareSelaRowData` funkció a korábbi különálló akusztikus darabszámot közvetlenül a paneldarabokhoz adja hozzá (`col8_pvcSpcFloorQty`), így a szállítócég felé az összes falpanel (PVC, SPC és akusztikus) egyetlen összevont tételszámként kerül kiadásra.
- **Külön Akusztikus Oszlop Kivezetése és CSV Struktúra Frissítés**:
  - A korábbi különálló 9. `"Akusztikus falpanelek (db)"` oszlop kivezetésre került a CSV exportból és a szerkesztő modal felületéről (`SelaExportModal`).
  - A CSV 8. oszlopának és a modál fejlécének elnevezése letisztult: **`Falpanel és padlózatok (db)`** / **`Panelek`**.
  - A letöltött CSV alapértelmezetten 12 oszlopos (határidő bekapcsolásakor 13 oszlopos), a darabszámok és oszlopok nem csúsznak el.
  - A termékszintű súlyszámítás (`SelaWeightService`) változatlanul a pontos cikk-darabsúlyokat veszi figyelembe (normál akupanel 7 kg, wide 9 kg, PVC/SPC 16-18.5 kg).
- **Unit Tesztek & Stabilitás**:
  - 522/522 sikeres zöld unit teszt lefutva (`tests/unit_tests.js`).

---

### 2026. szeptember 21. (8. frissítés) - Eredeti Kártya-Dizájn Helyreállítása & Tiszta Függő Kör Számláló (`v4.6.6`)
- **Eredeti Kártya-Dizájn Helyreállítása**:
  - A kártyákról eltávolítottuk az extra narancssárga/zöld kereteket és a színezett háttereket (`el.style.cssText = 'margin:0;overflow:hidden;'`). A kártyák pontosan a korábbi, tiszta `.unified-card.acc-run-card` dizájnnal jelennek meg.
- **Tiszta, Keret Nélküli Függő Terítés Számláló**:
  - A színes és keretes fejrész-dobozok kivezetve. Helyettük diszkrét, elegáns szöveges elválasztó mutatja az elszámolásra váró körök számát (`Elszámolásra váró terítések (X db)`).
  - A felső sötét összefoglaló sávba (`summaryCard`) szintén bekerült a függő körök pontos száma (`Elszámolásra vár: X db`), így a státusz azonnal átlátható.
- **Unit Tesztek & Stabilitás**:
  - 521/521 sikeres zöld unit teszt lefutva (`tests/unit_tests.js`).

---

### 2026. szeptember 21. (7. frissítés) - Duplikált 'isFullySettled' Szintaktikai Hiba Javítása & Automata ESM Szintaxis-Validáció (`v4.6.5`)
- **Duplikált Változódeklaráció Megszüntetése (`historyAccounting.js`)**:
  - A `historyAccounting.js` kártyageneráló ciklusában a 882. sorban szereplő felesleges `const isFullySettled = totals.isFullySettled;` sor törölve, mivel a ciklus elején (842. sor) a változó már deklarálva volt.
  - Ezzel a böngésző konzolban megjelent `Uncaught SyntaxError: Identifier 'isFullySettled' has already been declared` hiba véglegesen elhárult.
- **Automatikus ESM Modul Szintaxis-Validáció a Unit Tesztekben**:
  - A `tests/unit_tests.js` tesztcsomag kiegészült egy rekurzív szintaxis-ellenőrzővel (`checkJsSyntaxRecursively`), amely a `js/` mappa összes JavaScript fájlját natív Node.js modul-fordítóval (`--input-type=module --check`) átvizsgálja duplikált azonosítók és szintaktikai hibák ellen.
- **Unit Tesztek & Stabilitás**:
  - 521/521 sikeres zöld unit teszt lefutva (`tests/unit_tests.js`).

---

### 2026. szeptember 21. (6. frissítés) - Elszámolások Egységes Időrendi Nézete & Függő Fuvarok Kiemelése (`v4.6.4`)
- **Cégcsoportok Megszüntetése az Elszámolásokban**:
  - Az `accounting-company-group` szerinti szétbontás megszűnt: az összes terítés egyetlen, áttekinthető, folyamatos listában jelenik meg.
  - A cég szűrési lehetőség teljes mértékben megmaradt a fejlécben található `#history-company-filter` segítségével, így bármely cégre egyetlen kattintással rá lehet szűrni.
- **Intelligens Rendezés (Függő Fuvarok Mindig Felül)**:
  - Az el nem számolt terítések (`!totals.isFullySettled`) automatikusan a lista legtetejére kerülnek, narancssárga kiemeléssel és fejrész-elválasztóval.
  - Alattuk időrendi sorrendben (dátum szerint csökkenő) következnek a már elszámolt terítések zöld elválasztóval.
  - Amikor egy függő terítést elszámolnak, az automatikusan "visszaugrik" a helyére a korábbi elszámolt körök közé az időrendi pozíciójába.
- **"Csak függő fuvarok" Alapértelmezés Módosítása**:
  - Az `index.html`-ben és a megnyitáskor a `js/app.js`-ben a `#accounting-filter-pending` jelölőnégyzet alapértelmezetten nincs bepipálva (`checked = false`), így a felhasználó előtt azonnal az összes terítés megjelenik a megfelelő rendezésben.
- **Unit Tesztek & Stabilitás**:
  - 489/489 sikeres zöld unit teszt lefutva (`tests/unit_tests.js`).

---

### 2026. szeptember 21. (5. frissítés) - Futárok Rendszerezése, Bábel Ádám Egységesítés & Céges Futárválasztó (`v4.6.3`)
- **Bábel Ádám Futárnév Teljes Normalizálása és Egységesítése**:
  - A korábbi 4 db kisbetűs `Bábel ádám` terítés automatikusan és véglegesen nagybetűs `Bábel Ádám`-ra javítva a Firestore adatbázisban és a memóriában.
  - A `HistoryManager.getAllRuns()` automatikus migrációs logikával bővült: minden oldalbetöltéskor ellenőrzi és Firestore-ban `updateDoc`-kal átírja a kisbetűs vagy vegyes írásmódú változatokat.
  - A `HistoryManager.saveRun()` és `updateRun()` metódusok szintén védve lettek: bármely mentés vagy frissítés esetén a `bábel ádám` automatikusan a tiszta `Bábel Ádám` formára alakul.
- **Cég Neve Megjelenítve az Előzmények Kártyáin**:
  - A `historyAccounting.js` kártyafejlécében (`hac-meta`) mostantól közvetlenül a futár neve előtt kiemelten szerepel a szállító cég neve is (pl. `[LétaiSela] · Bábel Ádám`), megkönnyítve a körök és futárok azonosítását.
- **Céghez Kapcsolt Intelligens Futárválasztó (Cascading Select)**:
  - Az `index.html` és `js/app.js` Nyomtatás és Terítés Mentése ablakában a korábbi szabad szavas bevitelt egy céghez kötött legördülő választó (`#ps-courier-select`) váltotta fel:
    - **LétaiSela**: Bábel Ádám, István, Csaba.
    - **Sela**: Adrián, Dévald, Ernő, Tomi, Kónya Gyuri, Kabai Gyuri, Tapasztó Zoltán.
    - **ÁdámFuvar**: Ádám.
    - Új vagy más futár esetén a `-- Egyedi / Új futár beírása --` opció automatikusan megnyitja a szöveges mezőt.
- **Unit Tesztek & Stabilitás**:
  - 481/481 sikeres zöld unit teszt lefutva (`tests/unit_tests.js`).

---

### 2026. szeptember 21. (4. frissítés) - Viszonteladó Duplikáció Elrejtés & Szintaxis / SVG Javítások (`v4.6.2`)
- **Viszonteladók Duplikált Rendelés Kitűzőjének és Szűrőjének Kivezetése**:
  - A `js/utils/orderUtils.js` fájlban a `buildDuplicateCustomerOrdersMap` mostantól kizárja a viszonteladói (`isResellerOrder`) rendeléseket.
  - A `js/views/orderOverviewView.js` nézetben a viszonteladói sorok bal szélén lévő lila lebegő `2x rendelés` / többszörös rendelés kitűző és az összevont rendelési tooltip nem jelenik meg, és a viszonteladók nem növelik a felső szűrősáv "Több rendelés" gyorsszűrő számlálóját sem.
- **Konzol Szintaktikai és SVG Hiba Elhárítása**:
  - **SyntaxError Javítás**: Az `orderOverviewView.js` fájlban a korábbi módosítás során létrejött duplikált `const isResellerOrder` deklaráció megszüntetve a 888. sorban.
  - **SVG Path Hiba Javítás**: Az `index.html` 82. sorában az üres állapot hero szekciójában lévő dokumentum ikon SVG ív-jelző szintaxishibája (`0 0 2 2` helyett szabványos `0 0 0 2 2`) javítva, így a böngésző konzol tiszta és hibamentes.
- **Unit Tesztek & Stabilitás**:
  - 474/474 sikeres zöld teszt lefutva (`tests/unit_tests.js`). Node.js szintaxis-ellenőrzés (`node -c`) hibátlanul átment minden modulon.

---

### 2026. szeptember 21. (3. frissítés) - ES Modul Singleton Szinkronizáció és Golyóálló Terítés Törlés (`v4.6.0`)
- **Valódi Gyökérok Feltárása (Eltérő Modul URL és Párhuzamos Gyorsítótár)**:
  - A `historyAccounting.js` fájl fejlécében az import az elavult `../../services/history.js?v=3.2.2` URL-t tartalmazta, míg az `app.js` a tiszta `./services/history.js` hivatkozást használta.
  - A böngésző natív ES modul motorja a query paraméter eltérése miatt **két teljesen különálló modul-példányt** hozott létre a memóriában:
    - Az 1. modul-példányt az `app.js` használta (ebben futott a törlés és ürült a gyorsítótár).
    - A 2. modul-példányt a `historyAccounting.js` használta (ebben az érintetlen, régi `runsCache` maradt a törölt körrel együtt).
  - Amikor a törlés lefutott, a felület újrarajzolásakor (`renderAccountingRuns()`) a `historyAccounting.js` a saját 2. példányából kérte le a futásokat (`getAllRuns()`), ami az érintetlen memóriából azonnal visszarajzolta a törölt kört a képernyőre!
  - Ezért tűnt úgy, hogy nem történt semmi, és ezért kellett teljes oldalt újratölteni, hogy a két példány megsemmisüljön és a friss adatbázis állapot töltődjön be.
- **Megoldás**:
  - **Egységes Import Útvonalak (Singleton Garancia)**: Eltávolítottuk az összes belső `?v=...` lekérdezési paramétert a belső JS importokból (`historyAccounting.js`, `historyView.js`, `app.js`). Mostantól a teljes alkalmazás egyetlen, közös `HistoryManager` és gyorsítótár memóriát használ.
  - **Multi-Condition Cache Törlés (`history.js`)**: A `deleteRun` memóriaszűrője (`shouldFilterOut`) már 5 ponton vizsgálja az egyezést: objektum referencia (`r === runToMove`), szóköz-levágott `docId` és `runId`, valamint szöveges azonosító.
  - **Kártya és Cégcsoport Azonnali Eltávolítás & Fallback Adatkinyerés**: Az `executeRunDeletion` a törlés gomb megnyomásakor a gombról és a szülő kártyáról is kinyeri a `data-id` és `data-doc-id` attribútumokat, azonnal animálva eltávolítja a DOM-ból, és kiürülés esetén azonnal megjeleníti az üres állapot feliratot.
  - **Cache-Busting és verziókezelés**: Verziószám megemelve `v=4.6.0`-ra (`index.html`, `package.json`, `fejlesztesi_naplo.md`). 474/474 sikeres unit teszt.


---

## Korábbi Verziók Története (Archívum)

A korábbi verziók (v1.0 - v4.5.9) részletes fejlesztési naplója átmozgatásra került az alábbi fájlba a rendszer áttekinthetőségének és a kontextus méretének optimalizálása érdekében:
- [fejlesztesi_naplo_archiv.md](file:///c:/Users/Intel/OneDrive/Asztali%20g%C3%A9p/Projektek/Kiszed%C3%A9si%20jegyz%C3%A9k%20shopify/fejlesztesi_naplo_archiv.md)
