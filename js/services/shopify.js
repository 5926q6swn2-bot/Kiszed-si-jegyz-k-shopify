import { formatHungarianPhoneNumber } from '../utils/phoneFormatter.js?v=150';
import { PannonXPService } from './pannonxp.js?v=150';

export function fixHungarianAccents(str) {
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

export function cleanItemNameForMapping(name) {
    if (!name) return '';
    
    // 1. Kisbetűsítés a konzisztenciához
    let cleaned = name.toLowerCase();
    
    // 2. Méretek eltávolítása
    cleaned = cleaned
        // Zárójeles méretek eltávolítása, pl. (278x60cm), (280 cm), (280x122)
        .replace(/\([\d\s*xXcm\-+.,/]*\)/g, '')
        // Standalone méretek pl. 278x60cm, 280 x 120 cm, 280x120
        .replace(/\b\d+\s*(x|\*)\s*\d+\s*(cm|m|mm)?\b/g, '')
        // Standalone mértékegységes számok pl. 280 cm, 60cm
        .replace(/\b\d+(\.\d+)?\s*(cm|m|mm)\b/g, '')
        // Konkrét ismert méretek önmagukban
        .replace(/\b(280|278|244|122|60)\b/g, '');
        
    // 3. Írásjelek, kötőjelek, perjelek cseréje szóközre
    cleaned = cleaned.replace(/[\-\/\u2013\u2014.,()]/g, ' ');
    
    // 4. Szavakra bontás, üresek szűrése
    const words = cleaned.split(/\s+/).filter(Boolean);
    
    // 5. Szavak ábécé szerinti rendezése
    words.sort();
    
    // 6. Összefűzés egyetlen szóközökkel elválasztott stringgé
    return words.join(' ');
}

export function generateDefaultReference(order, maxLen = 50) {
    const orderId = order.id || '';
    const cleanOrderId = orderId.replace(/^#/, '');
    const prefix = cleanOrderId ? `${cleanOrderId} ` : '';
    const availableLen = maxLen - prefix.length;
    
    if (availableLen <= 0) return cleanOrderId.substring(0, maxLen);
    
    const mappings = PannonXPService.getNormalizedProductMappings() || {};
    const parts = [];
    let hasUnmapped = false;
    
    (order.items || []).forEach(item => {
        const cleanedName = cleanItemNameForMapping(item.name);
        const mapping = mappings[cleanedName];
        const abbrev = mapping ? (typeof mapping === 'object' ? mapping.abbrev : mapping) : null;
        const categoryId = mapping ? (typeof mapping === 'object' ? mapping.categoryId : null) : null;
        
        if (abbrev) {
            if (categoryId === 'cat_acoustic') {
                const rules = PannonXPService.getPackagingRules ? PannonXPService.getPackagingRules() : null;
                const categories = rules ? (rules.categories || []) : [];
                const catAcoustic = categories.find(c => c.id === 'cat_acoustic');
                const maxQty = catAcoustic ? (catAcoustic.maxQty || 5) : 5;
                const qty = item.qty;
                const pkgsCount = Math.ceil(qty / maxQty);
                const base = Math.floor(qty / pkgsCount);
                const remainder = qty % pkgsCount;
                
                const packageSizes = [];
                for (let i = 0; i < pkgsCount; i++) {
                    packageSizes.push(i < remainder ? base + 1 : base);
                }
                parts.push(`${abbrev} ${packageSizes.join('-')}`);
            } else {
                parts.push(`${abbrev}${item.qty}`);
            }
        } else {
            hasUnmapped = true;
            // Nem generálunk automatikus félkész rövidítést, hanem kérdőjellel jelöljük a hiányt
            parts.push(`?${item.qty}`);
        }
    });
    
    if (hasUnmapped) {
        order.pxp_has_unmatched = true;
    }
    
    let itemsStr = parts.join(', ');
    let finalRef = prefix + itemsStr;
    
    // Add space after every dot if not already followed by space
    finalRef = finalRef.replace(/\.(?!\s)/g, '. ');
    
    if (finalRef.length > maxLen) {
        return cleanOrderId ? `${cleanOrderId} kérdezd Mátét` : 'kérdezd Mátét';
    }
    
    return finalRef;
}

export const ShopifyParser = {
    generateDefaultReference: generateDefaultReference,
    

    isProfile(name) {
        return /profil/i.test(name) && name !== "Összekészített profilok";
    }
    ,
    
    formatItemName(name) {
        if (!name) return '';
        
        // Ha profil, kivesszük a méreteket, mert nincsenek összekészítve
        if (ShopifyParser.isProfile(name)) {
            let cleanName = name.replace(/\b\d+(\.\d+)?\s*(cm|m|mm)\b/gi, '')
                                .replace(/\b\d+\s*x\s*\d+\b/gi, '')
                                .replace(/\(\s*\)/g, '')
                                .trim();
            // Esetleges extra szóközök takarítása
            return cleanName.replace(/\s{2,}/g, ' ');
        }

        // Egyéb panelek esetén méret rövidítés (elnyeli a már meglévő cm szócskát is, hogy ne legyen cmcm)
        let formatted = name.replace(/280\s*x\s*122\s*(cm)?/gi, '280 cm');
        formatted = formatted.replace(/244\s*x\s*122\s*(cm)?/gi, '244 cm');
        
        return formatted;
    }
    ,
    
    
    getItemTypeWeight(name) {
        const lowerName = name.toLowerCase();
        if (/(panel|pvc|spc|akusztikus|pb-|lj-|ps-)/.test(lowerName)) return 1;
        if (/(ragasztó)/.test(lowerName)) return 2;
        return 3;
    }
    ,
    
    parse(rows, existingOrders) {
        const orderMap = new Map();
        const skippedOrderIds = new Set();

        rows.forEach(row => {
            const orderNum = row['Name'];
            if (!orderNum) return;

            // Clean common mobile keyboard accent mistakes
            const keysToFix = [
                'Shipping City', 'Shipping Street', 'Shipping Address1', 'Shipping Address2', 
                'Shipping Name', 'Billing Name', 'Billing City', 'Billing Street', 
                'Billing Address1', 'Billing Address2', 'Notes', 'Lineitem name'
            ];
            keysToFix.forEach(key => {
                if (row[key]) {
                    row[key] = fixHungarianAccents(row[key]);
                }
            });
            
            // Duplikáció szűrés (ha már a meglévő orders tömbben benne van, kihagyjuk)
            if (existingOrders.some(o => o.id === orderNum)) {
                skippedOrderIds.add(orderNum);
                return;
            }

            const rawItemName = row['Lineitem name'] || '';
            const itemName = ShopifyParser.formatItemName(rawItemName);
            const itemQty = parseInt(row['Lineitem quantity']) || 0;
            const itemPriceStr = row['Lineitem price'] || "0";
            const itemPrice = parseFloat(itemPriceStr) || 0;
            
            if (!orderMap.has(orderNum)) {
                let shippingAddress = [
                    row['Shipping Zip'], 
                    row['Shipping City']
                ].filter(Boolean);

                let street = row['Shipping Street'] || [row['Shipping Address1'], row['Shipping Address2']].filter(Boolean).join(', ');
                let fullShippingAddress = [
                    row['Shipping Zip'],
                    row['Shipping City'],
                    street
                ].filter(Boolean);
                
                const shippingPhone = formatHungarianPhoneNumber(row['Shipping Phone'] || '');
                const billingPhone = formatHungarianPhoneNumber(row['Billing Phone'] || shippingPhone);

                // Hibák gyűjtése
                let errors = [];

                // 0. Fulfilled ellenőrzés
                const fulfillmentStatus = (row['Fulfillment Status'] || '').toLowerCase();
                if (fulfillmentStatus === 'fulfilled') {
                    errors.push({
                        id: Math.random().toString(36).substr(2, 9),
                        title: "Már teljesítve!",
                        desc: "Ez egy fulfilled rendelés, biztos újra ki akarod küldeni?"
                    });
                }

                // 1. Számla ki ellenőrzés
                const tags = row['Tags'] || '';
                const shippingName = row['Shipping Name'] || 'Ismeretlen';
                const billingName = row['Billing Name'] || shippingName;
                if (!tags.toLowerCase().includes('számla ki')) {
                    errors.push({
                        id: Math.random().toString(36).substr(2, 9),
                        title: "Hiányzó Számla",
                        desc: `Nincs "számla ki" tag, számla legyen kiállítva! Számlázási név: ${billingName}`
                    });
                }

                // 1b. Removed tétel ellenőrzés
                if (tags.toLowerCase().includes('removed')) {
                    errors.push({
                        id: Math.random().toString(36).substr(2, 9),
                        title: "Törölt tétel!",
                        desc: "Törölt tétel van a megrendelésben, kérlek ellenőrizd le a Shopifyban!"
                    });
                }

                // 2. Utalás ellenőrzés (Bank Deposit & not paid)
                const financialStatus = (row['Financial Status'] || '').toLowerCase();
                const paymentMethod = (row['Payment Method'] || '').toLowerCase();
                const totalAmount = parseFloat(row['Total']) || 0;
                let isBankDeposit = paymentMethod.includes('bank deposit');
                let isPaid = (financialStatus === 'paid');
                
                if (isBankDeposit && !isPaid) {
                    const formattedTotal = new Intl.NumberFormat('hu-HU').format(totalAmount);
                    errors.push({
                        id: Math.random().toString(36).substr(2, 9),
                        title: "Függő Utalás",
                        desc: `Utalást várunk: ${formattedTotal} Ft , Számlázási név: ${billingName} , Szállítási név: ${shippingName}`
                    });
                }

                // 3. Utánvét Logika (Csak ha NEM bank deposit)
                const outstandingBalance = parseFloat(row['Outstanding Balance']) || 0;
                const shippingCost = parseFloat(row['Shipping']) || 0;
                const notes = (row['Notes'] || '').toLowerCase();
                const createdAtStr = row['Created at'] || '';
                let isCOD = false;
                let codAmount = 0;

                // Clean dates from notes so they don't get matched as amounts (e.g. 06.16)
                const cleanNotes = notes
                    .replace(/\b\d{4}[. -/]+\d{1,2}[. -/]+\d{1,2}(?!\d)\.?/g, '') // YYYY.MM.DD
                    .replace(/\b\d{1,2}[.-/]\d{1,2}(?!\d)\.?/g, ''); // MM.DD or DD.MM

                let noteCodAmount = null;
                const matchBefore = cleanNotes.match(/(\d[\d\s\.]*?)\s*(?:ft|huf)?\s*(?:ut[aá]nv[eé]t|\buv)/i);
                const matchAfter = cleanNotes.match(/(?:ut[aá]nv[eé]t|\buv).*?(\d[\d\s\.]*)/i);
                const matchFt = cleanNotes.match(/(\d(?:[\d .]*\d)?)\s*ft/i);

                if (matchAfter) {
                    noteCodAmount = parseInt(matchAfter[1].replace(/[\s\.]/g, ''));
                } else if (matchFt) {
                    noteCodAmount = parseInt(matchFt[1].replace(/[\s\.]/g, ''));
                } else if (matchBefore) {
                    noteCodAmount = parseInt(matchBefore[1].replace(/[\s\.]/g, ''));
                }

                if (!isBankDeposit) {
                    if (outstandingBalance > 0) {
                        isCOD = true;
                        codAmount = outstandingBalance;
                        
                        // LAPPANGÓ UTÁNVÉT FIGYELMEZTETÉS
                        if (!/ut[aá]nv[eé]t|\buv/i.test(notes) && noteCodAmount === null) {
                            errors.push({
                                id: Math.random().toString(36).substr(2, 9),
                                title: "Lappangó Utánvét!",
                                desc: `Shopify szerint van utánvét, de a Notes üres. Kérdéses összeg: ${outstandingBalance} Ft`
                            });
                        } else if (noteCodAmount !== null) {
                            
                            // Speciális 250k szabály
                            const shippingGross = Math.round(shippingCost * 1.27);
                            let expectedAmount = outstandingBalance;
                            
                            // 10 Ft kerekítési tolerancia a sima egyenlegre vagy a szállítás nélküli egyenlegre
                            if (Math.abs(outstandingBalance - noteCodAmount) <= 10 ||
                                (outstandingBalance > 250000 && Math.abs((outstandingBalance - shippingGross) - noteCodAmount) <= 10)) {
                                codAmount = noteCodAmount; // Helyes! Nincs hiba.
                            } else {
                                // Shopify CSV bug: order edit után az Outstanding Balance nem frissül helyesen.
                                // Két eset: ÁFA exkluzív (hozzáadva) vagy inkluzív (már benne van az árban)
                                const subtotal = parseFloat(row['Subtotal']) || 0;
                                const tax1Name = row['Tax 1 Name'] || '';
                                const vatMatch = tax1Name.match(/(\d+(?:\.\d+)?)\s*%/);
                                const vatRate = vatMatch ? parseFloat(vatMatch[1]) / 100 : 0.27;
                                const calculatedExclusive = Math.round((subtotal + shippingCost) * (1 + vatRate));
                                const calculatedInclusive = Math.round(subtotal + shippingCost);
                                const matchesCalc = Math.abs(calculatedExclusive - noteCodAmount) <= 10 || Math.abs(calculatedInclusive - noteCodAmount) <= 10;
                                if (matchesCalc && Math.abs(outstandingBalance - noteCodAmount) > 10) {
                                    codAmount = noteCodAmount; // CSV bug, notes helyes, nincs hiba
                                } else {
                                    errors.push({
                                        id: Math.random().toString(36).substr(2, 9),
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
                            title: "Fizetési Anomália",
                            desc: `A shopify szerint nincs utánvét, de a Notes-ban szerepel egy összeg: ${noteCodAmount} Ft`
                        });
                    }
                }

                orderMap.set(orderNum, {
                    id: orderNum,
                    internalId: Math.random().toString(36).substr(2, 9), 
                    shippingName: shippingName,
                    billingName: billingName,
                    address: shippingAddress.join(', '),
                    fullAddress: fullShippingAddress.join(', '),
                    shippingPhone: shippingPhone,
                    billingPhone: billingPhone,
                    tags: tags,
                    isBankDeposit: isBankDeposit,
                    isPaid: isPaid,
                    isCOD: isCOD,
                    codAmount: codAmount,
                    orderDate: createdAtStr,
                    isPlannedDelay: false,
                    isFulfilled: fulfillmentStatus === 'fulfilled',
                    errors: errors,
                    items: []
                });
            }

            const lineFulfillmentStatus = (row['Lineitem fulfillment status'] || '').toLowerCase();
            if (itemQty > 0 && itemName) {
                const order = orderMap.get(orderNum);
                // Ha a rendelés "fulfilled" de a tétel "pending" → el lett távolítva a rendelésből, kihagyjuk
                if (!(order.isFulfilled && lineFulfillmentStatus === 'pending')) {
                    const existingItem = order.items.find(i => i.name === itemName);
                    if (existingItem) {
                        existingItem.qty += itemQty;
                    } else {
                        order.items.push({
                            name: itemName,
                            qty: itemQty,
                            price: itemPrice
                        });
                    }
                }
            }
        });

        // Hozzáadás a meglévőkhöz
        const newOrders = Array.from(orderMap.values());
        const finalNewOrders = [];
        
        newOrders.forEach(order => {
            if (order.tags.toLowerCase().includes('prof.ök.')) {
                const profiles = order.items.filter(item => ShopifyParser.isProfile(item.name));
                if (profiles.length > 0) {
                    order.items = order.items.filter(item => !ShopifyParser.isProfile(item.name));
                    let totalPrice = profiles.reduce((sum, item) => sum + (item.price * item.qty), 0);
                    order.items.push({
                        name: "Összekészített profilok",
                        qty: 1,
                        price: totalPrice,
                        isCollapsedProfile: true,
                        subItems: profiles
                    });
                }
            }
            
            order.items.sort((a, b) => {
                const typeA = ShopifyParser.getItemTypeWeight(a.name);
                const typeB = ShopifyParser.getItemTypeWeight(b.name);
                return typeA - typeB;
            });
            
            order.pxp_referencia = generateDefaultReference(order, 40);
            
            finalNewOrders.push(order);
        });

        return {
            newOrders: finalNewOrders,
            skippedOrderIds: skippedOrderIds
        };
    }
};
