# KiszedĂ©si JegyzĂ©k Shopify - DokumentĂˇciĂł Ă©s FejlesztĂ©si NaplĂł

Ez a dokumentum a projekt teljes leĂ­rĂˇsĂˇt, hasznĂˇlati ĂştmutatĂłjĂˇt Ă©s a fejlesztĂ©sek tĂ¶rtĂ©netĂ©t tartalmazza. 
**CĂ©lja:** Ha Ăşj gĂ©pen vagy Ăşj fejlesztĹ‘vel (pl. egy Ăşj Antigravity munkamenetben) nyitod meg a projektet, ebbĹ‘l a fĂˇjlbĂłl azonnal vilĂˇgos legyen a teljes kontextus Ă©s a munkafolyamat.

---

## đźš€ Hogyan folytassuk a munkĂˇt egy Ăşj gĂ©pen?
Amikor leklĂłnoztad a GitHub-rĂłl a projektet egy Ăşj gĂ©pre, Ă©s elindĂ­tod az Antigravity-t:
1. Az elsĹ‘ ĂĽzeneted ez legyen az AI-nak: *"Szia! KĂ©rlek, olvasd el a `fejlesztesi_naplo.md` fĂˇjlt, Ă©s folytassuk a munkĂˇt a TODO lista alapjĂˇn!"*
2. A munka vĂ©geztĂ©vel mindig kĂ©rd meg az AI-t, hogy frissĂ­tse ezt a naplĂłt az Ăşj eredmĂ©nyekkel.
3. VĂ©gĂĽl mentsd el a szokĂˇsos Git parancsokkal (`git add .`, `git commit -m "..."`, `git push`).

---

## đź“¦ A Projekt CĂ©lja Ă©s MĹ±kĂ¶dĂ©se
Egy bĂ¶ngĂ©szĹ‘bĹ‘l futtathatĂł, helyi (Local Storage) adattĂˇrolĂˇst hasznĂˇlĂł raktĂˇri szedĹ‘lista Ă©s elszĂˇmolĂł rendszer Shopify webĂˇruhĂˇzakhoz.
- **KezdĂ©s:** A Shopify-bĂłl exportĂˇlt megrendelĂ©sek CSV fĂˇjljĂˇnak beolvasĂˇsa.
- **FeldolgozĂˇs:** A rendszer automatikusan formĂˇzza a termĂ©keket, kiszĹ±ri a duplikĂˇlt rendelĂ©seket, Ă©s vizuĂˇlis jelzĂ©seket ad a problĂ©mĂˇs rendelĂ©sekrĹ‘l (pl. hiĂˇnyzĂł utalĂˇs, lappangĂł utĂˇnvĂ©t).
- **Kimenet:** NyomtathatĂł, vonalkĂłdos SzedĂ©si JegyzĂ©k Ă©s kĂ©toldalas "Ă–sszesĂ­tĹ‘ Ă©s KorrekciĂłs lap" a futĂˇroknak a pĂ©nzĂĽgyi elszĂˇmolĂˇshoz.

### HasznĂˇlati ĂštmutatĂł (FelhasznĂˇlĂłknak)
1. Nyisd meg az `index.html` fĂˇjlt a bĂ¶ngĂ©szĹ‘dben (vagy futtass egy helyi szervert a mappĂˇban).
2. TĂ¶ltsd fel a Shopify-bĂłl lementett napi CSV fĂˇjlt.
3. EllenĹ‘rizd a listĂˇt, szĂĽksĂ©g esetĂ©n adj hozzĂˇ rendelĂ©seket kĂ©zzel.
4. Nyomtasd ki a listĂˇt. A nyomtatĂˇs elindĂ­tĂˇsakor a rendszer elmenti az adott "SzĂˇllĂ­tĂˇsi KĂ¶rt".
5. Az "ElĹ‘zmĂ©nyek" gombra kattintva bĂˇrmikor visszakeresheted, Ăşjranyomtathatod a korĂˇbbi kĂ¶rĂ¶ket, Ă©s az "ElszĂˇmolĂˇsok" fĂĽlĂ¶n kinyomtathatod a futĂˇrok pĂ©nzĂĽgyi elszĂˇmolĂł lapjĂˇt.

---

