// js/services/exporter.js
// Exportáló szolgáltatás a terítések és elszámolások CSV-be mentéséhez
import { CustomDialog } from '../utils/dialog.js';
import { getPaymentDetails } from '../utils/paymentUtils.js';

export const ExporterService = {
    exportAccountingToCsv: async function(runs, onlyPending = false) {
        if (!runs || runs.length === 0) {
            await CustomDialog.alert("Nincs exportálható adat a megadott szűresi feltételekkel!", "Nincs adat", "warning");
            return;
        }

        const headers = [
            "Kiszállítás Dátuma",
            "Szállító Cég",
            "Szállító Neve",
            "Rendelésszám",
            "Vevő Neve",
            "Fizetés Módja",
            "Függő KP (futártól) (Ft)",
            "Kártyás utalásra vár (szállítótól) (Ft)",
            "Státusz",
            "Megjegyzés"
        ];

        const csvRows = [];
        csvRows.push('\ufeff' + headers.join(";"));
        const rows = [];

        runs.forEach(run => {
            const reasons = run.uncollectedReasons || {};
            const partialOrders = run.partialOrders || {};

            run.orders.forEach(o => {
                const pd = getPaymentDetails(run, o);

                if (onlyPending && !pd.isPending) {
                    return;
                }

                let failReason = "";
                const orderIdKey = String(o.id);
                if (pd.isUncollected) {
                    failReason = reasons[o.id] || reasons[orderIdKey] || "";
                } else if (pd.isPartial) {
                    const po = partialOrders[o.id] || partialOrders[orderIdKey];
                    if (po) {
                        failReason = po.comment || "";
                    }
                }

                rows.push({
                    date: run.date,
                    company: run.company || "-",
                    courier: run.courier || "-",
                    orderId: o.id,
                    customerName: o.shippingName || "—",
                    paymentMethodText: pd.methodText,
                    pendingKp: pd.pendingKp,
                    pendingCard: pd.pendingCard + pd.pendingBank,
                    orderStatus: pd.statusText,
                    failReason: failReason
                });
            });
        });

        if (rows.length === 0) {
            await CustomDialog.alert("Nincs exportálható adat a megadott szűrési feltételekkel!", "Nincs adat", "warning");
            return;
        }

        // Csoportosítás szállítócég szerint ABC sorrendben
        rows.sort((a, b) => a.company.localeCompare(b.company, 'hu'));

        // Mezők tisztítása a CSV formátumhoz
        const clean = (val) => {
            if (val === undefined || val === null) return "";
            let str = String(val);
            if (str.includes(";") || str.includes("\n") || str.includes('"')) {
                str = str.replace(/"/g, '""');
                return `"${str}"`;
            }
            return str;
        };

        let currentCompany = null;
        let companyKpSum = 0;
        let companyCardSum = 0;

        const appendSubtotal = (companyName) => {
            if (companyName === null) return;
            const subtotalRow = [
                `${companyName} ÖSSZESEN`,
                "",
                "",
                "",
                "",
                "",
                companyKpSum,
                companyCardSum,
                "",
                ""
            ];
            csvRows.push(subtotalRow.join(";"));
        };

        rows.forEach(row => {
            if (row.company !== currentCompany) {
                if (currentCompany !== null) {
                    appendSubtotal(currentCompany);
                    // Üres sor az elválasztáshoz
                    csvRows.push(";;;;;;;;;");
                }
                currentCompany = row.company;
                companyKpSum = 0;
                companyCardSum = 0;
            }

            companyKpSum += row.pendingKp;
            companyCardSum += row.pendingCard;

            const rowData = [
                clean(row.date),
                clean(row.company),
                clean(row.courier),
                clean(row.orderId),
                clean(row.customerName),
                clean(row.paymentMethodText),
                row.pendingKp,
                row.pendingCard,
                clean(row.orderStatus),
                clean(row.failReason)
            ];

            csvRows.push(rowData.join(";"));
        });

        if (currentCompany !== null) {
            appendSubtotal(currentCompany);
        }

        // Letöltés indítása
        const csvContent = csvRows.join("\r\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().substring(0, 10);
        link.setAttribute("href", url);
        link.setAttribute("download", `elszamolas_export_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // --- SELA SZÁLLÍTÓI EXPORT SEGÉDFÜGGVÉNYEK ÉS GENERÁLÓ ---

    // 1. Termék besorolása Sela kategóriákba (egyszeri számlálás tételenként)
    classifyItemForSela: function(item) {
        return classifyItemForSela(item);
    },

    // 2. Másodlagos telefonszám kinyerése (cím 2, megjegyzés, stb.)
    extractPhones: function(order) {
        return extractPhones(order);
    },

    // 3. Utca megtisztítása a kinyert telefonszámtól
    cleanStreetFromPhone: function(street, extractedPhone) {
        return cleanStreetFromPhone(street, extractedPhone);
    },

    // 4. Díjbekérős (díjbek.ki) utánvét detektálása a Notes-ból
    detectProformaCod: function(order) {
        return detectProformaCod(order);
    },

    // 5. Egyedi Sela sor adat előkészítése a 12 oszlophoz
    prepareSelaRowData: function(order, customCodMap = {}) {
        return prepareSelaRowData(order, customCodMap);
    },

    // 6. CSV szöveg legenerálása a 12 oszlopos sorokból
    generateSelaCsv: function(rows) {
        return generateSelaCsv(rows);
    },

    // 7. CSV fájl böngészős letöltése
    downloadSelaCsv: function(csvContent, filename) {
        downloadSelaCsv(csvContent, filename);
    },

    // Szállítói (Sela) Rendelések Exportálása CSV-be (közvetlen vagy előnézetből)
    exportSelaOrdersToCsv: async function(orders, customCodMap = {}) {
        if (!orders || orders.length === 0) {
            await CustomDialog.alert("Nincs exportálható rendelés kijelölve!", "Figyelmeztetés", "warning");
            return;
        }

        const rows = orders.map(o => prepareSelaRowData(o, customCodMap));
        const csvContent = generateSelaCsv(rows);
        downloadSelaCsv(csvContent);
    }
};

// --- ÖNÁLLÓAN EXPORTÁLT FÜGGVÉNYEK (Unit tesztekhez és közvetlen modulhíváshoz) ---

export function classifyItemForSela(item) {
    if (!item) return 'other';
    const name = String(item.name || '').trim();
    const sku = String(item.sku || '').trim();
    const text = `${name} ${sku}`.toLowerCase();

    // 0. Explicit kizárások (mamut és fix all nem ragasztóként számolandó)
    if (text.includes('mamut') || text.includes('fix all')) {
        return 'other';
    }

    // 1. Tapadóhíd
    if (text.includes('tapadóhíd') || text.includes('tapadohid')) {
        return 'tapadohid';
    }

    // 2. Ragasztó / Szilikon (kivéve: mamut, fix all)
    if (text.includes('ragasztó') || text.includes('ragaszto') || 
        text.includes('t-rex') || text.includes('trex') || 
        text.includes('szilikon') || text.includes('silicon') || 
        text.includes('hpr')) {
        return 'adhesive';
    }

    // 3. Profilok / Skirting
    if (text.includes('profil') || text.includes('skirting')) {
        return 'profile';
    }

    // 4. Akusztikus falpanelek (aku, akusztikus, wide akusztikus, wide acoustic, akupanel)
    if (text.includes('akusztik') || text.includes('akusztikus') || 
        text.includes('wide akusztikus') || text.includes('wide acoustic') || 
        text.includes('akupanel') || /\baku\b/i.test(text)) {
        return 'acoustic';
    }

    // 5. PVC / SPC falpanelek és padlózatok (akusztikus kizárva!)
    // Kulcsszavak: pb, tr, lj, pb-tr, spc, pvc, padlózat, padlozat, padló, padlo, falpanel, falburkolat
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

    if (hasPvcSpcFloor) {
        return 'pvc_spc_floor';
    }

    return 'other';
}

export function extractPhones(order) {
    if (!order) return { mainPhone: '', secondaryPhone: '', fullPhoneText: '', rawExtracted: '' };

    const mainRaw = String(order.shippingPhone || '').trim();
    const mainPhoneDigits = mainRaw.replace(/\D/g, '');

    const searchTexts = [
        order.address2 || '',
        order.address1 || '',
        order.note || '',
        order.billingPhone || ''
    ];

    // Szigorú regex a valós magyar telefonszámokhoz
    // Csak a valódi körzetszám / mobil előhívókat egyezteti (20, 30, 70, 50, 1, [2-9]\d)
    // Irányítószám (pl. 3600) vagy házszám (pl. 36. ajtó) NEM egyezik, mert minimum 8-11 számjegy szükséges
    const phonePattern = /(?:(?:\+|00)36|06|\b36)[\s\-\/\.]*(?:(?:20|30|70|50|1|[2-9]\d)[\s\-\/\.]*\d{3}[\s\-\/\.]*\d{3,4}|(?:20|30|70|50|1|[2-9]\d)[\s\-\/\.]*\d{6,7})|\b(?:20|30|70|50)[\s\-\/\.]*\d{3}[\s\-\/\.]*\d{3,4}\b/gi;

    let secondaryPhone = '';
    let rawExtracted = '';

    for (const text of searchTexts) {
        if (!text) continue;
        const matches = text.match(phonePattern);
        if (matches) {
            for (const match of matches) {
                const digits = match.replace(/\D/g, '');
                // Legalább 8 számjegy (vezetékes) vagy 9-11 számjegy (mobil)
                const normMatch = digits.replace(/^(0036|36|06)/, '');
                const normMain = mainPhoneDigits.replace(/^(0036|36|06)/, '');

                if (digits.length >= 8 && digits.length <= 12 && normMatch !== normMain) {
                    let formatted = match.trim();
                    if (/^\d+$/.test(formatted)) {
                        if (digits.startsWith('06') || digits.startsWith('36')) {
                            const withoutPrefix = digits.replace(/^(06|36)/, '');
                            formatted = `+36 ${withoutPrefix.slice(0, 2)} ${withoutPrefix.slice(2, 5)} ${withoutPrefix.slice(5)}`;
                        } else if (digits.length === 9) {
                            formatted = `+36 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
                        }
                    }
                    secondaryPhone = formatted;
                    rawExtracted = match;
                    break;
                }
            }
        }
        if (secondaryPhone) break;
    }

    const mainPhone = mainRaw;
    let fullPhoneText = mainPhone;
    if (secondaryPhone) {
        fullPhoneText = mainPhone ? `${mainPhone} / ${secondaryPhone}` : secondaryPhone;
    }

    return {
        mainPhone,
        secondaryPhone,
        fullPhoneText,
        rawExtracted
    };
}

