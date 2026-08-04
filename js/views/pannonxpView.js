/**
 * PannonXP Nézet (View) - Fő modul
 * Kezeli a PannonXP Címkekonvertáló felületét és delegálja a feladatokat az al-moduloknak.
 */

import { PannonXPService } from '../services/pannonxp.js';
import { renderOrdersTable } from './pannonxp/pannonxpTable.js';
import { showSettingsModal, showDetailedPackagesModal, showConfigureProductModal } from './pannonxp/pannonxpSettings.js';

export const PannonXPView = {
    render(container, orders, onExport) {
        if (!container) return;
        
        const profiles = PannonXPService.getSenderProfiles();
        const activeId = PannonXPService.getActiveProfileId();
        
        container.innerHTML = `
            <div class="pxp-view-container" style="display: flex; flex-direction: column; gap: 20px; width: 100%; padding: 20px; box-sizing: border-box;">
                
                <!-- Egyoszlopos letisztult elrendezés: Rendelések táblázat és vezérlők -->
                <div class="pxp-card orders-card" style="background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.5); padding: 20px; box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.04); min-height: 400px; display: flex; flex-direction: column;">
                    
                    <!-- Felső sáv: Profilválasztó, Beállítások fogaskerék és Export gomb -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 15px; flex-wrap: wrap;">
                        <div>
                            <h3 style="margin: 0; font-size: 16px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                                <i class="ph-bold ph-package" style="color: var(--primary-color);"></i>
                                Címzettek és Csomagok
                            </h3>
                            <p style="margin: 3px 0 0 0; font-size: 12px; color: var(--text-muted);" id="pxp-order-count">Nincs betöltött rendelés</p>
                        </div>
                        
                        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                            <!-- Egyszerűsített feladó profil választó -->
                            <div style="display: flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.9); padding: 4px 10px; border-radius: 10px; border: 1px solid #cbd5e1;">
                                <span style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Feladó:</span>
                                <select id="pxp-profile-select" style="border: none; background: transparent; font-size: 13px; font-family: inherit; font-weight: 600; color: #0f172a; cursor: pointer; outline: none;">
                                    ${profiles.map(p => `<option value="${p.id}" ${p.id === activeId ? 'selected' : ''}>${p.profileName}</option>`).join('')}
                                </select>
                            </div>
                            
                            <!-- Beállítások fogaskerék gomb -->
                            <button type="button" id="pxp-btn-settings" title="Rendszerbeállítások" style="padding: 10px; border-radius: 10px; border: 1px solid #cbd5e1; background: #fff; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;">
                                <i class="ph-bold ph-gear" style="font-size: 18px;"></i>
                            </button>
                            
                            <button id="pxp-btn-export" class="btn btn-primary" style="padding: 10px 16px; font-weight: 600; font-size: 13px;" disabled>
                                <i class="ph-bold ph-download-simple"></i>
                                PannonXP CSV Exportálása
                            </button>
                        </div>
                    </div>
                    
                    <!-- Táblázat konténer -->
                    <div style="flex: 1; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                            <thead>
                                <tr style="background: #f8fafc; border-bottom: 1.5px solid #e2e8f0; color: #475569; font-weight: 600;">
                                    <th style="padding: 12px 10px; width: 40px; text-align: center;">
                                        <input type="checkbox" id="pxp-select-all" checked style="cursor: pointer; width: 16px; height: 16px;">
                                    </th>
                                    <th style="padding: 12px 10px; width: 80px;">Rendelés</th>
                                    <th style="padding: 12px 10px; width: 150px;">Címzett Név</th>
                                    <th style="padding: 12px 10px;">Szállítási Cím</th>
                                    <th style="padding: 12px 10px; width: 110px;">Telefonszám</th>
                                    <th style="padding: 12px 10px; width: 180px;">Referencia (Max 40 kar.)</th>
                                    <th style="padding: 12px 10px; width: 100px; text-align: right;">Utánvét</th>
                                    <th style="padding: 12px 10px; width: 85px; text-align: center;">Csomag</th>
                                    <th style="padding: 12px 10px; width: 85px; text-align: center;">Súly (kg)</th>
                                </tr>
                            </thead>
                            <tbody id="pxp-table-body">
                                <tr>
                                    <td colspan="9" style="padding: 40px; text-align: center; color: var(--text-muted);">
                                        Húzd ide vagy tallózd be a Shopify CSV-t az importáláshoz!
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                </div>
            </div>
        `;
        
        // Profil váltás eseménykezelő
        const profileSelect = document.getElementById('pxp-profile-select');
        if (profileSelect) {
            profileSelect.addEventListener('change', (e) => {
                PannonXPService.setActiveProfileId(e.target.value);
                this.render(container, orders, onExport);
            });
        }
        
        // Beállítások gomb eseménykezelő
        const settingsBtn = document.getElementById('pxp-btn-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettingsModal(container, orders, onExport);
            });
        }
        
        // Exportálás indítása
        const exportBtn = document.getElementById('pxp-btn-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (typeof onExport === 'function') {
                    onExport();
                }
            });
        }
        
        this.renderOrders(container, orders, onExport);
    },
    
    renderOrders(container, orders, onExport) {
        if (!container && typeof document !== 'undefined') {
            container = document.getElementById('pannonxp-container');
        }
        renderOrdersTable(container, orders, onExport, this);
    },
    
    showDetailedPackagesModal(order, onSave) {
        showDetailedPackagesModal(order, onSave);
    },

    showConfigureProductModal(order, originalName, cleanedName, defaultAbbrev = '', defaultCategoryId = '', onSave) {
        showConfigureProductModal(order, originalName, cleanedName, defaultAbbrev, defaultCategoryId, onSave);
    },

    showSettingsModal(container, orders, onExport) {
        showSettingsModal(container, orders, onExport, this);
    }
};
