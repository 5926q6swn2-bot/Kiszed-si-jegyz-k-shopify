// tests/unit_tests.js
// Standalone Node.js unit tesztek a címtisztításra, névtisztításra, telefonszám formázásra és fizetési státuszokra

import { formatHungarianPhoneNumber } from '../js/utils/phoneFormatter.js';
import { getPaymentDetails, getRunPaymentTotals } from '../js/utils/paymentUtils.js';

function fixHungarianAccents(str) {
    if (!str) return '';
    return str
        .replace(/à/g, 'á').replace(/À/g, 'Á')
        .replace(/â/g, 'á').replace(/Â/g, 'Á')
        .replace(/ä/g, 'á').replace(/Ä/g, 'Á')
        .replace(/è/g, 'é').replace(/È/g, 'É')
        .replace(/ê/g, 'é').replace(/Ê/g, 'É')
        .replace(/ë/g, 'é').replace(/Ë/g, 'É')
        .replace(/ì/g, 'í').replace(/Ì/g, 'Í')
        .replace(/î/g, 'í').replace(/Î/g, 'Í')
        .replace(/ï/g, 'í').replace(/Ï/g, 'Í')
        .replace(/ò/g, 'ó').replace(/Ò/g, 'Ó')
        .replace(/ô/g, 'ó').replace(/Ô/g, 'Ó')
        .replace(/õ/g, 'ó').replace(/Õ/g, 'Ó')
        .replace(/ù/g, 'ú').replace(/Ù/g, 'Ú')
        .replace(/û/g, 'ú').replace(/Û/g, 'Ú')
        .replace(/Bànhidai/gi, 'Bánhidai');
}

function cleanName(name) {
    if (!name) return '';
    let cleaned = fixHungarianAccents(name);
    cleaned = cleaned.replace(/\(.*?\)/g, '');
    cleaned = cleaned.replace(/[^a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ\s\-]/g, '');
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    let words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length >= 4) {
        words.pop();
        cleaned = words.join(' ');
    }
    return cleaned;
}

function cleanAddress(address) {
    if (!address) return '';
    let cleaned = fixHungarianAccents(address).trim();
    cleaned = cleaned.replace(/\b(\d+(?:\/\d+)*)\s+\1\b/g, '$1');
    let parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
    let uniqueParts = [];
    for (let i = 0; i < parts.length; i++) {
        let current = parts[i];
        current = current.replace(/(\b\w+)(?:\/\1)+/gi, '$1');
        current = current.replace(/(\b\d+)\/(\d+)(?:\/\2)+/g, '$1/$2');
        if (uniqueParts.length > 0) {
            let last = uniqueParts[uniqueParts.length - 1];
            if (last.endsWith(current) || current.endsWith(last)) {
                if (current.endsWith(last)) {
                    uniqueParts[uniqueParts.length - 1] = current;
                }
                continue;
            }
        }
        uniqueParts.push(current);
    }
    return uniqueParts.join(', ');
}

let passed = 0;
let failed = 0;

function assertEqual(testName, actual, expected) {
    if (actual === expected) {
        console.log(`✅ PASSED: [${testName}]`);
        passed++;
    } else {
        console.error(`❌ FAILED: [${testName}] -> Elvárt: "${expected}", Kaptuk: "${actual}"`);
        failed++;
    }
}

console.log("=== KISZEDÉSI JEGYZÉK - UNIT TESZTEK ===\n");

// 1. Ékezet javítás tesztek
assertEqual("fixHungarianAccents - hibás ékezet", fixHungarianAccents("lorànd Bànhidai"), "loránd Bánhidai");

// 2. Névtisztító tesztek
assertEqual("cleanName - raktár törlés", cleanName("Kovács Béla (raktár)"), "Kovács Béla");
assertEqual("cleanName - special chars", cleanName("Szabó 123 Janos."), "Szabó Janos");
assertEqual("cleanName - 4 ik névtag levágása", cleanName("Kovács István Tamás Gábor"), "Kovács István Tamás");

