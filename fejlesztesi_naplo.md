# Kiszedési Jegyzék Shopify - Dokumentáció és Fejlesztési Napló

Ez a dokumentum a projekt teljes leírását, technikai specifikációit és a fejlesztések részletes történetét tartalmazza. 
**Célja:** Minden munkamenet elején biztosítani a teljes kontextust az AI ágens számára.

---

## Projekt Specifikáció & Design Guidelines

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

- **Utolsó aktív modell**: Gemini 3.8 Flash (Medium)
- **Státusz**: A rendszer stabil, Render felhőre kész. Elszámolás Export Modál cégválasztással és kintlévőség/rendezett szűréssel élesítve (v4.9.8, 672/672 zöld unit teszt).


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

### 2026. szeptember 23. (6. frissítés) - Elszámolás Export Modál: Cégválasztás & Kintlévőségi Szűrés (`v4.9.8`)
- **Elszámolás Export Beállítások Modál (`js/views/accountingExportModal.js`, `js/app.js`)**:
  - Az "Export Excel" gombra kattintva felugró ablak jelenik meg.
  - **Szállítócégek kiválasztása**: Checkbox lista az adatbázisban lévő összes szállítócéggel (pl. LétaiSela / Csaba, Sela, PannonXP stb.) Mind kijelölése / Törlés gombokkal.
  - **Elszámolási státusz opció**: Választható *„Minden rendelés bekerüljön (a teljesen rendezettek és nem utánvétesek is)”* (alapértelmezett, biztosítja a lezárt és előre fizetett fuvarok bekerülését is) vagy *„Csak a kintlévőséggel rendelkező (kifizetésre váró) rendelések”*.
  - **Időszak szűrés & Élő előnézet**: Kezdő/záró dátum mezők, gyorsgombok (Mind, Ez a hónap, Elmúlt 30 nap), valamint valós idejű számláló a kiválasztott körökről, fuvarokról és szállítói hibákról.
- **Részleges Fizetés Fuvardíj Megtartása & Összesítő Lap (`js/services/exporter.js`)**:
  - Részleges fizetés esetén a fuvardíj nem nullázódik le, felelősség jelölve.
  - Összesítő lap külön *Összes Fuvar*, *Szállító hibája*, *Vevő / egyéb hiba*, *Fizetendő Fuvar* oszlopokkal és ezres formázással.
- **Tesztek**: 672/672 sikeres unit teszt (`tests/unit_tests.js`).

### 2026. szeptember 23. (5. frissítés) - Részleges Fizetésnél Fuvardíj Megtartása & Felelősség Kiírása (`v4.9.7`)
- **Fuvardíj Megőrzése Részleges Kézbesítéskor (`js/services/exporter.js`, `js/views/history/historyAccounting.js`)**:
  - Részleges fizetés esetén (pl. 1 db sérült tétel visszahozva, de a többi átadva) a fuvar fizikailag megtörtént, ezért a fuvardíj **NEM törlődik 0 Ft-ra**, a fizetendő fuvarok közé és a fuvardíj összegébe beszámítódik.
  - A fuvardíj lenullázása és levonása **kizárólag a teljesen meghiúsult** (`isUncollected === true`) szállítói hibás kiszállításokra vonatkozik.
- **Felelősség és Státusz Megjelenítése**:
  - A táblázatban és az elszámolásban a Státusz ("Részleges") és a Felelősség ("Szállító hibája" / "Saját hiba" / "Vevő / Egyéb") továbbra is pontosan és láthatóan kiírásra kerül.
  - Az elszámolási dialógusban a tájékoztató szöveg tisztázva: *"Szállító hibája (részleges): A fuvardíj érvényes marad (a fuvar megtörtént)."*
- **Összesítő Munkalap Pontosítása**:
  - Az "Összesítő" lapon a levont fuvarok (*Szállító hibája (db)*) kizárólag a meghiúsult kiszállításokat vonják le a *Fizetendő Fuvar (db)* összegből.
- **Automatizált Tesztek (`tests/unit_tests.js`)**:
  - 671/671 zöld egységteszt (beleértve a részleges fizetés fuvardíj megőrzését és felelősség vizsgálatát).

