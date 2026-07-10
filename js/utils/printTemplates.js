import { HistoryManager } from '../services/history.js';

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

export function generatePdfHtml(run) {
        let cardsHtml = run.orders.map((order, index) => {
            let codHtml = '';
            if (order.isBankDeposit) {
                if (order.isPaid) {
                    codHtml = `<span class="badge badge-paid">UTALVA (FIZETVE)</span>`;
                } else {
                    codHtml = `<span class="badge badge-warning">UTALÁST VÁRUNK</span>`;
                }
            } else if (order.isCOD) {
                const formattedAmount = new Intl.NumberFormat('hu-HU').format(order.codAmount);
                codHtml = `<span class="badge badge-cod">UTÁNVÉT: ${formattedAmount} Ft</span>`;
            } else {
                codHtml = `<span class="badge badge-paid">Fizetve / Nincs Utánvét</span>`;
            }

            let errorsHtml = '';
            if (order.errors && order.errors.length > 0) {
                errorsHtml = order.errors.map((err) => `
                    <div class="error-box">
                        <div class="error-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            ${err.title}
                        </div>
                        <div class="error-desc">${err.desc}</div>
                    </div>
                `).join('');
            }

            let itemsHtml = order.items.map((item, iIdx) => {
                const showMarker = needsMarkerLabel(item.name, item.isCollapsedProfile);
                let toggleHtml = '';
                let subItemsHtml = '';
                
                if (item.isCollapsedProfile && item.subItems && item.subItems.length > 0) {
                    toggleHtml = ` <span class="profile-toggle no-print" onclick="
                        var el = document.getElementById('pdf-sub-${index}-${iIdx}');
                        if(el.style.display==='none'){el.style.display='block';this.textContent='▲';}
                        else{el.style.display='none';this.textContent='▼';}
                    " style="cursor: pointer; color: #3b82f6; font-size: 11px; margin-left: 6px; font-weight: 600;">▼</span>`;
                    subItemsHtml = `
                        <div id="pdf-sub-${index}-${iIdx}" class="profile-subitems no-print" style="display: none; padding: 6px 0 0 12px; font-size: 11px; color: #475569;">
                            ${item.subItems.map(sub => `<div style="margin-bottom: 2px;">• ${sub.qty} db - ${sub.name}</div>`).join('')}
                        </div>
                    `;
                }

                return `
                    <tr>
                        <td class="col-check"><div class="col-flex-center"><div class="checkbox-box"></div></div></td>
                        <td class="col-qty nowrap"><strong>${item.qty} db</strong></td>
                        <td class="col-name">${highlightItemName(item.name)}${toggleHtml}${subItemsHtml}</td>
                    </tr>
                `;
            }).join('');

            return `
                <div class="order-card ${order.errors && order.errors.length > 0 ? 'has-error' : ''}">
                    <div class="order-header">
                        <div class="header-left">
                            <div class="order-index">${index + 1}</div>
                            <div>
                                <div class="order-id">${order.id}</div>
                                <div class="order-customer">${order.shippingName}</div>
                                <div class="order-address">${order.address}</div>
                            </div>
                        </div>
                        <div class="order-meta">
                            <div class="badge-container">${codHtml}</div>
                        </div>
                    </div>
                    ${errorsHtml}
                    <table class="items-table">
                        <tbody>${itemsHtml}</tbody>
                    </table>
                </div>
            `;
        }).join('');

        let styles = '';
        try {
            styles = Array.from(document.styleSheets).map(sheet => {
                if (sheet.href) return `<link rel="stylesheet" href="${sheet.href}">`;
                return `<style>${Array.from(sheet.cssRules).map(rule => rule.cssText).join('')}</style>`;
            }).join('\n');
        } catch (e) {
            styles = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="css/style.css">`;
        }

        const dateStr = new Date(run.timestamp).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        return `
            <!DOCTYPE html>
            <html lang="hu">
            <head>
                <meta charset="UTF-8">
                <title>Kiszedési Jegyzék - ${run.date} - ${run.courier}</title>
                ${styles}
                <style>
                    body { background: white !important; padding: 10px !important; color: black; }
                    .app-container { max-width: 1200px; margin: 0 auto; box-shadow: none; background: transparent; padding: 0; position: relative; min-height: 100vh; }
                    .order-card { break-inside: avoid; margin-bottom: 8px; box-shadow: none; border: 1px solid #e2e8f0; padding: 6px !important; }
                    .order-header { margin-bottom: 4px !important; padding-bottom: 4px !important; }
                    .items-table td { padding: 2px 4px !important; vertical-align: middle !important; font-size: 11px !important; }
                    .no-print { display: none !important; }
                    .col-flex-center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0px; }
                    .marker-lbl { font-size: 7px; color: #64748b; font-weight: 800; text-transform: uppercase; line-height: 1; margin-bottom: 1px; }
                    .print-document-header { text-align: center; margin-bottom: 6px; border-bottom: 1.5px solid black; padding-bottom: 4px; }
                    .print-document-header h1 { font-size: 16px; margin: 0; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
                    .print-document-footer { 
                        position: fixed; 
                        bottom: 10px; 
                        right: 10px; 
                        background: white; 
                        border: 1.5px solid #000; 
                        padding: 6px 12px; 
                        border-radius: 6px; 
                        font-size: 10px; 
                        z-index: 1000;
                        display: flex;
                        align-items: center;
                        box-shadow: 0 0 10px white;
                    }
                    .print-document-footer strong { font-size: 11px; font-weight: 800; display: inline; margin-left: 3px; }
                </style>
            </head>
            <body>
                <div class="app-container">
                    <div class="print-document-header">
                        <h1>Kiszedési jegyzék</h1>
                    </div>
                    
                    <div class="print-document-footer">
                        <span style="color: #64748b; text-transform: uppercase; margin-right: 15px;">Szállítási Adatok:</span>
                        <span style="margin-right: 15px;">Cég: <strong>${run.company || '-'}</strong></span>
                        <span style="margin-right: 15px;">Szállító: <strong>${run.courier}</strong></span>
                        <span style="margin-right: 15px;">Felvétel: <strong>${run.pickupDate || run.date}</strong></span>
                        <span>Kiszállítás: <strong>${run.date}</strong></span>
                    </div>

                    <div class="content-body" style="padding-bottom: 120px;">
                        <div class="order-list">
                            ${cardsHtml}
                        </div>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(() => window.print(), 500);
                    };
                </script>
            </body>
            </html>
        `;
    }

    export function openPdfView(run) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            CustomDialog.alert('Kérlek engedélyezd a felugró ablakokat a PDF nézethez!', 'Hiba', 'error');
            return;
        }
        printWindow.document.write(generatePdfHtml(run));
        printWindow.document.close();
    }

    export async function generateDeliveryNotesHtml(runId) {
        const run = await HistoryManager.getRunById(runId);
        if (!run) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            CustomDialog.alert('Kérlek engedélyezd a felugró ablakokat a szállítólevelekhez!', 'Hiba', 'error');
            return;
        }

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

        let notesHtml = `
            <!DOCTYPE html>
            <html lang="hu">
            <head>
                <meta charset="UTF-8">
                <title>Szállítólevelek - ${run.date}</title>
                <style>
                    @page { size: A4 portrait; margin: 15mm; }
                    body {
                        font-family: 'Inter', sans-serif, Arial;
                        margin: 0;
                        padding: 0;
                        color: #1e293b;
                        background: #f1f5f9;
                    }
                    .page {
                        width: 210mm;
                        padding: 18mm 20mm;
                        box-sizing: border-box;
                        break-after: page;
                        page-break-after: always;
                        background: white;
                        margin: 15mm auto;
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    }
                    @media print {
                        body { background: none; }
                        .page { 
                            margin: 0; 
                            border: none; 
                            padding: 10mm 15mm; 
                            box-shadow: none; 
                            break-after: page; 
                            page-break-after: always; 
                            width: 100%;
                            height: 100%;
                            position: relative;
                        }
                        .signatures { break-inside: avoid; page-break-inside: avoid; margin-top: 25px; }
                        .summary { break-inside: avoid; page-break-inside: avoid; }
                        table { break-inside: auto; }
                        tr { break-inside: avoid; page-break-inside: avoid; }
                        h3 { break-after: avoid; page-break-after: avoid; }
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        border-bottom: 2px solid #e2e8f0;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }
                    .header-block {
                        width: 48%;
                    }
                    .header-title {
                        font-size: 14px;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 8px;
                        font-weight: 600;
                    }
                    .info-text {
                        font-size: 14px;
                        line-height: 1.5;
                    }
                    .doc-title {
                        text-align: center;
                        font-size: 24px;
                        font-weight: 700;
                        margin: 20px 0;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                        font-size: 14px;
                    }
                    th, td {
                        padding: 10px;
                        text-align: left;
                        border-bottom: 1px solid #e2e8f0;
                        vertical-align: middle;
                    }
                    th {
                        background: #f8fafc;
                        font-weight: 600;
                        color: #475569;
                    }
                    .text-right {
                        text-align: right;
                    }
                    .summary {
                        margin-top: 30px;
                        display: flex;
                        justify-content: flex-end;
                    }
                    .summary-box {
                        width: 300px;
                        background: #f8fafc;
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                    }
                    .summary-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                        font-size: 14px;
                    }
                    .summary-row.total {
                        font-weight: 700;
                        font-size: 16px;
                        border-top: 1px solid #cbd5e1;
                        padding-top: 8px;
                        margin-top: 8px;
                    }
                    .signatures {
                        margin-top: 80px;
                        display: flex;
                        justify-content: space-between;
                    }
                    .signature-box {
                        width: 250px;
                        text-align: center;
                    }
                    .signature-line {
                        border-bottom: 1px solid #000;
                        margin-bottom: 10px;
                        height: 30px;
                    }
                    .footer {
                        margin-top: 25px;
                        text-align: center;
                        font-size: 11px;
                        color: #94a3b8;
                        border-top: 1px dashed #e2e8f0;
                        padding-top: 10px;
                    }
                </style>
            </head>
            <body>
        `;

        let aggregatedItems = {};
        let totalCOD = 0;

        run.orders.forEach(order => {
            if (order.isCOD) {
                totalCOD += order.codAmount;
            }
            order.items.forEach(item => {
                if (item.isCollapsedProfile && item.subItems && item.subItems.length > 0) {
                    item.subItems.forEach(sub => {
                        if (!aggregatedItems[sub.name]) {
                            aggregatedItems[sub.name] = 0;
                        }
                        aggregatedItems[sub.name] += sub.qty;
                    });
                } else {
                    if (!aggregatedItems[item.name]) {
                        aggregatedItems[item.name] = 0;
                    }
                    aggregatedItems[item.name] += item.qty;
                }
            });
        });

        let summaryItemsHtml = Object.keys(aggregatedItems)
            .sort()
            .map(name => {
                return `
                    <tr>
                        <td>${name}</td>
                        <td class="text-right" style="font-size: 16px;"><strong>${aggregatedItems[name]} db</strong></td>
                    </tr>
                `;
            }).join('');

        const orderIdsList = run.orders.map(o => o.id).join(', ');

        let correctionRows = run.orders.map(order => {
            return `
                <tr>
                    <td style="font-weight: 700;">${order.id}</td>
                    <td>${order.shippingName}</td>
                    <td class="text-right" style="font-weight: 700; color: ${order.isCOD ? '#b91c1c' : '#15803d'};">
                        ${order.isCOD ? order.codAmount.toLocaleString('hu-HU') + ' Ft' : 'Fizetve'}
                    </td>
                    <!-- KP Checkbox -->
                    <td style="text-align: center; border-left: 2px solid #cbd5e1;">
                        <div style="width: 20px; height: 20px; border: 1px solid #94a3b8; border-radius: 3px; display: inline-block;"></div>
                    </td>
                    <!-- Kártya Checkbox -->
                    <td style="text-align: center; border-left: 1px solid #cbd5e1;">
                        <div style="width: 20px; height: 20px; border: 1px solid #94a3b8; border-radius: 3px; display: inline-block;"></div>
                    </td>
                    <td></td>
                </tr>
            `;
        }).join('');

        // === Összesítő lap HTML (2x kell) ===
        const summaryPageHtml = `
            <div class="page">
                <div class="doc-title" style="font-size: 28px; margin-bottom: 5px;">Összesítő (Átadás-Átvétel)</div>
                <div style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 10px;">Kelt: ${run.date} | Szállító: ${run.courier}</div>
                <div style="text-align: center; background: #0f172a; color: white; font-size: 22px; font-weight: 800; padding: 12px 24px; border-radius: 10px; margin-bottom: 30px; letter-spacing: 1px;">${run.company || '-'}</div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                    <div style="font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 5px; text-transform: uppercase;">Összes beszedendő utánvét a körben:</div>
                    <div style="font-size: 32px; font-weight: 800; color: #b91c1c;">${totalCOD.toLocaleString('hu-HU')} Ft</div>
                </div>

                <div style="margin-bottom: 20px; padding: 8px 12px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 6px; font-weight: 600; color: #475569; text-align: center; font-size: 12px;">
                    A panelek sértetlen állapotban lettek átadva.
                </div>

                <h3 style="margin-bottom: 15px; color: #334155; font-size: 18px;">Átadott termékek összesítve:</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Megnevezés</th>
                            <th class="text-right">Összes Mennyiség</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${summaryItemsHtml}
                    </tbody>
                </table>

                <div style="margin-top: 20px; padding: 15px; background: #f1f5f9; border-radius: 8px;">
                    <div style="font-size: 14px; color: #475569; font-weight: 600; margin-bottom: 5px;">Körben lévő rendelések:</div>
                    <div style="font-size: 14px; font-weight: 700; line-height: 1.5;">${orderIdsList}</div>
                </div>

                <div class="signatures" style="margin-top: 60px;">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>Átadó (Raktár)</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Dátum: ...............................</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>Átvette (Szállító: ${run.courier})</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Dátum: ...............................</div>
                    </div>
                </div>
            </div>
            
        `;
        // === Korrekciós lap HTML (1x kell) ===
        const correctionPageHtml = `
            <div class="page">
                <div class="doc-title" style="font-size: 28px; margin-bottom: 5px;">Korrekciós és Elszámoló Lap</div>
                <div style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 30px;">Kelt: ${run.date} | Szállító: ${run.courier} | Kitöltendő visszavételkor!</div>

                <table>
                    <thead>
                        <tr>
                            <th>Rendelésszám</th>
                            <th>Vevő Neve</th>
                            <th class="text-right">Utánvét</th>
                            <th style="text-align: center; border-left: 2px solid #cbd5e1; width: 50px;">KP</th>
                            <th style="text-align: center; border-left: 1px solid #cbd5e1; width: 50px;">Kártya</th>
                            <th>Visszahozott tételek (Kézzel kitöltendő)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${correctionRows}
                    </tbody>
                </table>

                <div style="margin-top: 40px; width: 400px; margin-left: auto;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px;">
                        <span>Eredeti Várható Utánvét:</span>
                        <strong>${totalCOD.toLocaleString('hu-HU')} Ft</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px; color: #b91c1c;">
                        <span>Meghiúsult Utánvét:</span>
                        <strong style="border-bottom: 1px dashed #b91c1c; width: 120px; text-align: right;">.................... Ft</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px; color: #1e293b;">
                        <span>Készpénzben fizetve:</span>
                        <strong style="border-bottom: 1px dashed #1e293b; width: 120px; text-align: right;">.................... Ft</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px; color: #1d4ed8;">
                        <span>Kártyával fizetve:</span>
                        <strong style="border-bottom: 1px dashed #1d4ed8; width: 120px; text-align: right;">.................... Ft</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px; color: #0284c7;">
                        <span>Utalással kifizetve:</span>
                        <strong style="border-bottom: 1px dashed #0284c7; width: 120px; text-align: right;">.................... Ft</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px solid #000; font-size: 18px; font-weight: 800; color: #16a34a;">
                        <span>Átadott KP rész:</span>
                        <strong style="border-bottom: 2px solid #16a34a; width: 150px; text-align: right;">.................... Ft</strong>
                    </div>
                </div>

                <div class="signatures" style="margin-top: 80px;">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>Átvette (Raktár)</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Dátum: ...............................</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>Befizette (Szállító: ${run.courier})</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Dátum: ...............................</div>
                    </div>
                </div>
            </div>
        `;

        // === Szállítólevelek HTML (2x kell, sorban kétszer) ===
        const deliveryNotesHtmlAll = run.orders.map((order) => {
            let totalOrderValue = 0;
            const itemsHtml = order.items.map(item => {
                const itemTotal = item.price * item.qty;
                totalOrderValue += itemTotal;

                if (item.isCollapsedProfile && item.subItems && item.subItems.length > 0) {
                    // Ha összekészített profil, akkor CSAK a tételeit listázzuk, a gyűjtőnevet nem
                    return item.subItems.map(sub => `
                        <tr>
                            <td style="padding-left: 20px;">• ${sub.name}</td>
                            <td class="text-right">${sub.qty} db</td>
                        </tr>
                    `).join('');
                }

                return `
                    <tr>
                        <td>${item.name}</td>
                        <td class="text-right">${item.qty} db</td>
                    </tr>
                `;
            }).join('');

            return `
                <div class="page">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                        <div class="doc-title" style="margin-bottom: 0;">Szállítólevél</div>
                        <div style="font-size: 28px; font-weight: 900; background: #f8fafc; padding: 10px 20px; border-radius: 8px; color: #0f172a; border: 2px solid #e2e8f0;">
                            ${order.id}
                        </div>
                    </div>
                    <div style="text-align: left; color: #64748b; font-size: 14px; margin-top: -20px; margin-bottom: 30px;">Kelt: ${run.date}</div>

                    <div class="header">
                        <div class="header-block">
                            <div class="header-title">Feladó (Eladó)</div>
                            <div class="info-text">
                                <strong>${senderData.name}</strong><br>
                                Cím: ${senderData.address}<br>
                                Bankszámla: ${senderData.bank}<br>
                                Tel: ${senderData.phone}<br>
                                E-mail: ${senderData.email}
                            </div>
                        </div>
                        <div class="header-block">
                            <div class="header-title">Címzett (Vevő)</div>
                            <div class="info-text">
                                <strong>${order.shippingName}</strong><br>
                                Cím: ${order.fullAddress}<br>
                                Tel: ${order.shippingPhone}
                            </div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Megnevezés</th>
                                <th class="text-right">Mennyiség</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="summary">
                        <div class="summary-box">
                            ${order.isCOD ? `
                            <div class="summary-row total" style="color: #b91c1c; border-top-color: #fca5a5;">
                                <span>UTÁNVÉT:</span>
                                <span style="font-size: 22px;">${order.codAmount.toLocaleString('hu-HU')} Ft</span>
                            </div>
                            ` : `
                            <div class="summary-row total" style="color: #15803d; border-top-color: #86efac;">
                                <span>FIZETENDŐ:</span>
                                <span style="font-size: 22px;">0 Ft (Fizetve)</span>
                            </div>
                            `}
                        </div>
                    </div>

                    <div style="break-inside: avoid; page-break-inside: avoid; margin-top: 40px;">
                        <div class="signatures" style="margin-top: 0;">
                            <div class="signature-box">
                                <div class="signature-line"></div>
                                <div>Átadó</div>
                            </div>
                            <div class="signature-box">
                                <div class="signature-line"></div>
                                <div>Átvette (Vevő)</div>
                            </div>
                        </div>
                        <div class="footer" style="margin-top: 20px;">
                            Ez a dokumentum a szállítást kísérő bizonylat. Nem minősül számlának.
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // === Összerakás: 2x Összesítő, 1x Korrekciós, 2x Szállítólevelek sorozat ===
        notesHtml += summaryPageHtml + summaryPageHtml + correctionPageHtml + deliveryNotesHtmlAll + deliveryNotesHtmlAll;

        notesHtml += `
            <script>
                // Opcionális: automatikus nyomtatás
                // window.onload = function() { window.print(); }
            </script>
            </body>
            </html>
        `;

        printWindow.document.write(notesHtml);
        printWindow.document.close();
    }


window.generateDeliveryNotesHtml = generateDeliveryNotesHtml;