export function cleanStreetFromPhone(street, rawExtractedPhone) {
    if (!street || !rawExtractedPhone) return street || '';
    let cleaned = street.replace(rawExtractedPhone, '').replace(/\b(?:tel|telefon|mobil)[:\s]*/gi, '');
    return cleaned.replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',').trim().replace(/^[,\s]+|[,\s]+$/g, '');
}

export function detectProformaCod(order) {
    const tags = (order.tags || '').toLowerCase();
    const isProforma = tags.includes('díjbek.ki') || tags.includes('dijbek.ki') || tags.includes('dijbekero ki') || tags.includes('díjbekérő ki');
    
    const totalAmount = Math.round(order.totalAmount || order.outstandingBalance || 0);
    const originalCod = Math.round(order.codAmount || order.outstandingBalance || 0);
    
    if (!isProforma) {
        return {
            isProforma: false,
            suggestedCod: originalCod,
            originalCod: originalCod,
            diff: 0,
            note: order.note || ''
        };
    }

    const note = order.note || '';
    let suggestedCod = null;
    let detectedDiff = null;

    // Dátumok törlése a megjegyzésből, hogy ne zavarják a számfelismerést
    const cleanNote = note
        .replace(/\b\d{4}[.\-\/]+\d{1,2}[.\-\/]+\d{1,2}(?!\d)\.?/g, '')
        .replace(/\b\d{1,2}[.\-\/]\d{1,2}(?!\d)\.?/g, '');

    // Számok kigyűjtése a megjegyzésből
    const numberMatches = cleanNote.match(/\d[\d\s\.]*/g) || [];
    const numbersInNote = numberMatches
        .map(n => parseInt(n.replace(/[\s\.]/g, ''), 10))
        .filter(n => !isNaN(n) && n > 0);

    // Tipikus előleg levonási összegek: 20.000, 25.000, 30.000 Ft
    const commonDiffs = [20000, 25000, 30000];

    // 1. Prioritás: A Notes-ban közvetlenül szerepel a csökkentett végösszeg (total - 20k/25k/30k)
    for (const diff of commonDiffs) {
        const expectedNewCod = totalAmount - diff;
        const matched = numbersInNote.find(n => Math.abs(n - expectedNewCod) <= 50);
        if (matched) {
            suggestedCod = matched;
            detectedDiff = diff;
            break;
        }
    }

    // 2. Prioritás: A Notes-ban maga a levonandó előleg (20.000, 25.000 vagy 30.000 Ft) szerepel
    if (suggestedCod === null) {
        for (const diff of commonDiffs) {
            const matchedDiff = numbersInNote.find(n => Math.abs(n - diff) <= 50);
            if (matchedDiff) {
                suggestedCod = Math.max(0, totalAmount - diff);
                detectedDiff = diff;
                break;
            }
        }
    }

    // 3. Prioritás: Explicit "uv: [összeg]" vagy "utánvét: [összeg]" kifejezés
    if (suggestedCod === null) {
        const uvMatch = cleanNote.match(/(?:ut[aá]nv[eé]t|\buv)[:\s]*(\d[\d\s\.]*)/i);
        if (uvMatch) {
            const parsedUv = parseInt(uvMatch[1].replace(/[\s\.]/g, ''), 10);
            if (!isNaN(parsedUv) && parsedUv > 0) {
                suggestedCod = parsedUv;
                detectedDiff = totalAmount - parsedUv;
            }
        }
    }

    const hasReliableNoteCod = (suggestedCod !== null);

    return {
        isProforma: true,
        suggestedCod: suggestedCod, // null ha nincs megbízható összeg a Notes-ban!
        originalCod: originalCod,
        diff: detectedDiff,
        hasReliableNoteCod: hasReliableNoteCod,
        needsManualCod: !hasReliableNoteCod,
        note: note
    };
}