### 2026. szeptember 23. (4. frissítés) - Elszámolási Export Munkalapokra Bontva & Meghiúsulások Kiemelve (`v4.9.6`)
- **Excel (.xlsx) Munkafüzet Munkalapokkal (`libs/exceljs.min.js`, `js/services/exporter.js`)**:
  - Az Utánvét Elszámolások exportálása natív Excel (`.xlsx`) formátumra frissült a lokális `ExcelJS` motorral.
  - **Szállítócégenként külön munkalapok**: Minden szállítócég (pl. Sela, Trans-Sped, stb.) automatikusan külön fülre (munkalapra) kerül.
  - **Összesítő fül**: Több szállítócég szűrése esetén létrejön egy központi "Összesítő" lap is a globális adatokkal.
- **Meghiúsult Kiszállítások Vizuális Kiemelése**:
  - A meghiúsult rendelések sora elegáns világospiros/lazac háttérszínt (`#FEE2E2`), valamint félkövér bordó státusz és felelősség feliratot kapott, így azonnal megkülönböztethető a sikeresektől.
  - A részleges fizetések finom világossárga (`#FEF9C3`) háttérrel jelennek meg.
- **Megjegyzés Oszlop Törlése**:
  - A felesleges Megjegyzés oszlop eltávolításra került a táblázatból a felhasználó kérésének megfelelően (a felületen szükség esetén bármikor megtekinthető).
- **Gomb Frissítése (`index.html`, `js/app.js`)**:
  - A gomb felirata **`Export Excel`**-re frissült Excel ikonnal, és automatikusan `.xlsx` munkafüzetet tölt le (biztonsági fallback CSV támogatással).
- **Automatizált Tesztek (`tests/unit_tests.js`)**:
  - 665/665 zöld egységteszt (fejléc oszlopstruktúra, meghiúsult kiemelés, Excel munkalapok és ESM szintaxis validálva).

### 2026. szeptember 23. (3. frissítés) - Szállító Hibás Fuvardíjak (0 Ft) és Felelősség az Elszámolásban & CSV Exportban (`v4.9.5`)
- **Elszámolási CSV Export Kibővítése (`js/services/exporter.js`)**:
  - Az Utánvét Elszámolás CSV export (`btn-export-accounting-csv` / `exportAccountingToCsv`) mostantól minden egyes kiszállítást tartalmaz (nem hagyja ki a meghiúsultakat sem).
  - Új oszlopok: **Felelősség** ("Szállító hibája", "Saját hiba", "Vevő / Egyéb") és **Fuvardíj (Ft + Áfa)**.
  - Szállító hibás kiszállítás esetén a fuvardíj automatikusan **0 Ft**, és a céges összesítő fuvardíj összegbe is 0 Ft-tal számolódik be.
- **Elszámolási Nézet és Kártyák Számítása (`js/views/history/historyAccounting.js`, `js/utils/orderUtils.js`)**:
  - `calculateOrderDeliveryCost` kiegészítve `isCarrierFault: true` támogatással, ami `0 Ft`-ot és `0 Ft (Szállító hiba)` formázott szöveget ad vissza.
  - A körök fejlécében lévő fuvardíj összeg (`Fuvar: XX XXX Ft + Áfa`) automatikusan levonja a szállító hibás rendelések fuvardíját (0 Ft-tal veszi figyelembe).
  - A rendelés sorában a fuvardíj badge piros háttérrel és `0 Ft (Szállító hiba)` felirattal jelenik meg.
  - Az elszámolási modálban (`showSettlementDialog`) a "Szállító" gomb megnyomásakor figyelmeztető tájékoztató szöveg jelenik meg a fuvardíj 0 Ft-ra csökkentéséről.
- **Automatizált Tesztek (`tests/unit_tests.js`)**:
  - 650/650 zöld egységteszt (beleértve a szállító hibás 0 Ft-os fuvardíj kalkulációt, a normál vevő/saját hibás díjakat és az ESM szintaxis ellenőrzéseket).

### 2026. szeptember 23. (2. frissítés) - Új Kiszállítás és Fuvar Ellenőrzés Nézet (`v4.9.4`)
- **Előzmények Fül Átnevezése és Átalakítása (`index.html`, `js/views/auditView.js`)**:
  - A korábbi "Számlaellenőrzés" fül helyére a teljes körű **„Ellenőrzés”** (Kiszállítás és Fuvar Ellenőrzés) nézet került.
  - A nézet az Előzmények globális dátumszűrőjével és szállítócég-szűrőjével szinkronban működik.
