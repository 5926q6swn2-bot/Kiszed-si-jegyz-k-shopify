# Kiszedési Jegyzék Shopify - Fejlesztési Napló

Ez a fájl tartalmazza a projekt aktuális állapotát és az eddigi fejlesztéseket, hogy az Antigravity könnyen felvehesse a fonalat egy új gépen indított beszélgetésnél.

## A Projekt Célja
Egy raktári szedőlista és elszámoló rendszer Shopify rendelésekhez. A rendszer képes beolvasni a Shopify-ból exportált CSV fájlokat, kigyűjti a rendeléseket, kezeli a fizetési státuszokat (pl. banki utalás, utánvét) és nyomtatható szedőlistát, illetve elszámoló lapokat (szállítóleveleket) generál.

## Eddigi Fejlesztések és Aktuális Állapot (2026. május 5.)
- **Rendelések feldolgozása:** A Shopify CSV sikeresen beolvasásra kerül. Kiszűri a duplikációkat, formázza a termékneveket, és hibajelzéseket ad (pl. "Függő Utalás", "Lappangó Utánvét").
- **Kézi rendelésfelvitel:** Lehetőség van manuálisan is hozzáadni rendeléseket a listához egy felugró ablakban.
- **Dátumszűrés (ÚJ):** A korábbi egy napos szűrő helyett bekerült egy tól-ig (Kezdő és Záró dátum) szűrő az Előzmények modalba, így időszakra is lehet keresni.
- **Elszámolások fül javítása (ÚJ):** Kijavítottunk egy HTML szerkezeti hibát (hiányzó lezáró `</div>`), ami miatt az Elszámolások fül korábban eltűnt és üres volt. Most már helyesen listázza a korábban lementett szállítási körök pénzügyi összesítőit (Várható utánvét) és elérhető a 2 oldalas "Összesítő és Korrekció" nyomtatható PDF gomb.

## Jelenlegi Technikai Stack
- **Frontend:** HTML, Vanilla CSS, Vanilla JavaScript (`app.js`)
- **Külső könyvtárak:** PapaParse (CSV beolvasás), Sortable.js (drag and drop)
- **Adattárolás:** Böngésző LocalStorage (Előzmények és korábbi körök mentése a `HistoryManager` segítségével).

## Következő Lépések (TODO)
*(Ide írhatjuk fel a jövőbeli terveket, amiket majd meg kell valósítanunk)*
