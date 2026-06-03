// js/views/ordersView.js

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
            if (order.isBankDeposit) {
                if (order.isPaid) {
                    codHtml = `<span class="badge badge-paid" data-internal-id="${order.internalId}">UTALVA (FIZETVE)</span>`;
                } else {
                    codHtml = `<span class="badge badge-warning" data-internal-id="${order.internalId}">UTALÁST VÁRUNK</span>`;
                }
            } else if (order.isCOD) {
                const formattedAmount = new Intl.NumberFormat('hu-HU').format(order.codAmount);
                codHtml = `<span class="badge badge-cod" data-internal-id="${order.internalId}">UTÁNVÉT: ${formattedAmount} Ft</span>`;
            } else {
                codHtml = `<span class="badge badge-paid" data-internal-id="${order.internalId}">Fizetve / Nincs Utánvét</span>`;
            }

            let errorsHtml = '';
            if (order.errors.length > 0) {
                errorsHtml = order.errors.map((err) => `
                    <div class="error-box no-print" id="err-${err.id}">
                        <div class="error-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            ${err.title}
                        </div>
                        <div class="error-desc">${err.desc}</div>
                        <button class="btn-ack" data-order-internal-id="${order.internalId}" data-err-id="${err.id}">Ellenőrizve</button>
                    </div>
                `).join('');
            }

            let itemsHtml = order.items.map((item, iIdx) => {
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
                        <td class="col-marker">${showMarker ? '<div class="col-flex-center"><span class="marker-lbl">címke</span><div class="checkbox-box marker"></div></div>' : ''}</td>
                        <td class="col-qty nowrap">${item.isCollapsedProfile ? '' : `<strong data-field="itemQty-${iIdx}">${item.qty} db</strong>`}</td>
                        <td class="col-name" data-field="itemName-${iIdx}">${item.name}${toggleHtml}${subItemsHtml}</td>
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
                    delayBadge = `<span class="badge" style="background: #fff7ed; color: #c2410c; border: 1px solid #fdba74; margin-left: 8px; font-size: 10px; padding: 2px 8px;">⚠️ ${businessDays} munkanap késés</span>`;
                }
            }

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