- **KPI Statisztikai Információs Sáv**:
  - **Összes fuvar**: az adott szűrt időszakban az autókba kiadott összes kiszállítási kísérlet (rendelések összege).
  - **Egyedi rendelések**: a címzettek valós, deduplikált száma.
  - **Többszöri / Dupla fuvar**: az ismételt kiszállítások darabszáma és az érintett rendelések száma.
  - **Felelősségi megoszlás**: a meghiúsult fuvaroknál felmerült felelősség (Szállító hiba, Saját hiba, Vevő / Egyéb).
- **Dinamikus Gyorsszűrők**:
  - `Többszöri fuvarok (2x+)` (alapértelmezett: csak az ismételt kiszállítások).
  - `Szállító hibája` (ahol szállítói hiba miatt hiúsult meg a kézbesítés).
  - `Saját hiba` (ahol saját hibából nem került átadásra a csomag).
  - `Vevő / Egyéb` (ahol a vevő miatt maradt el az átadás).
  - `Összes probléma (Dupla + Kiesett)` (minden olyan rendelés, ami többször ment vagy kiesett).
- **Részletes Rendeléskártyák és Felelősség Módosítás**:
  - Tételes idősáv minden rendelésnél: 1. fuvar (dátum, cég, futár, eredmény, kiemelt indoklás/komment), 2. fuvar (pótszállítás eredménye).
  - Interaktív `resp-pill`: a felelősség egyetlen kattintással körbeforgatható és elmentődik a Firestore-ba (`HistoryManager.updateResponsibilityInFirestore`).
  - Kiesett utánvétes rendeléseknél elérhető az `[Utalt]` gomb is.
- **Részletes CSV Export**:
  - Letölthető ellenőrző táblázat az összes fuvaradat, kiesési indoklás és felelősség tételes kimutatásával.
- **Unit Tesztek & Stabilitás**:
  - A tesztcsomag kiegészült a fuvar- és meghiúsulási statisztikai számítások tesztelésével (`tests/unit_tests.js`). Mind a 644 egységteszt és ESM szintaxis-ellenőrzés 100%-ban zöld.

### 2026. szeptember 23. (1. frissítés) - Kompakt Csomagolási Szabályok & Intelligens Vegyes Paneles Referenciaszám (`v4.9.3`)
- **Kompakt, Összecsukható Csomagolási Szabályok Felület (`js/views/pannonxp/pannonxpSettings.js`)**:
  - A Termék & Csomagolási Szabályok fülön a kategóriák alapértelmezetten összecsukott (harmonika) állapotban jelennek meg.
  - Minden kategória fejlécében megjelent egy dinamikus összefoglaló badge (pl. *Max: 5 db · acoustic_family*), amely lenyitás nélkül is azonnali áttekintést nyújt a beállításokról.
  - A kategória részletei (darabszám szerinti méretek, súlyok, család ID) a **[Részletek]** gombbal külön kibonthatók és összecsukhatók.
  - A hosszúság paraméter lekerült a felső sorból közvetlenül a kártyaméretekhez és a dimenzió mezőkhöz.
  - A felső felesleges tájékoztató sáv eltávolításra került, az **Új kategória hozzáadása** gomb pedig tisztán lekerült az alsó sávba a mentés gomb mellé.
- **Intelligens Referenciaszám Generálás Vegyes Akusztikus Panelekhez (`js/services/shopify.js`)**:
  - Megszüntetve a vegyes paneleknél fellépő megtévesztő, line-item alapú csomagosztást (pl. 7 Pecan + 3 Chicago korábban `Pec4-3 Chic3` formátumban jelent meg, ami 3 doboz látszatát keltette).
  - Ha **egyféle akusztikus panel** van a rendelésben (akár ragasztóval, profilokkal együtt), megmarad a dobozonkénti csomagosztás (pl. 8 Pecan -> `Pec4-4`, 8 Pecan + 2 T-Rex -> `Pec4-4 trex2`).
  - Ha **többféle akusztikus panel** van a rendelésben (pl. 7 Pecan + 3 Chicago), a rendszer automatikusan felismeri a vegyes paneltartalmat, és a tiszta tételes darabszámokat tünteti fel kötőjelezés nélkül: `Pec7 Chic3` (ill. ragasztóval: `Pec7 Chic3 trex2`), tökéletesen lefedve a valós 2x5 dobozos csomagolást.
