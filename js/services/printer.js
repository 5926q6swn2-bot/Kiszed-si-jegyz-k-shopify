// js/services/printer.js
// Egységes Nyomtatási Szolgáltatás (Unified Printer)

import { generatePdfHtml } from '../utils/printTemplates.js';

function highlightItemName(name) {
    const regex = /(padl[óo]zat[a-z]*)/gi;
    return name.replace(regex, `<span style="background: #000; color: #fff; padding: 2px 4px; border-radius: 3px; font-weight: bold; font-size: 0.95em; display: inline-block; line-height: 1;">$1</span>`);
}

export const UnifiedPrinter = {
    area: document.getElementById('print-area'),

    printBundle: async function(run) {
        this.clear();
        const pickingHtml = this.generatePickingHtml(run);
        const summaryHtml = this.generateSummaryHtml(run, false);
        const correctionHtml = this.generateCorrectionHtml(run);
        const deliveryHtml = this.generateDeliveryNotesHtml(run, true);

        if (this.area) {
            this.area.innerHTML = pickingHtml + summaryHtml + correctionHtml + deliveryHtml;
        }
        this.execute();
    },

    printSingle: async function(run, type) {
        this.clear();
        let html = '';
        if (type === 'picking') html = this.generatePickingHtml(run);
        if (type === 'summary') html = this.generateSummaryHtml(run, false) + this.generateCorrectionHtml(run);
        if (type === 'delivery') html = this.generateDeliveryNotesHtml(run, true);

        if (this.area) {
            this.area.innerHTML = html;
        }
        this.execute();
    },

    printCustom: async function(run, types) {
        this.clear();
        let html = '';
        if (types.picking) html += this.generatePickingHtml(run);
        if (types.summary) html += this.generateSummaryHtml(run, false) + this.generateCorrectionHtml(run);
        if (types.delivery) html += this.generateDeliveryNotesHtml(run, true);
        if (!html) return;
        if (this.area) {
            this.area.innerHTML = html;
        }
        this.execute();
    },

    clear: function() {
        if (!this.area) this.area = document.getElementById('print-area');
        if (this.area) this.area.innerHTML = '';
    },

    execute: function() {
        setTimeout(() => {
            window.print();
            this.clear();
        }, 500);
    },

    // A szedőlista generálását a központi printTemplates.js-ből használjuk
    generatePickingHtml: function(run) {
        return generatePdfHtml(run);
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
            if (/falpanel/i.test(name)) countFalpanel += qty;
            else if (/ragaszt[óo]/i.test(name)) countRagaszto += qty;
            else if (/profil/i.test(name)) countProfil += qty;
            else if (/padl[óo]zat/i.test(name)) countPadlozat += qty;
            else otherItems[name] = (otherItems[name] || 0) + qty;
        };

        (run.orders || []).forEach(order => {
            if (order.isReturn) {
                order.items.forEach(item => {
                    returnItems[item.name] = (returnItems[item.name] || 0) + item.qty;
                });
            } else {
                if (order.isCOD) totalCOD += order.codAmount;
                order.items.forEach(item => {
                    aggregatedItems[item.name] = (aggregatedItems[item.name] || 0) + item.qty;
                    addQtyToCategories(item.name, item.qty);
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
        const returnOrders = (run.orders || []).filter(o => o.isReturn);
        if (returnOrders.length > 0) {
            const returnOrdersList = returnOrders.map(o => `
                <div style="font-size: 11px; margin-top: 3px; color: #6b21a8; line-height: 1.3;">
                    <strong>${o.id}</strong> (${o.shippingName}): ${o.items.map(it => `${it.qty} db ${it.name}`).join(', ')}
                </div>
            `).join('');

            returnItemsHtml = `
                <div style="margin-bottom: 20px; padding: 12px; background: #faf5ff; border: 1.5px solid #d8b4fe; border-radius: 8px;">
                    <div style="font-weight: 800; font-size: 13px; color: #6b21a8; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                        ⟲ Visszahozandó megrendelések részletesen (Vevőtől vissza)
                    </div>
                    ${returnOrdersList}
                </div>
            `;
        }

        const page = `
            <div class="print-page" style="padding: 20px;">
                <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <h2 style="margin: 0; font-size: 24px; text-transform: uppercase;">Összesítő Átadás-Átvételi Lap</h2>
                        <div style="font-size: 14px; color: #64748b;">Dátum: ${run.date}</div>
                    </div>
                    <div style="text-align: right; background: #000; color: #fff; padding: 6px 15px; border-radius: 6px; font-weight: 800;">
                        ${run.company} - ${run.courier}
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; text-align: center;">
                    <div style="background: #f1f5f9; padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Falpanel</div>
                        <div style="font-size: 20px; font-weight: 800;">${countFalpanel} db</div>
                    </div>
                    <div style="background: #f1f5f9; padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Ragasztó</div>
                        <div style="font-size: 20px; font-weight: 800;">${countRagaszto} db</div>
                    </div>
                    <div style="background: #f1f5f9; padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Profil</div>
                        <div style="font-size: 20px; font-weight: 800;">${countProfil} db</div>
                    </div>
                    <div style="background: #f1f5f9; padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Padlózat</div>
                        <div style="font-size: 20px; font-weight: 800;">${countPadlozat} db</div>
                    </div>
                </div>

                ${otherItemsHtml}
                ${returnItemsHtml}

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Termék megnevezése</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Összesen</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>

                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 30px; text-align: right;">
                    <span style="font-size: 14px; color: #64748b;">Összes beszedendő utánvét:</span>
                    <strong style="font-size: 22px; color: #b91c1c; margin-left: 10px;">${totalCOD.toLocaleString('hu-HU')} Ft</strong>
                </div>

                <div style="display: flex; justify-content: space-between; margin-top: 50px;">
                    <div style="width: 200px; border-top: 1px solid #000; text-align: center; padding-top: 5px;">Átadó (Raktár)</div>
                    <div style="width: 200px; border-top: 1px solid #000; text-align: center; padding-top: 5px;">Átvevő (Sofőr)</div>
                </div>
            </div>
        `;

        return double ? page + page : page;
    },

    generateCorrectionHtml: function(run) {
        return `
            <div class="print-page" style="padding: 20px;">
                <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                    <h2 style="margin: 0; font-size: 24px; text-transform: uppercase;">Korrekciós És Elszámoló Lap</h2>
                    <div style="font-size: 14px; color: #64748b;">Dátum: ${run.date} | Szállító: ${run.courier} (${run.company})</div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #000;">
                            <th style="padding: 8px; text-align: left;">Rendelés #</th>
                            <th style="padding: 8px; text-align: left;">Vevő Neve</th>
                            <th style="padding: 8px; text-align: right;">Utánvét</th>
                            <th style="padding: 8px; text-align: center;">Státusz</th>
                            <th style="padding: 8px; text-align: left;">Megjegyzés / Korrekció</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(run.orders || []).map(o => `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px; font-weight: 700; white-space: nowrap;">${o.id}</td>
                                <td style="padding: 8px;">${o.shippingName}</td>
                                <td style="padding: 8px; text-align: right; white-space: nowrap;">${o.isReturn ? 'Visszaszállítás' : (o.isCOD ? o.codAmount.toLocaleString('hu-HU') + ' Ft' : '0 Ft')}</td>
                                <td style="padding: 8px; text-align: center;">[ &nbsp; ] Sikeres &nbsp;&nbsp; [ &nbsp; ] Meghiúsult</td>
                                <td style="padding: 8px; color: #64748b;">${o.isReturn ? '<em>Visszajön: ' + o.items.map(i => i.qty + 'db ' + i.name).join(', ') + '</em>' : ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
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
                ? `<div style="background: #faf5ff; border: 1.5px solid #d8b4fe; color: #6b21a8; padding: 15px; text-align: right; font-size: 16px; font-weight: 800;">
                    Visszaszállítás (Pénzmozgás nem történik)
                   </div>`
                : `<div style="background: #f8fafc; padding: 15px; text-align: right; font-size: 16px; font-weight: 800;">
                    Fizetendő (Utánvét): ${order.isCOD ? order.codAmount.toLocaleString('hu-HU') + ' Ft' : '0 Ft (FIZETVE)'}
                   </div>`;

            return `
            <div class="print-page" style="padding: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div style="font-size: 20px; font-weight: 800; color: ${isRet ? '#6b21a8' : 'inherit'};">${titleText}</div>
                    <div style="font-size: 22px; font-weight: 900; border: 2px solid ${isRet ? '#6b21a8' : '#000'}; padding: 6px 14px;">${order.id}</div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
                    <div style="width: 45%;"><strong>Eladó / Feladó:</strong><br>${senderData.name}<br>${senderData.address}<br>${senderData.bank}</div>
                    <div style="width: 45%;"><strong>Vevő / Címzett:</strong><br>${order.shippingName}<br>${order.fullAddress || order.address}<br>${order.shippingPhone || ''}</div>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                    <thead><tr style="border-bottom: 2px solid #000;"><th style="text-align: left; padding: 8px;">Tétel</th><th style="text-align: right; padding: 8px;">Mennyiség</th></tr></thead>
                    <tbody>${order.items.map(it => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${it.name}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${it.qty} db</td></tr>`).join('')}</tbody>
                </table>
                ${paymentHtml}
                <div style="margin-top: 60px; display: flex; justify-content: space-between;">
                    <div style="width: 180px; border-top: 1px solid #000; text-align: center; padding-top: 5px;">Átadó</div>
                    <div style="width: 180px; border-top: 1px solid #000; text-align: center; padding-top: 5px;">Átvevő</div>
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
    }
};