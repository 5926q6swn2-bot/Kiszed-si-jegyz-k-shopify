// js/views/ordersView.js

function highlightItemName(name) {
    const regex = /(padl[óo]zat[a-z]*)/gi;
    return name.replace(regex, `<span style="background: #000; color: #fff; padding: 2px 4px; border-radius: 3px; font-weight: bold; font-size: 0.95em; display: inline-block; line-height: 1;">$1</span>`);
}



export const OrdersView = {
    render: function(ctx) {
        const {
            orders, orderList, emptyState, btnPrint,
            needsMarkerLabel, getBusinessDaysCount,
            attachCardEvents, updatePrintButtonState, updateIndexes, initSortable,
            sortModeActive
        } = ctx;

        orderList.innerHTML = '';
        
        if (orders.length === 0) {
            emptyState.style.display = 'flex';
            btnPrint.disabled = true;
            return;
        }

        emptyState.style.display = 'none';

        orders.forEach((order, index) => {
            const card = document.createElement('div');
            card.className = `order-card ${order.errors.length > 0 ? 'has-error' : ''}`;
            card.setAttribute('data-id', order.id);
            card.setAttribute('data-internal-id', order.internalId);

            let codHtml = '';
            if (order.isReturn) {
                codHtml = `<span class="badge" style="background: #faf5ff; color: #6b21a8; border: 1px solid #d8b4fe; display: inline-flex; align-items: center; gap: 4px; font-weight: 700;" data-internal-id="${order.internalId}"><i class="ph-bold ph-arrow-counter-clockwise"></i>VISSZASZÁLLÍTÁS</span>`;
            } else if (order.isBankDeposit) {
                if (order.isPaid) {
                    codHtml = `<span class="badge badge-paid clickable-cod-badge" data-internal-id="${order.internalId}" title="Kattints az utánvét gyors átírásához" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">UTALVA (FIZETVE) <i class="ph-bold ph-pencil-simple" style="font-size: 11px;"></i></span>`;
                } else {
                    codHtml = `<span class="badge badge-warning clickable-cod-badge" data-internal-id="${order.internalId}" title="Kattints az utánvét gyors átírásához" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">UTALÁST VÁRUNK <i class="ph-bold ph-pencil-simple" style="font-size: 11px;"></i></span>`;
                }
            } else if (order.isCOD) {
                const formattedAmount = new Intl.NumberFormat('hu-HU').format(order.codAmount);
                codHtml = `<span class="badge badge-cod clickable-cod-badge" data-internal-id="${order.internalId}" title="Kattints az utánvét gyors átírásához" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">UTÁNVÉT: ${formattedAmount} Ft <i class="ph-bold ph-pencil-simple" style="font-size: 11px;"></i></span>`;
            } else {
                codHtml = `<span class="badge badge-paid clickable-cod-badge" data-internal-id="${order.internalId}" title="Kattints az utánvét gyors átírásához" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">Fizetve / Nincs Utánvét <i class="ph-bold ph-pencil-simple" style="font-size: 11px;"></i></span>`;
            }

            let errorsHtml = '';
            if (order.errors.length > 0) {
                errorsHtml = order.errors.map((err) => {
                    const isCodError = err.type === 'cod' || /utánvét|anomália/i.test(err.title);
                    
                    let quickActionsHtml = '';
                    if (isCodError) {
                        const noteAmt = err.noteAmount !== undefined ? err.noteAmount : null;
                        const shopifyAmt = err.shopifyAmount !== undefined ? err.shopifyAmount : null;
                        
                        let buttons = '';
                        if (noteAmt !== null && noteAmt > 0) {
                            buttons += `<button type="button" class="btn-quick-set-cod btn-sm" data-order-internal-id="${order.internalId}" data-err-id="${err.id}" data-amount="${noteAmt}" style="background: #0284c7; color: white; border: none; padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: opacity 0.15s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                                <i class="ph-bold ph-check"></i> ${new Intl.NumberFormat('hu-HU').format(noteAmt)} Ft (Notes)
                            </button>`;
                        }
                        if (shopifyAmt !== null && shopifyAmt > 0 && shopifyAmt !== noteAmt) {
                            buttons += `<button type="button" class="btn-quick-set-cod btn-sm" data-order-internal-id="${order.internalId}" data-err-id="${err.id}" data-amount="${shopifyAmt}" style="background: #475569; color: white; border: none; padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: opacity 0.15s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                                <i class="ph-bold ph-check"></i> ${new Intl.NumberFormat('hu-HU').format(shopifyAmt)} Ft (Shopify)
                            </button>`;
                        }
                        buttons += `<button type="button" class="btn-quick-set-cod btn-sm" data-order-internal-id="${order.internalId}" data-err-id="${err.id}" data-amount="0" style="background: #94a3b8; color: white; border: none; padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: opacity 0.15s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                            0 Ft (Nincs UV)
                        </button>`;
                        
                        quickActionsHtml = `
                            <div class="quick-cod-actions" style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(0,0,0,0.1); display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
                                <span style="font-size: 11px; font-weight: 600; color: #334155;">Gyors javítás:</span>
                                ${buttons}
                                <div style="display: inline-flex; align-items: center; gap: 4px; margin-left: auto;">
                                    <input type="number" class="quick-cod-custom-input" data-order-internal-id="${order.internalId}" value="${order.codAmount || ''}" placeholder="Egyedi Ft" style="width: 85px; padding: 3px 6px; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 11px; font-weight: 700;">
                                    <button type="button" class="btn-quick-save-custom-cod btn-sm" data-order-internal-id="${order.internalId}" data-err-id="${err.id}" style="background: #16a34a; color: white; border: none; padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 700; cursor: pointer;">Mentés</button>
                                </div>
                            </div>
                        `;
                    }
                    
                    return `
                        <div class="error-box no-print" id="err-${err.id}">
                            <div class="error-title">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                ${err.title}
                            </div>
                            <div class="error-desc">${err.desc}</div>
                            ${quickActionsHtml}
                            <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
                                <button class="btn-ack" data-order-internal-id="${order.internalId}" data-err-id="${err.id}">Ellenőrizve</button>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            const sortedItems = [...order.items].sort((a, b) => {
                const getRank = (name) => {
                    if (/falpanel/i.test(name)) return 1;
                    if (/padl[óo]zat/i.test(name)) return 2;
                    return 3;
                };
                return getRank(a.name) - getRank(b.name);
            });

            let itemsHtml = sortedItems.map((item, iIdx) => {
                const showMarker = needsMarkerLabel(item.name, item.isCollapsedProfile);
                let toggleHtml = '';
                let subItemsHtml = '';
                
                if (item.isCollapsedProfile && item.subItems && item.subItems.length > 0) {
                    toggleHtml = ` <span class="profile-toggle no-print" data-toggle-id="${order.internalId}-${iIdx}" style="cursor: pointer; color: var(--primary); font-size: 11px; margin-left: 6px; font-weight: 600;">▼</span>`;
                    subItemsHtml = `
                        <div id="sub-${order.internalId}-${iIdx}" class="profile-subitems" style="padding: 4px 0 0 12px; font-size: 10px; color: #64748b; line-height: 1.3;">
                            ${item.subItems.map(sub => `<div style="margin-bottom: 1px;">• ${sub.qty} db - ${sub.name}</div>`).join('')}
                        </div>
                    `;
                }

                return `
                    <tr>
                        <td class="col-check"><div class="col-flex-center"><div class="checkbox-box"></div></div></td>
                        <td class="col-qty nowrap">${item.isCollapsedProfile ? '' : `<strong data-field="itemQty-${iIdx}">${item.qty} db</strong>`}</td>
                        <td class="col-name" data-field="itemName-${iIdx}">${highlightItemName(item.name)}${toggleHtml}${subItemsHtml}</td>
                    </tr>
                `;
            }).join('');

            // Lead Time (Átfutási idő) számítása
            let delayBadge = '';
            let orderDateHtml = '';
            if (order.orderDate) {
                const oDate = new Date(order.orderDate);
                const deliveryDate = new Date(); // Aktuális idő
                const businessDays = getBusinessDaysCount(oDate, deliveryDate);
                
                const formattedOrderDate = oDate.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
                orderDateHtml = `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Rendelés: ${formattedOrderDate}</div>`;

                if (businessDays > 6 && !order.isPlannedDelay) {
                    delayBadge = `<span class="badge" style="background: #fff7ed; color: #c2410c; border: 1px solid #fdba74; margin-left: 8px; font-size: 10px; padding: 2px 8px;"><i class="ph-bold ph-warning" style="margin-right: 3px;"></i>${businessDays} munkanap késés</span>`;
                }
            }

            const pickupBadge = order.isPickup 
                ? `<span class="badge" style="background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe; margin-left: 6px; font-size: 10px; padding: 2px 8px; font-weight: 700;"><i class="ph-bold ph-storefront" style="margin-right: 3px;"></i>Személyes átvétel</span>`
                : '';

            card.innerHTML = `
                <div class="drag-handle no-print" title="Húzd át az átrendezéshez">
                    <i class="ph-bold ph-dots-six-vertical"></i>
                </div>
                <div class="order-header">
                    <div class="header-left">
                        <div class="order-index">${index + 1}</div>
                        <div>
                            <div class="order-id" data-field="id">
                                ${order.id}
                                ${delayBadge}
                                ${pickupBadge}
                            </div>
                            <div class="order-customer" data-field="shippingName">${order.shippingName}</div>
                            <div class="order-address" data-field="address">${order.address}</div>
                            ${orderDateHtml}
                        </div>
                    </div>
                    <div class="order-meta">
                        <div class="meta-buttons no-print">
                            <button class="btn-print-order" title="Szállítólevél Nyomtatása" style="display:inline-flex;align-items:center;justify-content:center;padding:5px;cursor:pointer;border:none;background:none;color:#64748b;transition:color .15s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">
                                <i class="ph-bold ph-printer" style="font-size: 14px;"></i>
                            </button>
                            <button class="btn-edit" title="Szerkesztés">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn-delete" title="Törlés">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                        <div class="badge-container">
                            ${codHtml}
                        </div>
                    </div>
                </div>
                ${errorsHtml}
                <table class="items-table">
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
            `;
            orderList.appendChild(card);
        });

        attachCardEvents();
        updatePrintButtonState();
        updateIndexes();
        initSortable();
    }
};
