---
name: Szintaktikai ellenőrzés komplex szerkesztés után
description: Több lépéses függvény-átírás után kötelező syntax check futtatása
type: feedback
---

Komplex függvény több lépéses átírásakor (különösen ha egy edit meghagyja a régi kód egy részét és egy másik edit hozzáadja az újat) **mindig futtasd le a syntax check-et** mielőtt befejezettnek jelented a munkát:

```
node --input-type=module < js/app.js 2>&1
```

**Why:** 2026-05-16: `showSettlementDialog` átírásakor az eredeti `const overlay` deklaráció bent maradt (2040. sor), majd egy másik edit újra hozzáadta (2100. sor). ES modul SyntaxError → az összes gomb leállt az egész alkalmazásban. A user csak akkor vette észre, hogy "egy gomb sem működik". A syntax error nem látványos — csendesen töri az összes JS-t.

**How to apply:** Minden olyan session után ahol több lépésben (több Edit hívással) egy nagyobb függvényt írtál át, futtasd le a node syntax check-et. Ha hibát jelez: keresd meg a duplikált deklarációkat, hiányzó zárójelpárokat.
