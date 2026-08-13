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

console.log(`\n=== EREDMÉNY: ${passed} sikeres, ${failed} hibás ===`);

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