## đź›  AktuĂˇlis Technikai Stack
- **Frontend**: Vanilla HTML5, CSS3 (Modern, Apple/Glassmorphism design)
- **Logika**: Vanilla JavaScript (ES Modules, `app.js`)
- **AdatbĂˇzis & Backend**: Google Firebase (Cloud Firestore)
- **AutentikĂˇciĂł**: Firebase Authentication (E-mail/JelszĂł)
- **KĂĽlsĹ‘ kĂ¶nyvtĂˇrak**: 
  - `PapaParse` (CSV importĂˇlĂˇshoz)
  - `Sortable.js` (Drag & drop funkciĂłkhoz)
  - Firebase SDK v10.8.0

## 3. Rendszer ArchitektĂşra

### Adatfolyam Ă©s FelhĹ‘ SzinkronizĂˇciĂł
Az alkalmazĂˇs korĂˇbban helyi `localStorage`-et hasznĂˇlt, de Ăˇt lett ĂˇllĂ­tva a Firebase Cloud Firestore-ra. A bejelentkezett felhasznĂˇlĂłk adatai valĂłs idĹ‘ben mentĹ‘dnek a felhĹ‘be. 
A bejelentkezĂ©st az `index.html` tetejĂ©re helyezett overlay rĂ©teg (Login Screen) vĂ©gzi, a Firebase funkciĂłk inicializĂˇlĂˇsa a `js/firebase-config.js` fĂˇjlban tĂ¶rtĂ©nik.

### A `HistoryManager` objektum
A `js/app.js`-ben lĂ©vĹ‘ `HistoryManager` felel a szĂˇllĂ­tĂˇsi kĂ¶rĂ¶k kezelĂ©sĂ©Ă©rt. Most mĂˇr aszinkron Firebase metĂłdusokat hasznĂˇl (`getDocs`, `addDoc`, `deleteDoc`, `updateDoc`). 
**Fontos szabĂˇly:** Ha Ăşj modult vagy logikĂˇt Ă­rsz, aminek hozzĂˇ kell fĂ©rnie az elĹ‘zmĂ©nyekhez, mindenhol `await` kulcsszĂłval kell meghĂ­vni ezeket a fĂĽggvĂ©nyeket.

---

## đź“ť FejlesztĂ©si NaplĂł (Changelog)

### LegutĂłbbi frissĂ­tĂ©s: 2026. mĂˇjus 6. (Rendszer javĂ­tĂˇsok Ă©s szĂ©pĂ­tĂ©sek)
- **UtĂˇnvĂ©t FelismerĂ©s JavĂ­tĂˇs:** A Shopify Notes mezĹ‘bĹ‘l az "uv" kulcsszĂł felismerĂ©se regex-re ĂˇllĂ­tva, hogy az `uv:12000`, `uv12000`, `12000 uv` formĂˇtumok mind megfelelĹ‘en feldolgozĂłdjanak. A lappangĂł utĂˇnvĂ©t ellenĹ‘rzĂ©s is robusztusabb lett.
- **Drag & Drop Sorrend SzinkronizĂˇlĂˇs:** A kĂˇrtyĂˇk drag & drop mozgatĂˇsakor a belsĹ‘ `orders[]` tĂ¶mb is frissĂĽl, Ă­gy a szĂˇllĂ­tĂłlevelek Ă©s a nyomtatĂˇs sorrendje mindig a felhasznĂˇlĂł Ăˇltal beĂˇllĂ­tott sorrendet kĂ¶veti.
- **CĂ©g Badge az ElszĂˇmolĂˇsokon:** Az elszĂˇmolĂˇs kĂˇrtyĂˇk jobb felsĹ‘ sarkĂˇban most feltĹ±nĹ‘ sĂ¶tĂ©t badge mutatja a szĂˇllĂ­tĂł cĂ©g nevĂ©t.
- **Ă–sszesĂ­tĹ‘ Nyomtatott Lapon CĂ©g NĂ©v:** Az Ă–sszesĂ­tĹ‘ (ĂtadĂˇs-ĂtvĂ©tel) nyomtatott lapon a cĂ©g neve nagy, kitĂ¶ltĂ¶tt blokkban jelenik meg.
- **NyomtatĂˇsi Sorrend:** Ăšj sorrend: 2Ă— Ă–sszesĂ­tĹ‘ lap, 1Ă— KorrekciĂłs lap, majd az Ă¶sszes szĂˇllĂ­tĂłlevĂ©l kĂ©tszer egymĂˇs utĂˇn (1-N, majd 1-N).
- **SzĂˇllĂ­tĂłlevelek DĂˇtum TĂ¶rlĂ©se:** Az egyedi szĂˇllĂ­tĂłlevelek alĂˇĂ­rĂˇs blokkjaibĂłl tĂ¶rĂ¶lve a felesleges dĂˇtumozĂˇsi sorok.
- **Profilok NyomtatĂˇsban:** Az "Ă–sszekĂ©szĂ­tett profilok" sor alatt a rĂ©szletes profillista nyomtatĂˇskor is lĂˇtszodik.