// 3. Címtisztító tesztek
assertEqual("cleanAddress - deduplikált házszám", cleanAddress("Fő utca 30/3 30/3"), "Fő utca 30/3");
assertEqual("cleanAddress - perjel ismétlődés", cleanAddress("Fő utca 38/38/38/38"), "Fő utca 38");

// 4. Telefonszám formázó tesztek
assertEqual("formatHungarianPhoneNumber - 0630", formatHungarianPhoneNumber("06301234567"), "+36301234567");
assertEqual("formatHungarianPhoneNumber - 0036", formatHungarianPhoneNumber("0036301234567"), "+36301234567");
assertEqual("formatHungarianPhoneNumber - spaces", formatHungarianPhoneNumber("+36 30 123 4567"), "+36301234567");

// 5. Kártyás és Függő Utánvét Elszámolási Tesztek (#3010 & #3058)
const testRun = {
    id: "run_test_1",
    date: "2026-07-05",
    paymentMethods: {
        "3010": "card",
        "3058": { cash: 10000, card: 35000 }
    },
    paymentStatusMap: {
        "3010": "pending",
        "3058": { cash: "received", card: "pending" }
    },
    orders: [
        { id: "3010", isCOD: true, codAmount: 25000, shippingName: "Teszt Vevő 1" },
        { id: "3058", isCOD: true, codAmount: 45000, shippingName: "Teszt Vevő 2" }
    ]
};

const pd3010 = getPaymentDetails(testRun, testRun.orders[0]);
assertEqual("#3010 - pendingCard", pd3010.pendingCard, 25000);
assertEqual("#3010 - isPending", pd3010.isPending, true);
assertEqual("#3010 - isSettled", pd3010.isSettled, false);
assertEqual("#3010 - statusText", pd3010.statusText, "Kártyás utalásra vár");

const pd3058 = getPaymentDetails(testRun, testRun.orders[1]);
assertEqual("#3058 - pendingKp", pd3058.pendingKp, 0);
assertEqual("#3058 - pendingCard", pd3058.pendingCard, 35000);
assertEqual("#3058 - isPending", pd3058.isPending, true);
assertEqual("#3058 - isSettled", pd3058.isSettled, false);
assertEqual("#3058 - statusText", pd3058.statusText, "Kártyás utalásra vár");

const runTotals = getRunPaymentTotals(testRun);
assertEqual("runTotals - pendingCard", runTotals.pendingCard, 60000);
assertEqual("runTotals - hasPending", runTotals.hasPending, true);
assertEqual("runTotals - isFullySettled", runTotals.isFullySettled, false);

// 6. Legacy Firestore document test where statusMap was saved as 'received' but card transfer not settled
const legacyRun = {
    id: "run_legacy_1",
    date: "2026-07-03",
    isSettled: true,
    paymentMethods: { "3010": "card" },
    paymentStatusMap: { "3010": "received" },
    orders: [
        { id: "3010", isCOD: true, codAmount: 25000, shippingName: "Sipos Attila" }
    ]
};

const pdLegacy = getPaymentDetails(legacyRun, legacyRun.orders[0]);
assertEqual("legacyRun #3010 - forced pendingCard", pdLegacy.pendingCard, 25000);
assertEqual("legacyRun #3010 - forced isPending", pdLegacy.isPending, true);
assertEqual("legacyRun #3010 - statusText", pdLegacy.statusText, "Kártyás utalásra vár");

