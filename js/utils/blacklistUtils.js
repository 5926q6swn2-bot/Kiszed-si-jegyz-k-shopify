// js/utils/blacklistUtils.js
// Feketelista tisztító, normalizáló, egyeztető és korábbi fuvarokat aggregáló tiszta függvények (Pure Functions)

/**
 * Normalizál egy telefonszámot az összehasonlításhoz.
 * Eltávolítja a szóközöket, kötőjeleket, és a magyar országkódokat (0036, +36, 06).
 * 
 * @param {string} phone 
 * @returns {string} Tisztított számjegyek (pl. "301234567")
 */
export function normalizePhoneForMatch(phone) {
    if (!phone) return '';
    let digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('0036')) digits = digits.slice(4);
    else if (digits.startsWith('36')) digits = digits.slice(2);
    else if (digits.startsWith('06')) digits = digits.slice(2);
    return digits;
}

/**
 * Ellenőrzi, hogy két telefonszám egyezik-e.
 * 
 * @param {string} p1 
 * @param {string} p2 
 * @returns {boolean}
 */
export function isPhoneMatch(p1, p2) {
    if (!p1 || !p2) return false;
    const d1 = normalizePhoneForMatch(p1);
    const d2 = normalizePhoneForMatch(p2);
    if (!d1 || !d2 || d1.length < 7 || d2.length < 7) return false;
    return d1 === d2 || (d1.length >= 8 && d2.length >= 8 && (d1.endsWith(d2) || d2.endsWith(d1)));
}

/**
 * Normalizál egy címet az összehasonlításhoz.
 * Kisbetűsíti, ékezetmentesíti, és kiszűri a gyakori közterület típusokat.
 * 
 * @param {string} address 
 * @returns {string} Normalizált címszöveg
 */
export function normalizeAddressForMatch(address) {
    if (!address) return '';
    let str = String(address).toLowerCase();
    // Ékezetek eltávolítása
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Gyakori közterület típusok és rövidítések normalizálása szóközre
    str = str.replace(/\b(utca|ut|u|ter|tere|korut|krt|fasor|sor|koz|setany|dulo)\b\.?/gi, ' ');
    // Épület, lépcsőház, emelet, ajtó jelölések levágása
    str = str.replace(/\b(ep|epulet|lh|lepcsohaz|em|emelet|ajt|ajto|fszt|fsz)\b\.?/gi, ' ');
    // Írásjelek cseréje szóközre
    str = str.replace(/[^a-z0-9]/gi, ' ');
    return str.replace(/\s+/g, ' ').trim();
}

/**
 * Ellenőrzi, hogy egy rendelési cím egyezik-e a feketelista profilon lévő címmel.
 * 
 * @param {string} orderAddr 
 * @param {string} profileAddr 
 * @returns {boolean}
 */
export function isAddressMatch(orderAddr, profileAddr) {
    if (!orderAddr || !profileAddr) return false;
    const normOrder = normalizeAddressForMatch(orderAddr);
    const normProfile = normalizeAddressForMatch(profileAddr);
    if (!normOrder || !normProfile || normProfile.length < 4) return false;

    // Ha az egyik pontosan tartalmazza a másikat
    if (normOrder.includes(normProfile) || normProfile.includes(normOrder)) {
        return true;
    }

    const profileTokens = normProfile.split(' ').filter(t => t.length > 0);
    const hasNumber = profileTokens.some(t => /\d/.test(t));
    if (!hasNumber && profileTokens.length < 2) return false;

    // Minden profile token szerepel-e a rendelés címében?
    return profileTokens.every(token => {
        if (/^\d+$/.test(token)) {
            const regex = new RegExp(`\\b${token}\\b`);
            return regex.test(normOrder);
        }
        return normOrder.includes(token);
    });
}

/**
 * Ellenőrzi, hogy két email cím egyezik-e.
 * 
 * @param {string} e1 
 * @param {string} e2 
 * @returns {boolean}
 */
export function isEmailMatch(e1, e2) {
    if (!e1 || !e2) return false;
    const clean1 = String(e1).trim().toLowerCase();
    const clean2 = String(e2).trim().toLowerCase();
    return clean1.length > 3 && clean1 === clean2;
}

/**
 * Ellenőrzi, hogy két rendelésszám egyezik-e (figyelmen kívül hagyva a #-et és perjeleket).
 * 
 * @param {string} oId1 
 * @param {string} oId2 
 * @returns {boolean}
 */
