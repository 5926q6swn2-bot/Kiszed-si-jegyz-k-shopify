// js/views/selaMissingWeightsModal.js
// Felugró ablak az ismeretlen súlyú táblák és kellékek bekérésére a Sela export előtt,
// valamint a meglévő terméksúlyok megtekintésére és szerkesztésére.

import { SelaWeightService } from '../services/selaWeightService.js';
import { CustomDialog } from '../utils/dialog.js';
import { ensureSelaModalStyles } from './selaModalStyles.js';

export const SelaMissingWeightsModal = {
    /**
     * Megjeleníti a hiányzó súlyú termékek bekérő ablakát.
     * @param {Array} missingItems - A hiányzó tételek listája [{ key, name, sku, category, suggestedWeight, totalQty }]
     * @param {Function} onSaveCallback - Meghívódik, miután a felhasználó elmentette a súlyokat
     * @param {Function} onCancelCallback - Meghívódik, ha a felhasználó a Mégse gombra kattint
     */
    show: function(missingItems, onSaveCallback, onCancelCallback) {
        if (!missingItems || missingItems.length === 0) {
            if (typeof onSaveCallback === 'function') onSaveCallback();
            return;
        }

        ensureSelaModalStyles();

        const existingModal = document.getElementById('sela-missing-weights-overlay');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'sela-missing-weights-overlay';
        overlay.className = 'sela-modal-overlay';
        overlay.style.zIndex = '100005';

        const categoryBadgeMap = {
            'pvc_spc_floor': { label: 'PVC / SPC / Padló', bg: '#fef3c7', color: '#92400e' },
            'acoustic': { label: 'Akusztikus panel', bg: '#e0e7ff', color: '#3730a3' },
            'adhesive': { label: 'Ragasztó / Kellék', bg: '#fee2e2', color: '#991b1b' },
            'profile': { label: 'Profil / Léc', bg: '#f3e8ff', color: '#6b21a8' },
            'tapadohid': { label: 'Tapadóhíd', bg: '#ccfbf1', color: '#115e59' },
            'other': { label: 'Egyéb termék', bg: '#f1f5f9', color: '#475569' }
        };

        const rowsHtml = missingItems.map((item, idx) => {
            const badge = categoryBadgeMap[item.category] || categoryBadgeMap.other;
            return `
                <tr class="missing-weight-row" data-key="${item.key}">
                    <td style="color:#94a3b8; font-size:11px; text-align:center;">${idx + 1}.</td>
                    <td>
                        <div style="font-weight:700; color:#0f172a; font-size:13px; line-height:1.35; word-break:break-word;">
                            ${item.name}
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; margin-top:3px; flex-wrap:wrap;">
                            ${item.sku ? `<span style="font-size:11px; color:#64748b; font-family:monospace; background:#f1f5f9; padding:1px 6px; border-radius:4px;">SKU: ${item.sku}</span>` : ''}
                            ${item.variantTitle && item.variantTitle.toLowerCase() !== 'default title' ? `<span style="font-size:11px; font-weight:700; color:#0284c7; background:#e0f2fe; padding:2px 7px; border-radius:5px; border: 1px solid #bae6fd;">Méret / Kiszerelés: ${item.variantTitle}</span>` : ''}
                        </div>
                    </td>
                    <td style="text-align:center;">
                        <span style="display:inline-block; font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:5px; background:${badge.bg}; color:${badge.color}; white-space:nowrap;">
                            ${badge.label}
                        </span>
                    </td>
                    <td style="text-align:center; font-weight:700; color:#334155; font-size:12.5px;">
                        ${item.totalQty} db
                    </td>
                    <td style="text-align:right;">
                        <div style="display:inline-flex; align-items:center; gap:4px;">
                            <input type="number" 
                                   step="0.1" 
                                   min="0" 
                                   class="missing-weight-input" 
                                   data-key="${item.key}"
                                   data-name="${item.name.replace(/"/g, '&quot;')}"
                                   data-sku="${(item.sku || '').replace(/"/g, '&quot;')}"
                                   data-category="${item.category}"
                                   value="${item.suggestedWeight}" 
                                   style="width: 70px; padding: 5px 8px; border: 1.5px solid #0284c7; border-radius: 6px; font-size: 13px; font-weight: 700; text-align: right; color: #0284c7; background: #f0f9ff; outline: none;">
                            <span style="font-size: 12px; font-weight: 600; color: #64748b;">kg / db</span>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        overlay.innerHTML = `
            <div class="sela-modal-container" style="max-width: 820px; height: auto; max-height: 85vh; border-radius: 16px; display: flex; flex-direction: column;">
                <!-- Fejléc -->
                <div class="sela-modal-header" style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 16px 22px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                            <i class="ph ph-scales"></i>
                        </div>
                        <div>
                            <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">Új termékek súlyának megadása (Sela Export)</h2>
                            <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">
                                A kijelölt rendelésekben <strong>${missingItems.length} db olyan cikk</strong> van, aminek a darabsúlya még nem rögzített. Kérlek add meg a súlyukat, a rendszer elmenti őket!
                            </p>
                        </div>
                    </div>
                    <button type="button" class="sela-modal-close" id="btn-missing-close" style="background:none; border:none; font-size:24px; color:#94a3b8; cursor:pointer;">&times;</button>
                </div>

                <!-- Magyarázó sáv -->
                <div style="background: #eff6ff; border-bottom: 1px solid #bfdbfe; padding: 10px 22px; font-size: 12px; color: #1e40af; display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-info" style="font-size: 17px; flex-shrink: 0;"></i>
                    <span>
                        Az előre kitöltött értékek kategória-javaslatok (pl. eltérő méretű táblák: 244x122 vs 280x122 külön súlyúak). Ellenőrizd vagy írd át őket tetszés szerint!
                    </span>
                </div>

                <!-- Táblázat -->
                <div style="flex: 1; overflow-y: auto; padding: 12px 22px; max-height: 50vh;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
                        <thead>
                            <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b; text-align: left; font-size: 11.5px;">
                                <th style="padding: 6px 4px; width: 30px; text-align: center;">#</th>
                                <th style="padding: 6px 8px;">Termék / Tábla megnevezése</th>
                                <th style="padding: 6px 8px; text-align: center; width: 140px;">Kategória</th>
                                <th style="padding: 6px 8px; text-align: center; width: 75px;">Mennyiség</th>
                                <th style="padding: 6px 8px; text-align: right; width: 135px;">Darabsúly (kg)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>

                <!-- Lábléc -->
                <div style="padding: 14px 22px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: flex-end; gap: 10px; border-radius: 0 0 16px 16px;">
                    <button type="button" class="btn btn-secondary" id="btn-missing-cancel" style="padding: 7px 16px; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer;">
                        Mégse
                    </button>
                    <button type="button" class="btn btn-primary" id="btn-missing-save" style="padding: 7px 18px; font-size: 13px; font-weight: 700; border-radius: 8px; background: #0284c7; color: #fff; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="ph ph-floppy-disk" style="font-size: 16px;"></i>
                        <span>Súlyok mentése és Folytatás</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const closeModal = () => {
            overlay.remove();
        };

        const btnClose = overlay.querySelector('#btn-missing-close');
        const btnCancel = overlay.querySelector('#btn-missing-cancel');
        const btnSave = overlay.querySelector('#btn-missing-save');

        if (btnClose) btnClose.addEventListener('click', () => {
            closeModal();
            if (typeof onCancelCallback === 'function') onCancelCallback();
        });

        if (btnCancel) btnCancel.addEventListener('click', () => {
            closeModal();
            if (typeof onCancelCallback === 'function') onCancelCallback();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
                if (typeof onCancelCallback === 'function') onCancelCallback();
            }
        });

        if (btnSave) {
            btnSave.addEventListener('click', async () => {
                const inputs = overlay.querySelectorAll('.missing-weight-input');
                const savePayload = {};
                let hasInvalid = false;

                inputs.forEach(inp => {
                    const key = inp.dataset.key;
                    const val = parseFloat(inp.value);
                    if (isNaN(val) || val < 0) {
                        hasInvalid = true;
                        inp.style.borderColor = '#ef4444';
                        inp.style.background = '#fee2e2';
                    } else {
                        savePayload[key] = {
                            name: inp.dataset.name,
                            sku: inp.dataset.sku || '',
                            category: inp.dataset.category || 'other',
                            weight: val
                        };
                    }
                });

                if (hasInvalid) {
                    await CustomDialog.alert('Kérlek minden terméknél valós, nem negatív súlyt adj meg!', 'Hibás súly', 'warning');
                    return;
                }

                btnSave.disabled = true;
                btnSave.innerHTML = `<i class="ph ph-spinner ph-spin" style="font-size:16px;"></i> Mentés...`;

                try {
                    await SelaWeightService.saveProductWeights(savePayload);
                    closeModal();
                    if (typeof onSaveCallback === 'function') {
                        onSaveCallback();
                    }
                } catch (e) {
                    console.error('[SelaMissingWeightsModal] Save error:', e);
                    btnSave.disabled = false;
                    btnSave.innerHTML = `Súlyok mentése és Folytatás`;
                    await CustomDialog.alert('Hiba történt a súlyok mentésekor!', 'Hiba', 'error');
                }
            });
        }
    },

    /**
     * Terméksúlyok Kezelése Kezelőfelület (Manager Modal)
     * Lehetővé teszi az összes korábban rögzített terméksúly áttekintését és módosítását.
     */
    showManagerModal: function(onCloseCallback) {
        ensureSelaModalStyles();
        const weights = SelaWeightService.getProductWeights();
        const entries = Object.entries(weights);

        const existingModal = document.getElementById('sela-weight-manager-overlay');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'sela-weight-manager-overlay';
        overlay.className = 'sela-modal-overlay';
        overlay.style.zIndex = '100010';

        const categoryBadgeMap = {
            'pvc_spc_floor': { label: 'PVC / SPC / Padló', bg: '#fef3c7', color: '#92400e' },
            'acoustic': { label: 'Akusztikus panel', bg: '#e0e7ff', color: '#3730a3' },
            'adhesive': { label: 'Ragasztó / Kellék', bg: '#fee2e2', color: '#991b1b' },
            'profile': { label: 'Profil / Léc', bg: '#f3e8ff', color: '#6b21a8' },
            'tapadohid': { label: 'Tapadóhíd', bg: '#ccfbf1', color: '#115e59' },
            'other': { label: 'Egyéb', bg: '#f1f5f9', color: '#475569' }
        };

        const renderRows = (items) => {
            if (items.length === 0) {
                return `<tr><td colspan="5" style="text-align:center; padding: 24px; color:#94a3b8;">Nincs még rögzített terméksúly, vagy nincs találat a keresésre.</td></tr>`;
            }
            return items.map(([key, data], idx) => {
                const numWeight = typeof data === 'object' ? data.weight : data;
                const name = typeof data === 'object' ? data.name : key;
                const sku = typeof data === 'object' ? data.sku || '' : '';
                const category = typeof data === 'object' ? data.category || 'other' : 'other';
                const badge = categoryBadgeMap[category] || categoryBadgeMap.other;

                return `
                    <tr class="manager-weight-row" data-key="${key}">
                        <td style="color:#94a3b8; font-size:11px; text-align:center;">${idx + 1}.</td>
                        <td>
                            <div style="font-weight:700; color:#0f172a; font-size:12.5px; line-height:1.35; word-break:break-word;">${name}</div>
                            ${sku ? `<div style="font-size:11px; color:#64748b; font-family:monospace; margin-top:2px;">SKU: ${sku}</div>` : ''}
                        </td>
                        <td style="text-align:center;">
                            <span style="display:inline-block; font-size:10.5px; font-weight:700; padding:2px 6px; border-radius:4px; background:${badge.bg}; color:${badge.color};">
                                ${badge.label}
                            </span>
                        </td>
                        <td style="text-align:right;">
                            <div style="display:inline-flex; align-items:center; gap:4px;">
                                <input type="number" 
                                       step="0.1" 
                                       min="0" 
                                       class="manager-weight-input" 
                                       data-key="${key}"
                                       data-name="${name.replace(/"/g, '&quot;')}"
                                       data-sku="${sku.replace(/"/g, '&quot;')}"
                                       data-category="${category}"
                                       value="${numWeight}" 
                                       style="width: 70px; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 12.5px; font-weight: 700; text-align: right; color: #0284c7;">
                                <span style="font-size:11px; color:#64748b;">kg</span>
                            </div>
                        </td>
                        <td style="text-align:center;">
                            <button type="button" class="btn-delete-weight" data-key="${key}" title="Terméksúly törlése" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:4px 6px; border-radius:4px;">
                                <i class="ph ph-trash" style="font-size:16px;"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        };

        overlay.innerHTML = `
            <div class="sela-modal-container" style="max-width: 850px; height: auto; max-height: 85vh; border-radius: 16px; display: flex; flex-direction: column;">
                <div class="sela-modal-header" style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 14px 20px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 8px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                            <i class="ph ph-sliders"></i>
                        </div>
                        <div>
                            <h2 style="margin: 0; font-size: 15.5px; font-weight: 700; color: #0f172a;">Sela Terméksúlyok Kezelése</h2>
                            <p style="margin: 1px 0 0 0; font-size: 11.5px; color: #64748b;">Itt áttekintheted és bármikor módosíthatod az elmentett táblák és kellékek darabsúlyait.</p>
                        </div>
                    </div>
                    <button type="button" class="sela-modal-close" id="btn-mgr-close" style="background:none; border:none; font-size:24px; color:#94a3b8; cursor:pointer;">&times;</button>
                </div>

                <!-- Keresősáv -->
                <div style="padding: 10px 20px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display:flex; align-items:center; gap: 10px;">
                    <i class="ph ph-magnifying-glass" style="color: #94a3b8; font-size: 16px;"></i>
                    <input type="text" id="mgr-search-input" placeholder="Keresés terméknév vagy SKU alapján..." style="flex:1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 12.5px; outline: none;">
                    <span style="font-size: 11.5px; color: #64748b;" id="mgr-item-count">${entries.length} rögzített termék</span>
                </div>

                <!-- Táblázat -->
                <div style="flex: 1; overflow-y: auto; padding: 10px 20px; max-height: 52vh;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
                        <thead>
                            <tr style="border-bottom: 1px solid #cbd5e1; color: #64748b; text-align: left; font-size: 11.5px;">
                                <th style="padding: 6px 4px; width: 30px; text-align: center;">#</th>
                                <th style="padding: 6px 8px;">Terméknév & Méret</th>
                                <th style="padding: 6px 8px; text-align: center; width: 130px;">Kategória</th>
                                <th style="padding: 6px 8px; text-align: right; width: 120px;">Súly (kg/db)</th>
                                <th style="padding: 6px 4px; text-align: center; width: 45px;">Törlés</th>
                            </tr>
                        </thead>
                        <tbody id="mgr-tbody">
                            ${renderRows(entries)}
                        </tbody>
                    </table>
                </div>

                <!-- Lábléc -->
                <div style="padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: flex-end; gap: 10px; border-radius: 0 0 16px 16px;">
                    <button type="button" class="btn btn-secondary" id="btn-mgr-cancel" style="padding: 6px 14px; font-size: 12.5px; font-weight: 600; border-radius: 6px; cursor: pointer;">
                        Bezárás
                    </button>
                    <button type="button" class="btn btn-primary" id="btn-mgr-save" style="padding: 6px 16px; font-size: 12.5px; font-weight: 700; border-radius: 6px; background: #0284c7; color: #fff; border: none; cursor: pointer;">
                        Változtatások Mentése
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const closeModal = () => {
            overlay.remove();
            if (typeof onCloseCallback === 'function') onCloseCallback();
        };

        const btnClose = overlay.querySelector('#btn-mgr-close');
        const btnCancel = overlay.querySelector('#btn-mgr-cancel');
        const btnSave = overlay.querySelector('#btn-mgr-save');
        const searchInput = overlay.querySelector('#mgr-search-input');
        const tbody = overlay.querySelector('#mgr-tbody');

        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Keresés szűrés
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const filtered = entries.filter(([key, data]) => {
                    const name = (typeof data === 'object' ? data.name : key).toLowerCase();
                    const sku = (typeof data === 'object' ? data.sku || '' : '').toLowerCase();
                    return name.includes(query) || sku.includes(query) || key.includes(query);
                });
                tbody.innerHTML = renderRows(filtered);
            });
        }

        // Törlés
        overlay.addEventListener('click', async (e) => {
            const delBtn = e.target.closest('.btn-delete-weight');
            if (delBtn) {
                const key = delBtn.dataset.key;
                const confirmed = await CustomDialog.confirm(`Biztosan törlöd ennek a terméknek az elmentett súlyát?`, 'Törlés megerősítése');
                if (confirmed) {
                    const currentWeights = SelaWeightService.getProductWeights();
                    delete currentWeights[key];
                    await SelaWeightService.saveProductWeights({});
                    const row = delBtn.closest('tr');
                    if (row) row.remove();
                }
            }
        });

        // Mentés
        if (btnSave) {
            btnSave.addEventListener('click', async () => {
                const inputs = overlay.querySelectorAll('.manager-weight-input');
                const updateMap = {};
                inputs.forEach(inp => {
                    const key = inp.dataset.key;
                    const val = parseFloat(inp.value);
                    if (!isNaN(val) && val >= 0) {
                        updateMap[key] = {
                            name: inp.dataset.name,
                            sku: inp.dataset.sku || '',
                            category: inp.dataset.category || 'other',
                            weight: val
                        };
                    }
                });

                btnSave.disabled = true;
                btnSave.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Mentés...`;

                await SelaWeightService.saveProductWeights(updateMap);
                closeModal();
            });
        }
    }
};