// 7. Csomagolási Algoritmus Unit Tesztek (Család-alapú összevonás & Ragasztó korlátok)
function testCalcPackages(categories, items) {
    const qtyMap = {};
    categories.forEach(c => qtyMap[c.id] = 0);
    let otherQty = 0;
    
    items.forEach(item => {
        const name = item.name.toLowerCase();
        let matchedCat = categories.find(c => name.includes(c.keyword || c.id));
        if (matchedCat) {
            qtyMap[matchedCat.id] += item.qty;
        } else {
            otherQty += item.qty;
        }
    });

    const packagesDetail = [];
    const groups = {};
    categories.forEach(cat => {
        if (cat.type === 'adhesive') return;
        const groupKey = cat.packagingGroup || cat.id;
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(cat);
    });

    for (const groupKey in groups) {
        const groupCats = groups[groupKey];
        const activeGroupCats = groupCats.filter(cat => (qtyMap[cat.id] || 0) > 0);
        if (activeGroupCats.length === 0) continue;

        const totalGroupQty = activeGroupCats.reduce((sum, cat) => sum + qtyMap[cat.id], 0);
        const maxPerPkg = Math.max(...activeGroupCats.map(cat => cat.maxQty || 5));
        const pkgsCount = Math.ceil(totalGroupQty / maxPerPkg);

        let totalGroupWeight = 0;
        activeGroupCats.forEach(cat => {
            const q = qtyMap[cat.id];
            if (cat.type === 'cards') {
                const r = cat.rules || {};
                const ruleW = r[q] ? r[q].weight : (q * (r[1] ? r[1].weight : 6.5));
                totalGroupWeight += ruleW;
            }
        });

        for (let i = 0; i < pkgsCount; i++) {
            packagesDetail.push({
                suly: parseFloat((totalGroupWeight / pkgsCount).toFixed(2)),
                description: "Panelburkolatok és kiegészítők"
            });
        }
    }

    const hasPanelWithGlueAllowed = categories.some(cat => {
        const qty = qtyMap[cat.id] || 0;
        if (qty === 0) return false;
        if (cat.type === 'adhesive') return false;
        return cat.allowAdhesiveInside === true;
    });

    const adhesiveCat = categories.find(c => c.type === 'adhesive') || { maxQty: 15, itemWeight: 0.5, boxWeight: 0.8 };
    const adhesiveQty = qtyMap['cat_adhesive'] || 0;
    const shouldGlueBeSeparate = !hasPanelWithGlueAllowed || adhesiveQty >= 7;

    if (!shouldGlueBeSeparate && packagesDetail.length > 0) {
        // Absorbed in panel box
    } else if (adhesiveQty > 0) {
        const maxPerPkg = adhesiveCat.maxQty || 15;
        const pkgsCount = Math.ceil(adhesiveQty / maxPerPkg);
        for (let i = 0; i < pkgsCount; i++) {
            packagesDetail.push({
                suly: parseFloat((adhesiveCat.boxWeight + (adhesiveQty / pkgsCount) * adhesiveCat.itemWeight).toFixed(2)),
                description: "Panelburkolatok és kiegészítők"
            });
        }
    }

    const totalWeight = packagesDetail.reduce((sum, p) => sum + p.suly, 0);
    return { packages: packagesDetail.length, weight: parseFloat(totalWeight.toFixed(2)) };
}

const testCats = [
    { id: 'cat_acoustic', type: 'cards', keyword: 'sima akusztikus', maxQty: 5, allowAdhesiveInside: true, packagingGroup: 'acoustic_family', rules: { 2: { weight: 13 } } },
    { id: 'cat_wide_acoustic', type: 'cards', keyword: 'wide akusztikus', maxQty: 5, allowAdhesiveInside: true, packagingGroup: 'acoustic_family', rules: { 2: { weight: 18 } } },
    { id: 'cat_spcwood', type: 'cards', keyword: 'spc wood', maxQty: 8, allowAdhesiveInside: false, packagingGroup: 'spc_family', rules: { 2: { weight: 36 } } },
    { id: 'cat_adhesive', type: 'adhesive', keyword: 'ragasztó', maxQty: 15, allowAdhesiveInside: false, itemWeight: 0.5, boxWeight: 0.8 }
];

// Test 1: Vegyes akupanel (2 sima + 2 wide + 1 ragasztó) -> 1 csomag (31kg)
const calcMixed = testCalcPackages(testCats, [
    { name: '2db sima akusztikus', qty: 2 },
    { name: '2db wide akusztikus', qty: 2 },
    { name: '1db ragasztó', qty: 1 }
]);
assertEqual("Mixed Akupanels - package count", calcMixed.packages, 1);
assertEqual("Mixed Akupanels - total weight", calcMixed.weight, 31);