export function isPendingBankDeposit(order) {
    if (!order) return false;
    
    // 1. Explicit zászlók az API konverterből
    if (order.isBankDeposit && !order.isPaid) return true;
    
    // 2. Errors lista vizsgálata
    if (Array.isArray(order.errors) && order.errors.some(e => e.title === 'Függő Utalás' || e.type === 'pending_bank_deposit')) {
        return true;
    }
    
    // 3. Payment gateways vizsgálata
    const gateways = (order.paymentGateways || order.payment_gateway_names || order.rawOrder?.payment_gateway_names || []).map(g => String(g).toLowerCase());
    const isBank = gateways.some(g => g.includes('bank deposit') || g.includes('bank_deposit') || g.includes('banki utalás') || g.includes('átutalás') || g.includes('utalás'));
    const isPaid = order.isPaid === true || (order.financialStatus || order.financial_status || '').toLowerCase() === 'paid';
    
    if (isBank && !isPaid) return true;

    // 4. Címkék vizsgálata
    const tags = (order.tags || '').toLowerCase();
    if ((tags.includes('függő utalás') || tags.includes('fuggo utalas') || tags.includes('utalásra vár')) && !isPaid) {
        return true;
    }

    return false;
}

export function prepareSelaRowData(order, customCodMap = {}) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}.${mm}.${dd}`;

    const isPendingBank = isPendingBankDeposit(order);

    let pvcSpcFloorQty = 0;
    let acousticQty = 0;
    let adhesiveQty = 0;
    let profileQty = 0;
    let tapadohidQty = 0;

    (order.items || []).forEach(item => {
        const qty = parseInt(item.qty, 10) || 0;
        if (qty <= 0) return;

        // Összekészített profilok felbontása al-tételekre
        if (item.isCollapsedProfile && Array.isArray(item.subItems) && item.subItems.length > 0) {
            item.subItems.forEach(sub => {
                const subQty = parseInt(sub.qty, 10) || 0;
                profileQty += subQty;
            });
            return;
        }

        const cat = classifyItemForSela(item);
        if (cat === 'tapadohid') {
            tapadohidQty += qty;
        } else if (cat === 'adhesive') {
            adhesiveQty += qty;
        } else if (cat === 'profile') {
            profileQty += qty;
        } else if (cat === 'acoustic') {
            acousticQty += qty;
        } else if (cat === 'pvc_spc_floor') {
            pvcSpcFloorQty += qty;
        }
    });

    const phones = extractPhones(order);
    const cleanedStreet = cleanStreetFromPhone(order.address1 || order.address || '', phones.rawExtracted);

    const proformaInfo = detectProformaCod(order);
    let finalCodAmount = 0;
    let needsManualCod = false;

    if (customCodMap && customCodMap[order.id] !== undefined) {
        finalCodAmount = parseInt(customCodMap[order.id], 10) || 0;
    } else if (proformaInfo.isProforma) {
        if (proformaInfo.hasReliableNoteCod) {
            finalCodAmount = proformaInfo.suggestedCod;
        } else {
            finalCodAmount = null; // KÖTELEZŐ KÉZZEL MEGADNI A LETÖLTÉS ELŐTT!
            needsManualCod = true;
        }
    } else if (order.isCOD) {
        finalCodAmount = Math.round(order.codAmount || 0);
    } else {
        finalCodAmount = 0;
    }

    // 7. oszlop: Szigorúan a Shipping Name (címzett neve) használandó!
    const customerShippingName = String(
        order.shippingName || 
        order.shipping_name || 
        (order.shipping_address && (order.shipping_address.name || `${order.shipping_address.first_name || ''} ${order.shipping_address.last_name || ''}`.trim())) || 
        ''
    ).trim();

    // 12. oszlop formázása:
    // Ha van utánvét: "45 000 Ft" (vagy "45 000 Ft, 3db tapadóhíd")
    // Ha nincs utánvét: "nincs utánvét" (vagy "nincs utánvét, 3db tapadóhíd")
    // Ha díjbekérős és nincs biztos összeg a Notes-ban: figyelmeztetés!
    let col12Text = '';
    const tapadohidText = tapadohidQty > 0 ? `${tapadohidQty}db tapadóhíd` : '';

    if (needsManualCod) {
        col12Text = tapadohidText ? `⚠️ ADJ MEG UTÁNVÉTET!, ${tapadohidText}` : '⚠️ ADJ MEG UTÁNVÉTET!';
    } else if (finalCodAmount !== null && finalCodAmount > 0) {
        const formattedCod = `${new Intl.NumberFormat('hu-HU').format(finalCodAmount).replace(/\u00a0/g, ' ')} Ft`;
        col12Text = tapadohidText ? `${formattedCod}, ${tapadohidText}` : formattedCod;
    } else {
        col12Text = tapadohidText ? `nincs utánvét, ${tapadohidText}` : 'nincs utánvét';
    }

    return {
        orderId: order.id,
        col1_date: dateStr,
        col2_orderId: order.id,
        col3_zip: order.zip || '',
        col4_city: order.city || '',
        col5_street: cleanedStreet,
        col6_phone: phones.fullPhoneText,
        col7_customerName: customerShippingName,
        col8_pvcSpcFloorQty: pvcSpcFloorQty,
        col9_acousticQty: acousticQty,
        col10_adhesivesQty: adhesiveQty,
        col11_profilesQty: profileQty,
        col12_codAndTapadohid: col12Text,
        rawCodAmount: finalCodAmount,
        needsManualCod: needsManualCod,
        tapadohidQty: tapadohidQty,
        isProforma: proformaInfo.isProforma,
        proformaInfo: proformaInfo,
        isPendingBankTransfer: isPendingBank,
        order: order
    };
}

export function generateSelaCsv(rows) {
    const headers = [
        "Dátum",
        "Rendelésszám",
        "Irányítószám",
        "Település",
        "Utca és házszám",
        "Telefonszám",
        "Címzett Neve",
        "PVC/SPC falpanel és padlózatok (db)",
        "Akusztikus falpanelek (db)",
        "Ragasztók, szilikonok (db)",
        "Profilok (db)",
        "Utánvét összege / tapadóhíd"
    ];

    const clean = (val) => {
        if (val === undefined || val === null) return "";
        let str = String(val);
        if (str.includes(";") || str.includes("\n") || str.includes('"')) {
            str = str.replace(/"/g, '""');
            return `"${str}"`;
        }
        return str;
    };

    const csvLines = [];
    csvLines.push('\ufeff' + headers.join(";"));

    rows.forEach(r => {
        const line = [
            clean(r.col1_date),
            clean(r.col2_orderId),
            clean(r.col3_zip),
            clean(r.col4_city),
            clean(r.col5_street),
            clean(r.col6_phone),
            clean(r.col7_customerName),
            clean(r.col8_pvcSpcFloorQty),
            clean(r.col9_acousticQty),
            clean(r.col10_adhesivesQty),
            clean(r.col11_profilesQty),
            clean(r.col12_codAndTapadohid)
        ];
        csvLines.push(line.join(";"));
    });

    return csvLines.join("\r\n");
}

export function downloadSelaCsv(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().substring(0, 10);
    const targetFilename = filename || `sela_szallitoi_export_${timestamp}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", targetFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

