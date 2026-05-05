# Kiszedési Jegyzék Shopify - Fejlesztési Napló

Ez a fájl tartalmazza a projekt aktuális állapotát és az eddigi fejlesztéseket, hogy az Antigravity könnyen felvehesse a fonalat egy új gépen indított beszélgetésnél.

## A Projekt Célja
Egy raktári szedőlista és elszámoló rendszer Shopify rendelésekhez. A rendszer képes beolvasni a Shopify-ból exportált CSV fájlokat, kigyűjti a rendeléseket, kezeli a fizetési státuszokat (pl. banki utalás, utánvét) és nyomtatható szedőlistát, illetve elszámoló lapokat (szállítóleveleket) generál.

## Eddigi Fejlesztések és Aktuális Állapot (2026. május 5.)
- **Rendelések feldolgozása:** A Shopify CSV sikeresen beolvasásra kerül. Kiszűri a duplikációkat, formázza a termékneveket, és hibajelzéseket ad (pl. "Függő Utalás", "Lappangó Utánvét").
- **Kézi rendelésfelvitel:** Lehetőség van manuálisan is hozzáadni rendeléseket a listához egy felugró ablakban.
- **Szállítólevelek letisztítása:** A kinyomtatott szállítólevelekről eltűntek a nettó árak és felesleges információk, kizárólag a tételek darabszáma és az utánvét (vagy "Fizetve" státusz) maradt rajta. A rendelési szám hatalmas, szürke kiemelt dobozba került a jobb felső sarokba a könnyű azonosíthatóságért.
- **Szedőlista kompakt nézete:** A szedőlista fejléce kisebb lett, a logisztikai és szállító adatok (dátum, cég, futár) egy elegáns, folyamatosan látható vízszintes sávba (footer) kerültek az oldal alján, maximalizálva a helyet a tételeknek.
- **2 oldalas Elszámolási Csomag (ÚJ):** Bevezettük a teljes papíralapú futár-elszámolás támogatását.
  - *1. oldal (Átadás-Átvétel Összesítő):* Tételesen listázza a raktárból elvitt termékeket darabszámra, a beszedendő utánvét végösszegét a teljes körre, és az érintett rendelési számokat. Induláskor kerül aláírásra.
  - *2. oldal (Korrekciós és Elszámoló Lap):* Táblázatosan listázza a körben lévő rendeléseket vevő névvel és egyedi utánvéttel. Kézzel pipálható a "Nem vette át" státusz, vezethető a visszahozott áru, és alul matematikailag levezeti a ténylegesen befizetett készpénzt.
- **Előzmények és Elszámolások Fül (ÚJ):** Az előzmények ablak két dedikált fülre bomlott:
  - *Szedések:* A megszokott lista, ahol visszatölthetők a korábbi körök, illetve újranyomtathatók a szállítólevelek.
  - *Elszámolások:* Átlátható pénzügyi összesítő a szállításokról, ahonnan egy gombnyomással **kizárólag a 2 oldalas elszámolási csomag (Összesítő + Korrekció)** nyomtatható újra.
- **Naptáros Dátumszűrés (ÚJ):** Bekerült egy naptáros dátumválasztó az Előzményekhez, amely tökéletesen konvertálja a formátumokat, és azonnal szűri mind a Szedések, mind az Elszámolások listát a kiválasztott napra.

## Jelenlegi Technikai Stack
- **Frontend:** HTML, Vanilla CSS, Vanilla JavaScript (`app.js`)
- **Külső könyvtárak:** PapaParse (CSV beolvasás), Sortable.js (drag and drop)
- **Adattárolás:** Böngésző LocalStorage (Előzmények és korábbi körök mentése a `HistoryManager` segítségével).

## ⚠️ Szabályok és Fejlesztői Kontextus (Új munkamenetekhez)
Ha új AI asszisztens vagy és most csatlakoztál a projekthez, az alábbi szigorú szabályokat **KÖTELEZŐ** betartanod a jövőbeli fejlesztések során:

1. **Szállítólevelek (Pénzügyi adatok védelme):**
   - **SOHA** ne jeleníts meg nettó/bruttó egységárakat vagy rendelési végösszegeket a szállítóleveleken!
   - Kizárólag a beszedendő **Utánvét** (COD) összege szerepelhet rajta (jól látható, pirosas kiemeléssel).
   - Ha a rendelés előre fizetett, akkor kizárólag a zöld "Fizetve" státusz jelenhet meg az árak helyén.
   