// Test 2: SPC Padló + 1 ragasztó -> 2 csomag (SPC + külön ragasztó 1.3kg)
const calcSpc = testCalcPackages(testCats, [
    { name: '2db spc wood padló', qty: 2 },
    { name: '1db ragasztó', qty: 1 }
]);
assertEqual("SPC Padló + Glue - package count", calcSpc.packages, 2);
assertEqual("SPC Padló + Glue - total weight", calcSpc.weight, 37.3);

// Test 3: Akupanel + 8 db ragasztó -> 2 csomag (7-15 db külön doboz)
const calcGlue8 = testCalcPackages(testCats, [
    { name: '2db sima akusztikus', qty: 2 },
    { name: '8db ragasztó', qty: 8 }
]);
assertEqual("Akupanel + 8 Glues - package count", calcGlue8.packages, 2);
assertEqual("Akupanel + 8 Glues - total weight", calcGlue8.weight, 17.8);

// Test 4: Akupanel + 16 db ragasztó -> 3 csomag (16+ db 2 külön doboz)
const calcGlue16 = testCalcPackages(testCats, [
    { name: '2db sima akusztikus', qty: 2 },
    { name: '16db ragasztó', qty: 16 }
]);
assertEqual("Akupanel + 16 Glues - package count", calcGlue16.packages, 3);
assertEqual("Akupanel + 16 Glues - total weight", calcGlue16.weight, 22.6);

// --- Sanitize Abbreviation Tests ---
function sanitizeAbbreviation(abbrev) {
    if (!abbrev || typeof abbrev !== 'string') return '';
    let clean = abbrev.trim();
    if (!clean) return '';
    
    // 1. Vágjuk le a vessző vagy pluszjel utáni másodlagos tételeket (pl. 'Sonoma2, trex5')
    clean = clean.split(/[,;+]+/)[0].trim();
    
    // 2. Ha nem maga a ragasztó a termék, de tartalmaz ragasztó kulcsszót a végén (pl. 'Wson1trex1' vagy 'Wson1 trex1')
    if (!/^(trex|ragaszto|ragasztó|hpr)\d*$/i.test(clean)) {
        clean = clean.replace(/[\s\-_/]*(?:trex|ragaszto|ragasztó|hpr)\d*$/i, '').trim();
    }
    
    // 3. Vágjuk le a szóközzel elválasztott csomagosztásokat vagy darabszámokat (pl. 'Chicago 4-4-3', 'Pecan 3-3', 'Sonoma 2')
    clean = clean.replace(/\s+\d+(?:[\s\-_/]*\d+)*$/i, '').trim();
    
    // 4. Vágjuk le a közvetlenül a szó végére tapasztott számokat (pl. 'Wchicago2' -> 'Wchicago', 'Wson1' -> 'Wson', 'trex5' -> 'trex')
    clean = clean.replace(/[\s\-_/]*\d+(?:[\s\-_/]*\d+)*$/, '').trim();
    
    // 5. Záró írásjelek takarítása
    clean = clean.replace(/[\s\-_/:.,]+$/, '').trim();
    
    return clean;
}

assertEqual("Sanitize - Wson", sanitizeAbbreviation("Wson"), "Wson");
assertEqual("Sanitize - Wchicago2", sanitizeAbbreviation("Wchicago2"), "Wchicago");
assertEqual("Sanitize - Wson1trex1", sanitizeAbbreviation("Wson1trex1"), "Wson");
assertEqual("Sanitize - Wson1 trex1", sanitizeAbbreviation("Wson1 trex1"), "Wson");
assertEqual("Sanitize - Sonoma2, trex5", sanitizeAbbreviation("Sonoma2, trex5"), "Sonoma");
assertEqual("Sanitize - Chicago 4-4-3", sanitizeAbbreviation("Chicago 4-4-3"), "Chicago");
assertEqual("Sanitize - trex", sanitizeAbbreviation("trex"), "trex");
assertEqual("Sanitize - trex5", sanitizeAbbreviation("trex5"), "trex");
assertEqual("Sanitize - Vintage Oak", sanitizeAbbreviation("Vintage Oak"), "Vintage Oak");
assertEqual("Sanitize - Light Grey 2", sanitizeAbbreviation("Light Grey 2"), "Light Grey");
assertEqual("Sanitize - Wchicago24", sanitizeAbbreviation("Wchicago24"), "Wchicago");
assertEqual("Sanitize - Empty string", sanitizeAbbreviation(""), "");
assertEqual("Sanitize - Null", sanitizeAbbreviation(null), "");

