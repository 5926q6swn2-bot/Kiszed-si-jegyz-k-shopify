import { HistoryManager } from '../services/history.js?v=158';
import { CustomDialog } from '../utils/dialog.js';

export const AuditView = {
    container: null,
    startDateInput: null,
    endDateInput: null,
    companyFilterSelect: null,
    auditFilterSelect: null,
    resultsContainer: null,
    summaryContainer: null,
    allRuns: [],

    async render(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '15px';
        this.container.style.padding = '15px 0';

        // Load data
        this.allRuns = await HistoryManager.getAllRuns();

        // 1. Render Filters & Header Area
        this.renderFilters();

        // 2. Render Summary Panel container
        this.summaryContainer = document.createElement('div');
        this.summaryContainer.style.display = 'grid';
        this.summaryContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
        this.summaryContainer.style.gap = '12px';
        this.container.appendChild(this.summaryContainer);

        // 3. Render Results container
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
        this.populateCompanies();

        // Bind events
        this.startDateInput.addEventListener('change', () => this.updateAudit());
        this.endDateInput.addEventListener('change', () => this.updateAudit());
        this.companyFilterSelect.addEventListener('change', () => this.updateAudit());
        this.auditFilterSelect.addEventListener('change', () => this.updateAudit());

        // Initial update
        this.updateAudit();
    },

    renderFilters() {
        const filterBar = document.createElement('div');
        filterBar.className = 'audit-filter-bar';
        filterBar.style.display = 'flex';
        filterBar.style.gap = '8px';
        filterBar.style.alignItems = 'center';
        filterBar.style.background = '#f8fafc';
        filterBar.style.padding = '12px';
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

        // Audit type
        const typeGroup = document.createElement('div');
        typeGroup.style.display = 'flex';
        typeGroup.style.flexDirection = 'column';
        typeGroup.style.gap = '4px';
        typeGroup.innerHTML = '<span style="font-size: 11px; font-weight: 600; color: #64748b;">Probléma típusa</span>';
        this.auditFilterSelect = document.createElement('select');
        this.auditFilterSelect.style.padding = '8px 12px';
        this.auditFilterSelect.style.border = '1px solid #cbd5e1';
        this.auditFilterSelect.style.borderRadius = '8px';
        this.auditFilterSelect.style.fontSize = '13px';
        this.auditFilterSelect.style.fontFamily = 'inherit';
        this.auditFilterSelect.style.background = '#fff';

        const types = [
            { value: 'all', label: 'Összes hiba és duplikáció' },
            { value: 'failed_carrier', label: 'Kiesett - Szállító hibája' },
            { value: 'failed_buyer', label: 'Kiesett - Vevő/Egyéb hibája' },
            { value: 'duplicates', label: 'Többszöri kísérletek (Duplikációk)' },
            { value: 'partial', label: 'Részleges elszámolások' }
        ];

        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.value;
            opt.textContent = t.label;
            this.auditFilterSelect.appendChild(opt);
        });

        typeGroup.appendChild(this.auditFilterSelect);
        filterBar.appendChild(typeGroup);

        // Clear button
        const btnClear = document.createElement('button');
        btnClear.type = 'button';
        btnClear.style.marginLeft = 'auto';
        btnClear.style.marginTop = '15px';
        btnClear.style.padding = '8px 12px';
        btnClear.style.borderRadius = '8px';
        btnClear.style.border = '1.5px solid #cbd5e1';
        btnClear.style.background = '#fff';
        btnClear.style.color = '#475569';
        btnClear.style.fontSize = '13px';
        btnClear.style.fontWeight = '600';
        btnClear.style.cursor = 'pointer';
        btnClear.style.fontFamily = 'inherit';
        btnClear.innerHTML = 'Szűrők alaphelyzetbe';
        btnClear.addEventListener('click', () => {
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);
            this.startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
            this.endDateInput.value = today.toISOString().split('T')[0];
            this.companyFilterSelect.value = '';
            this.auditFilterSelect.value = 'all';
            this.updateAudit();
        });
        filterBar.appendChild(btnClear);

        // Export button
        const btnExport = document.createElement('button');
        btnExport.type = 'button';
        btnExport.style.marginTop = '15px';
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
        btnExport.innerHTML = '<i class="ph-bold ph-download-simple" style="font-size: 15px;"></i> Audit CSV';
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

    updateAudit() {
        const startVal = this.startDateInput.value;
        const endVal = this.endDateInput.value;
        const selectedCompany = this.companyFilterSelect.value;
        const selectedAuditType = this.auditFilterSelect.value;

        const startD = startVal ? new Date(startVal) : null;
        if (startD) startD.setHours(0, 0, 0, 0);
        const endD = endVal ? new Date(endVal) : null;
        if (endD) endD.setHours(23, 59, 59, 999);

        // 1. Filter runs
        const filteredRuns = this.allRuns.filter(run => {
            const runD = new Date(run.originalDate || run.date);
            runD.setHours(12, 0, 0, 0);

            if (startD && runD < startD) return false;
            if (endD && runD > endD) return false;
            if (selectedCompany && run.company !== selectedCompany) return false;

            return true;
        });

        // 2. Statistics and groups calculation
        let totalRuns = filteredRuns.length;
        let totalOrders = 0;
        let carrierErrors = 0;
        let buyerErrors = 0;
        let partialCounts = 0;

        // Duplicate tracker: map of orderId -> list of {run, order, isUncollected, status}
        const orderAttemptsMap = {};

        filteredRuns.forEach(run => {
            const uncollected = run.uncollectedOrderIds || [];
            const responsibilities = run.uncollectedResponsibility || {};
            const reasons = run.uncollectedReasons || {};
            const partialOrders = run.partialOrders || {};
            const bankTransferred = run.bankTransferredOrderIds || [];
            const paymentStatusMap = run.paymentStatusMap || {};

            run.orders.forEach(o => {
                totalOrders++;
                const isUnc = uncollected.includes(o.id) || uncollected.includes(String(o.id));
                const isBank = bankTransferred.includes(o.id) || bankTransferred.includes(String(o.id));
                const isPart = !isUnc && !isBank && (!!partialOrders[o.id] || !!partialOrders[String(o.id)]);

                let resp = 'vevo';
                if (isUnc) {
                    resp = responsibilities[o.id] || responsibilities[String(o.id)] || 'vevo';
                    if (resp === 'szallito') {
                        carrierErrors++;
                    } else {
                        buyerErrors++;
                    }
                }

                if (isPart) {
                    partialCounts++;
                }

                // Add to attempts map for duplicate checks
                const cleanId = String(o.id).trim();
                if (!orderAttemptsMap[cleanId]) {
                    orderAttemptsMap[cleanId] = [];
                }
                orderAttemptsMap[cleanId].push({
                    run: run,
                    order: o,
                    isUncollected: isUnc,
                    isPartial: isPart,
                    isBank: isBank,
                    responsibility: resp,
                    reason: isUnc ? (reasons[o.id] || reasons[String(o.id)] || 'Nincs indok') : (isPart ? 'Részleges átvétel' : 'Sikeres'),
                    comment: isPart ? ((partialOrders[o.id] || partialOrders[String(o.id)]).comment || '') : ''
                });
            });
        });

        // Calculate duplicate counts
        let duplicateOrdersCount = 0;
        const duplicateAttempts = {};
        for (const orderId in orderAttemptsMap) {
            if (orderAttemptsMap[orderId].length > 1) {
                duplicateOrdersCount++;
                duplicateAttempts[orderId] = orderAttemptsMap[orderId];
            }
        }

        // Render Summary Panel cards
        this.renderSummaryCards(totalRuns, totalOrders, carrierErrors, buyerErrors, duplicateOrdersCount, partialCounts);

        // 3. Filter results to display
        const displayList = [];

        for (const orderId in orderAttemptsMap) {
            const attempts = orderAttemptsMap[orderId];
            const isDuplicate = attempts.length > 1;

            attempts.forEach((att, index) => {
                let shouldInclude = false;

                if (selectedAuditType === 'all') {
                    shouldInclude = att.isUncollected || att.isPartial || isDuplicate;
                } else if (selectedAuditType === 'failed_carrier') {
                    shouldInclude = att.isUncollected && att.responsibility === 'szallito';
                } else if (selectedAuditType === 'failed_buyer') {
                    shouldInclude = att.isUncollected && att.responsibility !== 'szallito';
                } else if (selectedAuditType === 'duplicates') {
                    shouldInclude = isDuplicate;
                } else if (selectedAuditType === 'partial') {
                    shouldInclude = att.isPartial;
                }

                if (shouldInclude) {
                    displayList.push({
                        orderId: orderId,
                        customerName: att.order.shippingName || '-',
                        attemptNum: index + 1,
                        totalAttempts: attempts.length,
                        date: att.run.date,
                        company: att.run.company || '-',
                        courier: att.run.courier,
                        isUnc: att.isUncollected,
                        isPart: att.isPartial,
                        isBank: att.isBank,
                        codAmount: att.order.codAmount || 0,
                        responsibility: att.responsibility,
                        reason: att.reason,
                        comment: att.comment,
                        orderData: att.order,
                        runData: att.run
                    });
                }
            });
        }

        // Sort by order ID then attempt number
        displayList.sort((a, b) => {
            if (a.orderId !== b.orderId) return a.orderId.localeCompare(b.orderId, undefined, { numeric: true, sensitivity: 'base' });
            return a.attemptNum - b.attemptNum;
        });

        // 4. Render Details List
        this.renderDetailsList(displayList, duplicateAttempts);
    },

    renderSummaryCards(totalRuns, totalOrders, carrierErrors, buyerErrors, duplicates, partials) {
        this.summaryContainer.innerHTML = `
            <div style="background: #fff; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">📊 Összes futárkör</span>
                <span style="font-size: 20px; font-weight: 800; color: #0f172a;">${totalRuns} kör</span>
            </div>
            <div style="background: #fff; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">📦 Összes csomag</span>
                <span style="font-size: 20px; font-weight: 800; color: #0f172a;">${totalOrders} db</span>
            </div>
            <div style="background: #fee2e2; padding: 12px; border-radius: 12px; border: 1px solid #fecaca; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <span style="font-size: 11px; font-weight: 700; color: #b91c1c; text-transform: uppercase;">❌ Szállító hibája</span>
                <span style="font-size: 20px; font-weight: 800; color: #991b1b;">${carrierErrors} db</span>
            </div>
            <div style="background: #fef9c3; padding: 12px; border-radius: 12px; border: 1px solid #fef08a; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <span style="font-size: 11px; font-weight: 700; color: #a16207; text-transform: uppercase;">🔄 Duplikációk</span>
                <span style="font-size: 20px; font-weight: 800; color: #854d0e;">${duplicates} rendelés</span>
            </div>
            <div style="background: #ffedd5; padding: 12px; border-radius: 12px; border: 1px solid #fed7aa; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <span style="font-size: 11px; font-weight: 700; color: #c2410c; text-transform: uppercase;">⚖️ Részleges</span>
                <span style="font-size: 20px; font-weight: 800; color: #9a3412;">${partials} db</span>
            </div>
        `;
    },

    renderDetailsList(displayList, duplicateAttempts) {
        this.resultsContainer.innerHTML = '';

        if (displayList.length === 0) {
            this.resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; border: 2px dashed #e2e8f0; border-radius: 12px; color: #94a3b8; font-weight: 600;">
                    Nincsenek a szűrésnek megfelelő auditált adatok ebben az időszakban.
                </div>
            `;
            return;
        }

        const listWrapper = document.createElement('div');
        listWrapper.style.display = 'flex';
        listWrapper.style.flexDirection = 'column';
        listWrapper.style.gap = '8px';
        listWrapper.style.maxHeight = '48vh';
        listWrapper.style.overflowY = 'auto';
        listWrapper.style.paddingRight = '4px';

        // Keep track of rendered duplicate parent groups to avoid double headers
        const renderedParents = new Set();

        displayList.forEach(item => {
            const hasMultipleAttempts = item.totalAttempts > 1;

            if (hasMultipleAttempts) {
                // If duplicate, group attempts under a single parent card
                if (renderedParents.has(item.orderId)) return;
                renderedParents.add(item.orderId);

                const parentCard = document.createElement('div');
                parentCard.style.background = '#fff';
                parentCard.style.border = '1.5px solid #fed7aa';
                parentCard.style.borderRadius = '12px';
                parentCard.style.padding = '12px 16px';
                parentCard.style.display = 'flex';
                parentCard.style.flexDirection = 'column';
                parentCard.style.gap = '8px';

                // Parent card header
                const attemptsList = duplicateAttempts[item.orderId];
                parentCard.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                        <span style="font-weight: 700; color: #c2410c; font-size: 14px;">📦 Rendelés: ${item.orderId} (Duplikált kiszállítás)</span>
                        <span style="font-size: 11px; background: #ffedd5; color: #ea580c; font-weight: 700; padding: 2px 6px; border-radius: 5px;">Kísérletek száma: ${item.totalAttempts}x</span>
                    </div>
                    <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 2px;">Vevő: ${item.customerName}</div>
                `;

                // Add timeline of attempts
                const timeline = document.createElement('div');
                timeline.style.display = 'flex';
                timeline.style.flexDirection = 'column';
                timeline.style.gap = '6px';
                timeline.style.borderLeft = '2px solid #fdba74';
                timeline.style.paddingLeft = '12px';
                timeline.style.marginLeft = '4px';
                timeline.style.marginTop = '6px';

                attemptsList.forEach((att, idx) => {
                    let statusHtml = '';
                    let borderCol = '#e2e8f0';
                    let bgCol = '#f8fafc';

                    if (att.isUncollected) {
                        const isSzallito = att.responsibility === 'szallito';
                        statusHtml = `<span style="font-size: 10px; font-weight: 700; color: ${isSzallito ? '#ef4444' : '#64748b'}; background: ${isSzallito ? '#fee2e2' : '#f1f5f9'}; border: 1px solid ${isSzallito ? '#fecaca' : '#cbd5e1'}; border-radius: 6px; padding: 1px 6px;">
                            ${isSzallito ? 'Kiesett (Szállító hibája)' : 'Kiesett (Vevő/Egyéb hibája)'}
                        </span>`;
                        borderCol = isSzallito ? '#fecaca' : '#e2e8f0';
                        bgCol = isSzallito ? '#fffbfa' : '#f8fafc';
                    } else if (att.isPartial) {
                        statusHtml = `<span style="font-size: 10px; font-weight: 700; color: #f97316; background: #ffedd5; border: 1px solid #fed7aa; border-radius: 6px; padding: 1px 6px;">
                            Részlegesen beszedve
                        </span>`;
                        borderCol = '#fed7aa';
                        bgCol = '#fffbf7';
                    } else {
                        statusHtml = `<span style="font-size: 10px; font-weight: 700; color: #10b981; background: #d1fae5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 1px 6px;">
                            Sikeres kézbesítés
                        </span>`;
                        borderCol = '#a7f3d0';
                        bgCol = '#fafdfb';
                    }

                    const attItem = document.createElement('div');
                    attItem.style.background = bgCol;
                    attItem.style.border = `1px solid ${borderCol}`;
                    attItem.style.borderRadius = '8px';
                    attItem.style.padding = '8px 10px';
                    attItem.style.fontSize = '12px';
                    attItem.style.display = 'flex';
                    attItem.style.flexDirection = 'column';
                    attItem.style.gap = '4px';

                    attItem.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong>Kísérlet ${idx + 1}: ${att.run.date}</strong>
                            ${statusHtml}
                        </div>
                        <div style="color: #475569;">
                            Cég: <strong>${att.run.company || '-'}</strong> | Futár: <strong>${att.run.courier}</strong>
                        </div>
                        <div style="font-size: 11px; color: #64748b; font-style: italic;">
                            Utánvét: ${att.order.codAmount?.toLocaleString('hu-HU')} Ft | Eredmény/Indok: ${att.reason} ${att.comment ? `(${att.comment})` : ''}
                        </div>
                    `;
                    timeline.appendChild(attItem);
                });

                parentCard.appendChild(timeline);
                listWrapper.appendChild(parentCard);
            } else {
                // If single attempt but problematic (e.g. carrier error or partial)
                const card = document.createElement('div');
                card.style.background = '#fff';
                card.style.borderRadius = '12px';
                card.style.padding = '12px 16px';
                card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';

                let badgeText = '';
                let badgeColor = '';
                let badgeBg = '';
                let borderCol = '#e2e8f0';

                if (item.isUnc) {
                    const isSzallito = item.responsibility === 'szallito';
                    badgeText = isSzallito ? 'Kiesett (Szállító hibája)' : 'Kiesett (Vevő hibája)';
                    badgeColor = isSzallito ? '#ef4444' : '#64748b';
                    badgeBg = isSzallito ? '#fee2e2' : '#f1f5f9';
                    borderCol = isSzallito ? '#ef4444' : '#cbd5e1';
                } else if (item.isPart) {
                    badgeText = 'Részleges átvétel';
                    badgeColor = '#f97316';
                    badgeBg = '#ffedd5';
                    borderCol = '#f97316';
                }

                card.style.border = '1px solid #e2e8f0';
                card.style.borderLeft = `4px solid ${borderCol}`;

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                        <div>
                            <span style="font-weight: 700; color: #0f172a;">#${item.orderId}</span>
                            <span style="margin-left: 8px; font-weight: 600; color: #475569;">${item.customerName}</span>
                        </div>
                        <span style="font-size: 10px; font-weight: 700; color: ${badgeColor}; background: ${badgeBg}; border: 1px solid ${badgeColor}33; padding: 2px 6px; border-radius: 6px;">
                            ${badgeText}
                        </span>
                    </div>
                    <div style="font-size: 12px; color: #475569; display: flex; gap: 15px; margin-top: 4px;">
                        <span>Dátum: <strong>${item.date}</strong></span>
                        <span>Cég: <strong>${item.company}</strong></span>
                        <span>Futár: <strong>${item.courier}</strong></span>
                    </div>
                    <div style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 6px; display: flex; flex-direction: column; gap: 2px;">
                        <div>Összeg: <strong>${item.codAmount.toLocaleString('hu-HU')} Ft</strong></div>
                        <div>Indoklás: <strong>${item.reason} ${item.comment ? `(${item.comment})` : ''}</strong></div>
                    </div>
                `;
                listWrapper.appendChild(card);
            }
        });

        this.resultsContainer.appendChild(listWrapper);
    },

    exportAuditToCsv() {
        const startVal = this.startDateInput.value;
        const endVal = this.endDateInput.value;
        const selectedCompany = this.companyFilterSelect.value;
        const selectedAuditType = this.auditFilterSelect.value;

        const startD = startVal ? new Date(startVal) : null;
        if (startD) startD.setHours(0, 0, 0, 0);
        const endD = endVal ? new Date(endVal) : null;
        if (endD) endD.setHours(23, 59, 59, 999);

        // Filter runs
        const filteredRuns = this.allRuns.filter(run => {
            const runD = new Date(run.originalDate || run.date);
            runD.setHours(12, 0, 0, 0);

            if (startD && runD < startD) return false;
            if (endD && runD > endD) return false;
            if (selectedCompany && run.company !== selectedCompany) return false;

            return true;
        });

        const orderAttemptsMap = {};
        filteredRuns.forEach(run => {
            const uncollected = run.uncollectedOrderIds || [];
            const responsibilities = run.uncollectedResponsibility || {};
            const reasons = run.uncollectedReasons || {};
            const partialOrders = run.partialOrders || {};
            const bankTransferred = run.bankTransferredOrderIds || [];

            run.orders.forEach(o => {
                const isUnc = uncollected.includes(o.id) || uncollected.includes(String(o.id));
                const isBank = bankTransferred.includes(o.id) || bankTransferred.includes(String(o.id));
                const isPart = !isUnc && !isBank && (!!partialOrders[o.id] || !!partialOrders[String(o.id)]);

                let resp = 'vevo';
                if (isUnc) {
                    resp = responsibilities[o.id] || responsibilities[String(o.id)] || 'vevo';
                }

                const cleanId = String(o.id).trim();
                if (!orderAttemptsMap[cleanId]) {
                    orderAttemptsMap[cleanId] = [];
                }
                orderAttemptsMap[cleanId].push({
                    run: run,
                    order: o,
                    isUnc: isUnc,
                    isPart: isPart,
                    responsibility: resp,
                    reason: isUnc ? (reasons[o.id] || reasons[String(o.id)] || 'Nincs indok') : (isPart ? 'Részleges átvétel' : 'Sikeres'),
                    comment: isPart ? ((partialOrders[o.id] || partialOrders[String(o.id)]).comment || '') : ''
                });
            });
        });

        const csvRows = [];
        const headers = [
            "Rendelésszám",
            "Vevő Neve",
            "Kísérlet száma",
            "Összes kísérlet",
            "Dátum",
            "Szállító Cég",
            "Szállító Neve",
            "Eredmény",
            "Felelősség",
            "Utánvét összeg (Ft)",
            "Megjegyzés / Sikertelenség oka"
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

        for (const orderId in orderAttemptsMap) {
            const attempts = orderAttemptsMap[orderId];
            const isDuplicate = attempts.length > 1;

            attempts.forEach((att, index) => {
                let shouldInclude = false;

                if (selectedAuditType === 'all') {
                    shouldInclude = att.isUnc || att.isPart || isDuplicate;
                } else if (selectedAuditType === 'failed_carrier') {
                    shouldInclude = att.isUnc && att.responsibility === 'szallito';
                } else if (selectedAuditType === 'failed_buyer') {
                    shouldInclude = att.isUnc && att.responsibility !== 'szallito';
                } else if (selectedAuditType === 'duplicates') {
                    shouldInclude = isDuplicate;
                } else if (selectedAuditType === 'partial') {
                    shouldInclude = att.isPart;
                }

                if (shouldInclude) {
                    let resultText = "Sikeres kézbesítés";
                    if (att.isUnc) {
                        resultText = "Nem lett átadva (kiesett)";
                    } else if (att.isPart) {
                        resultText = "Részleges átvétel";
                    }

                    let respText = "-";
                    if (att.isUnc) {
                        respText = att.responsibility === 'szallito' ? "Szállító" : "Vevő / Egyéb";
                    }

                    csvRows.push([
                        clean(orderId),
                        clean(att.order.shippingName || "-"),
                        index + 1,
                        attempts.length,
                        clean(att.run.date),
                        clean(att.run.company || "-"),
                        clean(att.run.courier),
                        clean(resultText),
                        clean(respText),
                        att.order.codAmount || 0,
                        clean(att.reason + (att.comment ? ` (${att.comment})` : ""))
                    ].join(";"));
                }
            });
        }

        if (csvRows.length <= 1) {
            CustomDialog.alert('Nincs exportálható audit adat a jelenlegi szűréssel!', 'Figyelmeztetés', 'warning');
            return;
        }

        const csvContent = csvRows.join("\r\n");

        // Download UTF-8 without BOM as requested by PannonXP/Carrier IT teams
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        link.setAttribute('download', `szamla_audit_${selectedCompany || 'osszes'}_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
