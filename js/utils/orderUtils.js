// js/utils/orderUtils.js
// Rendelésekkel kapcsolatos segédfüggvények (duplikációk, vevő-összerendelés, címvalidáció)


/**
 * Megkeresi az aktív (nem teljesített és nem törölt) rendelések között azokat,
 * amelyek ugyanahhoz a vásárlóhoz tartoznak (telefonszám, email, név + cím alapján).
 * 
 * @param {Array} allOrders
 * @returns {Map<string, Array>} Map(orderId -> tömb a többi rendelés objektumával)
 */
export function buildDuplicateCustomerOrdersMap(allOrders) {
    const duplicateMap = new Map();
    if (!Array.isArray(allOrders) || allOrders.length === 0) return duplicateMap;

    // Csak a még NEM teljesített, NEM törölt és NEM viszonteladói rendeléseket vizsgáljuk
    const activeOrders = allOrders.filter(o => 
        !o.isCancelled && 
        !o.isFulfilled && 
        (o.fulfillmentStatus === 'unfulfilled' || o.fulfillmentStatus === 'partial' || !o.fulfillmentStatus) &&
        !isResellerOrder(o)
    );

    if (activeOrders.length < 2) return duplicateMap;

    const normalizePhone = (phoneStr) => {
        if (!phoneStr) return '';
        const digits = String(phoneStr).replace(/\D/g, '');
        if (digits.length >= 8) {
            return digits.slice(-8);
        }
        return '';
    };

    const normalizeEmail = (emailStr) => {
        if (!emailStr) return '';
        return String(emailStr).trim().toLowerCase();
    };

    const normalizeName = (nameStr) => {
        if (!nameStr) return '';
        return String(nameStr)
            .toLowerCase()
            .replace(/\(.*?\)/g, '')
            .replace(/[^a-záéíóöőúüű\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const normalizeCity = (cityStr) => {
        if (!cityStr) return '';
        return String(cityStr).toLowerCase().replace(/[^a-záéíóöőúüű]/g, '').trim();
    };

    const normalizeStreet = (streetStr) => {
        if (!streetStr) return '';
        return String(streetStr)
            .toLowerCase()
            .replace(/\(.*?\)/g, '')
            .replace(/[^a-záéíóöőúüű0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    for (let i = 0; i < activeOrders.length; i++) {
        const a = activeOrders[i];
        const phoneA = normalizePhone(a.shippingPhone || a.billingPhone);
        const emailA = normalizeEmail(a.customerEmail || a.email);
        const nameA = normalizeName(a.shippingName);
        const cityA = normalizeCity(a.city);
        const zipA = String(a.zip || '').trim();
        const streetA = normalizeStreet(a.address1 || a.address);

        for (let j = i + 1; j < activeOrders.length; j++) {
            const b = activeOrders[j];
            const phoneB = normalizePhone(b.shippingPhone || b.billingPhone);
            const emailB = normalizeEmail(b.customerEmail || b.email);
            const nameB = normalizeName(b.shippingName);
            const cityB = normalizeCity(b.city);
            const zipB = String(b.zip || '').trim();
            const streetB = normalizeStreet(b.address1 || b.address);

            let isSameCustomer = false;

            // 1. Megegyező telefonszám (utolsó 8 számjegy)
            if (phoneA && phoneB && phoneA === phoneB) {
                isSameCustomer = true;
            }
            // 2. Megegyező e-mail cím
            else if (emailA && emailB && emailA === emailB) {
                isSameCustomer = true;
            }
            // 3. Megegyező név ÉS megegyező cím (utca, vagy város, vagy irányítószám)
            else if (nameA && nameB && nameA === nameB && nameA.length >= 4) {
                if (streetA && streetB && streetA === streetB) {
                    isSameCustomer = true;
                } else if ((cityA && cityB && cityA === cityB) || (zipA && zipB && zipA === zipB)) {
                    isSameCustomer = true;
                }
            }
            // 4. Megegyező pontos utca + város
            else if (cityA && cityB && cityA === cityB && streetA && streetB && streetA === streetB && streetA.length >= 6) {
                isSameCustomer = true;
            }

            if (isSameCustomer) {
                if (!duplicateMap.has(a.id)) duplicateMap.set(a.id, []);
                if (!duplicateMap.has(b.id)) duplicateMap.set(b.id, []);

                const listA = duplicateMap.get(a.id);
                if (!listA.some(o => o.id === b.id)) {
                    listA.push(b);
                }

                const listB = duplicateMap.get(b.id);
                if (!listB.some(o => o.id === a.id)) {
                    listB.push(a);
                }
            }
        }
    }

    return duplicateMap;
}

/**
 * Ellenőrzi, hogy egy adott tétel PVC falpanel, SPC falpanel vagy padlózat-e.
 * Akusztikus falpanelek kizárva (azok mehetnek PannonXP-vel).
 * 
 * @param {Object} item - line item (name/title, sku)
 * @returns {boolean}
 */
export function isPvcSpcOrFloorItem(item) {
    if (!item) return false;
    const name = String(item.name || item.title || '').trim();
    const sku = String(item.sku || '').trim();
    const text = `${name} ${sku}`.toLowerCase();

    // 0. Explicit kizárások (mamut és fix all nem ragasztó, de nem is falpanel/padló)
    if (text.includes('mamut') || text.includes('fix all')) {
        return false;
    }

    // 1. Akusztikus falpanelek (aku, akusztikus, wide akusztikus, wide acoustic, akupanel) -> NEM PVC/SPC/padló!
    if (text.includes('akusztik') || text.includes('akusztikus') || 
        text.includes('wide akusztikus') || text.includes('wide acoustic') || 
        text.includes('akupanel') || /\baku\b/i.test(text)) {
        return false;
    }

    // 2. PVC / SPC falpanelek és padlózatok
    const hasPvcSpcFloor = /\b(pb-tr|tr|lj|pb|spc|pvc)\b/i.test(text) ||
                           text.includes('pb-tr') ||
                           text.includes('spc') ||
                           text.includes('pvc') ||
                           text.includes('padló') ||
                           text.includes('padlo') ||
                           text.includes('padlózat') ||
                           text.includes('padlozat') ||
                           text.includes('falpanel') ||
                           text.includes('falburkolat') ||
                           /\btr-\d+/i.test(text) ||
                           /\blj-\d+/i.test(text) ||
                           /\bpb-\d+/i.test(text);

    return hasPvcSpcFloor;
}

/**
 * Ellenőrzi, hogy egy rendelés személyes / bolti / raktári átvétel-e.
 * 
 * @param {Object} order
 * @returns {boolean}
 */
export function isPickupOrder(order) {
    if (!order) return false;
    if (order.isPickup === true || order.isReadyForPickup === true || order.is_ready_for_pickup === true) {
        return true;
    }

    const tagsLower = String(order.tags || '').toLowerCase();
    if (tagsLower.includes('személyes') || 
        tagsLower.includes('szemelyes') || 
        tagsLower.includes('pickup') || 
        tagsLower.includes('raktári átvétel') || 
        tagsLower.includes('raktari atvetel') || 
        tagsLower.includes('boltban átvétel') ||
        tagsLower.includes('boltban atvetel') ||
        tagsLower.includes('ready for pickup') ||
        tagsLower.includes('ready_for_pickup') ||
        tagsLower.includes('átvehető') ||
        tagsLower.includes('atveheto') ||
        tagsLower.includes('átvétel') ||
        tagsLower.includes('atvetel')) {
        return true;
    }

    const shippingLines = order.shipping_lines || [];
    const shippingLinesStr = (Array.isArray(shippingLines) 
        ? shippingLines.map(sl => `${sl.title || ''} ${sl.code || ''}`).join(' ') 
        : String(order.shippingMethod || '')).toLowerCase();

    if (/üzlet|bolt|pickup|raktár|raktar|személyes|szemelyes|helyszíni|helyszini|store pickup|atvetel|átvétel|bemutatóterem|bemutatoterem/i.test(shippingLinesStr)) {
        return true;
    }

    return false;
}

/**
 * Ellenőrzi, hogy egy tétel padlózat-e (pl. SPC padló, laminált padló).
 * Akusztikus panelek, ragasztók és falpanelek kizárva.
 * 
 * @param {Object} item
 * @returns {boolean}
 */
export function isFloorItem(item) {
    if (!item) return false;
    const name = String(item.name || item.title || '').trim();
    const sku = String(item.sku || '').trim();
    const text = `${name} ${sku}`.toLowerCase();

    // 0. Explicit kizárások (falpanelek, akusztikus panelek, ragasztók)
    if (text.includes('falpanel') || text.includes('falburkolat')) return false;
    if (text.includes('mamut') || text.includes('fix all')) return false;
    if (text.includes('akusztik') || text.includes('akupanel') || /\baku\b/i.test(text)) return false;

    // Padlózat felismerés (szavak: padló, padlo, padlózat, padlozat, laminált, parketta, SPC, LVT, vinyl)
    const isFloor = /padl[óo]zat|padl[óo]|lamin[áa]lt|parketta|\bspc\b|\blvt\b|\bvinyl\b/i.test(text);

    return Boolean(isFloor);
}

/**
 * Ellenőrzi, hogy egy tétel nagyméretű PVC vagy SPC falpanel-e (PB, TR, LJ, falburkolat stb.).
 * Akusztikus panelek és padlók kizárva!
 * 
 * @param {Object} item
 * @returns {boolean}
 */
export function isWallPanelItem(item) {
    if (!item) return false;
    if (isFloorItem(item)) return false;
    return isPvcSpcOrFloorItem(item);
}

/**
 * Ellenőrzi, hogy egy nyitott rendelés automatikusan jogosult-e a PannonXP címkére.
 * Feltételek:
 * 1. Nem törölt és nem teljesített (unfulfilled / partial).
 * 2. Nem személyes átvétel.
 * 3. Még nincs rajta sem PannonXP/PXP, sem Sela megr., sem terítésben tag.
 * 4. Van benne tétel.
 * 5. EGYETLEN tétele sem nagyméretű PVC/SPC falpanel (PB, TR, LJ, falburkolat).
 * 6. Padlózatból legfeljebb 2 darab (<= 2 db) van a rendelésben (szabály: max 2 padlózat még kiküldhető PannonXP-vel).
 * 
 * @param {Object} order
 * @returns {boolean}
 */
export function isEligibleForAutoPannonXp(order) {
    if (!order) return false;
    if (order.isCancelled === true || order.cancelled_at) return false;

    const fStatus = String(order.fulfillmentStatus || order.fulfillment_status || '').toLowerCase();
    if (fStatus === 'fulfilled') return false;

    // Viszonteladói rendelések kizárása (csak lakossági rendelések kaphatnak automatikus PannonXP címkét)
    if (isResellerOrder(order)) return false;

    const tagsLower = String(order.tags || '').toLowerCase();
    const tagsList = tagsLower.split(',').map(t => t.trim()).filter(Boolean);

    // Ha már rajta van a PannonXP tag, nem kell újra
    if (tagsList.some(t => t === 'pannonxp' || t === 'pxp')) return false;

    // Ha már Selának elküldve vagy saját terítésben
    if (tagsList.some(t => t === 'sela megr.' || t === 'sela megr' || t === 'terítésben' || t === 'teritesben')) return false;

    // Személyes átvétel kizárása
    if (isPickupOrder(order)) return false;

    // Tételek vizsgálata
    const items = order.line_items || order.items || [];
    if (items.length === 0) return false;

    // Ha bármelyik tétel nagyméretű PVC/SPC falpanel -> SZIGORÚAN KIZÁRVA
    const hasWallPanel = items.some(isWallPanelItem);
    if (hasWallPanel) return false;

    // Padlózatok darabszámának összesítése: max 2 db megengedett
    let floorCount = 0;
    for (const item of items) {
        if (isFloorItem(item)) {
            const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
            floorCount += qty;
        }
    }

    if (floorCount > 2) {
        return false;
    }

    return true;
}

/**
 * Konfigurációs kapcsoló: Ha a webshopban minden szállítás fix (pl. 9900 Ft),
 * a rossz szállítás vizsgálat ideiglenesen inaktiválható.
 * Későbbi visszakapcsoláshoz állítsd true-ra.
 */
export const ENABLE_BAD_SHIPPING_CHECK = false;

/**
 * Ellenőrzi, hogy egy rendelés rossz szállítási díjjal (pl. 2.300 Ft-os budapesti díj vidéki címre) rendelkezik-e.
 * KIVÉTELEK:
 * - Inaktivált állapot (ENABLE_BAD_SHIPPING_CHECK = false), hacsak a forceCheck nincs bekapcsolva
 * - Törölt vagy már teljesített rendelések
 * - Személyes átvételes rendelések
 * - Budapesti címek (Budapest város vagy 1xxx irányítószám)
 * - Ingyenes szállítási kuponnal / kedvezménnyel rendelkezők (ahol a kedvezmény miatt 0 Ft vagy lecsökkent a díj, pl. #3966)
 * 
 * @param {Object} order Shopify API vagy konvertált rendelés
 * @param {boolean} [forceCheck=false] Ha true, a globális ENABLE_BAD_SHIPPING_CHECK kapcsolót figyelmen kívül hagyva lefuttatja az ellenőrzést
 * @returns {boolean}
 */
export function checkBadShipping(order, forceCheck = false) {
    if (!order) return false;
    if (!forceCheck && !ENABLE_BAD_SHIPPING_CHECK) return false;
    if (order.isCancelled === true || order.cancelled_at) return false;

    const fStatus = String(order.fulfillmentStatus || order.fulfillment_status || '').toLowerCase();
    if (fStatus === 'fulfilled') return false;

    // Személyes átvétel kizárása
    if (order.isPickup || isPickupOrder(order)) return false;

    // Település és irányítószám vizsgálata
    const city = String(order.city || order.shipping_address?.city || '').trim().toLowerCase();
    const zip = String(order.zip || order.shipping_address?.zip || '').trim();
    const isBudapest = city === 'budapest' || city.includes('budapest') || /^(1\d{3})$/.test(zip);
    if (isBudapest) return false;

    // Szállítási adatok kinyerése (Összes szállítási sor vizsgálata)
    const shippingLines = order.shipping_lines || (order.shippingLine ? [order.shippingLine] : []);
    
    // Ha több szállítási sor van hozzáadva (ráfizetett / hozzá van ütve egy másik összeg, pl. #3941), NEM rossz szállítás!
    if (shippingLines.length > 1) {
        return false;
    }

    // Ha a rendelési tételek között szerepel szállítási pótdíj vagy plusz szállítás tétel
    const lineItems = order.line_items || order.items || [];
    const hasExtraShippingItem = lineItems.some(l => /szállít|kiszállít|pótdíj/i.test(l.title || l.name || ''));
    if (hasExtraShippingItem) {
        return false;
    }

    let totalRawPrice = 0;
    let totalDiscount = 0;
    let totalDiscounted = 0;

    if (shippingLines.length > 0) {
        shippingLines.forEach(line => {
            const p = parseFloat(line.price || 0);
            totalRawPrice += p;
            let dAmount = 0;
            if (Array.isArray(line.discount_allocations) && line.discount_allocations.length > 0) {
                dAmount = line.discount_allocations.reduce((sum, d) => {
                    return sum + (parseFloat(d.amount || d.amount_set?.shop_money?.amount || 0) || 0);
                }, 0);
            }
            totalDiscount += dAmount;

            if (line.discounted_price !== undefined && line.discounted_price !== null) {
                totalDiscounted += parseFloat(line.discounted_price);
            } else if (line.discounted_price_set?.shop_money?.amount !== undefined && line.discounted_price_set?.shop_money?.amount !== null) {
                totalDiscounted += parseFloat(line.discounted_price_set.shop_money.amount);
            } else {
                totalDiscounted += Math.max(0, p - dAmount);
            }
        });
    } else {
        totalDiscounted = parseFloat(order.total_shipping_price_set?.shop_money?.amount || order.shippingFee || 0);
        totalRawPrice = totalDiscounted;
    }

    // Ha a Shopify total_shipping_price_set-ben lévő összeg magasabb, azt vesszük
    if (order.total_shipping_price_set?.shop_money?.amount !== undefined) {
        const setTotal = parseFloat(order.total_shipping_price_set.shop_money.amount);
        if (setTotal > totalDiscounted) {
            totalDiscounted = setTotal;
        }
    }

    // Ingyenes szállítás kupon / kedvezmény felismerése (kupon miatti 0 Ft, pl. #3966)
    const hasFreeShippingDiscount = (totalDiscount >= totalRawPrice && totalRawPrice > 0) ||
                                    (totalDiscounted === 0 && (totalDiscount > 0 || shippingLines.some(l => l.discount_allocations && l.discount_allocations.length > 0)));

    if (hasFreeShippingDiscount || totalDiscounted === 0) {
        return false;
    }

    // Ha ráfizetett vagy más összegben egyeztek meg (pl. 5000 Ft, 9900 Ft), NEM rossz szállítás!
    if (totalDiscounted > 2350) {
        return false;
    }

    // Csak akkor rossz szállítás, ha a ténylegesen fizetett összeg pontosan 2300 Ft
    return Math.round(totalDiscounted) === 2300;
}

/**
 * Ellenőrzi, hogy egy rendelés hiányzó számlásnak minősül-e.
 * Nem törölt, nem viszonteladó, és nincs rajta "számla ki" tag.
 */
export function isOrderMissingInvoice(order) {
    if (!order) return false;
    if (order.isCancelled === true || order.cancelled_at) return false;

    // Viszonteladó tag kizárása (viszonteladó, viszontelado, viszontelad, viszonterlad)
    const tags = String(order.tags || '').toLowerCase();
    if (
        tags.includes('viszontelad') ||
        tags.includes('viszonterlad') ||
        tags.includes('viszonteladó') ||
        tags.includes('viszontelado')
    ) return false;

    // Ha van számla ki tag
    if (tags.includes('számla ki') || tags.includes('szamla ki')) return false;

    return true;
}

/**
 * Kiszűri a megadott rendelésekből azokat, amelyeknek nincs kiállított számlája.
 */
export function filterOrdersWithoutInvoice(orders) {
    if (!Array.isArray(orders)) return [];
    return orders.filter(isOrderMissingInvoice);
}

/**
 * Kiszámolja és validálja a rendelés utánvét összegét és az esetleges hibákat / figyelmeztetéseket.
 * 
 * Szabályok:
 * 1. Bank deposit (átutalás) esetén nem képez utánvét hibát.
 * 2. Ha outstandingBalance > 0 és nincs Notes összeg (noteCodAmount === null):
 *    - Ha >250 000 Ft: "Nem volt előleg? (250e+ Ft)" figyelmeztetés.
 *    - Ha <=250 000 Ft: Nincs hiba, a Shopify tartozást tekintjük utánvétnek ("Lappangó Utánvét" kivezetve).
 * 3. Ha outstandingBalance > 0 és van Notes összeg:
 *    - 10 Ft tűréssel egyezik -> nincs hiba.
 *    - >250 000 Ft rendelésnél pont 20 000, 25 000, 30 000 vagy 40 000 Ft az eltérés (levont előleg) -> nincs hiba, a Notes összeget fogadja el!
 *    - Speciális szállítási díj levonás vagy Shopify CSV bug -> nincs hiba.
 *    - Egyéb eltérés -> "Utánvét Eltérés" hiba.
 * 4. Ha outstandingBalance === 0 és van Notes összeg (noteCodAmount > 0) -> "Fizetési Anomália" hiba.
 */
export function calculateOrderCodAndErrors({
    outstandingBalance = 0,
    totalAmount = 0,
    notes = '',
    isBankDeposit = false,
    shippingCost = 0,
    subtotal = 0,
    vatRate = 0.27
} = {}) {
    const rawNotes = String(notes || '').toLowerCase();
    const cleanNotes = rawNotes
        .replace(/\b\d{4}[. -/]+\d{1,2}[. -/]+\d{1,2}(?!\d)\.?/g, '')
        .replace(/\b\d{1,2}[.-/]\d{1,2}(?!\d)\.?/g, '');

    let noteCodAmount = null;
    const matchBefore = cleanNotes.match(/(\d[\d\s\.]*?)\s*(?:ft|huf)?\s*(?:ut[aá]nv[eé]t|\buv)/i);
    const matchAfter = cleanNotes.match(/(?:ut[aá]nv[eé]t|\buv).*?(\d[\d\s\.]*)/i);
    const matchFt = cleanNotes.match(/(\d(?:[\d .]*\d)?)\s*ft/i);

    if (matchAfter) {
        noteCodAmount = parseInt(matchAfter[1].replace(/[\s\.]/g, ''), 10);
    } else if (matchFt) {
        noteCodAmount = parseInt(matchFt[1].replace(/[\s\.]/g, ''), 10);
    } else if (matchBefore) {
        noteCodAmount = parseInt(matchBefore[1].replace(/[\s\.]/g, ''), 10);
    }

    let isCOD = false;
    let codAmount = 0;
    const errors = [];

    if (!isBankDeposit) {
        if (outstandingBalance > 0) {
            isCOD = true;
            codAmount = outstandingBalance;

            const isOver250k = (outstandingBalance > 250000 || totalAmount > 250000);

            if (noteCodAmount === null) {
                if (isOver250k) {
                    const formattedOutstanding = new Intl.NumberFormat('hu-HU').format(outstandingBalance);
                    errors.push({
                        id: Math.random().toString(36).substr(2, 9),
                        type: 'cod',
                        shopifyAmount: outstandingBalance,
                        noteAmount: 0,
                        title: "Nem volt előleg? (250e+ Ft)",
                        desc: `250.000 Ft feletti utánvét (${formattedOutstanding} Ft), de a Notes üres. Nem érkezett díjbekérős előleg?`
                    });
                }
            } else {
                const diff = outstandingBalance - noteCodAmount;
                const isAllowedDepositDiff = [20000, 25000, 30000, 40000].some(deposit => Math.abs(diff - deposit) <= 10);
                const shippingGross = Math.round(shippingCost * 1.27);
                const isShippingGrossDiff = Math.abs((outstandingBalance - shippingGross) - noteCodAmount) <= 10;

                if (Math.abs(diff) <= 10 || (isOver250k && (isAllowedDepositDiff || isShippingGrossDiff))) {
                    codAmount = noteCodAmount;
                } else {
                    const calculatedExclusive = Math.round((subtotal + shippingCost) * (1 + vatRate));
                    const calculatedInclusive = Math.round(subtotal + shippingCost);
                    const matchesCalc = subtotal > 0 && (Math.abs(calculatedExclusive - noteCodAmount) <= 10 || Math.abs(calculatedInclusive - noteCodAmount) <= 10);
                    if (matchesCalc && Math.abs(outstandingBalance - noteCodAmount) > 10) {
                        codAmount = noteCodAmount;
                    } else {
                        errors.push({
                            id: Math.random().toString(36).substr(2, 9),
                            type: 'cod',
                            shopifyAmount: outstandingBalance,
                            noteAmount: noteCodAmount,
                            title: "Utánvét Eltérés",
                            desc: `Utánvét a shopifyban: ${outstandingBalance} Ft, a Notes-ban ${noteCodAmount} Ft kérlek ellenőrizd!`
                        });
                    }
                }
            }
        } else if (noteCodAmount !== null && noteCodAmount > 0) {
            isCOD = true;
            codAmount = noteCodAmount;
            errors.push({
                id: Math.random().toString(36).substr(2, 9),
                type: 'cod',
                shopifyAmount: 0,
                noteAmount: noteCodAmount,
                title: "Fizetési Anomália",
                desc: `A shopify szerint nincs utánvét, de a Notes-ban szerepel egy összeg: ${noteCodAmount} Ft`
            });
        }
    }

    return {
        isCOD,
        codAmount,
        noteCodAmount,
        errors
    };
}

/**
 * Ellenőrzi, hogy egy kiszállításos rendelés szállítási címe hiányos-e (pl. hiányzó házszám).
 * Kizárja a személyes átvételes és a törölt rendeléseket.
 * 
 * @param {Object} order Rendelés objektum
 * @returns {boolean} Igaz, ha kiszállításos ÉS a címe hiányos (nincs házszám, vagy hiányzik a település/utca)
 */
export function checkInvalidDeliveryAddress(order) {
    if (!order) return false;
    if (order.isCancelled === true || order.cancelled_at) return false;
    if (order.isPickup || isPickupOrder(order)) return false;
    
    // Viszonteladók kizárása (nekik tudjuk a címüket, vagy bejönnek érte)
    const tags = String(order.tags || '').toLowerCase();
    if (order.isReseller === true || tags.includes('viszontelad') || tags.includes('viszonterlad') || tags.includes('viszonteladó') || tags.includes('viszontelado')) return false;

    // Ha order.hasInvalidAddress már explicit boolean-ként be van állítva:
    if (typeof order.hasInvalidAddress === 'boolean') {
        return order.hasInvalidAddress;
    }

    let zip = String(order.zip || order.shipping_address?.zip || '').replace(/['"]/g, '').trim();
    let city = String(order.city || order.shipping_address?.city || '').trim();
    let street = String(order.address1 || order.address || order.shipping_address?.address1 || '').trim();

    // Ha az utca mező tartalmazza az egész címet
    const fullAddr = String(order.fullAddress || order.address || '').replace(/['"]/g, '').trim();
    if (!zip || !city || !street || street.includes(',') || street === fullAddr) {
        if (fullAddr) {
            const zipMatch = fullAddr.match(/\b\d{4}\b/);
            if (zipMatch && !zip) zip = zipMatch[0];
            
            const parts = fullAddr.split(',').map(p => p.trim()).filter(Boolean);
            if (parts.length >= 2 && !street) {
                street = parts[parts.length - 1];
            }
        }
    }

    if (!zip || !city || !street) return true;

    const streetLower = street.toLowerCase();

    // 1. Csak számok és írásjelek -> Hiányzó utcanév
    const justNumbersAndSymbols = /^[\d\s\/\.,\\-–—a-fA-F]*$/.test(streetLower) && streetLower.length <= 6;
    if (justNumbersAndSymbols) return true;

    // 2. HÁZSZÁM ELLENŐRZÉS: Legalább 1 számjegyet tartalmaznia kell
    const hasHouseNumber = /\d+/.test(streetLower);
    if (!hasHouseNumber) return true;

    return false;
}

/**
 * Visszaadja a kiválasztott rendeléseket a felhasználói kijelölés PONTOS sorrendjében.
 * (A Set vagy Array beszúrási sorrendjét követi a táblázat alapértelmezett sorrendje helyett).
 * 
 * @param {Array} allOrders - Az összes elérhető rendelés tömbje
 * @param {Set|Array} selectedIds - A kiválasztott rendelések azonosítói
 * @returns {Array} - A kijelölés sorrendjében rendezett rendelés objektumok
 */
export function getOrdersInSelectionOrder(allOrders, selectedIds) {
    if (!Array.isArray(allOrders) || !selectedIds) return [];
    const idList = Array.from(selectedIds);
    if (idList.length === 0) return [];

    const orderMap = new Map();
    allOrders.forEach(o => {
        if (o && o.id) {
            const rawId = String(o.id);
            const cleanId = rawId.replace(/^#/, '');
            orderMap.set(rawId, o);
            orderMap.set(cleanId, o);
            orderMap.set('#' + cleanId, o);
        }
    });

    return idList
        .map(id => {
            const strId = String(id);
            const cleanId = strId.replace(/^#/, '');
            return orderMap.get(strId) || orderMap.get(cleanId) || orderMap.get('#' + cleanId);
        })
        .filter(Boolean);
}

/**
 * Ellenőrzi, hogy a megjegyzés tartalmazza-e a [ok] kifejezést.
 * 
 * @param {string} note 
 * @returns {boolean}
 */
export function hasOkTag(note) {
    if (!note) return false;
    return String(note).toLowerCase().includes('[ok]');
}

/**
 * Ellenőrzi, hogy egy rendelés viszonteladói rendelés-e.
 * 
 * @param {Object} order 
 * @returns {boolean}
 */
export function isResellerOrder(order) {
    if (!order) return false;
    if (order.isReseller === true) return true;
    const tags = String(order.tags || '').toLowerCase();
    return tags.includes('viszontelad') ||
           tags.includes('viszonterlad') ||
           tags.includes('viszonteladó') ||
           tags.includes('viszontelado');
}

/**
 * Kiszámolja a reggeli riport statisztikáit a viszonteladók kizárásával.
 * 
 * @param {Array} orders - Shopify rendelések tömbje
 * @param {Date|string} cutoff24h - A tegnapi 07:00 vágási dátum
 * @returns {Object} { unfulfilledCount, newOrders24h, newUnfulfilled24h }
 */
export function calculateMorningReportStats(orders = [], cutoff24h = null) {
    if (!Array.isArray(orders)) {
        return { unfulfilledCount: 0, newOrders24h: 0, newUnfulfilled24h: 0 };
    }

    const cutoffTime = cutoff24h ? new Date(cutoff24h).getTime() : 0;

    // Viszonteladók és törölt rendelések kizárása
    const retailOrders = orders.filter(o => !o.isCancelled && !isResellerOrder(o));

    // Lakossági unfulfilled rendelések
    const unfulfilledCount = retailOrders.filter(o => !o.isFulfilled && (o.fulfillmentStatus === 'unfulfilled' || o.fulfillment_status === 'unfulfilled' || !o.fulfillmentStatus)).length;

    let newOrders24h = 0;
    let newUnfulfilled24h = 0;

    if (cutoffTime > 0) {
        retailOrders.forEach(o => {
            const createdAtTime = new Date(o.created_at || o.createdAt || 0).getTime();
            if (createdAtTime >= cutoffTime) {
                newOrders24h++;
                if (!o.isFulfilled && (o.fulfillmentStatus === 'unfulfilled' || o.fulfillment_status === 'unfulfilled' || !o.fulfillmentStatus)) {
                    newUnfulfilled24h++;
                }
            }
        });
    }

    return {
        unfulfilledCount,
        newOrders24h,
        newUnfulfilled24h
    };
}

/**
 * Kinyeri a szögletes zárójelbe írt dátumot a megjegyzésből (pl. [09.08], [09.08.], [2026.09.08]).
 * 
 * @param {string} note 
 * @returns {string|null} Visszaadja a formázott MM.DD dátumot (pl. "09.08") vagy null-t
 */
export function extractScheduledDateTag(note) {
    if (!note) return null;
    const str = String(note);
    const match = str.match(/\[(?:(\d{4})[\.\/-])?(\d{1,2})[\.\/-](\d{1,2})\.?\]/);
    if (!match) return null;

    const month = String(match[2]).padStart(2, '0');
    const day = String(match[3]).padStart(2, '0');
    return `${month}.${day}`;
}

/**
 * Ellenőrzi, hogy a megjegyzésben lévő időzített dátum egyezik-e a megadott nap dátumával (pl. "09.08").
 * 
 * @param {string} note 
 * @param {Date|string} targetDate 
 * @returns {boolean}
 */
export function isScheduledDateToday(note, targetDate = new Date()) {
    const scheduledTag = extractScheduledDateTag(note);
    if (!scheduledTag) return false;

    let d;
    if (targetDate instanceof Date) {
        d = targetDate;
    } else if (typeof targetDate === 'string' && /^\d{2}\.\d{2}$/.test(targetDate)) {
        return scheduledTag === targetDate;
    } else {
        d = new Date(targetDate);
    }

    if (isNaN(d.getTime())) return false;

    const targetMonth = String(d.getMonth() + 1).padStart(2, '0');
    const targetDay = String(d.getDate()).padStart(2, '0');
    const targetTag = `${targetMonth}.${targetDay}`;

    return scheduledTag === targetTag;
}

/**
 * Kiszámolja a reggeli riport vágási dátumát (Cutoff Date).
 * Hétfő reggel -> Péntek reggel 07:00 AM (72 órás hétvégi visszatekintés)
 * Kedd - Péntek reggel -> Tegnap reggel 07:00 AM (24 órás visszatekintés)
 * 
 * @param {Date|string} referenceDate 
 * @returns {{ cutoffDate: Date, periodText: string, isMonday: boolean }}
 */
export function calculateReportCutoffDate(referenceDate = new Date()) {
    const d = referenceDate instanceof Date ? new Date(referenceDate) : new Date(referenceDate);
    const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
    const isMonday = (dayOfWeek === 1);

    const cutoff = new Date(d);
    cutoff.setHours(7, 0, 0, 0);

    if (isMonday) {
        cutoff.setDate(cutoff.getDate() - 3);
    } else {
        cutoff.setDate(cutoff.getDate() - 1);
    }

    return {
        cutoffDate: cutoff,
        periodText: isMonday ? 'Péntek reggel 07:00 óta' : 'Tegnap reggel 07:00 óta',
        isMonday
    };
}

/**
 * Ellenőrzi, hogy egy rendelés kiszállításos-e és hiányos-e a szállítási címe (pl. hiányzó házszám).
 * Személyes átvételes vagy törölt rendelésekre mindig false-t ad vissza.
 */
export const hasInvalidDeliveryAddress = checkInvalidDeliveryAddress;

/**
 * Összefésüli és kiszámítja a Shopify rendelési tételek darabszámait, kedvezményeit és valós sorösszegeit.
 * Kezeli az ingyenes ajándék (0 Ft) tételeket és a modern discount_allocations mezőket.
 * 
 * @param {Array} rawLineItems A Shopify API vagy CSV által adott nyers tétellista
 * @param {Function} [formatNameFn] Opcionális egyedi névformázó függvény
 * @returns {{ items: Array, removedItems: Array }}
 */
export function aggregateOrderLineItems(rawLineItems = [], formatNameFn = null) {
    const items = [];
    const removedItems = [];
    const formatName = formatNameFn || (name => (name ? String(name).replace(/\s+/g, ' ').trim() : ''));

    (rawLineItems || []).forEach(item => {
        const variantTitle = (item.variant_title || item.variantTitle || '').trim();
        let fullItemName = (item.name || item.title || '').trim();
        if (variantTitle && variantTitle.toLowerCase() !== 'default title' && !fullItemName.toLowerCase().includes(variantTitle.toLowerCase())) {
            fullItemName = `${item.title || fullItemName} - ${variantTitle}`;
        }
        const formattedName = formatName(fullItemName);
        const origQty = parseInt(item.quantity) || 0;
        const curQty = item.current_quantity !== undefined ? parseInt(item.current_quantity) : origQty;
        const fulfillableQty = item.fulfillable_quantity !== undefined ? parseInt(item.fulfillable_quantity) : curQty;
        const unitPrice = parseFloat(item.price) || 0;

        // Kedvezmények kiszámítása (discount_allocations és total_discount)
        let lineDiscount = 0;
        if (Array.isArray(item.discount_allocations) && item.discount_allocations.length > 0) {
            lineDiscount = item.discount_allocations.reduce((sum, d) => {
                return sum + (parseFloat(d.amount || d.amount_set?.shop_money?.amount || 0) || 0);
            }, 0);
        } else if (item.total_discount) {
            lineDiscount = parseFloat(item.total_discount) || 0;
        }

        const rawLineTotal = unitPrice * curQty;
        const lineTotal = Math.max(0, Math.round(rawLineTotal - lineDiscount));

        const isFreeGift = (lineTotal === 0 && rawLineTotal > 0) || unitPrice === 0 || (item.properties || []).some(p =>
            (p.name && /gift|ajándék|ingyen/i.test(String(p.name))) ||
            (p.value && /gift|ajándék|ingyen/i.test(String(p.value)))
        );
        const freeQty = isFreeGift ? curQty : 0;
        const paidQty = curQty - freeQty;

        // Ha a tétel törölve lett a rendelésből (current_quantity === 0)
        if (curQty === 0 && origQty > 0) {
            removedItems.push({
                name: formattedName,
                originalQty: origQty,
                qty: 0,
                price: unitPrice,
                totalPrice: 0,
                totalDiscount: lineDiscount,
                sku: item.sku || '',
                variantTitle: item.variant_title || '',
                imageUrl: item.image_url || null
            });
            return;
        }

        // Ha a tétel aktív darabszámmal szerepel a rendelésben
        if (curQty > 0 && formattedName) {
            const existing = items.find(i => i.name === formattedName);
            if (existing) {
                existing.qty += curQty;
                existing.originalQty = (existing.originalQty || 0) + origQty;
                existing.fulfillableQty = (existing.fulfillableQty || 0) + fulfillableQty;
                existing.totalPrice = (existing.totalPrice !== undefined ? existing.totalPrice : (existing.price * (existing.qty - curQty))) + lineTotal;
                existing.totalDiscount = (existing.totalDiscount || 0) + lineDiscount;
                existing.freeQty = (existing.freeQty || 0) + freeQty;
                existing.paidQty = (existing.paidQty || 0) + paidQty;
                if (isFreeGift) existing.hasFreeGift = true;
            } else {
                items.push({
                    name: formattedName,
                    qty: curQty,
                    originalQty: origQty,
                    fulfillableQty: fulfillableQty,
                    isQuantityModified: curQty !== origQty,
                    price: unitPrice,
                    totalPrice: lineTotal,
                    totalDiscount: lineDiscount,
                    freeQty: freeQty,
                    paidQty: paidQty,
                    hasFreeGift: isFreeGift,
                    sku: item.sku || '',
                    variantTitle: item.variant_title || '',
                    imageUrl: item.image_url || null
                });
            }
        }
    });

    return { items, removedItems };
}

/**
 * Ellenőrzi, hogy egy tétel nagyméretű tábla-e (PVC falpanel, SPC falpanel, padlózat, akusztikus panel).
 * Kellékek, segédanyagok (ragasztó, szilikon, profilok, skirting, tapadóhíd stb.) kizárva.
 * 
 * @param {Object} item
 * @returns {boolean}
 */
export function isBoardItem(item) {
    if (!item) return false;
    const name = String(item.name || item.title || '').trim();
    const sku = String(item.sku || '').trim();
    const variantTitle = String(item.variantTitle || item.variant_title || '').trim();
    const text = `${name} ${sku} ${variantTitle}`.toLowerCase();

    // 1. Explicit kizárások (kellékek, segédanyagok, apróságok)
    // Ragasztók és tömítők
    if (/ragaszt[óo]|szilikon|hpr|t-rex|trex|mamut|fix\s*all|soudal|den\s*braven/i.test(text)) {
        return false;
    }
    // Profilok, sarokelemek, szegélyek, élvédők, skirting, lábazatok
    if (/profil|szeg[eé]ly|skirting|l[áa]bazat|[eé]lv[eé]d[oő]|sarok|told[oó]|v[eé]gz[aá]r[oó]|lez[aá]r[oó]|v[eé]gelem|sorol[oó]/i.test(text)) {
        return false;
    }
    // Tapadóhíd, mélyalapozó, egyéb kellékek, eszközök
    if (/tapad[oó]h[ií]d|alapoz[oó]|kell[eé]k|szersz[aá]m|tiszt[ií]t[oó]|kend[oő]|szalag|f[oó]lia|minta|mintadarab/i.test(text)) {
        return false;
    }

    // 2. Nagyméretű táblás elemek
    // Falpanelek (PVC, SPC, falburkolat, bambusz, akusztikus panel, akupanel)
    if (/falpanel|falburkolat|akupanel|akusztik|acoustic|\bspc\b|\bpvc\b/i.test(text)) {
        return true;
    }
    // Padlózatok (SPC padló, laminált, parketta, LVT, vinyl)
    if (/padl[oó]|padl[oó]zat|lamin[aá]lt|parketta|\blvt\b|\bvinyl\b/i.test(text)) {
        return true;
    }
    // Típus/cikkszám szerinti táblák (pl. PB-..., TR-..., LJ-..., PS-...)
    if (/\b(pb|tr|lj|ps)[-_]?\d+/i.test(text) || /\b(pb|tr|lj)\b/i.test(text)) {
        return true;
    }
    // Méretmegjelölések (pl. 244x122, 280x122, 278x60, 260x120, 122x244, 122x280)
    if (/\d{2,3}\s*[x*×]\s*\d{2,3}/i.test(text)) {
        return true;
    }

    return false;
}

/**
 * Megszámolja egy rendelésben szereplő nagyméretű táblák (falpanelek, padlók, akusztikus panelek) darabszámát.
 * 
 * @param {Object} order
 * @returns {number}
 */
export function countOrderBoards(order) {
    if (!order) return 0;
    const items = order.line_items || order.items || [];
    if (!Array.isArray(items) || items.length === 0) return 0;
    let count = 0;
    for (const item of items) {
        if (isBoardItem(item)) {
            const qty = parseInt(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1), 10);
            count += (isNaN(qty) || qty < 0) ? 0 : qty;
        }
    }
    return count;
}

/**
 * Megállapítja, hogy a rendelés szállítási címe budapesti-e (Budapest város vagy 1xxx irányítószám).
 * 
 * @param {Object} order
 * @returns {boolean}
 */
export function isBudapestAddress(order) {
    if (!order) return false;
    const city = String(order.city || order.shipping_address?.city || '').trim().toLowerCase();
    const zip = String(order.zip || order.shipping_address?.zip || '').trim();
    if (city === 'budapest' || city.includes('budapest') || /^(1\d{3})$/.test(zip)) {
        return true;
    }
    const fullAddress = String(order.address || order.shipping_address?.address1 || '').toLowerCase();
    if (fullAddress.includes('budapest') || /\b1\d{3}\b/.test(fullAddress)) {
        return true;
    }
    return false;
}

/**
 * Kiszámolja a rendelés belső fuvarköltségét.
 * 
 * Szabályok:
 * - Budapest: 10 000 Ft + Áfa alapdíj (0-10 tábla), 10 tábla felett +1 100 Ft + Áfa / tábla
 * - Vidék: 15 000 Ft + Áfa alapdíj (0-10 tábla), 10 tábla felett +1 100 Ft + Áfa / tábla
 * - Egyedi felülírás támogatása (order.customDeliveryCost)
 * 
 * @param {Object} order
 * @returns {{ netCost: number, calculatedNetCost: number, boardCount: number, isBudapest: boolean, formattedCost: string, isCustom: boolean }}
 */
export function calculateOrderDeliveryCost(order, options = {}) {
    const isCarrierFault = (options && options.isCarrierFault !== undefined)
        ? !!options.isCarrierFault
        : (order && order.isCarrierFault === true);

    if (!order) {
        return {
            netCost: 15000,
            calculatedNetCost: 15000,
            boardCount: 0,
            isBudapest: false,
            formattedCost: "15 000 Ft + Áfa",
            isCustom: false,
            isCarrierFault: false
        };
    }

    if (isCarrierFault) {
        return {
            netCost: 0,
            calculatedNetCost: 0,
            boardCount: 0,
            isBudapest: false,
            formattedCost: "0 Ft (Szállító hiba)",
            isCustom: false,
            isCarrierFault: true
        };
    }

    const customCost = (order.customDeliveryCost !== undefined && order.customDeliveryCost !== null && order.customDeliveryCost !== '')
        ? Number(order.customDeliveryCost)
        : null;

    const boardCount = countOrderBoards(order);
    const isBudapest = isBudapestAddress(order);

    const baseFee = isBudapest ? 10000 : 15000;
    const extraBoards = Math.max(0, boardCount - 10);
    const calculatedNetCost = baseFee + (extraBoards * 1100);

    const isCustom = customCost !== null && !isNaN(customCost);
    const netCost = isCustom ? customCost : calculatedNetCost;

    const formattedNumber = new Intl.NumberFormat('hu-HU').format(netCost).replace(/\u00a0/g, ' ');
    const formattedCost = `${formattedNumber} Ft + Áfa`;

    return {
        netCost,
        calculatedNetCost,
        boardCount,
        isBudapest,
        formattedCost,
        isCustom,
        isCarrierFault: false
    };
}