// --- Shopify API Order Converter Tests ---
const mockApiOrder = {
    id: 123456789,
    name: "#3891",
    created_at: "2026-08-29T14:20:00Z",
    tags: "számla ki, Létai",
    financial_status: "paid",
    fulfillment_status: null,
    total_price: "45000.00",
    total_outstanding: "0.00",
    shipping_address: {
        first_name: "Péter",
        last_name: "Kovács (raktár)",
        address1: "Barátság útja",
        address2: "2/b. 1/19.",
        city: "Dunakeszi",
        zip: "2120",
        phone: "06301234567"
    },
    line_items: [
        { title: "Sima Akusztikus Falpanel 280x122cm", quantity: 4, price: "10000.00" },
        { title: "T-Rex ragasztó 310ml", quantity: 1, price: "5000.00" }
    ]
};

// Alapvető mező konverziók
const cleanedShippingName = cleanName(mockApiOrder.shipping_address.first_name + " " + mockApiOrder.shipping_address.last_name);
assertEqual("API Converter - Clean Name", cleanedShippingName, "Péter Kovács");

const rawAddress = [mockApiOrder.shipping_address.address1, mockApiOrder.shipping_address.address2].filter(Boolean).join(' ');
const cleanedStreet = cleanAddress(rawAddress);
assertEqual("API Converter - Clean Address", cleanedStreet, "Barátság útja 2/b. 19.");

const formattedPhone = formatHungarianPhoneNumber(mockApiOrder.shipping_address.phone);
assertEqual("API Converter - Phone Format", formattedPhone, "+36301234567");

// --- cleanItemNameForMapping Tests ---
function cleanItemNameForMapping(name) {
    if (!name) return '';
    let cleaned = name.toLowerCase();
    cleaned = cleaned.replace(/[\(\[\{][^\)\]\}]*(?:beérkezés|érkezés|erkezes|beerkezes|preorder|előrendelés|elorendeles|kiszállítás|átvehető)[^\)\]\}]*[\)\]\}]/gi, '');
    cleaned = cleaned
        .replace(/(?:várható\s+)?(?:beérkezés|érkezés|erkezes|beerkezes|preorder|előrendelés|elorendeles|kiszállítás|átvehető)\s*[:\s\-]*\d{1,4}[.\-\/]\d{1,2}(?:[.\-\/]\d{1,4})?(?:\s*-[tT]ől)?/gi, '')
        .replace(/(?:várható\s+)?(?:beérkezés|érkezés|erkezes|beerkezes|preorder|előrendelés|elorendeles)\s*[:\s\-]*/gi, '')
        .replace(/\b\d{1,2}[.\/]\d{1,2}(?:[.\/]\d{2,4})?\b/g, '');
    cleaned = cleaned
        .replace(/\([\d\s*xXcm\-+.,/]*\)/g, '')
        .replace(/\b\d+\s*(x|\*)\s*\d+\s*(cm|m|mm)?\b/g, '')
        .replace(/\b\d+(\.\d+)?\s*(cm|m|mm)\b/g, '')
        .replace(/\b(2800|2780|2750|2440|600|280|278|275|244|122|60)\b/g, '');
    cleaned = cleaned.replace(/[\-\/\u2013\u2014.,()\[\]{}:]/g, ' ');
    const words = cleaned.split(/\s+/).filter(Boolean);
    words.sort();
    return words.join(' ');
}

