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
