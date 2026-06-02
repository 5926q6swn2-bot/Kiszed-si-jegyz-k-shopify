# Kiszedési Jegyzék Shopify - Dokumentáció és Fejlesztési Napló

Ez a dokumentum a projekt teljes leírását, technikai specifikációit és a fejlesztések részletes történetét tartalmazza. 
**Célja:** Minden munkamenet elején biztosítani a teljes kontextust az AI ágens számára.

---

## 🏗️ Projekt Specifikáció & Design Guidelines

Az ágensnek minden módosításkor tartania kell magát az alábbi stack-hez és stílushoz:

- **Frontend**: Vanilla HTML5, CSS3.
- **Dizájn Irányzat**: Modern, Apple-stílusú **Glassmorphism** (áttetsző rétegek, blur effekt, lekerekített sarkok, tiszta tipográfia).
- **Logika**: Vanilla JavaScript (Szigorúan **ES Modules** architektúra, `app.js`).
- **Adatbázis & Backend**: Google Firebase (Cloud Firestore & Authentication).
- **Alapszabály**: Minden Firebase/Firestore hívást aszinkron módon, `await` kulcsszóval kell kezelni (különösen a `HistoryManager` objektumban).

---

## 📦 A Projekt Célja és Működése
Egy böngészőből futtatható raktári szedőlista és elszámoló rendszer Shopify webáruházakhoz.
- **Kezdés:** A Shopify-ból exportált megrendelések CSV fájljának beolvasása (`PapaParse`).
- **Feldolgozás:** Automatikus termék formázás, duplikáció szűrés, és vizuális jelzések a problémás rendelésekről (pl. hiányzó utalás, lappangó utánvét).
- **Kimenet:** Nyomtatható Szedési Jegyzék és kétoldalas "Összesítő és Korrekciós lap" a futároknak.

---

## 🔄 Session Handover (Aktuális Állapot)

- **Utolsó aktív modell**: Claude Sonnet 4.6
- **Státusz**: A rendszer stabil. Rendezési mód (sort mode) elkészült, DnD vizuálok teljesen átdolgozva. 6 db Shopify CSV-specifikus bugjavítás és a cache-busting is aktív (`app.js?v=4`).
- **Folytatás**: Nincs aktív TODO. Következő session igény szerint.

---

## 📝 Fejlesztési Napló (Changelog)

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
- **Tanulság:** Komplex függvény több lépéses átírásakor **mindig futtatni kell syntax check-et** a befejezés előtt.

### 2026. május 29. - Statisztika Al-oldalak Refaktora & Modul Betöltési Optimalizáció
- **Statisztika Lap Al-oldalas Rendszere:** A régi bento box elrendezést egy modern Apple segmented control fül-alapú navigációra cseréltük (`Futárok` | `Diagramok` | `Termékek` | `Térkép` | `Kiesett rendelések`). Csak az aktív fül renderelődik, így a térkép és a kiesett rendelések nem futnak feleslegesen a háttérben.
- **Térkép Optimalizáció:** A Leaflet térkép és a Nominatim API geokódolója most már kizárólag a Térkép fül megnyitásakor inicializálódik, ami megszünteti a méretarány- és rendering hibákat, és javítja a betöltési sebességet.
- **Modul Betöltési Race Condition Elkerülése (Kritikus hiba):** Javítottunk egy rejtett, de kritikus ES Modul hibát. Ha az `app.js` modulként való betöltése (és cachingje) lassabb volt, vagy épp gyorsabb volt, mint az HTML betöltése, a `DOMContentLoaded` esemény már lefutott, mire a script feliratkozott rá, így a gombok teljesen működésképtelenek maradtak. Mostantól az `app.js` ellenőrzi a `document.readyState`-et, és ha a DOM már kész, azonnal lefut a `initApp()`, teljesen kizárva a gombok működésképtelenségét.
- **Firebase Duplikált Inicializáció Javítása:** Megszüntettük a Firebase `duplicate-app` hibát, amit az okozott, hogy az `index.html` inline scriptje és az `app.js` által importált `firebase-config.js` is meghívta az `initializeApp()`-et az alapértelmezett beállításokkal. Bevezettük a `getApps().length > 0` ellenőrzést, így a Firebase-t csak egyszer, biztonságosan inicializáljuk.
- **Mély-Import Cache-busting (Kritikus hiba):** Mivel az `app.js` sima `import ... from './firebase-config.js'` deklarációt használt, a böngésző a cache-elt `firebase-config.js`-t hívta meg a duplicate-app ellenőrzések bevezetése előtt is. Hozzáadtuk a `?v=38` lekérdező paramétert az import útvonalhoz az `app.js`-ben (`from './firebase-config.js?v=38'`), így a böngésző kénytelen a frissített konfigurációs fájlt betölteni.
- **Cache-busting:** `index.html`-ben `app.js?v=38` → böngésző mindig a legfrissebb kódot tölti be.