assertEqual("Item Mapping - Beérkezés és méret takarítás", 
    cleanItemNameForMapping("Prémium Akusztikus Falpanel - Wide Pecan (278x60cm) Beérkezés:08.27 - 278x60cm"), 
    "akusztikus falpanel pecan prémium wide");

assertEqual("Item Mapping - Zárójeles beérkezés", 
    cleanItemNameForMapping("Prémium Akusztikus Falpanel - Wide Pecan (278x60cm) (Beérkezés: 08.27)"), 
    "akusztikus falpanel pecan prémium wide");

assertEqual("Item Mapping - T-Rex ragasztó", 
    cleanItemNameForMapping("T-Rex Gold Panelragasztó"), 
    "gold panelragasztó rex t");

// --- Sela & PannonXP Logistics Tag Tests ---
function checkLogisticsStatus(tags, isPickup = false, isInDelivery = false, isFulfilled = false, isCancelled = false) {
    const tagsLower = (tags || '').toLowerCase();
    const hasSelaOrdered = tagsLower.includes('sela megr') || tagsLower.includes('sela');
    const hasPxpTag = tagsLower.includes('pannonxp') || tagsLower.includes('pxp');
    const needsSelaDispatch = !isCancelled && !isFulfilled && !isPickup && !isInDelivery && !hasPxpTag && !hasSelaOrdered;
    return { hasSelaOrdered, hasPxpTag, needsSelaDispatch };
}

const statusSela1 = checkLogisticsStatus("sela megr., viszonteladó");
assertEqual("Sela Tag - sela megr.", statusSela1.hasSelaOrdered, true);
assertEqual("Sela Tag - needsSelaDispatch false if sela megr.", statusSela1.needsSelaDispatch, false);

const statusPxp = checkLogisticsStatus("számla ki, PannonXP");
assertEqual("PXP Tag - PannonXP", statusPxp.hasPxpTag, true);
assertEqual("PXP Tag - needsSelaDispatch false if PannonXP", statusPxp.needsSelaDispatch, false);

const statusPending = checkLogisticsStatus("számla ki, viszonteladó");
assertEqual("Sela Pending - hasSelaOrdered false", statusPending.hasSelaOrdered, false);
assertEqual("Sela Pending - hasPxpTag false", statusPending.hasPxpTag, false);
assertEqual("Sela Pending - needsSelaDispatch true", statusPending.needsSelaDispatch, true);

const statusPickup = checkLogisticsStatus("számla ki", true, false, false, false);
assertEqual("Pickup - needsSelaDispatch false", statusPickup.needsSelaDispatch, false);

// --- Reseller (Viszonteladó) Invoice & Proforma Tests ---
function checkResellerFlags(tags, totalAmount = 300000, isPaid = false, isCancelled = false, isPickup = false) {
    const tagsLower = (tags || '').toLowerCase();
    const isReseller = tagsLower.includes('viszontelad') || tagsLower.includes('viszonterlad');
    const hasInvoiceTag = tagsLower.includes('számla ki') || tagsLower.includes('szamla ki');
    const hasNoInvoice = !isCancelled && !isReseller && !hasInvoiceTag;
    const hasProformaTag = tagsLower.includes('dijbek.ki') || tagsLower.includes('díjbek.ki') || tagsLower.includes('dijbekero ki') || tagsLower.includes('díjbekérő ki');
    const needsProforma = !isCancelled && !isReseller && totalAmount > 250000 && !isPaid && !isPickup && !hasProformaTag && !hasInvoiceTag;
    const waitingProforma = !isCancelled && !isReseller && hasProformaTag && !hasInvoiceTag;
    return { isReseller, hasNoInvoice, needsProforma, waitingProforma };
}

const resellerTest1 = checkResellerFlags("viszonteladó");
assertEqual("Reseller Flag - isReseller true", resellerTest1.isReseller, true);
assertEqual("Reseller - hasNoInvoice false (no invoice warning needed)", resellerTest1.hasNoInvoice, false);
assertEqual("Reseller - needsProforma false (no proforma needed)", resellerTest1.needsProforma, false);