- **Kártyánkénti Hosszúság Prioritás (`js/services/pannonxp.js`)**:
  - A `calculateWeightAndPackages` kalkulációban a dobozméret kártyák egyedi hosszúsága (`domRule.length`) prioritást élvez a kategória általános `maxLength` értékével szemben.
- **Unit Tesztek & Validáció**:
  - Bővítve a tesztcsomag az új referenciaszám generálási esetekkel (`tests/unit_tests.js`). Mind a 638 egységteszt és az ESM szintaktika zöld.

### 2026. szeptember 22. (8. frissítés) - PannonXP Termék Rövidítés Javítás, Párosítások Szétválasztása & Keresés (`v4.9.2`)
- **Párosított és Tévesen Rögzített Termékek Megjelenítése (`js/views/pannonxp/pannonxpSettings.js`)**:
  - Megszüntetve a párosított (`linkedTo`) termékek automatikus elrejtése a Termék Rövidítések nézetben. Így minden regisztrált vagy korábban elírt termék megjelenik és szerkeszthetővé vált.
- **Szétválasztás (Unlink) Gomb Logika**:
  - A párosított tételek mellett megjelent az új **Szétválasztás** gomb. Erre kattintva a `linkedTo` referencia törlődik a Firestore perzisztenciában (`saveProductMappings`), így a termék azonnal önálló rövidítést és kategóriát kaphat.
- **Valós Idejű Keresősáv (`#pxp-search-abbrevs`)**:
  - Hozzáadva egy dinamikus keresőmező a beállítások ablak fejléces szekciójához. Így a felhasználó másodpercek alatt megtalálhatja és kiszűrheti a *„feles”* akusztikus paneleket vagy bármilyen más cikkszámot.
- **Kézi Termék Bejegyzés (`#pxp-btn-add-manual-mapping`)**:
  - Beállítva a manuális termék hozzáadás gomb, amellyel Shopify rendelés letöltése nélkül is rögzíthető bármilyen terméknév a PannonXP szótárban.
- **Unit Tesztek & ESM Ellenőrzés**:
  - 631/631 unit teszt és ESM szintaxis ellenőrzés 100%-ban zöld.

### 2026. szeptember 22. (7. frissítés) - Nem Fizikai Tételek (Semmi / Kizárva Kategória) & Feles Akusztikus Panel Kezelése (`v4.9.1`)
- **Nem Fizikai / Virtuális Tételek Támogatása (`type: 'none' | 'semmi'`)**:
  - Bevezetve a `cat_none` ("Nem fizikai tételek (Semmi / Kizárva)") kategória a PannonXP csomagkezelőben (`js/services/pannonxp.js`).
  - Az ide tartozó tételek (pl. *elsőbbségi szállítás*, *szállítási felár*, *garancia*, *jótállás*, *digitális szolgáltatás*) teljesen kizárásra kerültek a csomagkalkulációból: nem nyitnak dobozt, nem növelik a súlyt és a darabszámot.
  - A referenciaszám generáláskor (`js/services/shopify.js`) a nem fizikai tételek kimaradnak, nem igényelnek termékrövidítést, és nem okoznak `pxp_has_unmatched` / hiányzó rövidítés export hibát.
- **PannonXP Beállítások és Kategóriatípusok (`js/views/pannonxp/pannonxpSettings.js`, `js/views/pannonxp/pannonxpTable.js`)**:
  - A kategóriatípus választó kiegészült a *"Nem fizikai / Virtuális tétel (Semmi - csomagból kizárva)"* opcióval és kék kategória-tájékoztató panellel.
  - A termékhozzárendelési modálban nem fizikai tételeknél a rövidítés megadása opcionálissá vált.
- **Unit Tesztek & Stabilitás**:
  - A `tests/unit_tests.js` kiegészült a nem fizikai tételekre vonatkozó csomagszám- és súlykalkulációs tesztekkel. 631/631 egységteszt és ESM szintaxis-ellenőrzés 100%-ban zöld.

### 2026. szeptember 22. (6. frissítés) - Helyszíni Eladás és Többletfizetés Kezelése az Elszámolásban (`v4.9.0`)
- **Helyszíni Értékesítés (pl. Ragasztó eladása a futárnál) és Többletfizetés Támogatása**:
  - Támogatva mind az utánvétes (COD), mind a nem utánvétes (előre kifizetett vagy 0 Ft-os) rendeléseknél a helyszíni többletbeszedés rögzítése.
