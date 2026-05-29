---
name: Kiszedési Jegyzék Shopify — projekt állapot
description: Az aktuális fejlesztési állapot, elvégzett munkák és nyitott teendők
type: project
---

## Elvégzett munkák (legutóbbi session — 2026-05-16)

### Elszámolás visszavonás bugjavítás
- `revertToPending` most `deleteField()`-del törli az összes settlement-mezőt
- `btn-nullify-settlement` handler átírva `revertToPending` hívásra
- Visszavonás gomb láthatóság: `run.isSettled || isPartial || uncollected.length > 0`

### Statisztika bento box redesign
- `display: grid; grid-template-columns: 1fr 1fr; grid-auto-flow: row dense`
- `makeSection(fullWidth)` paraméter
- `makeCollapsible()` helper — top 5 látszik, lenyitható

### Térkép fejlesztések
- `scrollWheelZoom: false`
- `fitBounds([[45.7, 16.1], [48.6, 22.9]])`, 460px magasság
- Hover tooltip: helységnév + rendelésszám + order ID-k dinamikus grid layoutban (1/2/3 oszlop)

### Kiesett + Többször szállított összevonás
- "Többször szállított" szekció megszüntetve
- `orderRunsMap` cross-run tracking, `renderLaterEntries()` sub-sorok
- Sorrendezés: utólag átvett → hátulra; szürke COD összeg utólag átvett rendelésnél

### Nem-COD rendelések az elszámolásdialogban
- `showSettlementDialog` kezeli COD és nem-COD rendeléseket külön
- Order chips: nem-COD is mutatja az átadva/nem lett átadva státuszt

## Aktuális cache verzió
`app.js?v=38`

## Nyitott / következő teendők
- **Tervben (plan fájlban):** Utólag beérkezett utánvét kezelése a statisztikában (`app.js?v=20` → nem lett implementálva, plan fájl megmaradt)

**Why:** Session végén rögzítve hogy holnap folytatható legyen a fejlesztés kontextus elvesztése nélkül.
**How to apply:** Következő session elején olvasd el hogy ne kelljen újra feltérképezni az állapotot.
