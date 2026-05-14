---
name: Kiszedési Jegyzék Shopify — projekt állapot
description: Az aktuális fejlesztési állapot, elvégzett munkák és nyitott teendők
type: project
---

## Elvégzett munkák (ez a session)

### Elszámolások tab — teljes átírás
- COD-szűrő: csak utánvétes fuvarok jelennek meg
- Checkbox alapból `checked` → kipipált fuvar azonnal eltűnik; uncheckolva visszajönnek
- Részleges elszámolás: `settledAmount` + `uncollectedOrderIds` tárolva Firestoreban
- `HistoryManager.updateSettlementStatus(docId, settledAmount, totalCOD, uncollectedOrderIds)` — frissítve
- `HistoryManager.revertToPending(docId)` — új függvény
- 3 vizuális állapot: szürke kör (függőben), narancssárga (részleges), zöld (elszámolva)
- Részleges + elszámolt egyaránt eltűnik a "csak függőben" filterből
- `showSettlementDialog(run, runCOD)` — custom modal: COD rendelések checkboxszal, élő összesítő
- Order chips: nem beérkezett rendelések áthúzva + "nem érkezett" badge-dzsel
- `acc-run-card` class + `data-total-cod` + `data-run-id` attribútumok a kártyán

### Statisztika tab — teljes újraírás
- Régi késési statisztika "befagyasztva" (kód marad, de nem hívódik meg)
- 6 új statisztikai szekció:
  1. Szállítói összesítő (terítés/rendelés/COD/kiesett per courier)
  2. Havi forgalom (terítések + rendelések, CSS sávok)
  3. Havi utánvét volumen (beérkezett/kiesett/függőben, szegmentált sáv)
  4. Top termékek (items.name, qty-vel súlyozva, top 15)
  5. Területi sűrűség — **Leaflet.js térkép** (CartoDB Positron tiles)
  6. Többször szállított rendelések (cross-run duplicate order ID-k)
- Dátumszűrő: terítés napja alapján (nem orderDate); "Összes" gomb nullázza
- `statsLeafletMap` module-level változó (destroy + reinit dátumváltáskor)
- `geoCache` localStorage-ból töltve (`hu_zip_geocache_v1`)

### Területi sűrűség térkép részletek
- Budapest: minden 1xxx zip egybe kezelve → egyetlen pont Budapest közepén [47.4979, 19.0402]
- HU_ZIP lookup tábla: ~120 entry (Budapest 23 kerület 3-jegyű prefix + ~80 vidéki város)
- Nominatim fallback: ismeretlen zip-ek geocodingja 1.1s rate limittel, localStorage cache
- Marker stílus: tömör sötétkék pontok (#1d4ed8), fehér szegély, sqrt-skálán méretezve (4-14px)
- Alatta szöveges rangsor top 25 helyszínnel

## Aktuális cache verzió
`app.js?v=19`

## Nyitott / következő teendők
- Nincs explicit nyitott feladat — user lezárta a sessiont

**Why:** Session végén rögzítve hogy holnap folytatható legyen a fejlesztés kontextus elvesztése nélkül.
**How to apply:** Következő session elején olvasd el hogy ne kelljen újra feltérképezni az állapotot.
