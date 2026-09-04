// js/services/selaWeightService.js
// Szállítói (Sela) Termékenkénti és Táblánkénti Súlykezelő Szolgáltatás
// Megőrzi a pontos méreteket (pl. 244x122 vs 280x122), kezeli a felhős (Firebase)
// és lokális (localStorage) perzisztenciát, valamint azonosítja az ismeretlen súlyú tételeket.

let dbInstance = null;
let docFn = null;
let getDocFn = null;
let setDocFn = null;

async function getFirebaseDb() {
    if (dbInstance) return { db: dbInstance, doc: docFn, getDoc: getDocFn, setDoc: setDocFn };
    if (typeof window !== 'undefined') {
        try {
            const fb = await import('../firebase-config.js');
            dbInstance = fb.db;
            docFn = fb.doc;
            getDocFn = fb.getDoc;
            setDocFn = fb.setDoc;
            return { db: dbInstance, doc: docFn, getDoc: getDocFn, setDoc: setDocFn };
        } catch (e) {
            console.warn('[SelaWeightService] Firebase import failed, using local storage:', e);
        }
    }
    return { db: null, doc: null, getDoc: null, setDoc: null };
}

let selaWeightsCache = null;

/**
 * Megtisztítja a termék nevét a zárójeles dátumoktól és logisztikai feliratoktól,
 * DE szigorúan MEGŐRZI A MÉRETEKET (pl. 244x122, 280x122, 278x60cm, 5kg),
 * mivel az eltérő méretű tábláknak teljesen más a darabsúlyuk!
 */
export function cleanItemNameForSelaWeight(name) {
    if (!name || typeof name !== 'string') return '';
    let cleaned = name.trim();

    // 1. Zárójeles beérkezések, logisztikai megjegyzések és dátumok eltávolítása (MÉRETEK MARADNAK!)
    // pl. (Beérkezés: 08.27), [Érkezés: 09.01], Preorder 09.01
    cleaned = cleaned.replace(/[\(\[\{][^\)\]\}]*(?:beérkezés|érkezés|erkezes|beerkezes|preorder|előrendelés|elorendeles|kiszállítás|átvehető)[^\)\]\}]*[\)\]\}]/gi, '');
    cleaned = cleaned.replace(/(?:várható\s+)?(?:beérkezés|érkezés|erkezes|beerkezes|preorder|előrendelés|elorendeles|kiszállítás|átvehető)\s*[:\s\-]*\d{1,4}[.\-\/]\d{1,2}(?:[.\-\/]\d{1,4})?(?:\s*-[tT]ől)?/gi, '');
    cleaned = cleaned.replace(/(?:várható\s+)?(?:beérkezés|érkezés|erkezes|beerkezes|preorder|előrendelés|elorendeles)\s*[:\s\-]*/gi, '');
    cleaned = cleaned.replace(/\b(?:0[1-9]|1[0-2])[.\/](?:0[1-9]|[12]\d|3[01])(?:\b|[.\/]\d{2,4}\b)(?!\s*(?:cm|mm|m\b|kg|g\b|l\b|liter|fm))/gi, '');

    // 2. Felesleges dupla szóközök és perem-írásjelek eltávolítása
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/^[\-:,.\s]+|[\-:,.\s]+$/g, '').trim();

    return cleaned;
}

/**
 * Egyedi, stabil keresőkulcsot generál a termékhez.
 * Kisbetűsített, normalizált, a méreteket és variánsokat megőrző kulcs.
 */
export function getItemWeightKey(item) {
    if (!item) return '';
    let rawName = item.name || item.title || '';
    const variantTitle = (item.variantTitle || item.variant_title || '').trim();
    if (variantTitle && variantTitle.toLowerCase() !== 'default title' && !rawName.toLowerCase().includes(variantTitle.toLowerCase())) {
        rawName = `${rawName} ${variantTitle}`;
    }
    const cleaned = cleanItemNameForSelaWeight(rawName);
    if (cleaned) {
        return cleaned.toLowerCase();
    }
    if (item.sku) {
        return String(item.sku).trim().toLowerCase();
    }
    return '';
}

/**
 * Termékkategória becslése a felületi jelvényhez és a javasolt súlyhoz
 */