export function isOrderIdMatch(oId1, oId2) {
    if (!oId1 || !oId2) return false;
    const clean1 = String(oId1).trim().replace(/^#/, '').replace(/\/.*$/, '').trim().toLowerCase();
    const clean2 = String(oId2).trim().replace(/^#/, '').replace(/\/.*$/, '').trim().toLowerCase();
    return clean1.length > 0 && clean1 === clean2;
}

/**
 * Egy megrendelés egyeztetése a feketelistás profilokkal.
 * 
 * @param {Object} order 
 * @param {Array} profiles 
 * @returns {Object|null} Egyezés esetén { isBlacklisted: true, profile, matchReason, matchedValue }
 */
export function matchOrderWithBlacklist(order, profiles = []) {
    if (!order || !Array.isArray(profiles) || profiles.length === 0) return null;

    const orderPhones = [
        order.shippingPhone,
        order.billingPhone,
        order.phone,
        order.shipping_address?.phone,
        order.billing_address?.phone
    ].filter(Boolean);

    const orderAddresses = [
        order.fullAddress,
        order.address,
        order.address1 ? `${order.zip || ''} ${order.city || ''} ${order.address1}` : null,
        order.shipping_address ? `${order.shipping_address.zip || ''} ${order.shipping_address.city || ''} ${order.shipping_address.address1 || ''}` : null
    ].filter(Boolean);

    const orderEmails = [
        order.email,
        order.customer?.email,
        order.customerEmail
    ].filter(Boolean);

    const orderId = order.id || '';

    for (const profile of profiles) {
        // 1. Rendelésszám vizsgálat
        const profileOrderIds = Array.isArray(profile.orderIds) ? profile.orderIds : (profile.orderId ? [profile.orderId] : []);
        for (const pOrderId of profileOrderIds) {
            if (isOrderIdMatch(orderId, pOrderId)) {
                return {
                    isBlacklisted: true,
                    profile: profile,
                    matchReason: 'Rendelésszám egyezés',
                    matchedField: 'orderId',
                    matchedValue: orderId
                };
            }
        }

        // 2. Telefonszám vizsgálat
        const profilePhones = Array.isArray(profile.phones) ? profile.phones : (profile.phone ? [profile.phone] : []);
        for (const pPhone of profilePhones) {
            for (const oPhone of orderPhones) {
                if (isPhoneMatch(oPhone, pPhone)) {
                    return {
                        isBlacklisted: true,
                        profile: profile,
                        matchReason: 'Telefonszám egyezés',
                        matchedField: 'phone',
                        matchedValue: oPhone
                    };
                }
            }
        }

        // 3. Cím vizsgálat
        const profileAddresses = Array.isArray(profile.addresses) ? profile.addresses : (profile.address ? [profile.address] : []);
        for (const pAddr of profileAddresses) {
            for (const oAddr of orderAddresses) {
                if (isAddressMatch(oAddr, pAddr)) {
                    return {
                        isBlacklisted: true,
                        profile: profile,
                        matchReason: 'Cím egyezés',
                        matchedField: 'address',
                        matchedValue: pAddr
                    };
                }
            }
        }

        // 4. E-mail cím vizsgálat
        const profileEmails = Array.isArray(profile.emails) ? profile.emails : (profile.email ? [profile.email] : []);
        for (const pEmail of profileEmails) {
            for (const oEmail of orderEmails) {
                if (isEmailMatch(oEmail, pEmail)) {
                    return {
                        isBlacklisted: true,
                        profile: profile,
                        matchReason: 'E-mail cím egyezés',
                        matchedField: 'email',
                        matchedValue: oEmail
                    };
                }
            }
        }
    }

    return null;
}

/**
 * Megkeresi az összes korábbi fuvart és rendelést, ami a megadott profilhoz tartozik.
 * 
 * @param {Object} profile 
 * @param {Array} liveOrders 
 * @param {Array} savedRuns 
 * @returns {Array} Időrendben csökkenő kiszállítási események listája
 */
export function findRelatedDeliveriesForProfile(profile, liveOrders = [], savedRuns = []) {
    if (!profile) return [];
    const events = [];
    const seenOrderKeys = new Set();

    const profileOrderIds = Array.isArray(profile.orderIds) ? profile.orderIds : (profile.orderId ? [profile.orderId] : []);
    const profilePhones = Array.isArray(profile.phones) ? profile.phones : (profile.phone ? [profile.phone] : []);
    const profileAddresses = Array.isArray(profile.addresses) ? profile.addresses : (profile.address ? [profile.address] : []);
    const profileEmails = Array.isArray(profile.emails) ? profile.emails : (profile.email ? [profile.email] : []);

    const isOrderMatch = (o) => {
        if (!o) return false;
        // 1. Rendelésszám alapján
        if (o.id && profileOrderIds.some(pId => isOrderIdMatch(o.id, pId))) {
            return true;
        }
        // 2. Telefonszám alapján
        const phones = [o.shippingPhone, o.billingPhone, o.phone].filter(Boolean);
        for (const p of profilePhones) {
            if (phones.some(op => isPhoneMatch(op, p))) return true;
        }
        // 3. Cím alapján
        const addrs = [o.fullAddress, o.address, o.address1, o.street].filter(Boolean);
        for (const a of profileAddresses) {
            if (addrs.some(oa => isAddressMatch(oa, a))) return true;
        }
        // 4. E-mail alapján
        const emails = [o.email, o.customer?.email, o.customerEmail].filter(Boolean);
        for (const e of profileEmails) {
            if (emails.some(oe => isEmailMatch(oe, e))) return true;
        }
        // 5. Név alapján (ha nem üres)
        if (profile.name && (o.shippingName || o.billingName)) {
            const normPName = profile.name.trim().toLowerCase();
            const normOName = (o.shippingName || o.billingName || '').trim().toLowerCase();
            if (normPName && normOName && normPName === normOName) {
                return true;
            }
        }
        return false;
    };

    // 1. Mentett terítési járatok vizsgálata
    if (Array.isArray(savedRuns)) {
        savedRuns.forEach(run => {
            const runOrders = run.orders || [];
            const uncollectedIds = new Set(run.uncollectedOrderIds || []);
            const uncollectedReasons = run.uncollectedReasons || {};
            const uncollectedResp = run.uncollectedResponsibility || {};
            const partials = run.partialOrders || run.partialPayments || {};

            runOrders.forEach(o => {
                if (isOrderMatch(o)) {
                    const cleanId = String(o.id || '').replace(/^#/, '');
                    const isUncollected = uncollectedIds.has(o.id) || uncollectedIds.has(cleanId) || uncollectedIds.has('#' + cleanId);
                    const isPartial = !!(partials[o.id] || partials[cleanId]);
                    const failReason = uncollectedReasons[o.id] || uncollectedReasons[cleanId] || '';
                    const resp = uncollectedResp[o.id] || uncollectedResp[cleanId] || '';

                    let statusText = 'Sikeres kézbesítés';
                    let statusColor = '#16a34a';
                    if (isUncollected) {
                        statusText = 'Meghiúsult / Nem vette át';
                        statusColor = '#dc2626';
                    } else if (isPartial) {
                        statusText = 'Részleges fizetés';
                        statusColor = '#d97706';
                    } else if (!run.isSettled) {
                        statusText = 'Terítésben';
                        statusColor = '#2563eb';
                    }

                    const key = `${run.id || run.date}_${cleanId}`;
                    if (!seenOrderKeys.has(key)) {
                        seenOrderKeys.add(key);
                        events.push({
                            source: 'run',
                            runDate: run.date || 'Ismeretlen dátum',
                            orderId: o.id.startsWith('#') ? o.id : '#' + o.id,
                            customerName: o.shippingName || o.billingName || profile.name,
                            address: o.address || o.fullAddress || '',
                            phone: o.shippingPhone || o.billingPhone || '',
                            courier: run.courier || 'Futár nincs megadva',
                            company: run.company || '',
                            isUncollected: isUncollected,
                            failReason: failReason,
                            responsibility: resp,
                            isPartial: isPartial,
                            statusText: statusText,
                            statusColor: statusColor,
                            codAmount: o.codAmount || 0,
                            isCOD: o.isCOD,
                            note: o.note || ''
                        });
                    }
                }
            });
        });
    }

    // 2. Élő Shopify rendelések vizsgálata
    if (Array.isArray(liveOrders)) {
        liveOrders.forEach(o => {
            if (isOrderMatch(o)) {
                const cleanId = String(o.id || '').replace(/^#/, '');
                const key = `live_${cleanId}`;
                const hasRunMatch = events.some(e => e.orderId.replace(/^#/, '') === cleanId);
                if (!hasRunMatch && !seenOrderKeys.has(key)) {
                    seenOrderKeys.add(key);
                    events.push({
                        source: 'shopify_live',
                        runDate: o.orderDate ? String(o.orderDate).substring(0, 10) : 'Nyitott rendelés',
                        orderId: o.id.startsWith('#') ? o.id : '#' + o.id,
                        customerName: o.shippingName || o.billingName || profile.name,
                        address: o.fullAddress || o.address || '',
                        phone: o.shippingPhone || o.billingPhone || '',
                        courier: o.deliveryInfo ? `${o.deliveryInfo.courier} (${o.deliveryInfo.runDate})` : 'Még nincs terítésbe osztva',
                        company: o.deliveryInfo?.company || '',
                        isUncollected: o.deliveryInfo?.isUncollected || false,
                        failReason: o.deliveryInfo?.failReason || '',
                        responsibility: '',
                        isPartial: false,
                        statusText: o.deliveryInfo?.isUncollected ? 'Meghiúsult' : (o.isInDelivery ? 'Terítésben' : 'Nyitott rendelés'),
                        statusColor: o.deliveryInfo?.isUncollected ? '#dc2626' : (o.isInDelivery ? '#2563eb' : '#64748b'),
                        codAmount: o.codAmount || 0,
                        isCOD: o.isCOD,
                        note: o.note || ''
                    });
                }
            }
        });
    }

    function parseEventTimestamp(dateStr) {
        if (!dateStr) return 0;
        if (typeof dateStr === 'string') {
            const clean = dateStr.replace(/[.\s]+/g, '-').replace(/-+$/, '').trim();
            const parts = clean.split('-');
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10);
                const d = parseInt(parts[2], 10);
                if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y >= 2020 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                    return Date.UTC(y, m - 1, d);
                }
            }
            const dt = new Date(dateStr);
            if (!isNaN(dt.getTime())) return dt.getTime();
        }
        return 0;
    }

    return events.sort((a, b) => {
        const tsA = parseEventTimestamp(a.runDate);
        const tsB = parseEventTimestamp(b.runDate);
        if (tsB !== tsA) return tsB - tsA;
        return String(b.runDate).localeCompare(String(a.runDate));
    });
}
