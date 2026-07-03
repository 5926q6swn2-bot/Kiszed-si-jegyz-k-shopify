import { HistoryManager } from '../services/history.js';
import { db, doc, updateDoc, deleteDoc } from '../firebase-config.js';
import { CustomDialog } from '../utils/dialog.js';

let ctx = {};

export function initHistoryView(context) {
    ctx = context;
}
    export async function renderHistoryRuns() {
    const { 
        historyRunsContainer, ordersRunsContainer, accountingRunsContainer, trashRunsContainer, hsResultsContainer,
        accountingFilterPending, trashCompanyFilter, trashDateStart, trashDateEnd,
        isFiltered, attachHistoryEvents, openPdfView, handleHistorySearch, generateDeliveryNotesHtml,
        historySearchInput
    } = ctx;
        const runs = await HistoryManager.getAllRuns();
        runs.sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            if (dateA !== dateB) return dateB.localeCompare(dateA);
            return (b.timestamp || 0) - (a.timestamp || 0);
        });
        historyRunsContainer.innerHTML = '';
        
        // Szűrés a dátum/cég szerint
        let filteredRuns = runs.filter(r => isFiltered(r));
        
        const q = historySearchInput.value.trim().toLowerCase();
        if (q.length >= 2) {
            filteredRuns = filteredRuns.filter(run => {
                const courierMatch = run.courier ? String(run.courier).toLowerCase().includes(q) : false;
                const companyMatch = run.company ? String(run.company).toLowerCase().includes(q) : false;
                const orderMatch = run.orders.some(o => {
                    const name = o.shippingName ? String(o.shippingName).toLowerCase() : '';
                    const id = o.id ? String(o.id).toLowerCase() : '';
                    const addr = o.address ? String(o.address).toLowerCase() : '';
                    const phone = o.shippingPhone ? String(o.shippingPhone) : '';
                    const items = o.items?.some(it => it.name && String(it.name).toLowerCase().includes(q)) || false;
                    return id.includes(q) || name.includes(q) || addr.includes(q) || phone.includes(q) || items;
                });
                return courierMatch || companyMatch || orderMatch;
            });
        }

        if(filteredRuns.length === 0) {
            historyRunsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; margin-top: 20px;">Nincsenek a feltételnek megfelelő mentett körök.</p>';
            return;
        }
        
        // Összevont eredetiek elrejtése
        const visibleRuns = filteredRuns;

        visibleRuns.forEach(run => {
            const el = document.createElement('div');
            el.className = 'history-apple-card';
            const dateStr = new Date(run.timestamp).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const modifiedBadge = run.isModified
                ? `<span class="hac-badge" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ph-bold ph-pencil-simple" style="font-size:10px;"></i>Módosítva${run.modifyCount > 1 ? ` (${run.modifyCount}×)` : ''}</span>`
                : '';

            const previewChips = run.orders.map(o =>
                `<span class="hac-order-chip" title="${o.address || ''}" style="gap:5px;display:inline-flex;align-items:center;">
                    <span class="hac-chip-id">${o.id}</span>
                    <span class="hac-chip-name">${o.shippingName || ''}</span>
                    <i class="ph-bold ph-printer btn-print-chip-delivery no-print" data-run-id="${run.id}" data-order-id="${o.id}" style="cursor:pointer;color:#64748b;font-size:11px;padding:2px;transition:color .15s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'"></i>
                </span>`
            ).join('');
            el.innerHTML = `
                <div class="hac-row">
                    <div class="hac-info">
                        <span class="hac-company">${run.company || '-'}</span>
                        <span class="hac-date">${run.date}</span>
                        ${modifiedBadge}
                        <span class="hac-sep">·</span>
                        <i class="ph-bold ph-user" style="font-size:10px;color:#374151;"></i><span class="hac-courier">${run.courier}</span>
                        <span class="hac-sep">·</span>
                        <span class="hac-timestamp">${run.orders.length} r · ${dateStr}</span>
                    </div>
                    <div class="hac-prints">
                        <button class="hac-print-btn btn-print-picking" data-id="${run.id}" title="Szedőlista">
                            <i class="ph-bold ph-clipboard-text"></i>
                        </button>
                        <button class="hac-print-btn btn-print-delivery" data-id="${run.id}" title="Szállítólevelek">
                            <i class="ph-bold ph-truck"></i>
                        </button>
                        <button class="hac-print-btn btn-print-summary" data-id="${run.id}" title="Összesítő">
                            <i class="ph-bold ph-file-text"></i>
                        </button>
                        <button class="hac-print-btn hac-print-primary btn-print-bundle" data-id="${run.id}" title="Teljes csomag nyomtatása">
                            <i class="ph-bold ph-printer"></i>Teljes
                        </button>
                    </div>
                    <div class="hac-actions">
                        <button class="hac-btn-load btn-load-run" data-id="${run.id}">Betöltés</button>
                        <button class="hac-btn-del btn-delete-run" data-id="${run.id}" title="Törlés">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                        <button class="hac-btn-preview btn-toggle-preview" title="Rendelések előnézete">
                            <i class="ph-bold ph-caret-down"></i>
                        </button>
                    </div>
                </div>
                <div class="hac-preview">
                    <div class="hac-preview-inner">${previewChips}</div>
                </div>
            `;
            historyRunsContainer.appendChild(el);
        });

        // Klikk kezelő az előzmények chip-nyomtató gombjaihoz
        historyRunsContainer.querySelectorAll('.btn-print-chip-delivery').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const runId = btn.getAttribute('data-run-id');
                const orderId = btn.getAttribute('data-order-id');
                const run = await HistoryManager.getRunById(runId);
                if (run) {
                    const order = run.orders.find(o => o.id === orderId);
                    if (order) {
                        const tempRun = {
                            date: run.date,
                            courier: run.courier,
                            company: run.company,
                            sender: run.sender || 'capsula',
                            orders: [order]
                        };
                        await UnifiedPrinter.printSingle(tempRun, 'delivery');
                    }
                }
            });
        });

        attachHistoryEvents();
    }

    export async function renderOrdersTab() {
    const { 
        historyRunsContainer, ordersRunsContainer, accountingRunsContainer, trashRunsContainer, hsResultsContainer,
        accountingFilterPending, trashCompanyFilter, trashDateStart, trashDateEnd,
        isFiltered, attachHistoryEvents, openPdfView, handleHistorySearch, generateDeliveryNotesHtml,
        historySearchInput
    } = ctx;
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
            el.style.borderLeft = '4px solid #3b82f6';

            const itemsSummary = m.items.map(it => `${it.qty}× ${it.name}`).join(', ');

            let accountingBadgeHtml = '';
            const uncollected = m.runData?.uncollectedOrderIds || [];
            const isUncollected = uncollected.some(id => String(id) === String(m.id));

            if (m.isCOD) {
                let badgeText = 'Függőben';
                let badgeColor = '#f59e0b';
                let badgeBg = '#fef3c7';

                let dynamicIsSettled = false;
                const hasStatusMap = m.runData && m.runData.paymentStatusMap && Object.keys(m.runData.paymentStatusMap).length > 0;
                if (hasStatusMap) {
                    const orderStatus = m.runData.paymentStatusMap[m.id] || m.runData.paymentStatusMap[String(m.id)] || 'received';
                    dynamicIsSettled = (orderStatus === 'received');
                } else {
                    let dynamicIsSettledOld = m.runData && m.runData.isSettled;
                    if (m.runData && !dynamicIsSettledOld && typeof m.runData.settledAmount !== 'undefined') {
                        let bankTransferredSum = 0;
                        let uncollectedSum = 0;
                        let partialDiffs = 0;
                        (m.runData.orders || []).forEach(o => {
                            if (o.isCOD) {
                                if (m.runData.bankTransferredOrderIds && m.runData.bankTransferredOrderIds.some(id => String(id) === String(o.id))) {
                                    bankTransferredSum += o.codAmount;
                                } else if (m.runData.uncollectedOrderIds && m.runData.uncollectedOrderIds.some(id => String(id) === String(o.id))) {
                                    uncollectedSum += o.codAmount;
                                } else if (m.runData.partialOrders && (m.runData.partialOrders[o.id] || m.runData.partialOrders[String(o.id)])) {
                                    const partialVal = m.runData.partialOrders[o.id] || m.runData.partialOrders[String(o.id)];
                                    partialDiffs += (o.codAmount - (partialVal.amount || 0));
                                }
                            }
                        });
                        const expectedAmount = (m.runData.totalCOD || 0) - bankTransferredSum - uncollectedSum - partialDiffs;
                        dynamicIsSettled = m.runData.settledAmount >= expectedAmount;
                    } else {
                        dynamicIsSettled = dynamicIsSettledOld;
                    }
                }

                if (m.runData && m.runData.bankTransferredOrderIds && m.runData.bankTransferredOrderIds.some(id => String(id) === String(m.id))) {
                    badgeText = 'Elutalva';
                    badgeColor = '#3b82f6';
                    badgeBg = '#dbeafe';
                } else if (isUncollected) {
                    badgeText = 'Nincs beszedve';
                    badgeColor = '#ef4444';
                    badgeBg = '#fee2e2';
                } else if (m.runData && m.runData.partialOrders && (m.runData.partialOrders[m.id] || m.runData.partialOrders[String(m.id)])) {
                    badgeText = 'Részleges';
                    badgeColor = '#f97316';
                    badgeBg = '#ffedd5';
                } else if (dynamicIsSettled) {
                    badgeText = 'Elszámolva';
                    badgeColor = '#10b981';
                    badgeBg = '#d1fae5';
                }

                accountingBadgeHtml = `<span style="font-size: 10px; background: ${badgeBg}; color: ${badgeColor}; padding: 1px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 2px;"><i class="ph-bold ph-currency-circle-dollar" style="font-size: 11px;"></i> ${badgeText}</span>`;
            } else {
                if (isUncollected) {
                    accountingBadgeHtml = `<span style="font-size: 10px; background: #fee2e2; color: #ef4444; padding: 1px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 2px;"><i class="ph-bold ph-x-circle" style="font-size: 11px;"></i> Nem átadva</span>`;
                } else {
                    accountingBadgeHtml = `<span style="font-size: 10px; background: #f1f5f9; color: #64748b; padding: 1px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 2px;"><i class="ph-bold ph-prohibit" style="font-size: 11px;"></i> Nincs UV</span>`;
                }
            }

            let failureInfoHtml = '';
            if (isUncollected && m.runData) {
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
                        <span style="font-weight: 900; color: #3b82f6; font-size: 13px;">${m.id}</span>
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
                    renderOrdersTab();
                }
            });
        });
    }

    function showSettlementDialog(run, runCOD, existingState = null) {
        return new Promise((resolve) => {
            const codOrders    = run.orders.filter(o => o.isCOD);
            const nonCodOrders = run.orders.filter(o => !o.isCOD);
            const prevBankTransferred = new Set(existingState?.bankTransferredOrderIds || run.bankTransferredOrderIds || []);
            const prevUncollected  = new Set(existingState?.uncollectedOrderIds || run.uncollectedOrderIds || []);
            const prevReasons      = existingState?.uncollectedReasons || run.uncollectedReasons || {};
            const prevPartials     = existingState?.partialOrders || run.partialOrders || {};
            const prevPaymentMethods = existingState?.paymentMethods || run.paymentMethods || {};
            const prevPaymentStatusMap = existingState?.paymentStatusMap || run.paymentStatusMap || {};

            const makeReasonHtml = (orderId, wasUncollected) => {
                const pr = prevReasons[orderId] || '';
                const currentResp = existingState?.uncollectedResponsibility?.[orderId] || run.uncollectedResponsibility?.[orderId] || 'vevo';
                
                const rMienkActive = currentResp === 'mienk';
                const rSzallitoActive = currentResp === 'szallito';
                const rVevoActive = currentResp === 'vevo' || !currentResp;

                return `<div class="sd-reason-row" style="display:${wasUncollected?'block':'none'};padding:12px 20px 16px 116px;background:#fff7ed;border-top:1px dashed #fed7aa;">
                    <div style="font-size:12px;font-weight:700;color:#c2410c;margin-bottom:8px;">Megrendelés nem lett átadva. Kérlek add meg az okot:</div>
                    <input class="sd-reason-input" type="text" placeholder="Miért nem lett átadva? (Kötelező kitölteni, pl. Sérült termék, vevő lemondta...)"
                        value="${pr.replace(/"/g,'&quot;')}"
                        style="width:100%;box-sizing:border-box;font-size:13px;border:2px solid #fbbf24;border-radius:8px;padding:8px 12px;font-family:inherit;margin-bottom:12px;outline:none;background:#fff;">
                    
                    <div class="sd-resp-selector" style="display:flex;align-items:center;gap:8px;" data-order-id="${orderId}">
                        <span style="font-size:12px;color:#92400e;font-weight:700;margin-right:6px;">Kinek a hibájából hiúsult meg?</span>
                        <button type="button" class="sd-resp-btn mienk ${rMienkActive ? 'active' : ''}" data-resp="mienk" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rMienkActive ? '#fca5a5' : '#e2e8f0'};background:${rMienkActive ? '#fee2e2' : '#fff'};color:${rMienkActive ? '#b91c1c' : '#64748b'};transition:all .15s;">Saját hiba</button>
                        <button type="button" class="sd-resp-btn szallito ${rSzallitoActive ? 'active' : ''}" data-resp="szallito" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rSzallitoActive ? '#fed7aa' : '#e2e8f0'};background:${rSzallitoActive ? '#ffedd5' : '#fff'};color:${rSzallitoActive ? '#c2410c' : '#64748b'};transition:all .15s;">Szállító</button>
                        <button type="button" class="sd-resp-btn vevo ${rVevoActive ? 'active' : ''}" data-resp="vevo" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rVevoActive ? '#cbd5e1' : '#e2e8f0'};background:${rVevoActive ? '#e2e8f0' : '#fff'};color:${rVevoActive ? '#475569' : '#64748b'};transition:all .15s;">Vevő / Egyéb</button>
                    </div>
                </div>`;
            };

            const codRowsHtml = codOrders.map(o => {
                const wasUncollected = prevUncollected.has(o.id);
                const wasBankTransferred = prevBankTransferred.has(o.id);
                const prevPartial    = prevPartials[o.id];
                const wasPartial     = !wasUncollected && !!prevPartial;
                const pm             = prevPaymentMethods[o.id] || (wasBankTransferred ? 'bank' : 'cash');
                const isReceived     = prevPaymentStatusMap[o.id] !== 'pending';
                
                const currentResp = existingState?.uncollectedResponsibility?.[o.id] || run.uncollectedResponsibility?.[o.id] || 'vevo';
                const rMienkActive = currentResp === 'mienk';
                const rSzallitoActive = currentResp === 'szallito';
                const rVevoActive = currentResp === 'vevo' || !currentResp;

                const itemsList = (o.items || []).map(it => `<span style="display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:2px 6px;margin:2px 4px 2px 0;"><b>${it.qty}×</b> ${it.name}</span>`).join('');
                
                const payMethodStyle = wasUncollected ? 'display:none;' : 'display:inline-flex;';
                
                const paymentMethodSelectorHtml = `
                <div class="sd-paymethod-selector" style="${payMethodStyle}align-items:center;gap:4px;" data-order-id="${o.id}">
                    <button type="button" class="sd-paymethod-btn cash ${pm === 'cash' ? 'active' : ''}" data-method="cash" style="font-size:11px;font-weight:600;padding:6px 10px;border-radius:6px;cursor:pointer;font-family:inherit;border:1px solid ${pm === 'cash' ? '#cbd5e1' : '#e2e8f0'};background:${pm === 'cash' ? '#e2e8f0' : '#f8fafc'};color:${pm === 'cash' ? '#1e293b' : '#64748b'};transition:all .15s;">
                        💵 KP
                    </button>
                    <button type="button" class="sd-paymethod-btn card ${pm === 'card' ? 'active' : ''}" data-method="card" style="font-size:11px;font-weight:600;padding:6px 10px;border-radius:6px;cursor:pointer;font-family:inherit;border:1px solid ${pm === 'card' ? '#93c5fd' : '#e2e8f0'};background:${pm === 'card' ? '#eff6ff' : '#f8fafc'};color:${pm === 'card' ? '#1d4ed8' : '#64748b'};transition:all .15s;">
                        💳 Kártya
                    </button>
                    <button type="button" class="sd-paymethod-btn bank ${pm === 'bank' ? 'active' : ''}" data-method="bank" style="font-size:11px;font-weight:600;padding:6px 10px;border-radius:6px;cursor:pointer;font-family:inherit;border:1px solid ${pm === 'bank' ? '#bae6fd' : '#e2e8f0'};background:${pm === 'bank' ? '#f0f9ff' : '#f8fafc'};color:${pm === 'bank' ? '#0284c7' : '#64748b'};transition:all .15s;">
                        🏦 Utalás
                    </button>
                </div>
                `;

                const paymentStatusSelectorHtml = `
                <div class="sd-paystatus-container" style="${payMethodStyle}align-items:center;gap:6px;" data-order-id="${o.id}">
                    <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;font-weight:700;color:#374151;user-select:none;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:5px 8px;transition:all .15s;" class="sd-paystatus-label">
                        <input type="checkbox" class="sd-paystatus-checkbox" ${isReceived ? 'checked' : ''} style="cursor:pointer;accent-color:#16a34a;width:14px;height:14px;">
                        <span>💵 Nálunk van</span>
                    </label>
                </div>
                `;

                return `
                <div class="sd-order-row" style="border-bottom:1px solid #f1f5f9;">
                    <label style="display:grid;grid-template-columns: 24px 80px minmax(0, 2fr) minmax(0, 1fr) minmax(420px, auto);align-items:start;gap:12px;padding:14px 20px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                        <div style="display:flex;align-items:center;padding-top:2px;">
                            <input type="checkbox" data-order-id="${o.id}" data-amount="${o.codAmount}" data-is-cod="true" ${wasUncollected ? '' : 'checked'}
                                style="width:20px;height:20px;cursor:pointer;accent-color:#22c55e;">
                        </div>
                        <span style="font-size:14px;font-weight:700;color:#374151;padding-top:2px;">${o.id}</span>
                        <div style="display:flex;flex-direction:column;gap:4px;overflow:hidden;padding-top:2px;">
                            <div style="font-size:14px;color:#0f172a;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.shippingName || '—'}</div>
                            ${itemsList ? `<div style="font-size:11px;color:#64748b;display:inline-flex;align-items:center;gap:4px;cursor:pointer;user-select:none;width:fit-content;padding:2px 6px;border-radius:6px;transition:background .15s;" class="sd-items-toggle" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'" onclick="event.preventDefault();event.stopPropagation();this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('i').style.transform=this.nextElementSibling.style.display==='none'?'rotate(0deg)':'rotate(180deg)'">
                                <i class="ph-bold ph-caret-down" style="transition:transform .2s;"></i> ${o.items.length} termék mutatása
                            </div>
                            <div class="sd-items-list" style="display:none;font-size:11px;color:#475569;margin-top:2px;" onclick="event.preventDefault();event.stopPropagation();">${itemsList}</div>` : ''}
                        </div>
                        <div style="display:flex;align-items:center;padding-top:2px;">
                            <span class="sd-full-amount" style="font-size:15px;font-weight:800;color:#b91c1c;">— Ft</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;padding-top:2px;">
                            ${paymentMethodSelectorHtml}
                            ${paymentStatusSelectorHtml}
                            <button class="sd-partial-toggle" onclick="event.preventDefault();event.stopPropagation();"
                                style="display:${wasUncollected?'none':'inline-flex'};align-items:center;gap:4px;font-size:11px;font-weight:600;color:${wasPartial?'#1d4ed8':'#64748b'};background:${wasPartial?'#eff6ff':'#f8fafc'};border:1px solid ${wasPartial?'#93c5fd':'#e2e8f0'};border-radius:6px;padding:6px 10px;cursor:pointer;font-family:inherit;transition:all .15s;">
                                <i class="ph-bold ph-split-horizontal" style="font-size:12px;"></i> Részlegesen fizetett
                            </button>
                        </div>
                    </label>
                    <div class="sd-partial-row" style="display:${wasPartial?'block':'none'};padding:12px 20px 16px 116px;background:#eff6ff;border-top:1px dashed #93c5fd;">
                        <div style="font-size:12px;font-weight:700;color:#1d4ed8;margin-bottom:8px;">Részleges fizetés történt. Kérlek add meg a részleteket:</div>
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
                            <input class="sd-partial-amount" type="number" min="0" max="${o.codAmount}"
                                value="${wasPartial ? (prevPartial.amount||'') : ''}" placeholder="${o.codAmount}"
                                style="width:120px;font-size:14px;font-weight:700;color:#1e40af;border:2px solid #93c5fd;border-radius:8px;padding:6px 10px;font-family:inherit;outline:none;">
                            <span style="font-size:13px;color:#64748b;font-weight:600;">Ft átvett összeg <span style="color:#94a3b8;font-weight:normal;">(teljes elvárt: ${o.codAmount.toLocaleString('hu-HU')} Ft)</span></span>
                            <button class="sd-partial-reset" onclick="event.stopPropagation();" style="margin-left:auto;font-size:12px;font-weight:600;color:#64748b;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:6px 12px;cursor:pointer;font-family:inherit;transition:all .15s;">Mégsem</button>
                        </div>
                        <input class="sd-partial-comment" type="text" placeholder="Miért volt részleges? (pl. 1 db tábla sérült)..."
                            value="${wasPartial ? (prevPartial.comment||'').replace(/"/g,'&quot;') : ''}"
                            style="width:100%;box-sizing:border-box;font-size:13px;border:2px solid #93c5fd;border-radius:8px;padding:8px 12px;font-family:inherit;margin-bottom:12px;outline:none;">
                        
                        <div class="sd-resp-selector" style="display:flex;align-items:center;gap:8px;" data-order-id="${o.id}">
                            <span style="font-size:12px;color:#1d4ed8;font-weight:700;margin-right:6px;">Kinek a hibájából?</span>
                            <button type="button" class="sd-resp-btn mienk ${rMienkActive ? 'active' : ''}" data-resp="mienk" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rMienkActive ? '#fca5a5' : '#e2e8f0'};background:${rMienkActive ? '#fee2e2' : '#fff'};color:${rMienkActive ? '#b91c1c' : '#64748b'};transition:all .1s;">Saját hiba</button>
                            <button type="button" class="sd-resp-btn szallito ${rSzallitoActive ? 'active' : ''}" data-resp="szallito" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rSzallitoActive ? '#fed7aa' : '#e2e8f0'};background:${rSzallitoActive ? '#ffedd5' : '#fff'};color:${rSzallitoActive ? '#c2410c' : '#64748b'};transition:all .1s;">Szállító</button>
                            <button type="button" class="sd-resp-btn vevo ${rVevoActive ? 'active' : ''}" data-resp="vevo" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rVevoActive ? '#cbd5e1' : '#e2e8f0'};background:${rVevoActive ? '#e2e8f0' : '#fff'};color:${rVevoActive ? '#475569' : '#64748b'};transition:all .1s;">Vevő / Egyéb</button>
                        </div>
                    </div>
                    ${makeReasonHtml(o.id, wasUncollected)}
                </div>`;
            }).join('');

            const nonCodRowsHtml = nonCodOrders.map(o => {
                const wasUncollected = prevUncollected.has(o.id);
                const itemsList = (o.items || []).map(it => `<span style="display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:2px 6px;margin:2px 4px 2px 0;"><b>${it.qty}×</b> ${it.name}</span>`).join('');
                return `
                <div class="sd-order-row" style="border-bottom:1px solid #f1f5f9;">
                    <label style="display:grid;grid-template-columns: 24px 80px minmax(0, 2fr) minmax(0, 1fr) minmax(420px, auto);align-items:start;gap:12px;padding:14px 20px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                        <div style="display:flex;align-items:center;padding-top:2px;">
                            <input type="checkbox" data-order-id="${o.id}" data-is-cod="false" ${wasUncollected ? '' : 'checked'}
                                style="width:20px;height:20px;cursor:pointer;accent-color:#22c55e;">
                        </div>
                        <span style="font-size:14px;font-weight:700;color:#374151;padding-top:2px;">${o.id}</span>
                        <div style="display:flex;flex-direction:column;gap:4px;overflow:hidden;padding-top:2px;">
                            <div style="font-size:14px;color:#0f172a;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.shippingName || '—'}</div>
                            ${itemsList ? `<div style="font-size:11px;color:#64748b;display:inline-flex;align-items:center;gap:4px;cursor:pointer;user-select:none;width:fit-content;padding:2px 6px;border-radius:6px;transition:background .15s;" class="sd-items-toggle" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'" onclick="event.preventDefault();event.stopPropagation();this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('i').style.transform=this.nextElementSibling.style.display==='none'?'rotate(0deg)':'rotate(180deg)'">
                                <i class="ph-bold ph-caret-down" style="transition:transform .2s;"></i> ${o.items.length} termék mutatása
                            </div>
                            <div class="sd-items-list" style="display:none;font-size:11px;color:#475569;margin-top:2px;" onclick="event.preventDefault();event.stopPropagation();">${itemsList}</div>` : ''}
                        </div>
                        <div style="display:flex;align-items:center;padding-top:2px;">
                            <span style="font-size:13px;font-weight:700;color:#64748b;background:#f1f5f9;border-radius:6px;padding:4px 10px;">Nem utánvétes</span>
                        </div>
                        <div></div>
                    </label>
                    ${makeReasonHtml(o.id, wasUncollected)}
                </div>`;
            }).join('');

            const hasBoth = codOrders.length > 0 && nonCodOrders.length > 0;
            const secLabel = (t) => `<div style="padding:6px 20px;font-size:10px;font-weight:700;color:#94a3b8;background:#f8fafc;letter-spacing:.7px;border-bottom:1px solid #e2e8f0;border-top:1px solid #e2e8f0;">${t}</div>`;
            const rowsHtml =
                (codOrders.length > 0    ? (hasBoth ? secLabel('UTÁNVÉTES RENDELÉSEK')  : '') + codRowsHtml    : '') +
                (nonCodOrders.length > 0 ? (hasBoth ? secLabel('EGYÉB RENDELÉSEK')       : '') + nonCodRowsHtml : '');

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';

            overlay.innerHTML = `
                <div style="background:#fff;border-radius:20px;width:100%;max-width:960px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,0.35);overflow:hidden;">
                    <div style="background:#0f172a;color:#fff;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
                        <div>
                            <div style="font-weight:700;font-size:15px;letter-spacing:-.2px;">Terítés rögzítése</div>
                            <div style="font-size:12px;color:#94a3b8;margin-top:3px;">${run.date} · ${run.courier || '—'} · ${run.orders.length} rendelés${codOrders.length > 0 ? ` · ${codOrders.length} utánvétes` : ''}</div>
                        </div>
                        <button id="sd-close" style="background:rgba(255,255,255,.08);border:none;color:#94a3b8;cursor:pointer;padding:6px;border-radius:10px;display:flex;line-height:1;">
                            <i class="ph-bold ph-x" style="font-size:17px;"></i>
                        </button>
                    </div>
                    <div style="padding:10px 20px 8px;background:#f8fafc;border-bottom:1px solid #e2e8f0;flex-shrink:0;">
                        <span style="font-size:12px;color:#64748b;font-weight:600;">Pipáld ki az <strong style="color:#0f172a;">átadott</strong> rendeléseket · Utánvéteknél válaszd ki a fizetés módját (KP / Kártya / Utalás)</span>
                    </div>
                    <div style="overflow-y:auto;flex:1;">${rowsHtml}</div>
                    <div style="padding:14px 20px;border-top:2px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#fff;flex-shrink:0;">
                        <div style="display:flex;gap:20px;flex-wrap:wrap;">
                            <div>
                                <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">💵 Nálunk lévő KP</div>
                                <div id="sd-total-kp-received" style="font-size:18px;font-weight:800;color:#16a34a;line-height:1.2;">0 Ft</div>
                            </div>
                            <div>
                                <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">⏳ Várható KP</div>
                                <div id="sd-total-kp-pending" style="font-size:18px;font-weight:800;color:#d97706;line-height:1.2;">0 Ft</div>
                            </div>
                            <div>
                                <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">💳 Kártyás utalásra vár</div>
                                <div id="sd-total-card-pending" style="font-size:18px;font-weight:800;color:#2563eb;line-height:1.2;">0 Ft</div>
                            </div>
                            <div style="border-left:1px solid #e2e8f0;padding-left:20px;">
                                <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">🏦 Közvetlen utalások</div>
                                <div id="sd-total-other" style="font-size:18px;font-weight:800;color:#0f172a;line-height:1.2;">0 Ft</div>
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;align-self:flex-end;">
                            <button id="sd-cancel" style="background:none;border:1.5px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;padding:9px 18px;border-radius:12px;cursor:pointer;font-family:inherit;">Mégsem</button>
                            <button id="sd-save" style="background:#0f172a;border:none;color:#fff;font-size:13px;font-weight:700;padding:9px 20px;border-radius:12px;cursor:pointer;font-family:inherit;">Rögzítés</button>
                        </div>
                    </div>
                </div>`;

            document.body.appendChild(overlay);

            const updateRowAmountDisplay = (row) => {
                const cb = row.querySelector('input[type=checkbox]');
                const fullAmount = parseInt(cb.getAttribute('data-amount'));
                const partialRow = row.querySelector('.sd-partial-row');
                const partialInput = row.querySelector('.sd-partial-amount');
                const fullAmountEl = row.querySelector('.sd-full-amount');
                if (!fullAmountEl) return;
                
                let amount = fullAmount;
                if (partialRow && partialRow.style.display !== 'none' && partialInput.value !== '') {
                    amount = Math.min(parseInt(partialInput.value) || 0, fullAmount);
                }
                
                const paymethodSelector = row.querySelector('.sd-paymethod-selector');
                const activePayBtn = paymethodSelector ? paymethodSelector.querySelector('.sd-paymethod-btn.active') : null;
                const method = activePayBtn ? activePayBtn.getAttribute('data-method') : 'cash';
                
                const statusCheckbox = row.querySelector('.sd-paystatus-checkbox');
                const isReceived = statusCheckbox ? statusCheckbox.checked : true;
                
                const statusLabelSpan = row.querySelector('.sd-paystatus-label span');
                const statusLabel = row.querySelector('.sd-paystatus-label');
                if (statusLabelSpan && statusLabel) {
                    if (method === 'card') {
                        statusLabelSpan.textContent = '💳 Utalva nekünk';
                    } else if (method === 'bank') {
                        statusLabelSpan.textContent = '🏦 Beérkezett';
                    } else {
                        statusLabelSpan.textContent = '💵 Nálunk van';
                    }
                    
                    if (isReceived) {
                        statusLabel.style.background = '#d1fae5';
                        statusLabel.style.borderColor = '#10b981';
                        statusLabel.style.color = '#065f46';
                    } else {
                        statusLabel.style.background = '#fef3c7';
                        statusLabel.style.borderColor = '#f59e0b';
                        statusLabel.style.color = '#92400e';
                    }
                }
                
                if (method === 'bank') {
                    fullAmountEl.style.color = '#0284c7';
                    fullAmountEl.textContent = amount.toLocaleString('hu-HU') + ' Ft (Utalás)';
                } else if (method === 'card') {
                    fullAmountEl.style.color = '#1d4ed8';
                    fullAmountEl.textContent = amount.toLocaleString('hu-HU') + ' Ft (Kártya)';
                } else {
                    fullAmountEl.style.color = '#10b981';
                    fullAmountEl.textContent = amount.toLocaleString('hu-HU') + ' Ft (KP)';
                }
            };

            const updateTotal = () => {
                let totalKpReceived = 0;
                let totalKpPending = 0;
                let totalCardPending = 0;
                let totalOther = 0;

                overlay.querySelectorAll('.sd-order-row').forEach(row => {
                    const cb = row.querySelector('input[type=checkbox]');
                    if (!cb || cb.getAttribute('data-is-cod') !== 'true') return;
                    
                    updateRowAmountDisplay(row);
                    if (!cb.checked) return;

                    const fullAmount   = parseInt(cb.getAttribute('data-amount'));
                    const partialRow   = row.querySelector('.sd-partial-row');
                    const partialInput = row.querySelector('.sd-partial-amount');
                    
                    let rowAmount = fullAmount;
                    if (partialRow && partialRow.style.display !== 'none' && partialInput.value !== '') {
                        rowAmount = Math.min(parseInt(partialInput.value) || 0, fullAmount);
                    }

                    const paymethodSelector = row.querySelector('.sd-paymethod-selector');
                    const activePayBtn = paymethodSelector ? paymethodSelector.querySelector('.sd-paymethod-btn.active') : null;
                    const method = activePayBtn ? activePayBtn.getAttribute('data-method') : 'cash';

                    const statusCheckbox = row.querySelector('.sd-paystatus-checkbox');
                    const isReceived = statusCheckbox ? statusCheckbox.checked : true;

                    if (method === 'bank') {
                        totalOther += rowAmount;
                    } else if (method === 'card') {
                        if (isReceived) {
                            totalOther += rowAmount;
                        } else {
                            totalCardPending += rowAmount;
                        }
                    } else { // cash
                        if (isReceived) {
                            totalKpReceived += rowAmount;
                        } else {
                            totalKpPending += rowAmount;
                        }
                    }
                });

                overlay.querySelector('#sd-total-kp-received').textContent = totalKpReceived.toLocaleString('hu-HU') + ' Ft';
                overlay.querySelector('#sd-total-kp-pending').textContent = totalKpPending.toLocaleString('hu-HU') + ' Ft';
                overlay.querySelector('#sd-total-card-pending').textContent = totalCardPending.toLocaleString('hu-HU') + ' Ft';
                overlay.querySelector('#sd-total-other').textContent = totalOther.toLocaleString('hu-HU') + ' Ft';
            };

            overlay.querySelectorAll('input[type=checkbox]:not(.sd-paystatus-checkbox)').forEach(cb => cb.addEventListener('change', (e) => {
                const row    = e.target.closest('.sd-order-row');
                const isCOD  = cb.getAttribute('data-is-cod') === 'true';
                const reasonRow = row.querySelector('.sd-reason-row');
                if (e.target.checked) {
                    reasonRow.style.display = 'none';
                    const rInput = row.querySelector('.sd-reason-input');
                    if (rInput) rInput.value = '';
                    if (isCOD) {
                        const pt = row.querySelector('.sd-partial-toggle');
                        const pm = row.querySelector('.sd-paymethod-selector');
                        const pc = row.querySelector('.sd-paystatus-container');
                        if (pt) pt.style.display = 'inline-flex';
                        if (pm) pm.style.display = 'inline-flex';
                        if (pc) pc.style.display = 'inline-flex';
                    }
                } else {
                    if (isCOD) {
                        const pr = row.querySelector('.sd-partial-row');
                        const pt = row.querySelector('.sd-partial-toggle');
                        const pm = row.querySelector('.sd-paymethod-selector');
                        const pc = row.querySelector('.sd-paystatus-container');
                        if (pr) { pr.style.display = 'none'; row.querySelector('.sd-partial-amount').value = ''; row.querySelector('.sd-partial-comment').value = ''; }
                        if (pt) pt.style.display = 'none';
                        if (pm) pm.style.display = 'none';
                        if (pc) pc.style.display = 'none';
                    }
                    reasonRow.style.display = 'block';
                    const rInput = row.querySelector('.sd-reason-input');
                    if (rInput) rInput.focus();
                }
                updateTotal();
            }));

            // Felelősség gombok eseménydelegált kezelése a terítés dialógusban
            overlay.addEventListener('click', (e) => {
                const btn = e.target.closest('.sd-resp-btn');
                if (!btn) return;
                e.preventDefault();
                e.stopPropagation();
                
                const selector = btn.closest('.sd-resp-selector');
                const buttons = selector.querySelectorAll('.sd-resp-btn');
                buttons.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '#fff';
                    b.style.color = '#64748b';
                    b.style.borderColor = '#e2e8f0';
                });
                
                btn.classList.add('active');
                const resp = btn.getAttribute('data-resp');
                if (resp === 'mienk') {
                    btn.style.background = '#fee2e2';
                    btn.style.borderColor = '#fca5a5';
                    btn.style.color = '#b91c1c';
                } else if (resp === 'szallito') {
                    btn.style.background = '#ffedd5';
                    btn.style.borderColor = '#fed7aa';
                    btn.style.color = '#c2410c';
                } else {
                    btn.style.background = '#e2e8f0';
                    btn.style.borderColor = '#cbd5e1';
                    btn.style.color = '#475569';
                }
            });

            // Fizetési mód gombok eseménykezelése
            overlay.addEventListener('click', (e) => {
                const btn = e.target.closest('.sd-paymethod-btn');
                if (!btn) return;
                e.preventDefault();
                e.stopPropagation();
                
                const selector = btn.closest('.sd-paymethod-selector');
                const buttons = selector.querySelectorAll('.sd-paymethod-btn');
                buttons.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '#f8fafc';
                    b.style.color = '#64748b';
                    b.style.borderColor = '#e2e8f0';
                });
                
                btn.classList.add('active');
                const method = btn.getAttribute('data-method');
                if (method === 'cash') {
                    btn.style.background = '#e2e8f0';
                    btn.style.borderColor = '#cbd5e1';
                    btn.style.color = '#1e293b';
                } else if (method === 'card') {
                    btn.style.background = '#eff6ff';
                    btn.style.borderColor = '#93c5fd';
                    btn.style.color = '#1d4ed8';
                } else {
                    btn.style.background = '#f0f9ff';
                    btn.style.borderColor = '#bae6fd';
                    btn.style.color = '#0284c7';
                }
                updateTotal();
            });

            // Nálunk van checkbox eseménykezelése
            overlay.addEventListener('change', (e) => {
                const chk = e.target.closest('.sd-paystatus-checkbox');
                if (!chk) return;
                updateTotal();
            });

            // Részleges toggle
            overlay.querySelectorAll('.sd-partial-toggle').forEach(btn => btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = btn.closest('.sd-order-row');
                const partialRow = row.querySelector('.sd-partial-row');
                const isOpen = partialRow.style.display !== 'none';
                if (isOpen) {
                    partialRow.style.display = 'none';
                    row.querySelector('.sd-partial-amount').value = '';
                    row.querySelector('.sd-partial-comment').value = '';
                    btn.style.background = '#f8fafc';
                    btn.style.color = '#64748b';
                    btn.style.borderColor = '#e2e8f0';
                } else {
                    partialRow.style.display = 'block';
                    const cb = row.querySelector('input[type=checkbox]');
                    const amountInput = row.querySelector('.sd-partial-amount');
                    if (!amountInput.value) amountInput.value = cb.getAttribute('data-amount');
                    amountInput.focus();
                    btn.style.background = '#eff6ff';
                    btn.style.color = '#1d4ed8';
                    btn.style.borderColor = '#93c5fd';
                }
                updateTotal();
            }));

            // Részleges összeg változásakor frissítse a teljes összeget és a végösszeget
            overlay.querySelectorAll('.sd-partial-amount').forEach(input => {
                input.addEventListener('input', (e) => {
                    updateTotal();
                });
            });

            // Mégsem részleges
            overlay.querySelectorAll('.sd-partial-reset').forEach(btn => btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = btn.closest('.sd-order-row');
                row.querySelector('.sd-partial-row').style.display = 'none';
                row.querySelector('.sd-partial-amount').value = '';
                row.querySelector('.sd-partial-comment').value = '';
                const toggle = row.querySelector('.sd-partial-toggle');
                toggle.style.background = '#f8fafc';
                toggle.style.color = '#64748b';
                toggle.style.borderColor = '#e2e8f0';
                updateTotal();
            }));

            updateTotal();

            const cleanup = () => overlay.remove();
            overlay.querySelector('#sd-close').addEventListener('click', () => { cleanup(); resolve(null); });
            overlay.querySelector('#sd-cancel').addEventListener('click', () => { cleanup(); resolve(null); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) { cleanup(); resolve(null); } });

            overlay.querySelector('#sd-save').addEventListener('click', () => {
                let settledAmount = 0;
                let settledKpAmount = 0;
                let settledCardAmount = 0;
                const paymentMethods = {};
                const paymentStatusMap = {};
                const uncollectedOrderIds = [];
                const uncollectedReasons  = {};
                const uncollectedResponsibility = {};
                const partialOrders       = {};
                const bankTransferredOrderIds = [];

                overlay.querySelectorAll('.sd-order-row').forEach(row => {
                    const cb      = row.querySelector('input[type=checkbox]');
                    const orderId = cb.getAttribute('data-order-id');
                    const isCOD   = cb.getAttribute('data-is-cod') === 'true';

                    if (cb.checked) {
                        if (isCOD) {
                            const paymethodSelector = row.querySelector('.sd-paymethod-selector');
                            const activePayBtn = paymethodSelector ? paymethodSelector.querySelector('.sd-paymethod-btn.active') : null;
                            const method = activePayBtn ? activePayBtn.getAttribute('data-method') : 'cash';
                            paymentMethods[orderId] = method;

                            const statusCheckbox = row.querySelector('.sd-paystatus-checkbox');
                            const isReceived = statusCheckbox ? statusCheckbox.checked : true;
                            paymentStatusMap[orderId] = isReceived ? 'received' : 'pending';

                            const fullAmount   = parseInt(cb.getAttribute('data-amount'));
                            const partialRow   = row.querySelector('.sd-partial-row');
                            const partialInput = row.querySelector('.sd-partial-amount');
                            
                            let rowAmt = fullAmount;
                            if (partialRow && partialRow.style.display !== 'none' && partialInput.value !== '') {
                                rowAmt = Math.min(parseInt(partialInput.value) || 0, fullAmount);
                                const comment = row.querySelector('.sd-partial-comment').value.trim();
                                partialOrders[orderId] = { amount: rowAmt, comment };
                                
                                // Részleges megrendelés felelősség rögzítése
                                const selector = partialRow.querySelector('.sd-resp-selector');
                                if (selector) {
                                    const activeBtn = selector.querySelector('.sd-resp-btn.active');
                                    const resp = activeBtn ? activeBtn.getAttribute('data-resp') : 'vevo';
                                    uncollectedResponsibility[orderId] = resp;
                                } else {
                                    uncollectedResponsibility[orderId] = 'vevo';
                                }
                            }
                            
                            settledAmount += rowAmt;
                            if (method === 'card') {
                                settledCardAmount += rowAmt;
                            } else if (method === 'bank') {
                                bankTransferredOrderIds.push(orderId);
                            } else {
                                settledKpAmount += rowAmt;
                            }
                        }
                    } else {
                        uncollectedOrderIds.push(orderId);
                        const reasonInput = row.querySelector('.sd-reason-input');
                        if (reasonInput) {
                            const reason = reasonInput.value.trim();
                            if (reason) uncollectedReasons[orderId] = reason;
                        }
                        
                        // Teljesen meghiúsult megrendelés felelősség rögzítése
                        const selector = row.querySelector('.sd-reason-row .sd-resp-selector');
                        if (selector) {
                            const activeBtn = selector.querySelector('.sd-resp-btn.active');
                            const resp = activeBtn ? activeBtn.getAttribute('data-resp') : 'vevo';
                            uncollectedResponsibility[orderId] = resp;
                        } else {
                            uncollectedResponsibility[orderId] = 'vevo';
                        }
                    }
                });
                cleanup();
                resolve({ 
                    settledAmount, 
                    settledKpAmount, 
                    settledCardAmount, 
                    paymentMethods, 
                    paymentStatusMap,
                    uncollectedOrderIds, 
                    uncollectedReasons, 
                    partialOrders, 
                    bankTransferredOrderIds, 
                    uncollectedResponsibility 
                });
            });
        });
    }

    export async function renderAccountingRuns() {
    const { 
        historyRunsContainer, ordersRunsContainer, accountingRunsContainer, trashRunsContainer, hsResultsContainer,
        accountingFilterPending, trashCompanyFilter, trashDateStart, trashDateEnd,
        isFiltered, attachHistoryEvents, openPdfView, handleHistorySearch, generateDeliveryNotesHtml,
        historySearchInput
    } = ctx;
        let runs = await HistoryManager.getAllRuns();
        runs.sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            if (dateA !== dateB) return dateB.localeCompare(dateA);
            return (b.timestamp || 0) - (a.timestamp || 0);
        });

        // Visszakompatibilitás: paymentStatusMap generálása a régi terítésekhez
        runs.forEach(run => {
            if (!run.paymentStatusMap || Object.keys(run.paymentStatusMap).length === 0) {
                const map = {};
                const uncollected = run.uncollectedOrderIds || [];
                const bankTransferred = run.bankTransferredOrderIds || [];
                const paymentMethods = run.paymentMethods || {};
                const hasSettled = (run.settledAmount || 0) > 0 || run.isSettled;
                
                run.orders.forEach(o => {
                    if (o.isCOD) {
                        if (uncollected.includes(o.id) || bankTransferred.includes(o.id)) {
                            map[o.id] = 'received';
                        } else if (!hasSettled) {
                            map[o.id] = 'pending';
                        } else {
                            const method = paymentMethods[o.id] || 'cash';
                            if (method === 'card') {
                                const isTransferSettled = run.isTransferSettled !== false;
                                map[o.id] = isTransferSettled ? 'received' : 'pending';
                            } else {
                                map[o.id] = 'received';
                            }
                        }
                    }
                });
                run.paymentStatusMap = map;
                
                // Ha a generált map alapján nincs benne függő tétel, és már elszámolták a kört, tekintsük elszámoltnak
                const hasPending = run.orders.some(o => o.isCOD && !uncollected.includes(o.id) && map[o.id] === 'pending');
                if (!hasPending && hasSettled) {
                    run.isSettled = true;
                }
            }
        });

        const onlyPending = accountingFilterPending.checked;

        // Szűrés: a dátum/cég szűrők alapján
        runs = runs.filter(r => isFiltered(r));
        // Eltávolítva: runs = runs.filter(r => r.orders.some(o => o.isCOD)); -> Mutassa a nem utánvétes köröket is
        if (onlyPending) {
            runs = runs.filter(r => {
                const uncollected = r.uncollectedOrderIds || [];
                const paymentStatusMap = r.paymentStatusMap || {};
                const hasPending = r.orders.some(o => o.isCOD && !uncollected.includes(o.id) && paymentStatusMap[o.id] === 'pending');
                return !r.isSettled || hasPending;
            });
        }

        accountingRunsContainer.innerHTML = '';

        if(runs.length === 0) {
            accountingRunsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Nincsenek a feltételnek megfelelő elszámolások.</p>`;
            return;
        }

        // Számoljuk össze a szűrt követeléseket
        let totalFilteredPendingKp = 0;
        let totalFilteredPendingCard = 0;

        runs.forEach(r => {
            const uncollected = r.uncollectedOrderIds || [];
            const paymentStatusMap = r.paymentStatusMap || {};
            const paymentMethods = r.paymentMethods || {};
            const partialOrders = r.partialOrders || {};

            r.orders.forEach(o => {
                if (o.isCOD && !uncollected.includes(o.id)) {
                    if (paymentStatusMap[o.id] === 'pending') {
                        const method = paymentMethods[o.id] || 'cash';
                        let amt = o.codAmount;
                        if (partialOrders[o.id]) {
                            amt = partialOrders[o.id].amount || 0;
                        }
                        if (method === 'card') {
                            totalFilteredPendingCard += amt;
                        } else if (method === 'cash') {
                            totalFilteredPendingKp += amt;
                        }
                    }
                }
            });
        });

        const summaryCard = document.createElement('div');
        summaryCard.style.cssText = 'background: linear-gradient(135deg, #1e293b, #0f172a); color: white; padding: 18px 24px; border-radius: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);';
        summaryCard.innerHTML = `
            <div>
                <div style="font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Szűrt követelések összesen</div>
                <div style="font-size: 11px; color: #64748b;">A fenti szűrők (Dátum, Szállítócég) alapján számítva</div>
            </div>
            <div style="display: flex; gap: 32px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(249, 115, 22, 0.15); display: flex; align-items: center; justify-content: center; color: #f97316;">
                        <i class="ph-bold ph-hand-coins" style="font-size: 18px;"></i>
                    </div>
                    <div>
                        <div style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Függő KP (futártól)</div>
                        <div style="font-size: 18px; font-weight: 800; color: #f97316;">${totalFilteredPendingKp.toLocaleString('hu-HU')} Ft</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; border-left: 1px solid #334155; padding-left: 24px;">
                    <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(37, 99, 235, 0.15); display: flex; align-items: center; justify-content: center; color: #3b82f6;">
                        <i class="ph-bold ph-bank" style="font-size: 18px;"></i>
                    </div>
                    <div>
                        <div style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Kártyás utalásra vár</div>
                        <div style="font-size: 18px; font-weight: 800; color: #3b82f6;">${totalFilteredPendingCard.toLocaleString('hu-HU')} Ft</div>
                    </div>
                </div>
            </div>
        `;
        accountingRunsContainer.appendChild(summaryCard);

        // Csoportosítás cégek szerint
        const groups = {};
        runs.forEach(run => {
            const comp = run.company || 'Egyéb';
            if (!groups[comp]) groups[comp] = [];
            groups[comp].push(run);
        });

        Object.keys(groups).sort().forEach(companyName => {
            const companyRuns = groups[companyName];
            let companyTotalCOD = 0;
            companyRuns.forEach(r => {
                if (!r.isSettled) {
                    r.orders.forEach(o => { if(o.isCOD) companyTotalCOD += o.codAmount; });
                }
            });

            const groupEl = document.createElement('div');
            groupEl.className = 'accounting-company-group';
            groupEl.style.marginBottom = '25px';

            groupEl.innerHTML = `
                <div style="background: #0f172a; color: white; padding: 10px 16px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 700; letter-spacing: 0.5px;">${companyName}</span>
                    <span style="font-size: 13px; background: #334155; padding: 2px 10px; border-radius: 20px;">Függőben: <strong>${companyTotalCOD.toLocaleString('hu-HU')} Ft</strong></span>
                </div>
                <div class="group-runs" style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 10px; background: #f8fafc; display: flex; flex-direction: column; gap: 8px;">
                </div>
            `;

            const runsContainer = groupEl.querySelector('.group-runs');
            companyRuns.forEach(run => {
                const el = document.createElement('div');
                el.className = 'unified-card acc-run-card';
                el.style.cssText = 'margin:0;overflow:hidden;';

                let runCOD = 0;
                run.orders.forEach(o => { if(o.isCOD) runCOD += o.codAmount; });
                el.setAttribute('data-total-cod', runCOD);
                el.setAttribute('data-run-id', run.id);

                const uncollected    = run.uncollectedOrderIds || [];
                const reasons        = run.uncollectedReasons || {};
                const partialOrders  = run.partialOrders || {};
                const bankTransferred = run.bankTransferredOrderIds || [];
                const paymentMethods = run.paymentMethods || {};
                const paymentStatusMap = run.paymentStatusMap || {};

                const isNeverSettled = !run.isSettled && typeof run.settledAt === 'undefined' && !(run.settledAmount > 0) && (!run.uncollectedOrderIds || run.uncollectedOrderIds.length === 0);

                // Számoljuk össze a függő KP és függő Kártya összegeket
                let pendingKpAmount = 0;
                let pendingCardAmount = 0;
                
                if (!isNeverSettled) {
                    run.orders.forEach(o => {
                        if (o.isCOD && !uncollected.includes(o.id)) {
                            const status = paymentStatusMap[o.id] || 'received';
                            if (status === 'pending') {
                                const method = paymentMethods[o.id] || 'cash';
                                let amt = o.codAmount;
                                if (partialOrders[o.id]) {
                                    amt = partialOrders[o.id].amount || 0;
                                }
                                
                                if (method === 'card') {
                                    pendingCardAmount += amt;
                                } else if (method === 'cash') {
                                    pendingKpAmount += amt;
                                }
                            }
                        }
                    });
                }

                const isPartial = !run.isSettled && run.settledAmount > 0;
                const hasCardWait = pendingCardAmount > 0;
                const hasKpWait = pendingKpAmount > 0;

                const circleColor = run.isSettled ? '#22c55e' : (hasKpWait ? '#eab308' : (hasCardWait ? '#2563eb' : (isNeverSettled ? '#ef4444' : '#cbd5e1')));
                const circleBg = run.isSettled ? '#22c55e' : (hasKpWait ? '#fef9c3' : (hasCardWait ? '#eff6ff' : (isNeverSettled ? '#fee2e2' : '#fff')));
                const circleTextColor = run.isSettled ? '#fff' : (hasKpWait ? '#ca8a04' : (hasCardWait ? '#2563eb' : (isNeverSettled ? '#ef4444' : '#94a3b8')));
                const circleTitle = run.isSettled ? 'Elszámolva' : (hasKpWait ? 'Függő készpénz' : (hasCardWait ? 'Kártyás utalásra vár' : (isNeverSettled ? 'Nincs elszámolva' : 'Elszámolásra vár')));
                const btnClass = (run.isSettled || isPartial) ? 'btn-unsettle-run' : 'btn-settle-run';

                const kpWaitBadge = hasKpWait
                    ? `<span style="font-size:10px;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:1px 7px;display:inline-flex;align-items:center;gap:3px;"><i class="ph-bold ph-hand-coins" style="font-size:10px;"></i>Függő KP: ${pendingKpAmount.toLocaleString('hu-HU')} Ft</span>`
                    : '';

                const cardWaitBadge = hasCardWait
                    ? `<span style="font-size:10px;font-weight:700;color:#2563eb;background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;padding:1px 7px;display:inline-flex;align-items:center;gap:3px;"><i class="ph-bold ph-bank" style="font-size:10px;"></i>Utalásra vár: ${pendingCardAmount.toLocaleString('hu-HU')} Ft</span>`
                    : '';

                let statusBadge = '';
                if (run.isSettled && !hasKpWait && !hasCardWait) {
                    statusBadge = `<span class="hac-badge hac-badge-green" style="font-size:10px;"><i class="ph-bold ph-check-circle" style="font-size:10px;"></i>Elszámolva</span>`;
                } else {
                    if (hasKpWait) statusBadge += kpWaitBadge + ' ';
                    if (hasCardWait) statusBadge += cardWaitBadge;
                    if (!hasKpWait && !hasCardWait && isPartial) {
                        statusBadge = `<span style="font-size:10px;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:1px 7px;">~${run.settledAmount.toLocaleString('hu-HU')} / ${runCOD.toLocaleString('hu-HU')} Ft</span>`;
                    }
                }

                const codBadges = run.orders.filter(o => o.isCOD).map(o => {
                    const isUncollected = uncollected.includes(o.id);
                    const isBankTransferred = bankTransferred.includes(o.id);
                    const isPartialOrder = !isUncollected && !isBankTransferred && !!partialOrders[o.id];
                    const method = paymentMethods[o.id] || 'cash';
                    
                    let badgeBg = '#f1f5f9';
                    let badgeColor = '#475569';
                    let statusLabel = 'Függő';
                    let isOrderSettled = false;
                    const hasStatusMap = run.paymentStatusMap && Object.keys(run.paymentStatusMap).length > 0;
                    if (hasStatusMap) {
                        isOrderSettled = (run.paymentStatusMap[o.id] || run.paymentStatusMap[String(o.id)] || 'received') === 'received';
                    } else {
                        isOrderSettled = run.isSettled;
                    }
                    
                    if (isUncollected) {
                        badgeBg = '#fee2e2';
                        badgeColor = '#ef4444';
                        statusLabel = 'Kiesett';
                    } else if (isBankTransferred) {
                        badgeBg = '#dbeafe';
                        badgeColor = '#3b82f6';
                        statusLabel = 'Utalva';
                    } else if (isPartialOrder) {
                        badgeBg = '#ffedd5';
                        badgeColor = '#f97316';
                        statusLabel = 'Részleges';
                    } else if (isOrderSettled) {
                        if (method === 'card') {
                            badgeBg = '#eff6ff';
                            badgeColor = '#2563eb';
                            statusLabel = 'Kártya';
                        } else {
                            badgeBg = '#d1fae5';
                            badgeColor = '#10b981';
                            statusLabel = 'KP';
                        }
                    }
                    return `<span class="acc-order-badge" style="font-size:10px; font-weight:700; background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeColor}33; padding:2px 6px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;" title="${o.shippingName || ''} · ${statusLabel}">
                        ${o.id}
                    </span>`;
                }).join(' ');

                const codBadgeContainer = codBadges 
                    ? `<div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
                        <span style="font-size:10px; font-weight:600; color:#64748b; margin-right:4px;">Utánvétek:</span>
                        ${codBadges}
                       </div>` 
                    : '';

                const orderChips = run.orders.map(o => {
                    const isUncollected = uncollected.includes(o.id);
                    const isBankTransferred = bankTransferred.includes(o.id);
                    const partialInfo   = o.isCOD && !isUncollected && !isBankTransferred ? partialOrders[o.id] : null;
                    const reasonText    = isUncollected && reasons[o.id] ? ` · ${reasons[o.id]}` : '';
                    const method        = paymentMethods[o.id] || 'cash';
                    const status        = paymentStatusMap[o.id] || 'received';
                    const statusText    = status === 'pending' ? ' ⏳' : ' ✓';
                    const statusColor   = status === 'pending' ? '#d97706' : '#16a34a';
                    
                    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;${isUncollected ? 'opacity:.55;' : ''}">
                        <span style="font-size:12px;font-weight:700;color:#374151;min-width:95px;${isUncollected ? 'text-decoration:line-through;' : ''}">${o.id}</span>
                        <span style="font-size:12px;color:#64748b;flex:1;">${o.shippingName || '—'}</span>
                        ${o.isCOD
                            ? isUncollected
                                ? `<span style="font-size:11px;font-weight:700;color:#f97316;">nem érkezett<span style="font-weight:400;color:#94a3b8;">${reasonText}</span></span>`
                                : isBankTransferred
                                    ? `<span style="font-size:11px;font-weight:700;color:#3b82f6;">Elutalva (Banki utalás)<span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft</span></span>`
                                    : partialInfo
                                        ? `<span style="font-size:11px;font-weight:700;color:#1d4ed8;">~${partialInfo.amount.toLocaleString('hu-HU')} Ft ${method === 'card' ? '💳' : method === 'bank' ? '🏦' : '💵'}<span style="font-size:11.5px;font-weight:700;color:${statusColor}">${statusText}</span><span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft${partialInfo.comment ? ' · ' + partialInfo.comment : ''}</span></span>`
                                        : (method === 'card'
                                            ? `<span style="font-size:11px;font-weight:700;color:#2563eb;">💳 Kártya<span style="font-size:11.5px;font-weight:700;color:${statusColor}">${statusText}</span><span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft</span></span>`
                                            : method === 'bank'
                                                ? `<span style="font-size:11px;font-weight:700;color:#0284c7;">🏦 Utalás<span style="font-size:11.5px;font-weight:700;color:${statusColor}">${statusText}</span><span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft</span></span>`
                                                : `<span style="font-size:11px;font-weight:700;color:#10b981;">💵 KP<span style="font-size:11.5px;font-weight:700;color:${statusColor}">${statusText}</span><span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft</span></span>`)
                            : isUncollected
                                ? `<span style="font-size:11px;font-weight:700;color:#f97316;">nem lett átadva<span style="font-weight:400;color:#94a3b8;">${reasonText}</span></span>`
                                : '<span style="font-size:11px;color:#94a3b8;">átadva</span>'}
                    </div>`;
                }).join('');

                const settleKpBtn = hasKpWait
                    ? `<button class="hac-btn-action btn-settle-kp" data-doc-id="${run.docId}" title="KP beérkezett" style="font-size:11px;font-weight:700;color:#f97316;background:#fff7ed;border:1.5px solid #fed7aa;border-radius:8px;padding:4px 9px;cursor:pointer;font-family:inherit;flex-shrink:0;">
                        <i class="ph-bold ph-hand-coins" style="font-size:11px;"></i> KP megjött
                       </button>`
                    : '';

                const settleTransferBtn = hasCardWait
                    ? `<button class="hac-btn-action btn-settle-transfer" data-doc-id="${run.docId}" title="Utalás beérkezett" style="font-size:11px;font-weight:700;color:#2563eb;background:#eff6ff;border:1.5px solid #93c5fd;border-radius:8px;padding:4px 9px;cursor:pointer;font-family:inherit;flex-shrink:0;">
                        <i class="ph-bold ph-check-square" style="font-size:11px;"></i> Kártya utalva
                       </button>`
                    : '';

                el.innerHTML = `
                    <div style="display:flex;align-items:center;gap:12px;padding:11px 14px;">
                        <button class="${btnClass}" data-doc-id="${run.docId}"
                            title="${circleTitle}"
                            style="flex-shrink:0;width:36px;height:36px;border-radius:50%;border:2px solid ${circleColor};background:${circleBg};color:${circleTextColor};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;">
                            <i class="ph-bold ph-check" style="font-size:16px;"></i>
                        </button>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;flex-wrap:wrap;">
                                <span style="font-size:14px;font-weight:700;color:#0f172a;">${run.date}</span>
                                ${statusBadge}
                                ${uncollected.length > 0 ? `<span style="font-size:10px;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:1px 7px;"><i class="ph-bold ph-warning" style="font-size:9px;"></i> ${uncollected.length} kiesett</span>` : ''}
                            </div>
                            <div class="hac-meta">
                                <i class="ph-bold ph-user" style="font-size:11px;color:#374151;"></i>
                                <span style="font-weight:600;color:#374151;">${run.courier || '—'}</span>
                                <span style="color:#d1d5db;">·</span>
                                <span style="color:#94a3b8;">${run.orders.length} rendelés</span>
                                ${runCOD > 0 ? `<span style="color:#d1d5db;">·</span><strong style="color:#b91c1c;">${runCOD.toLocaleString('hu-HU')} Ft</strong>` : ''}
                            </div>
                            ${codBadgeContainer}
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;">
                            ${settleKpBtn}
                            ${settleTransferBtn}
                            <button class="hac-btn-action hac-btn-ghost btn-print-summary" data-id="${run.id}" style="font-size:12px;">
                                <i class="ph-bold ph-printer" style="font-size:12px;"></i>
                            </button>
                            ${(run.isSettled || isPartial) ? `<button class="hac-btn-action hac-btn-ghost btn-modify-settlement" data-doc-id="${run.docId}" data-run-id="${run.id}" title="Elszámolás módosítása" style="font-size:12px;">
                                <i class="ph-bold ph-pencil-simple" style="font-size:12px;"></i>
                            </button>` : ''}
                            ${(run.isSettled || isPartial || uncollected.length > 0) ? `<button class="hac-btn-action btn-nullify-settlement" data-doc-id="${run.docId}" data-run-id="${run.id}" title="Visszavonás" style="font-size:11px;font-weight:700;color:#dc2626;background:#fee2e2;border:1.5px solid #fca5a5;border-radius:8px;padding:4px 9px;cursor:pointer;font-family:inherit;flex-shrink:0;">
                                <i class="ph-bold ph-x-circle" style="font-size:11px;"></i> Visszavonás
                            </button>` : ''}
                            <button class="acc-expand-btn" style="background:none;border:1.5px solid #e2e8f0;border-radius:8px;padding:6px 8px;cursor:pointer;color:#64748b;display:flex;align-items:center;transition:all .2s;" title="Rendelések mutatása">
                                <i class="ph-bold ph-caret-down" style="font-size:13px;transition:transform .2s;"></i>
                            </button>
                        </div>
                    </div>
                    <div class="acc-orders-panel" style="display:none;padding:0 14px 12px 62px;border-top:1px solid #f1f5f9;">
                        ${orderChips}
                    </div>
                `;
                runsContainer.appendChild(el);
            });

            accountingRunsContainer.appendChild(groupEl);
        });

        // Eseménykezelők újracsatolása
        accountingRunsContainer.querySelectorAll('.btn-print-summary').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const runId = e.target.closest('button').getAttribute('data-id');
                if (runId) generateDeliveryNotesHtml(runId);
            });
        });

        accountingRunsContainer.querySelectorAll('.btn-settle-run').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.target.closest('button');
                const docId = button.getAttribute('data-doc-id');
                const card = button.closest('.acc-run-card');
                const totalCOD = parseInt(card.getAttribute('data-total-cod'));
                const runId = card.getAttribute('data-run-id');
                const run = await HistoryManager.getRunById(runId);
                if (!run) return;
                const result = await showSettlementDialog(run, totalCOD);
                if (result === null) return;
                if (await HistoryManager.updateSettlementStatus(
                    docId, 
                    result.settledAmount, 
                    totalCOD, 
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
                )) renderAccountingRuns();
            });
        });

        accountingRunsContainer.querySelectorAll('.btn-unsettle-run').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                try {
                    const button = e.target.closest('button');
                    const docId = button.getAttribute('data-doc-id');
                    if (!docId || docId === 'undefined') {
                        alert("Hiba: A terítés dokumentum azonosítója (docId) nem található!");
                        return;
                    }
                    const ok = await CustomDialog.confirm('Visszaállítás függőbe?\nAz elszámolási adat törlődik.');
                    if (!ok) return;
                    const success = await HistoryManager.revertToPending(docId);
                    if (success) {
                        renderAccountingRuns();
                    } else {
                        alert("Hiba történt a Firebase visszaállítás közben. Ellenőrizd a konzolt!");
                    }
                } catch (err) {
                    alert("Hiba a visszaállításkor: " + err.message);
                }
            });
        });

        accountingRunsContainer.querySelectorAll('.btn-nullify-settlement').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                try {
                    const button = e.target.closest('button');
                    const docId  = button.getAttribute('data-doc-id');
                    if (!docId || docId === 'undefined') {
                        alert("Hiba: A terítés dokumentum azonosítója (docId) nem található!");
                        return;
                    }
                    const ok = await CustomDialog.confirm('Visszavonás?\nAz elszámolás törlődik, a kör függőbe kerül.');
                    if (!ok) return;
                    const success = await HistoryManager.revertToPending(docId);
                    if (success) {
                        renderAccountingRuns();
                    } else {
                        alert("Hiba történt a Firebase visszaállítás közben. Ellenőrizd a konzolt!");
                    }
                } catch (err) {
                    alert("Hiba a visszavonáskor: " + err.message);
                }
            });
        });

        accountingRunsContainer.querySelectorAll('.btn-modify-settlement').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.target.closest('button');
                const docId = button.getAttribute('data-doc-id');
                const runId = button.getAttribute('data-run-id');
                const card = button.closest('.acc-run-card');
                const totalCOD = parseInt(card.getAttribute('data-total-cod'));
                const run = await HistoryManager.getRunById(runId);
                if (!run) return;
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
                const result = await showSettlementDialog(run, totalCOD, existingState);
                if (result === null) return;
                if (await HistoryManager.updateSettlementStatus(
                    docId, 
                    result.settledAmount, 
                    totalCOD, 
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
                )) renderAccountingRuns();
            });
        });

        accountingRunsContainer.querySelectorAll('.btn-settle-transfer').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const docId = e.target.closest('button').getAttribute('data-doc-id');
                const ok = await CustomDialog.confirm('Megerősíted, hogy a kártyás utalás megérkezett a bankszámlára ehhez a terítéshez?');
                if (!ok) return;
                if (await HistoryManager.settlePaymentGroup(docId, 'card')) {
                    renderAccountingRuns();
                }
            });
        });

        accountingRunsContainer.querySelectorAll('.btn-settle-kp').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const docId = e.target.closest('button').getAttribute('data-doc-id');
                const ok = await CustomDialog.confirm('Megerősíted, hogy a függő készpénz (KP) beérkezett ehhez a terítéshez?');
                if (!ok) return;
                if (await HistoryManager.settlePaymentGroup(docId, 'cash')) {
                    renderAccountingRuns();
                }
            });
        });

        accountingRunsContainer.querySelectorAll('.acc-expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.acc-run-card');
                if (!card) return;
                const panel = card.querySelector('.acc-orders-panel');
                const icon = btn.querySelector('i');
                const isOpen = panel.style.display !== 'none';
                panel.style.display = isOpen ? 'none' : 'block';
                icon.style.transform = isOpen ? '' : 'rotate(180deg)';
            });
        });
    }

    export async function renderTrashRuns() {
    const { 
        historyRunsContainer, ordersRunsContainer, accountingRunsContainer, trashRunsContainer, hsResultsContainer,
        accountingFilterPending, trashCompanyFilter, trashDateStart, trashDateEnd,
        isFiltered, attachHistoryEvents, openPdfView, handleHistorySearch, generateDeliveryNotesHtml,
        historySearchInput
    } = ctx;
        let runs = await HistoryManager.getTrashRuns();
        runs.sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            if (dateA !== dateB) return dateB.localeCompare(dateA);
            return (b.timestamp || 0) - (a.timestamp || 0);
        });
        trashRunsContainer.innerHTML = '';
        
        // Szűrés
        runs = runs.filter(r => isFiltered(r, true));

        if(runs.length === 0) {
            trashRunsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; margin-top: 20px;">Nincsenek a feltételnek megfelelő törölt körök.</p>';
            return;
        }

        runs.forEach(run => {
            const el = document.createElement('div');
            el.className = 'history-apple-card';
            const deletedDate = new Date(run.deletedAt).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            el.innerHTML = `
                <div class="hac-header" style="padding:13px 16px;">
                    <div style="flex:1;min-width:0;">
                        <div class="hac-date">${run.date}</div>
                        <div class="hac-meta" style="margin-top:2px;">
                            <span class="hac-company" style="font-size:9px;padding:3px 8px;">${run.company || '-'}</span>
                            <span style="color:#d1d5db;">·</span><i class="ph-bold ph-user" style="font-size:11px;color:#374151;"></i><span style="font-weight:600;color:#374151;">${run.courier || '-'}</span>
                            <span style="color:#d1d5db;">·</span><span style="color:#94a3b8;">${run.orders.length} rendelés · ${deletedDate}</span>
                        </div>
                    </div>
                    <div class="hac-actions">
                        <button class="hac-btn-action hac-btn-green btn-restore-run" data-id="${run.docId}">
                            <i class="ph-bold ph-arrow-counter-clockwise" style="font-size:12px;"></i>Visszaállítás
                        </button>
                        <button class="hac-btn-del btn-permanent-delete-run" data-id="${run.docId}" title="Végleges törlés">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            trashRunsContainer.appendChild(el);
        });

        trashRunsContainer.querySelectorAll('.btn-restore-run').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const docId = e.target.getAttribute('data-id');
                const ok = await HistoryManager.restoreRun(docId);
                if (ok) {
                    await renderTrashRuns();
                    await CustomDialog.alert('A szállítási kör sikeresen visszaállítva az előzményekbe!', 'Visszaállítva', 'success');
                }
            });
        });

        trashRunsContainer.querySelectorAll('.btn-permanent-delete-run').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const docId = e.target.closest('button').getAttribute('data-id');
                const confirm = await CustomDialog.confirm('Biztosan VÉGLEGESEN törlöd ezt a kört? Ezután már nem lehet visszaállítani!', 'Végleges Törlés', 'error', true);
                if(confirm) {
                    await HistoryManager.permanentDeleteRun(docId);
                    await renderTrashRuns();
                }
            });
        });
    }

    export function renderSearchResults(matches) {
    const { 
        historyRunsContainer, ordersRunsContainer, accountingRunsContainer, trashRunsContainer, hsResultsContainer,
        accountingFilterPending, trashCompanyFilter, trashDateStart, trashDateEnd,
        isFiltered, attachHistoryEvents, openPdfView, handleHistorySearch, generateDeliveryNotesHtml,
        historySearchInput
    } = ctx;
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
            
            let accountingBadgeHtml = '';
            const uncollected = m.runData?.uncollectedOrderIds || [];
            const isUncollected = uncollected.some(id => String(id) === String(m.id));
            
            if (m.isCOD) {
                let badgeText = 'Függőben lévő elszámolás';
                let badgeColor = '#f59e0b';
                let badgeBg = '#fef3c7';

                let dynamicIsSettled = false;
                const hasStatusMap = m.runData && m.runData.paymentStatusMap && Object.keys(m.runData.paymentStatusMap).length > 0;
                if (hasStatusMap) {
                    const orderStatus = m.runData.paymentStatusMap[m.id] || m.runData.paymentStatusMap[String(m.id)] || 'received';
                    dynamicIsSettled = (orderStatus === 'received');
                } else {
                    let dynamicIsSettledOld = m.runData && m.runData.isSettled;
                    if (m.runData && !dynamicIsSettledOld && typeof m.runData.settledAmount !== 'undefined') {
                        let bankTransferredSum = 0;
                        let uncollectedSum = 0;
                        let partialDiffs = 0;
                        (m.runData.orders || []).forEach(o => {
                            if (o.isCOD) {
                                if (m.runData.bankTransferredOrderIds && m.runData.bankTransferredOrderIds.some(id => String(id) === String(o.id))) {
                                    bankTransferredSum += o.codAmount;
                                } else if (m.runData.uncollectedOrderIds && m.runData.uncollectedOrderIds.some(id => String(id) === String(o.id))) {
                                    uncollectedSum += o.codAmount;
                                } else if (m.runData.partialOrders && (m.runData.partialOrders[o.id] || m.runData.partialOrders[String(o.id)])) {
                                    const partialVal = m.runData.partialOrders[o.id] || m.runData.partialOrders[String(o.id)];
                                    partialDiffs += (o.codAmount - (partialVal.amount || 0));
                                }
                            }
                        });
                        const expectedAmount = (m.runData.totalCOD || 0) - bankTransferredSum - uncollectedSum - partialDiffs;
                        dynamicIsSettled = m.runData.settledAmount >= expectedAmount;
                    } else {
                        dynamicIsSettled = dynamicIsSettledOld;
                    }
                }

                if (m.runData && m.runData.bankTransferredOrderIds && m.runData.bankTransferredOrderIds.some(id => String(id) === String(m.id))) {
                    badgeText = 'Utólag elutalva';
                    badgeColor = '#3b82f6';
                    badgeBg = '#dbeafe';
                } else if (isUncollected) {
                    badgeText = 'Nincs beszedve';
                    badgeColor = '#ef4444';
                    badgeBg = '#fee2e2';
                } else if (m.runData && m.runData.partialOrders && (m.runData.partialOrders[m.id] || m.runData.partialOrders[String(m.id)])) {
                    badgeText = 'Részlegesen beszedve';
                    badgeColor = '#f97316';
                    badgeBg = '#ffedd5';
                } else if (dynamicIsSettled) {
                    badgeText = 'Készpénzben elszámolva';
                    badgeColor = '#10b981';
                    badgeBg = '#d1fae5';
                }

                accountingBadgeHtml = `<span style="font-size: 11px; background: ${badgeBg}; color: ${badgeColor}; padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-left: 5px; display: flex; align-items: center; gap: 4px;"><i class="ph-bold ph-currency-circle-dollar" style="font-size: 13px;"></i> ${badgeText}</span>`;
            } else {
                if (isUncollected) {
                    accountingBadgeHtml = `<span style="font-size: 11px; background: #fee2e2; color: #ef4444; padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-left: 5px; display: flex; align-items: center; gap: 4px;"><i class="ph-bold ph-x-circle" style="font-size: 13px;"></i> Nem lett átadva</span>`;
                } else {
                    accountingBadgeHtml = `<span style="font-size: 11px; background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-left: 5px; display: flex; align-items: center; gap: 4px;"><i class="ph-bold ph-prohibit" style="font-size: 13px;"></i> Nincs utánvét</span>`;
                }
            }
            
            let failureInfoHtml = '';
            if (isUncollected && m.runData) {
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

        // Eseménykezelő az elszámolás megnyitásához
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
                    handleHistorySearch();
                }
            });
        });
    }