- **Elszámolási Dialógus Ablak (`js/views/history/historyAccounting.js`)**:
  - COD rendelések esetén: A bontott fizetés mezőinek felső korlátja eltávolítva. Ha a beírt összeg meghaladja az eredeti utánvétet, automatikusan megjelenik a zöld "Többletfizetés / helyszíni eladás történt!" panel a többlet összegével és egy indoklás szöveges mezővel (pl. "2 db ragasztó eladása a helyszínen"). A gomb felirata "Részleges / Bontás / Többlet" formátumra módosult.
  - Nem COD (0 Ft) rendelések esetén: Minden sor mellett elérhető az új "+ Helyszíni eladás" gomb. Rákattintva rögzíthető a beszedett összeg, a fizetési mód (Készpénz / Bankkártya), a fizetési státusz ("Nálunk van" jelölőnégyzet) és az indoklás.
  - Az elszámolási ablak összesítő sávja azonnal kalkulálja és megjeleníti a többleteket készpénz, kártya és teljes beszedett összeg bontásban.
  - Mentéskor a többlet adatok a `surplusOrders = { [orderId]: { amount, extraAmount, comment, method, isReceived } }` struktúrába kerülnek.
- **Központi Fizetési Szolgáltatás (`js/utils/paymentUtils.js`)**:
  - `getPaymentDetails(run, order)`: mindkét típusnál felismeri a többletet (`hasSurplus: true`, `surplusAmount`, `collectedAmount`, `surplusComment`). Nem utánvétes rendelés esetén formázott `methodText` ("Helyszíni eladás: Kártya: X Ft") és `statusText` értéket ad. COD rendelés esetén a státuszhoz hozzáfűzi a többletet (pl. "Kiegyenlítve (+5 000 Ft többlet)").
  - `getRunPaymentTotals(run)`: a helyszíni nem-COD beszedéseket automatikusan beleszámolja a kör teljes utánvét összegébe (`totalCod`), valamint a készpénzes és kártyás részösszegekbe.
  - `getEligibleOrdersForMarkAsPaid(run)`: biztosítja, hogy a többletet fizető vevők rendelései (összeg >= codAmount) az összeg beérkezésekor megjelölhetők legyenek Shopify PAID státuszra.
- **Előzmények és Elszámolási Lista (`js/views/history/historyAccounting.js`)**:
  - A rendelés csipeken zöld badge jelzi a többletet és az indoklást (pl. `+5 000 Ft többlet · 2 db ragasztó`, vagy `Helyszíni eladás: 11 430 Ft Kártya (Rendben) · 3 db ragasztó`).
  - A nem-COD, de helyszíni eladással rendelkező tételek automatikusan bekerülnek a futárkör elszámolási jelvényei közé.
  - Módosításkor (`btn-modify-settlement`) a korábbi többletek és megjegyzések hibátlanul visszatöltődnek a felületre.
- **Adatbázis Perzisztencia (`js/services/history.js`)**:
  - `HistoryManager.updateSettlementStatus`: elmenti a `surplusOrders` objektumot a Firestore-ba.
  - `HistoryManager.revertToPending`: visszaállításkor törli a `surplusOrders` mezőt.
- **Utánvét Elszámolási CSV Export (`js/services/exporter.js`)**:
  - Új dedikált numerikus oszlopként bevezetve a `"Beszedett Összeg (Ft)"`: minden sornál a ténylegesen beszedett összeget tartalmazza (pl. részlegesnél 43 810 Ft, többletnél 15 000 Ft, helyszíni eladásnál 11 430 Ft, kiesettnél 0 Ft).
  - A cégenkénti összesítő sorban a beszedett összegek összege automatikusan összegződik.
  - A Megjegyzés (failReason) oszlopban automatikusan és tételesen megjelenik: `Többlet / helyszíni eladás: +X Ft (indoklás)`.
- **Automatikus Tesztelés (`tests/unit_tests.js`)**:
  - Új egységtesztek hozzáadva COD többletfizetésre, nem-COD helyszíni kártyás eladásra, futárkör összesítésre, Shopify szinkronizációs alkalmasságra és CSV export numerikus és szöveges generálásra.
  - 629/629 egységteszt és ESM szintaxis-ellenőrzés sikeresen lefutva (100% zöld).