### LegutĂłbbi frissĂ­tĂ©s: 2026. mĂˇjus 5. (Firebase MigrĂˇciĂł & PublikĂˇlĂˇs)
- **Firebase Cloud Firestore:** A `localStorage` teljesen kivezetve, az adatbĂˇzis ĂˇtkĂ¶ltĂ¶zĂ¶tt a felhĹ‘be. A `HistoryManager` aszinkronnĂˇ vĂˇlt.
- **Firebase Authentication:** E-mail/jelszĂł alapĂş bejelentkezĂ©si rĂ©teg (Login Overlay) implementĂˇlĂˇsa az adatok vĂ©delme Ă©rdekĂ©ben. A Firestore adatbĂˇzis szabĂˇlyai Ă©lesĂ­tve (`request.auth != null`).
- **ES Modules:** A script betĂ¶ltĂ©sek modulĂˇris architektĂşrĂˇra Ăˇlltak Ăˇt a biztonsĂˇgos Firebase SDK importĂˇlĂˇsok miatt.
- **PublikĂˇlĂˇs (GitHub Pages):** Az alkalmazĂˇs most mĂˇr weboldalkĂ©nt is ĂĽzemel a GitHub Pages-en keresztĂĽl, amely automatikusan (CI/CD) frissĂĽl push-olĂˇs utĂˇn.

### KorĂˇbbi frissĂ­tĂ©s: 2026. mĂˇjus 5. (DĂ©lelĹ‘tt)
- **ElszĂˇmolĂˇsok fĂĽl javĂ­tĂˇsa:** A HTML szerkezetben javĂ­tva lett egy hiĂˇnyzĂł `</div>` lezĂˇrĂł elem, Ă­gy az ElszĂˇmolĂˇsok fĂĽl Ăşjra lĂˇthatĂł Ă©s megfelelĹ‘en listĂˇzza az elmentett fuvarokat a vĂˇrhatĂł utĂˇnvĂ©t Ă¶sszegĂ©vel.
- **DĂˇtumtartomĂˇny SzĹ±rĂ©s:** Az elĹ‘zmĂ©nyeknĂ©l a napi szĹ±rĹ‘ le lett cserĂ©lve egy "KezdĹ‘ dĂˇtum (tĂłl)" Ă©s "ZĂˇrĂł dĂˇtum (ig)" szĹ±rĹ‘re, amely a SzedĂ©sek Ă©s az ElszĂˇmolĂˇsok fĂĽlĂ¶n is mĹ±kĂ¶dik.
- **Git & GitHub IntegrĂˇciĂł:** A projekt verziĂłkĂ¶vetĂ©st kapott Ă©s feltĂ¶ltĂ©sre kerĂĽlt a GitHub-ra. LĂ©trejĂ¶tt a `.gitignore` fĂˇjl a felesleges fĂˇjlok szĹ±rĂ©sĂ©re.

---

## đźŽŻ KĂ¶vetkezĹ‘ LĂ©pĂ©sek (TODO)
- [ ] *Itt gyĹ±jtjĂĽk majd az Ăşj funkciĂł Ă¶tleteket Ă©s a megoldandĂł hibĂˇkat.*
- [ ] *Pl.: LehetĹ‘sĂ©g a korĂˇbbi fuvarok CSV-ben tĂ¶rtĂ©nĹ‘ exportĂˇlĂˇsĂˇra a kĂ¶nyvelĂ©snek.*

