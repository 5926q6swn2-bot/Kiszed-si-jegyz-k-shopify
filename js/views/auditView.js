import { HistoryManager } from '../services/history.js';
import { CustomDialog } from '../utils/dialog.js';

export const AuditView = {
    container: null,
    resultsContainer: null,
    allRuns: [],
    filterMode: 'all', // 'all' (default: mind a szállító hibás), 'multi' (csak többszöri kiszállítás)

    async render(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '15px';
        this.container.style.padding = '15px 0';

        // 1. Render Header Area (Info, Filter Toggles and Export CSV button)
        this.renderHeader();

        // 2. Render Results container
        this.resultsContainer = document.createElement('div');
        this.resultsContainer.style.flex = '1';
        this.resultsContainer.style.display = 'flex';
        this.resultsContainer.style.flexDirection = 'column';
        this.resultsContainer.style.gap = '10px';
        this.container.appendChild(this.resultsContainer);

        // Load runs
        this.allRuns = await HistoryManager.getAllRuns();

        // Initial update
        this.updateAudit();
    },

    renderHeader() {
        const headerBar = document.createElement('div');
        headerBar.className = 'audit-header-bar no-print';
        headerBar.style.display = 'flex';
        headerBar.style.justifyContent = 'space-between';
        headerBar.style.alignItems = 'center';
        headerBar.style.background = '#f8fafc';
        headerBar.style.padding = '12px 16px';
        headerBar.style.borderRadius = '12px';
        headerBar.style.border = '1px solid #e2e8f0';
        headerBar.style.gap = '15px';
        headerBar.style.flexWrap = 'wrap';

        const infoText = document.createElement('div');
        infoText.innerHTML = '<span style="font-size: 13.5px; font-weight: 700; color: #0f172a;"><i class="ph-bold ph-truck" style="margin-right: 6px; color: #0284c7; font-size: 16px;"></i>Szállító hibás rendelések számlaellenőrzése</span>';
        headerBar.appendChild(infoText);

        const filterGroup = document.createElement('div');
        filterGroup.style.display = 'flex';
        filterGroup.style.alignItems = 'center';
        filterGroup.style.gap = '8px';

        const btnAll = document.createElement('button');
        btnAll.type = 'button';
        btnAll.id = 'audit-btn-filter-all';
        btnAll.style.cssText = `padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; border: 1.5px solid ${this.filterMode === 'all' ? '#0284c7' : '#cbd5e1'}; background: ${this.filterMode === 'all' ? '#e0f2fe' : '#fff'}; color: ${this.filterMode === 'all' ? '#0369a1' : '#64748b'};`;
        btnAll.innerHTML = '<i class="ph-bold ph-list-checks" style="margin-right: 4px;"></i>Összes szállítói hiba';
        btnAll.addEventListener('click', () => {
            this.filterMode = 'all';
            this.updateFilterButtons();
            this.updateAudit();
        });

        const btnMulti = document.createElement('button');
        btnMulti.type = 'button';
        btnMulti.id = 'audit-btn-filter-multi';
        btnMulti.style.cssText = `padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; border: 1.5px solid ${this.filterMode === 'multi' ? '#ea580c' : '#cbd5e1'}; background: ${this.filterMode === 'multi' ? '#ffedd5' : '#fff'}; color: ${this.filterMode === 'multi' ? '#c2410c' : '#64748b'};`;
        btnMulti.innerHTML = '<i class="ph-bold ph-arrows-clockwise" style="margin-right: 4px;"></i>Csak többszöri kiszállítás (2x+)';
        btnMulti.addEventListener('click', () => {
            this.filterMode = 'multi';
            this.updateFilterButtons();
            this.updateAudit();
        });

        filterGroup.appendChild(btnAll);
        filterGroup.appendChild(btnMulti);
        headerBar.appendChild(filterGroup);

        // Export button
        const btnExport = document.createElement('button');
        btnExport.type = 'button';
        btnExport.style.padding = '8px 14px';
        btnExport.style.borderRadius = '8px';
        btnExport.style.border = '1.5px solid #10b981';
        btnExport.style.background = '#10b981';
        btnExport.style.color = '#fff';
        btnExport.style.fontSize = '13px';
        btnExport.style.fontWeight = '700';
        btnExport.style.cursor = 'pointer';
        btnExport.style.fontFamily = 'inherit';
        btnExport.style.display = 'flex';
        btnExport.style.alignItems = 'center';
        btnExport.style.gap = '5px';
        btnExport.innerHTML = '<i class="ph-bold ph-download-simple" style="font-size: 15px;"></i> Export CSV';
        btnExport.addEventListener('click', () => this.exportAuditToCsv());
        headerBar.appendChild(btnExport);

        this.container.appendChild(headerBar);
    },

    updateFilterButtons() {
        const btnAll = document.getElementById('audit-btn-filter-all');
        const btnMulti = document.getElementById('audit-btn-filter-multi');
        if (btnAll) {
            btnAll.style.border = `1.5px solid ${this.filterMode === 'all' ? '#0284c7' : '#cbd5e1'}`;
            btnAll.style.background = this.filterMode === 'all' ? '#e0f2fe' : '#fff';
            btnAll.style.color = this.filterMode === 'all' ? '#0369a1' : '#64748b';
        }
        if (btnMulti) {
            btnMulti.style.border = `1.5px solid ${this.filterMode === 'multi' ? '#ea580c' : '#cbd5e1'}`;
            btnMulti.style.background = this.filterMode === 'multi' ? '#ffedd5' : '#fff';
            btnMulti.style.color = this.filterMode === 'multi' ? '#c2410c' : '#64748b';
        }
    },

    async updateAudit() {
        if (!this.resultsContainer) return;
        this.resultsContainer.innerHTML = '<p style="color:#94a3b8;font-size:13px;text-align:center;padding:30px;">Betöltés...</p>';
        this.allRuns = await HistoryManager.getAllRuns();

        // Read global filters from the history modal
        const startVal = document.getElementById('history-date-start')?.value || '';
        const endVal = document.getElementById('history-date-end')?.value || '';
        const selectedCompany = document.getElementById('history-company-filter')?.value || '';
        const searchVal = document.getElementById('history-search-input')?.value.toLowerCase().trim() || '';

        const startD = startVal ? new Date(startVal + 'T00:00:00') : null;
        const endD   = endVal   ? new Date(endVal   + 'T23:59:59') : null;

function parseDate(dateStr) {
    if (!dateStr) return null;
    if (typeof dateStr !== 'string') return null;
    const clean = dateStr.trim().replace(/\./g, '-').replace(/-+/g, '-').replace(/-$/, '');
    const parts = clean.split('-');
    if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            return new Date(y, m, d);
        }
    }
    const dt = new Date(clean);
    return isNaN(dt.getTime()) ? null : dt;
}

