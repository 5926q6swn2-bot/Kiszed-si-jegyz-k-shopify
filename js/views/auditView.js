/**
 * Kiszállítás és Fuvar Ellenőrzés Nézet (AuditView)
 * 
 * Fő feladata:
 * - Az összes szállításból levonja a szállító hibájából meghiúsult rendeléseket (Összes - Szállító hiba = Elismert szállítás)
 * - Tételesen és kiemelten megjeleníti a levont rendeléseket és azok pontos indoklását (kommentjét)
 * - Lehetőséget biztosít a felelősség egykattintásos módosítására (ha utólag derül ki a valós felelős)
 * - Részletes CSV export a szállítócéggel való egyeztetéshez
 */

import { HistoryManager } from '../services/history.js';
import { CustomDialog } from '../utils/dialog.js';

function parseDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
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

export const AuditView = {
    container: null,
    headerBar: null,
    formulaContainer: null,
    resultsContainer: null,
    allRuns: [],
    excludedCarrierFaultOrders: [],
    currentStats: null,

    async render(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = '14px';
        this.container.style.padding = '8px 0';

        // 1. Fejléc sáv (Cím és CSV Export)
        this.renderHeader();

        // 2. Szállítási Kalkuláció Hero Kártya (Összes - Szállító hiba = Elismert)
        this.formulaContainer = document.createElement('div');
        this.formulaContainer.className = 'audit-formula-container';
        this.container.appendChild(this.formulaContainer);

        // 3. Levont (szállító hibás) rendelések tételes listája
        this.resultsContainer = document.createElement('div');
        this.resultsContainer.className = 'audit-results-container';
        this.resultsContainer.style.flex = '1';
        this.container.appendChild(this.resultsContainer);

        // Adatok kiszámítása és megjelenítése
        await this.updateAudit();
    },

    renderHeader() {
        this.headerBar = document.createElement('div');
        this.headerBar.className = 'audit-header-bar no-print';
        this.headerBar.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:#ffffff; padding:10px 16px; border-radius:10px; border:1px solid #e2e8f0; gap:12px; flex-wrap:wrap; box-shadow:0 1px 3px rgba(0,0,0,0.02);';

        const infoText = document.createElement('div');
        infoText.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <i class="ph-bold ph-calculator" style="font-size:18px; color:#2563eb;"></i>
                <span style="font-size:14px; font-weight:800; color:#0f172a; letter-spacing:-0.2px;">Szállítások és Fuvarok Ellenőrzése</span>
                <span style="font-size:12px; color:#64748b; font-weight:500;">(Szállítói hibák levonása és elszámolható fuvarok egyeztetése)</span>
            </div>
        `;
        this.headerBar.appendChild(infoText);

        const btnExport = document.createElement('button');
        btnExport.type = 'button';
        btnExport.id = 'audit-btn-export-csv';
        btnExport.style.cssText = 'height:32px; padding:0 14px; border-radius:7px; border:1.5px solid #10b981; background:#10b981; color:#fff; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; display:inline-flex; align-items:center; gap:5px; transition:all .15s;';
        btnExport.innerHTML = '<i class="ph-bold ph-download-simple" style="font-size:14px;"></i> Levont tételek exportálása (CSV)';
        btnExport.addEventListener('click', () => this.exportExcludedOrdersToCsv());
        this.headerBar.appendChild(btnExport);

        this.container.appendChild(this.headerBar);
    },

    renderFormulaBanner(stats) {
        if (!this.formulaContainer) return;
        this.formulaContainer.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'background:linear-gradient(135deg, #0f172a, #1e293b); border-radius:12px; padding:16px 20px; color:#ffffff; box-shadow:0 4px 12px rgba(15,23,42,0.12); display:flex; flex-direction:column; gap:12px;';

        const calculationRow = `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                
                <!-- 1. Összes indított szállítás -->
                <div style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:12px 18px; flex:1; min-width:180px;">
                    <div style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.4px; display:flex; align-items:center; gap:6px;">
                        <i class="ph-bold ph-truck" style="color:#38bdf8;"></i> Összes szállítás
                    </div>
                    <div style="font-size:24px; font-weight:900; color:#f8fafc; margin-top:2px;">
                        ${stats.totalFuvar} <span style="font-size:14px; font-weight:600; color:#cbd5e1;">fuvar</span>
                    </div>
                    <div style="font-size:11px; color:#94a3b8; margin-top:1px;">
                        Autókba kiadott összes csomag
                    </div>
                </div>

                <!-- Mínusz műveleti jel -->
                <div style="font-size:24px; font-weight:900; color:#f87171; display:flex; align-items:center; justify-content:center; width:28px;">
                    <i class="ph-bold ph-minus"></i>
                </div>

                <!-- 2. Szállító hibái (levonás) -->
                <div style="background:rgba(239, 68, 68, 0.12); border:1px solid rgba(239, 68, 68, 0.35); border-radius:10px; padding:12px 18px; flex:1; min-width:180px;">
                    <div style="font-size:11px; font-weight:700; color:#fca5a5; text-transform:uppercase; letter-spacing:0.4px; display:flex; align-items:center; gap:6px;">
                        <i class="ph-bold ph-warning-octagon" style="color:#f87171;"></i> Szállító hibája (levonás)
                    </div>
                    <div style="font-size:24px; font-weight:900; color:#f87171; margin-top:2px;">
                        - ${stats.szallitoCount} <span style="font-size:14px; font-weight:600; color:#fca5a5;">fuvar</span>
                    </div>
                    <div style="font-size:11px; color:#fca5a5; margin-top:1px;">
                        Nem kifizetendő, meghiúsult tételek
                    </div>
                </div>

                <!-- Egyenlőségjel -->
                <div style="font-size:24px; font-weight:900; color:#38bdf8; display:flex; align-items:center; justify-content:center; width:28px;">
                    <i class="ph-bold ph-equals"></i>
                </div>

                <!-- 3. Elismert / Kifizetendő szállítások -->
                <div style="background:linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.28)); border:1.5px solid #10b981; border-radius:10px; padding:12px 20px; flex:1.2; min-width:210px; box-shadow:0 2px 8px rgba(16, 185, 129, 0.2);">
                    <div style="font-size:11.5px; font-weight:800; color:#6ee7b7; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:6px;">
                        <i class="ph-bold ph-check-circle" style="color:#34d399;"></i> Elismert szállítások száma
                    </div>
                    <div style="font-size:26px; font-weight:900; color:#ffffff; margin-top:2px;">
                        = ${stats.netPayableFuvar} <span style="font-size:15px; font-weight:700; color:#a7f3d0;">szállítás</span>
                    </div>
                    <div style="font-size:11px; color:#a7f3d0; margin-top:1px; font-weight:600;">
                        Szállítócég felé kiszámlázható / elszámolható
                    </div>
                </div>

            </div>
        `;

        const subInfoRow = `
            <div style="display:flex; align-items:center; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px; font-size:11.5px; color:#cbd5e1; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                    <span>Egyedi rendelések száma: <strong style="color:#fff;">${stats.uniqueOrdersCount} db</strong></span>
                    <span style="color:rgba(255,255,255,0.3);">|</span>
                    <span>Többszöri fuvarok többlete: <strong style="color:#fbbf24;">${stats.multiFuvarCount} db</strong></span>
                </div>
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <span style="color:#94a3b8;">Egyéb kiesések (nem szállító hiba):</span>
                    <span style="background:rgba(239, 68, 68, 0.2); border:1px solid rgba(239, 68, 68, 0.4); padding:2px 8px; border-radius:5px; font-size:10.5px; color:#fca5a5;">Saját hiba: <strong>${stats.mienkCount} db</strong></span>
                    <span style="background:rgba(148, 163, 184, 0.2); border:1px solid rgba(148, 163, 184, 0.4); padding:2px 8px; border-radius:5px; font-size:10.5px; color:#e2e8f0;">Vevő / Egyéb: <strong>${stats.vevoCount} db</strong></span>
                </div>
            </div>
        `;

        wrapper.innerHTML = calculationRow + subInfoRow;
        this.formulaContainer.appendChild(wrapper);
    },

    async updateAudit() {
        if (!this.resultsContainer) return;
        this.resultsContainer.innerHTML = '<p style="color:#94a3b8; font-size:13px; text-align:center; padding:30px;">Szállítási adatok kalkulálása...</p>';
        
        this.allRuns = await HistoryManager.getAllRuns();

        // 1. Globális szűrők olvasása a fejlécből
        const startVal = document.getElementById('history-date-start')?.value || '';
        const endVal = document.getElementById('history-date-end')?.value || '';
        const selectedCompany = document.getElementById('history-company-filter')?.value || '';
        const searchVal = document.getElementById('history-search-input')?.value.toLowerCase().trim() || '';

        const startD = startVal ? new Date(startVal + 'T00:00:00') : null;
        const endD   = endVal   ? new Date(endVal   + 'T23:59:59') : null;

        // Szűrt terítések meghatározása
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

        // 2. Fuvarszám és szállítások összesítése a szűrt terítésekben
        let totalFuvar = 0;
        const filteredOrderIdsSet = new Set();
        const excludedCarrierFaultOrders = [];

        let szallitoCount = 0;
        let mienkCount = 0;
        let vevoCount = 0;

        filteredRuns.forEach(r => {
            const rUnc = new Set((r.uncollectedOrderIds || []).map(String));
            const rPart = r.partialOrders || {};
            const runResponsibility = r.uncollectedResponsibility || {};
            const runReasons = r.uncollectedReasons || {};

            (r.orders || []).forEach(o => {
                if (!o || !o.id) return;
                totalFuvar++;
                const normId = String(o.id).trim();
                filteredOrderIdsSet.add(normId);

                const isUnc = rUnc.has(normId) || rUnc.has(String(o.id));
                const pInfo = rPart[o.id] || rPart[normId];
                const isPart = !isUnc && !!pInfo;
                const resp = runResponsibility[o.id] || runResponsibility[normId] || 'vevo';

                if (isUnc || isPart) {
                    if (resp === 'szallito') {
                        szallitoCount++;
                        const comment = isUnc 
                            ? (runReasons[o.id] || runReasons[normId] || '')
                            : (pInfo ? pInfo.comment || '' : '');

                        excludedCarrierFaultOrders.push({
                            id: o.id,
                            orderIdStr: normId,
                            name: o.shippingName || o.customerName || '—',
                            city: o.city || '',
                            address: o.address || '',
                            phone: o.shippingPhone || o.phone || '',
                            isCOD: !!o.isCOD,
                            codAmount: o.isCOD ? (o.codAmount || 0) : 0,
                            runDate: r.date || '—',
                            company: r.company || '—',
                            courier: r.courier || '—',
                            docId: r.docId,
                            outcome: isUnc ? 'Kiesett' : 'Részleges',
                            comment: comment,
                            responsibility: 'szallito',
                            timestamp: r.timestamp || 0
                        });
                    } else if (resp === 'mienk') {
                        mienkCount++;
                    } else {
                        vevoCount++;
                    }
                }
            });
        });

        const uniqueOrdersCount = filteredOrderIdsSet.size;
        const multiFuvarCount = Math.max(0, totalFuvar - uniqueOrdersCount);
        const netPayableFuvar = Math.max(0, totalFuvar - szallitoCount);

        this.currentStats = {
            totalFuvar,
            uniqueOrdersCount,
            multiFuvarCount,
            szallitoCount,
            mienkCount,
            vevoCount,
            netPayableFuvar
        };

        this.excludedCarrierFaultOrders = excludedCarrierFaultOrders;

        // Formula banner kirajzolása
        this.renderFormulaBanner(this.currentStats);

        // Kereső szűrés és a levont rendelések kirajzolása
        this.filterAndRenderExcludedOrders(searchVal);
    },

    filterAndRenderExcludedOrders(searchVal) {
        let list = this.excludedCarrierFaultOrders;

        if (searchVal) {
            list = list.filter(o => {
                const idMatch = String(o.id || '').toLowerCase().includes(searchVal);
                const nameMatch = String(o.name || '').toLowerCase().includes(searchVal);
                const cityMatch = String(o.city || '').toLowerCase().includes(searchVal);
                const addrMatch = String(o.address || '').toLowerCase().includes(searchVal);
                const commentMatch = String(o.comment || '').toLowerCase().includes(searchVal);
                const courierMatch = String(o.courier || '').toLowerCase().includes(searchVal);
                const companyMatch = String(o.company || '').toLowerCase().includes(searchVal);
                return idMatch || nameMatch || cityMatch || addrMatch || commentMatch || courierMatch || companyMatch;
            });
        }

        // Rendezés: Legújabb fuvar legfelül
        list.sort((a, b) => b.runDate.localeCompare(a.runDate) || (b.timestamp - a.timestamp));

        this.renderExcludedOrdersList(list);
    },

    renderExcludedOrdersList(orders) {
        this.resultsContainer.innerHTML = '';

        const sectionHeader = document.createElement('div');
        sectionHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:0 2px;';
        sectionHeader.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:13px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.3px;">
                    Levont rendelések (Szállító hibái miatt nem beleszámolva):
                </span>
                <span style="font-size:12px; font-weight:800; color:#b91c1c; background:#fee2e2; border:1px solid #fca5a5; padding:1px 8px; border-radius:12px;">
                    ${orders.length} db
                </span>
            </div>
            <div style="font-size:11.5px; color:#64748b;">
                Kattints a felelős badge-re a módosításhoz
            </div>
        `;
        this.resultsContainer.appendChild(sectionHeader);

        if (orders.length === 0) {
            const emptyNotice = document.createElement('div');
            emptyNotice.style.cssText = 'text-align:center; padding:32px 20px; border:2px dashed #bbf7d0; border-radius:10px; background:#f0fdf4; color:#166534;';
            emptyNotice.innerHTML = `
                <i class="ph-bold ph-check-circle" style="font-size:26px; color:#16a34a; margin-bottom:6px; display:inline-block;"></i>
                <div style="font-size:14px; font-weight:800;">Nincsenek levonandó szállító hibás rendelések!</div>
                <div style="font-size:12px; color:#15803d; margin-top:2px;">A szűrt időszakban nem található olyan fuvar, ami a szállító hibája miatt esett volna ki.</div>
            `;
            this.resultsContainer.appendChild(emptyNotice);
            return;
        }

        const tableWrapper = document.createElement('div');
        tableWrapper.style.cssText = 'background:#ffffff; border:1px solid #fed7aa; border-radius:10px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.03); max-height:55vh; overflow-y:auto;';

        const listContainer = document.createElement('div');
        listContainer.style.cssText = 'display:flex; flex-direction:column; divide-y:1px solid #f1f5f9;';

        orders.forEach((o, idx) => {
            const row = document.createElement('div');
            row.style.cssText = `padding:12px 16px; border-bottom:1px solid #f1f5f9; background:${idx % 2 === 0 ? '#ffffff' : '#fafafa'}; display:flex; flex-direction:column; gap:8px; transition:background .15s;`;

            const topRow = `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:12px; font-weight:700; color:#94a3b8; width:22px;">${idx + 1}.</span>
                        <strong style="font-size:14.5px; color:#0f172a; letter-spacing:-0.2px;">${o.id}</strong>
                        <span style="font-size:13.5px; font-weight:700; color:#334155;">${o.name}</span>
                        ${(o.city || o.address) ? `<span style="font-size:11.5px; color:#64748b;"><i class="ph-bold ph-map-pin" style="margin-right:2px;"></i>${o.city}${o.city && o.address ? ', ' : ''}${o.address}</span>` : ''}
                    </div>

                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:11.5px; color:#475569; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:6px; padding:3px 8px;">
                            <strong>${o.runDate}</strong> · <strong>${o.company}</strong> (Futár: <strong>${o.courier}</strong>)
                        </span>

                        <span style="font-size:11px; font-weight:800; color:#b91c1c; background:#fee2e2; border:1px solid #fca5a5; border-radius:6px; padding:3px 8px;">
                            ${o.outcome}${o.codAmount > 0 ? ': -' + o.codAmount.toLocaleString('hu-HU') + ' Ft' : ''}
                        </span>
                    </div>
                </div>
            `;

            const commentRow = `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; background:#fff7ed; border-left:4px solid #f97316; border-radius:4px; padding:8px 12px; border-top:1px solid #ffedd5; border-right:1px solid #ffedd5; border-bottom:1px solid #ffedd5;">
                    <div style="display:flex; align-items:baseline; gap:6px; flex:1;">
                        <span style="font-size:11px; font-weight:800; color:#c2410c; text-transform:uppercase; letter-spacing:0.3px; white-space:nowrap;">
                            Kiesés indoklása:
                        </span>
                        <span style="font-size:12.5px; color:#7c2d12; font-style:italic; font-weight:600;">
                            „${o.comment ? o.comment : 'Nincs szöveges indoklás rögzítve!'}”
                        </span>
                    </div>

                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:10.5px; font-weight:700; color:#9a3412; text-transform:uppercase;">Felelős:</span>
                        <button type="button" class="resp-pill szallito" data-doc-id="${o.docId}" data-order-id="${o.id}" data-resp="szallito" style="cursor:pointer; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; font-size:11px; font-weight:800; border-radius:6px; transition:all .15s; background:#ffedd5; color:#c2410c; border:1px solid #fed7aa; font-family:inherit;" title="Kattints a felelős módosításához (körbeforgás: Szállító -> Vevő -> Saját)">
                            <i class="ph-bold ph-truck"></i> Szállító hibája
                        </button>
                    </div>
                </div>
            `;

            row.innerHTML = topRow + commentRow;
            listContainer.appendChild(row);
        });

        tableWrapper.appendChild(listContainer);
        this.resultsContainer.appendChild(tableWrapper);

        // Felelősség váltás eseménykezelője
        this.bindEvents(tableWrapper);
    },

    bindEvents(container) {
        container.querySelectorAll('.resp-pill').forEach(pill => {
            pill.addEventListener('click', async (e) => {
                e.stopPropagation();
                const docId = pill.getAttribute('data-doc-id');
                const orderId = pill.getAttribute('data-order-id');
                const currentResp = pill.getAttribute('data-resp');
                
                // Körbeforgatás: szallito -> vevo -> mienk -> szallito
                let nextResp = 'vevo';
                let nextLabel = 'Vevő / Egyéb';

                if (currentResp === 'szallito') {
                    nextResp = 'vevo';
                    nextLabel = 'Vevő / Egyéb';
                } else if (currentResp === 'vevo') {
                    nextResp = 'mienk';
                    nextLabel = 'Saját hiba';
                } else {
                    nextResp = 'szallito';
                    nextLabel = 'Szállító hibája';
                }

                pill.innerHTML = `<i class="ph-bold ph-spinner" style="animation:spin 1s linear infinite;"></i> Mentés...`;

                const ok = await HistoryManager.updateResponsibilityInFirestore(docId, orderId, nextResp);
                if (ok) {
                    await this.updateAudit(); // Újraszámolja a levonást és frissíti a felületet
                } else {
                    await CustomDialog.alert("Hiba történt a felelősség módosításakor.", "Hiba", "error");
                    await this.updateAudit();
                }
            });
        });
    },

    exportExcludedOrdersToCsv() {
        if (!this.excludedCarrierFaultOrders || this.excludedCarrierFaultOrders.length === 0) {
            CustomDialog.alert('Nincs levont szállító hibás rendelés az adott szűrésben!', 'Információ', 'info');
            return;
        }

        const csvRows = [];
        const headers = [
            "Rendelésszám",
            "Vevő Neve",
            "Település",
            "Cím",
            "Telefonszám",
            "Kiszállítás Napja",
            "Szállítócég",
            "Futár Neve",
            "Eredmény",
            "Kiesett Összeg (Ft)",
            "Kiesés Indoklása (Komment)",
            "Felelősség",
            "Elszámolás Státusza"
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

        this.excludedCarrierFaultOrders.forEach(o => {
            csvRows.push([
                clean(o.id),
                clean(o.name),
                clean(o.city),
                clean(o.address),
                clean(o.phone),
                clean(o.runDate),
                clean(o.company),
                clean(o.courier),
                clean(o.outcome),
                o.codAmount,
                clean(o.comment),
                "Szállító hibája",
                "Levonva a szállításokból"
            ].join(";"));
        });

        const csvContent = "\uFEFF" + csvRows.join("\r\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        link.setAttribute('download', `levont_szallito_hibak_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
