/**
 * History Orders Sub-module (Rendelések fül & Keresési találatok)
 * Rendelések keresése, szűrése és kártyáinak megjelenítése.
 */

import { HistoryManager } from '../../services/history.js';
import { showSettlementDialog } from './historyAccounting.js';
import { getPaymentDetails } from '../../utils/paymentUtils.js';

export async function renderOrdersTab(ctx) {
    const { 
        historySearchInput, isFiltered 
    } = ctx;
    
    if (!historySearchInput) return;

    const q = historySearchInput.value.trim().toLowerCase();
    const allRuns = await HistoryManager.getAllRuns();
    allRuns.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.timestamp || 0) - (a.timestamp || 0);
    });
    const filteredRuns = allRuns.filter(r => isFiltered(r));

    let matches = [];
    filteredRuns.forEach(run => {
        run.orders.forEach(order => {
            const name = order.shippingName ? String(order.shippingName).toLowerCase() : '';
            const id = order.id ? String(order.id).toLowerCase() : '';
            const addr = order.address ? String(order.address).toLowerCase() : '';
            const phone = order.shippingPhone ? String(order.shippingPhone) : '';
            
            const nameMatch = name.includes(q);
            const idMatch = id.includes(q);
            const addrMatch = addr.includes(q);
            const phoneMatch = phone.includes(q);
            const itemsMatch = order.items?.some(it => it.name && String(it.name).toLowerCase().includes(q)) || false;
            
            if (!q || idMatch || nameMatch || addrMatch || phoneMatch || itemsMatch) {
                matches.push({
                    runId: run.id,
                    runDate: run.date,
                    runCourier: run.courier,
                    runCompany: run.company,
                    runData: run,
                    ...order
                });
            }
        });
    });

    if (!q && matches.length > 200) {
        matches = matches.slice(0, 200);
    }

    const container = document.getElementById('orders-tab-container');
    if (!container) return;
    container.innerHTML = '';

    if (matches.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Nincs találat.</p>';
        return;
    }

    matches.forEach(m => {
        const el = document.createElement('div');
        el.className = 'history-run-card search-result-card';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'space-between';
        el.style.padding = '12px 18px';
        el.style.gap = '16px';
        el.style.marginBottom = '8px';
        el.style.background = '#fff';
        el.style.borderRadius = '14px';
        el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)';
        el.style.borderLeft = m.isReturn ? '4px solid #a855f7' : '4px solid #3b82f6';

        const itemsSummary = m.items.map(it => `${it.qty}× ${it.name}`).join(', ');
        const pd = getPaymentDetails(m.runData, m);

        let accountingBadgeHtml = '';

        if (m.isCOD) {
            let badgeText = 'Függőben';
            let badgeColor = '#f59e0b';
            let badgeBg = '#fef3c7';

            if (pd.isBankTransferred) {
                badgeText = 'Elutalva';
                badgeColor = '#3b82f6';
                badgeBg = '#dbeafe';
            } else if (pd.isUncollected) {
                badgeText = 'Nincs beszedve';
                badgeColor = '#ef4444';
                badgeBg = '#fee2e2';
            } else if (pd.isPartial) {
                badgeText = pd.isPending ? 'Részleges (Függő)' : 'Részleges';
                badgeColor = '#f97316';
                badgeBg = '#ffedd5';
            } else if (pd.isPending) {
                if (pd.pendingCard > 0) {
                    badgeText = 'Utalásra vár';
                    badgeColor = '#2563eb';
                    badgeBg = '#eff6ff';
                } else {
                    badgeText = 'Függő KP';
                    badgeColor = '#f59e0b';
                    badgeBg = '#fef3c7';
                }
            } else if (pd.isSettled) {
                badgeText = 'Elszámolva';
                badgeColor = '#10b981';
                badgeBg = '#d1fae5';
            }

            accountingBadgeHtml = `<span style="font-size: 10px; background: ${badgeBg}; color: ${badgeColor}; padding: 1px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 2px;"><i class="ph-bold ph-currency-circle-dollar" style="font-size: 11px;"></i> ${badgeText}</span>`;
        } else if (m.isReturn) {
            const badgeText = pd.isUncollected ? 'Meghiúsult visszahozatal' : 'Visszahozva';
            const badgeColor = pd.isUncollected ? '#ef4444' : '#6b21a8';
            const badgeBg = pd.isUncollected ? '#fee2e2' : '#f5f3ff';
            const iconClass = pd.isUncollected ? 'ph-x-circle' : 'ph-arrow-counter-clockwise';
            accountingBadgeHtml = `<span style="font-size: 10px; background: ${badgeBg}; color: ${badgeColor}; padding: 1px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 2px;"><i class="ph-bold ${iconClass}" style="font-size: 11px;"></i> ${badgeText}</span>`;
        } else {
            if (pd.isUncollected) {
                accountingBadgeHtml = `<span style="font-size: 10px; background: #fee2e2; color: #ef4444; padding: 1px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 2px;"><i class="ph-bold ph-x-circle" style="font-size: 11px;"></i> Nem átadva</span>`;
            } else {
                accountingBadgeHtml = `<span style="font-size: 10px; background: #f1f5f9; color: #64748b; padding: 1px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 2px;"><i class="ph-bold ph-prohibit" style="font-size: 11px;"></i> Nincs UV</span>`;
            }
        }

        let failureInfoHtml = '';
        if (pd.isUncollected && m.runData) {
            const reasons = m.runData.uncollectedReasons || {};
            const responsibilities = m.runData.uncollectedResponsibility || {};
            const rawId = String(m.id);
            const reasonText = reasons[rawId] || reasons[rawId.replace('#', '')] || 'Nincs megadva indok';
            const resp = responsibilities[rawId] || responsibilities[rawId.replace('#', '')] || 'vevo';

            let respText = 'Vevő';
            if (resp === 'mienk') respText = 'Cégünk';
            else if (resp === 'szallito') respText = 'Szállító';

            failureInfoHtml = `
                <div style="margin-top: 5px; font-size: 11px; background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; padding: 6px 10px; border-radius: 8px; display: flex; align-items: center; gap: 6px;">
                    <i class="ph-bold ph-warning" style="font-size: 14px; flex-shrink: 0;"></i>
                    <div>
                        <strong>Vissza:</strong> ${reasonText}
                        <span style="background: #ffedd5; color: #ea580c; font-size: 9px; padding: 1px 4px; border-radius: 4px; font-weight: 700; margin-left: 4px; border: 1px solid #fed7aa;">
                            Felelős: ${respText}
                        </span>
                    </div>
                </div>
            `;
        }

        el.innerHTML = `
            <div class="s-section-info" style="flex: 1;">
                <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin-bottom: 4px;">
                    <span style="font-weight: 900; color: ${m.isReturn ? '#a855f7' : '#3b82f6'}; font-size: 13px;">${m.id}</span>
                    <span style="font-size: 9px; background: #0f172a; color: white; padding: 1px 6px; border-radius: 4px; font-weight: 700;">${m.runCompany}</span>
                    <span class="btn-settle-search-run" data-run-id="${m.runId}" style="font-size: 10px; background: #f1f5f9; color: #475569; padding: 1px 6px; border-radius: 4px; font-weight: 600; display: inline-flex; align-items: center; gap: 3px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'"><i class="ph-bold ph-calendar" style="font-size: 11px;"></i> ${m.runDate}</span>
                    <span class="btn-settle-search-run" data-run-id="${m.runId}" style="font-size: 10px; background: #e0f2fe; color: #0284c7; padding: 1px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#bae6fd'" onmouseout="this.style.background='#e0f2fe'"><i class="ph-bold ph-truck" style="font-size: 11px;"></i> ${m.runCourier}</span>
                    ${accountingBadgeHtml}
                </div>
                <div style="font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 2px;">${m.shippingName}</div>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                    <i class="ph-bold ph-map-pin" style="color: #94a3b8; font-size: 13px;"></i>
                    ${m.address || '-'}
                </div>
                <div style="font-size: 10px; color: #475569; background: #f8fafc; padding: 6px 10px; border-radius: 8px; border: 1px solid #e2e8f0; line-height: 1.3;">
                    <strong>Tételek:</strong> ${itemsSummary}
                </div>
                ${failureInfoHtml}
            </div>

            <div class="s-section-actions" style="display: flex; flex-direction: column; gap: 8px; min-width: 130px; border-left: 1px solid #f1f5f9; padding-left: 16px; justify-content: center;">
                <button class="btn btn-primary btn-settle-search-run" data-run-id="${m.runId}" style="padding: 8px 12px; font-size: 11px; font-weight: 700; border-radius: 8px; background: #3b82f6; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <i class="ph-bold ph-currency-circle-dollar" style="font-size: 13px;"></i>
                    Elszámolás
                </button>
            </div>
        `;
        container.appendChild(el);
    });

    container.querySelectorAll('.btn-settle-search-run').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const runId = e.target.closest('.btn-settle-search-run').getAttribute('data-run-id');
            const run = await HistoryManager.getRunById(runId);
            if (!run) return;

            let runCOD = 0;
            run.orders.forEach(o => { if(o.isCOD) runCOD += o.codAmount; });

            const existingState = {
                uncollectedOrderIds: run.uncollectedOrderIds || [],
                uncollectedReasons: run.uncollectedReasons || {},
                partialOrders: run.partialOrders || {},
                bankTransferredOrderIds: run.bankTransferredOrderIds || [],
                uncollectedResponsibility: run.uncollectedResponsibility || {}
            };

            const result = await showSettlementDialog(run, runCOD, existingState);
            if (result === null) return;

            if (await HistoryManager.updateSettlementStatus(
                run.docId, 
                result.settledAmount, 
                runCOD, 
                result.uncollectedOrderIds, 
                result.uncollectedReasons, 
                result.partialOrders, 
                result.bankTransferredOrderIds, 
                result.uncollectedResponsibility,
                result.settledKpAmount,
                result.settledCardAmount,
                result.paymentMethods,
                result.paymentStatusMap
            )) {
                renderOrdersTab(ctx);
            }
        });
    });
}

