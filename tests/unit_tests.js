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

console.log(`\n=== EREDMÉNY: ${passed} sikeres, ${failed} hibás ===`);

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
