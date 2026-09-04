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
 * Ellenőrzi, hogy egy nyitott rendelés automatikusan jogosult-e a PannonXP címkére.
 * Feltételek:
 * 1. Nem törölt és nem teljesített (unfulfilled / partial).
 * 2. Nem személyes átvétel.
 * 3. Még nincs rajta sem PannonXP/PXP, sem Sela megr., sem terítésben tag.
 * 4. Van benne tétel, és EGYETLEN tétele sem PVC/SPC falpanel vagy padlózat.
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

    // Ha bármelyik tétel PVC/SPC falpanel vagy padlózat -> NEM jogosult
    const hasLarge = items.some(isPvcSpcOrFloorItem);
    if (hasLarge) return false;

    return true;
}