export function renderSearchResults(ctx, matches) {
    const { hsResultsContainer } = ctx;
    if (!hsResultsContainer) return;
    hsResultsContainer.innerHTML = '';
    
    if(matches.length === 0) {
        hsResultsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Nincs találat.</p>';
        return;
    }
    
    matches.forEach(m => {
        const el = document.createElement('div');
        el.className = 'history-run-card search-result-card';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'space-between';
        el.style.padding = '20px 28px';
        el.style.gap = '24px';
        el.style.marginBottom = '12px';
        el.style.background = '#fff';
        el.style.borderRadius = '20px';
        el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)';
        el.style.borderLeft = '6px solid #3b82f6';
        
        const itemsSummary = m.items.map(it => `${it.qty}× ${it.name}`).join(', ');
        
        const pd = getPaymentDetails(m.runData, m);
        
        if (m.isCOD) {
            let badgeText = 'Függőben lévő elszámolás';
            let badgeColor = '#f59e0b';
            let badgeBg = '#fef3c7';

            if (pd.isBankTransferred) {
                badgeText = 'Utólag elutalva';
                badgeColor = '#3b82f6';
                badgeBg = '#dbeafe';
            } else if (pd.isUncollected) {
                badgeText = 'Nincs beszedve';
                badgeColor = '#ef4444';
                badgeBg = '#fee2e2';
            } else if (pd.isPartial) {
                badgeText = pd.isPending ? 'Részlegesen beszedve (Függő)' : 'Részlegesen beszedve';
                badgeColor = '#f97316';
                badgeBg = '#ffedd5';
            } else if (pd.isPending) {
                if (pd.pendingCard > 0) {
                    badgeText = 'Kártyás utalásra vár';
                    badgeColor = '#2563eb';
                    badgeBg = '#eff6ff';
                } else {
                    badgeText = 'Függő készpénz';
                    badgeColor = '#f59e0b';
                    badgeBg = '#fef3c7';
                }
            } else if (pd.isSettled) {
                badgeText = 'Készpénzben / Kártyán elszámolva';
                badgeColor = '#10b981';
                badgeBg = '#d1fae5';
            }

            accountingBadgeHtml = `<span style="font-size: 11px; background: ${badgeBg}; color: ${badgeColor}; padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-left: 5px; display: flex; align-items: center; gap: 4px;"><i class="ph-bold ph-currency-circle-dollar" style="font-size: 13px;"></i> ${badgeText}</span>`;
        } else if (m.isReturn) {
            const badgeText = pd.isUncollected ? 'Meghiúsult visszahozatal' : 'Visszahozva';
            const badgeColor = pd.isUncollected ? '#ef4444' : '#6b21a8';
            const badgeBg = pd.isUncollected ? '#fee2e2' : '#f5f3ff';
            const iconClass = pd.isUncollected ? 'ph-x-circle' : 'ph-arrow-counter-clockwise';
            accountingBadgeHtml = `<span style="font-size: 11px; background: ${badgeBg}; color: ${badgeColor}; padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-left: 5px; display: flex; align-items: center; gap: 4px;"><i class="ph-bold ${iconClass}" style="font-size: 13px;"></i> ${badgeText}</span>`;
        } else {
            if (pd.isUncollected) {
                accountingBadgeHtml = `<span style="font-size: 11px; background: #fee2e2; color: #ef4444; padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-left: 5px; display: flex; align-items: center; gap: 4px;"><i class="ph-bold ph-x-circle" style="font-size: 13px;"></i> Nem lett átadva</span>`;
            } else {
                accountingBadgeHtml = `<span style="font-size: 11px; background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-left: 5px; display: flex; align-items: center; gap: 4px;"><i class="ph-bold ph-prohibit" style="font-size: 13px;"></i> Nincs utánvét</span>`;
            }
        }
        
        let failureInfoHtml = '';
        if (pd.isUncollected && m.runData) {
            const reasons = m.runData.uncollectedReasons || {};
            const responsibilities = m.runData.uncollectedResponsibility || {};
            const rawId = String(m.id);
            const reasonText = reasons[rawId] || reasons[rawId.replace('#', '')] || 'Nincs megadva indok';
            const resp = responsibilities[rawId] || responsibilities[rawId.replace('#', '')] || 'vevo';
            
            let respText = 'Vevő';
            if (resp === 'mienk') respText = 'Cégünk';
            else if (resp === 'szallito') respText = 'Szállító';
            
            failureInfoHtml = `
                <div style="margin-top: 8px; font-size: 12px; background: #fff7ed; color: #c2410c; border: 1.5px solid #fed7aa; padding: 10px 14px; border-radius: 10px; display: flex; align-items: center; gap: 8px;">
                    <i class="ph-bold ph-warning" style="font-size: 16px; flex-shrink: 0;"></i>
                    <div>
                        <strong>Visszaérkezett / Nem kereste:</strong> ${reasonText}
                        <span style="background: #ffedd5; color: #ea580c; font-size: 10px; padding: 2px 6px; border-radius: 6px; font-weight: 700; margin-left: 6px; border: 1px solid #fed7aa;">
                            Felelős: ${respText}
                        </span>
                    </div>
                </div>
            `;
        }
        
        el.innerHTML = `
            <div class="s-section-info" style="flex: 1;">
                <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 6px;">
                    <span style="font-weight: 900; color: #3b82f6; font-size: 15px;">${m.id}</span>
                    <span style="font-size: 10px; background: #0f172a; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${m.runCompany}</span>
                    <span style="font-size: 11px; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-weight: 600; display: flex; align-items: center; gap: 5px;"><i class="ph-bold ph-calendar" style="font-size: 13px;"></i> ${m.runDate}</span>
                    <span style="font-size: 11px; background: #e0f2fe; color: #0284c7; padding: 2px 8px; border-radius: 4px; font-weight: 700; display: flex; align-items: center; gap: 4px;"><i class="ph-bold ph-truck" style="font-size: 13px;"></i> ${m.runCourier}</span>
                    ${accountingBadgeHtml}
                </div>
                <div style="font-size: 17px; font-weight: 800; color: #1e293b; margin-bottom: 2px;">${m.shippingName}</div>
                <div style="font-size: 12px; color: #64748b; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    <i class="ph-bold ph-map-pin" style="color: #94a3b8; font-size: 16px;"></i>
                    ${m.address || '-'}
                </div>
                <div style="font-size: 11px; color: #475569; background: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; line-height: 1.4;">
                    <i class="ph-bold ph-package" style="margin-right: 5px; color: #64748b; font-size: 14px;"></i>
                    <strong>Tételek:</strong> ${itemsSummary}
                </div>
                ${failureInfoHtml}
            </div>

            <div class="s-section-actions" style="display: flex; flex-direction: column; gap: 10px; min-width: 220px; border-left: 1px solid #f1f5f9; padding-left: 24px; justify-content: center;">
                <button class="btn btn-primary btn-settle-search-run" data-run-id="${m.runId}" style="padding: 12px; font-size: 13px; font-weight: 700; border-radius: 12px; background: #3b82f6; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="ph-bold ph-currency-circle-dollar" style="font-size: 16px;"></i>
                    Elszámolás megnyitása
                </button>
            </div>
        `;
        hsResultsContainer.appendChild(el);
    });

    hsResultsContainer.querySelectorAll('.btn-settle-search-run').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const runId = e.target.closest('button').getAttribute('data-run-id');
            const run = await HistoryManager.getRunById(runId);
            if (!run) return;
            
            let runCOD = 0;
            run.orders.forEach(o => { if(o.isCOD) runCOD += o.codAmount; });
            
            const existingState = {
                uncollectedOrderIds: run.uncollectedOrderIds || [],
                uncollectedReasons: run.uncollectedReasons || {},
                partialOrders: run.partialOrders || {},
                bankTransferredOrderIds: run.bankTransferredOrderIds || [],
                uncollectedResponsibility: run.uncollectedResponsibility || {},
                paymentMethods: run.paymentMethods || {},
                settledKpAmount: run.settledKpAmount || null,
                settledCardAmount: run.settledCardAmount || null,
                paymentStatusMap: run.paymentStatusMap || {}
            };
            
            const result = await showSettlementDialog(run, runCOD, existingState);
            if (result === null) return;
            
            if (await HistoryManager.updateSettlementStatus(
                run.docId, 
                result.settledAmount, 
                runCOD, 
                result.uncollectedOrderIds, 
                result.uncollectedReasons, 
                result.partialOrders, 
                result.bankTransferredOrderIds, 
                result.uncollectedResponsibility,
                result.settledKpAmount,
                result.settledCardAmount,
                result.paymentMethods,
                null,
                result.paymentStatusMap
            )) {
                renderOrdersTab(ctx);
            }
        });
    });
}
