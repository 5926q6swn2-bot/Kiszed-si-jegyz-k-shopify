# Kiszedési Jegyzék Shopify - Architektúra Útmutató

> [!IMPORTANT]
> **Kötelező Olvasmány Fejlesztés Előtt!**
> Ez a projekt egy szigorúan moduláris architektúrát követ a tiszta és fenntartható kód érdekében. Tilos funkciókat a fő `app.js` fájlba "beégetni" (monolitikus fejlesztés).

## Core Architektúra Alapelvek

A rendszer négy fő rétegre oszlik, amelyeket a jövőbeli fejlesztéseknél automatikusan alkalmazni kell:

### 1. Állapotkezelés (State Layer) - `js/store/state.js`
- **Szerepe:** Az alkalmazás egyetlen "igazságforrása" (Single Source of Truth). Minden globális változót, tömböt, állapotot itt kell tárolni.
- **Szabály:** Nem lehetnek globális `let` vagy `var` deklarációk az `app.js`-ben vagy más modulokban. Mindenki a `Store.getState()` és a megfelelő setter metódusokon keresztül férhet hozzá az adatokhoz.

### 2. Szolgáltatások (Service Layer) - `js/services/`
- **Szerepe:** Független, állapot nélküli (stateless) logikai blokkok, amelyek bemenetet kapnak és kimenetet adnak.
- **Példák:** `shopify.js` (CSV átalakítása JS objektumokká), `printer.js` (HTML string generálása nyomtatáshoz), `history.js` (Firebase adatbázis hívások).
- **Szabály:** Nem manipulálhatják közvetlenül a DOM-ot (nem hivatkozhatnak `document.getElementById`-re), és nem módosíthatják a `Store`-t közvetlenül.

### 3. Nézetek (View Layer) - `js/views/`
- **Szerepe:** Az adatok (State) vizuális megjelenítése a képernyőn (HTML generálás, DOM manipuláció).
- **Példák:** `ordersView.js` (Rendeléskártyák legenerálása és beszúrása az `#order-list` elembe).
- **Szabály:** A View csak "rajzol". Nem hoz üzleti döntéseket, nem formáz adatokat (erre a Services való).

### 4. Irányító (Controller Layer) - `js/app.js`
- **Szerepe:** A fő belépési pont. Ő fogja össze a fenti három réteget.
- **Szabály:** Kizárólag eseménykezelőket (`addEventListener`) tartalmaz, és delegálja a feladatokat.
- **Példa:** Megnyomják a "Feltöltés" gombot -> `app.js` beküldi a fájlt a `ShopifyParser`-be (Service) -> a kapott adatokat odaadja a `Store`-nak (State) -> végül meghívja a `renderOrders()` függvényt (View).

## Hogyan implementálj egy új funkciót?

1. Kérdezd meg magadtól: Milyen **adatok** kellenek ehhez? (Készítsd el a state-et a `store/state.js`-ben).
2. Kérdezd meg magadtól: Mi a **logika**? (Készíts egy tiszta funkciót a `services/` alá).
3. Kérdezd meg magadtól: Hogyan **néz ki**? (Készíts egy rajzoló funkciót a `views/` alá).
4. **Köss össze** mindent az `app.js` egyetlen eseménykezelőjében!