export function detectItemCategory(name) {
    if (!name) return 'other';
    const lower = name.toLowerCase();

    if (lower.includes('tapadóhíd') || lower.includes('tapadohid')) {
        return 'tapadohid';
    }
    if (lower.includes('ragasztó') || lower.includes('ragaszto') || lower.includes('t-rex') || lower.includes('trex') || lower.includes('hpr') || lower.includes('szilikon')) {
        return 'adhesive';
    }
    if (lower.includes('profil') || lower.includes('szegély') || lower.includes('szegely') || lower.includes('élvédő') || lower.includes('elvedo') || lower.includes('skirting') || lower.includes('sarok')) {
        return 'profile';
    }
    if (lower.includes('akusztik') || lower.includes('akupanel') || lower.includes('aku')) {
        return 'acoustic';
    }
    if (lower.includes('pvc') || lower.includes('spc') || lower.includes('falpanel') || lower.includes('padló') || lower.includes('padlo') || /^pb/i.test(name) || /^tr/i.test(name) || /^lj/i.test(name)) {
        return 'pvc_spc_floor';
    }
    return 'other';
}

/**
 * Javasolt alapértelmezett súly (kg/db) kalkulációja a termék neve és mérete alapján
 */
export function suggestWeightForItem(item) {
    let rawName = (item && (item.name || item.title)) ? (item.name || item.title) : '';
    const variantTitle = (item && (item.variantTitle || item.variant_title)) ? (item.variantTitle || item.variant_title).trim() : '';
    if (variantTitle && variantTitle.toLowerCase() !== 'default title' && !rawName.toLowerCase().includes(variantTitle.toLowerCase())) {
        rawName = `${rawName} ${variantTitle}`;
    }
    const lower = rawName.toLowerCase();
    const cat = detectItemCategory(rawName);

    if (cat === 'tapadohid') {
        if (lower.includes('5kg') || lower.includes('5 kg') || lower.includes('5 liter') || lower.includes('5l') || lower.includes('5 l')) return 5.0;
        if (lower.includes('1kg') || lower.includes('1 kg') || lower.includes('1 liter') || lower.includes('1l') || lower.includes('1 l')) return 1.0;
        return 1.0;
    }

    if (cat === 'adhesive') {
        return 0.5;
    }

    if (cat === 'profile') {
        return 0.5;
    }

    if (cat === 'acoustic') {
        if (lower.includes('wide')) return 9.0;
        return 7.0;
    }

    if (cat === 'pvc_spc_floor') {
        // Méret szerinti finomhangolás
        if (lower.includes('244') || lower.includes('244x122') || lower.includes('2440')) return 16.0;
        if (lower.includes('280') || lower.includes('280x122') || lower.includes('2800')) return 18.5;
        if (lower.includes('spc') && (lower.includes('padló') || lower.includes('padlo'))) return 18.0;
        return 18.0;
    }

    return 1.0;
}

