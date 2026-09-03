// js/services/shopifyApiService.js
// Shopify Élő API Szolgáltatás és Modell Átalakító

import { 
    cleanName, 
    cleanAddress, 
    fixHungarianAccents, 
    checkAddressValidity, 
    generateDefaultReference, 
    ShopifyParser 
} from './shopify.js';
import { formatHungarianPhoneNumber } from '../utils/phoneFormatter.js';

export const ShopifyApiService = {
    // 1. Kapcsolati státusz ellenőrzése
    async checkStatus() {
        try {
            const res = await fetch('/api/shopify/status');
            if (!res.ok) throw new Error('Nem sikerült lekérni a státuszt');
            return await res.json();
        } catch (err) {
            console.error('[ShopifyApiService checkStatus]', err);
            return { connected: false, error: err.message };
        }
    },

    // 2. Élő rendelések lekérése a helyi backend közvetítésével
    async fetchLiveOrders({ status = 'any', fulfillment_status = 'any', limit = 250 } = {}) {
        try {
            const params = new URLSearchParams({ status, fulfillment_status, limit, _t: Date.now().toString() });
            const res = await fetch(`/api/shopify/orders?${params.toString()}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const isStaticHost = window.location.hostname.includes('github.io');
                const errMsg = isStaticHost 
                    ? 'A közvetlen Shopify API szinkronhoz a helyi szerver szükséges: http://localhost:8080/ (GitHub Pages statikus tárhelyen az API proxy nem fut)'
                    : (errorData.error || `Szerver hiba (${res.status})`);
                throw new Error(errMsg);
            }
            const data = await res.json();
            return {
                success: true,
                rawOrders: data.orders || [],
                ordersCount: data.ordersCount || 0
            };
        } catch (err) {
            console.warn('[ShopifyApiService fetchLiveOrders]', err.message);
            return {
                success: false,
                error: err.message,
                rawOrders: [],
                ordersCount: 0
            };
        }
    },

    // 2b. Egyedi rendelés teljesítése (Fulfillment) közvetlenül a Shopify-ban
    async fulfillOrder({ orderId, shopifyId, notifyCustomer = true, trackingNumber = '', trackingCompany = 'Pannon XP' } = {}) {
        try {
            const res = await fetch('/api/shopify/fulfill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    shopifyId,
                    notifyCustomer,
                    trackingNumber,
                    trackingCompany
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Nem sikerült teljesíteni a rendelést.');
            }
            return data;
        } catch (err) {
            console.error('[ShopifyApiService fulfillOrder]', err);
            throw err;
        }
    },

    // 2c. Csoportos rendelés teljesítés (Bulk Fulfillment) a Shopify-ban
    async bulkFulfillOrders({ orders, notifyCustomer = true } = {}) {
        try {
            const res = await fetch('/api/shopify/bulk-fulfill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orders,
                    notifyCustomer
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Nem sikerült a csoportos teljesítés.');
            }
            return data;
        } catch (err) {
            console.error('[ShopifyApiService bulkFulfillOrders]', err);
            throw err;
        }
    },

    // 2d. Shopify Címkék (Tags) Frissítése (pl. sela megr. hozzáadása / levétele)
    async updateOrderTags({ orderId, shopifyId, addTag = '', removeTag = '' } = {}) {
        try {
            const res = await fetch('/api/shopify/update-tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    shopifyId,
                    addTag,
                    removeTag
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Nem sikerült frissíteni a címkéket.');
            }
            return data;
        } catch (err) {
            console.error('[ShopifyApiService updateOrderTags]', err);
            throw err;
        }
    },

    // 2e. Csoportos Címke Frissítés
    async bulkUpdateOrderTags({ orders, addTag = '', removeTag = '' } = {}) {
        try {
            const res = await fetch('/api/shopify/update-tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orders,
                    addTag,
                    removeTag
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Nem sikerült a csoportos címkefrissítés.');
            }
            return data;
        } catch (err) {
            console.error('[ShopifyApiService bulkUpdateOrderTags]', err);
            throw err;
        }
    },

    // 2f. Személyes Átvétel (Ready for pickup) Átállítása a Shopify-ban
    async markReadyForPickup({ orderId, shopifyId, notifyCustomer = true } = {}) {
        try {
            const res = await fetch('/api/shopify/ready-for-pickup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    shopifyId,
                    notifyCustomer
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Nem sikerült az átvehető státusz beállítása.');
            }
            return data;
        } catch (err) {
            console.error('[ShopifyApiService markReadyForPickup]', err);
            throw err;
        }
    },

    async bulkMarkReadyForPickup({ orders, notifyCustomer = true } = {}) {
        try {
            const res = await fetch('/api/shopify/ready-for-pickup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orders,
                    notifyCustomer
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Nem sikerült a csoportos átvehető státusz beállítása.');
            }
            return data;
        } catch (err) {
            console.error('[ShopifyApiService bulkMarkReadyForPickup]', err);
            throw err;
        }
    },

    // 3. Egyetlen Shopify API rendelési objektum átalakítása az app belső rendelési modelljére
    convertApiOrderToInternalOrder(apiOrder) {
        if (!apiOrder) return null;

        const orderNum = apiOrder.name || `#${apiOrder.id}`;
        const customer = apiOrder.customer || {};
        const defaultAddr = customer.default_address || {};
        const shippingAddr = apiOrder.shipping_address || apiOrder.billing_address || defaultAddr || {};
        const billingAddr = apiOrder.billing_address || apiOrder.shipping_address || defaultAddr || {};

        const cleanZip = (shippingAddr.zip || '').replace(/['"]/g, '').trim();
        const cleanCity = cleanName(shippingAddr.city || '').trim();
        let shippingAddressParts = [cleanZip, cleanCity].filter(Boolean);

        const rawAddressLines = [shippingAddr.address1, shippingAddr.address2].filter(Boolean).join(' ') || '';
        let street = cleanAddress(rawAddressLines);
        street = street.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

        let fullShippingAddress = cleanAddress([
            cleanZip,
            cleanCity,
            street
        ].filter(Boolean).join(', '));

        const shippingPhone = formatHungarianPhoneNumber(shippingAddr.phone || billingAddr.phone || customer.phone || '');
        const billingPhone = formatHungarianPhoneNumber(billingAddr.phone || shippingPhone);

        const shippingName = cleanName(
            shippingAddr.name || 
            `${shippingAddr.first_name || ''} ${shippingAddr.last_name || ''}`.trim() || 
            billingAddr.name ||
            `${billingAddr.first_name || ''} ${billingAddr.last_name || ''}`.trim() || 
            `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
            'Ismeretlen'
        );

        const billingName = cleanName(
            billingAddr.name || 
            `${billingAddr.first_name || ''} ${billingAddr.last_name || ''}`.trim() || 
            shippingName
        );

        let shippingCompany = fixHungarianAccents(shippingAddr.company || billingAddr.company || '');
        if (shippingCompany && (shippingCompany.trim().toLowerCase() === shippingName.toLowerCase())) {
            shippingCompany = cleanName(shippingCompany);
        }

        const tags = apiOrder.tags || '';
        const tagsLower = tags.toLowerCase();
        const hasSelaOrdered = tagsLower.includes('sela megr') || tagsLower.includes('sela');
        const hasPxpTag = tagsLower.includes('pannonxp') || tagsLower.includes('pxp');
        const hasLabelTag = tagsLower.includes('címke') || tagsLower.includes('cimke') || tagsLower.includes('label') || tagsLower.includes('nyomtatva') || tagsLower.includes('feladva') || tagsLower.includes('pxp kész') || tagsLower.includes('pxp_kesz');

        // Szállítmányra / Anyagra váró címkék (pl. "spc szállítmányra vár", "profilra vár", "tr szállítmányra vár")
        const rawTagsList = tags.split(',').map(t => t.trim()).filter(Boolean);
        const waitingTags = rawTagsList.filter(tag => {
            const tLower = tag.toLowerCase();
            return (
                tLower.includes('vár') ||
                tLower.includes('var') ||
                tLower.includes('szállítmány') ||
                tLower.includes('szallitmany')
            ) && !tLower.includes('számla') && !tLower.includes('dijbek');
        });
        const hasWaitingTag = waitingTags.length > 0;

        const shippingLinesRaw = apiOrder.shipping_lines || [];
        const shippingLinesStr = shippingLinesRaw.map(s => ((s.title || '') + ' ' + (s.code || '')).toLowerCase()).join(' ');
        const pickupTitle = shippingLinesRaw[0] ? (shippingLinesRaw[0].title || shippingLinesRaw[0].code || '') : '';

        // Személyes / Store Pickup felismerése (Pick up in store, Budapesti üzlet, személyes tag stb.)
        const isPickup = tagsLower.includes('személyes') || 
                         tagsLower.includes('szemelyes') || 
                         tagsLower.includes('pickup') || 
                         tagsLower.includes('raktári átvétel') || 
                         tagsLower.includes('boltban átvétel') || 
                         /üzlet|bolt|pickup|raktár|személyes|helyszíni|store pickup/i.test(shippingLinesStr) ||
                         (!apiOrder.shipping_address && shippingLinesRaw.length > 0);

        const hasManualPickupTag = tagsLower.includes('személyes') || 
                                   tagsLower.includes('szemelyes') || 
                                   tagsLower.includes('raktári átvétel') || 
                                   tagsLower.includes('boltban átvétel');

        // Ready for pickup felismerése (átvételre kész) - Manuális 'személyes' tag esetén alapból kész (zöld bolt)
        const isReadyForPickup = isPickup && (
            hasManualPickupTag ||
            apiOrder.is_ready_for_pickup === true ||
            tagsLower.includes('ready for pickup') || 
            tagsLower.includes('ready_for_pickup') || 
            tagsLower.includes('átvehető') || 
            tagsLower.includes('atveheto') || 
            tagsLower.includes('átvételre kész') || 
            tagsLower.includes('atvetelre kesz') ||
            (apiOrder.fulfillment_status && apiOrder.fulfillment_status.toLowerCase() === 'ready_for_pickup')
        );

        const financialStatus = (apiOrder.financial_status || '').toLowerCase();
        const fulfillmentStatus = (apiOrder.fulfillment_status || 'unfulfilled').toLowerCase();
        const paymentGateways = (apiOrder.payment_gateway_names || []).map(g => String(g).toLowerCase());
        
        let isBankDeposit = paymentGateways.some(g => g.includes('bank deposit') || g.includes('bank_deposit') || g.includes('banki utalás') || g.includes('utalás'));
        let isPaid = (financialStatus === 'paid');
        const totalAmount = parseFloat(apiOrder.current_total_price || apiOrder.total_price) || 0;
        const outstandingBalance = parseFloat(apiOrder.current_total_outstanding || apiOrder.total_outstanding || (isPaid ? 0 : totalAmount)) || 0;

        // Törölt / Lemondott rendelés ellenőrzése
        let isCancelled = !!apiOrder.cancelled_at || financialStatus === 'voided' || financialStatus === 'refunded';

        // Szállítási díj és Budapest ellenőrzés
        const shippingFee = parseFloat(apiOrder.total_shipping_price_set?.shop_money?.amount || (shippingLinesRaw[0] && shippingLinesRaw[0].price) || 0);
        const cityLower = cleanCity.toLowerCase();
        const isBudapest = cityLower === 'budapest' || cityLower.includes('budapest') || /^(1\d{3})$/.test(cleanZip);

        // Viszonteladó tag felismerése (nem kell díjbekérő, nem kell számla figyelmeztetés)
        const isReseller = tagsLower.includes('viszontelad') || tagsLower.includes('viszonterlad');

        // Rossz szállítási mód felismerése: Nem törölt, nem teljesített, nem személyes átvétel, nem Budapest, de a szállítási díj pontosan 2300 Ft
        const hasBadShipping = !isCancelled && fulfillmentStatus !== 'fulfilled' && !isPickup && !isBudapest && Math.round(shippingFee) === 2300;

        // Számla ki hiány ellenőrzése (csak ha nem törölt a rendelés ÉS NEM viszonteladó)
        // Személyes átvétel esetén CSAK AKKOR kell előre számlázni, ha már kifizette (pl. bankkártya). Ha utánvétes/helyszíni fizetés, nem írjuk ki!
        const hasInvoiceTag = tagsLower.includes('számla ki') || tagsLower.includes('szamla ki');
        const isPickupUnpaid = isPickup && !isPaid;
        const hasNoInvoice = !isCancelled && !isReseller && !hasInvoiceTag && !isPickupUnpaid;

        // 250.000 Ft feletti nem fizetett kiszállításos rendelés díjbekérő ellenőrzése (csak ha nem törölt ÉS NEM viszonteladó)
        const hasProformaTag = tagsLower.includes('dijbek.ki') || tagsLower.includes('díjbek.ki') || tagsLower.includes('dijbekero ki') || tagsLower.includes('díjbekérő ki');
        const needsProforma = !isCancelled && !isReseller && totalAmount > 250000 && !isPaid && !isPickup && !hasProformaTag && !hasInvoiceTag;
        const waitingProforma = !isCancelled && !isReseller && hasProformaTag && !hasInvoiceTag;

        // Hibák gyűjtése
        let errors = [];

        if (!isCancelled) {
            // 0. Rossz szállítási díj hiba
            if (hasBadShipping) {
                errors.push({
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'shipping_fee',
                    title: "Rossz Szállítási Díj!",
                    desc: `A szállítási cím nem Budapest (${cleanCity || 'Vidéki cím'}), de a szállítási díj csak 2.300 Ft (9.900 Ft helyett)!`
                });
            }

            // 0b. Díjbekérő szükséges (250e+ Ft) hiba
            if (needsProforma) {
                errors.push({
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'needs_proforma',
                    title: "Díjbek szükséges (250e+ Ft)",
                    desc: `250.000 Ft feletti nem fizetett kiszállításos rendelés (${new Intl.NumberFormat('hu-HU').format(totalAmount)} Ft). Küldd ki a díjbekérőt és add hozzá a "díjbek.ki" taget!`
                });
            }

            // 0c. Fulfilled ellenőrzés
            if (fulfillmentStatus === 'fulfilled') {
                errors.push({
                    id: Math.random().toString(36).substr(2, 9),
                    title: "Már teljesítve!",
                    desc: "Ez egy fulfilled rendelés, biztos újra ki akarod küldeni?"
                });
            }

            // 1. Számla ki ellenőrzés
            if (hasNoInvoice) {
                errors.push({
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'no_invoice',
                    title: "Hiányzó Számla",
                    desc: `Nincs "számla ki" tag, számla legyen kiállítva! Számlázási név: ${billingName}`
                });
            }
        }

        // 1b. Removed tétel ellenőrzés
        if (tags.toLowerCase().includes('removed')) {
            errors.push({
                id: Math.random().toString(36).substr(2, 9),
                title: "Törölt tétel!",
                desc: "Törölt tétel van a megrendelésben, kérlek ellenőrizd le a Shopifyban!"
            });
        }

        // 2. Utalás ellenőrzés
        if (isBankDeposit && !isPaid) {
            const formattedTotal = new Intl.NumberFormat('hu-HU').format(totalAmount);
            errors.push({
                id: Math.random().toString(36).substr(2, 9),
                title: "Függő Utalás",
                desc: `Utalást várunk: ${formattedTotal} Ft , Számlázási név: ${billingName} , Szállítási név: ${shippingName}`
            });
        }

        // 3. Utánvét kalkuláció
        const notes = (apiOrder.note || '').toLowerCase();
        let isCOD = false;
        let codAmount = 0;

        const cleanNotes = notes
            .replace(/\b\d{4}[. -/]+\d{1,2}[. -/]+\d{1,2}(?!\d)\.?/g, '') // YYYY.MM.DD
            .replace(/\b\d{1,2}[.-/]\d{1,2}(?!\d)\.?/g, ''); // MM.DD

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

                if (!/ut[aá]nv[eé]t|\buv/i.test(notes) && noteCodAmount === null) {
                    errors.push({
                        id: Math.random().toString(36).substr(2, 9),
                        type: 'cod',
                        shopifyAmount: outstandingBalance,
                        noteAmount: 0,
                        title: "Lappangó Utánvét!",
                        desc: `Shopify szerint van utánvét, de a Notes üres. Kérdéses összeg: ${outstandingBalance} Ft`
                    });
                } else if (noteCodAmount !== null) {
                    if (Math.abs(outstandingBalance - noteCodAmount) <= 10) {
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

        // Tételek és Törölt (Removed) tételek feldolgozása
        const items = [];
        const removedItems = [];

        (apiOrder.line_items || []).forEach(item => {
            const rawItemName = item.title || item.name || '';
            const formattedName = ShopifyParser.formatItemName(rawItemName);
            const origQty = parseInt(item.quantity) || 0;
            const curQty = item.current_quantity !== undefined ? parseInt(item.current_quantity) : origQty;
            const fulfillableQty = item.fulfillable_quantity !== undefined ? parseInt(item.fulfillable_quantity) : curQty;
            const price = parseFloat(item.price) || 0;

            // Ha a tétel törölve lett a rendelésből (current_quantity === 0)
            if (curQty === 0 && origQty > 0) {
                removedItems.push({
                    name: formattedName,
                    originalQty: origQty,
                    qty: 0,
                    price: price,
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
                    existing.fulfillableQty = (existing.fulfillableQty || 0) + fulfillableQty;
                } else {
                    items.push({
                        name: formattedName,
                        qty: curQty,
                        originalQty: origQty,
                        fulfillableQty: fulfillableQty,
                        isQuantityModified: curQty !== origQty,
                        price: price,
                        sku: item.sku || '',
                        variantTitle: item.variant_title || '',
                        imageUrl: item.image_url || null
                    });
                }
            }
        });

        // Ha nincs benne egyetlen aktív kiszedendő tétel sem (minden ki lett törölve belőle):
        const isCompletelyRemoved = items.length === 0 && (removedItems.length > 0 || (apiOrder.line_items || []).length > 0);
        const isRefundedAndEmpty = (financialStatus === 'refunded' || totalAmount === 0) && items.length === 0;

        // Törölt / Lemondott / Teljesen Kiürített rendelés ellenőrzése
        if (isCompletelyRemoved || isRefundedAndEmpty) {
            isCancelled = true;
        }

        const hasRemovedItems = removedItems.length > 0 || tagsLower.includes('removed') || (apiOrder.current_total_price && parseFloat(apiOrder.current_total_price) < parseFloat(apiOrder.total_price));
        const isPartialFulfillment = fulfillmentStatus === 'partial';

        const orderObj = {
            id: orderNum,
            shopifyId: apiOrder.id,
            internalId: Math.random().toString(36).substr(2, 9),
            shippingName: shippingName,
            billingName: billingName,
            address: cleanAddress(shippingAddressParts.join(', ')),
            fullAddress: fullShippingAddress,
            zip: cleanZip,
            city: cleanCity,
            address1: street,
            address2: shippingAddr.address2 || '',
            countryCode: shippingAddr.country_code || 'HU',
            shippingCompany: shippingCompany,
            shippingPhone: shippingPhone,
            billingPhone: billingPhone,
            email: (apiOrder.email || apiOrder.customer?.email || '').toLowerCase().trim(),
            customerEmail: (apiOrder.email || apiOrder.customer?.email || '').toLowerCase().trim(),
            customerId: apiOrder.customer?.id || null,
            tags: tags,
            isReseller: isReseller,
            hasSelaOrdered: hasSelaOrdered,
            hasPxpTag: hasPxpTag,
            hasLabelTag: hasLabelTag,
            isPxpReady: hasPxpTag && hasLabelTag,
            isPxpPending: hasPxpTag && !hasLabelTag,
            waitingTags: waitingTags,
            hasWaitingTag: hasWaitingTag,
            needsSelaDispatch: !isCancelled && fulfillmentStatus !== 'fulfilled' && !isPickup && !hasPxpTag && !hasSelaOrdered && !hasWaitingTag && !hasBadShipping,
            isPickup: isPickup,
            pickupTitle: pickupTitle,
            isReadyForPickup: isReadyForPickup,
            hasBadShipping: !isCancelled && hasBadShipping,
            hasInvoiceTag: hasInvoiceTag,
            hasProformaTag: hasProformaTag,
            hasNoInvoice: !isCancelled && hasNoInvoice,
            needsProforma: !isCancelled && needsProforma,
            waitingProforma: !isCancelled && waitingProforma,
            hasRemovedItems: hasRemovedItems,
            isPartialFulfillment: isPartialFulfillment,
            isCancelled: isCancelled,
            shippingFee: shippingFee,
            isBudapest: isBudapest,
            isBankDeposit: isBankDeposit,
            isPaid: isPaid,
            isCOD: isCOD,
            codAmount: codAmount,
            totalAmount: totalAmount,
            originalTotalAmount: parseFloat(apiOrder.total_price) || totalAmount,
            orderDate: apiOrder.created_at || '',
            isPlannedDelay: false,
            isFulfilled: !isCancelled && fulfillmentStatus === 'fulfilled',
            fulfillmentStatus: isCancelled ? 'cancelled' : fulfillmentStatus,
            financialStatus: financialStatus,
            note: apiOrder.note || '',
            errors: isCancelled ? [] : errors,
            items: items,
            removedItems: removedItems
        };

        // Címvalidáció (csak ha NEM személyes átvétel)
        if (!isPickup && checkAddressValidity(orderObj)) {
            const parsedStreet = orderObj.address1 || street || '';
            let reasonDesc = `A szállítási cím hiányos ("${parsedStreet || 'Üres'}"). Kérlek ellenőrizd!`;
            if (!parsedStreet || !/\d+/.test(parsedStreet)) {
                reasonDesc = `A szállítási címből hiányzik a házszám ("${parsedStreet || 'Üres utca'}"). Kérlek hívd fel a vevőt a házszámért!`;
            }
            orderObj.errors.push({
                id: Math.random().toString(36).substr(2, 9),
                type: 'address',
                title: "Hiányos Szállítási Cím (Házszám)!",
                desc: reasonDesc
            });
        }

        // Profilok összevonása
        if (orderObj.tags.toLowerCase().includes('prof.ök.')) {
            const profiles = orderObj.items.filter(item => ShopifyParser.isProfile(item.name));
            if (profiles.length > 0) {
                orderObj.items = orderObj.items.filter(item => !ShopifyParser.isProfile(item.name));
                let totalPrice = profiles.reduce((sum, item) => sum + (item.price * item.qty), 0);
                orderObj.items.push({
                    name: "Összekészített profilok",
                    qty: 1,
                    price: totalPrice,
                    isCollapsedProfile: true,
                    subItems: profiles
                });
            }
        }

        // Tételek rendezése súly szerint
        orderObj.items.sort((a, b) => {
            const typeA = ShopifyParser.getItemTypeWeight(a.name);
            const typeB = ShopifyParser.getItemTypeWeight(b.name);
            return typeA - typeB;
        });

        // PannonXP referenciaszám generálása
        orderObj.pxp_referencia = generateDefaultReference(orderObj, 40);

        return orderObj;
    },

    // 4. Teljes lista konvertálása
    convertApiOrders(apiOrders) {
        if (!Array.isArray(apiOrders)) return [];
        return apiOrders.map(o => ShopifyApiService.convertApiOrderToInternalOrder(o)).filter(Boolean);
    },

    // 5. Shopify Megjegyzés (Note) Frissítése
    async updateOrderNote({ orderId, shopifyId, note }) {
        const response = await fetch('/api/shopify/update-note', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId,
                shopifyId,
                note
            })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Hiba történt a megjegyzés mentése közben.');
        }

        return data;
    }
};