### 2026. szeptember 22. (5. frissítés) - Belső Fuvarköltség Kalkuláció, Szerkesztés a Szedőlistán és Előzményekben, CSV Export (`v4.8.0`)
- **Központi Fuvarköltség és Tábla Kalkuláció (`js/utils/orderUtils.js`)**:
  - Létrehozva az `isBoardItem(item)` függvény: nagyméretű elemek (PVC falpanel, SPC falpanel, padlózatok, akusztikus panelek, akupanel) felismerése; a kellékek (ragasztók, szilikonok, sarok- és élvédő profilok, skirting / szegélyléc, tapadóhíd, tisztítók, minták) szigorú és pontos kizárásával.
  - Létrehozva a `countOrderBoards(order)` és `isBudapestAddress(order)` függvények.
  - Létrehozva a `calculateOrderDeliveryCost(order)` függvény a képlet szerint:
    - Budapest: 10 000 Ft + Áfa alapdíj (0-10 tábla), 10 tábla felett táblánként +1 100 Ft + Áfa.
    - Vidék: 15 000 Ft + Áfa alapdíj (0-10 tábla), 10 tábla felett táblánként +1 100 Ft + Áfa.
    - A 0 táblás kiszállítások (csak ragasztó/profil) az alapdíjat kapják.
    - Szigorúan egységes formátum: `"X Ft + Áfa"`.
    - Egyedi felülírás támogatása: ha `order.customDeliveryCost` meg van adva, az élvez prioritást.
- **Szedőlista Készítés Nézet (`js/views/ordersView.js`, `js/app.js`)**:
  - Minden rendelési kártya fejlécében (a vevőadatok és az utánvét jelvény között) megjelenik a fuvardíj badge (`Fuvar: 15 000 Ft + Áfa`).
  - Kattintásra (`CustomDialog.prompt`) egyedi ár adható meg, amely azonnal felülírja a rendelés fuvardíját, vagy alapértékre visszaállítható.
- **Előzmények és Elszámolások Nézet (`js/views/history/historyAccounting.js`)**:
  - A futárkör kártyáján lévő minden rendelés sorában a vevő neve után, a fizetési státusz előtt megjelenik a rendelés fuvardíja.
  - Kattintásra szerkeszthető (`CustomDialog.prompt`), a módosítás a Firestore-ban és a helyi memóriabeli gyorsítótárban is azonnal perzisztálódik (`HistoryManager.updateOrderDeliveryCost`).
  - A futárkör fejlécében automatikusan összesítésre kerül a kör teljes nettó fuvardíja (`Fuvar: XX XXX Ft + Áfa`), támogatva a futárcégekkel való elszámolást.
- **Utánvét Elszámolási CSV Export (`js/services/exporter.js`)**:
  - Az `exportAccountingToCsv` funkció utolsó oszlopaként bekerült a `"Fuvardíj (Ft + Áfa)"`.
  - A szállítócégenkénti összesítő sorban automatikusan megjelenik a cég összesített fuvardíja is.
- **Automatikus Tesztek (`tests/unit_tests.js`)**:
  - 604 unit teszt 100%-ban sikeres (0 hiba), lefedve minden határesetet (Bp/vidék, 0-tól 20+ tábláig, kizárások, egyedi felülírás, perzisztencia).

### 2026. szeptember 22. (4. frissítés) - Fix 9900 Ft Szállítás & Ingyenes Ajándék / Tételkedvezmény Kezelés (`v4.7.1`)
- **Fix 9900 Ft Szállítási Díj - Rossz Szállítás Ellenőrzés Inaktiválása**:
  - `js/utils/orderUtils.js`: Létrehozva a moduláris `ENABLE_BAD_SHIPPING_CHECK = false` kapcsoló. A `checkBadShipping` alapértelmezetten `false`-t ad, a teljes 13 lépéses ellenőrző algoritmus 100%-ban megmaradt (`forceCheck = true` opcióval).
  - `js/services/shopifyApiService.js`: A korábbi inlined szállítási ellenőrzés közvetlenül a központi `checkBadShipping` függvényre lett delegálva.
  - `js/views/orderOverviewView.js`: A "Rossz szállítás (2300 Ft)" szűrőchip automatikusan eltűnt a felületről, a sorok nem színeződnek tévesen pirosra és a figyelmeztető badge sem jelenik meg.
