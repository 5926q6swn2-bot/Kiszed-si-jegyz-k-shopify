// js/views/orderOverviewView.js
// Rendelésáttekintő (Shopify Order Hub) - Teljes Terítési / Járat Integráció (Kiszállítás dátuma, Futár), Tiszta Címoszlop, Sárga pötty (0 Emoji)

import { Store } from '../store/state.js';

// Nyitott sorok ID-jainak nyilvántartása
const expandedOrderIds = new Set();

export const OrderOverviewView = {
    toggleExpand(orderId) {
        if (expandedOrderIds.has(orderId)) {
            expandedOrderIds.delete(orderId);
        } else {
            expandedOrderIds.add(orderId);
        }
    },

    isExpanded(orderId) {
        return expandedOrderIds.has(orderId);
    },

    openImageModal(imgUrl, title) {
        const existingModal = document.getElementById('hub-image-lightbox-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'hub-image-lightbox-modal';
        modal.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn .15s ease; cursor: pointer;';
        
        modal.innerHTML = `
            <div style="background: #fff; border-radius: 16px; padding: 16px; max-width: 600px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); cursor: default; position: relative;" onclick="event.stopPropagation()">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-weight: 700; font-size: 14px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 12px;">${title || 'Termék kép'}</div>
                    <button id="btn-close-lightbox" style="border: none; background: #f1f5f9; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; font-size: 16px; transition: background .15s;">
                        <i class="ph-bold ph-x"></i>
                    </button>
                </div>
                <div style="display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 12px; overflow: hidden; max-height: 70vh;">
                    <img src="${imgUrl}" alt="${title}" style="max-width: 100%; max-height: 70vh; object-fit: contain; display: block;">
                </div>
            </div>
        `;

        modal.addEventListener('click', () => modal.remove());
        const btnClose = modal.querySelector('#btn-close-lightbox');
        if (btnClose) btnClose.addEventListener('click', () => modal.remove());
    },

    getLogisticsStatus(order) {
        if (order.isCancelled) {
            return {
                type: 'cancelled',
                tooltip: 'Törölt rendelés',
                html: `<span class="logi-icon-badge" title="Törölt rendelés" style="width: 25px; height: 25px; border-radius: 6px; background: #f1f5f9; border: 1px solid #cbd5e1; color: #94a3b8; display: inline-flex; align-items: center; justify-content: center;"><i class="ph-bold ph-x-circle" style="font-size: 13px;"></i></span>`
            };
        }
        if (order.isFulfilled) {
            return {
                type: 'fulfilled',
                tooltip: 'Teljesítve (Fulfilled)',
                html: `<span class="logi-icon-badge" title="Teljesítve (Fulfilled)" style="width: 25px; height: 25px; border-radius: 6px; background: #f1f5f9; border: 1px solid #cbd5e1; color: #64748b; display: inline-flex; align-items: center; justify-content: center;"><i class="ph-bold ph-check" style="font-size: 13px;"></i></span>`
            };
        }
        if (order.deliveryInfo) {
            if (order.deliveryInfo.isUncollected) {
                return {
                    type: 'uncollected',
                    tooltip: `Meghiúsult kiszállítás: ${order.deliveryInfo.runDate}`,
                    html: `<span class="logi-icon-badge" title="Meghiúsult kiszállítás: ${order.deliveryInfo.runDate}" style="width: 25px; height: 25px; border-radius: 6px; background: #fef2f2; border: 1.5px solid #fca5a5; color: #dc2626; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(220,38,38,0.15);"><i class="ph-bold ph-warning-circle" style="font-size: 13px;"></i></span>`
                };
            }
            // RIKÍTÓ KÉK KISAUTÓ IKON (Terítésben)
            return {
                type: 'in_delivery',
                tooltip: `Terítésben: ${order.deliveryInfo.runDate} (${order.deliveryInfo.courier})`,
                html: `<span class="logi-icon-badge" title="Terítésben: ${order.deliveryInfo.runDate} (${order.deliveryInfo.courier})" style="width: 25px; height: 25px; border-radius: 6px; background: #e0f2fe; border: 1.5px solid #38bdf8; color: #0284c7; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(2,132,199,0.25);"><i class="ph-bold ph-truck" style="font-size: 14px; color: #0284c7;"></i></span>`
            };
        }

        // 1. SZÁLLÍTMÁNYRA / ANYAGRA VÁRÓ VIZSGÁLAT (MEGELŐZI a Személyes Átvételt is!)
        // Így a személyes átvételes, de még szállítmányra váró rendelésen is a piros homokóra jelenik meg és nem lehet átállítani ready for pickupra!
        const orderWaitingTags = (order.waitingTags && order.waitingTags.length > 0)
            ? order.waitingTags
            : (order.tags ? order.tags.split(',').map(t => t.trim()).filter(t => {
                const tl = t.toLowerCase();
                return (tl.includes('vár') || tl.includes('var') || tl.includes('szállítmány') || tl.includes('szallitmany')) && !tl.includes('számla') && !tl.includes('dijbek');
            }) : []);

        if (order.hasWaitingTag || orderWaitingTags.length > 0) {
            const waitText = orderWaitingTags.length > 0 ? orderWaitingTags.join(', ') : 'Szállítmányra vár';
            return {
                type: 'waiting_shipment',
                tooltip: `${waitText}${order.hasSelaOrdered ? ' • Szállítónak elküldve (sela megr.)' : ''}`,
                html: `
                    <div class="logi-tooltip-wrapper" style="position: relative; display: inline-flex;">
                        <span class="logi-icon-badge" style="position: relative; width: 25px; height: 25px; border-radius: 6px; background: #fef2f2; border: 1.5px solid #fca5a5; color: #dc2626; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(220,38,38,0.15); cursor: help;">
                            <i class="ph-bold ph-hourglass-medium" style="font-size: 13.5px; color: #dc2626;"></i>
                            ${order.hasSelaOrdered ? `
                                <span title="Szállítónak már elküldve (sela megr.)" style="position: absolute; bottom: -3.5px; right: -3.5px; background: #16a34a; color: white; border-radius: 50%; width: 12px; height: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 7.5px; border: 1.5px solid #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.25);">
                                    <i class="ph-bold ph-truck"></i>
                                </span>
                            ` : ''}
                        </span>
                        <div class="logi-tooltip-bubble" style="min-width: 170px;">
                            <div style="display: flex; align-items: center; gap: 5px; font-weight: 700;">
                                <i class="ph-bold ph-hourglass-medium" style="color: #f87171; font-size: 12px;"></i>
                                <span>${waitText}</span>
                            </div>
                            ${order.hasSelaOrdered ? `
                                <div style="margin-top: 4px; padding-top: 3px; border-top: 1px solid rgba(255,255,255,0.2); color: #86efac; font-size: 11px; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                                    <i class="ph-bold ph-truck"></i>
                                    <span>Szállítónak elküldve (sela megr.)</span>
                                </div>
                            ` : ''}
                            ${order.hasPxpTag ? `
                                <div style="margin-top: 4px; padding-top: 3px; border-top: 1px solid rgba(255,255,255,0.2); color: #93c5fd; font-size: 11px; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                                    <i class="ph-bold ph-barcode"></i>
                                    <span>PannonXP csomagküldés</span>
                                </div>
                            ` : ''}
                            ${order.isPickup ? `
                                <div style="margin-top: 4px; padding-top: 3px; border-top: 1px solid rgba(255,255,255,0.2); color: #c4b5fd; font-size: 11px; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                                    <i class="ph-bold ph-storefront"></i>
                                    <span>Személyes átvétel</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `
            };
        }

        // 2. SZEMÉLYES ÁTVÉTEL VIZSGÁLAT (Csak ha NEM vár szállítmányra)
        if (order.isPickup) {
            const tagsLower = (order.tags || '').toLowerCase();
            const hasManualPickupTag = tagsLower.includes('személyes') || tagsLower.includes('szemelyes') || tagsLower.includes('raktári átvétel') || tagsLower.includes('boltban átvétel');

            if (order.isReadyForPickup || hasManualPickupTag) {
                return {
                    type: 'pickup_ready',
                    tooltip: 'Személyes átvétel (Átvehető)',
                    html: `<span class="logi-icon-badge" title="Személyes átvétel (Átvehető)" style="width: 25px; height: 25px; border-radius: 6px; background: #ecfdf5; border: 1.5px solid #6ee7b7; color: #047857; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(4,120,87,0.15);"><i class="ph-bold ph-storefront" style="font-size: 14px; color: #059669;"></i></span>`
                };
            } else {
                return {
                    type: 'pickup_pending',
                    tooltip: 'Személyes átvétel (Még nem vehető át) — Kattints ide az Átvehetőre (Ready for pickup) állításhoz!',
                    html: `<button class="btn-ready-for-pickup-icon" data-order-id="${order.id}" data-shopify-id="${order.shopifyId}" data-is-ready="false" title="Személyes átvétel (Még nem vehető át) — Kattints ide az Átvehetőre (Ready for pickup) állításhoz!" style="width: 25px; height: 25px; border-radius: 6px; background: #f5f3ff; border: 1.5px solid #c4b5fd; color: #7c3aed; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; padding: 0; box-shadow: 0 1px 2px rgba(124,58,237,0.15);">
                        <i class="ph-bold ph-storefront" style="font-size: 14px;"></i>
                    </button>`
                };
            }
        }
        
        // 3. PANNONXP VIZSGÁLAT
        const tagsLower = (order.tags || '').toLowerCase();
        const hasLabelTag = order.hasLabelTag || tagsLower.includes('címke') || tagsLower.includes('cimke') || tagsLower.includes('label') || tagsLower.includes('nyomtatva') || tagsLower.includes('feladva') || tagsLower.includes('pxp kész') || tagsLower.includes('pxp_kesz');
        
        if (order.hasPxpTag) {
            if (hasLabelTag || order.isPxpReady) {
                return {
                    type: 'pxp_ready',
                    tooltip: 'PannonXP: Címke kinyomtatva / Csomag kész (Kiküldés után teljesíthető)',
                    html: `<span class="logi-icon-badge" title="PannonXP: Címke kinyomtatva / Csomag kész (Kiküldés után teljesíthető)" style="width: 25px; height: 25px; border-radius: 6px; background: #ecfdf5; border: 1.5px solid #a7f3d0; color: #047857; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(4,120,87,0.15);"><i class="ph-bold ph-barcode" style="font-size: 14px; color: #059669;"></i></span>`
                };
            } else {
                return {
                    type: 'pxp_pending',
                    tooltip: 'PannonXP: Csomagküldés (Címkézésre vár)',
                    html: `<span class="logi-icon-badge" title="PannonXP: Csomagküldés (Címkézésre vár)" style="width: 25px; height: 25px; border-radius: 6px; background: #fff7ed; border: 1.5px solid #fed7aa; color: #ea580c; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(234,88,12,0.12);"><i class="ph-bold ph-barcode" style="font-size: 14px; color: #ea580c;"></i></span>`
                };
            }
        }
        
        // 4. SELA MEGRENDELVE / SZÁLLÍTÓNAK ELKÜLDVE
        if (order.hasSelaOrdered) {
            return {
                type: 'sela_sent',
                tooltip: 'Szállítónak elküldve (sela megr.)',
                html: `<span class="logi-icon-badge" title="Szállítónak elküldve (sela megr.)" style="width: 25px; height: 25px; border-radius: 6px; background: #f0fdf4; border: 1.5px solid #bbf7d0; color: #15803d; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(21,128,61,0.12);"><i class="ph-bold ph-truck" style="font-size: 14px; color: #16a34a;"></i></span>`
            };
        }

        // 5. KÜLDENDŐ A SZÁLLÍTÓNAK (Alapértelmezett nyitott kiszállítás)
        return {
            type: 'sela_pending',
            tooltip: 'Szállítónak küldendő',
            html: `<span class="logi-icon-badge" title="Szállítónak küldendő" style="width: 25px; height: 25px; border-radius: 6px; background: #fff7ed; border: 1.5px solid #fdba74; color: #c2410c; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(234,88,12,0.12);"><i class="ph-bold ph-truck" style="font-size: 14px; color: #ea580c;"></i></span>`
        };
    },

    renderOrderOverview(containerElement) {
        if (!containerElement) return;

        const allOrders = Store.shopifyHubOrders || [];
        const selectedIds = Store.selectedHubOrderIds || new Set();
        const filters = Store.hubFilters || {
            tab: 'unfulfilled', // 'unfulfilled', 'fulfilled', 'all', 'cancelled'
            chip: 'all',        // 'all', 'in_delivery', 'not_in_delivery', 'bad_shipping', 'needs_proforma', 'no_invoice', 'pickup', 'cod', 'pending_transfer', 'delivery_only'
            search: '',
            tag: 'all',
            dateRange: 'all'
        };

        const currentTab = filters.tab || 'unfulfilled';
        const currentChip = filters.chip || 'all';

        // Aktuális Fül szerint leszűrt rendelések (a gyorsszűrő chip-ek számlálói erre a halmazra vonatkoznak!)
        let tabOrders = allOrders;
        if (currentTab === 'unfulfilled') {
            tabOrders = allOrders.filter(o => !o.isCancelled && !o.isFulfilled);
        } else if (currentTab === 'fulfilled') {
            tabOrders = allOrders.filter(o => !o.isCancelled && o.isFulfilled);
        } else if (currentTab === 'cancelled') {
            tabOrders = allOrders.filter(o => o.isCancelled);
        }

        // Statisztikai számlálók
        const stats = {
            // Globális fül-összesítők
            total: allOrders.length,
            unfulfilledAll: allOrders.filter(o => !o.isCancelled && !o.isFulfilled).length,
            fulfilled: allOrders.filter(o => !o.isCancelled && o.isFulfilled).length,
            cancelled: allOrders.filter(o => o.isCancelled).length,
            
            // Fül-specifikus (pl. unfulfilled) gyorsszűrő számlálók
            tabTotal: tabOrders.length,
            selaPending: tabOrders.filter(o => !o.isCancelled && !o.isFulfilled && !o.isPickup && !o.isInDelivery && !o.hasPxpTag && !o.hasSelaOrdered && !o.hasBadShipping && !o.hasWaitingTag && (!o.waitingTags || o.waitingTags.length === 0)).length,
            selaOrdered: tabOrders.filter(o => o.hasSelaOrdered).length,
            pxpTagged: tabOrders.filter(o => o.hasPxpTag).length,
            inDelivery: tabOrders.filter(o => o.isInDelivery).length,
            notInDelivery: tabOrders.filter(o => !o.isInDelivery && !o.isPickup && !o.isFulfilled).length,
            waitingShipment: tabOrders.filter(o => ((o.waitingTags && o.waitingTags.length > 0) || (o.tags && /(?:vár|var|szállítmány|szallitmany)/i.test(o.tags)))).length,
            badShipping: tabOrders.filter(o => o.hasBadShipping && !o.isFulfilled).length,
            needsProforma: tabOrders.filter(o => o.needsProforma).length,
            noInvoice: tabOrders.filter(o => o.hasNoInvoice).length,
            pickup: tabOrders.filter(o => o.isPickup).length,
            deliveryOnly: tabOrders.filter(o => !o.isPickup && !o.hasBadShipping).length,
            cod: tabOrders.filter(o => o.isCOD && !o.isPickup).length,
            pendingTransfer: tabOrders.filter(o => o.isBankDeposit && !o.isPaid).length
        };

        // Összes egyedi Tag kigyűjtése
        const tagMap = new Map();
        allOrders.forEach(o => {
            if (o.tags) {
                o.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(tag => {
                    tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
                });
            }
        });
        const sortedTags = Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]);

        const filteredOrders = allOrders.filter(order => {
            // 1. FŐ FÜL SZŰRÉS (Segmented Tab)
            if (currentTab === 'unfulfilled') {
                if (order.isCancelled || order.isFulfilled) return false;
            } else if (currentTab === 'fulfilled') {
                if (order.isCancelled || !order.isFulfilled) return false;
            } else if (currentTab === 'cancelled') {
                if (!order.isCancelled) return false;
            } // 'all' esetén minden jöhet

            // 2. GYORS-CHIP SZŰRÉS
            if (currentChip === 'sela_pending' && (order.isCancelled || order.isFulfilled || order.isPickup || order.isInDelivery || order.hasPxpTag || order.hasSelaOrdered || order.hasBadShipping || order.hasWaitingTag || (order.waitingTags && order.waitingTags.length > 0))) return false;
            if (currentChip === 'sela_ordered' && !order.hasSelaOrdered) return false;
            if (currentChip === 'pxp_tagged' && !order.hasPxpTag) return false;
            if (currentChip === 'in_delivery' && !order.isInDelivery) return false;
            if (currentChip === 'not_in_delivery' && (order.isInDelivery || order.isPickup || order.isFulfilled)) return false;
            if (currentChip === 'waiting_shipment' && (!order.waitingTags || order.waitingTags.length === 0) && (!order.tags || !/(?:vár|var|szállítmány|szallitmany)/i.test(order.tags))) return false;
            if (currentChip === 'bad_shipping' && (!order.hasBadShipping || order.isFulfilled)) return false;
            if (currentChip === 'needs_proforma' && !order.needsProforma) return false;
            if (currentChip === 'no_invoice' && !order.hasNoInvoice) return false;
            if (currentChip === 'pickup' && !order.isPickup) return false;
            if (currentChip === 'delivery_only' && (order.isPickup || order.hasBadShipping)) return false;
            if (currentChip === 'cod' && !order.isCOD) return false;
            if (currentChip === 'pending_transfer' && !(order.isBankDeposit && !order.isPaid)) return false;

            // 3. SZÖVEGES KERESÉS
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchId = (order.id || '').toLowerCase().includes(searchLower);
                const matchName = (order.shippingName || '').toLowerCase().includes(searchLower) || 
                                  (order.billingName || '').toLowerCase().includes(searchLower);
                const matchCity = (order.city || '').toLowerCase().includes(searchLower);
                const matchZip = (order.zip || '').includes(searchLower);
                const matchAddress = (order.fullAddress || order.address || '').toLowerCase().includes(searchLower);
                const matchPhone = (order.shippingPhone || '').includes(searchLower);
                const matchTags = (order.tags || '').toLowerCase().includes(searchLower);
                const matchCourier = order.deliveryInfo && (order.deliveryInfo.courier || '').toLowerCase().includes(searchLower);
                const matchItems = (order.items || []).some(i => i.name.toLowerCase().includes(searchLower));

                if (!matchId && !matchName && !matchCity && !matchZip && !matchAddress && !matchPhone && !matchTags && !matchCourier && !matchItems) {
                    return false;
                }
            }

            // 4. TAG SZŰRŐ
            if (filters.tag && filters.tag !== 'all') {
                const orderTags = (order.tags || '').split(',').map(t => t.trim().toLowerCase());
                if (!orderTags.includes(filters.tag.toLowerCase())) return false;
            }

            // 5. DÁTUMSZŰRŐ
            if (filters.dateRange && filters.dateRange !== 'all' && order.orderDate) {
                const orderDate = new Date(order.orderDate);
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                if (filters.dateRange === 'today') {
                    if (orderDate < today) return false;
                } else if (filters.dateRange === 'yesterday') {
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (orderDate < yesterday || orderDate >= today) return false;
                } else if (filters.dateRange === 'last7days') {
                    const last7 = new Date(today);
                    last7.setDate(last7.getDate() - 7);
                    if (orderDate < last7) return false;
                } else if (filters.dateRange === 'last30days') {
                    const last30 = new Date(today);
                    last30.setDate(last30.getDate() - 30);
                    if (orderDate < last30) return false;
                }
            }

            return true;
        });

        // Összes látható kijelölve van-e?
        const isAllVisibleSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.has(o.id));

        // HTML Felépítés (Szuper Kompakt, Áramvonalas Elrendezés)
        containerElement.innerHTML = `
            <div class="overview-layout" style="padding: 6px 14px 70px 300px; max-width: 1540px; margin: 0 auto; width: 100%;">
                
                <!-- 1. PRÉMIUM EGYBEÉPÍTETT FEJLÉC SÁV (Fülek, Keresés, Szűrők, Frissítés) -->
                <div style="background: #fff; padding: 5px 8px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                    
                    <!-- Bal: Fő Állapot Fülek (Kompakt Segmented Bar) -->
                    <div style="display: flex; background: #f1f5f9; padding: 2px; border-radius: 6px; gap: 2px;">
                        
                        <!-- Unfulfilled Fül SÁRGA PÖTTYEL (#eab308) -->
                        <button class="hub-tab-btn ${currentTab === 'unfulfilled' ? 'active' : ''}" data-tab="unfulfilled" style="padding: 3.5px 9px; border-radius: 5px; border: none; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all .15s; background: ${currentTab === 'unfulfilled' ? '#ffffff' : 'transparent'}; color: ${currentTab === 'unfulfilled' ? '#0f172a' : '#64748b'}; box-shadow: ${currentTab === 'unfulfilled' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'};">
                            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #eab308;"></span>
                            <span>Unfulfilled</span>
                            <span style="background: ${currentTab === 'unfulfilled' ? '#ffea8a' : '#e2e8f0'}; color: #4a3800; padding: 0 5px; border-radius: 6px; font-size: 10px;">${stats.unfulfilledAll}</span>
                        </button>

                        <button class="hub-tab-btn ${currentTab === 'fulfilled' ? 'active' : ''}" data-tab="fulfilled" style="padding: 3.5px 9px; border-radius: 5px; border: none; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all .15s; background: ${currentTab === 'fulfilled' ? '#ffffff' : 'transparent'}; color: ${currentTab === 'fulfilled' ? '#0f172a' : '#64748b'}; box-shadow: ${currentTab === 'fulfilled' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'};">
                            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #707070;"></span>
                            <span>Fulfilled</span>
                            <span style="background: ${currentTab === 'fulfilled' ? '#e4e5e7' : '#e2e8f0'}; color: #303030; padding: 0 5px; border-radius: 6px; font-size: 10px;">${stats.fulfilled}</span>
                        </button>

                        <button class="hub-tab-btn ${currentTab === 'all' ? 'active' : ''}" data-tab="all" style="padding: 3.5px 9px; border-radius: 5px; border: none; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all .15s; background: ${currentTab === 'all' ? '#ffffff' : 'transparent'}; color: ${currentTab === 'all' ? '#0f172a' : '#64748b'}; box-shadow: ${currentTab === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'};">
                            <span>Összes</span>
                            <span style="background: rgba(0,0,0,0.06); padding: 0 5px; border-radius: 6px; font-size: 10px;">${stats.total}</span>
                        </button>

                        <button class="hub-tab-btn ${currentTab === 'cancelled' ? 'active' : ''}" data-tab="cancelled" style="padding: 3.5px 9px; border-radius: 5px; border: none; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all .15s; background: ${currentTab === 'cancelled' ? '#ffffff' : 'transparent'}; color: ${currentTab === 'cancelled' ? '#0f172a' : '#64748b'}; box-shadow: ${currentTab === 'cancelled' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'};">
                            <span>Cancelled</span>
                            <span style="background: rgba(0,0,0,0.06); padding: 0 5px; border-radius: 6px; font-size: 10px;">${stats.cancelled}</span>
                        </button>

                    </div>

                    <!-- Jobb: Kereső + Lenyílók + Frissítés Gomb -->
                    <div style="display: flex; align-items: center; gap: 6px; flex: 1; justify-content: flex-end; min-width: 300px;">
                        
                        <!-- Keresőmező -->
                        <div style="position: relative; flex: 1; max-width: 280px; min-width: 160px;">
                            <i class="ph-bold ph-magnifying-glass" style="position: absolute; left: 8px; top: 7px; color: #94a3b8; font-size: 12px;"></i>
                            <input type="text" id="hub-search-input" value="${filters.search || ''}" placeholder="Keresés (ID, Név, Cím, Futár)..." style="width: 100%; padding: 3.5px 6px 3.5px 24px; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 11px; font-family: inherit; outline: none; background: #f8fafc;">
                        </div>

                        <!-- Tag szűrő -->
                        <select id="hub-filter-tag" style="padding: 3.5px 6px; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 11px; font-family: inherit; background: #f8fafc; color: #334155; max-width: 130px;">
                            <option value="all" ${filters.tag === 'all' ? 'selected' : ''}>Minden Címke</option>
                            ${sortedTags.map(([tag, count]) => `
                                <option value="${tag}" ${filters.tag === tag ? 'selected' : ''}>${tag} (${count})</option>
                            `).join('')}
                        </select>

                        <!-- Dátumszűrő -->
                        <select id="hub-filter-date" style="padding: 3.5px 6px; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 11px; font-family: inherit; background: #f8fafc; color: #334155;">
                            <option value="all" ${filters.dateRange === 'all' ? 'selected' : ''}>Bármikori dátum</option>
                            <option value="today" ${filters.dateRange === 'today' ? 'selected' : ''}>Ma</option>
                            <option value="yesterday" ${filters.dateRange === 'yesterday' ? 'selected' : ''}>Tegnap</option>
                            <option value="last7days" ${filters.dateRange === 'last7days' ? 'selected' : ''}>Elmúlt 7 nap</option>
                            <option value="last30days" ${filters.dateRange === 'last30days' ? 'selected' : ''}>Elmúlt 30 nap</option>
                        </select>

                        <!-- Frissítés Gomb -->
                        <button id="btn-refresh-hub" title="Élő frissítés a Shopify-ból és a Járatokból" style="padding: 3.5px 9px; border-radius: 5px; border: 1.5px solid #2563eb; background: #2563eb; color: white; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 2px rgba(37,99,235,0.2); white-space: nowrap;">
                            <i class="ph-bold ph-arrows-clockwise" id="hub-refresh-icon" style="font-size: 12px;"></i>
                            <span>Frissítés</span>
                        </button>

                    </div>
                </div>

                <!-- 2. KOMPAKT GYORSSZŰRŐ SÁV (Fül-specifikus darabszámokkal, Helytakarékos és Logikus) -->
                <div style="background: #fff; padding: 3.5px 8px; border-radius: 7px; border: 1px solid #e2e8f0; margin-bottom: 5px; display: flex; gap: 5px; align-items: center; flex-wrap: wrap; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                    
                    <!-- Logisztikai Csoport (Alap szállítási csatornák) -->
                    <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                        <button class="hub-chip-btn ${currentChip === 'all' ? 'active' : ''}" data-chip="all" style="padding: 2.5px 7.5px; border-radius: 12px; border: 1.5px solid ${currentChip === 'all' ? '#0f172a' : '#cbd5e1'}; background: ${currentChip === 'all' ? '#0f172a' : '#ffffff'}; color: ${currentChip === 'all' ? '#ffffff' : '#475569'}; font-weight: 700; font-size: 10.5px; cursor: pointer; display: flex; align-items: center; gap: 3.5px;">
                            <span>Mind</span>
                            <span style="background: ${currentChip === 'all' ? 'rgba(255,255,255,0.25)' : '#e2e8f0'}; color: ${currentChip === 'all' ? '#ffffff' : '#334155'}; padding: 0 4px; border-radius: 6px; font-size: 9.5px;">${stats.tabTotal}</span>
                        </button>

                        ${stats.selaPending > 0 ? `
                            <button class="hub-chip-btn ${currentChip === 'sela_pending' ? 'active' : ''}" data-chip="sela_pending" style="padding: 2.5px 7.5px; border-radius: 12px; border: 1.5px solid ${currentChip === 'sela_pending' ? '#ea580c' : '#fdba74'}; background: ${currentChip === 'sela_pending' ? '#ea580c' : '#fff7ed'}; color: ${currentChip === 'sela_pending' ? '#ffffff' : '#c2410c'}; font-weight: 700; font-size: 10.5px; cursor: pointer; display: flex; align-items: center; gap: 3.5px;">
                                <i class="ph-bold ph-truck"></i>
                                <span>Sela küldendő</span>
                                <span style="background: ${currentChip === 'sela_pending' ? 'rgba(255,255,255,0.3)' : '#ea580c'}; color: white; padding: 0 4px; border-radius: 6px; font-size: 9.5px;">${stats.selaPending}</span>
                            </button>
                        ` : ''}

                        ${stats.selaOrdered > 0 ? `
                            <button class="hub-chip-btn ${currentChip === 'sela_ordered' ? 'active' : ''}" data-chip="sela_ordered" style="padding: 2.5px 7.5px; border-radius: 12px; border: 1.5px solid ${currentChip === 'sela_ordered' ? '#16a34a' : '#bbf7d0'}; background: ${currentChip === 'sela_ordered' ? '#16a34a' : '#f0fdf4'}; color: ${currentChip === 'sela_ordered' ? '#ffffff' : '#15803d'}; font-weight: 700; font-size: 10.5px; cursor: pointer; display: flex; align-items: center; gap: 3.5px;">
                                <i class="ph-bold ph-truck"></i>
                                <span>Sela elküldve</span>
                                <span style="background: ${currentChip === 'sela_ordered' ? 'rgba(255,255,255,0.3)' : '#16a34a'}; color: white; padding: 0 4px; border-radius: 6px; font-size: 9.5px;">${stats.selaOrdered}</span>
                            </button>
                        ` : ''}

                        ${stats.pxpTagged > 0 ? `
                            <button class="hub-chip-btn ${currentChip === 'pxp_tagged' ? 'active' : ''}" data-chip="pxp_tagged" style="padding: 2.5px 7.5px; border-radius: 12px; border: 1.5px solid ${currentChip === 'pxp_tagged' ? '#2563eb' : '#bfdbfe'}; background: ${currentChip === 'pxp_tagged' ? '#2563eb' : '#eff6ff'}; color: ${currentChip === 'pxp_tagged' ? '#ffffff' : '#1d4ed8'}; font-weight: 700; font-size: 10.5px; cursor: pointer; display: flex; align-items: center; gap: 3.5px;">
                                <i class="ph-bold ph-barcode"></i>
                                <span>PannonXP</span>
                                <span style="background: ${currentChip === 'pxp_tagged' ? 'rgba(255,255,255,0.3)' : '#2563eb'}; color: white; padding: 0 4px; border-radius: 6px; font-size: 9.5px;">${stats.pxpTagged}</span>
                            </button>
                        ` : ''}

                        ${stats.pickup > 0 ? `
                            <button class="hub-chip-btn ${currentChip === 'pickup' ? 'active' : ''}" data-chip="pickup" style="padding: 2.5px 7.5px; border-radius: 12px; border: 1.5px solid ${currentChip === 'pickup' ? '#8b5cf6' : '#ddd6fe'}; background: ${currentChip === 'pickup' ? '#8b5cf6' : '#ede9fe'}; color: ${currentChip === 'pickup' ? '#ffffff' : '#6d28d9'}; font-weight: 700; font-size: 10.5px; cursor: pointer; display: flex; align-items: center; gap: 3.5px;">
                                <i class="ph-bold ph-storefront"></i>
                                <span>Személyes</span>
                                <span style="background: ${currentChip === 'pickup' ? 'rgba(255,255,255,0.25)' : '#8b5cf6'}; color: white; padding: 0 4px; border-radius: 6px; font-size: 9.5px;">${stats.pickup}</span>
                            </button>
                        ` : ''}

                        ${stats.inDelivery > 0 ? `
                            <button class="hub-chip-btn ${currentChip === 'in_delivery' ? 'active' : ''}" data-chip="in_delivery" style="padding: 2.5px 7.5px; border-radius: 12px; border: 1.5px solid ${currentChip === 'in_delivery' ? '#0284c7' : '#bae6fd'}; background: ${currentChip === 'in_delivery' ? '#0284c7' : '#f0f9ff'}; color: ${currentChip === 'in_delivery' ? '#ffffff' : '#0369a1'}; font-weight: 700; font-size: 10.5px; cursor: pointer; display: flex; align-items: center; gap: 3.5px;">
                                <i class="ph-bold ph-truck"></i>
                                <span>Terítésben</span>
                                <span style="background: ${currentChip === 'in_delivery' ? 'rgba(255,255,255,0.25)' : '#0284c7'}; color: white; padding: 0 4px; border-radius: 6px; font-size: 9.5px;">${stats.inDelivery}</span>
                            </button>
                        ` : ''}

                        ${stats.notInDelivery > 0 ? `
                            <button class="hub-chip-btn ${currentChip === 'not_in_delivery' ? 'active' : ''}" data-chip="not_in_delivery" style="padding: 2.5px 7.5px; border-radius: 12px; border: 1.5px solid ${currentChip === 'not_in_delivery' ? '#b45309' : '#fde68a'}; background: ${currentChip === 'not_in_delivery' ? '#b45309' : '#fffbeb'}; color: ${currentChip === 'not_in_delivery' ? '#ffffff' : '#92400e'}; font-weight: 700; font-size: 10.5px; cursor: pointer; display: flex; align-items: center; gap: 3.5px;">
                                <i class="ph-bold ph-package"></i>
                                <span>Járatra vár</span>
                                <span style="background: ${currentChip === 'not_in_delivery' ? 'rgba(255,255,255,0.25)' : '#b45309'}; color: white; padding: 0 4px; border-radius: 6px; font-size: 9.5px;">${stats.notInDelivery}</span>
                            </button>
                        ` : ''}
                    </div>

                    <!-- Elválasztó vonal (ha vannak teendők) -->
                    ${(stats.waitingShipment > 0 || stats.badShipping > 0 || stats.noInvoice > 0 || stats.needsProforma > 0 || stats.pendingTransfer > 0) ? `
                        <div style="width: 1px; height: 16px; background: #cbd5e1; margin: 0 3px;"></div>
                    ` : ''}

                    <!-- Teendők & Figyelmeztetések Csoport (Csak ha létezik ilyen tétel az aktuális fülön!) -->
                    <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                        
                        ${stats.waitingShipment > 0 ? `
                            <button class="hub-chip-btn ${currentChip === 'waiting_shipment' ? 'active' : ''}" data-chip="waiting_shipment" style="padding: 2.5px 7.5px; border-radius: 12px; border: 1.5px solid ${currentChip === 'waiting_shipment' ? '#dc2626' : '#fca5a5'}; background: ${currentChip === 'waiting_shipment' ? '#dc2626' : '#fef2f2'}; color: ${currentChip === 'waiting_shipment' ? '#ffffff' : '#b91c1c'}; font-weight: 700; font-size: 10.5px; cursor: pointer; display: flex; align-items: center; gap: 3.5px;">
                                <i class="ph-bold ph-hourglass-medium"></i>
                                <span>Szállítmányra vár</span>
                                <span style="background: ${currentChip === 'waiting_shipment' ? 'rgba(255,255,255,0.3)' : '#dc2626'}; color: white; padding: 0 4px; border-radius: 6px; font-size: 9.5px;">${stats.waitingShipment}</span>
                            </button>
                        ` : ''}

                        ${stats.badShipping > 0 ? `
                            <button class="hub-chip-btn ${currentChip === 'bad_shipping' ? 'active' : ''}" data-chip="bad_shipping" style="padding: 2.5px 7.5px; border-radius: 12px; border: 1.5px solid ${currentChip === 'bad_shipping' ? '#dc2626' : '#fca5a5'}; background: ${currentChip === 'bad_shipping' ? '#dc2626' : '#fef2f2'}; color: ${currentChip === 'bad_shipping' ? '#ffffff' : '#b91c1c'}; font-weight: 700; font-size: 10.5px; cursor: pointer; display: flex; align-items: center; gap: 3.5px;">
                                <i class="ph-bold ph-warning-octagon"></i>
                                <span>Rossz szállítás (2300 Ft)</span>
                                <span style="background: ${currentChip === 'bad_shipping' ? 'rgba(255,255,255,0.25)' : '#dc2626'}; color: white; padding: 0 4px; border-radius: 6px; font-size: 9.5px;">${stats.badShipping}</span>
                            </button>
                        ` : ''}

                        ${stats.noInvoice > 0 ? `
                            <button class="hub-chip-btn ${currentChip === 'no_invoice' ? 'active' : ''}" data-chip="no_invoice" style="padding: 2.5px 7.5px; border-radius: 12px; border: 1.5px solid ${currentChip === 'no_invoice' ? '#d97706' : '#fde68a'}; background: ${currentChip === 'no_invoice' ? '#d97706' : '#fffbeb'}; color: ${currentChip === 'no_invoice' ? '#ffffff' : '#92400e'}; font-weight: 700; font-size: 10.5px; cursor: pointer; display: flex; align-items: center; gap: 3.5px;">
                                <i class="ph-bold ph-receipt"></i>
                                <span>Számlázni!</span>
                                <span style="background: ${currentChip === 'no_invoice' ? 'rgba(255,255,255,0.25)' : '#d97706'}; color: white; padding: 0 4px; border-radius: 6px; font-size: 9.5px;">${stats.noInvoice}</span>
                            </button>
                        ` : ''}

                        ${stats.needsProforma > 0 ? `
                            <button class="hub-chip-btn ${currentChip === 'needs_proforma' ? 'active' : ''}" data-chip="needs_proforma" style="padding: 2.5px 7.5px; border-radius: 12px; border: 1.5px solid ${currentChip === 'needs_proforma' ? '#4f46e5' : '#c7d2fe'}; background: ${currentChip === 'needs_proforma' ? '#4f46e5' : '#eef2ff'}; color: ${currentChip === 'needs_proforma' ? '#ffffff' : '#3730a3'}; font-weight: 700; font-size: 10.5px; cursor: pointer; display: flex; align-items: center; gap: 3.5px;">
                                <i class="ph-bold ph-file-text"></i>
                                <span>Díjbekérő</span>
                                <span style="background: ${currentChip === 'needs_proforma' ? 'rgba(255,255,255,0.25)' : '#4f46e5'}; color: white; padding: 0 4px; border-radius: 6px; font-size: 9.5px;">${stats.needsProforma}</span>
                            </button>
                        ` : ''}

                        ${stats.pendingTransfer > 0 ? `
                            <button class="hub-chip-btn ${currentChip === 'pending_transfer' ? 'active' : ''}" data-chip="pending_transfer" style="padding: 2.5px 7.5px; border-radius: 12px; border: 1.5px solid ${currentChip === 'pending_transfer' ? '#ef4444' : '#fca5a5'}; background: ${currentChip === 'pending_transfer' ? '#ef4444' : '#fee2e2'}; color: ${currentChip === 'pending_transfer' ? '#ffffff' : '#b91c1c'}; font-weight: 700; font-size: 10.5px; cursor: pointer; display: flex; align-items: center; gap: 3.5px;">
                                <i class="ph-bold ph-bank"></i>
                                <span>Függő utalás</span>
                                <span style="background: ${currentChip === 'pending_transfer' ? 'rgba(255,255,255,0.25)' : '#ef4444'}; color: white; padding: 0 4px; border-radius: 6px; font-size: 9.5px;">${stats.pendingTransfer}</span>
                            </button>
                        ` : ''}

                    </div>

                    <!-- Jobb szélen: Rendelésszám & Reset -->
                    <div style="margin-left: auto; display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 11px; color: #64748b; font-weight: 700;">
                            ${filteredOrders.length} rendelés
                        </span>
                        ${(currentChip !== 'all' || filters.search || filters.tag !== 'all' || filters.dateRange !== 'all') ? `
                            <button id="btn-reset-all-filters" style="border: none; background: #f1f5f9; padding: 2.5px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #64748b; cursor: pointer; display: flex; align-items: center; gap: 3px;">
                                <i class="ph-bold ph-x"></i>
                                <span>Törlés</span>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- 3. TISZTA TÁBLÁZAT (Kompakt oszlopszélességekkel, nincs felesleges térköz) -->
                <div class="overview-table-container" style="background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: visible; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                    
                    <!-- Táblázat Fejléc -->
                    <div style="display: grid; grid-template-columns: 32px 20px 32px 105px 85px minmax(160px, 1fr) minmax(190px, 1.2fr) 150px 130px; padding: 5px 10px; background: #f8fafc; border-bottom: 1.5px solid #e2e8f0; font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; align-items: center; border-radius: 8px 8px 0 0;">
                        <div>
                            <input type="checkbox" id="hub-select-all" ${isAllVisibleSelected ? 'checked' : ''} style="width: 14px; height: 14px; cursor: pointer; accent-color: #2563eb;">
                        </div>
                        <div></div>
                        <div style="display: flex; justify-content: center;" title="Logisztikai Állapot"><i class="ph-bold ph-truck" style="font-size: 12px;"></i></div>
                        <div>Rendelés</div>
                        <div>Dátum</div>
                        <div>Címzett Neve</div>
                        <div>Szállítási Cím</div>
                        <div style="text-align: right;">Összeg & Fizetés</div>
                        <div style="text-align: center;">Teljesítés</div>
                    </div>

                    <!-- Sorok listája -->
                    <div id="hub-orders-list">
                        ${filteredOrders.length === 0 ? `
                            <div style="padding: 30px 20px; text-align: center; color: #94a3b8;">
                                <i class="ph-bold ph-magnifying-glass" style="font-size: 28px; margin-bottom: 6px; display: block; color: #cbd5e1;"></i>
                                <div style="font-size: 13px; font-weight: 700; color: #475569;">Nincs találat a megadott szűrőkkel</div>
                            </div>
                        ` : filteredOrders.map(order => {
                            const isSelected = selectedIds.has(order.id);
                            const isExp = OrderOverviewView.isExpanded(order.id);
                            const formattedDate = order.orderDate ? new Date(order.orderDate).toLocaleString('hu-HU', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
                            const formattedTotal = new Intl.NumberFormat('hu-HU').format(order.totalAmount || 0);
                            const formattedCod = new Intl.NumberFormat('hu-HU').format(order.codAmount || 0);
                            const logisticsStatus = OrderOverviewView.getLogisticsStatus(order);

                            // Fizetési jelvény
                            let paymentBadge = '';
                            if (order.isCancelled) {
                                paymentBadge = `<span style="background: #f1f5f9; color: #94a3b8; padding: 1.5px 5px; border-radius: 4px; font-size: 9.5px; font-weight: 600;">Cancelled</span>`;
                            } else if (order.isBankDeposit && !order.isPaid) {
                                paymentBadge = `<span style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 1.5px 5px; border-radius: 4px; font-size: 9.5px; font-weight: 700;">Függő Utalás</span>`;
                            } else if (order.isCOD) {
                                paymentBadge = `<span style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 1.5px 5px; border-radius: 4px; font-size: 9.5px; font-weight: 700;">UV: ${formattedCod} Ft</span>`;
                            } else if (order.isPaid) {
                                paymentBadge = `<span style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 1.5px 5px; border-radius: 4px; font-size: 9.5px; font-weight: 700;">Fizetve</span>`;
                            } else {
                                paymentBadge = `<span style="background: #f1f5f9; color: #475569; padding: 1.5px 5px; border-radius: 4px; font-size: 9.5px; font-weight: 600;">Fizetetlen</span>`;
                            }

                            // SHOPIFY NATÍV TELJESÍTÉSI BADGE-EK (Fulfilled: Szürke, Unfulfilled: Sárga pötty #eab308)
                            let fulfillmentBadge = '';
                            if (order.isCancelled) {
                                fulfillmentBadge = `
                                    <span style="display: inline-flex; align-items: center; gap: 4px; background: #f1f2f4; color: #64748b; padding: 1.5px 7px; border-radius: 10px; font-size: 10.5px; font-weight: 600; text-decoration: line-through;">
                                        <span style="width: 5px; height: 5px; border-radius: 50%; background: #94a3b8;"></span>
                                        Cancelled
                                    </span>
                                `;
                            } else if (order.isFulfilled) {
                                fulfillmentBadge = `
                                    <span style="display: inline-flex; align-items: center; gap: 4px; background: #e4e5e7; color: #303030; padding: 1.5px 7px; border-radius: 10px; font-size: 10.5px; font-weight: 600;">
                                        <span style="width: 5px; height: 5px; border-radius: 50%; background: #707070;"></span>
                                        Fulfilled
                                    </span>
                                `;
                            } else if (order.fulfillmentStatus === 'partial') {
                                fulfillmentBadge = `
                                    <span style="display: inline-flex; align-items: center; gap: 4px; background: #ffe3b0; color: #6a4300; padding: 1.5px 7px; border-radius: 10px; font-size: 10.5px; font-weight: 700;">
                                        <span style="width: 5px; height: 5px; border-radius: 50%; background: #ea580c;"></span>
                                        Partially fulfilled
                                    </span>
                                `;
                            } else {
                                // Unfulfilled (Shopify mustársárga + tiszta sárga pötty #eab308)
                                fulfillmentBadge = `
                                    <span style="display: inline-flex; align-items: center; gap: 4px; background: #ffea8a; color: #4a3800; padding: 1.5px 7px; border-radius: 10px; font-size: 10.5px; font-weight: 700;">
                                        <span style="width: 5px; height: 5px; border-radius: 50%; background: #eab308;"></span>
                                        Unfulfilled
                                    </span>
                                `;
                            }

                            // Szállítási cím formázás
                            const fullCityLine = order.zip ? `${order.zip} ${order.city || ''}` : (order.city || '');
                            const streetAddress = order.address1 || order.address || '';

                            // Sor háttér prioritások:
                            // 1. Törölt rendelés
                            // 2. Rossz szállítási mód (halvány piros háttér)
                            // 3. Viszonteladó tag (arany színű sor háttér)
                            // 4. Személyes átvétel (lila sor háttér)
                            // 5. Normál fehér sor
                            let rowBg = isSelected ? '#f0fdf4' : (isExp ? '#f8fafc' : (order.isFulfilled ? '#fafbfc' : '#fff'));
                            let rowOpacity = order.isCancelled ? 'opacity: 0.65;' : '';
                            let rowWrapperBorder = 'border-bottom: 1px solid #f1f5f9;';

                            if (order.isCancelled) {
                                if (!isSelected && !isExp) rowBg = '#f8fafc';
                            } else if (!order.isFulfilled && order.hasBadShipping) {
                                if (!isSelected && !isExp) rowBg = '#fef2f2';
                            } else if (order.isReseller) {
                                // Viszonteladó: Arany színű sor
                                rowWrapperBorder = 'border-bottom: 1px solid #fef08a;';
                                if (!isSelected && !isExp) rowBg = '#fef9c3'; // Meleg, arany árnyalat
                            } else if (order.isPickup) {
                                // Személyes átvétel: Karakteres lila háttér
                                rowWrapperBorder = 'border-bottom: 1px solid #e9d5ff;';
                                if (!isSelected && !isExp) rowBg = '#f3e8ff'; // Lila árnyalat
                            }

                            return `
                                <div class="hub-order-wrapper ${isExp ? 'expanded' : ''}" style="${rowWrapperBorder} ${rowOpacity} position: relative; overflow: visible;">
                                    
                                    <!-- EGYMÁS MELLETTI (BALRÓL JOBBRA) KILÓGÓ CÍMKÉK (Csak nem törölt rendeléseknél) -->
                                    ${!order.isCancelled ? `
                                        <div class="hub-hanging-tags-stack" style="position: absolute; right: 100%; top: 50%; transform: translateY(-50%); display: flex; flex-direction: row; gap: 3px; align-items: center; justify-content: flex-end; z-index: 50; pointer-events: none; margin-right: 0px; white-space: nowrap;">
                                             
                                            <!-- 1. Számlázni! (Sárga / Borostyán) -->
                                            ${order.hasNoInvoice ? `
                                                <div style="background: #d97706; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; box-shadow: -1px 2px 4px rgba(217,119,6,0.25); display: flex; align-items: center; gap: 3px; white-space: nowrap;">
                                                    <i class="ph-bold ph-receipt" style="font-size: 10px;"></i>
                                                    <span>Számlázni!</span>
                                                </div>
                                            ` : ''}

                                            <!-- 2. Díjbek szükséges 250e+ Ft (Indigó / Kék) -->
                                            ${order.needsProforma ? `
                                                <div style="background: #4f46e5; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; box-shadow: -1px 2px 4px rgba(79,70,229,0.25); display: flex; align-items: center; gap: 3px; white-space: nowrap;">
                                                    <i class="ph-bold ph-file-text" style="font-size: 10px;"></i>
                                                    <span>Díjbek szükséges</span>
                                                </div>
                                            ` : ''}

                                            <!-- 2b. Díjbeket várjuk (ha díjbek.ki már rajta van, de számla ki még nem) -->
                                            ${order.waitingProforma ? `
                                                <div style="background: #6366f1; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; box-shadow: -1px 2px 4px rgba(99,102,241,0.25); display: flex; align-items: center; gap: 3px; white-space: nowrap;">
                                                    <i class="ph-bold ph-clock-countdown" style="font-size: 10px;"></i>
                                                    <span>Díjbeket várjuk</span>
                                                </div>
                                            ` : ''}

                                            <!-- 3. Rossz szállítási mód (Csak ha NEM teljesített) (Tűzpiros / #dc2626) -->
                                            ${(!order.isFulfilled && order.hasBadShipping) ? `
                                                <div style="background: #dc2626; color: #ffffff; padding: 2px 6px; border-radius: 4px 0 0 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; box-shadow: -1px 2px 5px rgba(220,38,38,0.35); display: flex; align-items: center; gap: 3px; white-space: nowrap; border: 1px solid #b91c1c;">
                                                    <i class="ph-bold ph-warning-octagon" style="font-size: 10px; color: #fee2e2;"></i>
                                                    <span>Rossz szállítást választott!</span>
                                                </div>
                                            ` : ''}

                                        </div>
                                    ` : ''}

                                    <!-- Fő Sor (9 oszlop: Checkbox, Chevron, Logisztikai Ikon, Rendelés, Dátum, Címzett, Cím, Összeg, Teljesítés) -->
                                    <div class="hub-order-row ${isSelected ? 'selected' : ''}" data-order-id="${order.id}" style="display: grid; grid-template-columns: 32px 20px 32px 105px 85px minmax(160px, 1fr) minmax(190px, 1.2fr) 150px 130px; padding: 5px 10px; align-items: center; font-size: 11.5px; background: ${rowBg}; cursor: pointer; user-select: none;">
                                        
                                        <!-- 1. Checkbox -->
                                        <div>
                                            <input type="checkbox" class="hub-order-checkbox" data-order-id="${order.id}" ${isSelected ? 'checked' : ''} style="width: 14px; height: 14px; cursor: pointer; accent-color: #2563eb;">
                                        </div>

                                        <!-- 2. Chevron lenyitó -->
                                        <div class="btn-toggle-row-expand" data-order-id="${order.id}" style="color: #64748b; font-size: 12px; display: flex; align-items: center; justify-content: center; height: 20px; width: 20px; border-radius: 5px; transition: transform .2s;">
                                            <i class="ph-bold ${isExp ? 'ph-caret-down' : 'ph-caret-right'}"></i>
                                        </div>

                                        <!-- 3. Logisztikai Állapot Ikon -->
                                        <div style="display: flex; align-items: center; justify-content: center;">
                                            ${logisticsStatus.html}
                                        </div>

                                        <!-- 4. Rendelésszám & Notes Ikon -->
                                        <div style="display: flex; align-items: center; gap: 5px;">
                                            <strong style="color: #0f172a; font-weight: 700; font-size: 12px; ${order.isCancelled ? 'text-decoration: line-through; color: #64748b;' : ''}">${order.id}</strong>
                                            <button class="btn-order-note" data-order-id="${order.id}" data-shopify-id="${order.shopifyId}" data-customer-name="${(order.shippingName || order.billingName || '').replace(/"/g, '&quot;')}" style="background: ${order.note && order.note.trim() ? '#fef3c7' : '#f1f5f9'}; color: ${order.note && order.note.trim() ? '#b45309' : '#94a3b8'}; border: 1px solid ${order.note && order.note.trim() ? '#fcd34d' : '#e2e8f0'}; border-radius: 5px; padding: 1.5px 4px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; line-height: 1; transition: all .15s; box-shadow: ${order.note && order.note.trim() ? '0 1px 2px rgba(180,83,9,0.12)' : 'none'};" title="${order.note && order.note.trim() ? 'Megjegyzés: ' + order.note.replace(/"/g, '&quot;') : 'Megjegyzés hozzáadása / olvasása'}">
                                                <i class="ph-bold ${order.note && order.note.trim() ? 'ph-note-pencil' : 'ph-notepad'}"></i>
                                            </button>
                                        </div>

                                        <!-- 5. Dátum -->
                                        <div style="color: #64748b; font-size: 10.5px;">
                                            ${formattedDate}
                                        </div>

                                        <!-- 6. Címzett Neve -->
                                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px;">
                                            <span style="font-weight: 700; color: #0f172a; font-size: 12px;">${order.shippingName}</span>
                                            ${order.billingName && order.billingName !== order.shippingName ? `<div style="font-size: 10px; color: #64748b;">(Számla: ${order.billingName})</div>` : ''}
                                        </div>

                                        <!-- 7. Szállítási Cím Oszlop (Személyes átvételnél ÜRES!) -->
                                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px;">
                                            ${order.isPickup ? '' : `
                                                <span style="font-weight: 700; color: #1e293b; margin-right: 4px;">${fullCityLine}</span>
                                                ${streetAddress ? `<span style="color: #64748b; font-size: 11px;">— ${streetAddress}</span>` : ''}
                                            `}
                                        </div>

                                        <!-- 8. Összeg & Fizetés -->
                                        <div style="text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: 6px; white-space: nowrap;">
                                            <span style="font-weight: 700; color: #0f172a; font-size: 12px;">${formattedTotal} Ft</span>
                                            ${paymentBadge}
                                        </div>

                                        <!-- 9. Teljesítés (Fulfillment) -->
                                        <div style="text-align: center; white-space: nowrap;">
                                            ${fulfillmentBadge}
                                        </div>
                                    </div>

                                    <!-- Lenyitható Részletes Panel (Képekkel, Részletekkel, Törölt tételekkel) -->
                                    ${isExp ? `
                                        <div class="hub-order-details" style="padding: 14px 20px 16px 66px; background: #f8fafc; border-top: 1px dashed #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                                            
                                            <!-- KISZÁLLÍTÁSI / TERÍTÉSI INFÓ KÁRTYA (Ha terítésben van) -->
                                            ${order.deliveryInfo ? `
                                                <div style="background: #f0fdfa; border: 1.5px solid #99f6e4; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                                                    <div style="display: flex; align-items: center; gap: 10px;">
                                                        <div style="background: #0d9488; color: white; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                                            <i class="ph-bold ph-truck"></i>
                                                        </div>
                                                        <div>
                                                            <div style="font-size: 12.5px; font-weight: 800; color: #0f766e;">
                                                                Kiszállítás Napja: ${order.deliveryInfo.runDate} — Szállító: ${order.deliveryInfo.courier} ${order.deliveryInfo.company ? `(${order.deliveryInfo.company})` : ''}
                                                            </div>
                                                            <div style="font-size: 11.5px; color: #115e59; margin-top: 2px;">
                                                                ${order.deliveryInfo.isUncollected ? `
                                                                    <strong style="color: #dc2626;">Sikertelen kézbesítés: ${order.deliveryInfo.uncollectedReason || 'Megadott ok nélkül'}</strong>
                                                                ` : `
                                                                    Állapot: <strong>Terítésben / Járatra kiosztva</strong> • ${order.deliveryInfo.paymentMethod ? `Fizetési mód: ${order.deliveryInfo.paymentMethod.toUpperCase()}` : 'Elszámolás: Függőben'}
                                                                `}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style="font-size: 11px; color: #0f766e; font-weight: 600;">
                                                        Azonosító: ${order.deliveryInfo.runId}
                                                    </div>
                                                </div>
                                            ` : ''}

                                            <!-- Figyelmeztető Dobozok (Törölt rendelés / Rossz szállítás / Díjbekérő / Számla hiány) -->
                                            ${order.isCancelled ? `
                                                <div style="background: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 9px 12px; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 8px; color: #475569; font-size: 12px;">
                                                    <i class="ph-bold ph-x-circle" style="font-size: 16px; margin-top: 1px; flex-shrink: 0; color: #dc2626;"></i>
                                                    <div>
                                                        <strong>Lemondott rendelés:</strong> Ez a megrendelés törölve / stornózva lett a Shopify-ban. Nem kell kiszedni és nem kell csomagolni.
                                                    </div>
                                                </div>
                                            ` : ''}

                                            ${(!order.isFulfilled && order.hasBadShipping) ? `
                                                <div style="background: #fff7ed; border: 1.5px solid #fed7aa; border-radius: 8px; padding: 9px 12px; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 8px; color: #c2410c; font-size: 12px;">
                                                    <i class="ph-bold ph-warning" style="font-size: 16px; margin-top: 1px; flex-shrink: 0; color: #ea580c;"></i>
                                                    <div>
                                                        <strong>Rossz szállítási díj:</strong> Vidéki cím (${order.city || 'Vidéki'}), de a díj 2.300 Ft (9.900 Ft helyett). Javítás: "személyes" tag vagy szállítási díj módosítása a Shopifyban.
                                                    </div>
                                                </div>
                                            ` : ''}

                                            ${order.needsProforma ? `
                                                <div style="background: #eef2ff; border: 1.5px solid #c7d2fe; border-radius: 8px; padding: 9px 12px; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 8px; color: #3730a3; font-size: 12px;">
                                                    <i class="ph-bold ph-file-text" style="font-size: 16px; margin-top: 1px; flex-shrink: 0; color: #4f46e5;"></i>
                                                    <div>
                                                        <strong>Díjbekérő szükséges (250.000 Ft feletti nem fizetett rendelés):</strong> Összeg: ${formattedTotal} Ft. Küldd ki a díjbekérőt és add hozzá a "dijbek.ki" taget a Shopifyban!
                                                    </div>
                                                </div>
                                            ` : ''}

                                            ${order.hasNoInvoice ? `
                                                <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 9px 12px; margin-bottom: 10px; display: flex; align-items: flex-start; gap: 8px; color: #92400e; font-size: 12px;">
                                                    <i class="ph-bold ph-receipt" style="font-size: 16px; margin-top: 1px; flex-shrink: 0; color: #d97706;"></i>
                                                    <div><strong>Számlázandó:</strong> Nincs "számla ki" tag a rendeléshez rendelve. Számla legyen kiállítva!</div>
                                                </div>
                                            ` : ''}

                                            <!-- Aktuálisan Megrendelt Tételek -->
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                                                <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">
                                                    Megrendelt Tételek (${(order.items || []).length} termék):
                                                </div>
                                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                                    <!-- Egyedi Teljesítés Gomb (csak ha még nincs teljesítve!) -->
                                                    ${(!order.isFulfilled && !order.isCancelled) ? `
                                                        <button class="btn-fulfill-single-order" data-order-id="${order.id}" data-shopify-id="${order.shopifyId}" style="background: #059669; color: #ffffff; border: 1px solid #047857; padding: 6px 13px; border-radius: 7px; font-weight: 700; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 6px rgba(5,150,105,0.25); transition: all .15s;" title="Rendelés teljesítése a Shopify-ban (Fulfill)">
                                                            <i class="ph-bold ph-package"></i>
                                                            <span>Teljesítés Shopify-ban (Fulfill)</span>
                                                        </button>
                                                    ` : ''}

                                                    <!-- Ready for pickup Átváltó Gomb (csak személyes átvételnél ÉS csak ha még nincs átállítva!) -->
                                                    ${(order.isPickup && !order.isReadyForPickup && !order.isFulfilled && !order.isCancelled) ? `
                                                        <button class="btn-ready-for-pickup" data-order-id="${order.id}" data-shopify-id="${order.shopifyId}" data-is-ready="false" style="background: #7c3aed; color: #ffffff; border: 1.5px solid #6d28d9; padding: 6px 13px; border-radius: 7px; font-weight: 800; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 6px rgba(124,58,237,0.3); transition: all .15s;" title="Átállítás Ready for pickup-ra a Shopify-ban">
                                                            <i class="ph-bold ph-bell-ringing"></i>
                                                            <span>Átállítás: Ready for pickup (Átvehető)</span>
                                                        </button>
                                                    ` : ''}

                                                    <!-- Sela Címke Kézi Átváltó Gomb -->
                                                    ${!order.isCancelled ? `
                                                        <button class="btn-toggle-sela-tag" data-order-id="${order.id}" data-shopify-id="${order.shopifyId}" data-has-tag="${order.hasSelaOrdered ? 'true' : 'false'}" style="background: ${order.hasSelaOrdered ? '#fef2f2' : '#f0fdf4'}; color: ${order.hasSelaOrdered ? '#b91c1c' : '#15803d'}; border: 1px solid ${order.hasSelaOrdered ? '#fca5a5' : '#bbf7d0'}; padding: 6px 12px; border-radius: 7px; font-weight: 700; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all .15s;" title="${order.hasSelaOrdered ? 'Sela megr. tag eltávolítása' : 'sela megr. tag hozzáadása'}">
                                                            <i class="ph-bold ${order.hasSelaOrdered ? 'ph-x-circle' : 'ph-check-circle'}"></i>
                                                            <span>${order.hasSelaOrdered ? 'Sela címke levétele' : 'Megjelölés Sela-nak elküldöttként'}</span>
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </div>

                                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; margin-bottom: 14px;">
                                                ${(order.items || []).map(item => `
                                                    <div style="display: flex; gap: 12px; align-items: center; background: #fff; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                                                        ${item.imageUrl ? `
                                                            <div class="hub-product-thumb-container" data-img-url="${item.imageUrl}" data-item-title="${item.name.replace(/"/g, '&quot;')}" style="position: relative; width: 74px; height: 74px; min-width: 74px; border-radius: 8px; overflow: hidden; border: 1px solid #cbd5e1; background: #fff; display: flex; align-items: center; justify-content: center; cursor: zoom-in;">
                                                                <img src="${item.imageUrl}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: contain; display: block;">
                                                            </div>
                                                        ` : `
                                                            <div style="width: 74px; height: 74px; min-width: 74px; border-radius: 8px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8; border: 1px dashed #cbd5e1;">
                                                                <i class="ph-bold ph-image-square" style="font-size: 22px;"></i>
                                                            </div>
                                                        `}
                                                        <div style="flex: 1; min-width: 0;">
                                                            <div style="font-weight: 700; color: #1e293b; font-size: 13px; line-height: 1.35; margin-bottom: 4px;">${item.name}</div>
                                                            <div style="font-size: 12px; color: #0f172a; margin-top: 4px;">
                                                                <strong style="color: #2563eb; font-size: 13px;">${item.qty} db</strong>
                                                                ${item.isQuantityModified ? `<span style="font-size: 11px; color: #dc2626; margin-left: 4px;">(Eredetileg: ${item.originalQty} db)</span>` : ''}
                                                                × ${new Intl.NumberFormat('hu-HU').format(item.price)} Ft
                                                            </div>
                                                        </div>
                                                    </div>
                                                `).join('')}
                                            </div>

                                            <!-- Törölt / Kivett tételek szekció (Removed Items) -->
                                            ${(order.removedItems && order.removedItems.length > 0) ? `
                                                <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1; margin-bottom: 14px;">
                                                    <div style="font-size: 11px; font-weight: 800; color: #dc2626; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                                                        <i class="ph-bold ph-scissors"></i>
                                                        <span>Kivett / Törölt tételek (${order.removedItems.length} termék — NEM KELL KISZEDNI!):</span>
                                                    </div>
                                                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 10px;">
                                                        ${order.removedItems.map(item => `
                                                            <div style="display: flex; gap: 12px; align-items: center; background: #fff1f2; padding: 8px 12px; border-radius: 8px; border: 1px dashed #fca5a5; opacity: 0.9;">
                                                                <div style="position: relative; width: 50px; height: 50px; min-width: 50px; border-radius: 6px; overflow: hidden; background: #fff; border: 1px solid #fecdd3; display: flex; align-items: center; justify-content: center;">
                                                                    ${item.imageUrl ? `<img src="${item.imageUrl}" style="width: 100%; height: 100%; object-fit: contain; filter: grayscale(80%);">` : `<i class="ph-bold ph-package" style="font-size: 20px; color: #f87171;"></i>`}
                                                                    <div style="position: absolute; inset: 0; background: rgba(220,38,38,0.15); display: flex; align-items: center; justify-content: center;">
                                                                        <i class="ph-bold ph-x" style="color: #dc2626; font-size: 18px; font-weight: bold;"></i>
                                                                    </div>
                                                                </div>
                                                                <div style="flex: 1; min-width: 0;">
                                                                    <div style="font-weight: 700; font-size: 12px; color: #475569; text-decoration: line-through;">${item.name}</div>
                                                                    <div style="font-size: 11px; color: #dc2626; font-weight: 700; margin-top: 2px;">
                                                                        Törölve (Eredeti: ${item.originalQty} db × ${new Intl.NumberFormat('hu-HU').format(item.price)} Ft)
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        `).join('')}
                                                    </div>
                                                </div>
                                            ` : ''}

                                            <!-- Részletes Szállítási és Pénzügyi Adatok Sáv -->
                                            <div style="display: flex; gap: 20px; font-size: 11.5px; color: #334155; background: #fff; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; flex-wrap: wrap; align-items: center;">
                                                <div>
                                                    <strong style="color: #64748b;">Szállítás Módja:</strong> 
                                                    ${order.isPickup ? `
                                                        <span style="color: #6d28d9; font-weight: 700; background: #ede9fe; border: 1px solid #ddd6fe; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">${order.pickupTitle || 'Személyes átvétel a raktárban'}</span>
                                                    ` : `
                                                        <span style="color: #0f172a; font-weight: 600;">Kiszállítás címre (${order.fullAddress || order.address}) — Díj: ${new Intl.NumberFormat('hu-HU').format(order.shippingFee || 0)} Ft</span>
                                                    `}
                                                </div>
                                                ${order.shippingPhone ? `
                                                    <div>
                                                        <strong style="color: #64748b;">Telefon:</strong> <span style="font-weight: 600; color: #0f172a;">${order.shippingPhone}</span>
                                                    </div>
                                                ` : ''}
                                                ${order.note ? `
                                                    <div>
                                                        <strong style="color: #64748b;">Megjegyzés (Notes):</strong> <span style="color: #b45309; font-weight: 600;">${order.note}</span>
                                                    </div>
                                                ` : ''}
                                                ${order.pxp_referencia ? `
                                                    <div>
                                                        <strong style="color: #64748b;">PannonXP Ref:</strong> <span style="font-family: monospace; font-weight: 700; color: #059669;">${order.pxp_referencia}</span>
                                                    </div>
                                                ` : ''}
                                            </div>

                                        </div>
                                    ` : ''}

                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- 5. LEBEGŐ CSOPORTOS MŰVELETI SÁV -->
                <div id="hub-action-bar" style="position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(${selectedIds.size > 0 ? '0' : '150px'}); opacity: ${selectedIds.size > 0 ? '1' : '0'}; pointer-events: ${selectedIds.size > 0 ? 'all' : 'none'}; transition: all .25s cubic-bezier(0.16, 1, 0.3, 1); background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px); padding: 10px 20px; border-radius: 16px; box-shadow: 0 16px 36px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 12px; z-index: 1000; border: 1px solid rgba(255,255,255,0.15);">
                    <div style="color: #f8fafc; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px; padding-right: 8px; border-right: 1px solid rgba(255,255,255,0.2);">
                        <span style="background: #3b82f6; color: white; border-radius: 6px; padding: 2px 7px; font-size: 12px;">${selectedIds.size}</span>
                        <span>kijelölve</span>
                    </div>

                    <!-- Kijelöltek Teljesítése Shopify-ban (Zöld) -->
                    <button id="btn-hub-bulk-fulfill" style="background: #059669; color: white; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all .15s; box-shadow: 0 2px 8px rgba(5,150,105,0.35);">
                        <i class="ph-bold ph-package"></i>
                        <span>Teljesítés Shopify-ban (${selectedIds.size})</span>
                    </button>

                    <button id="btn-hub-send-to-picking" style="background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all .15s;">
                        <i class="ph-bold ph-clipboard-text"></i>
                        <span>Átdobás Szedőlistába</span>
                    </button>

                    <button id="btn-hub-send-to-pxp" style="background: #0d9488; color: white; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all .15s;">
                        <i class="ph-bold ph-tag"></i>
                        <span>Átdobás PannonXP-be</span>
                    </button>

                    <!-- Szállítói Export (Sela) Gomb (Narancs) -->
                    <button id="btn-hub-export-sela" style="background: #ea580c; color: white; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all .15s; box-shadow: 0 2px 8px rgba(234,88,12,0.35);">
                        <i class="ph-bold ph-truck"></i>
                        <span>Szállítói Export (Sela)</span>
                    </button>

                    <button id="btn-hub-clear-selection" title="Kijelölés megszüntetése" style="background: rgba(255,255,255,0.1); color: #cbd5e1; border: none; padding: 8px 12px; border-radius: 10px; font-weight: 600; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all .15s;">
                        <i class="ph-bold ph-x"></i>
                        <span>Törlés</span>
                    </button>
                </div>

            </div>
        `;
    },

    render(containerElement) {
        return this.renderOrderOverview(containerElement);
    }
};
