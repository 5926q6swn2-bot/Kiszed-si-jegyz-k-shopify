// js/views/selaExportModal.js
// Szállítói Export (Sela) Interaktív Előnézet és Szerkesztő Modal
// Lehetővé teszi a 12 oszlop áttekintését, sorok törlését, cellák szerkesztését
// és a függő utalások / proforma utánvétek szigorú ellenőrzését a CSV letöltése előtt.

import { ExporterService } from '../services/exporter.js';
import { ShopifyApiService } from '../services/shopifyApiService.js';
import { Store } from '../store/state.js';
import { CustomDialog } from '../utils/dialog.js';

export const SelaExportModal = {
    show: function(selectedOrders, onCompleteCallback) {
        if (!selectedOrders || selectedOrders.length === 0) {
            CustomDialog.alert('Nincs exportálható rendelés kijelölve!', 'Figyelem', 'warning');
            return;
        }

        // 1. Sorok előkészítése a 12 oszlopos logikával
        const initialRows = selectedOrders.map(o => ExporterService.prepareSelaRowData(o));

        // Van-e díjbekérős vagy függő utalásos rendelés a listában?
        const hasProformaOrders = initialRows.some(r => r.isProforma);
        const proformaCount = initialRows.filter(r => r.isProforma).length;
        const hasPendingBankOrders = initialRows.some(r => r.isPendingBankTransfer);
        const pendingBankCount = initialRows.filter(r => r.isPendingBankTransfer).length;

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
                    <td><input type="text" class="sela-cell-input col-date" data-field="col1_date" value="${r.col1_date}" style="width: 85px;"></td>
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
                    <button type="button" class="sela-modal-close" id="btn-sela-close">&times;</button>
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

                <!-- Táblázat Görgethető Terület -->
                <div class="sela-table-scroll">
                    <table class="sela-table">
                        <thead>
                            <tr>
                                <th style="width:30px; text-align:center;">#</th>
                                <th style="width:36px; text-align:center;" title="Rendelés kihagyása az exportból">Kuka</th>
                                <th style="width:85px;">Dátum</th>
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
                        <span style="font-size:12px; color:#64748b; margin-right:8px;" id="sela-footer-count">Összesen: <strong>${initialRows.length} db</strong> rendelés</span>
                        <button type="button" class="btn btn-secondary sela-btn-cancel" id="btn-sela-cancel">Mégse</button>
                        <button type="button" class="btn btn-primary sela-btn-export" id="btn-sela-export">
                            <i class="ph ph-download-simple" style="font-size:18px;"></i>
                            <span>CSV Letöltése</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 4. Stílusok injektálása
        if (!document.getElementById('sela-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'sela-modal-styles';
            style.textContent = `
                .sela-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.75);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                    animation: selaFadeIn 0.2s ease-out;
                }
                @keyframes selaFadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
                .sela-modal-container {
                    background: #ffffff;
                    width: 98vw;
                    max-width: 1540px;
                    height: 92vh;
                    max-height: 900px;
                    border-radius: 16px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                }
                .sela-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 20px;
                    border-bottom: 1px solid #e2e8f0;
                    background: #f8fafc;
                }
                .sela-header-title-group {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .sela-header-icon {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    background: #e0f2fe;
                    color: #0284c7;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 22px;
                }
                .sela-modal-title {
                    margin: 0;
                    font-size: 16.5px;
                    font-weight: 700;
                    color: #0f172a;
                    letter-spacing: -0.01em;
                }
                .sela-modal-subtitle {
                    margin: 2px 0 0 0;
                    font-size: 12px;
                    color: #64748b;
                }
                .sela-order-count-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    background: #e0f2fe;
                    color: #0284c7;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                }
                .sela-modal-close {
                    background: none;
                    border: none;
                    font-size: 26px;
                    line-height: 1;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 8px;
                    transition: all 0.15s;
                }
                .sela-modal-close:hover {
                    color: #0f172a;
                    background: #e2e8f0;
                }
                .sela-bank-alert {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 16px;
                    background: #fff7ed;
                    border-bottom: 1px solid #fed7aa;
                    color: #9a3412;
                    font-size: 12.5px;
                }
                .sela-proforma-alert {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 16px;
                    background: #fffbeb;
                    border-bottom: 1px solid #fde68a;
                    color: #92400e;
                    font-size: 12.5px;
                }
                .sela-table-scroll {
                    flex: 1;
                    overflow: auto;
                    min-height: 0;
                    background: #ffffff;
                }
                .sela-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12.5px;
                    text-align: left;
                }
                .sela-table thead th {
                    position: sticky;
                    top: 0;
                    background: #f8fafc;
                    padding: 7px 8px;
                    font-size: 11.5px;
                    font-weight: 700;
                    color: #475569;
                    border-bottom: 2px solid #cbd5e1;
                    white-space: nowrap;
                    z-index: 10;
                }
                .sela-row {
                    border-bottom: 1px solid #f1f5f9;
                    transition: background-color 0.15s;
                }
                .sela-row:hover {
                    background: #f8fafc;
                }
                .sela-row-proforma {
                    background: #f0f9ff;
                }
                .sela-row-proforma:hover {
                    background: #e0f2fe;
                }
                .sela-row-bank-pending {
                    background: #fff7ed;
                }
                .sela-row-bank-pending:hover {
                    background: #ffedd5;
                }
                .sela-col-idx {
                    color: #94a3b8;
                    font-size: 11px;
                    text-align: center;
                    padding: 4px 6px;
                }
                .sela-btn-delete-row {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 4px 6px;
                    border-radius: 6px;
                    color: #ef4444;
                    font-size: 14px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s;
                }
                .sela-btn-delete-row:hover {
                    background: #fee2e2;
                    color: #b91c1c;
                    transform: scale(1.1);
                }
                .sela-proforma-badge {
                    display: inline-block;
                    padding: 1px 5px;
                    background: #0284c7;
                    color: #ffffff;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 700;
                    white-space: nowrap;
                }
                .sela-bank-badge {
                    display: inline-block;
                    padding: 1px 5px;
                    background: #ea580c;
                    color: #ffffff;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 700;
                    white-space: nowrap;
                }
                .sela-cell-input {
                    padding: 4px 6px;
                    border: 1px solid transparent;
                    border-radius: 5px;
                    background: transparent;
                    font-family: inherit;
                    font-size: 12.5px;
                    color: #1e293b;
                    box-sizing: border-box;
                    transition: all 0.15s;
                }
                .sela-cell-input:hover {
                    border-color: #cbd5e1;
                    background: #ffffff;
                }
                .sela-cell-input:focus {
                    border-color: #0284c7;
                    background: #ffffff;
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.2);
                }
                .sela-input-proforma {
                    background: #ffffff;
                    border-color: #7dd3fc;
                    color: #0369a1;
                }
                .sela-input-required-cod {
                    background: #fef2f2 !important;
                    border: 2px solid #ef4444 !important;
                    color: #b91c1c !important;
                    font-weight: 700 !important;
                }
                .sela-input-pulse-error {
                    border: 2px solid #dc2626 !important;
                    background: #fee2e2 !important;
                    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.3) !important;
                    animation: pulseError 0.8s ease-in-out infinite alternate;
                }
                @keyframes pulseError {
                    from { transform: scale(1); }
                    to { transform: scale(1.02); }
                }
                .sela-modal-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 20px;
                    background: #f8fafc;
                    border-top: 1px solid #e2e8f0;
                }
                .sela-checkbox-label {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #1e293b;
                    cursor: pointer;
                    user-select: none;
                }
                .sela-checkbox-label input[type="checkbox"] {
                    width: 17px;
                    height: 17px;
                    accent-color: #0284c7;
                    cursor: pointer;
                }
                .sela-footer-right {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .sela-btn-cancel {
                    padding: 7px 14px;
                    font-size: 13px;
                    font-weight: 600;
                    border-radius: 8px;
                    background: #e2e8f0;
                    color: #475569;
                    border: none;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .sela-btn-cancel:hover {
                    background: #cbd5e1;
                    color: #0f172a;
                }
                .sela-btn-export {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 18px;
                    font-size: 13px;
                    font-weight: 700;
                    border-radius: 8px;
                    background: #0284c7;
                    color: #ffffff;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);
                    transition: all 0.15s;
                }
                .sela-btn-export:hover {
                    background: #0369a1;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(overlay);

        // 5. Segédfüggvény a darabszám frissítésére
        const updateCountDisplays = () => {
            const currentRows = overlay.querySelectorAll('.sela-row');
            const count = currentRows.length;
            const headerCount = overlay.querySelector('#sela-header-count');
            const footerCount = overlay.querySelector('#sela-footer-count');
            if (headerCount) headerCount.textContent = `${count} db rendelés`;
            if (footerCount) footerCount.innerHTML = `Összesen: <strong>${count} db</strong> rendelés`;

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

        // 6. Eseménykezelők bekötése
        const closeModal = () => {
            overlay.remove();
        };

        const btnClose = overlay.querySelector('#btn-sela-close');
        const btnCancel = overlay.querySelector('#btn-sela-cancel');
        const btnExport = overlay.querySelector('#btn-sela-export');
        const tagCheckbox = overlay.querySelector('#sela-tag-checkbox');

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

        // Ha a kötelező utánvét mezőbe írnak, töröljük a piros hibajelzést
        overlay.addEventListener('input', (e) => {
            if (e.target.classList.contains('col-cod')) {
                e.target.classList.remove('sela-input-pulse-error');
                if (e.target.value.trim() && !e.target.value.includes('⚠️')) {
                    e.target.classList.remove('sela-input-required-cod');
                }
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
                        col12_codAndTapadohid: getVal('.col-cod')
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
