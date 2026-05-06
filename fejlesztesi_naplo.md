# Kiszedési Jegyzék Shopify - Dokumentáció és Fejlesztési Napló

Ez a dokumentum a projekt teljes leírását, használati útmutatóját és a fejlesztések történetét tartalmazza. 
**Célja:** Ha új gépen vagy új fejlesztővel (pl. egy új Antigravity munkamenetben) nyitod meg a projektet, ebből a fájlból azonnal világos legyen a teljes kontextus és a munkafolyamat.

---

## 🚀 Hogyan folytassuk a munkát egy új gépen?
Amikor leklónoztad a GitHub-ról a projektet egy új gépre, és elindítod az Antigravity-t:
1. **Első lépésként: Olvasd el a `gemini alap skill.md` fájlt!** Ez tartalmazza a WAT architektúrát és az ügymenetet.
2. Az első üzeneted ez legyen az AI-nak: *"Szia! Kérlek, olvasd el a `fejlesztesi_naplo.md` és a `gemini alap skill.md` fájlokat, és folytassuk a munkát a TODO lista alapján!"*
3. A munka végeztével mindig kérd meg az AI-t, hogy frissítse ezt a naplót az új eredményekkel.
4. Végül mentsd el Git-tel — **lásd a Git szabályokat lent!**

---

## 📋 Git Munkafolyamat Szabályok

> [!IMPORTANT]
> **Commit üzenet szabály:** Az AI soha nem futtathat `git commit` parancsot addig, amíg a felhasználó nem adja meg a commit üzenet szövegét. A folyamat mindig ez:
> 1. AI elvégzi a munkát
> 2. AI megmutatja: *"Kész! Add meg a commit üzenet szövegét, és én futtatom a `git add . → git commit → git push` parancsokat."*
> 3. Felhasználó megadja a nevet (pl. `"fix: utánvét javítás"`)
> 4. AI futtatja: `git add .` majd `git commit -m "[felhasználó szövege]"` majd `git push`

### A 3 alapparancs (ezt kell megtanulni)
```bash
git add .                           # 1. Összegyűjt MINDEN változást
git commit -m "leírás amit te adsz meg"  # 2. Pillanatkép mentése
git push                            # 3. Feltöltés GitHub-ra → webhely frissül ~1-2 perc múlva
```

### Ellenőrzés push után
- Várd meg az ~1-2 percet
- Böngészőben: **`Ctrl + Shift + R`** (kényszer-frissítés, cache nélkül)
- GitHub Actions státusz: `https://github.com/5926q6swn2-bot/Kiszed-si-jegyz-k-shopify/actions`

---

## 📦 A Projekt Célja és Működése
Egy böngészőből futtatható raktári szedőlista és elszámoló rendszer Shopify webáruházakhoz.
- **Kezdés:** A Shopify-ból exportált megrendelések CSV fájljának beolvasása.
- **Feldolgozás:** A rendszer automatikusan formázza a termékeket, kiszűri a duplikált rendeléseket, és vizuális jelzéseket ad a problémás rendelésekről (pl. hiányzó utalás, lappangó utánvét).
- **Kimenet:** Nyomtatható Szedési Jegyzék és kétoldalas "Összesítő és Korrekciós lap" a futároknak a pénzügyi elszámoláshoz.

### Használati Útmutató (Felhasználóknak)
1. Nyisd meg az `index.html` fájlt a böngésződben (vagy futtass egy helyi szervert a mappában).
2. Töltsd fel a Shopify-ból lementett napi CSV fájlt.
3. Ellenőrizd a listát, szükség esetén adj hozzá rendeléseket kézzel.
4. Nyomtasd ki a listát. A nyomtatás elindításakor a rendszer elmenti az adott "Szállítási Kört".
5. Az "Előzmények" gombra kattintva bármikor visszakeresheted, újranyomtathatod a korábbi köröket, és az "Elszámolások" fülön kinyomtathatod a futárok pénzügyi elszámoló lapját.

---

## 🛠 Aktuális Technikai Stack
- **Frontend**: Vanilla HTML5, CSS3 (Modern, Apple/Glassmorphism design)
- **Logika**: Vanilla JavaScript (ES Modules, `app.js`)
- **Adatbázis & Backend**: Google Firebase (Cloud Firestore)
- **Autentikáció**: Firebase Authentication (E-mail/Jelszó)
- **Külső könyvtárak**: 
  - `PapaParse` (CSV importáláshoz)
  - `Sortable.js` (Drag & drop funkciókhoz)
  - Firebase SDK v10.8.0

## 3. Rendszer Architektúra

### Adatfolyam és Felhő Szinkronizáció
Az alkalmazás korábban helyi `localStorage`-et használt, de át lett állítva a Firebase Cloud Firestore-ra. A bejelentkezett felhasználók adatai valós időben mentődnek a felhőbe. 
A bejelentkezést az `index.html` tetejére helyezett overlay réteg (Login Screen) végzi, a Firebase funkciók inicializálása a `js/firebase-config.js` fájlban történik.

### A `HistoryManager` objektum
A `js/app.js`-ben lévő `HistoryManager` felel a szállítási körök kezeléséért. Most már aszinkron Firebase metódusokat használ (`getDocs`, `addDoc`, `deleteDoc`, `updateDoc`). 
**Fontos szabály:** Ha új modult vagy logikát írsz, aminek hozzá kell férnie az előzményekhez, mindenhol `await` kulcsszóval kell meghívni ezeket a függvényeket.

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
- **Szemetes (Trash) Rendszer:** A törölt szállítási körök nem törlődnek véglegesen, hanem egy 30 napos megőrzésű szemetesbe kerülnek, ahonnan bármikor visszaállíthatók.

### Legutóbbi frissítés: 2026. május 5. (Firebase Migráció & Publikálás)
- **Firebase Cloud Firestore:** A `localStorage` teljesen kivezetve, az adatbázis átköltözött a felhőbe. A `HistoryManager` aszinkronná vált.
- **Firebase Authentication:** E-mail/jelszó alapú bejelentkezési réteg (Login Overlay) implementálása az adatok védelme érdekében. A Firestore adatbázis szabályai élesítve (`request.auth != null`).
- **ES Modules:** A script betöltések moduláris architektúrára álltak át a biztonságos Firebase SDK importálások miatt.
- **Publikálás (GitHub Pages):** Az alkalmazás most már weboldalként is üzemel a GitHub Pages-en keresztül, amely automatikusan (CI/CD) frissül push-olás után.

### Korábbi frissítés: 2026. május 5. (Délelőtt)
- **Elszámolások fül javítása:** A HTML szerkezetben javítva lett egy hiányzó `</div>` lezáró elem, így az Elszámolások fül újra látható és megfelelően listázza az elmentett fuvarokat a várható utánvét összegével.
- **Dátumtartomány Szűrés:** Az előzményeknél a napi szűrő le lett cserélve egy "Kezdő dátum (tól)" és "Záró dátum (ig)" szűrőre, amely a Szedések és az Elszámolások fülön is működik.
- **Git & GitHub Integráció:** A projekt verziókövetést kapott és feltöltésre került a GitHub-ra. Létrejött a `.gitignore` fájl a felesleges fájlok szűrésére.

---

## 🎯 Következő Lépések (TODO)
- [ ] *Itt gyűjtjük majd az új funkció ötleteket és a megoldandó hibákat.*
- [ ] *Pl.: Lehetőség a korábbi fuvarok CSV-ben történő exportálására a könyvelésnek.*