export const SelaWeightService = {
    cleanItemNameForSelaWeight,
    getItemWeightKey,
    detectItemCategory,
    suggestWeightForItem,

    /**
     * Inicializálja a terméksúlyokat a felhőből (Firestore) és a localStorage-ból.
     */
    async initializeProductWeights() {
        try {
            let weights = {};
            if (typeof localStorage !== 'undefined') {
                const local = localStorage.getItem('sela_product_weights');
                if (local) {
                    try {
                        weights = JSON.parse(local) || {};
                    } catch (e) {
                        console.warn('[SelaWeightService] local storage parse error:', e);
                    }
                }
            }

            selaWeightsCache = weights;

            const fb = await getFirebaseDb();
            if (fb.db && fb.doc && fb.getDoc) {
                try {
                    const docRef = fb.doc(fb.db, 'sela_settings', 'product_weights');
                    // 1500 ms időtúllépés, hogy hálózati / RPC újracsatlakozási hiba esetén se akadjon meg a felület
                    const fetchWithTimeout = Promise.race([
                        fb.getDoc(docRef),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 1500))
                    ]);
                    const snap = await fetchWithTimeout;
                    if (snap && snap.exists && snap.exists()) {
                        const cloudWeights = snap.data().weights || {};
                        weights = { ...weights, ...cloudWeights };
                    }
                } catch (cloudErr) {
                    console.warn('[SelaWeightService] Cloud fetch failed or timed out, using local cache:', cloudErr?.message || cloudErr);
                }
            }

            selaWeightsCache = weights;
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('sela_product_weights', JSON.stringify(weights));
            }
            return selaWeightsCache;
        } catch (err) {
            console.error('[SelaWeightService] initializeProductWeights error:', err);
            selaWeightsCache = selaWeightsCache || {};
            return selaWeightsCache;
        }
    },

    /**
     * Visszaadja a jelenlegi terméksúly gyorsítótárat (szinkron hívás).
     */
    getProductWeights() {
        if (selaWeightsCache !== null) {
            return selaWeightsCache;
        }
        if (typeof localStorage !== 'undefined') {
            const local = localStorage.getItem('sela_product_weights');
            if (local) {
                try {
                    selaWeightsCache = JSON.parse(local) || {};
                    return selaWeightsCache;
                } catch (e) {}
            }
        }
        selaWeightsCache = {};
        return selaWeightsCache;
    },

    /**
     * Visszaadja egy konkrét termék darabsúlyát.
     * @returns {{ weight: number, isKnown: boolean, key: string, name: string }}
     */
    getItemWeight(item, customWeights = null) {
        const weights = customWeights || this.getProductWeights();
        const key = getItemWeightKey(item);
        const entry = key ? weights[key] : null;

        let displayName = (typeof entry === 'object' && entry.name) ? entry.name : cleanItemNameForSelaWeight(item.name || item.title || '');
        const variantTitle = (item.variantTitle || item.variant_title || '').trim();
        if (variantTitle && variantTitle.toLowerCase() !== 'default title' && !displayName.toLowerCase().includes(variantTitle.toLowerCase())) {
            displayName = `${displayName} - ${variantTitle}`;
        }

        if (entry !== undefined && entry !== null) {
            const numWeight = typeof entry === 'object' ? parseFloat(entry.weight) : parseFloat(entry);
            if (!isNaN(numWeight) && numWeight >= 0) {
                return {
                    weight: Math.round(numWeight * 10) / 10,
                    isKnown: true,
                    key,
                    name: displayName
                };
            }
        }

        // Ismeretlen súly: javaslatot adunk vissza a pontos méret/kiszerelés alapján
        const suggested = suggestWeightForItem({ ...item, name: displayName });
        return {
            weight: suggested,
            isKnown: false,
            key,
            name: displayName
        };
    },

    /**
     * Átvizsgálja a megadott rendelések összes tételét (beleértve a felbontott profil al-tételeket is),
     * és összegyűjti azokat a cikkeket, amelyeknek még NINCS elmentett súlya.
     * @param {Array} orders - Kijelölt rendelések listája
     * @returns {Array} unknownItems - Ismeretlen termékek deduplikált listája
     */
    findUnknownItemsInOrders(orders, customWeights = null) {
        if (!Array.isArray(orders) || orders.length === 0) return [];
        const weights = customWeights || this.getProductWeights();
        const unknownMap = new Map();

        orders.forEach(order => {
            (order.items || []).forEach(item => {
                const qty = parseInt(item.qty, 10) || 0;
                if (qty <= 0) return;

                // Összekészített profilok felbontása al-tételekre
                if (item.isCollapsedProfile && Array.isArray(item.subItems) && item.subItems.length > 0) {
                    item.subItems.forEach(sub => {
                        const subQty = parseInt(sub.qty, 10) || 0;
                        if (subQty <= 0) return;
                        this._checkAndAddUnknown(sub, subQty, weights, unknownMap);
                    });
                    return;
                }

                this._checkAndAddUnknown(item, qty, weights, unknownMap);
            });
        });

        return Array.from(unknownMap.values());
    },

    _checkAndAddUnknown(item, qty, weights, unknownMap) {
        const key = getItemWeightKey(item);
        if (!key) return;

        const entry = weights[key];
        const isKnown = entry !== undefined && entry !== null && 
            !isNaN(typeof entry === 'object' ? parseFloat(entry.weight) : parseFloat(entry));

        if (!isKnown) {
            if (unknownMap.has(key)) {
                const existing = unknownMap.get(key);
                existing.totalQty += qty;
            } else {
                let displayName = cleanItemNameForSelaWeight(item.name || item.title || '');
                const variantTitle = (item.variantTitle || item.variant_title || '').trim();
                if (variantTitle && variantTitle.toLowerCase() !== 'default title' && !displayName.toLowerCase().includes(variantTitle.toLowerCase())) {
                    displayName = `${displayName} - ${variantTitle}`;
                }

                unknownMap.set(key, {
                    key: key,
                    name: displayName || item.name || 'Névtelen tétel',
                    sku: item.sku || '',
                    variantTitle: variantTitle,
                    category: detectItemCategory(displayName || item.name),
                    suggestedWeight: suggestWeightForItem({ ...item, name: displayName }),
                    totalQty: qty
                });
            }
        }
    },

    /**
     * Elmenti az új vagy módosított terméksúlyokat (mind Firebase Firestore-ba, mind localStorage-ba).
     * @param {Object} newEntries - { [key]: { name, weight, sku, category } } vagy { [key]: number }
     */
    async saveProductWeights(newEntries) {
        if (!newEntries || typeof newEntries !== 'object') return;
        const current = this.getProductWeights();

        for (const [k, val] of Object.entries(newEntries)) {
            if (!k) continue;
            let weightNum = 0;
            let name = k;
            let sku = '';
            let category = 'other';

            if (typeof val === 'object' && val !== null) {
                weightNum = parseFloat(val.weight) >= 0 ? parseFloat(val.weight) : 0;
                name = val.name || name;
                sku = val.sku || '';
                category = val.category || detectItemCategory(name);
            } else {
                weightNum = parseFloat(val) >= 0 ? parseFloat(val) : 0;
                category = detectItemCategory(name);
            }

            current[k] = {
                name: name,
                weight: Math.round(weightNum * 10) / 10,
                sku: sku,
                category: category,
                updatedAt: new Date().toISOString()
            };
        }

        selaWeightsCache = current;

        // 1. Mentés localStorage-ba
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('sela_product_weights', JSON.stringify(current));
            } catch (e) {
                console.warn('[SelaWeightService] LocalStorage save error:', e);
            }
        }

        // 2. Mentés Firestore-ba (időtúllépéssel, hogy ne blokkolja a felületet hálózati akadozás esetén)
        const fb = await getFirebaseDb();
        if (fb.db && fb.doc && fb.setDoc) {
            try {
                const docRef = fb.doc(fb.db, 'sela_settings', 'product_weights');
                const saveWithTimeout = Promise.race([
                    fb.setDoc(docRef, { weights: current }, { merge: true }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2500))
                ]);
                await saveWithTimeout;
                console.log('[SelaWeightService] Sikeres mentés a felhőbe (Firestore).');
            } catch (cloudErr) {
                console.warn('[SelaWeightService] Felhő mentési figyelmeztetés (időtúllépés/offline):', cloudErr?.message || cloudErr);
            }
        }

        return current;
    },

    /**
     * Egy rendelés összsúlyának kiszámítása a benne lévő tételek terméksúlyai alapján.
     * Visszaadja a kerekített összsúlyt és a tételekre bontott részletezést (tooltiphez).
     * @param {Object} order - Rendelés objektum
     * @param {Object|null} customWeights - Opcionális felülbíráló súlytérkép
     * @returns {{ totalWeight: number, breakdown: Array, breakdownText: string }}
     */
    calculateOrderWeight(order, customWeights = null) {
        if (!order || !Array.isArray(order.items)) {
            return { totalWeight: 0, breakdown: [], breakdownText: '0 kg' };
        }

        const weights = customWeights || this.getProductWeights();
        let total = 0;
        const breakdown = [];

        order.items.forEach(item => {
            const qty = parseInt(item.qty, 10) || 0;
            if (qty <= 0) return;

            // Összekészített profilok
            if (item.isCollapsedProfile && Array.isArray(item.subItems) && item.subItems.length > 0) {
                item.subItems.forEach(sub => {
                    const subQty = parseInt(sub.qty, 10) || 0;
                    if (subQty <= 0) return;
                    const res = this.getItemWeight(sub, weights);
                    const itemWeightTotal = subQty * res.weight;
                    total += itemWeightTotal;
                    breakdown.push({
                        name: res.name || sub.name,
                        qty: subQty,
                        unitWeight: res.weight,
                        totalItemWeight: Math.round(itemWeightTotal * 10) / 10
                    });
                });
                return;
            }

            const res = this.getItemWeight(item, weights);
            const itemWeightTotal = qty * res.weight;
            total += itemWeightTotal;
            breakdown.push({
                name: res.name || item.name,
                qty: qty,
                unitWeight: res.weight,
                totalItemWeight: Math.round(itemWeightTotal * 10) / 10
            });
        });

        const roundedTotal = Math.round(total * 10) / 10;
        const breakdownParts = breakdown.map(b => `${b.name} (${b.qty}db × ${b.unitWeight}kg = ${b.totalItemWeight}kg)`);
        const breakdownText = breakdownParts.length > 0 
            ? `${breakdownParts.join(' + ')} | Összesen: ${roundedTotal} kg` 
            : `${roundedTotal} kg`;

        return {
            totalWeight: roundedTotal,
            breakdown,
            breakdownText
        };
    }
};