- **Ingyenes Ajándékok és Kedvezményes Tételek Pontos Kezelése (#4113)**:
  - `js/utils/orderUtils.js`: Létrehozva a tiszta `aggregateOrderLineItems` segédfüggvény. A Shopify `discount_allocations` és `total_discount` adatait feldolgozva a tétel tényleges fizetendő összegét számolja (`totalPrice`).
  - Az azonos cikkeket a raktári kiszedés megkönnyítésére egy sorban összegzi (`10 db HPR Ragasztó`), miközben nyilvántartja az ingyenes darabszámokat (`freeQty: 7 db`, `paidQty: 3 db`, `hasFreeGift: true`).
  - `js/views/orderOverviewView.js`: A sorösszegnél a valós fizetendő összeg jelenik meg (`11 430 Ft`), kedvezmény esetén áthúzva a listaár (`38 100 Ft`), a tétel alatt pedig zöld jelvény mutatja a megoszlást (`7 db ingyenes ajándék (0 Ft) • 3 db fizetős`).
  - `js/utils/printTemplates.js` és `js/services/shopify.js`: A szállítólevél és CSV parser szintén a valós `totalPrice` összegeket veszi alapul.
- **Tesztelés & Minőségbiztosítás**:
  - 540/540 egységteszt és ESM szintaxis-ellenőrzés sikeresen lefutva (100% zöld).
  - Élő adatokkal (#4113) ellenőrizve: a tételsorok összege (160 810 Ft) + szállítás (9 900 Ft) = 170 710 Ft, fillérre megegyezik a rendelés végösszegével.

### 2026. szeptember 22. (3. frissítés) - Monolitikus Fájlok Modularizálása: Shopify Router és Vezérlők Kiszervezése (`v4.7.0`)
- **Szerver Oldali Modularizáció (`server.js` -> `server/shopifyRoutes.js`)**:
  - A korábban 1662 soros monolitikus `server.js` felesleges kódismétléseit és router blokkját önálló CommonJS modulba (`server/shopifyRoutes.js`) szerveztük.
  - A `server.js` mérete közel 1000 sorral csökkent (670 sorra karcsúsodott), közvetlenül delegálva a Shopify OAuth, lekérdezési, teljesítési és tagelési logikát a routernek.
- **Frontend Vezérlők Kiszervezése (`js/app.js` -> `js/controllers/`)**:
  - `js/controllers/orderNoteController.js`: Létrehozva a rendelési megjegyzések (Notes) szerkesztésére és mentésére szolgáló vezérlő (`openOrderNoteModal`).
  - `js/controllers/courierSelectController.js`: Létrehozva a szállítócéghez kötött intelligens futárválasztó vezérlő (`COMPANY_COURIERS` és `updateCourierSelectElements`).
  - Az `app.js` közvetlenül importálja és használja ezeket, megelőzve az óriási inlined függvényeket.
- **Tesztelés & Minőségbiztosítás**:
  - 524/524 egységteszt és ESM szintaxis-ellenőrzés sikeresen lefutva (100% zöld).

### 2026. szeptember 22. (2. frissítés) - Architektúra Tisztítás: Store Állapotkezelés és View Réteg Karcsúsítás (`v4.6.9`)
- **Store mint Egyetlen Igazságforrás (`js/store/state.js`)**:
  - Az `orderOverviewView.js` korábbi privát, modul-szintű `expandedOrderIds` állapota átkerült a központi `Store`-ba (`Store.state.expandedOrderIds`, `Store.toggleExpandedOrder()`, `Store.isOrderExpanded()`, `Store.clearExpandedOrders()`).
  - Az `OrderOverviewView.toggleExpand` és `isExpanded` metódusok transzparensen delegálnak a `Store`-ba, így a rétegek szigorúan követik az `ARCHITECTURE.md` előírásait.
- **View Réteg Tehermentesítése & Üzleti Logika Kiszervezése**:
  - A szállítási címhiány validáció (`hasInvalidDeliveryAddress`) átkerült az `orderUtils.js` modulba, ahol a meglévő és tesztelt `checkInvalidDeliveryAddress` logikára épül. A nézet (`orderOverviewView.js`) csak a kész eredményt jeleníti meg.
- **Felesleges Adatbázis Import Eltávolítása a Statisztikából (`js/views/stats.js`)**:
  - Eltávolítottuk a korábbi felesleges `import { db, doc, updateDoc } from '../firebase-config.js'` importot a statisztikai nézetből, tisztán megőrizve a View réteg és az adatbázis elválasztását.
- **Unit Tesztek & Stabilitás**:
  - 522/522 sikeres zöld unit teszt lefutva (`tests/unit_tests.js`).

---

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
