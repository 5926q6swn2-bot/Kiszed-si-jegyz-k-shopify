# Kiszedési Jegyzék Shopify - Dokumentáció és Fejlesztési Napló

Ez a dokumentum a projekt teljes leírását, használati útmutatóját és a fejlesztések történetét tartalmazza. 
**Célja:** Ha új gépen vagy új fejlesztővel (pl. egy új Antigravity munkamenetben) nyitod meg a projektet, ebből a fájlból azonnal világos legyen a teljes kontextus és a munkafolyamat.

---

## 🚀 Hogyan folytassuk a munkát egy új gépen?
Amikor leklónoztad a GitHub-ról a projektet egy új gépre, és elindítod az Antigravity-t:
1. Az első üzeneted ez legyen az AI-nak: *"Szia! Kérlek, olvasd el a `fejlesztesi_naplo.md` fájlt, és folytassuk a munkát a TODO lista alapján!"*
2. A munka végeztével mindig kérd meg az AI-t, hogy frissítse ezt a naplót az új eredményekkel.
3. Végül mentsd el a szokásos Git parancsokkal (`git add .`, `git commit -m "..."`, `git push`).

---

## 📦 A Projekt Célja és Működése
Egy böngészőből futtatható, helyi (Local Storage) adattárolást használó raktári szedőlista és elszámoló rendszer Shopify webáruházakhoz.
- **Kezdés:** A Shopify-ból exportált megrendelések CSV fájljának beolvasása.
- **Feldolgozás:** A rendszer automatikusan formázza a termékeket, kiszűri a duplikált rendeléseket, és vizuális jelzéseket ad a problémás rendelésekről (pl. hiányzó utalás, lappangó utánvét).
- **Kimenet:** Nyomtatható, vonalkódos Szedési Jegyzék és kétoldalas "Összesítő és Korrekciós lap" a futároknak a pénzügyi elszámoláshoz.

### Használati Útmutató (Felhasználóknak)
1. Nyisd meg az `index.html` fájlt a böngésződben (vagy futtass egy helyi szervert a mappában).
2. Töltsd fel a Shopify-ból lementett napi CSV fájlt.
3. Ellenőrizd a listát, szükség esetén adj hozzá rendeléseket kézzel.
4. Nyomtasd ki a listát. A nyomtatás elindításakor a rendszer elmenti az adott "Szállítási Kört".
5. Az "Előzmények" gombra kattintva bármikor visszakeresheted, újranyomtathatod a korábbi köröket, és az "Elszámolások" fülön kinyomtathatod a futárok pénzügyi elszámoló lapját.

---

## 🛠 Aktuális Technikai Stack
- **Frontend:** Vanilla HTML5, Vanilla CSS (`css/style.css`), Vanilla JavaScript (`js/app.js`).
- **Függőségek (Lokális):** 
  - `papaparse.min.js` (CSV feldolgozás)
  - `Sortable.min.js` (Drag & drop listarendezés)
- **Adatbázis:** Nincs külső adatbázis, mindent a böngésző `localStorage` tárol (`szedolista_history` kulcs).

---

## 📝 Fejlesztési Napló (Changelog)

### Legutóbbi frissítés: 2026. május 5.
- **Elszámolások fül javítása:** A HTML szerkezetben javítva lett egy hiányzó `</div>` lezáró elem, így az Elszámolások fül újra látható és megfelelően listázza az elmentett fuvarokat a várható utánvét összegével.
- **Dátumtartomány Szűrés:** Az előzményeknél a napi szűrő le lett cserélve egy "Kezdő dátum (tól)" és "Záró dátum (ig)" szűrőre, amely a Szedések és az Elszámolások fülön is működik.
- **Git & GitHub Integráció:** A projekt verziókövetést kapott és feltöltésre került a GitHub-ra. Létrejött a `.gitignore` fájl a felesleges fájlok szűrésére.

---

## 🎯 Következő Lépések (TODO)
- [ ] *Itt gyűjtjük majd az új funkció ötleteket és a megoldandó hibákat.*
- [ ] *Pl.: Lehetőség a korábbi fuvarok CSV-ben történő exportálására a könyvelésnek.*
