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

- **Utolsó aktív modell**: [Ide írd a legutóbbi modellt, pl. Gemini 3.1 Pro]
- **Státusz**: A rendszer stabil, a legutóbbi logisztikai statisztikák és a nyomtatási kép finomhangolása megtörtént.
- **Folytatás**: A lenti TODO lista első elemével.

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

## 🎯 Következő Lépések (TODO)
- [ ] **CSV Export**: Lehetőség a korábbi fuvarok CSV-ben történő exportálására a könyvelésnek. (Előkészítve)
- [ ] **Kereső**: Global search funkció a mentett szállítási körök és elszámolások között.