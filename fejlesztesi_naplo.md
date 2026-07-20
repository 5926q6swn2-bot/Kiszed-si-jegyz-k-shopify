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
- **Státusz**: A rendszer stabil. Bevezetve a kétlépcsős elszámolás (logisztikai + kártyás/KP fizetési bontás) és a kártyás utalások nyomon követése.
- **Folytatás**: Tesztelés után további funkciók fejlesztése vagy a statisztikák finomhangolása az új fizetési módok alapján.

---

## 📝 Fejlesztési Napló (Changelog)

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

## 🚀 TODO (Hátralévő feladatok)
- **PannonXP Cím Validációs Figyelmeztetés debugolása**: Bár bevezetésre került a `checkAddressValidity` ellenőrzés (ami felismeri az érvényes címeket és kiszűri a hiányosakat), bizonyos helyes címeknél (pl. `2740, Abony, Szolnoki út 38` vagy `3351, Verpelét, Ifjúság út 36/6 1 emelet 18`) még mindig hibás/hiányos figyelmeztetést mutat a felület. Ezt a validációs logikát és a felületi szinkronizációt a következő sessionben tovább kell debugolni, hogy ne akadályozza a helyes címek exportálását, és szükség esetén lazítani kell a szabályokon (pl. ne legyen az utca kifejezés meglétéhez kötve az érvényesség, vagy az on-the-fly felbontás hibáit kell javítani).


