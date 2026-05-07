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
- **Státusz**: A rendszer stabil. Az Előzmények modal mind a 4 füle Apple-inspired kártyarendszerre lett átdolgozva (`history-apple-card`, `hac-*` CSS osztályok). A nyomtatott szedőlistán az összekészített profilok részletei is látszódnak.
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

## Következő Lépések (TODO)
- [ ] **Előzmények szűrés újraírása:** A jelenlegi szűrés (dátum, cég) nem megbízható. Újraírás professzionálisan: dátumtartomány szűrő, cég dropdown, szűrés törlése (reset) gomb, aktív szűrők vizuális jelzése (pl. badge a szűrő mellett), azonnali visszajelzés ha nincs találat.