2. **Kiemelt Rendelési Számok:**
   - A rendelési szám (`#` jellel a Shopify CSV miatt) a legfontosabb azonosító. 
   - A Szállítóleveleken ezt mindig a **jobb felső sarokban**, egy hatalmas, szürke kiemelt dobozban kell tartani (`font-weight: 900`, `font-size: 28px` vagy hasonló).
   - Figyelj rá, hogy a CSV-ből beolvasott `order.id` eleve tartalmazza a `#` jelet, így ne fűzz elé még egyet a kódban, mert abból `##2490` lesz!

3. **Nyomtatási Elrendezések (Layout):**
   - **Szedőlista:** A legfontosabb a helytakarékosság. A fejléc (Kiszedési Jegyzék) minimális méretű, a logisztikai adatok (dátum, futár, cég) pedig fixen az oldal aljára (footer) vannak rendezve, hogy a terméklista minél hosszabb lehessen az A4-es lapon.
   - A nyomtatási oldaltöréseket a CSS `@media print` és `page-break-inside: avoid` / `break-inside: avoid` szabályozza. Kerüld a JS-alapú kemény oldaltöréseket a szedőlistánál.

4. **A 2 oldalas Elszámolási Csomag logikája:**
   - Amikor a rendszer a Szállítóleveleket generálja (`generateDeliveryNotesHtml`), a legelső két kigenerált oldal **mindig** a 2 oldalas Elszámolási Csomag kell, hogy legyen.
   - *1. oldal (Összesítő):* A `run.orders` alapján kilistázza a termék összesítőt (miből mennyi) és az érintett rendelésszámokat. Induláskor kerül aláírásra.
   - *2. oldal (Korrekciós Lap):* A futár visszaérkezésekor használt papír, manuális (kézi) kitöltésre szánt táblázat cellákkal ("Nem vette át", "Visszahozott tételek").
   - Ezt a két oldalt az "Előzmények -> Elszámolások" fülről is le kell tudni generálni külön, a vevői szállítólevelek nélkül!

5. **Dátumkezelés és Szűrés:**
   - A magyar rendszer a `YYYY. MM. DD.` (pl. `2026. 05. 05.`) formátumot használja (`toLocaleDateString('hu-HU')`).
   - Amikor HTML `<input type="date">`-et használsz (ami `YYYY-MM-DD` értéket ad vissza), a szűrésnél és az egyezőség vizsgálatánál ezt manuálisan **vissza kell konvertálni** a magyar pontozott formátumra, különben a szűrések üres listát adnak vissza.

6. **Adatszerkezet (HistoryManager):**
   - Egy elmentett kör (run) a következőket tartalmazza: `id`, `timestamp`, `date` (kiszállítás), `pickupDate` (felvétel), `company` (cég), `courier` (futár/átadó), és `orders` (maga a megrendelés tömb).

7. **Gyakori Kérdések, Ismert Hibák és Furcsaságok (FAQ)**
   - *Hiba:* "Lappangó Utánvét" jelenik meg. *Ok:* A Shopify CSV-ben a Financial Status "pending", de a vásárló bankkártyás fizetést választott (pl. nem fejezte be a tranzakciót). Ezért az app kiemeli, hogy kézzel ellenőrizni kell.
   - *Hiba:* Az "Elszámolások" fülön nincsenek szállítási körök a szűrés ellenére. *Ok:* JS Date formátum egyeztetési hiba (`YYYY-MM-DD` vs `YYYY. MM. DD.`).
   - *Furcsaság:* A `page-break-inside: avoid` nem mindig működik tökéletesen minden böngésző nyomtatási motorjában. Chromium (Chrome/Edge) böngészők preferáltak a használatra.

## 📌 META: Hogyan kell ezt a fájlt karbantartani?
Az AI asszisztenseknek és fejlesztőknek **KÖTELEZŐ** ezt a `fejlesztesi_naplo.md` fájlt frissíteniük az alábbi esetekben:
- **Új funkciók:** Ha egy új, nagyobb funkció vagy egyedi üzleti logika bevezetésre kerül (pl. számlázó integráció).
- **Új felfedezett hibák / Peremesetek:** Ha egy nehezen megtalált bugot javítasz, **azonnal** írd be a "Gyakori Kérdések és Hibák" (FAQ) részbe, hogy a jövőben ne fussunk bele újra.
- **Adatszerkezeti változások:** Ha a `HistoryManager` vagy a CSV feldolgozás struktúrája megváltozik.
- Minden fejlesztési kör végén ellenőrizni kell, hogy az itt leírt kontextus még mindig fedi-e a valóságot. Ezt a fájlt úgy kell kezelni, mint a projekt "Szentírását".

## Következő Lépések (TODO)
*(Ide írhatjuk fel a jövőbeli terveket, amiket majd meg kell valósítanunk)*
