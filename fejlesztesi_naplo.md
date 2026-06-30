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

- **Utolsó aktív modell**: Gemini 3.5 Flash (Low)
- **Státusz**: A rendszer stabil. Javítva a szállítási címek kinyerése a CSV-ből (Shipping Street prioritás), meggátolva az edit modal alatti címtörlés (address wipeout), és megoldva a megjegyzésekben lévő dátumok utánvét-ütközése (`app.js?v=147`).
- **Folytatás**: Igény szerint folytatható egyéb fejlesztésekkel vagy a korábban jegelt Shopify API Sandbox projekttel.

---

## 📝 Fejlesztési Napló (Changelog)

### 2026. június 30. - Részleges Nyomtatási Folyamat Bővítése Összesítő Csomaggal & Elszámolás Szűrő Fix & Időrend Megőrzés
- **Összesítő és Korrekciós Lap Részleges Nyomtatása**: Módosítottuk a rendelések utólagos szerkesztése/módosítása utáni mentési folyamatot a `js/app.js` fájlban. Amennyiben a felhasználó a részleges nyomtatást választja ("Részleges (összesítő + új/módosított szállítók)"), a rendszer mostantól nemcsak a konkrétan módosított/új szállítóleveleket nyomtatja ki, hanem automatikusan újragenerálja és kinyomtatja a teljes frissített összesítő csomagot is (Összesítő átadás-átvételi lap + Korrekciós lap). Ez biztosítja, hogy az utánvét összegek, a termékmennyiségek és a futár elszámoló lap adatai mindig szinkronban legyenek a valós módosításokkal.
- **Elszámolás Szűrő Valós Idejű Frissítése**: Javítottuk a "Csak a kiegyenlítésre váró fuvarok mutatása" checkbox viselkedését a `js/app.js` fájlban. Eseménykezelőt rendeltünk hozzá, így a checkbox ki-be jelölése azonnal, valós időben frissíti az elszámolások listáját (`renderAccountingRuns()`), szükségtelenné téve a lapok közötti navigációt.
- **Körök Időrendjének Megőrzése Módosításkor**: Kijavítottuk a körök újrarendeződésének hibáját a `js/services/history.js` `updateRun` metódusában. A módosítás során eltávolítottuk a `timestamp: Date.now()` felülírást. Ezzel a kör megőrzi az eredeti létrehozási időbélyegét, így utólagos szerkesztés vagy elszámolás esetén sem ugrik a lista elejére, hanem megtartja eredeti helyét a kronológiai sorrendben.
- **Explicit Kronológiai Sorrendbe Rendezés**: Mivel a korábban módosított körök időbélyegei már felülíródtak az adatbázisban, a `js/views/historyView.js` fájlban explicit rendezést vezettünk be. A betöltött köröket megjelenítés előtt a kiszállítás dátuma (`date` mező, YYYY-MM-DD formátum) szerint csökkenő, azon belül pedig a létrehozási időbélyeg (`timestamp`) szerint csökkenő sorrendbe rendezzük a Szedések, Keresés, Elszámolások és Szemetes füleken. Ez garantálja a tökéletesen pontos időrendet az összes meglévő adatnál is.

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

