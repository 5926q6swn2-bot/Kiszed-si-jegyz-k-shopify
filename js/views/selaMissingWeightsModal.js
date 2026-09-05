// js/views/selaMissingWeightsModal.js
// Felugró ablak az ismeretlen súlyú táblák és kellékek bekérésére a Sela export előtt,
// valamint a meglévő terméksúlyok megtekintésére és szerkesztésére.

import { SelaWeightService } from '../services/selaWeightService.js';
import { CustomDialog } from '../utils/dialog.js';
import { ensureSelaModalStyles } from './selaModalStyles.js';
import { Store } from '../store/state.js';

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
            'acoustic': { label: 'Akusztikus panel', bg: '#e0e7ff', color: '#3730a3' },
            'other': { label: 'Egyéb termék', bg: '#f1f5f9', color: '#475569' },
            'profile': { label: 'Profil / Léc', bg: '#f3e8ff', color: '#6b21a8' },
            'pvc_spc_floor': { label: 'PVC / SPC / Padló', bg: '#fef3c7', color: '#92400e' },
            'adhesive': { label: 'Ragasztó / Kellék', bg: '#fee2e2', color: '#991b1b' },
            'tapadohid': { label: 'Tapadóhíd', bg: '#ccfbf1', color: '#115e59' }
        };

        const sortedMissingItems = [...missingItems].sort((a, b) => {
            const catA = categoryBadgeMap[a.category]?.label || 'Egyéb termék';
            const catB = categoryBadgeMap[b.category]?.label || 'Egyéb termék';
            const catCmp = catA.localeCompare(catB, 'hu', { sensitivity: 'base' });
            if (catCmp !== 0) return catCmp;
            const nameA = (a.name || a.key || '').trim();
            const nameB = (b.name || b.key || '').trim();
            return nameA.localeCompare(nameB, 'hu', { sensitivity: 'base', numeric: true });
        });
        const rowsHtml = sortedMissingItems.map((item, idx) => {
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
                                   step="0.01" 
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
     * Lehetővé teszi az összes korábban rögzített terméksúly kategóriák szerinti
     * áttekintését, keresését, új termékek beolvasását a rendelésekből és módosítását.
     */
    showManagerModal: async function(onCloseCallback) {
        ensureSelaModalStyles();

        const existingModal = document.getElementById('sela-weight-manager-overlay');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'sela-weight-manager-overlay';
        overlay.className = 'sela-modal-overlay';
        overlay.style.zIndex = '100010';

        // Betöltődés Firestore-ból és LocalStorage-ból
        await SelaWeightService.initializeProductWeights();
        const rawWeights = SelaWeightService.getProductWeights();

        // Kategória konfiguráció és vizuális beállítások (Magyar ábécé sorrendben)
        const categoryConfig = {
            'acoustic': {
                order: 1,
                key: 'acoustic',
                label: 'Akusztikus Falpanelek (Léces panelek)',
                shortLabel: 'Akusztikus panel',
                icon: 'ph-speaker-high',
                headerBg: '#eef2ff',
                headerBorder: '#e0e7ff',
                headerColor: '#3730a3',
                badgeBg: '#e0e7ff',
                badgeColor: '#3730a3',
                hint: 'Normál akupanel: 7 kg, Wide akusztikus panel: 9 kg'
            },
            'other': {
                order: 2,
                key: 'other',
                label: 'Egyéb Termékek és Kellékek',
                shortLabel: 'Egyéb',
                icon: 'ph-cube',
                headerBg: '#f8fafc',
                headerBorder: '#e2e8f0',
                headerColor: '#475569',
                badgeBg: '#f1f5f9',
                badgeColor: '#475569',
                hint: 'Egyéb tartozékok, mintadarabok és egyedi tételek'
            },
            'profile': {
                order: 3,
                key: 'profile',
                label: 'Profilok és Szegélylécek',
                shortLabel: 'Profil / Léc',
                icon: 'ph-ruler',
                headerBg: '#faf5ff',
                headerBorder: '#f3e8ff',
                headerColor: '#6b21a8',
                badgeBg: '#f3e8ff',
                badgeColor: '#6b21a8',
                hint: 'Belső sarok, végzáró, skirting szegély: ~0.25 - 0.5 kg/db'
            },
            'pvc_spc_floor': {
                order: 4,
                key: 'pvc_spc_floor',
                label: 'PVC / SPC Falpanelek és Padlózat',
                shortLabel: 'PVC / SPC / Padló',
                icon: 'ph-squares-four',
                headerBg: '#fffbeb',
                headerBorder: '#fef3c7',
                headerColor: '#92400e',
                badgeBg: '#fef3c7',
                badgeColor: '#92400e',
                hint: '244x122 tábla: 16 kg, 280x122 tábla: 18.5 kg, SPC padló: 18 kg'
            },
            'adhesive': {
                order: 5,
                key: 'adhesive',
                label: 'Ragasztók és Kiegészítők',
                shortLabel: 'Ragasztó / Kellék',
                icon: 'ph-drop',
                headerBg: '#fef2f2',
                headerBorder: '#fee2e2',
                headerColor: '#991b1b',
                badgeBg: '#fee2e2',
                badgeColor: '#991b1b',
                hint: 'T-Rex ragasztó: 0.5 kg, HPR: 0.5 kg, Szilikon: 0.5 kg'
            },
            'tapadohid': {
                order: 6,
                key: 'tapadohid',
                label: 'Tapadóhidak',
                shortLabel: 'Tapadóhíd',
                icon: 'ph-paint-bucket',
                headerBg: '#f0fdfa',
                headerBorder: '#ccfbf1',
                headerColor: '#115e59',
                badgeBg: '#ccfbf1',
                badgeColor: '#115e59',
                hint: '1 kg kiszerelés: 1 kg, 5 kg kiszerelés: 5 kg'
            }
        };

        // Kategóriák rendezése magyar ábécé sorrendbe
        const sortedCategories = Object.values(categoryConfig).sort((a, b) => 
            (a.label || '').localeCompare(b.label || '', 'hu', { sensitivity: 'base' })
        );

        // Belső munkaállapot
        const workingEntries = {};
        for (const [key, data] of Object.entries(rawWeights)) {
            const numWeight = typeof data === 'object' ? data.weight : data;
            const name = typeof data === 'object' ? data.name : key;
            const sku = typeof data === 'object' ? (data.sku || '') : '';
            let cat = typeof data === 'object' ? data.category : null;
            if (!cat || !categoryConfig[cat]) {
                cat = SelaWeightService.detectItemCategory(name);
            }
            workingEntries[key] = {
                key,
                name: name || key,
                sku: sku || '',
                category: cat || 'other',
                weight: typeof numWeight === 'number' ? numWeight : (parseFloat(numWeight) || 0)
            };
        }

        let currentCategoryFilter = 'all';
        let currentSearchQuery = '';

        overlay.innerHTML = `
            <div class="sela-modal-container" style="max-width: 980px; height: auto; max-height: 90vh; border-radius: 16px; display: flex; flex-direction: column; background: #ffffff; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);">
                
                <!-- Fejléc -->
                <div class="sela-modal-header" style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 14px 22px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink:0;">
                            <i class="ph ph-scales"></i>
                        </div>
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">Sela Terméksúlyok és Kategóriák</h2>
                                <span id="mgr-header-total-badge" style="font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 2px 7px; border-radius: 5px;">0 db termék</span>
                            </div>
                            <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">
                                Tekintsd át és szerkeszd az elmentett termékek kategóriáit és darabsúlyait. A Sela export ezek alapján számolja a csomagsúlyokat.
                            </p>
                        </div>
                    </div>
                    <button type="button" class="sela-modal-close" id="btn-mgr-close" style="background:none; border:none; font-size:24px; color:#94a3b8; cursor:pointer;">&times;</button>
                </div>

                <!-- Műveleti és Kereső Sáv -->
                <div style="padding: 10px 22px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display:flex; align-items:center; gap: 10px; flex-wrap: wrap;">
                    
                    <!-- Keresőmező -->
                    <div style="position: relative; flex: 1; min-width: 220px;">
                        <i class="ph ph-magnifying-glass" style="position: absolute; left: 10px; top: 9px; color: #94a3b8; font-size: 15px;"></i>
                        <input type="text" id="mgr-search-input" placeholder="Gyorskeresés terméknév, méret vagy SKU alapján..." style="width: 100%; border: 1.5px solid #cbd5e1; border-radius: 7px; padding: 6px 10px 6px 32px; font-size: 12.5px; outline: none; font-family: inherit;">
                    </div>

                    <!-- Beolvasás a rendelésekből Gomb -->
                    <button type="button" id="btn-mgr-scan-orders" style="display: inline-flex; align-items: center; gap: 6px; padding: 6.5px 12px; font-size: 12px; font-weight: 700; border-radius: 7px; background: #f0fdf4; border: 1.5px solid #86efac; color: #15803d; cursor: pointer; transition: all .15s; white-space: nowrap;" title="Átvizsgálja a betöltött Shopify rendeléseket és hozzáadja az ismeretlen termékeket javasolt súlyokkal">
                        <i class="ph ph-arrow-down-left" style="font-size: 15px;"></i>
                        <span>Rendelésekből beolvasás</span>
                    </button>

                    <!-- Új termék hozzáadása kapcsoló Gomb -->
                    <button type="button" id="btn-mgr-toggle-add" style="display: inline-flex; align-items: center; gap: 6px; padding: 6.5px 12px; font-size: 12px; font-weight: 700; border-radius: 7px; background: #f0f9ff; border: 1.5px solid #7dd3fc; color: #0369a1; cursor: pointer; transition: all .15s; white-space: nowrap;">
                        <i class="ph ph-plus-circle" style="font-size: 15px;"></i>
                        <span>+ Új termék</span>
                    </button>
                </div>

                <!-- Lenylió Új Termék Rögzítése Kártya -->
                <div id="mgr-add-card" style="display: none; background: #f8fafc; border-bottom: 1.5px solid #cbd5e1; padding: 12px 22px;">
                    <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                        <i class="ph ph-plus-circle" style="color: #0284c7;"></i>
                        <span>Új terméksúly rögzítése a rendszerbe</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <input type="text" id="new-item-name" placeholder="Termék megnevezése és mérete (pl. PB-05 Falpanel 280x122)" style="flex: 2; min-width: 200px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px; outline: none;">
                        <select id="new-item-category" style="flex: 1; min-width: 150px; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; font-family: inherit; background: #ffffff;">
                            ${sortedCategories.map(c => `
                                <option value="${c.key}">${c.label}</option>
                            `).join('')}
                        </select>
                        <div style="display: inline-flex; align-items: center; gap: 4px;">
                            <input type="number" step="0.01" min="0" id="new-item-weight" placeholder="Súly" value="16.00" style="width: 70px; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12.5px; font-weight: 700; text-align: right; color: #0284c7;">
                            <span style="font-size: 12px; color: #64748b; font-weight: 600;">kg/db</span>
                        </div>
                        <input type="text" id="new-item-sku" placeholder="SKU (opcionális)" style="width: 120px; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; outline: none; font-family: monospace;">
                        <button type="button" id="btn-mgr-do-add" style="padding: 6px 14px; font-size: 12px; font-weight: 700; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="ph ph-check"></i>
                            <span>Hozzáadás</span>
                        </button>
                    </div>
                </div>

                <!-- Kategória Szűrő Fül (Filter Chips) -->
                <div id="mgr-category-tabs" style="padding: 8px 22px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; user-select: none;">
                    <!-- JS tölti fel a gombokat és darabszámokat -->
                </div>

                <!-- Csoportosított Terméklista Táblázat (Görgethető) -->
                <div id="mgr-grouped-content" style="flex: 1; overflow-y: auto; padding: 12px 22px; max-height: 54vh; background: #f8fafc;">
                    <!-- JS tölti fel a kategória csoportokat -->
                </div>

                <!-- Lábléc -->
                <div style="padding: 12px 22px; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; border-radius: 0 0 16px 16px;">
                    <div style="font-size: 12px; color: #64748b;" id="mgr-footer-stats">
                        <!-- Összesítés -->
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button type="button" class="btn btn-secondary" id="btn-mgr-cancel" style="padding: 7px 16px; font-size: 12.5px; font-weight: 600; border-radius: 7px; cursor: pointer;">
                            Bezárás
                        </button>
                        <button type="button" class="btn btn-primary" id="btn-mgr-save" style="padding: 7px 18px; font-size: 12.5px; font-weight: 700; border-radius: 7px; background: #0284c7; color: #fff; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(2,132,199,0.25);">
                            <i class="ph ph-floppy-disk" style="font-size: 16px;"></i>
                            <span>Változtatások Mentése</span>
                        </button>
                    </div>
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
        const categoryTabsContainer = overlay.querySelector('#mgr-category-tabs');
        const groupedContent = overlay.querySelector('#mgr-grouped-content');
        const headerTotalBadge = overlay.querySelector('#mgr-header-total-badge');
        const footerStats = overlay.querySelector('#mgr-footer-stats');
        const btnToggleAdd = overlay.querySelector('#btn-mgr-toggle-add');
        const addCard = overlay.querySelector('#mgr-add-card');
        const btnDoAdd = overlay.querySelector('#btn-mgr-do-add');
        const btnScanOrders = overlay.querySelector('#btn-mgr-scan-orders');

        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Új termék panel váltó
        if (btnToggleAdd && addCard) {
            btnToggleAdd.addEventListener('click', () => {
                const isHidden = addCard.style.display === 'none';
                addCard.style.display = isHidden ? 'block' : 'none';
                if (isHidden) {
                    const inp = overlay.querySelector('#new-item-name');
                    if (inp) inp.focus();
                }
            });
        }

        // Új termék hozzáadása gomb
        if (btnDoAdd) {
            btnDoAdd.addEventListener('click', () => {
                const nameInp = overlay.querySelector('#new-item-name');
                const catSel = overlay.querySelector('#new-item-category');
                const weightInp = overlay.querySelector('#new-item-weight');
                const skuInp = overlay.querySelector('#new-item-sku');

                const nameVal = (nameInp?.value || '').trim();
                const weightVal = parseFloat(weightInp?.value);
                const catVal = catSel?.value || 'other';
                const skuVal = (skuInp?.value || '').trim();

                if (!nameVal) {
                    CustomDialog.alert('Kérlek add meg a termék nevét és méretét!', 'Hiányzó adat', 'warning');
                    return;
                }
                if (isNaN(weightVal) || weightVal < 0) {
                    CustomDialog.alert('Kérlek érvényes, nem negatív súlyt adj meg!', 'Hibás súly', 'warning');
                    return;
                }

                const key = SelaWeightService.getItemWeightKey({ name: nameVal, sku: skuVal }) || nameVal.toLowerCase();
                workingEntries[key] = {
                    key,
                    name: nameVal,
                    sku: skuVal,
                    category: catVal,
                    weight: Math.round(weightVal * 100) / 100
                };

                nameInp.value = '';
                skuInp.value = '';
                addCard.style.display = 'none';

                renderGroupedView();
            });
        }

        // Rendelésekből beolvasás
        if (btnScanOrders) {
            btnScanOrders.addEventListener('click', () => {
                const orders = (typeof Store !== 'undefined' && Array.isArray(Store.shopifyHubOrders)) ? Store.shopifyHubOrders : [];
                if (orders.length === 0) {
                    CustomDialog.alert('Nincsenek betöltött rendelések a memóriában. Nyisd meg a Rendelésáttekintőt a rendelések betöltéséhez!', 'Nincs rendelés', 'info');
                    return;
                }

                let addedCount = 0;
                orders.forEach(order => {
                    (order.items || []).forEach(item => {
                        const checkItems = [];
                        if (item.isCollapsedProfile && Array.isArray(item.subItems) && item.subItems.length > 0) {
                            checkItems.push(...item.subItems);
                        } else {
                            checkItems.push(item);
                        }

                        checkItems.forEach(it => {
                            const key = SelaWeightService.getItemWeightKey(it);
                            if (!key) return;
                            if (!workingEntries[key]) {
                                let displayName = SelaWeightService.cleanItemNameForSelaWeight(it.name || it.title || '');
                                const variantTitle = (it.variantTitle || it.variant_title || '').trim();
                                if (variantTitle && variantTitle.toLowerCase() !== 'default title' && !displayName.toLowerCase().includes(variantTitle.toLowerCase())) {
                                    displayName = `${displayName} - ${variantTitle}`;
                                }
                                const category = SelaWeightService.detectItemCategory(displayName);
                                const suggested = SelaWeightService.suggestWeightForItem({ ...it, name: displayName });

                                workingEntries[key] = {
                                    key,
                                    name: displayName || it.name || 'Névtelen termék',
                                    sku: it.sku || '',
                                    category: category,
                                    weight: suggested
                                };
                                addedCount++;
                            }
                        });
                    });
                });

                if (addedCount > 0) {
                    renderGroupedView();
                    CustomDialog.alert(`${addedCount} db új termék sikeresen beolvasva a betöltött rendelésekből! A változtatások érvényesítéséhez kattints a 'Változtatások Mentése' gombra.`, 'Beolvasás Sikeres', 'success');
                } else {
                    CustomDialog.alert('A betöltött rendelésekben szereplő összes termék darabsúlya már rögzítve van!', 'Minden termék ismert', 'info');
                }
            });
        }

        // Kereső input
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearchQuery = (e.target.value || '').toLowerCase().trim();
                renderGroupedView();
            });
        }

        // Fő Render Függvény (Kategóriánkénti Csoportosítás)
        function renderGroupedView() {
            const allItems = Object.values(workingEntries);

            // Darabszámok kategóriánként (kereséstől függetlenül)
            const catCounts = { all: allItems.length };
            sortedCategories.forEach(c => { catCounts[c.key] = 0; });
            allItems.forEach(item => {
                const c = item.category || 'other';
                if (catCounts[c] !== undefined) catCounts[c]++;
                else catCounts.other = (catCounts.other || 0) + 1;
            });

            // Fejléc és lábléc statisztikák
            if (headerTotalBadge) {
                headerTotalBadge.textContent = `${allItems.length} db termék`;
            }
            if (footerStats) {
                const parts = sortedCategories
                    .filter(c => catCounts[c.key] > 0)
                    .map(c => `${c.shortLabel}: <strong>${catCounts[c.key]}</strong>`);
                footerStats.innerHTML = `Összesen: <strong>${allItems.length} db</strong> rögzített terméksúly (${parts.join(' | ')})`;
            }

            // Kategória gombok (tabs) kirajzolása (Magyar ábécé sorrendben)
            const tabButtonsHtml = [
                `
                <button type="button" class="mgr-cat-tab-btn ${currentCategoryFilter === 'all' ? 'active' : ''}" data-cat="all" style="padding: 3px 9px; border-radius: 12px; border: 1.5px solid ${currentCategoryFilter === 'all' ? '#0f172a' : '#cbd5e1'}; background: ${currentCategoryFilter === 'all' ? '#0f172a' : '#ffffff'}; color: ${currentCategoryFilter === 'all' ? '#ffffff' : '#334155'}; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                    <span>Mind</span>
                    <span style="background: ${currentCategoryFilter === 'all' ? 'rgba(255,255,255,0.3)' : '#e2e8f0'}; color: ${currentCategoryFilter === 'all' ? '#ffffff' : '#475569'}; padding: 0 5px; border-radius: 6px; font-size: 10px;">${catCounts.all}</span>
                </button>
                `
            ];

            sortedCategories.forEach(cat => {
                const isActive = currentCategoryFilter === cat.key;
                const count = catCounts[cat.key] || 0;
                tabButtonsHtml.push(`
                    <button type="button" class="mgr-cat-tab-btn ${isActive ? 'active' : ''}" data-cat="${cat.key}" style="padding: 3px 9px; border-radius: 12px; border: 1.5px solid ${isActive ? cat.badgeColor : '#cbd5e1'}; background: ${isActive ? cat.badgeBg : '#ffffff'}; color: ${isActive ? cat.badgeColor : '#334155'}; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="ph ${cat.icon}"></i>
                        <span>${cat.shortLabel}</span>
                        <span style="background: ${isActive ? cat.badgeColor : '#e2e8f0'}; color: ${isActive ? '#ffffff' : '#475569'}; padding: 0 5px; border-radius: 6px; font-size: 10px;">${count}</span>
                    </button>
                `);
            });

            categoryTabsContainer.innerHTML = tabButtonsHtml.join('');

            // Eseménykezelők a kategória fülekre
            categoryTabsContainer.querySelectorAll('.mgr-cat-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentCategoryFilter = btn.dataset.cat;
                    renderGroupedView();
                });
            });

            // Szűrt tételek
            const filteredItems = allItems.filter(item => {
                if (currentCategoryFilter !== 'all' && item.category !== currentCategoryFilter) {
                    return false;
                }
                if (currentSearchQuery) {
                    const matchName = (item.name || '').toLowerCase().includes(currentSearchQuery);
                    const matchSku = (item.sku || '').toLowerCase().includes(currentSearchQuery);
                    const matchKey = (item.key || '').toLowerCase().includes(currentSearchQuery);
                    if (!matchName && !matchSku && !matchKey) return false;
                }
                return true;
            });

            if (filteredItems.length === 0) {
                groupedContent.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; background: #ffffff; border-radius: 12px; border: 1px dashed #cbd5e1;">
                        <i class="ph ph-magnifying-glass" style="font-size: 36px; color: #94a3b8; display: block; margin-bottom: 8px;"></i>
                        <div style="font-size: 14px; font-weight: 700; color: #334155;">Nincs találat a megadott feltételekre</div>
                        <p style="font-size: 12px; color: #64748b; margin: 4px 0 12px 0;">
                            ${allItems.length === 0 ? 'Még egyetlen terméksúly sincs elmentve. Olvasd be a termékeket a rendelésekből a fenti gombbal!' : 'Próbálj más keresőkifejezést vagy kattints a "Mind" fülre!'}
                        </p>
                        ${currentSearchQuery || currentCategoryFilter !== 'all' ? `
                            <button type="button" id="btn-reset-filters" style="padding: 5px 12px; font-size: 11.5px; font-weight: 700; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; color: #0284c7; cursor: pointer;">
                                Szűrők törlése
                            </button>
                        ` : ''}
                    </div>
                `;

                const resetBtn = groupedContent.querySelector('#btn-reset-filters');
                if (resetBtn) {
                    resetBtn.addEventListener('click', () => {
                        currentCategoryFilter = 'all';
                        currentSearchQuery = '';
                        if (searchInput) searchInput.value = '';
                        renderGroupedView();
                    });
                }
                return;
            }

            // Csoportosítás a kategória konfiguráció szerint (Magyar ábécé sorrendben)
            const categoryGroupsHtml = [];

            sortedCategories.forEach(cat => {
                const itemsInCat = filteredItems
                    .filter(i => (i.category || 'other') === cat.key)
                    .sort((a, b) => {
                        const nameA = (a.name || a.key || '').trim();
                        const nameB = (b.name || b.key || '').trim();
                        return nameA.localeCompare(nameB, 'hu', { sensitivity: 'base', numeric: true });
                    });
                if (itemsInCat.length === 0) return;

                const rowsHtml = itemsInCat.map((item, idx) => {
                    return `
                        <tr class="manager-weight-row" data-key="${item.key}" style="border-bottom: 1px solid #f1f5f9; transition: background .15s;">
                            <td style="color:#94a3b8; font-size:11px; text-align:center; padding: 6px 4px; width: 32px;">${idx + 1}.</td>
                            <td style="padding: 6px 8px;">
                                <div style="font-weight:700; color:#0f172a; font-size:12.5px; line-height:1.35; word-break:break-word;">
                                    ${item.name}
                                </div>
                                ${item.sku ? `<div style="font-size:11px; color:#64748b; font-family:monospace; margin-top:2px;">SKU: ${item.sku}</div>` : ''}
                            </td>
                            <td style="padding: 6px 8px; width: 170px;">
                                <select class="manager-category-select" data-key="${item.key}" style="width: 100%; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 11.5px; font-family: inherit; background: #ffffff; color: #334155; outline: none; cursor: pointer;">
                                    ${sortedCategories.map(c => `
                                        <option value="${c.key}" ${item.category === c.key ? 'selected' : ''}>${c.shortLabel}</option>
                                    `).join('')}
                                </select>
                            </td>
                            <td style="padding: 6px 8px; text-align:right; width: 125px;">
                                <div style="display:inline-flex; align-items:center; gap:4px;">
                                    <input type="number" 
                                           step="0.01" 
                                           min="0" 
                                           class="manager-weight-input" 
                                           data-key="${item.key}" 
                                           value="${item.weight}" 
                                           style="width: 68px; padding: 4px 6px; border: 1.5px solid #cbd5e1; border-radius: 5px; font-size: 12.5px; font-weight: 700; text-align: right; color: #0284c7; outline: none; background: #f8fafc; transition: all .15s;">
                                    <span style="font-size:11px; color:#64748b; font-weight: 600;">kg/db</span>
                                </div>
                            </td>
                            <td style="padding: 6px 4px; text-align:center; width: 45px;">
                                <button type="button" class="btn-delete-weight" data-key="${item.key}" title="Terméksúly törlése" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:4px 6px; border-radius:4px; transition: all .15s;">
                                    <i class="ph ph-trash" style="font-size:16px;"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');

                categoryGroupsHtml.push(`
                    <div class="sela-category-card" style="margin-bottom: 14px; background: #ffffff; border-radius: 10px; border: 1px solid ${cat.headerBorder}; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                        
                        <!-- Kategória Csoport Fejléc -->
                        <div style="background: ${cat.headerBg}; border-bottom: 1px solid ${cat.headerBorder}; padding: 7px 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="width: 26px; height: 26px; border-radius: 6px; background: #ffffff; color: ${cat.headerColor}; display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.06);">
                                    <i class="ph ${cat.icon}"></i>
                                </div>
                                <span style="font-size: 13px; font-weight: 700; color: ${cat.headerColor};">${cat.label}</span>
                                <span style="font-size: 10.5px; font-weight: 700; background: #ffffff; color: ${cat.headerColor}; border: 1px solid ${cat.headerBorder}; padding: 1px 6px; border-radius: 10px;">${itemsInCat.length} db termék</span>
                            </div>
                            <div style="font-size: 11px; color: ${cat.headerColor}; opacity: 0.85; font-style: italic;">
                                ${cat.hint}
                            </div>
                        </div>

                        <!-- Kategória Táblázat -->
                        <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
                            <thead>
                                <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b; text-align: left; font-size: 11px; background: #fafafa;">
                                    <th style="padding: 5px 4px; text-align: center; width: 32px;">#</th>
                                    <th style="padding: 5px 8px;">Terméknév & Méret</th>
                                    <th style="padding: 5px 8px; width: 170px;">Kategória</th>
                                    <th style="padding: 5px 8px; text-align: right; width: 125px;">Súly</th>
                                    <th style="padding: 5px 4px; text-align: center; width: 45px;">Törlés</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>

                    </div>
                `);
            });

            groupedContent.innerHTML = categoryGroupsHtml.join('');

            // Eseménykezelők: Kategória módosítás a sorban
            groupedContent.querySelectorAll('.manager-category-select').forEach(sel => {
                sel.addEventListener('change', (e) => {
                    const key = sel.dataset.key;
                    if (workingEntries[key]) {
                        workingEntries[key].category = sel.value;
                        // Ha épp egy specifikus kategóriára van szűrve, frissítsük a nézetet
                        if (currentCategoryFilter !== 'all') {
                            renderGroupedView();
                        }
                    }
                });
            });

            // Eseménykezelők: Súly módosítás a sorban
            groupedContent.querySelectorAll('.manager-weight-input').forEach(inp => {
                inp.addEventListener('input', (e) => {
                    const key = inp.dataset.key;
                    const val = parseFloat(inp.value);
                    if (workingEntries[key] && !isNaN(val) && val >= 0) {
                        workingEntries[key].weight = val;
                        inp.style.borderColor = '#0284c7';
                        inp.style.background = '#f0f9ff';
                    }
                });
            });

            // Eseménykezelők: Törlés gomb
            groupedContent.querySelectorAll('.btn-delete-weight').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const key = btn.dataset.key;
                    const entry = workingEntries[key];
                    const itemName = entry ? entry.name : key;

                    const confirmed = await CustomDialog.confirm(`Biztosan törölni szeretnéd a(z) "${itemName}" elmentett súlyát?`, 'Terméksúly törlése');
                    if (confirmed) {
                        delete workingEntries[key];
                        await SelaWeightService.deleteProductWeight(key);
                        renderGroupedView();
                    }
                });
            });
        }

        // Első renderelés indítása
        renderGroupedView();

        // Mentés gomb eseménykezelő
        if (btnSave) {
            btnSave.addEventListener('click', async () => {
                // Aktuális inputok beolvasása a DOM-ból a biztonság kedvéért
                overlay.querySelectorAll('.manager-weight-input').forEach(inp => {
                    const key = inp.dataset.key;
                    const val = parseFloat(inp.value);
                    if (workingEntries[key] && !isNaN(val) && val >= 0) {
                        workingEntries[key].weight = val;
                    }
                });

                overlay.querySelectorAll('.manager-category-select').forEach(sel => {
                    const key = sel.dataset.key;
                    if (workingEntries[key]) {
                        workingEntries[key].category = sel.value;
                    }
                });

                btnSave.disabled = true;
                btnSave.innerHTML = `<i class="ph ph-spinner ph-spin" style="font-size:16px;"></i> Mentés...`;

                try {
                    await SelaWeightService.saveProductWeights(workingEntries);
                    closeModal();
                    await CustomDialog.alert(`A terméksúlyok és kategóriák (${Object.keys(workingEntries).length} db) sikeresen elmentve a felhőbe és a memóriába!`, 'Sikeres Mentés', 'success');
                } catch (e) {
                    console.error('[SelaMissingWeightsModal] Mentési hiba:', e);
                    btnSave.disabled = false;
                    btnSave.innerHTML = `<i class="ph ph-floppy-disk"></i> Változtatások Mentése`;
                    await CustomDialog.alert('Hiba történt a súlyok mentésekor!', 'Hiba', 'error');
                }
            });
        }
    }
};