### 2026. június 2. - "Utólag elutalva" funkció a Kiesett rendelésekhez
- **Új gomb a statisztikákban:** A Statisztika / Kiesett rendelések listájában minden olyan utánvétes rendelés mellett, ami még nincs utólag átvéve, megjelent egy kék "🏦 Utólag elutalva" gomb.
- **Folyamat egyszerűsítése:** Ha a vásárló utólag elutalja az utánvét összegét, erre a gombra kattintva a rendelés kikerül a "Kiesett" státuszból, és átkerül a "Banki utalás" státuszba. Ezzel a havi elszámolásban csökken a kiesett összeg, és nő az utalt (nem készpénzes) bevétel.
- **Háttérművelet (`HistoryManager.markAsBankTransferred`):** A Firestore-ban a megrendelés átkerül az `uncollectedOrderIds` tömbből a `bankTransferredOrderIds` tömbbe, a kapcsolódó okok (reason, responsibility) pedig törlődnek.

### 2026. június 2. - Terítés rögzítése (Elszámolás) Ablak Újratervezése
- **Szélesebb, szellősebb nézet:** Az ablak 520px helyett 850px széles lett, így a nevek és összegek kényelmesen kiférnek.
- **CSS Grid struktúra:** Az elemek egy rácsban oszlopokba rendeződtek (Állapot, ID, Név, Összeg, Műveletek), ezáltal a felület sokkal strukturáltabb és áttekinthetőbb.
- **Termékek listája:** A Név alatt egy lenyitható sáv is bekerült, ami mutatja, milyen termékek (és mennyiségük) tartoznak a rendeléshez.
- **Átnevezések & Dizájn:** A "részleges" gomb neve "Részlegesen fizetett" lett. A lenyíló panelek (kiesett és részleges) háttere és kerete dominánsabbá vált a könnyebb elkülönítés érdekében. A kézzel gépelős szöveges mezők nagyobbak és hangsúlyosabbak lettek.

### 2026. június 2. - Részleges nyomtatás dialógus fejlesztése
- **Okok kijelzése:** A "Részleges nyomtatás" figyelmeztető ablakban mostantól nem csak az jelenik meg, hogy mely rendelések módosultak, hanem az is, hogy pontosan **miért** (pl. `utánvét összeg`, `termék/mennyiség`, `cím`, `telefon`). Így sokkal átláthatóbb, miért dobja fel az adott rendelést újra nyomtatásra.

#### Cache verzió
`app.js?v=42`

---

## Következő Lépések (TODO)
- [x] **Előzmények szűrés újraírása:** Megoldva.
- [x] **Drag & Drop fluiditás:** Megoldva.
- [x] **Szerkesztett adatok prioritása:** Megoldva.
- [x] **Utólagos módosítás kezelése:** Megoldva.
- [x] **Sorrend mód gomb:** Megoldva.
- [x] **Előzmények kompakt layout + preview + összevonás:** Megoldva.
- [x] **Gyors Szállítólevél, Előzmények UI redesign, Elszámolások, Statisztika térkép:** Megoldva (2026-05-14).
