// js/views/accountingExportModal.js
// Elszámolás Exportálási Beállítások Modál
// Lehetővé teszi a szállítócégek, az időszak és a kintlévőség/rendezett státusz kiválasztását az Excel generálás előtt.

import { ExporterService } from '../services/exporter.js';
import { getRunPaymentTotals } from '../utils/paymentUtils.js';

export const AccountingExportModal = {
    show: function(allRuns, defaultFilters = {}) {
        if (!allRuns || allRuns.length === 0) {
            alert("Nincs elérhető elszámolási adat!");
            return;
        }

        // Korábbi modál eltávolítása, ha még létezik
        const existing = document.getElementById('accounting-export-modal-overlay');
        if (existing) existing.remove();

        // 1. Összes egyedi szállítócég kigyűjtése az adatokból
        const companyCountMap = new Map();
        allRuns.forEach(r => {
            const comp = (r.company || "Egyéb").trim();
            companyCountMap.set(comp, (companyCountMap.get(comp) || 0) + (r.orders ? r.orders.length : 0));
        });
        const companies = Array.from(companyCountMap.keys()).sort((a, b) => a.localeCompare(b, 'hu'));

        // 2. Kezdő dátumok meghatározása
        const defaultStart = defaultFilters.startDate || '';
        const defaultEnd = defaultFilters.endDate || '';
        const defaultOnlyPending = defaultFilters.onlyPending === true;

        const overlay = document.createElement('div');
        overlay.id = 'accounting-export-modal-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,.65);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;animation:fadeIn .2s ease;';

        overlay.innerHTML = `
        <div style="background:#fff;border-radius:18px;max-width:580px;width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,.3);overflow:hidden;font-family:inherit;">
            
            <!-- Fejléc -->
            <div style="padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;">
                <div>
                    <h3 style="margin:0;font-size:16px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;">
                        <i class="ph-bold ph-file-xls" style="color:#10b981;font-size:20px;"></i>
                        Elszámolás Exportálása (Excel)
                    </h3>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">
                        Válaszd ki a szállítócégeket és a szűrési feltételeket a munkafüzethez.
                    </div>
                </div>
                <button type="button" id="aem-close" style="background:none;border:none;color:#64748b;font-size:20px;cursor:pointer;padding:4px;border-radius:8px;line-height:1;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='none'">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>

            <!-- Törzs -->
            <div style="padding:20px 24px;overflow-y:auto;display:flex;flex-direction:column;gap:18px;">
                
                <!-- 1. Dátumszűrés -->
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;">
                    <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
                        <span><i class="ph-bold ph-calendar" style="margin-right:4px;"></i>Kiszállítási időszak</span>
                        <div style="display:flex;gap:4px;">
                            <button type="button" id="aem-date-all" style="font-size:10.5px;padding:2px 8px;border-radius:4px;border:1px solid #cbd5e1;background:#fff;color:#475569;cursor:pointer;font-weight:600;">Mind</button>
                            <button type="button" id="aem-date-month" style="font-size:10.5px;padding:2px 8px;border-radius:4px;border:1px solid #cbd5e1;background:#fff;color:#475569;cursor:pointer;font-weight:600;">Ez a hónap</button>
                            <button type="button" id="aem-date-30" style="font-size:10.5px;padding:2px 8px;border-radius:4px;border:1px solid #cbd5e1;background:#fff;color:#475569;cursor:pointer;font-weight:600;">Elmúlt 30 nap</button>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div>
                            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Kezdő dátum</label>
                            <input type="date" id="aem-start-date" value="${defaultStart}" style="width:100%;box-sizing:border-box;padding:6px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:12px;font-family:inherit;">
                        </div>
                        <div>
                            <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:3px;">Záró dátum</label>
                            <input type="date" id="aem-end-date" value="${defaultEnd}" style="width:100%;box-sizing:border-box;padding:6px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:12px;font-family:inherit;">
                        </div>
                    </div>
                </div>

                <!-- 2. Szállítócégek kiválasztása -->
                <div>
                    <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
                        <span><i class="ph-bold ph-truck" style="margin-right:4px;"></i>Szállítócégek kiválasztása</span>
                        <div style="display:flex;gap:6px;">
                            <button type="button" id="aem-select-all-comp" style="font-size:11px;color:#2563eb;background:none;border:none;cursor:pointer;font-weight:700;padding:0;">Mindet kijelöl</button>
                            <span style="color:#cbd5e1;">·</span>
                            <button type="button" id="aem-deselect-all-comp" style="font-size:11px;color:#64748b;background:none;border:none;cursor:pointer;font-weight:600;padding:0;">Kijelölés törlése</button>
                        </div>
                    </div>
                    <div id="aem-companies-list" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:160px;overflow-y:auto;background:#f8fafc;padding:10px;border-radius:10px;border:1px solid #e2e8f0;">
                        ${companies.map(comp => {
                            const count = companyCountMap.get(comp) || 0;
                            return `
                            <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:#1e293b;cursor:pointer;background:#fff;padding:6px 10px;border-radius:6px;border:1px solid #e2e8f0;user-select:none;">
                                <input type="checkbox" class="aem-comp-cb" value="${comp}" checked style="accent-color:#10b981;cursor:pointer;width:15px;height:15px;">
                                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${comp}</span>
                                <span style="font-size:10.5px;color:#64748b;background:#f1f5f9;padding:1px 5px;border-radius:4px;">${count}</span>
                            </label>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- 3. Elszámolási státusz (kintlévőség vs. rendezett) -->
                <div>
                    <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px;">
                        <i class="ph-bold ph-hand-coins" style="margin-right:4px;"></i>Elszámolási státusz
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <label style="display:flex;align-items:start;gap:8px;padding:10px 12px;border-radius:10px;border:1.5px solid ${!defaultOnlyPending ? '#10b981' : '#e2e8f0'};background:${!defaultOnlyPending ? '#f0fdf4' : '#fff'};cursor:pointer;transition:all .15s;" class="aem-status-card" id="aem-card-all">
                            <input type="radio" name="aem-status-mode" value="all" ${!defaultOnlyPending ? 'checked' : ''} style="margin-top:2px;accent-color:#10b981;cursor:pointer;">
                            <div>
                                <div style="font-size:12.5px;font-weight:700;color:#0f172a;">Minden rendelés</div>
                                <div style="font-size:11px;color:#64748b;margin-top:2px;line-height:1.3;">A teljesen rendezett és a még függőben lévő fuvarok is szerepelnek az exportban.</div>
                            </div>
                        </label>
                        <label style="display:flex;align-items:start;gap:8px;padding:10px 12px;border-radius:10px;border:1.5px solid ${defaultOnlyPending ? '#10b981' : '#e2e8f0'};background:${defaultOnlyPending ? '#f0fdf4' : '#fff'};cursor:pointer;transition:all .15s;" class="aem-status-card" id="aem-card-pending">
                            <input type="radio" name="aem-status-mode" value="pending" ${defaultOnlyPending ? 'checked' : ''} style="margin-top:2px;accent-color:#10b981;cursor:pointer;">
                            <div>
                                <div style="font-size:12.5px;font-weight:700;color:#0f172a;">Csak kintlévőségek</div>
                                <div style="font-size:11px;color:#64748b;margin-top:2px;line-height:1.3;">Kizárólag azok a fuvarok, ahol még be nem fizetett KP vagy kártyás utalás hiányzik.</div>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- Élő szűrési összegző sáv -->
                <div id="aem-summary-banner" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;font-size:12px;font-weight:600;color:#1e40af;display:flex;align-items:center;justify-content:space-between;">
                    <span><i class="ph-bold ph-info" style="margin-right:4px;"></i>Kiválasztott fuvarok: <strong id="aem-matched-runs">0 db kör</strong> (<strong id="aem-matched-orders">0 db rendelés</strong>)</span>
                    <span id="aem-carrier-fault-badge" style="font-size:11px;color:#b91c1c;background:#fee2e2;padding:2px 6px;border-radius:4px;display:none;">0 db szállító hiba</span>
                </div>

            </div>

            <!-- Lábléc -->
            <div style="padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:flex-end;gap:10px;background:#f8fafc;">
                <button type="button" id="aem-cancel" style="height:36px;padding:0 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#475569;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">
                    Mégse
                </button>
                <button type="button" id="aem-download" style="height:36px;padding:0 18px;border-radius:8px;border:none;background:#10b981;color:#fff;font-size:12.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit;box-shadow:0 2px 4px rgba(16,185,129,.3);">
                    <i class="ph-bold ph-download-simple" style="font-size:14px;"></i>
                    Excel Letöltése (.xlsx)
                </button>
            </div>

        </div>
        `;

        document.body.appendChild(overlay);

        // Eseménykezelők és logika
        const startDateInput = overlay.querySelector('#aem-start-date');
        const endDateInput = overlay.querySelector('#aem-end-date');
        const compCheckboxes = overlay.querySelectorAll('.aem-comp-cb');
        const statusRadios = overlay.querySelectorAll('input[name="aem-status-mode"]');
        const cardAll = overlay.querySelector('#aem-card-all');
        const cardPending = overlay.querySelector('#aem-card-pending');
        const matchedRunsEl = overlay.querySelector('#aem-matched-runs');
        const matchedOrdersEl = overlay.querySelector('#aem-matched-orders');
        const carrierFaultBadge = overlay.querySelector('#aem-carrier-fault-badge');
        const downloadBtn = overlay.querySelector('#aem-download');

        const updateStatusCardStyles = () => {
            const isPendingSelected = overlay.querySelector('input[name="aem-status-mode"]:checked')?.value === 'pending';
            if (isPendingSelected) {
                cardPending.style.borderColor = '#10b981';
                cardPending.style.background = '#f0fdf4';
                cardAll.style.borderColor = '#e2e8f0';
                cardAll.style.background = '#fff';
            } else {
                cardAll.style.borderColor = '#10b981';
                cardAll.style.background = '#f0fdf4';
                cardPending.style.borderColor = '#e2e8f0';
                cardPending.style.background = '#fff';
            }
        };

        const getSelectedCompanies = () => {
            const selected = new Set();
            compCheckboxes.forEach(cb => {
                if (cb.checked) selected.add(cb.value.trim().toLowerCase());
            });
            return selected;
        };

        const filterRuns = () => {
            const sDate = startDateInput.value ? new Date(startDateInput.value) : null;
            if (sDate) sDate.setHours(0, 0, 0, 0);
            const eDate = endDateInput.value ? new Date(endDateInput.value) : null;
            if (eDate) eDate.setHours(23, 59, 59, 999);

            const selectedComps = getSelectedCompanies();
            const onlyPending = overlay.querySelector('input[name="aem-status-mode"]:checked')?.value === 'pending';

            return allRuns.filter(r => {
                // 1. Cég szűrés
                const compName = (r.company || "Egyéb").trim().toLowerCase();
                if (!selectedComps.has(compName)) return false;

                // 2. Dátum szűrés
                const rDateStr = r.date || r.originalDate;
                if (rDateStr) {
                    const cleanDate = rDateStr.replace(/[.\s]/g, '-').replace(/-+/g, '-').replace(/-$/, '');
                    const d = new Date(cleanDate);
                    if (!isNaN(d.getTime())) {
                        d.setHours(12, 0, 0, 0);
                        if (sDate && d < sDate) return false;
                        if (eDate && d > eDate) return false;
                    }
                }

                // 3. Függő / kintlévőség szűrés
                if (onlyPending) {
                    const totals = getRunPaymentTotals(r);
                    return totals.hasPending || !totals.isFullySettled;
                }

                return true;
            });
        };

        const updateLiveSummary = () => {
            updateStatusCardStyles();
            const matched = filterRuns();
            let totalOrders = 0;
            let carrierFaults = 0;

            matched.forEach(r => {
                const uncollected = new Set((r.uncollectedOrderIds || []).map(String));
                const respMap = r.uncollectedResponsibility || {};
                (r.orders || []).forEach(o => {
                    totalOrders++;
                    if (uncollected.has(String(o.id)) && respMap[o.id] === 'szallito') {
                        carrierFaults++;
                    }
                });
            });

            matchedRunsEl.textContent = `${matched.length} db kör`;
            matchedOrdersEl.textContent = `${totalOrders} db fuvar`;

            if (carrierFaults > 0) {
                carrierFaultBadge.textContent = `${carrierFaults} db szállító hiba (0 Ft)`;
                carrierFaultBadge.style.display = 'inline-block';
            } else {
                carrierFaultBadge.style.display = 'none';
            }

            downloadBtn.disabled = matched.length === 0;
            downloadBtn.style.opacity = matched.length === 0 ? '0.5' : '1';
            downloadBtn.style.cursor = matched.length === 0 ? 'not-allowed' : 'pointer';
        };

        // Események kötése
        startDateInput.addEventListener('change', updateLiveSummary);
        endDateInput.addEventListener('change', updateLiveSummary);
        compCheckboxes.forEach(cb => cb.addEventListener('change', updateLiveSummary));
        statusRadios.forEach(radio => radio.addEventListener('change', updateLiveSummary));

        // Gyorsgombok
        overlay.querySelector('#aem-date-all').addEventListener('click', () => {
            startDateInput.value = '';
            endDateInput.value = '';
            updateLiveSummary();
        });
        overlay.querySelector('#aem-date-month').addEventListener('click', () => {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            startDateInput.value = `${y}-${m}-01`;
            const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
            endDateInput.value = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
            updateLiveSummary();
        });
        overlay.querySelector('#aem-date-30').addEventListener('click', () => {
            const now = new Date();
            endDateInput.value = now.toISOString().substring(0, 10);
            const past = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            startDateInput.value = past.toISOString().substring(0, 10);
            updateLiveSummary();
        });

        overlay.querySelector('#aem-select-all-comp').addEventListener('click', () => {
            compCheckboxes.forEach(cb => cb.checked = true);
            updateLiveSummary();
        });
        overlay.querySelector('#aem-deselect-all-comp').addEventListener('click', () => {
            compCheckboxes.forEach(cb => cb.checked = false);
            updateLiveSummary();
        });

        // Bezárás
        const closeModal = () => overlay.remove();
        overlay.querySelector('#aem-close').addEventListener('click', closeModal);
        overlay.querySelector('#aem-cancel').addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Letöltés indítása
        downloadBtn.addEventListener('click', async () => {
            const selectedRuns = filterRuns();
            if (selectedRuns.length === 0) {
                alert("Nincs a megadott szűrésnek megfelelő fuvar!");
                return;
            }

            const originalBtnHtml = downloadBtn.innerHTML;
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = `<i class="ph-bold ph-spinner ph-spin" style="font-size:14px;"></i> Generálás...`;

            try {
                const onlyPending = overlay.querySelector('input[name="aem-status-mode"]:checked')?.value === 'pending';
                await ExporterService.exportAccountingToExcel(selectedRuns, onlyPending);
                closeModal();
            } catch (err) {
                console.error("Exportálási hiba:", err);
                alert("Hiba történt az Excel generálása közben!");
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = originalBtnHtml;
            }
        });

        // Kezdeti állapot kiszámítása
        updateLiveSummary();
    }
};