// ... inside updateAudit ...
        // Filter runs by date (kiszállítási dátum) and optionally company
        const filteredRuns = this.allRuns.filter(r => {
            const dateStr = r.date || r.originalDate;
            if (!dateStr) return true;
            const d = parseDate(dateStr);
            if (!d) return true;
            d.setHours(12, 0, 0, 0);

            if (startD && d < startD) return false;
            if (endD   && d > endD)   return false;
            if (selectedCompany && r.company !== selectedCompany) return false;
            return true;
        });

        // Group order attempts across ALL runs
        const orderAttemptsMap = new Map();
        this.allRuns.forEach(r => {
            const rUnc = new Set(r.uncollectedOrderIds || []);
            const rPart = r.partialOrders || {};
            const runResponsibility = r.uncollectedResponsibility || {};
            const runReasons = r.uncollectedReasons || {};
            
            (r.orders || []).forEach(o => {
                if (!o.id) return;
                const isUnc = rUnc.has(o.id);
                const isPart = !!rPart[o.id];
                const resp = runResponsibility[o.id] || 'vevo';
                
                let outcome = 'Sikeres';
                let codAmount = 0;
                let comment = '';
                
                if (isUnc) {
                    outcome = 'Kiesett';
                    codAmount = o.isCOD ? (o.codAmount || 0) : 0;
                    comment = runReasons[o.id] || '';
                } else if (isPart) {
                    outcome = 'Részleges';
                    const pInfo = rPart[o.id];
                    codAmount = o.isCOD ? (o.codAmount - (pInfo.amount || 0)) : 0;
                    comment = pInfo.comment || '';
                }
                
                if (!orderAttemptsMap.has(o.id)) {
                    orderAttemptsMap.set(o.id, {
                        id: o.id,
                        name: o.shippingName || '—',
                        isCOD: !!o.isCOD,
                        fullCodAmount: o.isCOD ? (o.codAmount || 0) : 0,
                        attempts: []
                    });
                }
                
                orderAttemptsMap.get(o.id).attempts.push({
                    date: r.date || '—',
                    courier: r.courier || '—',
                    company: r.company || '—',
                    docId: r.docId,
                    isUncollected: isUnc,
                    isPartial: isPart,
                    responsibility: resp,
                    outcome: outcome,
                    codAmount: codAmount,
                    comment: comment
                });
            });
        });

        // Filter to show carrier fault orders
        const filteredDocIds = new Set(filteredRuns.map(r => r.docId));
        const eligibleOrders = [];
        
        for (const [id, orderData] of orderAttemptsMap.entries()) {
            orderData.attempts.sort((a, b) => a.date.localeCompare(b.date));
            
            const hasCarrierFaultInFilteredRuns = orderData.attempts.some(att => 
                filteredDocIds.has(att.docId) && att.responsibility === 'szallito'
            );
            
            if (hasCarrierFaultInFilteredRuns) {
                if (this.filterMode === 'multi' && orderData.attempts.length < 2) {
                    continue; // Skip single attempts in multi mode
                }
                eligibleOrders.push(orderData);
            }
        }

        // Apply global search input filtering
        let finalOrders = eligibleOrders;
        if (searchVal) {
            finalOrders = eligibleOrders.filter(o => 
                o.id.toLowerCase().includes(searchVal) || 
                o.name.toLowerCase().includes(searchVal)
            );
        }

        // Sort by the latest attempt's date descending
        finalOrders.sort((a, b) => {
            const aMaxDate = a.attempts.reduce((max, att) => att.date > max ? att.date : max, '');
            const bMaxDate = b.attempts.reduce((max, att) => att.date > max ? att.date : max, '');
            return bMaxDate.localeCompare(aMaxDate);
        });

        this.renderList(finalOrders);
    },

    renderList(finalOrders) {
        this.resultsContainer.innerHTML = '';

        if (finalOrders.length === 0) {
            this.resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; border: 2px dashed #e2e8f0; border-radius: 12px; color: #94a3b8; font-weight: 600;">
                    Nincsenek szállító hibás vagy hozzájuk kapcsolódó többször kiszállított rendelések a megadott szűréssel.
                </div>
            `;
            return;
        }

        const listWrapper = document.createElement('div');
        listWrapper.style.display = 'grid';
        listWrapper.style.gridTemplateColumns = 'repeat(3, 1fr)';
        listWrapper.style.gap = '12px';
        listWrapper.style.maxHeight = '65vh';
        listWrapper.style.overflowY = 'auto';
        listWrapper.style.paddingRight = '4px';

        finalOrders.forEach(o => {
            const card = document.createElement('div');
            card.style.background = '#fff';
            card.style.border = o.attempts.length > 1 ? '1px solid #fed7aa' : '1px solid #e2e8f0';
            card.style.borderRadius = '12px';
            card.style.padding = '14px';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '10px';
            card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';

            const duplicateBadge = o.attempts.length > 1
                ? `<span style="font-size:10px;font-weight:700;color:#c2410c;background:#fff7ed;border:1px solid #fed7aa;border-radius:5px;padding:2px 6px;">Többszöri kiszállítás (${o.attempts.length}x)</span>`
                : '';

            let cardHeader = `
                <div style="display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:6px;border-bottom:1px solid #f1f5f9;padding-bottom:8px;">
                    <div>
                        <strong style="font-size:14px;color:#0f172a;">${o.id}</strong>
                        <span style="font-size:13px;color:#64748b;margin-left:6px;font-weight:500;">${o.name}</span>
                    </div>
                    ${duplicateBadge}
                </div>
            `;

            let attemptsHtml = '';
            o.attempts.forEach((att, attIdx) => {
                const isRecovered = o.attempts.slice(attIdx + 1).some(e => e.outcome === 'Sikeres');
                const amtColor = isRecovered ? '#94a3b8' : '#b91c1c';

                let outcomeHtml = '';
                if (att.outcome === 'Kiesett') {
                    outcomeHtml = `<span style="font-size:11px;font-weight:700;color:${amtColor};background:#fee2e2;border:1px solid #fca5a5;border-radius:5px;padding:2px 6px;display:inline-block;">Kiesett: -${att.codAmount.toLocaleString('hu-HU')} Ft</span>`;
                } else if (att.outcome === 'Részleges') {
                    outcomeHtml = `<span style="font-size:11px;font-weight:700;color:${amtColor};background:#eff6ff;border:1px solid #93c5fd;border-radius:5px;padding:2px 6px;display:inline-block;">Részleges: -${att.codAmount.toLocaleString('hu-HU')} Ft</span>`;
                } else {
                    outcomeHtml = `<span style="font-size:11px;font-weight:700;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;padding:2px 6px;display:inline-block;">Sikeres átvétel</span>`;
                }

                const resp = att.responsibility || 'vevo';
                let pillClass = 'vevo';
                let pillIcon = '<i class="ph-bold ph-user"></i>';
                let pillLabel = 'Vevő / Egyéb';
                if (resp === 'mienk') {
                    pillClass = 'mienk';
                    pillIcon = '<i class="ph-bold ph-x-circle"></i>';
                    pillLabel = 'Saját hiba';
                } else if (resp === 'szallito') {
                    pillClass = 'szallito';
                    pillIcon = '<i class="ph-bold ph-truck"></i>';
                    pillLabel = 'Szállító hibája';
                }

                // Show Utólag elutalva button if failed/partial and not recovered yet
                const showBankButton = !isRecovered && att.outcome !== 'Sikeres' && o.isCOD;

                attemptsHtml += `
                    <div style="padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #f1f5f9;display:flex;flex-direction:column;gap:6px;margin-bottom:6px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748b;">
                            <span>${att.date} · <strong>${att.company}</strong></span>
                            <span>Futár: <strong>${att.courier}</strong></span>
                        </div>
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;">
                            ${outcomeHtml}
                            ${att.comment ? `<span style="font-size:11px;color:#475569;font-style:italic;" title="${att.comment}">"${att.comment}"</span>` : ''}
                        </div>
                        ${att.outcome !== 'Sikeres' ? `
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;border-top:1px dashed #e2e8f0;padding-top:6px;gap:6px;flex-wrap:wrap;">
                            <div class="responsibility-display" style="display:flex;align-items:center;gap:4px;">
                                <span style="font-size:10px;color:#64748b;font-weight:600;">Felelős:</span>
                                <span class="resp-pill ${pillClass}" data-doc-id="${att.docId}" data-order-id="${o.id}" data-resp="${resp}" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:2px 6px;font-size:10px;font-weight:600;border-radius:6px;transition:all .15s;" title="Kattints a felelős váltásához">
                                    ${pillIcon}${pillLabel}
                                </span>
                            </div>
                            ${showBankButton ? `
                            <button class="btn-mark-bank-audit" data-doc-id="${att.docId}" data-order-id="${o.id}" style="display:flex;align-items:center;gap:3px;font-size:10px;font-weight:600;color:#0284c7;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:3px 6px;cursor:pointer;transition:all .15s;" title="Áthelyezés utalt státuszba (nem lesz kiesett)">
                                <i class="ph-bold ph-bank" style="font-size:10px;"></i>Utalt
                            </button>` : ''}
                        </div>
                        ` : ''}
                    </div>
                `;
            });

            card.innerHTML = cardHeader + `
                <div style="display:flex;flex-direction:column;gap:2px;margin-top:4px;">
                    ${attemptsHtml}
                </div>
            `;
            listWrapper.appendChild(card);
        });

        this.resultsContainer.appendChild(listWrapper);

        // Bind interactive handlers
        this.bindEvents(listWrapper);
    },

    bindEvents(listWrapper) {
        // Post-transferred action click handler
        listWrapper.querySelectorAll('.btn-mark-bank-audit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const docId = btn.getAttribute('data-doc-id');
                const orderId = btn.getAttribute('data-order-id');
                const ok = await CustomDialog.confirm(`Biztosan utólag elutalva állapotra állítod a ${orderId} rendelést? Ez kiveszi a kiesettek közül.`, 'Utólag elutalva', 'info');
                if (ok) {
                    const success = await HistoryManager.markAsBankTransferred(docId, orderId);
                    if (success) {
                        this.updateAudit(); // Refresh the list
                    }
                }
            });
        });

        // Responsibility change cycle click handler
        listWrapper.querySelectorAll('.resp-pill').forEach(pill => {
            pill.addEventListener('click', async (e) => {
                e.stopPropagation();
                const docId = pill.getAttribute('data-doc-id');
                const orderId = pill.getAttribute('data-order-id');
                const currentResp = pill.getAttribute('data-resp');
                
                let nextResp = 'vevo';
                let nextLabel = 'Vevő / Egyéb';
                let nextClass = 'vevo';
                let nextIcon = '<i class="ph-bold ph-user"></i>';

                if (currentResp === 'vevo') {
                    nextResp = 'mienk';
                    nextLabel = 'Saját hiba';
                    nextClass = 'mienk';
                    nextIcon = '<i class="ph-bold ph-x-circle"></i>';
                } else if (currentResp === 'mienk') {
                    nextResp = 'szallito';
                    nextLabel = 'Szállító hibája';
                    nextClass = 'szallito';
                    nextIcon = '<i class="ph-bold ph-truck"></i>';
                }

                // Optimistic visual update
                pill.className = `resp-pill ${nextClass}`;
                pill.setAttribute('data-resp', nextResp);
                pill.innerHTML = `${nextIcon}${nextLabel}`;

                const ok = await HistoryManager.updateResponsibilityInFirestore(docId, orderId, nextResp);
                if (ok) {
                    this.updateAudit(); // Refresh after saving
                } else {
                    await CustomDialog.alert("Hiba történt a felelősség rögzítésekor.", "Hiba", "error");
                    this.updateAudit(); // Rollback/reload on failure
                }
            });
        });
    },

    async exportAuditToCsv() {
        const startVal = document.getElementById('history-date-start')?.value || '';
        const endVal = document.getElementById('history-date-end')?.value || '';
        const selectedCompany = document.getElementById('history-company-filter')?.value || '';
        const searchVal = document.getElementById('history-search-input')?.value.toLowerCase().trim() || '';

        const startD = startVal ? new Date(startVal + 'T00:00:00') : null;
        const endD   = endVal   ? new Date(endVal   + 'T23:59:59') : null;

        // Filter runs by date (kiszállítási dátum) and optionally company
        const filteredRuns = this.allRuns.filter(r => {
            const dateStr = r.date || r.originalDate;
            if (!dateStr) return true;
            const d = parseDate(dateStr);
            if (!d) return true;
            d.setHours(12, 0, 0, 0);

            if (startD && d < startD) return false;
            if (endD   && d > endD)   return false;
            if (selectedCompany && r.company !== selectedCompany) return false;
            return true;
        });

        // Group order attempts across ALL runs
        const orderAttemptsMap = new Map();
        this.allRuns.forEach(r => {
            const rUnc = new Set(r.uncollectedOrderIds || []);
            const rPart = r.partialOrders || {};
            const runResponsibility = r.uncollectedResponsibility || {};
            const runReasons = r.uncollectedReasons || {};
            
            (r.orders || []).forEach(o => {
                if (!o.id) return;
                const isUnc = rUnc.has(o.id);
                const isPart = !!rPart[o.id];
                const resp = runResponsibility[o.id] || 'vevo';
                
                let outcome = 'Sikeres';
                let codAmount = 0;
                let comment = '';
                
                if (isUnc) {
                    outcome = 'Kiesett';
                    codAmount = o.isCOD ? (o.codAmount || 0) : 0;
                    comment = runReasons[o.id] || '';
                } else if (isPart) {
                    outcome = 'Részleges';
                    const pInfo = rPart[o.id];
                    codAmount = o.isCOD ? (o.codAmount - (pInfo.amount || 0)) : 0;
                    comment = pInfo.comment || '';
                }
                
                if (!orderAttemptsMap.has(o.id)) {
                    orderAttemptsMap.set(o.id, {
                        id: o.id,
                        name: o.shippingName || '—',
                        isCOD: !!o.isCOD,
                        fullCodAmount: o.isCOD ? (o.codAmount || 0) : 0,
                        attempts: []
                    });
                }
                
                orderAttemptsMap.get(o.id).attempts.push({
                    date: r.date || '—',
                    courier: r.courier || '—',
                    company: r.company || '—',
                    docId: r.docId,
                    isUncollected: isUnc,
                    isPartial: isPart,
                    responsibility: resp,
                    outcome: outcome,
                    codAmount: codAmount,
                    comment: comment
                });
            });
        });

        const filteredDocIds = new Set(filteredRuns.map(r => r.docId));
        const eligibleOrders = [];
        for (const [id, orderData] of orderAttemptsMap.entries()) {
            orderData.attempts.sort((a, b) => a.date.localeCompare(b.date));
            const hasCarrierFaultInFilteredRuns = orderData.attempts.some(att => 
                filteredDocIds.has(att.docId) && att.responsibility === 'szallito'
            );
            if (hasCarrierFaultInFilteredRuns) {
                if (this.filterMode === 'multi' && orderData.attempts.length < 2) {
                    continue;
                }
                eligibleOrders.push(orderData);
            }
        }

        let finalOrders = eligibleOrders;
        if (searchVal) {
            finalOrders = eligibleOrders.filter(o => 
                o.id.toLowerCase().includes(searchVal) || 
                o.name.toLowerCase().includes(searchVal)
            );
        }

        if (finalOrders.length === 0) {
            CustomDialog.alert('Nincs exportálható adat a jelenlegi szűréssel!', 'Figyelmeztetés', 'warning');
            return;
        }

        const csvRows = [];
        const headers = [
            "Rendelésszám",
            "Név",
            "Dátum",
            "Cég",
            "Futár",
            "Kiesett Összeg (Ft)",
            "Státusz / Indok",
            "Felelősség",
            "Kiszállítások száma"
        ];
        csvRows.push(headers.join(";"));

        const clean = (val) => {
            if (val === undefined || val === null) return "";
            let str = String(val);
            if (str.includes(";") || str.includes("\n") || str.includes('"')) {
                str = str.replace(/"/g, '""');
                return `"${str}"`;
            }
            return str;
        };

        finalOrders.forEach(o => {
            o.attempts.forEach(att => {
                let respLabel = att.responsibility === 'szallito' ? "Szállító" : (att.responsibility === 'mienk' ? "Saját" : "Vevő");
                csvRows.push([
                    clean(o.id),
                    clean(o.name),
                    clean(att.date),
                    clean(att.company),
                    clean(att.courier),
                    att.codAmount,
                    clean(att.outcome + (att.comment ? `: ${att.comment}` : '')),
                    clean(respLabel),
                    o.attempts.length
                ].join(";"));
            });
        });

        const csvContent = csvRows.join("\r\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        link.setAttribute('download', `elszamolas_audit_szallito_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
