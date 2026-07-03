import { HistoryManager } from '../services/history.js?v=158';
import { CustomDialog } from '../utils/dialog.js';

export const AuditView = {
    container: null,
    startDateInput: null,
    endDateInput: null,
    companyFilterSelect: null,
    resultsContainer: null,
    allRuns: [],

    async render(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '15px';
        this.container.style.padding = '15px 0';

        // 1. Render Filters & Header Area
        this.renderFilters();

        // 2. Render Results container
        this.resultsContainer = document.createElement('div');
        this.resultsContainer.style.flex = '1';
        this.resultsContainer.style.display = 'flex';
        this.resultsContainer.style.flexDirection = 'column';
        this.resultsContainer.style.gap = '10px';
        this.container.appendChild(this.resultsContainer);

        // Set default dates (last 30 days)
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        this.startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        this.endDateInput.value = today.toISOString().split('T')[0];

        // Populate companies dropdown
        this.allRuns = await HistoryManager.getAllRuns();
        this.populateCompanies();

        // Bind events
        this.startDateInput.addEventListener('change', () => this.updateAudit());
        this.endDateInput.addEventListener('change', () => this.updateAudit());
        this.companyFilterSelect.addEventListener('change', () => this.updateAudit());

        // Initial update
        this.updateAudit();
    },

    renderFilters() {
        const filterBar = document.createElement('div');
        filterBar.className = 'audit-filter-bar no-print';
        filterBar.style.display = 'flex';
        filterBar.style.gap = '10px';
        filterBar.style.alignItems = 'center';
        filterBar.style.background = '#f8fafc';
        filterBar.style.padding = '12px 16px';
        filterBar.style.borderRadius = '12px';
        filterBar.style.border = '1px solid #e2e8f0';
        filterBar.style.flexWrap = 'wrap';

        // Start Date
        const startGroup = document.createElement('div');
        startGroup.style.display = 'flex';
        startGroup.style.flexDirection = 'column';
        startGroup.style.gap = '4px';
        startGroup.innerHTML = '<span style="font-size: 11px; font-weight: 600; color: #64748b;">Kezdő dátum</span>';
        this.startDateInput = document.createElement('input');
        this.startDateInput.type = 'date';
        this.startDateInput.style.padding = '8px 10px';
        this.startDateInput.style.border = '1px solid #cbd5e1';
        this.startDateInput.style.borderRadius = '8px';
        this.startDateInput.style.fontSize = '13px';
        this.startDateInput.style.fontFamily = 'inherit';
        startGroup.appendChild(this.startDateInput);
        filterBar.appendChild(startGroup);

        // End Date
        const endGroup = document.createElement('div');
        endGroup.style.display = 'flex';
        endGroup.style.flexDirection = 'column';
        endGroup.style.gap = '4px';
        endGroup.innerHTML = '<span style="font-size: 11px; font-weight: 600; color: #64748b;">Záró dátum</span>';
        this.endDateInput = document.createElement('input');
        this.endDateInput.type = 'date';
        this.endDateInput.style.padding = '8px 10px';
        this.endDateInput.style.border = '1px solid #cbd5e1';
        this.endDateInput.style.borderRadius = '8px';
        this.endDateInput.style.fontSize = '13px';
        this.endDateInput.style.fontFamily = 'inherit';
        endGroup.appendChild(this.endDateInput);
        filterBar.appendChild(endGroup);

        // Company
        const companyGroup = document.createElement('div');
        companyGroup.style.display = 'flex';
        companyGroup.style.flexDirection = 'column';
        companyGroup.style.gap = '4px';
        companyGroup.innerHTML = '<span style="font-size: 11px; font-weight: 600; color: #64748b;">Szállító cég</span>';
        this.companyFilterSelect = document.createElement('select');
        this.companyFilterSelect.style.padding = '8px 12px';
        this.companyFilterSelect.style.border = '1px solid #cbd5e1';
        this.companyFilterSelect.style.borderRadius = '8px';
        this.companyFilterSelect.style.fontSize = '13px';
        this.companyFilterSelect.style.fontFamily = 'inherit';
        this.companyFilterSelect.style.background = '#fff';
        companyGroup.appendChild(this.companyFilterSelect);
        filterBar.appendChild(companyGroup);

        // Clear button
        const btnClear = document.createElement('button');
        btnClear.type = 'button';
        btnClear.style.marginLeft = 'auto';
        btnClear.style.padding = '8px 12px';
        btnClear.style.borderRadius = '8px';
        btnClear.style.border = '1.5px solid #cbd5e1';
        btnClear.style.background = '#fff';
        btnClear.style.color = '#475569';
        btnClear.style.fontSize = '13px';
        btnClear.style.fontWeight = '600';
        btnClear.style.cursor = 'pointer';
        btnClear.style.fontFamily = 'inherit';
        btnClear.innerHTML = 'Szűrők törlése';
        btnClear.addEventListener('click', () => {
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);
            this.startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
            this.endDateInput.value = today.toISOString().split('T')[0];
            this.companyFilterSelect.value = '';
            this.updateAudit();
        });
        filterBar.appendChild(btnClear);

        // Export button
        const btnExport = document.createElement('button');
        btnExport.type = 'button';
        btnExport.style.padding = '8px 12px';
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
        filterBar.appendChild(btnExport);

        this.container.appendChild(filterBar);
    },

    populateCompanies() {
        const companies = new Set();
        this.allRuns.forEach(r => {
            if (r.company) {
                companies.add(r.company);
            }
        });

        this.companyFilterSelect.innerHTML = '<option value="">Összes cég</option>';
        Array.from(companies).sort().forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            this.companyFilterSelect.appendChild(opt);
        });
    },

    async updateAudit() {
        this.resultsContainer.innerHTML = '<p style="color:#94a3b8;font-size:13px;text-align:center;padding:30px;">Betöltés...</p>';
        this.allRuns = await HistoryManager.getAllRuns();

        const startVal = this.startDateInput.value;
        const endVal = this.endDateInput.value;
        const selectedCompany = this.companyFilterSelect.value;

        const startD = startVal ? new Date(startVal + 'T00:00:00') : null;
        const endD   = endVal   ? new Date(endVal   + 'T23:59:59') : null;

        // Filter runs by date and optionally company
        const filteredRuns = this.allRuns.filter(r => {
            if (!r.date) return true;
            const d = new Date(r.date + 'T00:00:00');
            if (startD && d < startD) return false;
            if (endD   && d > endD)   return false;
            if (selectedCompany && r.company !== selectedCompany) return false;
            return true;
        });

        if (filteredRuns.length === 0) {
            this.resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; border: 2px dashed #e2e8f0; border-radius: 12px; color: #94a3b8; font-weight: 600;">
                    Nincsenek adatok a megadott szűrési feltételekkel.
                </div>
            `;
            return;
        }

        // Map order ID -> list of runs and details to check duplicates and redeliveries
        const orderRunsMap = new Map();
        filteredRuns.forEach(r => {
            const rUnc  = new Set(r.uncollectedOrderIds || []);
            const rPart = r.partialOrders || {};
            const settled = r.isSettled || (r.settledAmount > 0);
            r.orders.forEach(o => {
                if (!orderRunsMap.has(o.id)) orderRunsMap.set(o.id, []);
                const isUnc  = rUnc.has(o.id);
                const isPart = !!rPart[o.id];
                orderRunsMap.get(o.id).push({
                    date: r.date,
                    courier: r.courier,
                    company: r.company || '—',
                    isUncollected: isUnc,
                    isPartial: isPart,
                    wasReceived: !isUnc && !isPart && settled,
                    wasPartialReceived: isPart && settled,
                });
            });
        });

        // Collect problematic rows
        const kiesettRows = [];
        const duplicatesAdded = new Set();

        filteredRuns.forEach((r, rIdx) => {
            const runReasons  = r.uncollectedReasons || {};
            const runPartials = r.partialOrders || {};
            const runResponsibility = r.uncollectedResponsibility || {};

            // 1. Failed orders
            (r.uncollectedOrderIds || []).forEach(id => {
                const o = (r.orders || []).find(x => x.id === id);
                const laterEntries = (orderRunsMap.get(id) || []).filter(e => e.date > (r.date || ''));
                kiesettRows.push({
                    id,
                    isPartial: false,
                    isCOD: !!(o && o.isCOD),
                    name: o ? (o.shippingName || '—') : '—',
                    date: r.date || '—',
                    courier: r.courier || '—',
                    company: r.company || '—',
                    codAmount: o && o.isCOD ? (o.codAmount || 0) : 0,
                    reason: runReasons[id] || '',
                    laterEntries,
                    docId: r.docId,
                    responsibility: runResponsibility[id] || 'vevo',
                    isDuplicate: (orderRunsMap.get(id) || []).length > 1
                });
            });

            // 2. Partial orders
            Object.entries(runPartials).forEach(([id, info]) => {
                const o = (r.orders || []).find(x => x.id === id);
                if (!o || !o.isCOD) return;
                const diff = o.codAmount - (info.amount || 0);
                if (diff <= 0) return;
                const laterEntries = (orderRunsMap.get(id) || []).filter(e => e.date > (r.date || ''));
                kiesettRows.push({
                    id,
                    isPartial: true,
                    isCOD: true,
                    name: o.shippingName || '—',
                    date: r.date || '—',
                    courier: r.courier || '—',
                    company: r.company || '—',
                    codAmount: diff,
                    fullAmount: o.codAmount,
                    partialAmount: info.amount,
                    reason: info.comment || '',
                    laterEntries,
                    docId: r.docId,
                    responsibility: runResponsibility[id] || 'vevo',
                    isDuplicate: (orderRunsMap.get(id) || []).length > 1
                });
            });

            // 3. Duplicated orders (sent out multiple times, even if first/other round was fine)
            r.orders.forEach(o => {
                const allAttempts = orderRunsMap.get(o.id) || [];
                if (allAttempts.length > 1 && !duplicatesAdded.has(o.id)) {
                    // Check if this order is already in the list as a failed/partial attempt
                    const isAlreadyListed = kiesettRows.some(x => x.id === o.id);
                    if (!isAlreadyListed) {
                        duplicatesAdded.add(o.id);
                        kiesettRows.push({
                            id: o.id,
                            isPartial: false,
                            isCOD: !!o.isCOD,
                            name: o.shippingName || '—',
                            date: r.date || '—',
                            courier: r.courier || '—',
                            company: r.company || '—',
                            codAmount: o.isCOD ? (o.codAmount || 0) : 0,
                            reason: 'Többszöri kiszállítási kísérlet',
                            laterEntries: allAttempts.filter(e => e.date > r.date),
                            docId: r.docId,
                            responsibility: 'vevo',
                            isDuplicate: true,
                            isPureDuplicate: true // Indicated that this was not failed/partial on this run but is a duplicate
                        });
                    }
                }
            });
        });

        // Sort items: resolved redeliveries at the bottom, sorted by date desc
        kiesettRows.sort((a, b) => {
            const aRec = (a.laterEntries || []).some(e => e.wasReceived || e.wasPartialReceived) ? 1 : 0;
            const bRec = (b.laterEntries || []).some(e => e.wasReceived || e.wasPartialReceived) ? 1 : 0;
            if (aRec !== bRec) return aRec - bRec;
            return b.date.localeCompare(a.date);
        });

        this.renderList(kiesettRows, orderRunsMap);
    },

    renderList(kiesettRows, orderRunsMap) {
        this.resultsContainer.innerHTML = '';

        if (kiesettRows.length === 0) {
            this.resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; border: 2px dashed #e2e8f0; border-radius: 12px; color: #94a3b8; font-weight: 600;">
                    Nincsenek kiesett vagy többször kiszállított rendelések a megadott időszakban.
                </div>
            `;
            return;
        }

        const renderLaterEntries = (entries) => {
            if (!entries || entries.length === 0) return '';
            const redeliveries = entries.filter(e => e.date);
            if (redeliveries.length === 0) return '';
            const last = redeliveries[redeliveries.length - 1];
            const outcome = last.isUncollected
                ? `<span style="font-size:10px;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #fed7aa;border-radius:5px;padding:1px 6px;">ismét kiesett</span>`
                : last.wasReceived || last.wasPartialReceived
                    ? `<span style="font-size:10px;font-weight:700;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;padding:1px 6px;">átvéve ✓</span>`
                    : `<span style="font-size:10px;color:#94a3b8;background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:1px 6px;">függőben</span>`;
            return `<div style="margin-top:6px;padding-left:14px;border-left:2px solid #cbd5e1;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span style="font-size:11px;color:#94a3b8;">↳</span>
                <span style="font-size:11px;font-weight:600;color:#64748b;">${redeliveries.length}× újra szállítva</span>
                <span style="font-size:11px;color:#94a3b8;">·</span>
                <span style="font-size:11px;color:#64748b;">${last.date} · ${last.company} · ${last.courier || '—'}</span>
                ${outcome}
            </div>`;
        };

        const listWrapper = document.createElement('div');
        listWrapper.style.display = 'grid';
        listWrapper.style.gridTemplateColumns = 'repeat(3, 1fr)';
        listWrapper.style.gap = '12px';
        listWrapper.style.maxHeight = '65vh';
        listWrapper.style.overflowY = 'auto';
        listWrapper.style.paddingRight = '4px';

        kiesettRows.forEach(k => {
            const isRecovered = k.laterEntries && k.laterEntries.some(e => e.wasReceived || e.wasPartialReceived);
            const amtColor = isRecovered ? '#94a3b8' : '#b91c1c';
            
            const resp = k.responsibility || 'vevo';
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

            const isDuplicate = k.isDuplicate;
            const duplicateBadge = isDuplicate 
                ? `<span style="font-size:10px;font-weight:700;color:#c2410c;background:#fff7ed;border:1px solid #fed7aa;border-radius:5px;padding:1px 6px;">Duplikált (${(orderRunsMap.get(k.id) || []).length}x kiment)</span>`
                : '';

            const actionContainer = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;border-top:1px dashed #e2e8f0;padding-top:8px;">
                <div class="responsibility-display" style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:11px;color:#64748b;font-weight:600;margin-right:4px;">Felelős:</span>
                    <span class="resp-pill ${pillClass}" data-doc-id="${k.docId}" data-order-id="${k.id}" data-resp="${resp}" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:3px 8px;font-size:11px;font-weight:600;border-radius:8px;transition:all .15s;" title="Kattints a felelős váltásához">
                        ${pillIcon}${pillLabel}
                    </span>
                </div>
                ${!isRecovered && k.isCOD && !k.isPartial && !k.isPureDuplicate ? `<button class="btn-mark-bank-audit" data-doc-id="${k.docId}" data-order-id="${k.id}" style="display:flex;align-items:center;gap:4px;font-size:10px;font-weight:600;color:#0284c7;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:4px 8px;cursor:pointer;transition:all .15s;" title="Áthelyezés utalt státuszba (nem lesz kiesett)">
                    <i class="ph-bold ph-bank" style="font-size:10px;"></i>Utólag elutalva
                </button>` : ''}
            </div>
            `;

            const card = document.createElement('div');
            card.style.background = '#fff';
            card.style.border = isDuplicate ? '1px solid #fed7aa' : '1px solid #e2e8f0';
            card.style.borderRadius = '12px';
            card.style.padding = '12px';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '4px';

            card.innerHTML = `
                <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;justify-content:space-between;">
                    <div>
                        <strong style="font-size:13px;color:#0f172a;">${k.id}</strong>
                        <span style="font-size:12px;color:#64748b;margin-left:5px;">${k.name}</span>
                    </div>
                    ${duplicateBadge}
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px;">
                    <span style="font-size:11px;color:#94a3b8;">${k.date}</span>
                    <span style="font-size:11px;color:#64748b;">Cég: <strong>${k.company}</strong></span>
                    <span style="font-size:11px;color:#64748b;">Futár: <strong>${k.courier}</strong></span>
                    ${!k.isCOD
                        ? `<span style="font-size:10px;color:#64748b;background:#f1f5f9;border-radius:5px;padding:1px 6px;">Nem utánvétes</span>`
                        : k.isPartial
                            ? `<span style="font-size:10px;font-weight:700;color:#1d4ed8;background:#eff6ff;border:1px solid #93c5fd;border-radius:5px;padding:1px 6px;">Részleges</span>
                               <span style="font-size:11px;font-weight:700;color:${amtColor};">-${k.codAmount.toLocaleString('hu-HU')} Ft</span>`
                            : k.codAmount > 0
                                ? `<span style="font-size:11px;font-weight:700;color:${amtColor};">${k.isPureDuplicate ? 'Eredeti UV: ' : ''}${k.codAmount.toLocaleString('hu-HU')} Ft</span>`
                                : ''}
                    ${k.reason ? `<span style="font-size:10px;color:#64748b;background:#f1f5f9;border-radius:5px;padding:2px 7px;">${k.reason}</span>` : ''}
                </div>
                ${renderLaterEntries(k.laterEntries)}
                ${actionContainer}
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
        const startVal = this.startDateInput.value;
        const endVal = this.endDateInput.value;
        const selectedCompany = this.companyFilterSelect.value;

        const startD = startVal ? new Date(startVal + 'T00:00:00') : null;
        const endD   = endVal   ? new Date(endVal   + 'T23:59:59') : null;

        const filteredRuns = this.allRuns.filter(r => {
            if (!r.date) return true;
            const d = new Date(r.date + 'T00:00:00');
            if (startD && d < startD) return false;
            if (endD   && d > endD)   return false;
            if (selectedCompany && r.company !== selectedCompany) return false;
            return true;
        });

        if (filteredRuns.length === 0) {
            CustomDialog.alert('Nincs exportálható adat a jelenlegi szűréssel!', 'Figyelmeztetés', 'warning');
            return;
        }

        const orderRunsMap = new Map();
        filteredRuns.forEach(r => {
            const rUnc  = new Set(r.uncollectedOrderIds || []);
            const rPart = r.partialOrders || {};
            const settled = r.isSettled || (r.settledAmount > 0);
            r.orders.forEach(o => {
                if (!orderRunsMap.has(o.id)) orderRunsMap.set(o.id, []);
                const isUnc  = rUnc.has(o.id);
                const isPart = !!rPart[o.id];
                orderRunsMap.get(o.id).push({
                    date: r.date,
                    courier: r.courier,
                    company: r.company || '—',
                    isUncollected: isUnc,
                    isPartial: isPart,
                    wasReceived: !isUnc && !isPart && settled,
                    wasPartialReceived: isPart && settled,
                });
            });
        });

        const csvRows = [];
        const headers = [
            "Rendelésszám",
            "Név",
            "Dátum",
            "Cég",
            "Futár",
            "Összeg (Ft)",
            "Státusz / Indok",
            "Felelősség",
            "Duplikált?",
            "Újra kiküldések száma"
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

        const addedIds = new Set();
        filteredRuns.forEach(r => {
            const runReasons  = r.uncollectedReasons || {};
            const runPartials = r.partialOrders || {};
            const runResponsibility = r.uncollectedResponsibility || {};

            // 1. Failed orders
            (r.uncollectedOrderIds || []).forEach(id => {
                const o = (r.orders || []).find(x => x.id === id);
                const attempts = orderRunsMap.get(id) || [];
                const resp = runResponsibility[id] || 'vevo';
                let respLabel = resp === 'szallito' ? "Szállító" : (resp === 'mienk' ? "Saját" : "Vevő");

                csvRows.push([
                    clean(id),
                    clean(o ? o.shippingName : '-'),
                    clean(r.date || '—'),
                    clean(r.company || '—'),
                    clean(r.courier || '—'),
                    o && o.isCOD ? o.codAmount : 0,
                    clean(runReasons[id] || 'Kiesett'),
                    clean(respLabel),
                    attempts.length > 1 ? "IGEN" : "NEM",
                    attempts.length - 1
                ].join(";"));
            });

            // 2. Partial orders
            Object.entries(runPartials).forEach(([id, info]) => {
                const o = (r.orders || []).find(x => x.id === id);
                if (!o || !o.isCOD) return;
                const diff = o.codAmount - (info.amount || 0);
                if (diff <= 0) return;
                const attempts = orderRunsMap.get(id) || [];
                const resp = runResponsibility[id] || 'vevo';
                let respLabel = resp === 'szallito' ? "Szállító" : (resp === 'mienk' ? "Saját" : "Vevő");

                csvRows.push([
                    clean(id),
                    clean(o.shippingName || '-'),
                    clean(r.date || '—'),
                    clean(r.company || '—'),
                    clean(r.courier || '—'),
                    diff,
                    clean(info.comment || 'Részleges átvétel'),
                    clean(respLabel),
                    attempts.length > 1 ? "IGEN" : "NEM",
                    attempts.length - 1
                ].join(";"));
            });

            // 3. Duplicate orders (successful ones that went out > 1 time)
            r.orders.forEach(o => {
                const attempts = orderRunsMap.get(o.id) || [];
                if (attempts.length > 1 && !addedIds.has(o.id)) {
                    // check if already added as failed/partial
                    const uncoll = r.uncollectedOrderIds || [];
                    const part = r.partialOrders || {};
                    if (!uncoll.includes(o.id) && !part[o.id]) {
                        addedIds.add(o.id);
                        csvRows.push([
                            clean(o.id),
                            clean(o.shippingName || '-'),
                            clean(r.date || '—'),
                            clean(r.company || '—'),
                            clean(r.courier || '—'),
                            o.isCOD ? o.codAmount : 0,
                            clean("Többszöri kiszállítás (Sikeres)"),
                            clean("-"),
                            "IGEN",
                            attempts.length - 1
                        ].join(";"));
                    }
                }
            });
        });

        const csvContent = csvRows.join("\r\n");

        // Download UTF-8 without BOM (pure UTF-8)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        link.setAttribute('download', `elszamolas_audit_${selectedCompany || 'osszes'}_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