const resellerTestTypo = checkResellerFlags("viszonterladó, Létai");
assertEqual("Reseller Typo - isReseller true", resellerTestTypo.isReseller, true);
assertEqual("Reseller Typo - hasNoInvoice false", resellerTestTypo.hasNoInvoice, false);
assertEqual("Reseller Typo - needsProforma false", resellerTestTypo.needsProforma, false);

const normalOrderTest = checkResellerFlags("Létai");
assertEqual("Normal Order - isReseller false", normalOrderTest.isReseller, false);
assertEqual("Normal Order - hasNoInvoice true without tag", normalOrderTest.hasNoInvoice, true);
assertEqual("Normal Order - needsProforma true for 300k unpaid", normalOrderTest.needsProforma, true);
assertEqual("Normal Order - waitingProforma false without tag", normalOrderTest.waitingProforma, false);

const proformaSentTest = checkResellerFlags("díjbek.ki");
assertEqual("Proforma Sent - needsProforma false", proformaSentTest.needsProforma, false);
assertEqual("Proforma Sent - waitingProforma true without szamla ki", proformaSentTest.waitingProforma, true);

const invoiceSentTest = checkResellerFlags("díjbek.ki, számla ki");
assertEqual("Invoice Sent - waitingProforma false with szamla ki", invoiceSentTest.waitingProforma, false);
assertEqual("Invoice Sent - hasNoInvoice false", invoiceSentTest.hasNoInvoice, false);

// --- Waiting for Shipment (Szállítmányra vár) Tag Tests ---
function extractWaitingTags(tags) {
    const rawTagsList = (tags || '').split(',').map(t => t.trim()).filter(Boolean);
    return rawTagsList.filter(tag => {
        const tLower = tag.toLowerCase();
        return (
            tLower.includes('vár') ||
            tLower.includes('var') ||
            tLower.includes('szállítmány') ||
            tLower.includes('szallitmany')
        ) && !tLower.includes('számla') && !tLower.includes('dijbek');
    });
}

const waitTags1 = extractWaitingTags("spc szállítmányra vár, számla ki, Létai");
assertEqual("Waiting Tags - count", waitTags1.length, 1);
assertEqual("Waiting Tags - exact tag text", waitTags1[0], "spc szállítmányra vár");

const waitTags2 = extractWaitingTags("profilra vár, tr szállítmányra vár");
assertEqual("Waiting Tags - multiple count", waitTags2.length, 2);
assertEqual("Waiting Tags - tag 1", waitTags2[0], "profilra vár");
assertEqual("Waiting Tags - tag 2", waitTags2[1], "tr szállítmányra vár");

const waitTagsNone = extractWaitingTags("számla ki, viszonteladó");
assertEqual("Waiting Tags - none", waitTagsNone.length, 0);

// --- Ready for Pickup (Személyes Átvétel Átvehető) Tests ---
function checkReadyForPickup(isPickup, tags, fulfillmentStatus = 'unfulfilled') {
    const tagsLower = (tags || '').toLowerCase();
    return isPickup && (
        tagsLower.includes('ready for pickup') || 
        tagsLower.includes('ready_for_pickup') || 
        tagsLower.includes('átvehető') || 
        tagsLower.includes('atveheto') || 
        tagsLower.includes('átvételre kész') || 
        tagsLower.includes('atvetelre kesz') ||
        (fulfillmentStatus && fulfillmentStatus.toLowerCase() === 'ready_for_pickup')
    );
}

assertEqual("Pickup - not ready", checkReadyForPickup(true, "számla ki"), false);
assertEqual("Pickup - ready via tag 'ready for pickup'", checkReadyForPickup(true, "ready for pickup, számla ki"), true);
assertEqual("Pickup - ready via tag 'átvehető'", checkReadyForPickup(true, "átvehető"), true);
assertEqual("Delivery - cannot be pickup ready", checkReadyForPickup(false, "ready for pickup"), false);

console.log(`\n=== EREDMÉNY: ${passed} sikeres, ${failed} hibás ===`);

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}

