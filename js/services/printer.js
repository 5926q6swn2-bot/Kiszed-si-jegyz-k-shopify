function highlightItemName(name) {
    const regex = /(padl[óo]zat[a-z]*)/gi;
    return name.replace(regex, `<span style="background: #000; color: #fff; padding: 2px 4px; border-radius: 3px; font-weight: bold; font-size: 0.95em; display: inline-block; line-height: 1;">$1</span>`);
}




function needsMarkerLabel(name, isCollapsedProfile) {
    if (isCollapsedProfile) return false;
    const excludedRegex = /(ragasztó|tapadóhíd|mélyalapozó|profil)/i;
    if (excludedRegex.test(name)) return false;
    return true;
}

export const UnifiedPrinter = {
        area: document.getElementById('print-area'),

        printBundle: async function(run) {
            this.clear();
            const pickingHtml = this.generatePickingHtml(run);
            const summaryHtml = this.generateSummaryHtml(run, false); // 1x summary
            const correctionHtml = this.generateCorrectionHtml(run);
            const deliveryHtml = this.generateDeliveryNotesHtml(run, true); // 2x delivery

            this.area.innerHTML = pickingHtml + summaryHtml + correctionHtml + deliveryHtml;
            this.execute();
        },

        printSingle: async function(run, type) {
            this.clear();
            let html = '';
            if (type === 'picking') html = this.generatePickingHtml(run);
            if (type === 'summary') html = this.generateSummaryHtml(run, false) + this.generateCorrectionHtml(run);
            if (type === 'delivery') html = this.generateDeliveryNotesHtml(run, true);

            this.area.innerHTML = html;
            this.execute();
        },

        printCustom: async function(run, types) {
            this.clear();
            let html = '';
            if (types.picking) html += this.generatePickingHtml(run);
            if (types.summary) html += this.generateSummaryHtml(run, false) + this.generateCorrectionHtml(run);
            if (types.delivery) html += this.generateDeliveryNotesHtml(run, true);
            if (!html) return;
            this.area.innerHTML = html;
            this.execute();
        },

        clear: function() {
            this.area.innerHTML = '';
        },

        execute: function() {
            // Rövid várakozás a renderelésre
            setTimeout(() => {
                window.print();
                this.clear();
            }, 500);
        },

        generatePickingHtml: function(run) {
            const nonReturnOrders = (run.orders || []).filter(o => !o.isReturn);
            const cardsHtml = nonReturnOrders.map((order, index) => {
                let codHtml = '';
                if (order.isReturn) {
                    codHtml = `<span class="badge" style="background: #faf5ff; color: #6b21a8; border: 1px solid #d8b4fe;"><i class="ph-bold ph-arrow-counter-clockwise"></i>VISSZASZÁLLÍTÁS</span>`;
                } else if (order.isBankDeposit) {
                    codHtml = `<span class="badge ${order.isPaid ? 'badge-paid' : 'badge-warning'}">${order.isPaid ? 'UTALVA' : 'UTALÁST VÁRUNK'}</span>`;
                } else if (order.isCOD) {
                    codHtml = `<span class="badge badge-cod">UTÁNVÉT: ${order.codAmount.toLocaleString('hu-HU')} Ft</span>`;
                } else {
                    codHtml = `<span class="badge badge-paid">Fizetve</span>`;
                }

                const sortedItems = [...order.items].sort((a, b) => {
                    const getRank = (name) => {
                        if (/falpanel/i.test(name)) return 1;
                        if (/padl[óo]zat/i.test(name)) return 2;
                        return 3;
                    };
                    return getRank(a.name) - getRank(b.name);
                });

                const itemsHtml = sortedItems.map(item => {
                    const isCollapsed = item.isCollapsedProfile || item.name === "Összekészített profilok";
                    const subItemsHtml = (isCollapsed && item.subItems?.length > 0)
                        ? `<div style="font-size: 9px; color: #475569; margin-top: 3px; padding-left: 6px; line-height: 1.6;">${item.subItems.map(sub => `<div>• ${sub.qty} db &nbsp;${sub.name}</div>`).join('')}</div>`
                        : '';
                    return `
                    <tr>
                        <td class="col-check"><div class="col-flex-center"><div class="checkbox-box"></div></div></td>
                        <td class="col-qty">${isCollapsed ? '' : `<strong>${item.qty} db</strong>`}</td>
                        <td class="col-name">${highlightItemName(item.name)}${subItemsHtml}</td>
                    </tr>`;
                }).join('');

                return `
                    <div class="order-card ${order.errors?.length > 0 ? 'has-error' : ''}">
                        <div class="order-header">
                            <div class="header-left">
                                <div class="order-index">${index + 1}</div>
                                <div>
                                    <div class="order-id">${order.id}</div>
                                    <div class="order-customer">${order.shippingName}</div>
                                    <div class="order-address">${order.address}</div>
                                </div>
                            </div>
                            <div class="order-meta">${codHtml}</div>
                        </div>
                        <table class="items-table"><tbody>${itemsHtml}</tbody></table>
                    </div>
                `;
            }).join('');

            return `
                <div class="print-page" style="padding: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #000; padding-bottom: 12px; margin-bottom: 25px;">
                        <div>
                            <h1 style="margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">Kiszedési Jegyzék</h1>
                            <div style="font-size: 18px; color: #000; font-weight: 800; margin-top: 5px;">Kiszállítás napja: ${run.date}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px;">Szállító Partner & Szállító</div>
                            <div style="background: #000; color: #fff; padding: 6px 15px; border-radius: 8px; font-size: 20px; font-weight: 900; display: inline-block;">
                                ${run.company} <span style="color: #64748b; font-weight: 400; margin: 0 8px;">|</span> ${run.courier}
                            </div>
                        </div>
                    </div>
                    <div class="order-list">${cardsHtml}</div>
                </div>
            `;
        },

        generateSummaryHtml: function(run, double) {
            let aggregatedItems = {};
            let returnItems = {};
            let totalCOD = 0;
            let countFalpanel = 0;
            let countRagaszto = 0;
            let countProfil = 0;
            let countPadlozat = 0;
            let otherItems = {};

            const addQtyToCategories = (name, qty) => {
                if (/falpanel/i.test(name)) {
                    countFalpanel += qty;
                } else if (/ragaszt[óo]/i.test(name)) {
                    countRagaszto += qty;
                } else if (/profil/i.test(name)) {
                    countProfil += qty;
                } else if (/padl[óo]zat/i.test(name)) {
                    countPadlozat += qty;
                } else {
                    otherItems[name] = (otherItems[name] || 0) + qty;
                }
            };

            run.orders.forEach(order => {
                if (order.isReturn) {
                    order.items.forEach(item => {
                        returnItems[item.name] = (returnItems[item.name] || 0) + item.qty;
                    });
                } else {
                    if (order.isCOD) totalCOD += order.codAmount;
                    order.items.forEach(item => {
                        const name = item.name;
                        aggregatedItems[name] = (aggregatedItems[name] || 0) + item.qty;
                        addQtyToCategories(name, item.qty);
                    });
                }
            });

            const itemsHtml = Object.keys(aggregatedItems).sort().map(name => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${name}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${aggregatedItems[name]} db</td>
                </tr>
            `).join('');

            let otherItemsHtml = '';
            const otherKeys = Object.keys(otherItems);
            if (otherKeys.length > 0) {
                const listStr = otherKeys.map(name => `${name} (${otherItems[name]} db)`).join(', ');
                otherItemsHtml = `
                    <div style="margin-bottom: 20px; font-size: 12px; color: #475569; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: left; line-height: 1.4;">
                        <strong>Egyéb átadott termékek:</strong> plusz ${listStr}
                    </div>
                `;
            }

            let returnItemsHtml = '';
            const returnKeys = Object.keys(returnItems);
            if (returnKeys.length > 0) {
                const returnRows = returnKeys.sort().map(name => `
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #6b21a8;">${name}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #6b21a8;">${returnItems[name]} db</td>
                    </tr>
                `).join('');

                const returnOrdersList = run.orders.filter(o => o.isReturn).map(o => `
                    <div style="font-size: 12px; margin-top: 5px; color: #6b21a8; font-family: inherit;">
                        <strong>${o.id}</strong> (${o.shippingName}): ${o.items.map(it => `${it.qty} db ${it.name}`).join(', ')}
                    </div>
                `).join('');

                returnItemsHtml = `
                    <div style="margin-bottom: 20px; border: 2px solid #d8b4fe; border-radius: 8px; padding: 15px; background: #faf5ff;">
                        <h4 style="margin: 0 0 10px 0; color: #6b21a8; font-size: 14px; font-weight: 800; text-transform: uppercase; display: flex; align-items: center; gap: 6px; font-family: inherit;">
                            <i class="ph-bold ph-arrow-counter-clockwise"></i> Visszahozandó termékek összesítve (Vevőtől vissza)
                        </h4>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="background: #f3e8ff;"><th style="text-align: left; padding: 8px; color: #6b21a8;">Megnevezés</th><th style="text-align: right; padding: 8px; color: #6b21a8;">Mennyiség</th></tr>
                            </thead>
                            <tbody>${returnRows}</tbody>
                        </table>
                        <div style="margin-top: 12px; border-top: 1px dashed #d8b4fe; padding-top: 10px; text-align: left;">
                            <div style="font-weight: 700; font-size: 11px; color: #6b21a8; text-transform: uppercase; margin-bottom: 4px;">Visszahozandó megrendelések részletesen:</div>
                            ${returnOrdersList}
                        </div>
                    </div>
                `;
            }

            const page = `
                <div class="print-page" style="padding: 40px;">
                    <div style="text-align: center; font-size: 28px; font-weight: 800; margin-bottom: 10px;">ÖSSZESÍTŐ (Átadás-Átvétel)</div>
                    <div style="text-align: center; margin-bottom: 20px;">${run.date} | ${run.courier}</div>
                    <div style="background: #000; color: #fff; text-align: center; padding: 15px; font-size: 24px; font-weight: 800; border-radius: 8px; margin-bottom: 20px;">${run.company}</div>
                    
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; text-align: center; font-family: inherit;">
                        <div>
                            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Falpanel</div>
                            <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${countFalpanel} db</div>
                        </div>
                        <div>
                            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Ragasztó</div>
                            <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${countRagaszto} db</div>
                        </div>
                        <div>
                            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Profil</div>
                            <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${countProfil} db</div>
                        </div>
                        <div>
                            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Padlózat</div>
                            <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${countPadlozat} db</div>
                        </div>
                    </div>

                    ${otherItemsHtml}
                    ${returnItemsHtml}

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                        <div style="font-size: 14px; color: #64748b; margin-bottom: 5px;">ÖSSZES UTÁNVÉT A KÖRBEN:</div>
                        <div style="font-size: 32px; font-weight: 800; color: #b91c1c;">${totalCOD.toLocaleString('hu-HU')} Ft</div>
                    </div>

                    <div style="font-size: 11px; color: #64748b; font-style: italic; text-align: center; margin-bottom: 15px;">
                        * A szállító (futár) a termékeket sértetlen állapotban veszi át. Amennyiben a termékek nem sértetlenül kerülnek átadásra, átvétel előtt egyeztetés szükséges.
                    </div>

                    <table style="width: 100%; border-collapse: collapse;">
                        <thead><tr style="background: #f1f5f9;"><th style="text-align: left; padding: 10px;">Megnevezés</th><th style="text-align: right; padding: 10px;">Mennyiség</th></tr></thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>

                    <div style="margin-top: 100px; display: flex; justify-content: space-between;">
                        <div style="width: 250px; text-align: center; border-top: 1px solid #000; padding-top: 10px;">Átadó (Raktár)</div>
                        <div style="width: 250px; text-align: center; border-top: 1px solid #000; padding-top: 10px;">Átvevő (Szállító)</div>
                    </div>
                </div>
            `;
            return double ? page + page : page;
        },

        generateCorrectionHtml: function(run) {
            const rows = run.orders.map(o => {
                let codVal = '';
                if (o.isReturn) {
                    codVal = '<span style="color:#6b21a8; font-weight:700;">Visszaszállítás</span>';
                } else {
                    codVal = o.isCOD ? o.codAmount.toLocaleString('hu-HU') + ' Ft' : 'Fizetve';
                }
                const commentVal = o.isReturn ? `<span style="color:#6b21a8;"><strong style="font-weight:700;">Visszajön:</strong> ${o.items.map(it => `${it.qty} db ${it.name}`).join(', ')}</span>` : '';
                return `
                <tr>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700; vertical-align: top; white-space: nowrap;">${o.id}</td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; white-space: nowrap;">${o.shippingName}</td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; vertical-align: top; white-space: nowrap;">${codVal}</td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 2px solid #cbd5e1; vertical-align: top;"><div style="width: 18px; height: 18px; border: 1px solid #000; margin: auto;"></div></td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 1px solid #cbd5e1; vertical-align: top;"><div style="width: 18px; height: 18px; border: 1px solid #000; margin: auto;"></div></td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; vertical-align: top; line-height: 1.2;">${commentVal}</td>
                </tr>
                `;
            }).join('');

            return `
                <div class="print-page" style="padding: 40px; height: auto;">
                    <div style="text-align: center; font-size: 26px; font-weight: 800; margin-bottom: 10px;">KORREKCIÓS ÉS ELSZÁMOLÓ LAP</div>
                    <div style="text-align: center; margin-bottom: 30px;">${run.date} | ${run.courier} | ${run.company} | Rendszám: ........................</div>
                    
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; height: auto;">
                        <thead>
                            <tr style="background: #f1f5f9;">
                                <th style="text-align: left; padding: 8px;">ID</th>
                                <th style="text-align: left; padding: 8px;">Vevő</th>
                                <th style="text-align: right; padding: 8px;">Utánvét</th>
                                <th style="text-align: center; padding: 8px; border-left: 2px solid #cbd5e1; width: 40px;">KP</th>
                                <th style="text-align: center; padding: 8px; border-left: 1px solid #cbd5e1; width: 40px;">Kártya</th>
                                <th style="text-align: left; padding: 8px;">Megjegyzés / Visszahozott tételek</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>

                    <div style="margin-top: 20px; border: 1.5px dashed #64748b; border-radius: 8px; padding: 12px; background: #f8fafc;">
                        <div style="font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 6px; text-transform: uppercase;">
                            Meghiúsult kiszállításból visszahozott áruk részletezése (Sofőr tölti ki kézzel - Rendelésszám / Cikk / Mennyiség):
                        </div>
                        <div style="font-size: 12px; line-height: 2;">
                            ..................................................................................................................................................<br>
                            ..................................................................................................................................................<br>
                            ..................................................................................................................................................<br>
                            ..................................................................................................................................................<br>
                        </div>
                    </div>

                    <div style="margin-top: 30px; width: 380px; margin-left: auto;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px;">
                            <span>Eredeti Várható Utánvét:</span>
                            <strong>${(run.orders.reduce((sum, o) => sum + ((o.isCOD && !o.isReturn) ? o.codAmount : 0), 0)).toLocaleString('hu-HU')} Ft</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px; color: #b91c1c;">
                            <span>Meghiúsult Utánvét:</span>
                            <span>.................... Ft</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px; color: #1e293b;">
                            <span>Készpénzben fizetve:</span>
                            <span>.................... Ft</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px; color: #1d4ed8;">
                            <span>Kártyával fizetve:</span>
                            <span>.................... Ft</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px; color: #0284c7;">
                            <span>Utalással kifizetve:</span>
                            <span>.................... Ft</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; border-top: 2px solid #000; padding-top: 8px; color: #16a34a;">
                            <span>Átadott KP rész:</span>
                            <span>.................... Ft</span>
                        </div>
                    </div>

                    <div style="margin-top: 50px; font-size: 12px; color: #475569; text-align: center; font-style: italic;">
                        Az aláírással elismerem, hogy a fenti adatok a valóságnak megfelelnek.
                    </div>

                    <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                        <div style="width: 260px; text-align: center; border-top: 1px solid #000; padding-top: 10px;">
                            <div>Átvevő (Raktár)</div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 5px;">Dátum/Idő: .........................</div>
                        </div>
                        <div style="width: 260px; text-align: center; border-top: 1px solid #000; padding-top: 10px;">
                            <div>Sofőr aláírása (${run.courier})</div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 5px;">Elszámolás időpontja: .........................</div>
                        </div>
                    </div>
                </div>
            `;
        },

        generateDeliveryNotesHtml: function(run, double, filterOrderIds = null) {
            const senderData = run.sender === 'ev' 
                ? {
                    name: "Egyéni Vállalkozó (Példa)",
                    address: "1234 Példaváros, Minta utca 1.",
                    bank: "00000000-00000000",
                    phone: "+36 30 000 0000",
                    email: "pelda@email.com"
                }
                : {
                    name: "Capsula Houses Kft.",
                    address: "Széles utca 70., 2040, Budaörs, Magyarország",
                    bank: "11735005-26088969",
                    phone: "+36 70 590 8157",
                    email: "info@panelburkolat.com"
                };

            const generateSingleNote = (order) => {
                const isRet = !!order.isReturn;
                const titleText = isRet ? 'VISSZASZÁLLÍTÁSI JEGYZÉK' : 'SZÁLLÍTÓLEVÉL';
                const paymentHtml = isRet 
                    ? `<div style="background: #faf5ff; border: 1.5px solid #d8b4fe; color: #6b21a8; padding: 20px; text-align: right; font-size: 18px; font-weight: 800;">
                        Visszaszállítás (Pénzmozgás nem történik)
                       </div>`
                    : `<div style="background: #f8fafc; padding: 20px; text-align: right; font-size: 18px; font-weight: 800;">
                        Fizetendő (Utánvét): ${order.isCOD ? order.codAmount.toLocaleString('hu-HU') + ' Ft' : '0 Ft (FIZETVE)'}
                       </div>`;
                const senderLabel = isRet ? 'Címzett (Visszárus raktár)' : 'Eladó';
                const recipientLabel = isRet ? 'Feladó (Vevő)' : 'Vevő';
                const leftSignLabel = isRet ? 'Átvevő (Szállító)' : 'Átadó';
                const rightSignLabel = isRet ? 'Átadó (Vevő)' : 'Átveveő';

                return `
                <div class="print-page" style="padding: 60px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
                        <div style="font-size: 24px; font-weight: 800; color: ${isRet ? '#6b21a8' : 'inherit'};">${titleText}</div>
                        <div style="font-size: 28px; font-weight: 900; border: 3px solid ${isRet ? '#6b21a8' : '#000'}; padding: 10px 20px; color: ${isRet ? '#6b21a8' : 'inherit'};">${order.id}</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                        <div style="width: 45%;"><strong>${senderLabel}:</strong><br>${senderData.name}<br>${senderData.address}<br>${senderData.bank}</div>
                        <div style="width: 45%;"><strong>${recipientLabel}:</strong><br>${order.shippingName}<br>${order.fullAddress || order.address}<br>${order.shippingPhone || ''}</div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                        <thead><tr style="border-bottom: 2px solid #000;"><th style="text-align: left; padding: 10px;">Tétel</th><th style="text-align: right; padding: 10px;">Mennyiség</th></tr></thead>
                        <tbody>${order.items.map(it => `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;">${it.name}</td><td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${it.qty} db</td></tr>`).join('')}</tbody>
                    </table>
                    ${paymentHtml}
                    <div style="margin-top: 100px; display: flex; justify-content: space-between;">
                        <div style="width: 200px; border-top: 1px solid #000; text-align: center; padding-top: 10px;">${leftSignLabel}</div>
                        <div style="width: 200px; border-top: 1px solid #000; text-align: center; padding-top: 10px;">${rightSignLabel}</div>
                    </div>
                </div>
                `;
            };

            let ordersToPrint = run.orders || [];
            if (filterOrderIds) {
                ordersToPrint = ordersToPrint.filter(o => filterOrderIds.includes(o.id));
            }

            const firstSet = ordersToPrint.map(o => generateSingleNote(o)).join('');
            return double ? firstSet + firstSet : firstSet;
        },

        generateQuickDeliveryNoteHtml: function(data) {
            const senderData = data.sender === 'ev'
                ? {
                    name: "Egyéni Vállalkozó (Példa)",
                    address: "1234 Példaváros, Minta utca 1.",
                    bank: "00000000-00000000",
                    phone: "+36 30 000 0000",
                    email: "pelda@email.com"
                }
                : {
                    name: "Capsula Houses Kft.",
                    address: "Széles utca 70., 2040, Budaörs, Magyarország",
                    bank: "11735005-26088969",
                    phone: "+36 70 590 8157",
                    email: "info@panelburkolat.com"
                };

            const itemRows = data.items.length > 0
                ? data.items.map(it => `<tr><td style="padding:10px;border-bottom:1px solid #eee;">${it.name}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${it.qty} db</td></tr>`).join('')
                : `<tr><td colspan="2" style="padding:10px;color:#94a3b8;font-style:italic;">—</td></tr>`;

            const recipientBlock = [
                data.recipient,
                data.recipientCompany,
                data.address,
                data.phone
            ].filter(Boolean).join('<br>') || '<span style="color:#94a3b8;font-style:italic;">—</span>';

            const carrierBlock = [
                data.company,
                data.companyDetails
            ].filter(Boolean).join('<br>') || '<span style="color:#94a3b8;font-style:italic;">—</span>';

            const page = `
                <div class="print-page" style="padding:60px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;">
                        <div style="font-size:24px;font-weight:800;">SZÁLLÍTÓLEVÉL</div>
                        <div style="font-size:13px;color:#64748b;text-align:right;">Kelt: ${new Date().toLocaleDateString('hu-HU')}</div>
                    </div>

                    <div style="display:flex;justify-content:space-between;margin-bottom:30px;gap:20px;">
                        <div style="flex:1;padding:16px;border:1px solid #e2e8f0;border-radius:10px;">
                            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Feladó</div>
                            <strong>${senderData.name}</strong><br>
                            ${senderData.address}<br>
                            <span style="color:#64748b;font-size:13px;">${senderData.phone} · ${senderData.email}</span>
                        </div>
                        <div style="flex:1;padding:16px;border:1px solid #e2e8f0;border-radius:10px;">
                            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Szállító Cég</div>
                            ${carrierBlock}
                            <div style="margin-top:20px;font-size:12px;color:#94a3b8;">Rendszám: ……………………</div>
                        </div>
                    </div>

                    <div style="padding:16px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:30px;">
                        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Átvevő</div>
                        ${recipientBlock}
                    </div>

                    <table style="width:100%;border-collapse:collapse;margin-bottom:30px;">
                        <thead><tr style="border-bottom:2px solid #000;"><th style="text-align:left;padding:10px;">Tétel</th><th style="text-align:right;padding:10px;">Mennyiség</th></tr></thead>
                        <tbody>${itemRows}</tbody>
                    </table>

                    <div style="display:flex;justify-content:space-between;margin-top:80px;">
                        <div style="width:220px;text-align:center;border-top:1px solid #000;padding-top:10px;">Átadó (Raktár)</div>
                        <div style="width:220px;text-align:center;border-top:1px solid #000;padding-top:10px;">Átvevő (Szállító)</div>
                    </div>
                </div>
            `;

            return page + page;
        }
    };