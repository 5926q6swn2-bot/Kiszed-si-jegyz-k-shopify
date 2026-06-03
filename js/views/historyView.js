import { HistoryManager } from '../services/history.js';
import { db, doc, updateDoc, deleteDoc } from '../firebase-config.js';

let ctx = {};

export function initHistoryView(context) {
    ctx = context;
}
    export async function renderHistoryRuns() {
    const { 
        historyRunsContainer, ordersRunsContainer, accountingRunsContainer, trashRunsContainer, hsResultsContainer,
        selectedForMerge, accountingFilterPending, trashCompanyFilter, trashDateStart, trashDateEnd,
        isFiltered, attachHistoryEvents, openPdfView, handleHistorySearch, generateDeliveryNotesHtml,
        historySearchInput
    } = ctx;
        const runs = await HistoryManager.getAllRuns();
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
        const visibleRuns = filteredRuns.filter(r => !r.isMergedInto);

        visibleRuns.forEach(run => {
            const el = document.createElement('div');
            el.className = 'history-apple-card';
            if (selectedForMerge.has(run.id)) el.classList.add('merge-selected');
            const dateStr = new Date(run.timestamp).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const modifiedBadge = run.isModified
                ? `<span class="hac-badge" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ph-bold ph-pencil-simple" style="font-size:10px;"></i>Módosítva${run.modifyCount > 1 ? ` (${run.modifyCount}×)` : ''}</span>`
                : '';
            const mergedBadge = run.isMerged
                ? `<span class="hac-badge hac-badge-merged"><i class="ph-bold ph-git-merge" style="font-size:9px;"></i>Összevont (${run.mergedFromIds?.length || 0} kör)</span>`
                : '';
            const revertBtn = run.isMerged
                ? `<button class="hac-btn-action hac-btn-revert btn-revert-merge" data-doc-id="${run.docId}" title="Összevonás visszavonása"><i class="ph-bold ph-arrow-counter-clockwise" style="font-size:11px;"></i>Visszavon</button>`
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
                    <label class="hac-checkbox-wrap" title="Kijelölés összevonáshoz">
                        <input type="checkbox" class="run-select-cb" data-id="${run.id}" ${selectedForMerge.has(run.id) ? 'checked' : ''}>
                    </label>
                    <div class="hac-info">
                        <span class="hac-company">${run.company || '-'}</span>
                        <span class="hac-date">${run.date}</span>
                        ${mergedBadge}${modifiedBadge}
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
                        ${revertBtn}
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
        selectedForMerge, accountingFilterPending, trashCompanyFilter, trashDateStart, trashDateEnd,
        isFiltered, attachHistoryEvents, openPdfView, handleHistorySearch, generateDeliveryNotesHtml,
        historySearchInput
    } = ctx;
        const q = historySearchInput.value.trim().toLowerCase();
        const allRuns = await HistoryManager.getAllRuns();
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

                let dynamicIsSettled = m.runData && m.runData.isSettled;
                if (m.runData && !dynamicIsSettled && typeof m.runData.settledAmount !== 'undefined') {
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

                if (await HistoryManager.updateSettlementStatus(run.docId, result.settledAmount, runCOD, result.uncollectedOrderIds, result.uncollectedReasons, result.partialOrders, result.bankTransferredOrderIds, result.uncollectedResponsibility)) {
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
                const wasPartial     = !wasUncollected && !wasBankTransferred && !!prevPartial;
                
                const currentResp = existingState?.uncollectedResponsibility?.[o.id] || run.uncollectedResponsibility?.[o.id] || 'vevo';
                const rMienkActive = currentResp === 'mienk';
                const rSzallitoActive = currentResp === 'szallito';
                const rVevoActive = currentResp === 'vevo' || !currentResp;

                const itemsList = (o.items || []).map(it => `<span style="display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:2px 6px;margin:2px 4px 2px 0;"><b>${it.qty}×</b> ${it.name}</span>`).join('');
                
                return `
                <div class="sd-order-row" style="border-bottom:1px solid #f1f5f9;">
                    <label style="display:grid;grid-template-columns: 24px 80px minmax(0, 2fr) minmax(0, 1fr) minmax(240px, auto);align-items:start;gap:12px;padding:14px 20px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
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
                            <span class="sd-full-amount" style="font-size:15px;font-weight:800;color:${wasBankTransferred?'#0284c7':wasPartial?'#1d4ed8':'#b91c1c'};">${wasBankTransferred ? 'Utalva (0 Ft KP)' : wasPartial ? (prevPartial.amount||o.codAmount).toLocaleString('hu-HU') + ' Ft' : o.codAmount.toLocaleString('hu-HU') + ' Ft'}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;padding-top:2px;">
                            <button class="sd-bank-toggle" onclick="event.preventDefault();event.stopPropagation();" data-active="${wasBankTransferred ? 'true' : 'false'}"
                                style="display:${wasUncollected?'none':'inline-flex'};align-items:center;gap:4px;font-size:11px;font-weight:600;color:${wasBankTransferred?'#0284c7':'#64748b'};background:${wasBankTransferred?'#f0f9ff':'#f8fafc'};border:1px solid ${wasBankTransferred?'#bae6fd':'#e2e8f0'};border-radius:6px;padding:6px 10px;cursor:pointer;font-family:inherit;transition:all .15s;">
                                <i class="ph-bold ph-bank" style="font-size:12px;"></i> Banki utalás
                            </button>
                            <button class="sd-partial-toggle" onclick="event.preventDefault();event.stopPropagation();"
                                style="display:${wasUncollected || wasBankTransferred ?'none':'inline-flex'};align-items:center;gap:4px;font-size:11px;font-weight:600;color:${wasPartial?'#1d4ed8':'#64748b'};background:${wasPartial?'#eff6ff':'#f8fafc'};border:1px solid ${wasPartial?'#93c5fd':'#e2e8f0'};border-radius:6px;padding:6px 10px;cursor:pointer;font-family:inherit;transition:all .15s;">
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
                    <label style="display:grid;grid-template-columns: 24px 80px minmax(0, 2fr) minmax(0, 1fr) minmax(240px, auto);align-items:start;gap:12px;padding:14px 20px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
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
                <div style="background:#fff;border-radius:20px;width:100%;max-width:850px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,0.35);overflow:hidden;">
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
                        <span style="font-size:12px;color:#64748b;font-weight:600;">Pipáld ki az <strong style="color:#0f172a;">átadott</strong> rendeléseket · Utánvéteseknél módosítható az elszámolás</span>
                    </div>
                    <div style="overflow-y:auto;flex:1;">${rowsHtml}</div>
                    <div style="padding:14px 20px;border-top:2px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#fff;flex-shrink:0;">
                        <div>
                            <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Elvárt készpénz</div>
                            <div id="sd-total" style="font-size:22px;font-weight:800;color:#0f172a;line-height:1.2;">${runCOD.toLocaleString('hu-HU')} Ft</div>
                            <div id="sd-missing" style="font-size:12px;font-weight:700;color:#f97316;margin-top:2px;display:none;"></div>
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button id="sd-cancel" style="background:none;border:1.5px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;padding:9px 18px;border-radius:12px;cursor:pointer;font-family:inherit;">Mégsem</button>
                            <button id="sd-save" style="background:#0f172a;border:none;color:#fff;font-size:13px;font-weight:700;padding:9px 20px;border-radius:12px;cursor:pointer;font-family:inherit;">Rögzítés</button>
                        </div>
                    </div>
                </div>`;

            document.body.appendChild(overlay);

            const updateTotal = () => {
                let total = 0;
                overlay.querySelectorAll('.sd-order-row').forEach(row => {
                    const cb = row.querySelector('input[type=checkbox]');
                    if (!cb.checked || cb.getAttribute('data-is-cod') !== 'true') return;
                    
                    const bankBtn = row.querySelector('.sd-bank-toggle');
                    const isBankTransferred = bankBtn && bankBtn.getAttribute('data-active') === 'true';
                    if (isBankTransferred) return;

                    const fullAmount   = parseInt(cb.getAttribute('data-amount'));
                    const partialRow   = row.querySelector('.sd-partial-row');
                    const partialInput = row.querySelector('.sd-partial-amount');
                    if (partialRow && partialRow.style.display !== 'none' && partialInput.value !== '') {
                        total += Math.min(parseInt(partialInput.value) || 0, fullAmount);
                    } else {
                        total += fullAmount;
                    }
                });
                overlay.querySelector('#sd-total').textContent = total.toLocaleString('hu-HU') + ' Ft';
                const missingEl = overlay.querySelector('#sd-missing');
                if (missingEl) missingEl.style.display = 'none';
            };

            overlay.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', (e) => {
                const row    = e.target.closest('.sd-order-row');
                const isCOD  = cb.getAttribute('data-is-cod') === 'true';
                const reasonRow = row.querySelector('.sd-reason-row');
                if (e.target.checked) {
                    reasonRow.style.display = 'none';
                    const rInput = row.querySelector('.sd-reason-input');
                    if (rInput) rInput.value = '';
                    if (isCOD) {
                        const pt = row.querySelector('.sd-partial-toggle');
                        const bt = row.querySelector('.sd-bank-toggle');
                        if (pt) pt.style.display = 'inline-flex';
                        if (bt) bt.style.display = 'inline-flex';
                    }
                } else {
                    if (isCOD) {
                        const pr = row.querySelector('.sd-partial-row');
                        const pt = row.querySelector('.sd-partial-toggle');
                        const bt = row.querySelector('.sd-bank-toggle');
                        if (pr) { pr.style.display = 'none'; row.querySelector('.sd-partial-amount').value = ''; row.querySelector('.sd-partial-comment').value = ''; }
                        if (pt) pt.style.display = 'none';
                        if (bt) {
                            bt.style.display = 'none';
                            bt.setAttribute('data-active', 'false');
                            bt.style.background = '#f8fafc';
                            bt.style.color = '#64748b';
                            bt.style.borderColor = '#e2e8f0';
                        }
                        row.querySelector('.sd-full-amount').style.color = '#b91c1c';
                        row.querySelector('.sd-full-amount').textContent = parseInt(cb.getAttribute('data-amount')).toLocaleString('hu-HU') + ' Ft';
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

            // Banki utalás toggle
            overlay.querySelectorAll('.sd-bank-toggle').forEach(btn => btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = btn.closest('.sd-order-row');
                const isBankTransferred = btn.getAttribute('data-active') === 'true';
                const isChecked = row.querySelector('input[type=checkbox]').checked;
                if (!isChecked) return;
                
                const newActive = !isBankTransferred;
                btn.setAttribute('data-active', newActive ? 'true' : 'false');
                
                btn.style.background = newActive ? '#f0f9ff' : '#f8fafc';
                btn.style.color = newActive ? '#0284c7' : '#64748b';
                btn.style.borderColor = newActive ? '#bae6fd' : '#e2e8f0';
                
                const pt = row.querySelector('.sd-partial-toggle');
                const fullAmountEl = row.querySelector('.sd-full-amount');
                const cb = row.querySelector('input[type=checkbox]');
                const fullAmount = parseInt(cb.getAttribute('data-amount'));
                
                if (newActive) {
                    row.querySelector('.sd-partial-row').style.display = 'none';
                    row.querySelector('.sd-partial-amount').value = '';
                    row.querySelector('.sd-partial-comment').value = '';
                    if (pt) {
                        pt.style.display = 'none';
                        pt.style.background = '#f8fafc';
                        pt.style.color = '#64748b';
                        pt.style.borderColor = '#e2e8f0';
                    }
                    fullAmountEl.style.color = '#0284c7';
                    fullAmountEl.textContent = 'Utalva (0 Ft KP)';
                } else {
                    if (pt) pt.style.display = 'inline-flex';
                    fullAmountEl.style.color = '#b91c1c';
                    fullAmountEl.textContent = fullAmount.toLocaleString('hu-HU') + ' Ft';
                }
                updateTotal();
            }));

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
                    row.querySelector('.sd-full-amount').style.color = '#b91c1c';
                } else {
                    partialRow.style.display = 'block';
                    const cb = row.querySelector('input[type=checkbox]');
                    const amountInput = row.querySelector('.sd-partial-amount');
                    if (!amountInput.value) amountInput.value = cb.getAttribute('data-amount');
                    amountInput.focus();
                    btn.style.background = '#eff6ff';
                    btn.style.color = '#1d4ed8';
                    btn.style.borderColor = '#93c5fd';
                    row.querySelector('.sd-full-amount').style.color = '#1d4ed8';
                }
                updateTotal();
            }));

            // Részleges összeg változásakor frissítse a teljes összeget és a végösszeget
            overlay.querySelectorAll('.sd-partial-amount').forEach(input => {
                input.addEventListener('input', (e) => {
                    const row = input.closest('.sd-order-row');
                    const fullAmount = parseInt(row.querySelector('input[type=checkbox]').getAttribute('data-amount'));
                    const val = Math.min(parseInt(e.target.value) || 0, fullAmount);
                    row.querySelector('.sd-full-amount').textContent = (val || fullAmount).toLocaleString('hu-HU') + ' Ft';
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
                const fullAmount = parseInt(row.querySelector('input[type=checkbox]').getAttribute('data-amount'));
                row.querySelector('.sd-full-amount').textContent = fullAmount.toLocaleString('hu-HU') + ' Ft';
                row.querySelector('.sd-full-amount').style.color = '#b91c1c';
                updateTotal();
            }));

            updateTotal();

            const cleanup = () => overlay.remove();
            overlay.querySelector('#sd-close').addEventListener('click', () => { cleanup(); resolve(null); });
            overlay.querySelector('#sd-cancel').addEventListener('click', () => { cleanup(); resolve(null); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) { cleanup(); resolve(null); } });

            overlay.querySelector('#sd-save').addEventListener('click', () => {
                let settledAmount = 0;
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
                            const bankBtn = row.querySelector('.sd-bank-toggle');
                            const isBankTransferred = bankBtn && bankBtn.getAttribute('data-active') === 'true';
                            if (isBankTransferred) {
                                bankTransferredOrderIds.push(orderId);
                            } else {
                                const fullAmount   = parseInt(cb.getAttribute('data-amount'));
                                const partialRow   = row.querySelector('.sd-partial-row');
                                const partialInput = row.querySelector('.sd-partial-amount');
                                if (partialRow && partialRow.style.display !== 'none' && partialInput.value !== '') {
                                    const partialAmount = Math.min(parseInt(partialInput.value) || 0, fullAmount);
                                    const comment = row.querySelector('.sd-partial-comment').value.trim();
                                    settledAmount += partialAmount;
                                    partialOrders[orderId] = { amount: partialAmount, comment };
                                    
                                    // Részleges megrendelés felelősség rögzítése
                                    const selector = partialRow.querySelector('.sd-resp-selector');
                                    if (selector) {
                                        const activeBtn = selector.querySelector('.sd-resp-btn.active');
                                        const resp = activeBtn ? activeBtn.getAttribute('data-resp') : 'vevo';
                                        uncollectedResponsibility[orderId] = resp;
                                    } else {
                                        uncollectedResponsibility[orderId] = 'vevo';
                                    }
                                } else {
                                    settledAmount += fullAmount;
                                }
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
                resolve({ settledAmount, uncollectedOrderIds, uncollectedReasons, partialOrders, bankTransferredOrderIds, uncollectedResponsibility });
            });
        });
    }

    export async function renderAccountingRuns() {
    const { 
        historyRunsContainer, ordersRunsContainer, accountingRunsContainer, trashRunsContainer, hsResultsContainer,
        selectedForMerge, accountingFilterPending, trashCompanyFilter, trashDateStart, trashDateEnd,
        isFiltered, attachHistoryEvents, openPdfView, handleHistorySearch, generateDeliveryNotesHtml,
        historySearchInput
    } = ctx;
        let runs = await HistoryManager.getAllRuns();
        const onlyPending = accountingFilterPending.checked;

        // Szűrés: a dátum/cég szűrők alapján
        runs = runs.filter(r => isFiltered(r));
        // Eltávolítva: runs = runs.filter(r => r.orders.some(o => o.isCOD)); -> Mutassa a nem utánvétes köröket is
        if (onlyPending) {
            runs = runs.filter(r => !r.isSettled && !(r.settledAmount > 0));
        }

        accountingRunsContainer.innerHTML = '';

        if(runs.length === 0) {
            accountingRunsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Nincsenek a feltételnek megfelelő elszámolások.</p>`;
            return;
        }

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

                const isPartial = !run.isSettled && run.settledAmount > 0;
                const circleColor = run.isSettled ? '#22c55e' : isPartial ? '#f97316' : '#cbd5e1';
                const circleBg = run.isSettled ? '#22c55e' : isPartial ? '#fff7ed' : '#fff';
                const circleTextColor = run.isSettled ? '#fff' : isPartial ? '#f97316' : '#94a3b8';
                const circleTitle = run.isSettled ? 'Visszaállítás függőbe' : isPartial ? 'Módosítás / Visszaállítás' : 'Visszaérkezett az utánvét';
                const btnClass = (run.isSettled || isPartial) ? 'btn-unsettle-run' : 'btn-settle-run';

                const statusBadge = run.isSettled
                    ? `<span class="hac-badge hac-badge-green" style="font-size:10px;"><i class="ph-bold ph-check-circle" style="font-size:10px;"></i>Elszámolva</span>`
                    : isPartial
                        ? `<span style="font-size:10px;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:1px 7px;">~${run.settledAmount.toLocaleString('hu-HU')} / ${runCOD.toLocaleString('hu-HU')} Ft</span>`
                        : '';

                const uncollected    = run.uncollectedOrderIds || [];
                const reasons        = run.uncollectedReasons || {};
                const partialOrders  = run.partialOrders || {};
                const bankTransferred = run.bankTransferredOrderIds || [];
                const orderChips = run.orders.map(o => {
                    const isUncollected = uncollected.includes(o.id);
                    const isBankTransferred = bankTransferred.includes(o.id);
                    const partialInfo   = o.isCOD && !isUncollected && !isBankTransferred ? partialOrders[o.id] : null;
                    const reasonText    = isUncollected && reasons[o.id] ? ` · ${reasons[o.id]}` : '';
                    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;${isUncollected ? 'opacity:.55;' : ''}">
                        <span style="font-size:12px;font-weight:700;color:#374151;min-width:95px;${isUncollected ? 'text-decoration:line-through;' : ''}">${o.id}</span>
                        <span style="font-size:12px;color:#64748b;flex:1;">${o.shippingName || '—'}</span>
                        ${o.isCOD
                            ? isUncollected
                                ? `<span style="font-size:11px;font-weight:700;color:#f97316;">nem érkezett<span style="font-weight:400;color:#94a3b8;">${reasonText}</span></span>`
                                : isBankTransferred
                                    ? `<span style="font-size:11px;font-weight:700;color:#3b82f6;">Elutalva (Banki utalás)<span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft</span></span>`
                                    : partialInfo
                                        ? `<span style="font-size:11px;font-weight:700;color:#1d4ed8;">~${partialInfo.amount.toLocaleString('hu-HU')} Ft<span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft${partialInfo.comment ? ' · ' + partialInfo.comment : ''}</span></span>`
                                        : `<span style="font-size:11px;font-weight:700;color:#b91c1c;">${o.codAmount.toLocaleString('hu-HU')} Ft</span>`
                            : isUncollected
                                ? `<span style="font-size:11px;font-weight:700;color:#f97316;">nem lett átadva<span style="font-weight:400;color:#94a3b8;">${reasonText}</span></span>`
                                : '<span style="font-size:11px;color:#94a3b8;">átadva</span>'}
                    </div>`;
                }).join('');

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
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;">
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
                if (await HistoryManager.updateSettlementStatus(docId, result.settledAmount, totalCOD, result.uncollectedOrderIds, result.uncollectedReasons, result.partialOrders, result.bankTransferredOrderIds, result.uncollectedResponsibility)) renderAccountingRuns();
            });
        });

        accountingRunsContainer.querySelectorAll('.btn-unsettle-run').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const docId = e.target.closest('button').getAttribute('data-doc-id');
                const ok = await CustomDialog.confirm('Visszaállítás függőbe?\nAz elszámolási adat törlődik.');
                if (!ok) return;
                if (await HistoryManager.revertToPending(docId)) renderAccountingRuns();
            });
        });

        accountingRunsContainer.querySelectorAll('.btn-nullify-settlement').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.target.closest('button');
                const docId  = button.getAttribute('data-doc-id');
                const ok = await CustomDialog.confirm('Visszavonás?\nAz elszámolás törlődik, a kör függőbe kerül.');
                if (!ok) return;
                if (await HistoryManager.revertToPending(docId)) renderAccountingRuns();
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
                    uncollectedResponsibility: run.uncollectedResponsibility || {}
                };
                const result = await showSettlementDialog(run, totalCOD, existingState);
                if (result === null) return;
                if (await HistoryManager.updateSettlementStatus(docId, result.settledAmount, totalCOD, result.uncollectedOrderIds, result.uncollectedReasons, result.partialOrders, result.bankTransferredOrderIds, result.uncollectedResponsibility)) renderAccountingRuns();
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
        selectedForMerge, accountingFilterPending, trashCompanyFilter, trashDateStart, trashDateEnd,
        isFiltered, attachHistoryEvents, openPdfView, handleHistorySearch, generateDeliveryNotesHtml,
        historySearchInput
    } = ctx;
        let runs = await HistoryManager.getTrashRuns();
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
        selectedForMerge, accountingFilterPending, trashCompanyFilter, trashDateStart, trashDateEnd,
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

                let dynamicIsSettled = m.runData && m.runData.isSettled;
                if (m.runData && !dynamicIsSettled && typeof m.runData.settledAmount !== 'undefined') {
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
                    uncollectedResponsibility: run.uncollectedResponsibility || {}
                };
                
                const result = await showSettlementDialog(run, runCOD, existingState);
                if (result === null) return;
                
                if (await HistoryManager.updateSettlementStatus(run.docId, result.settledAmount, runCOD, result.uncollectedOrderIds, result.uncollectedReasons, result.partialOrders, result.bankTransferredOrderIds, result.uncollectedResponsibility)) {
                    handleHistorySearch();
                }
            });
        });
    }
