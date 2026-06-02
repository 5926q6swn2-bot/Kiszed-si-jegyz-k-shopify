# Kiszedési Jegyzék - Architektúra és Fejlesztési Szabályok

## 1. Alapelv: Moduláris Felépítés
A jövőbeli fejlesztések során a monolitikus `app.js` fájlt (amely jelenleg több ezer soros és stabilan működik) **NEM módosítjuk tömegesen**, és **NEM adunk hozzá új funkciókat**. 

## 2. Új funkciók hozzáadása
Minden új funkciót, nézetet vagy szolgáltatást egy **teljesen új, különálló fájlban** kell létrehozni. 
- A felületi logikákat (nézeteket) a `js/views/` mappába.
- Az adatbázis és külső szolgáltatás logikákat a `js/services/` mappába.
- A segédfüggvényeket a `js/utils/` mappába.

## 3. Integráció az app.js-be
Az új fájlokban megírt logikát ES Modules szabvány szerint exportálni kell (`export function...`), majd az `app.js` legtetején beimportálni (`import { ... } from './views/uj-funkcio.js';`), és csak a legszükségesebb meghívásokat elhelyezni az `app.js` inicializáló részében.

## 4. Tiltott műveletek
- Tilos az `app.js` meglévő, működő funkcióinak tömeges kivágása és áthelyezése automatizált szkriptekkel, mert az eseménykezelők (event listeners) elvesztéséhez vezethet.
- Ha egy régi funkciót mégis refaktorálni kell, azt kizárólag manuálisan, sorról sorra ellenőrizve szabad megtenni.
