// js/views/selaExportModal.js
// Szállítói Export (Sela) Interaktív Előnézet és Szerkesztő Modal
// Lehetővé teszi a 12 oszlop áttekintését, sorok törlését, cellák szerkesztését
// és a függő utalások / proforma utánvétek szigorú ellenőrzését a CSV letöltése előtt.

import { ExporterService } from '../services/exporter.js';
import { ShopifyApiService } from '../services/shopifyApiService.js';
import { Store } from '../store/state.js';
import { CustomDialog } from '../utils/dialog.js';
import { SelaWeightService } from '../services/selaWeightService.js';
import { SelaMissingWeightsModal } from './selaMissingWeightsModal.js';
import { ensureSelaModalStyles } from './selaModalStyles.js';

export const SelaExportModal = {
    show: async function(selectedOrders, onCompleteCallback) {
        if (!selectedOrders || selectedOrders.length === 0) {
            CustomDialog.alert('Nincs exportálható rendelés kijelölve!', 'Figyelem', 'warning');
            return;
        }

        // Stílusok előzetes biztosítása a DOM-ban
        ensureSelaModalStyles();

        // 0. Terméksúlyok inicializálása és hiányzó súlyok ellenőrzése
        await SelaWeightService.initializeProductWeights();
        const unknownItems = SelaWeightService.findUnknownItemsInOrders(selectedOrders);
        if (unknownItems.length > 0) {
            SelaMissingWeightsModal.show(
                unknownItems,
                () => {
                    // Súlyok sikeres rögzítése után automatikusan megnyitjuk az export modalt
                    SelaExportModal.show(selectedOrders, onCompleteCallback);
                },
                () => {
                    console.log('[SelaExportModal] Új terméksúlyok megadása megszakítva.');
                }
            );
            return;
        }

        // 1. 5 munkanapos kézbesítési határidő és feladási nap kalkulációja (10:30 levágási idővel)
        const now = new Date();
        const selaDates = ExporterService.calculateSelaDates 
            ? ExporterService.calculateSelaDates(now)
            : {
                dispatchDate: new Date().toISOString().substring(0, 10).replace(/-/g, '.'),
                deadlineDate: new Date().toISOString().substring(0, 10).replace(/-/g, '.'),
                isWorkdayBeforeCutoff: true
            };
        const defaultDispatchDate = selaDates.dispatchDate;
        const defaultDeadline = selaDates.deadlineDate;
        const isWorkdayBeforeCutoff = selaDates.isWorkdayBeforeCutoff;

        const initialRows = selectedOrders.map(o => ExporterService.prepareSelaRowData(o, {}, null, now));

        // Van-e díjbekérős vagy függő utalásos rendelés a listában?
        const hasProformaOrders = initialRows.some(r => r.isProforma);
        const proformaCount = initialRows.filter(r => r.isProforma).length;
        const hasPendingBankOrders = initialRows.some(r => r.isPendingBankTransfer);
        const pendingBankCount = initialRows.filter(r => r.isPendingBankTransfer).length;

        // Összsúly kezdeti kalkulációja
        const initialTotalWeight = Math.round(initialRows.reduce((sum, r) => sum + (parseFloat(r.col13_weight) || 0), 0) * 100) / 100;

        // 2. Régi modal eltávolítása, ha létezne
        const existingModal = document.getElementById('sela-export-modal-overlay');
        if (existingModal) existingModal.remove();

        // 3. Modal HTML összeállítása
        const overlay = document.createElement('div');
        overlay.id = 'sela-export-modal-overlay';
        overlay.className = 'sela-modal-overlay';

        // Táblázat sorainak generálása
        const tableRowsHtml = initialRows.map((r, idx) => {
            const isProformaRow = r.isProforma;
            const isBankPending = r.isPendingBankTransfer;
            const needsManual = r.needsManualCod;

            const proformaBadge = isProformaRow 
                ? `<span class="sela-proforma-badge" title="Díjbekérős rendelés (Notes-ban szereplő új utánvét)">⏳ Díjbek.ki</span>` 
                : '';

            const bankBadge = isBankPending 
                ? `<span class="sela-bank-badge" title="Függő átutalás! A számlára még nem érkezett meg az utalás!">⚠️ Függő Utalás</span>` 
                : '';

            return `
                <tr class="sela-row ${isProformaRow ? 'sela-row-proforma' : ''} ${isBankPending ? 'sela-row-bank-pending' : ''}" data-idx="${idx}" data-order-id="${r.orderId}">
                    <td class="sela-col-idx">${idx + 1}.</td>
                    <td style="text-align:center;">
                        <button type="button" class="sela-btn-delete-row" title="Rendelés kihagyása az exportból" data-order-id="${r.orderId}">
                            <i class="ph ph-trash"></i>
                        </button>
                    </td>
                    <td><input type="text" class="sela-cell-input col-date" data-field="col1_date" value="${r.col1_date}" style="width: 82px; text-align: center; font-weight: 600;" title="Indítás / feladás dátuma (aznap ha 10:30-ig, egyébként az első munkanap)"></td>
                    <td>
                        <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
                            <input type="text" class="sela-cell-input col-order" data-field="col2_orderId" value="${r.col2_orderId}" style="width: 65px; font-weight:700;">
                            ${proformaBadge}
                            ${bankBadge}
                        </div>
                    </td>
                    <td><input type="text" class="sela-cell-input col-zip" data-field="col3_zip" value="${r.col3_zip}" style="width: 50px;"></td>
                    <td><input type="text" class="sela-cell-input col-city" data-field="col4_city" value="${r.col4_city}" style="width: 105px;"></td>
                    <td><input type="text" class="sela-cell-input col-street" data-field="col5_street" value="${r.col5_street}" style="width: 180px;" title="${r.col5_street}"></td>
                    <td><input type="text" class="sela-cell-input col-phone" data-field="col6_phone" value="${r.col6_phone}" style="width: 165px;" title="${r.col6_phone}"></td>
                    <td><input type="text" class="sela-cell-input col-name" data-field="col7_customerName" value="${r.col7_customerName}" style="width: 135px;" title="${r.col7_customerName}"></td>
                    <td><input type="number" class="sela-cell-input col-num" data-field="col8_pvcSpcFloorQty" value="${r.col8_pvcSpcFloorQty}" min="0" style="width: 48px; text-align:center;"></td>
                    <td><input type="number" class="sela-cell-input col-num" data-field="col9_acousticQty" value="${r.col9_acousticQty}" min="0" style="width: 48px; text-align:center;"></td>
                    <td><input type="number" class="sela-cell-input col-num" data-field="col10_adhesivesQty" value="${r.col10_adhesivesQty}" min="0" style="width: 48px; text-align:center;"></td>
                    <td><input type="number" class="sela-cell-input col-num" data-field="col11_profilesQty" value="${r.col11_profilesQty}" min="0" style="width: 48px; text-align:center;"></td>
                    <td>
                        <div style="position:relative; display:flex; align-items:center;">
                            <input type="text" 
                                   class="sela-cell-input col-cod ${needsManual ? 'sela-input-required-cod' : (isProformaRow ? 'sela-input-proforma' : '')}" 
                                   data-field="col12_codAndTapadohid" 
                                   data-is-proforma="${isProformaRow}"
                                   data-needs-manual="${needsManual}"
                                   value="${r.col12_codAndTapadohid}" 
                                   placeholder="${needsManual ? 'Írd be a pontos utánvétet!' : ''}"
                                   style="width: 175px; font-weight:600;" 
                                   title="${r.col12_codAndTapadohid}">
                        </div>
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                        <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 3px;">
                            <input type="number" 
                                   step="0.01" 
                                   min="0" 
                                   class="sela-cell-input col-weight" 
                                   data-field="col13_weight" 
                                   value="${r.col13_weight}" 
                                   style="width: 65px; text-align: right; font-weight:700; color: #0284c7;" 
                                   title="${r.weightBreakdownText ? r.weightBreakdownText.replace(/"/g, '&quot;') : `Kalkulált súly: ${r.col13_weight} kg`}">
                            <span style="font-size:11px; color:#64748b; font-weight:600;">kg</span>
                        </div>
                    </td>
                    <td style="text-align: center; white-space: nowrap;">
                        <input type="text" 
                               class="sela-cell-input col-deadline" 
                               data-field="col14_deadline" 
                               value="${r.col14_deadline || r.deadlineDate || defaultDeadline}" 
                               style="width: 85px; text-align: center; font-weight: 700; color: #15803d;" 
                               title="5 munkanapos legkésőbbi kézbesítési határidő">
                    </td>
                </tr>
            `;
        }).join('');

        overlay.innerHTML = `
            <div class="sela-modal-container">
                <!-- Fejléc -->
                <div class="sela-modal-header">
                    <div class="sela-header-title-group">
                        <div class="sela-header-icon"><i class="ph ph-truck"></i></div>
                        <div>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <h2 class="sela-modal-title">Szállítói Export (Sela) - Ellenőrzés és Szerkesztés</h2>
                                <span class="sela-order-count-badge" id="sela-header-count">${initialRows.length} db rendelés</span>
                            </div>
                            <p class="sela-modal-subtitle">A letöltés előtt bármelyik mezőt átírhatod, vagy a kuka ikonnal kihagyhatsz rendeléseket.</p>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button type="button" class="btn btn-secondary sela-btn-manage-weights" id="btn-sela-manage-weights" style="display:flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600; padding:5px 11px; border-radius:6px; background:#f0f9ff; border:1px solid #bae6fd; color:#0369a1; cursor:pointer;" title="Rögzített terméksúlyok megtekintése és módosítása">
                            <i class="ph ph-sliders" style="font-size:14px;"></i>
                            <span>Terméksúlyok kezelése</span>
                        </button>
                        <button type="button" class="sela-modal-close" id="btn-sela-close">&times;</button>
                    </div>
                </div>

                <!-- Figyelmeztető sávok -->
                ${hasPendingBankOrders ? `
                    <div class="sela-bank-alert">
                        <i class="ph ph-warning-circle" style="font-size:20px; color:#c2410c; flex-shrink:0;"></i>
                        <div>
                            <strong>Függő banki átutalás felismerve (${pendingBankCount} db):</strong>
                            Ezeknél a rendeléseknél még <strong>nem érkezett meg az utalás</strong>! Kérlek ellenőrizd őket, vagy a kuka (🗑️) ikonnal töröld a listából, hogy ne küldjük ki fizetés nélkül!
                        </div>
                    </div>
                ` : ''}

                ${hasProformaOrders ? `
                    <div class="sela-proforma-alert">
                        <i class="ph ph-warning-octagon" style="font-size:20px; color:#d97706; flex-shrink:0;"></i>
                        <div>
                            <strong>Díjbekérős rendelés (${proformaCount} db):</strong>
                            Ha a Notes-ból egyértelmű az előleg utáni összeg, automatikusan bekerült. Ha nem egyértelmű vagy hiányzik, az utánvét megadása <strong>kötelező az exportálás előtt</strong> (pirossal kiemelve)!
                        </div>
                    </div>
                ` : ''}

                <!-- 5 Munkanapos Kézbesítési Határidő Sáv -->
                <div class="sela-deadline-bar" style="background: #f0fdf4; border-bottom: 1px solid #bbf7d0; padding: 8px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #166534;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 28px; height: 28px; border-radius: 6px; background: #dcfce7; color: #15803d; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
                            <i class="ph ph-calendar-check"></i>
                        </div>
                        <div>
                            <div>
                                <strong>Feladás (1. oszlop):</strong> 
                                <span style="color: #15803d; font-weight: 600;">${defaultDispatchDate}</span>
                                <span style="color: #64748b; font-size: 11px;">(${isWorkdayBeforeCutoff ? '✅ Mai nap, 10:30-ig indítva' : '⏰ 10:30 után / hétvége / munkaszünet: első munkanap'})</span>
                                <span style="margin: 0 8px; color: #86efac;">|</span>
                                <strong>5 munkanapos kézbesítés (utolsó oszlop):</strong>
                                <strong style="color: #047857; font-size: 12.5px;">${defaultDeadline}</strong>
                            </div>
                            <div style="font-size: 10.5px; color: #166534; margin-top: 2px;">
                                ℹ️ Munkaszüneti napok, mozgóünnepek és hídnapok (pl. csütörtöki ünnepnél a péntek is pihenőnap) automatikusan figyelembe véve.
                            </div>
                        </div>
                    </div>
                    <div style="display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <div style="display: inline-flex; align-items: center; gap: 5px;">
                            <span style="font-size: 11px; font-weight: 600; color: #166534;">Indítás átírás:</span>
                            <input type="text" id="sela-bulk-date-input" value="${defaultDispatchDate}" style="width: 82px; padding: 2.5px 6px; border: 1.5px solid #86efac; border-radius: 5px; font-size: 11.5px; font-weight: 700; text-align: center; color: #15803d; background: #ffffff; outline: none;" title="Ha átírod, az összes sor indítási dátuma (1. oszlop) frissül">
                        </div>
                        <div style="display: inline-flex; align-items: center; gap: 5px;">
                            <span style="font-size: 11px; font-weight: 600; color: #166534;">Határidő átírás:</span>
                            <input type="text" id="sela-bulk-deadline-input" value="${defaultDeadline}" style="width: 82px; padding: 2.5px 6px; border: 1.5px solid #86efac; border-radius: 5px; font-size: 11.5px; font-weight: 700; text-align: center; color: #047857; background: #ffffff; outline: none;" title="Ha átírod, az összes sor legkésőbbi határideje (14. oszlop) frissül">
                        </div>
                    </div>
                </div>



                <!-- Táblázat Görgethető Terület -->
                <div class="sela-table-scroll">
                    <table class="sela-table">
                        <thead>
                            <tr>
                                <th style="width:30px; text-align:center;">#</th>
                                <th style="width:36px; text-align:center;" title="Rendelés kihagyása az exportból">Kuka</th>
                                <th style="width:82px; text-align:center;" title="Indítás dátuma: aznap ha 10:30-ig küldjük, egyébként az első munkanap">Dátum</th>
                                <th style="width:115px;">Rendelés</th>
                                <th style="width:55px;">Irsz.</th>
                                <th style="width:110px;">Település</th>
                                <th style="width:185px;">Utca, házszám</th>
                                <th style="width:170px;">Telefonszám</th>
                                <th style="width:140px;">Címzett Neve</th>
                                <th style="width:50px; text-align:center;" title="PVC, SPC falpanelek és padlózatok">PVC/SPC</th>
                                <th style="width:50px; text-align:center;" title="Akusztikus falpanelek">Akuszt.</th>
                                <th style="width:50px; text-align:center;" title="Ragasztók, szilikonok">Ragasztó</th>
                                <th style="width:50px; text-align:center;" title="Profilok és skirting szegélylécek">Profil</th>
                                <th style="width:180px;">Utánvét / Tapadóhíd</th>
                                <th style="width:75px; text-align:right;" title="Kalkulált összsúly">Összsúly (kg)</th>
                                <th style="width:90px; text-align:center;" title="5 munkanapos legkésőbbi kézbesítési határidő">Legkésőbb</th>
                            </tr>
                        </thead>
                        <tbody id="sela-table-body">
                            ${tableRowsHtml}
                        </tbody>
                    </table>
                </div>

                <!-- Lábléc / Akciók -->
                <div class="sela-modal-footer">
                    <div class="sela-footer-left">
                        <label class="sela-checkbox-label">
                            <input type="checkbox" id="sela-tag-checkbox" checked>
                            <span>Rendelések megjelölése <strong>"sela megr."</strong> címkével a Shopify-ban az exportálás után</span>
                        </label>
                    </div>
                    <div class="sela-footer-right">
                        <span style="font-size:12px; color:#64748b; margin-right:8px;" id="sela-footer-count">Összesen: <strong>${initialRows.length} db</strong> rendelés | Kiszállítandó összsúly: <strong id="sela-footer-total-weight" style="color:#0284c7;">${new Intl.NumberFormat('hu-HU').format(initialTotalWeight)} kg</strong></span>
                        <button type="button" class="btn btn-secondary sela-btn-cancel" id="btn-sela-cancel">Mégse</button>
                        <button type="button" class="btn btn-primary sela-btn-export" id="btn-sela-export">
                            <i class="ph ph-download-simple" style="font-size:18px;"></i>
                            <span>CSV Letöltése</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 4. Stílusok biztosítása
        ensureSelaModalStyles();

        document.body.appendChild(overlay);

        // 5. Segédfüggvény a darabszám és összsúly frissítésére
        const updateTotalWeightDisplay = (explicitTotal = null) => {
            let total = 0;
            if (explicitTotal !== null) {
                total = explicitTotal;
            } else {
                overlay.querySelectorAll('.col-weight').forEach(inp => {
                    total += parseFloat(inp.value) || 0;
                });
            }
            const roundedTotal = Math.round(total * 100) / 100;
            const target = overlay.querySelector('#sela-footer-total-weight');
            if (target) {
                target.textContent = `${new Intl.NumberFormat('hu-HU').format(roundedTotal)} kg`;
            }
        };

        const updateCountDisplays = () => {
            const currentRows = overlay.querySelectorAll('.sela-row');
            const count = currentRows.length;
            const headerCount = overlay.querySelector('#sela-header-count');
            if (headerCount) headerCount.textContent = `${count} db rendelés`;
            
            updateTotalWeightDisplay();

            // Sorszámok újrainstallálása
            currentRows.forEach((row, i) => {
                const idxCell = row.querySelector('.sela-col-idx');
                if (idxCell) idxCell.textContent = `${i + 1}.`;
            });

            const btnExp = overlay.querySelector('#btn-sela-export');
            if (btnExp) {
                btnExp.disabled = (count === 0);
            }
        };

        // Súlyok újraszámítása a perzisztens terméksúly adatbázisból (pl. Terméksúlyok kezelése után)
        const recalculateAllRowWeights = () => {
            let totalKg = 0;
            overlay.querySelectorAll('.sela-row').forEach(rowEl => {
                const orderId = rowEl.dataset.orderId;
                const origRow = initialRows.find(r => r.orderId === orderId);
                let rowWeight = 0;
                let titleText = '';

                if (origRow && origRow.order && Array.isArray(origRow.order.items) && origRow.order.items.length > 0) {
                    const weightCalc = SelaWeightService.calculateOrderWeight(origRow.order);
                    rowWeight = weightCalc.totalWeight;
                    titleText = weightCalc.breakdownText;
                } else if (origRow) {
                    rowWeight = parseFloat(origRow.col13_weight) || 0;
                    titleText = origRow.weightBreakdownText || `Kalkulált súly: ${rowWeight} kg`;
                }

                const weightInput = rowEl.querySelector('.col-weight');
                if (weightInput) {
                    weightInput.value = rowWeight;
                    weightInput.title = titleText;
                }
                totalKg += rowWeight;
            });

            updateTotalWeightDisplay(totalKg);
        };

        // 6. Eseménykezelők bekötése
        const closeModal = () => {
            overlay.remove();
        };

        const btnClose = overlay.querySelector('#btn-sela-close');
        const btnCancel = overlay.querySelector('#btn-sela-cancel');
        const btnExport = overlay.querySelector('#btn-sela-export');
        const tagCheckbox = overlay.querySelector('#sela-tag-checkbox');
        const btnManageWeights = overlay.querySelector('#btn-sela-manage-weights');

        if (btnManageWeights) {
            btnManageWeights.addEventListener('click', () => {
                SelaMissingWeightsModal.showManagerModal(() => {
                    recalculateAllRowWeights();
                });
            });
        }

        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);

        // Kattintás a háttérre bezáráshoz
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // ESC billentyű bezárás
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Feladási dátum (1. oszlop) tömeges módosítása
        const bulkDateInput = overlay.querySelector('#sela-bulk-date-input');
        if (bulkDateInput) {
            bulkDateInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                overlay.querySelectorAll('.col-date').forEach(inp => {
                    inp.value = val;
                });
            });
        }

        // Legkésőbbi kézbesítési határidő (14. oszlop) tömeges módosítása
        const bulkDeadlineInput = overlay.querySelector('#sela-bulk-deadline-input');
        if (bulkDeadlineInput) {
            bulkDeadlineInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                overlay.querySelectorAll('.col-deadline').forEach(inp => {
                    inp.value = val;
                });
            });
        }

        // SOROK TÖRLÉSE (Kuka gomb)
        overlay.addEventListener('click', (e) => {
            const delBtn = e.target.closest('.sela-btn-delete-row');
            if (delBtn) {
                const tr = delBtn.closest('tr');
                if (tr) {
                    tr.remove();
                    updateCountDisplays();
                }
            }
        });

        // Ha a kötelező utánvét mezőbe írnak vagy súly változik
        overlay.addEventListener('input', (e) => {
            if (e.target.classList.contains('col-cod')) {
                e.target.classList.remove('sela-input-pulse-error');
                if (e.target.value.trim() && !e.target.value.includes('⚠️')) {
                    e.target.classList.remove('sela-input-required-cod');
                }
            } else if (e.target.classList.contains('col-weight')) {
                updateTotalWeightDisplay();
            }
        });

        // EXPORTÁLÁS ÉS MENTÉS INDÍTÁSA
        if (btnExport) {
            btnExport.addEventListener('click', async () => {
                const rowElements = overlay.querySelectorAll('.sela-row');
                if (rowElements.length === 0) {
                    CustomDialog.alert('Nincs kiválasztott rendelés a táblázatban az exportáláshoz!', 'Figyelem', 'warning');
                    return;
                }

                // 1. SZIGORÚ ELLENŐRZÉS: Díjbekérős rendelések utánvétjének ellenőrzése
                let invalidProformaRow = null;
                let invalidOrderId = null;

                for (const rowEl of rowElements) {
                    const isProforma = rowEl.classList.contains('sela-row-proforma');
                    if (isProforma) {
                        const codInput = rowEl.querySelector('.col-cod');
                        const codVal = (codInput ? codInput.value : '').trim();
                        
                        // Ha még nincs megadva összeg vagy benne maradt a figyelmeztetés:
                        if (!codVal || codVal.includes('⚠️') || codVal.toLowerCase().includes('adj meg') || codVal.toLowerCase().includes('utánvétet!')) {
                            invalidProformaRow = rowEl;
                            invalidOrderId = rowEl.dataset.orderId;
                            break;
                        }
                    }
                }

                if (invalidProformaRow) {
                    const codInput = invalidProformaRow.querySelector('.col-cod');
                    if (codInput) {
                        codInput.classList.add('sela-input-pulse-error');
                        codInput.focus();
                        codInput.select();
                    }

                    await CustomDialog.alert(
                        `A(z) <strong>${invalidOrderId}</strong> rendelésnél díjbekérő lett kiállítva (díjbek.ki), de még nincs megadva a pontos utánvét összege!<br><br>Kérlek írd be a pontos utánvétet a mezőbe a letöltés előtt!`,
                        'Hiányzó Utánvét Összeg',
                        'warning'
                    );
                    return;
                }

                btnExport.disabled = true;
                btnExport.innerHTML = `<i class="ph ph-spinner ph-spin" style="font-size:18px;"></i> Letöltés...`;

                // A megmaradt sorok beolvasása a táblázatból
                const finalRows = [];
                const remainingOrderIds = new Set();

                rowElements.forEach(rowEl => {
                    const orderId = rowEl.dataset.orderId;
                    remainingOrderIds.add(orderId);
                    const originalRow = initialRows.find(r => r.orderId === orderId) || {};

                    const getVal = (selector) => {
                        const input = rowEl.querySelector(selector);
                        return input ? input.value.trim() : '';
                    };

                    const getNum = (selector) => {
                        const input = rowEl.querySelector(selector);
                        return input ? parseInt(input.value, 10) || 0 : 0;
                    };

                    finalRows.push({
                        ...originalRow,
                        col1_date: getVal('.col-date'),
                        col2_orderId: getVal('.col-order'),
                        col3_zip: getVal('.col-zip'),
                        col4_city: getVal('.col-city'),
                        col5_street: getVal('.col-street'),
                        col6_phone: getVal('.col-phone'),
                        col7_customerName: getVal('.col-name'),
                        col8_pvcSpcFloorQty: getNum('[data-field="col8_pvcSpcFloorQty"]'),
                        col9_acousticQty: getNum('[data-field="col9_acousticQty"]'),
                        col10_adhesivesQty: getNum('[data-field="col10_adhesivesQty"]'),
                        col11_profilesQty: getNum('[data-field="col11_profilesQty"]'),
                        col12_codAndTapadohid: getVal('.col-cod'),
                        col13_weight: parseFloat(getVal('.col-weight')) >= 0 ? parseFloat(getVal('.col-weight')) : 0,
                        col14_deadline: getVal('.col-deadline')
                    });
                });

                // CSV generálás és letöltés
                const csvContent = ExporterService.generateSelaCsv(finalRows);
                ExporterService.downloadSelaCsv(csvContent);

                const shouldTag = tagCheckbox ? tagCheckbox.checked : false;

                // Csak azokat a rendeléseket címkézzük, amik ténylegesen a táblázatban maradtak!
                const ordersToTag = selectedOrders.filter(o => remainingOrderIds.has(o.id));

                if (shouldTag && ordersToTag.length > 0) {
                    try {
                        const payload = ordersToTag.map(o => ({ orderId: o.id, shopifyId: o.shopifyId }));
                        await ShopifyApiService.bulkUpdateOrderTags({ orders: payload, addTag: 'sela megr.' });

                        // Helyi modell frissítése csak a ténylegesen exportált rendeléseknél
                        ordersToTag.forEach(o => {
                            o.hasSelaOrdered = true;
                            o.needsSelaDispatch = false;
                            const tagsArr = (o.tags || '').split(',').map(t => t.trim()).filter(Boolean);
                            if (!tagsArr.some(t => t.toLowerCase() === 'sela megr.' || t.toLowerCase() === 'sela megr')) {
                                tagsArr.push('sela megr.');
                            }
                            o.tags = tagsArr.join(', ');
                        });

                        Store.clearHubOrderSelection();
                        if (typeof onCompleteCallback === 'function') {
                            onCompleteCallback();
                        }
                        closeModal();
                        CustomDialog.alert(`A(z) ${finalRows.length} db rendelés exportálva lett, és sikeresen megkapta a "sela megr." címkét! 🎉`, 'Export Kész', 'success');
                    } catch (err) {
                        closeModal();
                        CustomDialog.alert(`A CSV export letöltődött, de a címkék beállítása meghiúsult:\n${err.message}`, 'Címkézési Figyelmeztetés', 'warning');
                    }
                } else {
                    Store.clearHubOrderSelection();
                    if (typeof onCompleteCallback === 'function') {
                        onCompleteCallback();
                    }
                    closeModal();
                    CustomDialog.alert(`A(z) ${finalRows.length} db rendelés CSV exportja sikeresen letöltődött (Shopify címkék nem módosultak).`, 'Export Kész', 'info');
                }
            });
        }
    }
};
