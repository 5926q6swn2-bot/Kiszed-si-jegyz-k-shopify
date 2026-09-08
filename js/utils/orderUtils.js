// js/utils/orderUtils.js
// Rendelésekkel kapcsolatos segédfüggvények (duplikációk, vevő-összerendelés)

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

    // Csak a még NEM teljesített és NEM törölt rendeléseket vizsgáljuk
    const activeOrders = allOrders.filter(o => 
        !o.isCancelled && 
        !o.isFulfilled && 
        (o.fulfillmentStatus === 'unfulfilled' || o.fulfillmentStatus === 'partial' || !o.fulfillmentStatus)
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
        tagsLower.includes('boltban átvétel') ||
        tagsLower.includes('ready for pickup') ||
        tagsLower.includes('átvehető')) {
        return true;
    }

    const shippingLines = order.shipping_lines || [];
    const shippingLinesStr = (Array.isArray(shippingLines) ? shippingLines.map(sl => sl.title || '').join(' ') : String(order.shippingMethod || '')).toLowerCase();
    if (/üzlet|bolt|pickup|raktár|személyes|helyszíni|store pickup/i.test(shippingLinesStr)) {
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

    // 0. Explicit kizárások
    if (text.includes('mamut') || text.includes('fix all')) return false;
    if (text.includes('akusztik') || text.includes('akupanel') || /\baku\b/i.test(text)) return false;

    // Padlózat felismerés (szavak: padló, padlo, padlózat, padlozat, vagy SPC/vinyl + wood/stone/parketta)
    const isFloor = /padl[óo]zat|padl[óo]/i.test(text) ||
                    ((text.includes('spc') || text.includes('vinyl')) && (text.includes('wood') || text.includes('stone') || text.includes('parketta')));

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
 * Ellenőrzi, hogy egy rendelés rossz szállítási díjjal (pl. 2.300 Ft-os budapesti díj vidéki címre) rendelkezik-e.
 * KIVÉTELEK:
 * - Törölt vagy már teljesített rendelések
 * - Személyes átvételes rendelések
 * - Budapesti címek (Budapest város vagy 1xxx irányítószám)
 * - Ingyenes szállítási kuponnal / kedvezménnyel rendelkezők (ahol a kedvezmény miatt 0 Ft vagy lecsökkent a díj, pl. #3966)
 * 
 * @param {Object} order Shopify API vagy konvertált rendelés
 * @returns {boolean}
 */
export function checkBadShipping(order) {
    if (!order) return false;
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


