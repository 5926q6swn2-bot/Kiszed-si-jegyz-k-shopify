/**
 * PannonXP Nézet (View)
 * Kezeli a PannonXP Címkekonvertáló felületét.
 */

import { PannonXPService } from '../services/pannonxp.js';
import { CustomDialog } from '../utils/dialog.js';

export const PannonXPView = {
    render(container, orders, onExport) {
        if (!container) return;
        
        const profiles = PannonXPService.getSenderProfiles();
        const activeId = PannonXPService.getActiveProfileId();
        const sender = PannonXPService.getActiveProfile();
        
        container.innerHTML = `
            <div class="pxp-view-container" style="display: flex; flex-direction: column; gap: 20px; width: 100%; padding: 20px; box-sizing: border-box;">
                
                <!-- Kétoszlopos elrendezés: Bal oldal a Beállítások, Jobb oldal a Rendelések táblázat -->
                <div class="pxp-layout-grid" style="display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: start;">
                    
                    <!-- BAL OLDAL: Feladó adatok (Glassmorphism kártya görgethetően) -->
                    <div class="pxp-card sender-config-card" style="background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.5); padding: 18px; box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.04); max-height: calc(100vh - 120px); overflow-y: auto; display: flex; flex-direction: column; gap: 14px;">
                        
                        <h3 style="margin: 0; font-size: 16px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                            <i class="ph-bold ph-gear" style="color: var(--primary-color);"></i>
                            Feladó Beállítások
                        </h3>
                        
                        <!-- Profil Választó és Műveletek -->
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px; display: block;">Aktív Feladó Profil</label>
                            <div style="display: flex; gap: 6px; align-items: center;">
                                <select id="pxp-profile-select" style="flex: 1; padding: 8px 10px; font-size: 13px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; font-family: inherit; font-weight: 600; color: #0f172a;">
                                    ${profiles.map(p => `<option value="${p.id}" ${p.id === activeId ? 'selected' : ''}>${p.profileName}</option>`).join('')}
                                </select>
                                <button type="button" id="pxp-btn-new-profile" title="Új profil létrehozása" style="padding: 8px 10px; border-radius: 8px; border: 1px solid #cbd5e1; background: #eff6ff; color: #1e40af; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;">
                                    <i class="ph-bold ph-plus" style="font-size: 16px;"></i>
                                </button>
                                <button type="button" id="pxp-btn-delete-profile" title="Profil törlése" style="padding: 8px 10px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fee2e2; color: #b91c1c; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;">
                                    <i class="ph-bold ph-trash" style="font-size: 16px;"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div style="height: 1px; background: #e2e8f0; width: 100%;"></div>

                        <form id="pxp-sender-form" style="display: flex; flex-direction: column; gap: 10px;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">PXP Ügyfélkód</label>
                                <input type="text" id="pxp-s-code" value="${sender.uc_ugyfelkod || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Feladó Cégneve</label>
                                <input type="text" id="pxp-s-company" value="${sender.uc_ceg_nev || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Kapcsolattartó neve</label>
                                <input type="text" id="pxp-s-name" value="${sender.uc_nev || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Telefonszám</label>
                                <input type="text" id="pxp-s-phone" value="${sender.uc_tel || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">E-mail cím</label>
                                <input type="email" id="pxp-s-email" value="${sender.uc_email || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 85px 1fr; gap: 8px;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Irsz.</label>
                                    <input type="text" id="pxp-s-zip" value="${sender.uc_ceg_cim_iranyito || ''}" required style="padding: 8px 12px; font-size: 13px; text-align: center;">
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Település</label>
                                    <input type="text" id="pxp-s-city" value="${sender.uc_ceg_cim_telepules || ''}" required style="padding: 8px 12px; font-size: 13px;">
                                </div>
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Közterület, házszám</label>
                                <input type="text" id="pxp-s-street" value="${sender.uc_ceg_cim_kozterulet || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Adószám</label>
                                <input type="text" id="pxp-s-tax" value="${sender.uc_ceg_adoszam || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Bankszámlaszám</label>
                                <input type="text" id="pxp-s-bank" value="${sender.uc_ceg_bankszamlaszam || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 8px;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Csomag tartalma</label>
                                <input type="text" id="pxp-s-content" value="${sender.szl_tartalom || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            
                            <button type="submit" class="btn btn-secondary" style="justify-content: center; padding: 10px; font-size: 13px;">
                                Profil Mentése
                            </button>
                        </form>
                    </div>
                    
                    <!-- JOBB OLDAL: Rendelések listája -->
                    <div class="pxp-card orders-card" style="background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.5); padding: 20px; box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.04); min-height: 400px; display: flex; flex-direction: column;">
                        
                        <!-- Fejléc keresővel és letöltés gombbal -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; gap: 15px; flex-wrap: wrap;">
                            <div>
                                <h3 style="margin: 0; font-size: 16px; color: var(--text-primary);">Címzettek és Csomagok</h3>
                                <p style="margin: 3px 0 0 0; font-size: 12px; color: var(--text-muted);" id="pxp-order-count">Nincs betöltött rendelés</p>
                            </div>
                            
                            <div style="display: flex; gap: 8px; align-items: center;">
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
                                        <th style="padding: 12px 10px; width: 100px; text-align: right;">Utánvét</th>
                                        <th style="padding: 12px 10px; width: 70px; text-align: center;">Csomag</th>
                                        <th style="padding: 12px 10px; width: 85px; text-align: center;">Súly (kg)</th>
                                    </tr>
                                </thead>
                                <tbody id="pxp-table-body">
                                    <tr>
                                        <td colspan="8" style="padding: 40px; text-align: center; color: var(--text-muted);">
                                            Húzd ide vagy tallózd be a Shopify CSV-t az importáláshoz!
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                    </div>
                    
                </div>
            </div>
        `;
        
        // Eseménykezelők a profil váltáshoz
        const profileSelect = document.getElementById('pxp-profile-select');
        profileSelect.addEventListener('change', (e) => {
            PannonXPService.setActiveProfileId(e.target.value);
            this.render(container, orders, onExport);
        });
        
        // Új profil gomb
        const newProfileBtn = document.getElementById('pxp-btn-new-profile');
        newProfileBtn.addEventListener('click', async () => {
            const overlay = document.getElementById('custom-dialog-overlay');
            if (overlay) {
                document.getElementById('cd-icon').className = 'cd-icon info';
                document.getElementById('cd-icon').innerHTML = '<i class="ph-bold ph-plus-circle" style="font-size:32px;color:#3b82f6;"></i>';
                document.getElementById('cd-title').textContent = 'Új feladó profil';
                document.getElementById('cd-msg').textContent = 'Add meg az új feladó profil nevét:';
                
                const input = document.getElementById('cd-input');
                input.style.display = 'block';
                input.value = '';
                input.placeholder = 'Pl.: Capsula Houses Új';
                
                document.getElementById('cd-btn-cancel').style.display = 'block';
                
                const confirmBtn = document.getElementById('cd-btn-confirm');
                confirmBtn.onclick = () => {
                    const name = input.value.trim();
                    if (name) {
                        const allProfiles = PannonXPService.getSenderProfiles();
                        const currentActive = PannonXPService.getActiveProfile();
                        const newId = 'profile_' + Date.now();
                        
                        const newProfile = { ...currentActive, id: newId, profileName: name };
                        allProfiles.push(newProfile);
                        PannonXPService.saveSenderProfiles(allProfiles);
                        PannonXPService.setActiveProfileId(newId);
                        
                        overlay.classList.remove('active');
                        this.render(container, orders, onExport);
                    }
                };
                
                document.getElementById('cd-btn-cancel').onclick = () => {
                    overlay.classList.remove('active');
                };
                
                overlay.classList.add('active');
                input.focus();
            } else {
                const name = prompt('Add meg az új feladó profil nevét:');
                if (name) {
                    const allProfiles = PannonXPService.getSenderProfiles();
                    const currentActive = PannonXPService.getActiveProfile();
                    const newId = 'profile_' + Date.now();
                    const newProfile = { ...currentActive, id: newId, profileName: name };
                    allProfiles.push(newProfile);
                    PannonXPService.saveSenderProfiles(allProfiles);
                    PannonXPService.setActiveProfileId(newId);
                    this.render(container, orders, onExport);
                }
            }
        });
        
        // Profil törlés gomb
        const deleteProfileBtn = document.getElementById('pxp-btn-delete-profile');
        deleteProfileBtn.addEventListener('click', async () => {
            const currentProfiles = PannonXPService.getSenderProfiles();
            if (currentProfiles.length <= 1) {
                CustomDialog.alert('Az utolsó feladó profilt nem lehet törölni!', 'Hiba', 'error');
                return;
            }
            
            const activeProfile = PannonXPService.getActiveProfile();
            const confirmed = await CustomDialog.confirm(`Biztosan törlöd a(z) <strong>${activeProfile.profileName}</strong> feladó profilt?`, 'Profil törlése', 'warning', true);
            if (confirmed) {
                const updated = currentProfiles.filter(p => p.id !== activeProfile.id);
                PannonXPService.saveSenderProfiles(updated);
                PannonXPService.setActiveProfileId(updated[0].id);
                this.render(container, orders, onExport);
            }
        });
        
        // Eseménykezelő a profil mentéshez
        const senderForm = document.getElementById('pxp-sender-form');
        senderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const activeProfile = PannonXPService.getActiveProfile();
            
            const updatedProfile = {
                id: activeProfile.id,
                profileName: activeProfile.profileName,
                uc_ugyfelkod: document.getElementById('pxp-s-code').value.trim(),
                uc_ceg_nev: document.getElementById('pxp-s-company').value.trim(),
                uc_nev: document.getElementById('pxp-s-name').value.trim(),
                uc_tel: document.getElementById('pxp-s-phone').value.trim(),
                uc_email: document.getElementById('pxp-s-email').value.trim(),
                uc_ceg_cim_iranyito: document.getElementById('pxp-s-zip').value.trim(),
                uc_ceg_cim_telepules: document.getElementById('pxp-s-city').value.trim(),
                uc_ceg_cim_orszag: '36',
                uc_ceg_cim_kozterulet: document.getElementById('pxp-s-street').value.trim(),
                uc_ceg_adoszam: document.getElementById('pxp-s-tax').value.trim(),
                uc_ceg_bankszamlaszam: document.getElementById('pxp-s-bank').value.trim(),
                szl_tartalom: document.getElementById('pxp-s-content').value.trim()
            };
            
            const allProfiles = PannonXPService.getSenderProfiles();
            const index = allProfiles.findIndex(p => p.id === activeProfile.id);
            if (index !== -1) {
                allProfiles[index] = updatedProfile;
            } else {
                allProfiles.push(updatedProfile);
            }
            
            PannonXPService.saveSenderProfiles(allProfiles);
            
            const overlay = document.getElementById('custom-dialog-overlay');
            if (overlay) {
                document.getElementById('cd-icon').className = 'cd-icon success';
                document.getElementById('cd-icon').innerHTML = '<i class="ph-bold ph-check-circle" style="font-size:32px;color:#10b981;"></i>';
                document.getElementById('cd-title').textContent = 'Mentve!';
                document.getElementById('cd-msg').textContent = `A(z) "${activeProfile.profileName}" feladó profil sikeresen frissítve lett.`;
                document.getElementById('cd-input').style.display = 'none';
                document.getElementById('cd-btn-cancel').style.display = 'none';
                
                const confirmBtn = document.getElementById('cd-btn-confirm');
                confirmBtn.onclick = () => overlay.classList.remove('active');
                overlay.classList.add('active');
            } else {
                alert('Profil elmentve!');
            }
        });
        
        // Exportálás indítása
        const exportBtn = document.getElementById('pxp-btn-export');
        exportBtn.addEventListener('click', () => {
            if (typeof onExport === 'function') {
                onExport();
            }
        });
        
        this.renderOrders(orders);
    },
    
    renderOrders(orders) {
        const tbody = document.getElementById('pxp-table-body');
        const countText = document.getElementById('pxp-order-count');
        const exportBtn = document.getElementById('pxp-btn-export');
        
        if (!tbody) return;
        
        const fileInput = document.getElementById('file-input');
        
        if (!orders || orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: 40px; text-align: center; color: var(--text-muted);">
                        Húzd ide vagy tallózd be a Shopify CSV-t az importáláshoz!
                    </td>
                </tr>
            `;
            tbody.style.cursor = 'pointer';
            tbody.onclick = () => {
                if (fileInput) fileInput.click();
            };
            countText.textContent = 'Nincs betöltött rendelés';
            exportBtn.disabled = true;
            return;
        }
        
        tbody.onclick = null;
        tbody.style.cursor = '';
        countText.textContent = `${orders.length} db megrendelés betöltve`;
        exportBtn.disabled = false;
        
        tbody.innerHTML = orders.map((order, index) => {
            const hasPhone = !!order.shippingPhone;
            const hasZip = !!order.zip;
            const hasError = !hasPhone || !hasZip;
            
            if (order.pxp_csomagszam === undefined) order.pxp_csomagszam = 1;
            if (order.pxp_suly === undefined) order.pxp_suly = 0.5;
            if (order.pxp_selected === undefined) order.pxp_selected = true;
            
            const codFormatted = order.isCOD ? new Intl.NumberFormat('hu-HU').format(Math.round(order.codAmount)) + ' Ft' : '-';
            
            return `
                <tr style="border-bottom: 1px solid #e2e8f0; ${hasError ? 'background: #fffbeb;' : ''}">
                    <td style="padding: 10px; text-align: center;">
                        <input type="checkbox" class="pxp-order-select" data-index="${index}" ${order.pxp_selected ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
                    </td>
                    <td style="padding: 10px; font-weight: 600; color: #0f172a;">${order.id}</td>
                    <td style="padding: 10px; font-weight: 500;">
                        ${order.shippingName}
                        ${!hasPhone ? '<span style="display:block;font-size:10px;color:#b45309;font-weight:bold;">⚠️ Hiányzó telefon!</span>' : ''}
                    </td>
                    <td style="padding: 10px; color: #334155;">
                        ${order.fullAddress || order.address}
                        ${!hasZip ? '<span style="display:block;font-size:10px;color:#b45309;font-weight:bold;">⚠️ Hiányzó irányítószám!</span>' : ''}
                    </td>
                    <td style="padding: 10px;">${order.shippingPhone || '-'}</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: ${order.isCOD ? '#0f172a' : '#94a3b8'};">
                        ${codFormatted}
                    </td>
                    <td style="padding: 10px; text-align: center;">
                        <input type="number" class="pxp-input-csomagszam" data-index="${index}" min="1" max="99" value="${order.pxp_csomagszam}" style="width: 50px; padding: 4px; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px;">
                    </td>
                    <td style="padding: 10px; text-align: center;">
                        <input type="number" class="pxp-input-suly" data-index="${index}" min="0.01" step="0.01" value="${order.pxp_suly}" style="width: 65px; padding: 4px; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px;">
                    </td>
                </tr>
            `;
        }).join('');
        
        // Eseménykezelők a soronkénti értékek változtatásához
        const selects = tbody.querySelectorAll('.pxp-order-select');
        selects.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                orders[idx].pxp_selected = e.target.checked;
            });
        });
        
        const selectAll = document.getElementById('pxp-select-all');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                const checked = e.target.checked;
                orders.forEach(o => o.pxp_selected = checked);
                tbody.querySelectorAll('.pxp-order-select').forEach(cb => cb.checked = checked);
            });
        }
        
        const csomagszamInputs = tbody.querySelectorAll('.pxp-input-csomagszam');
        csomagszamInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                let val = parseInt(e.target.value);
                if (isNaN(val) || val < 1) val = 1;
                orders[idx].pxp_csomagszam = val;
                e.target.value = val;
            });
        });
        
        const sulyInputs = tbody.querySelectorAll('.pxp-input-suly');
        sulyInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                let val = parseFloat(e.target.value);
                if (isNaN(val) || val <= 0) val = 0.5;
                orders[idx].pxp_suly = val;
                e.target.value = val;
            });
        });
    }
};
