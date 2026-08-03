/**
 * PannonXP Nézet (View)
 * Kezeli a PannonXP Címkekonvertáló felületét.
 */

import { PannonXPService } from '../services/pannonxp.js?v=206';
import { CustomDialog } from '../utils/dialog.js';
import { formatHungarianPhoneNumber } from '../utils/phoneFormatter.js?v=150';
import { ShopifyParser, cleanItemNameForMapping, fixHungarianAccents, cleanName, cleanAddress, checkAddressValidity, parseHungarianAddress } from '../services/shopify.js?v=206';

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
        profileSelect.addEventListener('change', (e) => {
            PannonXPService.setActiveProfileId(e.target.value);
            this.render(container, orders, onExport);
        });
        
        // Beállítások gomb eseménykezelő
        const settingsBtn = document.getElementById('pxp-btn-settings');
        settingsBtn.addEventListener('click', () => {
            this.showSettingsModal(container, orders, onExport);
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
                    <td colspan="9" style="padding: 40px; text-align: center; color: var(--text-muted);">
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
        tbody.onclick = null;
        tbody.style.cursor = '';
        countText.textContent = `${orders.length} db megrendelés betöltve`;
        
        const updateExportState = () => {
            const selectedOrders = orders.filter(o => o.pxp_selected);
            const hasErrors = selectedOrders.some(o => {
                const hasZip = !!o.zip;
                const isAddrInvalid = checkAddressValidity(o);
                const activeM = PannonXPService.getNormalizedProductMappings();
                const hasUnmapped = o.items.some(item => !activeM[cleanItemNameForMapping(item.name)]);
                const hasUnassignedCategory = o.items.some(item => {
                    const m = activeM[cleanItemNameForMapping(item.name)];
                    return m && !m.categoryId;
                });
                const hasRemovedError = o.errors && o.errors.some(err => err.title === "Törölt tétel!");
                const isPendingDeposit = o.isBankDeposit && !o.isPaid;
                
                return isAddrInvalid || !hasZip || !!o.pxp_has_unmatched || hasUnmapped || hasUnassignedCategory || hasRemovedError || isPendingDeposit;
            });
            exportBtn.disabled = selectedOrders.length === 0 || hasErrors;
            if (hasErrors) {
                exportBtn.style.opacity = '0.6';
                exportBtn.title = 'Nem exportálható hibás (piros) rendelésekkel!';
            } else {
                exportBtn.style.opacity = '';
                exportBtn.title = '';
            }
        };
        
        tbody.innerHTML = orders.map((order, index) => {
            const hasZip = !!order.zip;
            const activeM = PannonXPService.getNormalizedProductMappings();
            const unmappedItems = order.items.filter(item => !activeM[cleanItemNameForMapping(item.name)]);
            const hasUnmappedProduct = unmappedItems.length > 0;
            
            const unassignedCategoryItems = order.items.filter(item => {
                const m = activeM[cleanItemNameForMapping(item.name)];
                return m && !m.categoryId;
            });
            const hasUnassignedCategory = unassignedCategoryItems.length > 0;
            
            const removedError = order.errors ? order.errors.find(err => err.title === "Törölt tétel!") : null;
            const hasRemovedError = !!removedError;
            const isPendingDeposit = order.isBankDeposit && !order.isPaid;
            const isAddrInvalid = checkAddressValidity(order);
            
            const hasUnmatched = !!order.pxp_has_unmatched || hasUnmappedProduct || hasUnassignedCategory;
            const hasError = isAddrInvalid || !hasZip || hasUnmatched || hasRemovedError || isPendingDeposit;
            
            if (order.pxp_csomagszam === undefined) order.pxp_csomagszam = 1;
            if (order.pxp_suly === undefined) order.pxp_suly = 0.5;
            if (order.pxp_selected === undefined) order.pxp_selected = true;
            
            let itemsPreviewHtml = '';
            if (order.items && order.items.length > 0) {
                itemsPreviewHtml = `
                    <div style="font-size: 11px; color: #475569; margin-top: 5px; background: rgba(15, 23, 42, 0.03); border: 1px solid rgba(15, 23, 42, 0.08); padding: 5px 8px; border-radius: 6px; display: inline-flex; flex-direction: column; gap: 3px; max-width: 250px;">
                        ${order.items.map((item, itemIdx) => `
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%;">
                                <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
                                    <input type="number" class="pxp-input-item-qty" data-order-index="${index}" data-item-index="${itemIdx}" value="${item.qty}" min="0" required style="width: 42px; padding: 2px 4px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 10px; font-weight: bold; text-align: center; box-sizing: border-box;">
                                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 11px;"><strong>${item.name}</strong></span>
                                </div>
                                <button type="button" class="pxp-btn-delete-item" data-order-index="${index}" data-item-index="${itemIdx}" title="Termék eltávolítása ebből a címkéből" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0; font-size: 13px; display: flex; align-items: center; justify-content: center; opacity: 0.7; transition: opacity 0.15s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                                    <i class="ph-bold ph-trash" style="font-size: 11px;"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                itemsPreviewHtml = `<div style="font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 4px;">Nincsenek termékek</div>`;
            }
            
            let warningMessage = '';
            if (isPendingDeposit) {
                warningMessage += `
                <span style="display:block;font-size:10px;color:#dc2626;font-weight:bold;margin-top:4px;" class="pxp-pending-deposit-span">
                    ⚠️ Függő utalás (Bank Deposit) - Nincs fizetve!
                </span>
                `;
            }
            if (hasRemovedError) {
                warningMessage += `
                <span style="display:block;font-size:10px;color:#dc2626;font-weight:bold;margin-top:4px;" class="pxp-removed-error-span">
                    ⚠️ Törölt tétel van a megrendelésben, kérlek ellenőrizd a Shopifyban!
                    <button type="button" class="btn-ack-pxp-removed btn-sm" data-order-index="${index}" data-err-id="${removedError.id}" style="margin-left: 6px; padding: 2px 6px; font-size: 9px; font-weight: 700; background: #dc2626; color: #fff; border: none; border-radius: 4px; cursor: pointer; transition: all 0.15s; vertical-align: middle;" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'">Ellenőrizve</button>
                </span>
                `;
            }
            if (hasUnmappedProduct) {
                warningMessage += unmappedItems.map(item => {
                    const cleanedName = cleanItemNameForMapping(item.name);
                    return `
                    <span style="display:block;font-size:10px;color:#dc2626;font-weight:bold;margin-top:2px;" class="pxp-unmapped-span">
                        ⚠️ Rövidítés hiányzik: ${cleanedName}
                        <button type="button" class="btn-quick-add-mapping btn-sm" data-order-index="${index}" data-original-name="${item.name}" data-name="${cleanedName}" style="margin-left: 6px; padding: 2px 6px; font-size: 9px; font-weight: 700; background: #dc2626; color: #fff; border: none; border-radius: 4px; cursor: pointer; transition: all 0.15s; vertical-align: middle;" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'">Hozzáadás</button>
                    </span>
                    `;
                }).join('');
            }
            if (hasUnassignedCategory) {
                warningMessage += unassignedCategoryItems.map(item => {
                    const cleanedName = cleanItemNameForMapping(item.name);
                    return `
                    <span style="display:block;font-size:10px;color:#dc2626;font-weight:bold;margin-top:2px;" class="pxp-unassigned-cat-span">
                        ⚠️ Nincs kategória rendelve: ${cleanedName}
                        <button type="button" class="btn-quick-assign-cat btn-sm" data-order-index="${index}" data-original-name="${item.name}" data-name="${cleanedName}" style="margin-left: 6px; padding: 2px 6px; font-size: 9px; font-weight: 700; background: #ea580c; color: #fff; border: none; border-radius: 4px; cursor: pointer; transition: all 0.15s; vertical-align: middle;" onmouseover="this.style.background='#c2410c'" onmouseout="this.style.background='#ea580c'">Hozzárendelés</button>
                    </span>
                    `;
                }).join('');
            }
            if (order.pxp_has_unmatched && !hasUnmappedProduct && !hasUnassignedCategory) {
                warningMessage += '<span style="display:block;font-size:10px;color:#dc2626;font-weight:bold;margin-top:4px;">⚠️ Ismeretlen termékcsalád!</span>';
            }
            
            return `
                <tr style="border-bottom: 1px solid #e2e8f0; ${hasError ? 'background: #fef2f2;' : ''}">
                    <td style="padding: 10px; text-align: center;">
                        <input type="checkbox" class="pxp-order-select" data-index="${index}" ${order.pxp_selected ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
                    </td>
                    <td style="padding: 10px; font-weight: 600; color: #0f172a;">${order.id}</td>
                    <td style="padding: 10px; font-weight: 500;">
                        <input type="text" class="pxp-input-name" data-index="${index}" value="${(order.shippingName || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 11px; font-weight: 600; margin-bottom: 4px;">
                        ${itemsPreviewHtml}
                        ${warningMessage}
                    </td>
                    <td style="padding: 10px; color: #334155;">
                        <input type="text" class="pxp-input-address" data-index="${index}" value="${(order.fullAddress || order.address || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 11px;">
                        ${!hasZip ? '<span style="display:block;font-size:10px;color:#dc2626;font-weight:bold;margin-top:4px;">⚠️ Hiányzó irányítószám!</span>' : ''}
                        ${hasZip && isAddrInvalid ? '<span style="display:block;font-size:10px;color:#dc2626;font-weight:bold;margin-top:4px;">⚠️ Hiányos szállítási cím (Házszám hiányzik, hívni kell a vásárlót)!</span>' : ''}
                    </td>
                    <td style="padding: 10px;">
                        <input type="text" class="pxp-input-phone" data-index="${index}" value="${order.shippingPhone || ''}" style="width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 11px;">
                    </td>
                    <td style="padding: 10px;">
                        <input type="text" class="pxp-input-referencia" data-index="${index}" value="${order.pxp_referencia || ''}" maxlength="40" style="width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 11px;">
                    </td>
                    <td style="padding: 10px; text-align: right;">
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                            <input type="number" class="pxp-input-cod" data-index="${index}" value="${order.isCOD ? Math.round(order.codAmount) : 0}" style="width: 75px; padding: 4px; text-align: right; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: bold; font-size: 12px;">
                            <span style="font-size: 11px; color: #64748b; font-weight: 600;">Ft</span>
                        </div>
                    </td>
                    <td style="padding: 10px; text-align: center;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                            <input type="number" class="pxp-input-csomagszam" data-index="${index}" min="1" max="99" value="${order.pxp_csomagszam}" style="width: 45px; padding: 4px; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px;">
                            <button class="pxp-btn-edit-details btn-sm" data-index="${index}" title="Csomagok részletei" style="background: none; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569; transition: all 0.15s;">
                                <i class="ph-bold ph-package" style="font-size: 14px;"></i>
                            </button>
                        </div>
                    </td>
                    <td style="padding: 10px; text-align: center;">
                        <input type="number" class="pxp-input-suly" data-index="${index}" min="0.01" step="0.01" value="${order.pxp_suly}" style="width: 65px; padding: 4px; text-align: center; border: 1px solid #cbd5e1; border-radius: 6px;">
                    </td>
                </tr>
            `;
        }).join('');
        
        updateExportState();
        
        // Eseménykezelők a soronkénti értékek változtatásához
        const selects = tbody.querySelectorAll('.pxp-order-select');
        selects.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                orders[idx].pxp_selected = e.target.checked;
                updateExportState();
            });
        });

        const addressInputs = tbody.querySelectorAll('.pxp-input-address');
        addressInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                const order = orders[idx];
                const addrVal = cleanAddress(e.target.value.trim());
                order.fullAddress = addrVal;
                order.address = addrVal;
                
                const parsed = parseHungarianAddress(addrVal);
                order.zip = parsed.zip;
                order.city = parsed.city;
                order.address1 = parsed.street.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
                order.address2 = '';
                
                if (!checkAddressValidity(order) && order.errors) {
                    order.errors = order.errors.filter(err => err.type !== 'address' && !/hiányos szállítási cím|házszám/i.test(err.title));
                }

                this.renderOrders(orders);
            });
        });

        const nameInputs = tbody.querySelectorAll('.pxp-input-name');
        nameInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                orders[idx].shippingName = cleanName(e.target.value.trim());
                e.target.value = orders[idx].shippingName;
            });
        });

        const phoneInputs = tbody.querySelectorAll('.pxp-input-phone');
        phoneInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                orders[idx].shippingPhone = e.target.value.trim();
            });
        });

        const referenciaInputs = tbody.querySelectorAll('.pxp-input-referencia');
        referenciaInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                orders[idx].pxp_referencia = e.target.value.trim();
            });
        });
        
        // Listener for inline COD editing
        const codInputs = tbody.querySelectorAll('.pxp-input-cod');
        codInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                let val = parseFloat(e.target.value);
                if (isNaN(val) || val < 0) val = 0;
                
                const order = orders[idx];
                order.codAmount = val;
                order.isCOD = val > 0;
                e.target.value = val;
                
                updateExportState();
            });
        });

        // Listener for product item quantity changes
        const itemQtyInputs = tbody.querySelectorAll('.pxp-input-item-qty');
        itemQtyInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const orderIdx = parseInt(e.target.dataset.orderIndex);
                const itemIdx = parseInt(e.target.dataset.itemIndex);
                const newQty = parseInt(e.target.value) || 0;
                const order = orders[orderIdx];
                
                if (newQty <= 0) {
                    // Ha a mennyiség 0, töröljük a tételt
                    order.items.splice(itemIdx, 1);
                } else {
                    order.items[itemIdx].qty = newQty;
                }
                
                // Újraszámoljuk a referenciaszámot, súlyt és csomagszámokat
                const calc = PannonXPService.calculateWeightAndPackages(order.items);
                order.pxp_csomagszam = calc.packages;
                order.pxp_suly = calc.weight;
                order.pxp_packages = calc.packagesDetail;
                
                if (ShopifyParser.generateDefaultReference) {
                    order.pxp_referencia = ShopifyParser.generateDefaultReference(order, 40);
                }
                
                const activeM = PannonXPService.getNormalizedProductMappings();
                order.pxp_has_unmatched = calc.hasUnmatched || order.items.some(item => !activeM[cleanItemNameForMapping(item.name)]);
                
                this.renderOrders(orders);
            });
        });

        // Listener for product item deletion
        const deleteItemBtns = tbody.querySelectorAll('.pxp-btn-delete-item');
        deleteItemBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderIdx = parseInt(btn.dataset.orderIndex);
                const itemIdx = parseInt(btn.dataset.itemIndex);
                const order = orders[orderIdx];
                
                // Remove item from list
                order.items.splice(itemIdx, 1);
                
                // Recalculate weights, packages and reference
                const calc = PannonXPService.calculateWeightAndPackages(order.items);
                order.pxp_csomagszam = calc.packages;
                order.pxp_suly = calc.weight;
                order.pxp_packages = calc.packagesDetail;
                
                if (ShopifyParser.generateDefaultReference) {
                    order.pxp_referencia = ShopifyParser.generateDefaultReference(order, 40);
                }
                
                const activeM = PannonXPService.getNormalizedProductMappings();
                order.pxp_has_unmatched = calc.hasUnmatched || order.items.some(item => !activeM[cleanItemNameForMapping(item.name)]);
                
                // Re-render table row and view
                this.renderOrders(orders);
            });
        });

        // Listener for acknowledging removed tag errors
        const ackRemovedBtns = tbody.querySelectorAll('.btn-ack-pxp-removed');
        ackRemovedBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.orderIndex);
                const errId = btn.dataset.errId;
                const order = orders[idx];
                if (order && order.errors) {
                    order.errors = order.errors.filter(err => err.id !== errId);
                    this.renderOrders(orders);
                }
            });
        });
        
        const selectAll = document.getElementById('pxp-select-all');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                const checked = e.target.checked;
                orders.forEach(o => o.pxp_selected = checked);
                tbody.querySelectorAll('.pxp-order-select').forEach(cb => cb.checked = checked);
                updateExportState();
            });
        }
        
        const csomagszamInputs = tbody.querySelectorAll('.pxp-input-csomagszam');
        csomagszamInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                let val = parseInt(e.target.value);
                if (isNaN(val) || val < 1) val = 1;
                
                const order = orders[idx];
                order.pxp_csomagszam = val;
                e.target.value = val;
                
                // Adjust pxp_packages to match the new csomagszam
                if (!order.pxp_packages) {
                    order.pxp_packages = PannonXPService.calculateWeightAndPackages(order.items).packagesDetail || [];
                }
                
                const diff = val - order.pxp_packages.length;
                if (diff > 0) {
                    const sulyPerPkg = order.pxp_suly / val;
                    order.pxp_packages.forEach(p => p.suly = sulyPerPkg);
                    for (let i = 0; i < diff; i++) {
                        order.pxp_packages.push({
                            suly: sulyPerPkg,
                            hosszusag: 30,
                            szelesseg: 20,
                            magassag: 10,
                            tipus: "doboz"
                        });
                    }
                } else if (diff < 0) {
                    order.pxp_packages = order.pxp_packages.slice(0, val);
                    const sulyPerPkg = order.pxp_suly / val;
                    order.pxp_packages.forEach(p => p.suly = sulyPerPkg);
                }
            });
        });
        
        const sulyInputs = tbody.querySelectorAll('.pxp-input-suly');
        sulyInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                let val = parseFloat(e.target.value);
                if (isNaN(val) || val <= 0) val = 0.5;
                
                const order = orders[idx];
                order.pxp_suly = val;
                e.target.value = val;
                
                if (!order.pxp_packages) {
                    order.pxp_packages = PannonXPService.calculateWeightAndPackages(order.items).packagesDetail || [];
                }
                
                const count = order.pxp_packages.length;
                const sulyPerPkg = val / count;
                order.pxp_packages.forEach(p => p.suly = sulyPerPkg);
            });
        });
        
        const editDetailsBtns = tbody.querySelectorAll('.pxp-btn-edit-details');
        editDetailsBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.index);
                this.showDetailedPackagesModal(orders[idx], () => {
                    this.renderOrders(orders);
                });
            });
        });

        // Gyors termékrövidítés hozzáadása gomb eseménykezelő
        const quickAddBtns = tbody.querySelectorAll('.btn-quick-add-mapping');
        quickAddBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderIndex = parseInt(btn.dataset.orderIndex);
                const order = orders[orderIndex];
                const originalName = btn.dataset.originalName;
                const cleanedName = btn.dataset.name;
                
                // Guess category
                let guessedCategoryId = 'cat_acoustic';
                const cleanNameLower = cleanedName.toLowerCase();
                if (/(ragasztó|t-rex|trex|ragaszto|hpr)/i.test(cleanNameLower)) guessedCategoryId = 'cat_adhesive';
                else if (/profil/i.test(cleanNameLower)) guessedCategoryId = 'cat_profile';
                else if (/(wood|spc\s*wood)/i.test(cleanNameLower)) guessedCategoryId = 'cat_spcwood';
                else if (/(stone|spc\s*stone)/i.test(cleanNameLower)) guessedCategoryId = 'cat_spcstone';

                this.showConfigureProductModal(order, originalName, cleanedName, '', guessedCategoryId, () => {
                    // Rendelések adatainak újraszámolása a frissített mapping-ek alapján
                    if (orders && Array.isArray(orders)) {
                        orders.forEach(o => {
                            o.pxp_referencia = ShopifyParser.generateDefaultReference ? ShopifyParser.generateDefaultReference(o, 40) : o.pxp_referencia;
                            const calc = PannonXPService.calculateWeightAndPackages(o.items);
                            o.pxp_csomagszam = calc.packages;
                            o.pxp_suly = calc.weight;
                            o.pxp_packages = calc.packagesDetail;
                            o.pxp_has_unmatched = calc.hasUnmatched || o.items.some(item => {
                                const activeM = PannonXPService.getNormalizedProductMappings();
                                return !activeM[cleanItemNameForMapping(item.name)];
                            });
                        });
                    }
                    
                    // Nézet frissítése
                    this.renderOrders(orders);
                });
            });
        });
        // Gyors kategória hozzárendelése gomb eseménykezelő
        const quickAssignCatBtns = tbody.querySelectorAll('.btn-quick-assign-cat');
        quickAssignCatBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderIndex = parseInt(btn.dataset.orderIndex);
                const order = orders[orderIndex];
                const originalName = btn.dataset.originalName;
                const cleanedName = btn.dataset.name;
                
                const activeMappings = PannonXPService.getProductMappings() || {};
                const currentMapping = activeMappings[originalName] || {};
                const currentAbbrev = currentMapping.abbrev || '';
                
                this.showConfigureProductModal(order, originalName, cleanedName, currentAbbrev, '', () => {
                    // Rendelések adatainak újraszámolása a frissített mapping-ek alapján
                    if (orders && Array.isArray(orders)) {
                        orders.forEach(o => {
                            o.pxp_referencia = ShopifyParser.generateDefaultReference ? ShopifyParser.generateDefaultReference(o, 40) : o.pxp_referencia;
                            const calc = PannonXPService.calculateWeightAndPackages(o.items);
                            o.pxp_csomagszam = calc.packages;
                            o.pxp_suly = calc.weight;
                            o.pxp_packages = calc.packagesDetail;
                            o.pxp_has_unmatched = calc.hasUnmatched || o.items.some(item => {
                                const activeM = PannonXPService.getNormalizedProductMappings();
                                return !activeM[cleanItemNameForMapping(item.name)];
                            });
                        });
                    }
                    
                    // Nézet frissítése
                    this.renderOrders(orders);
                });
            });
        });
    },
    
    showDetailedPackagesModal(order, onSave) {
        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay active no-print';
        overlay.style.zIndex = '10000';
        
        if (!order.pxp_packages) {
            order.pxp_packages = PannonXPService.calculateWeightAndPackages(order.items).packagesDetail || [];
        }
        
        let tempPackages = JSON.parse(JSON.stringify(order.pxp_packages));
        
        overlay.innerHTML = `
            <div class="custom-dialog-box" style="max-width: 480px; width: 90%; max-height: 85vh; display: flex; flex-direction: column; padding: 20px;">
                <h3 style="margin-top: 0; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                    <i class="ph-bold ph-package" style="color: var(--primary-color);"></i>
                    Csomagok részletei: ${order.id}
                </h3>
                <p style="margin: 0 0 15px 0; font-size: 13px; color: var(--text-muted);">
                    Módosítsd az egyes csomagok méreteit és súlyait, vagy adj hozzá újakat.
                </p>
                
                <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 4px;" id="pxp-modal-pkg-list">
                </div>

                <button type="button" id="pxp-modal-btn-add-pkg" class="cd-btn cd-btn-secondary" style="margin: 10px 0; width:100%; display:flex; align-items:center; justify-content:center; gap:6px;">
                    <i class="ph-bold ph-plus-circle"></i> Új csomag hozzáadása
                </button>
                
                <div class="cd-actions" style="margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="pxp-modal-btn-cancel" class="cd-btn cd-btn-secondary" style="margin:0;">Mégse</button>
                    <button id="pxp-modal-btn-save" class="cd-btn cd-btn-primary" style="margin:0;">Mentés</button>
                </div>
            </div>
        `;
        
        const pkgListContainer = overlay.querySelector('#pxp-modal-pkg-list');
        
        const renderPkgList = () => {
            pkgListContainer.innerHTML = tempPackages.map((pkg, idx) => `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px;" class="pkg-modal-row" data-idx="${idx}">
                    <div style="font-weight: 700; font-size: 12px; color: #1e293b; display: flex; justify-content: space-between; align-items: center;">
                        <span>${idx + 1}. Csomag</span>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-weight: normal; font-size: 11px; color: #64748b;">${pkg.description || ''}</span>
                            <button type="button" class="btn-delete-pkg" data-idx="${idx}" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:14px; padding:2px; display:flex; align-items:center;" title="Csomag törlése">
                                <i class="ph-bold ph-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px;">
                        <div>
                            <label style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">Súly (kg)</label>
                            <input type="number" class="pkg-edit-suly" data-idx="${idx}" value="${pkg.suly}" step="0.01" min="0.01" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">Hossz (cm)</label>
                            <input type="number" class="pkg-edit-hossz" data-idx="${idx}" value="${pkg.hosszusag}" min="1" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">Szél. (cm)</label>
                            <input type="number" class="pkg-edit-szel" data-idx="${idx}" value="${pkg.szelesseg}" min="1" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">Mag. (cm)</label>
                            <input type="number" class="pkg-edit-mag" data-idx="${idx}" value="${pkg.magassag}" min="1" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; box-sizing: border-box;">
                        </div>
                    </div>
                </div>
            `).join('');
            
            const sulyInputs = pkgListContainer.querySelectorAll('.pkg-edit-suly');
            const hosszInputs = pkgListContainer.querySelectorAll('.pkg-edit-hossz');
            const szelInputs = pkgListContainer.querySelectorAll('.pkg-edit-szel');
            const magInputs = pkgListContainer.querySelectorAll('.pkg-edit-mag');
            
            sulyInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    const idx = parseInt(e.target.dataset.idx);
                    tempPackages[idx].suly = parseFloat(e.target.value) || 0.5;
                });
            });
            hosszInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    const idx = parseInt(e.target.dataset.idx);
                    tempPackages[idx].hosszusag = parseInt(e.target.value) || 30;
                });
            });
            szelInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    const idx = parseInt(e.target.dataset.idx);
                    tempPackages[idx].szelesseg = parseInt(e.target.value) || 20;
                });
            });
            magInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    const idx = parseInt(e.target.dataset.idx);
                    tempPackages[idx].magassag = parseInt(e.target.value) || 10;
                });
            });
            
            pkgListContainer.querySelectorAll('.btn-delete-pkg').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.idx);
                    tempPackages.splice(idx, 1);
                    renderPkgList();
                });
            });
        };
        
        document.body.appendChild(overlay);
        renderPkgList();
        
        const addPkgBtn = overlay.querySelector('#pxp-modal-btn-add-pkg');
        addPkgBtn.addEventListener('click', () => {
            tempPackages.push({
                suly: 1.0,
                hosszusag: 30,
                szelesseg: 20,
                magassag: 10,
                tipus: "doboz",
                description: "Panelburkolatok és kiegészítők"
            });
            renderPkgList();
        });
        
        const cancelBtn = overlay.querySelector('#pxp-modal-btn-cancel');
        const saveBtn = overlay.querySelector('#pxp-modal-btn-save');
        
        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });
        
        saveBtn.addEventListener('click', () => {
            if (tempPackages.length === 0) {
                tempPackages.push({
                    suly: 1.0,
                    hosszusag: 30,
                    szelesseg: 20,
                    magassag: 10,
                    tipus: "doboz",
                    description: "Panelburkolatok és kiegészítők"
                });
            }
            
            order.pxp_packages = tempPackages;
            order.pxp_csomagszam = tempPackages.length;
            order.pxp_suly = parseFloat(tempPackages.reduce((sum, p) => sum + p.suly, 0).toFixed(2));
            
            overlay.remove();
            if (typeof onSave === 'function') {
                onSave();
            }
        });
    },
    
    showConfigureProductModal(order, originalName, cleanedName, defaultAbbrev, defaultCategoryId, onSave) {
        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay active no-print';
        overlay.style.zIndex = '10000';
        
        const rules = PannonXPService.getPackagingRules();
        const categories = rules.categories || [];
        
        const itemsListHtml = order.items.map(it => `
            <li style="margin-bottom: 6px; font-size: 13px; color: #334155; text-align: left;">
                <strong style="color: #0f172a;">${it.qty} db</strong> - ${it.name}
            </li>
        `).join('');

        overlay.innerHTML = `
            <div class="custom-dialog-box" style="max-width: 440px; width: 90%; max-height: 85vh; display: flex; flex-direction: column; padding: 20px;">
                <h3 style="margin-top: 0; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                    <i class="ph-bold ph-gear" style="color: var(--primary-color);"></i>
                    Termék beállítása PannonXP-hez
                </h3>
                
                <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; margin-bottom: 15px;">
                    <div style="text-align: left; font-family: inherit;">
                        <p style="margin-top: 0; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #1e293b;">
                            A megrendelésben (${order.id}) lévő termékek:
                        </p>
                        <ul style="margin: 0 0 15px 0; padding-left: 20px; list-style-type: disc;">
                            ${itemsListHtml}
                        </ul>
                        
                        <p style="margin-bottom: 6px; font-size: 13px; color: #475569;">
                            Kiválasztott termék: <strong style="color: var(--primary-color); word-break: break-all;">"${cleanedName}"</strong>
                        </p>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">1. Termékrövidítés (max 15-20 karakter ajánlott):</label>
                        <input type="text" id="pxp-modal-abbrev-input" value="${defaultAbbrev}" placeholder="pl. Sonoma2, trex5, ezustsorolo" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; color: #0f172a; outline: none; background: #fff;">
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">2. Csomagolási Kategória:</label>
                        <select id="pxp-modal-cat-select" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; color: #0f172a; outline: none; background: #fff;">
                            <option value="">-- Válassz kategóriát --</option>
                            ${categories.map(c => `<option value="${c.id}" ${c.id === defaultCategoryId ? 'selected' : ''}>${c.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="cd-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin: 0;">
                    <button id="pxp-modal-btn-cancel" class="cd-btn cd-btn-secondary" style="margin:0;">Mégse</button>
                    <button id="pxp-modal-btn-save" class="cd-btn cd-btn-primary" style="margin:0;">Mentés</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        const cancelBtn = overlay.querySelector('#pxp-modal-btn-cancel');
        const saveBtn = overlay.querySelector('#pxp-modal-btn-save');
        const abbrevInput = overlay.querySelector('#pxp-modal-abbrev-input');
        const catSelect = overlay.querySelector('#pxp-modal-cat-select');
        
        abbrevInput.focus();
        
        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });
        
        saveBtn.addEventListener('click', async () => {
            const abbrev = abbrevInput.value.trim();
            const selectedCatId = catSelect.value;
            
            if (!abbrev) {
                CustomDialog.alert('Kérlek, add meg a termék rövidítését!', 'Hiányzó adat', 'warning');
                return;
            }
            if (!selectedCatId) {
                CustomDialog.alert('Kérlek, válaszd ki a termék kategóriáját!', 'Hiányzó adat', 'warning');
                return;
            }
            
            const activeMappings = PannonXPService.getProductMappings();
            activeMappings[originalName] = {
                abbrev: abbrev,
                categoryId: selectedCatId
            };
            
            await PannonXPService.saveProductMappings(activeMappings);
            overlay.remove();
            
            if (typeof onSave === 'function') {
                onSave();
            }
        });
    },
    
    showSettingsModal(container, orders, onExport) {
        const mainContainer = container;
        const overlay = document.createElement('div');
        overlay.className = 'custom-dialog-overlay active no-print';
        overlay.style.zIndex = '9999';
        
        const profiles = PannonXPService.getSenderProfiles();
        const activeId = PannonXPService.getActiveProfileId();
        const activeProfile = PannonXPService.getActiveProfile();
        const rules = PannonXPService.getPackagingRules();
        
        overlay.innerHTML = `
            <div class="custom-dialog-box modal-large" style="max-width: 1000px; width: 95%; height: 90vh; max-height: 90vh; display: flex; flex-direction: column; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 10px;">
                    <h2 style="margin: 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                        <i class="ph-bold ph-gear" style="color: var(--primary-color);"></i>
                        PannonXP Rendszerbeállítások
                    </h2>
                    <button id="pxp-settings-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b;">
                        <i class="ph-bold ph-x"></i>
                    </button>
                </div>
                
                <!-- Beállítások fülek -->
                <div style="display: flex; gap: 4px; border-bottom: 1.5px solid #e2e8f0; margin-bottom: 15px;">
                    <button id="tab-settings-profiles" class="tab-btn active" style="padding: 10px 16px; background: none; border: none; font-weight: 600; color: var(--primary-color); border-bottom: 2px solid var(--primary-color); cursor: pointer;">
                        <i class="ph-bold ph-user-gear"></i> Feladó Profilok
                    </button>
                    <button id="tab-settings-products" class="tab-btn" style="padding: 10px 16px; background: none; border: none; font-weight: 500; color: #64748b; border-bottom: 2px solid transparent; cursor: pointer;">
                        <i class="ph-bold ph-cube"></i> Termék & Csomagolási Szabályok
                    </button>
                    <button id="tab-settings-abbreviations" class="tab-btn" style="padding: 10px 16px; background: none; border: none; font-weight: 500; color: #64748b; border-bottom: 2px solid transparent; cursor: pointer;">
                        <i class="ph-bold ph-hash"></i> Termék Rövidítések
                    </button>
                </div>
                
                <!-- Fül Tartalmak -->
                <div style="flex: 1; overflow-y: auto; padding-right: 5px;">
                    
                    <!-- 1. Fül: Feladó Profilok -->
                    <div id="settings-content-profiles" style="display: flex; flex-direction: column; gap: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #cbd5e1;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-weight: 700; font-size: 13px; color: #475569;">Profil választása szerkesztésre:</span>
                                <select id="pxp-settings-profile-select" style="padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-family: inherit; font-weight: 600; background: #fff;">
                                    ${profiles.map(p => `<option value="${p.id}" ${p.id === activeProfile.id ? 'selected' : ''}>${p.profileName}</option>`).join('')}
                                </select>
                            </div>
                            <div style="display: flex; gap: 6px;">
                                <button type="button" id="pxp-settings-btn-new-profile" class="btn btn-secondary btn-sm" style="padding: 6px 10px; font-size: 12px;">
                                    <i class="ph-bold ph-plus"></i> Új profil
                                </button>
                                <button type="button" id="pxp-settings-btn-delete-profile" class="btn btn-secondary btn-sm" style="padding: 6px 10px; font-size: 12px; background: #fee2e2; color: #b91c1c; border-color: #fca5a5;">
                                    <i class="ph-bold ph-trash"></i> Törlés
                                </button>
                            </div>
                        </div>
                        
                        <form id="pxp-settings-profile-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                             <div class="form-group" style="margin-bottom: 0; grid-column: span 2;">
                                 <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Profil Neve (Megjelenítés a listában)</label>
                                 <input type="text" id="pxp-set-s-profilename" value="${activeProfile.profileName || ''}" required style="padding: 8px 12px; font-size: 13px;">
                             </div>
                             <div class="form-group" style="margin-bottom: 0;">
                                 <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">PXP Ügyfélkód</label>
                                 <input type="text" id="pxp-set-s-code" value="${activeProfile.uc_ugyfelkod || ''}" required style="padding: 8px 12px; font-size: 13px;">
                             </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Feladó Cégneve</label>
                                <input type="text" id="pxp-set-s-company" value="${activeProfile.uc_ceg_nev || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Kapcsolattartó neve</label>
                                <input type="text" id="pxp-set-s-name" value="${activeProfile.uc_nev || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Telefonszám</label>
                                <input type="text" id="pxp-set-s-phone" value="${activeProfile.uc_tel || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0; grid-column: span 2;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">E-mail cím</label>
                                <input type="email" id="pxp-set-s-email" value="${activeProfile.uc_email || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Irányítószám</label>
                                <input type="text" id="pxp-set-s-zip" value="${activeProfile.uc_ceg_cim_iranyito || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Település</label>
                                <input type="text" id="pxp-set-s-city" value="${activeProfile.uc_ceg_cim_telepules || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0; grid-column: span 2;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Közterület, házszám</label>
                                <input type="text" id="pxp-set-s-street" value="${activeProfile.uc_ceg_cim_kozterulet || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Adószám</label>
                                <input type="text" id="pxp-set-s-tax" value="${activeProfile.uc_ceg_adoszam || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Bankszámlaszám</label>
                                <input type="text" id="pxp-set-s-bank" value="${activeProfile.uc_ceg_bankszamlaszam || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0; grid-column: span 2;">
                                <label style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Csomag tartalma (szállítási leírás)</label>
                                <input type="text" id="pxp-set-s-content" value="${activeProfile.szl_tartalom || ''}" required style="padding: 8px 12px; font-size: 13px;">
                            </div>
                            <div style="grid-column: span 2; display: flex; justify-content: flex-end; margin-top: 10px;">
                                <button type="submit" class="btn btn-primary" style="padding: 10px 20px;">Profil Adatok Mentése</button>
                            </div>
                        </form>
                    </div>
                    
                    <!-- 2. Fül: Termék és Csomagolási Szabályok -->
                    <div id="settings-content-products" style="display: none; flex-direction: column; gap: 20px;">
                        <!-- Dinamikus tartalom JS-ből -->
                    </div>
                    
                    <!-- 3. Fül: Termék Rövidítések -->
                    <div id="settings-content-abbreviations" style="display: none; flex-direction: column; gap: 15px;">
                        <!-- Dinamikus tartalom JS-ből -->
                    </div>
                    
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Initialize dynamic package dimension cards
        const renderDimensionCards = (container, prefixId, maxQty, rulesList) => {
            container.style.display = 'grid';
            container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(110px, 1fr))';
            container.style.gap = '8px';
            let html = '';
            for (let num = 1; num <= maxQty; num++) {
                const r = rulesList[num] || { weight: num * 10, width: 20, height: 10 };
                html += `
                    <div style="background: #fff; padding: 6px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 11px;">
                        <div style="font-weight: 700; margin-bottom: 6px; text-align:center; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">${num} db:</div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="font-size: 9px; color: #64748b; width: 30px; text-align: right; flex-shrink: 0; font-weight: 600;">Súly:</span>
                                <input type="number" id="pxp-r-${prefixId}-w-${num}" value="${r.weight}" step="0.1" placeholder="kg" style="flex: 1; min-width: 0; padding: 3px; font-size: 10px; text-align:center; border: 1px solid #cbd5e1; border-radius: 4px;">
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="font-size: 9px; color: #64748b; width: 30px; text-align: right; flex-shrink: 0; font-weight: 600;">Szél:</span>
                                <input type="number" id="pxp-r-${prefixId}-wd-${num}" value="${r.width}" placeholder="cm" style="flex: 1; min-width: 0; padding: 3px; font-size: 10px; text-align:center; border: 1px solid #cbd5e1; border-radius: 4px;">
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="font-size: 9px; color: #64748b; width: 30px; text-align: right; flex-shrink: 0; font-weight: 600;">Mag:</span>
                                <input type="number" id="pxp-r-${prefixId}-h-${num}" value="${r.height}" placeholder="cm" style="flex: 1; min-width: 0; padding: 3px; font-size: 10px; text-align:center; border: 1px solid #cbd5e1; border-radius: 4px;">
                            </div>
                        </div>
                    </div>
                `;
            }
            container.innerHTML = html;
        };

        const getCurrentRulesFromUI = (prefixId, currentRulesList) => {
            const current = {};
            const regex = new RegExp(`pxp-r-${prefixId}-w-(\\d+)`);
            const inputs = overlay.querySelectorAll(`[id^="pxp-r-${prefixId}-w-"]`);
            inputs.forEach(input => {
                const match = input.id.match(regex);
                if (match) {
                    const num = parseInt(match[1]);
                    const w = parseFloat(overlay.querySelector(`#pxp-r-${prefixId}-w-${num}`).value) || 0;
                    const wd = parseInt(overlay.querySelector(`#pxp-r-${prefixId}-wd-${num}`).value) || 0;
                    const h = parseInt(overlay.querySelector(`#pxp-r-${prefixId}-h-${num}`).value) || 0;
                    current[num] = { weight: w, width: wd, height: h };
                }
            });
            return { ...currentRulesList, ...current };
        };

        const bindProductTabListeners = (tabContainer) => {
            // New Category Button
            const newCatBtn = tabContainer.querySelector('#pxp-btn-new-category');
            if (newCatBtn) {
                newCatBtn.addEventListener('click', async () => {
                    const name = await CustomDialog.prompt('Add meg az új termékkategória nevét:', '', 'Kategória hozzáadása');
                    if (name) {
                        const newId = 'cat_' + Date.now();
                        rules.categories.push({
                            id: newId,
                            name: name,
                            keywords: '',
                            maxLength: 278,
                            maxQty: 5,
                            type: 'cards',
                            rules: {
                                1: { weight: 10, width: 20, height: 10 }
                            }
                        });
                        renderProductTab();
                    }
                });
            }
            
            // Delete Category Buttons
            const deleteBtns = tabContainer.querySelectorAll('.pxp-btn-delete-category');
            deleteBtns.forEach(btn => {
                btn.addEventListener('click', async () => {
                    const catId = btn.dataset.catId;
                    const cat = rules.categories.find(c => c.id === catId);
                    const confirmed = await CustomDialog.confirm(`Biztosan törlöd a(z) "${cat.name}" kategóriát?`, 'Kategória törlése');
                    if (confirmed) {
                        rules.categories = rules.categories.filter(c => c.id !== catId);
                        renderProductTab();
                    }
                });
            });
            
            // Name Change input listener
            const nameInputs = tabContainer.querySelectorAll('.cat-input-name');
            nameInputs.forEach(input => {
                input.addEventListener('change', () => {
                    const catId = input.dataset.catId;
                    const cat = rules.categories.find(c => c.id === catId);
                    if (cat) cat.name = input.value.trim();
                });
            });
            
            // Type Select change listener
            const typeSelects = tabContainer.querySelectorAll('.cat-select-type');
            typeSelects.forEach(select => {
                select.addEventListener('change', () => {
                    const catId = select.dataset.catId;
                    const cat = rules.categories.find(c => c.id === catId);
                    if (cat) {
                        cat.type = select.value;
                        if (cat.type === 'weight' && !cat.itemWeight) {
                            cat.itemWeight = 1.0;
                            cat.boxWeight = 1.0;
                            cat.width = 5;
                            cat.height = 5;
                        } else if (cat.type === 'cards' && !cat.rules) {
                            cat.rules = { 1: { weight: 10, width: 20, height: 10 } };
                        } else if (cat.type === 'adhesive') {
                            if (!cat.itemWeight) cat.itemWeight = 0.5;
                            if (!cat.maxQty) cat.maxQty = 12;
                            if (!cat.maxLength) cat.maxLength = 30;
                            if (!cat.width) cat.width = 20;
                            if (!cat.height) cat.height = 10;
                        }
                        renderProductTab();
                    }
                });
            });
            
            // MaxQty change listener (re-renders cards dynamically)
            const maxQtyInputs = tabContainer.querySelectorAll('.cat-input-maxqty');
            maxQtyInputs.forEach(input => {
                input.addEventListener('input', () => {
                    const catId = input.dataset.catId;
                    const cat = rules.categories.find(c => c.id === catId);
                    if (cat) {
                        let val = parseInt(input.value) || 1;
                        if (val < 1) val = 1;
                        if (val > 50) val = 50;
                        cat.maxQty = val;
                        
                        if (cat.type === 'cards') {
                            const cardsContainer = tabContainer.querySelector(`.cards-list-container[data-cat-id="${cat.id}"]`);
                            if (cardsContainer) {
                                cat.rules = getCurrentRulesFromUI(cat.id, cat.rules || {});
                                renderDimensionCards(cardsContainer, cat.id, val, cat.rules);
                            }
                        }
                    }
                });
            });
            
            // Length change listener
            const lengthInputs = tabContainer.querySelectorAll('.cat-input-maxlength');
            lengthInputs.forEach(input => {
                input.addEventListener('change', () => {
                    const catId = input.dataset.catId;
                    const cat = rules.categories.find(c => c.id === catId);
                    if (cat) cat.maxLength = parseInt(input.value) || 278;
                });
            });
            
            // Rules submit handler
            const form = tabContainer.querySelector('#pxp-settings-rules-form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    try {
                        rules.categories.forEach(cat => {
                            const nameInput = tabContainer.querySelector(`.cat-input-name[data-cat-id="${cat.id}"]`);
                            if (nameInput) cat.name = nameInput.value.trim();
                            
                            const maxQtyInput = tabContainer.querySelector(`.cat-input-maxqty[data-cat-id="${cat.id}"]`);
                            if (maxQtyInput) cat.maxQty = parseInt(maxQtyInput.value) || (cat.type === 'cards' ? 5 : cat.type === 'adhesive' ? 12 : 50);
                            
                            const lengthInput = tabContainer.querySelector(`.cat-input-maxlength[data-cat-id="${cat.id}"]`);
                            if (lengthInput) cat.maxLength = parseInt(lengthInput.value) || (cat.type === 'adhesive' ? 30 : 278);
                            
                            if (cat.type === 'cards') {
                                const oldRules = cat.rules || {};
                                cat.rules = {};
                                for (let num = 1; num <= cat.maxQty; num++) {
                                    const wInput = tabContainer.querySelector(`#pxp-r-${cat.id}-w-${num}`);
                                    const wdInput = tabContainer.querySelector(`#pxp-r-${cat.id}-wd-${num}`);
                                    const hInput = tabContainer.querySelector(`#pxp-r-${cat.id}-h-${num}`);
                                    
                                    cat.rules[num] = {
                                        weight: wInput ? (parseFloat(wInput.value) || 0) : ((oldRules[num] && oldRules[num].weight) || num * 10),
                                        width: wdInput ? (parseInt(wdInput.value) || 0) : ((oldRules[num] && oldRules[num].width) || 20),
                                        height: hInput ? (parseInt(hInput.value) || 0) : ((oldRules[num] && oldRules[num].height) || 10)
                                    };
                                }
                            } else if (cat.type === 'weight') {
                                const iwInput = tabContainer.querySelector(`.cat-input-itemweight[data-cat-id="${cat.id}"]`);
                                if (iwInput) cat.itemWeight = parseFloat(iwInput.value) || 1.0;
                                
                                const bwInput = tabContainer.querySelector(`.cat-input-boxweight[data-cat-id="${cat.id}"]`);
                                if (bwInput) cat.boxWeight = parseFloat(bwInput.value) || 0.0;
                                
                                const wInput = tabContainer.querySelector(`.cat-input-width[data-cat-id="${cat.id}"]`);
                                if (wInput) cat.width = parseInt(wInput.value) || 5;
                                
                                const hInput = tabContainer.querySelector(`.cat-input-height[data-cat-id="${cat.id}"]`);
                                if (hInput) cat.height = parseInt(hInput.value) || 5;
                            } else if (cat.type === 'adhesive') {
                                const iwInput = tabContainer.querySelector(`.cat-input-itemweight[data-cat-id="${cat.id}"]`);
                                if (iwInput) cat.itemWeight = parseFloat(iwInput.value) || 0.5;
                                
                                const bwInput = tabContainer.querySelector(`.cat-input-boxweight[data-cat-id="${cat.id}"]`);
                                if (bwInput) cat.boxWeight = parseFloat(bwInput.value) || 0.0;
                                
                                const wInput = tabContainer.querySelector(`.cat-input-width[data-cat-id="${cat.id}"]`);
                                if (wInput) cat.width = parseInt(wInput.value) || 20;
                                
                                const hInput = tabContainer.querySelector(`.cat-input-height[data-cat-id="${cat.id}"]`);
                                if (hInput) cat.height = parseInt(hInput.value) || 10;
                            }
                        });
                        
                        PannonXPService.savePackagingRules(rules);
                        
                        if (orders && Array.isArray(orders)) {
                            orders.forEach(order => {
                                const calc = PannonXPService.calculateWeightAndPackages(order.items);
                                order.pxp_csomagszam = calc.packages;
                                order.pxp_suly = calc.weight;
                                order.pxp_packages = calc.packagesDetail;
                                order.pxp_has_unmatched = calc.hasUnmatched;
                            });
                        }
                        
                        await CustomDialog.alert('Termék csomagolási szabályok sikeresen elmentve és újraszámolva!', 'Mentés sikeres', 'info');
                        overlay.remove();
                        this.render(container, orders, onExport);
                    } catch (err) {
                        console.error("Hiba a szabályok mentésekor:", err);
                        await CustomDialog.alert('Hiba történt a mentés során: ' + err.message, 'Mentési hiba', 'error');
                    }
                });
            }
        };

        const renderProductTab = () => {
            const container = overlay.querySelector('#settings-content-products');
            if (!container) return;
            
            let html = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span style="font-size:11px; color:#64748b; line-height:1.4;">
                        A termékeket a <b>Termék Rövidítések</b> fülön tudod közvetlenül a kívánt csomagolási kategóriához rendelni.
                    </span>
                    <button type="button" id="pxp-btn-new-category" class="btn btn-secondary btn-sm" style="padding:6px 12px; font-weight:600; display:flex; align-items:center; gap:4px; flex-shrink:0;">
                        <i class="ph-bold ph-plus"></i> Új kategória
                    </button>
                </div>
                <form id="pxp-settings-rules-form" style="display: flex; flex-direction: column; gap: 15px;">
                    <div style="display:flex; flex-direction:column; gap:16px;" id="pxp-categories-list-container">
            `;
            
            rules.categories.forEach((cat, index) => {
                const isCustom = !['cat_acoustic', 'cat_spcwood', 'cat_spcstone', 'cat_profile', 'cat_adhesive'].includes(cat.id);
                
                html += `
                    <div class="category-block" data-cat-id="${cat.id}" style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; background: #f8fafc; position:relative;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #cbd5e1; padding-bottom:6px; margin-bottom:12px;">
                            <h3 style="margin:0; font-size: 14px; color: #1e293b; display:flex; align-items:center; gap:8px;">
                                <span style="background:var(--primary-color); color:#fff; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold;">${index + 1}</span>
                                <input type="text" class="cat-input-name" data-cat-id="${cat.id}" value="${cat.name}" style="font-size:14px; font-weight:bold; border:none; background:transparent; color:#1e293b; outline:none; width:200px; border-bottom:1px dashed #cbd5e1;" placeholder="Kategória neve">
                            </h3>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <select class="cat-select-type" data-cat-id="${cat.id}" style="padding:4px 8px; border-radius:6px; border:1px solid #cbd5e1; font-size:12px; background:#fff; font-weight:600; cursor:pointer;">
                                    <option value="cards" ${cat.type === 'cards' ? 'selected' : ''}>Csomagméret kártyák</option>
                                    <option value="weight" ${cat.type === 'weight' ? 'selected' : ''}>Egységsúly + dobozsúly</option>
                                    <option value="adhesive" ${cat.type === 'adhesive' ? 'selected' : ''}>Segédanyag (csak súly)</option>
                                </select>
                                ${isCustom ? `
                                <button type="button" class="pxp-btn-delete-category" data-cat-id="${cat.id}" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center;" title="Kategória törlése">
                                    <i class="ph-bold ph-trash"></i>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                            <div class="form-group" style="margin-bottom:0;">
                                <label style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom:2px;">Max db egy csomagban</label>
                                <input type="number" class="cat-input-maxqty" data-cat-id="${cat.id}" value="${cat.maxQty || (cat.type === 'cards' ? 5 : cat.type === 'adhesive' ? 12 : 50)}" style="padding: 6px 10px; font-size: 12px; width:100%; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:6px;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom:2px;">Hossz (cm)</label>
                                <input type="number" class="cat-input-maxlength" data-cat-id="${cat.id}" value="${cat.maxLength || (cat.type === 'adhesive' ? 30 : 278)}" style="padding: 6px 10px; font-size: 12px; width:100%; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:6px;">
                            </div>
                        </div>
                        
                        ${cat.type === 'weight' ? `
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px;">
                            <div class="form-group" style="margin-bottom:0;">
                                <label style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block; margin-bottom:2px;">Egységsúly (kg/db)</label>
                                <input type="number" step="0.01" class="cat-input-itemweight" data-cat-id="${cat.id}" value="${cat.itemWeight || 1.0}" style="padding: 6px 10px; font-size: 12px; width:100%; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:6px;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block; margin-bottom:2px;">Doboz súlya (kg)</label>
                                <input type="number" step="0.01" class="cat-input-boxweight" data-cat-id="${cat.id}" value="${cat.boxWeight || 0.0}" style="padding: 6px 10px; font-size: 12px; width:100%; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:6px;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block; margin-bottom:2px;">Szélesség (cm)</label>
                                <input type="number" class="cat-input-width" data-cat-id="${cat.id}" value="${cat.width || 5}" style="padding: 6px 10px; font-size: 12px; width:100%; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:6px;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block; margin-bottom:2px;">Magasság (cm)</label>
                                <input type="number" class="cat-input-height" data-cat-id="${cat.id}" value="${cat.height || 5}" style="padding: 6px 10px; font-size: 12px; width:100%; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:6px;">
                            </div>
                        </div>
                        ` : ''}

                        ${cat.type === 'adhesive' ? `
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px;">
                            <div class="form-group" style="margin-bottom:0;">
                                <label style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block; margin-bottom:2px;">Egységsúly (kg/db)</label>
                                <input type="number" step="0.01" class="cat-input-itemweight" data-cat-id="${cat.id}" value="${cat.itemWeight || 0.5}" style="padding: 6px 10px; font-size: 12px; width:100%; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:6px;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block; margin-bottom:2px;">Doboz súlya (kg)</label>
                                <input type="number" step="0.01" class="cat-input-boxweight" data-cat-id="${cat.id}" value="${cat.boxWeight || 0.0}" style="padding: 6px 10px; font-size: 12px; width:100%; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:6px;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block; margin-bottom:2px;">Szélesség (cm)</label>
                                <input type="number" class="cat-input-width" data-cat-id="${cat.id}" value="${cat.width || 20}" style="padding: 6px 10px; font-size: 12px; width:100%; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:6px;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block; margin-bottom:2px;">Magasság (cm)</label>
                                <input type="number" class="cat-input-height" data-cat-id="${cat.id}" value="${cat.height || 10}" style="padding: 6px 10px; font-size: 12px; width:100%; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:6px;">
                            </div>
                        </div>
                        ` : ''}

                        ${cat.type === 'cards' ? `
                        <div style="margin-top:10px;">
                            <label style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 6px;">Méretek db szerint</label>
                            <div class="cards-list-container" data-cat-id="${cat.id}" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px;"></div>
                        </div>
                        ` : ''}
                    </div>
                `;
            });
            
            html += `
                    </div>
                    <div style="display:flex; justify-content:flex-end; margin-top: 15px; border-top:1px solid #cbd5e1; padding-top:15px;">
                        <button type="submit" class="btn btn-primary" style="padding: 10px 20px;">Termék Szabályok Mentése</button>
                    </div>
                </form>
            `;
            
            container.innerHTML = html;
            
            rules.categories.forEach(cat => {
                if (cat.type !== 'cards') return;
                const cardsContainer = container.querySelector(`.cards-list-container[data-cat-id="${cat.id}"]`);
                if (cardsContainer) {
                    renderDimensionCards(cardsContainer, cat.id, cat.maxQty || 5, cat.rules || {});
                }
            });
            
            bindProductTabListeners(container);
        };

        const renderAbbreviationsTab = () => {
            const container = overlay.querySelector('#settings-content-abbreviations');
            if (!container) return;
            
            const mappings = PannonXPService.getProductMappings();
            const keys = Object.keys(mappings);
            const categories = rules.categories || [];
            
            // Hide/filter out linked/merged variants (they point to a parent key via linkedTo)
            const visibleKeys = keys.filter(k => !mappings[k].linkedTo);
            
            // Sort keys by abbreviation alphabetically (placing non-empty ones first)
            visibleKeys.sort((a, b) => {
                const abbrevA = (mappings[a].abbrev || '').toLowerCase();
                const abbrevB = (mappings[b].abbrev || '').toLowerCase();
                
                if (abbrevA && !abbrevB) return -1;
                if (!abbrevA && abbrevB) return 1;
                
                const comp = abbrevA.localeCompare(abbrevB, 'hu');
                if (comp !== 0) return comp;
                
                return a.localeCompare(b, 'hu');
            });
            
            let html = `
                <form id="pxp-settings-abbreviations-form" style="display:flex; flex-direction:column; gap:15px; height: 100%;">
                    <!-- Shopify Termék CSV Import szekció -->
                    <div style="background: #f8fafc; padding: 14px; border-radius: 12px; border: 1px solid #cbd5e1; display: flex; flex-direction: column; gap: 8px;">
                        <h4 style="margin: 0; font-size: 13px; color: #1e293b;">Shopify Termék Export CSV Beolvasása</h4>
                        <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">
                            Töltsd fel a Shopify-ból exportált termék CSV fájlt. A rendszer automatikusan kiszűri a méretváltozatokat (pl. 280 cm), és csak a tiszta termékneveket/színeket menti el.
                        </p>
                        <div style="display: flex; gap: 10px; align-items: center; margin-top: 5px;">
                            <input type="file" id="pxp-product-csv-input" accept=".csv" style="display: none;">
                            <button type="button" id="pxp-btn-upload-product-csv" class="btn btn-secondary btn-sm" style="padding: 6px 14px; display: flex; align-items: center; gap: 6px;">
                                <i class="ph-bold ph-upload-simple"></i> Termék CSV Kijelölése
                            </button>
                            <span id="pxp-product-csv-status" style="font-size: 11px; color: #64748b;">Nincs fájl betöltve</span>
                        </div>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin: 0; font-size: 13px; color: #1e293b;">Regisztrált Termékek (${visibleKeys.length} db)</h4>
                        <button type="button" id="pxp-btn-clear-mappings" class="btn btn-secondary btn-sm" style="padding: 6px 12px; background: #fee2e2; color: #b91c1c; border-color: #fca5a5; font-size: 11px;">
                            Összes törlése
                        </button>
                    </div>
                    
                    <div style="max-height: 450px; overflow-y: auto; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; flex: 1;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                            <thead>
                                <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1; font-weight: 600; color: #475569;">
                                    <th style="padding: 8px 10px;">Shopify Terméknév</th>
                                    <th style="padding: 8px 10px; width: 150px;">Rövidítés</th>
                                    <th style="padding: 8px 10px; width: 160px;">Kategória</th>
                                    <th style="padding: 8px 10px; width: 50px; text-align: center;">Törlés</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${visibleKeys.length === 0 ? `
                                    <tr>
                                        <td colspan="4" style="padding: 20px; text-align: center; color: #64748b;">Nincsenek még termékek feltöltve.</td>
                                    </tr>
                                ` : visibleKeys.map(k => {
                                    const mappingObj = mappings[k] || { abbrev: '', categoryId: '' };
                                    const hasCat = !!mappingObj.categoryId;
                                    return `
                                    <tr class="pxp-mapping-row" data-key="${k.replace(/"/g, '&quot;')}" style="border-bottom: 1px solid #f1f5f9; ${hasCat ? '' : 'background: #fff5f5;'}">
                                        <td style="padding: 8px 10px; color: #1e293b; font-weight: 500;">
                                            <div>${k}</div>
                                            ${mappingObj.linkedTo ? `
                                                <div style="font-size: 10px; color: #0284c7; margin-top: 3px; display: flex; align-items: center; gap: 4px; font-weight: normal;">
                                                    <i class="ph-bold ph-link" style="font-size: 11px;"></i>
                                                    <span>Párosítva: <strong>${mappingObj.linkedTo}</strong></span>
                                                </div>
                                            ` : ''}
                                        </td>
                                        <td style="padding: 4px 10px;">
                                            <input type="text" class="pxp-input-abbrev" value="${(mappingObj.abbrev || '').replace(/"/g, '&quot;')}" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 12px; outline: none; font-weight: 600; color: #0f172a; box-sizing: border-box;">
                                        </td>
                                        <td style="padding: 4px 10px;">
                                            <select class="pxp-select-mapping-category" style="width: 100%; border: 1.5px solid ${hasCat ? '#cbd5e1' : '#ef4444'}; background: ${hasCat ? '#fff' : '#fef2f2'}; border-radius: 6px; padding: 4px; font-size: 12px; outline: none; cursor: pointer; font-weight: ${hasCat ? 'normal' : 'bold'}; color: ${hasCat ? '#0f172a' : '#b91c1c'}; box-sizing: border-box;">
                                                <option value="" ${!hasCat ? 'selected' : ''}>⚠️ Nincs kategória! ⚠️</option>
                                                ${categories.map(cat => `<option value="${cat.id}" ${cat.id === mappingObj.categoryId ? 'selected' : ''}>${cat.name}</option>`).join('')}
                                            </select>
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <button type="button" class="pxp-btn-delete-mapping" data-key="${k.replace(/"/g, '&quot;')}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 14px; padding: 2px;">
                                                <i class="ph-bold ph-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div style="display:flex; justify-content:flex-end; margin-top: 15px; border-top:1px solid #cbd5e1; padding-top:15px;">
                        <button type="submit" class="btn btn-primary" style="padding: 10px 20px;">Termék Rövidítések Mentése</button>
                    </div>
                </form>
            `;
            
            container.innerHTML = html;

            // Form submit event handler for saving abbreviation changes
            const form = container.querySelector('#pxp-settings-abbreviations-form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    try {
                        const activeMappings = PannonXPService.getProductMappings();
                        
                        container.querySelectorAll('.pxp-mapping-row').forEach(row => {
                            const key = row.dataset.key;
                            const abbrevInput = row.querySelector('.pxp-input-abbrev');
                            const catSelect = row.querySelector('.pxp-select-mapping-category');
                            
                            if (key && abbrevInput && catSelect) {
                                const abbrevVal = abbrevInput.value.trim();
                                const catVal = catSelect.value;
                                
                                if (!activeMappings[key]) {
                                    activeMappings[key] = { abbrev: '', categoryId: '' };
                                }
                                activeMappings[key].abbrev = abbrevVal;
                                activeMappings[key].categoryId = catVal;
                            }
                        });
                        
                        await PannonXPService.saveProductMappings(activeMappings);
                        
                        // Recalculate references and unmatched flags for current orders
                        if (orders && Array.isArray(orders)) {
                            orders.forEach(order => {
                                order.pxp_referencia = ShopifyParser.generateDefaultReference ? ShopifyParser.generateDefaultReference(order, 40) : order.pxp_referencia;
                                const calc = PannonXPService.calculateWeightAndPackages(order.items);
                                order.pxp_csomagszam = calc.packages;
                                order.pxp_suly = calc.weight;
                                order.pxp_packages = calc.packagesDetail;
                                order.pxp_has_unmatched = calc.hasUnmatched || order.items.some(item => {
                                    const activeM = PannonXPService.getNormalizedProductMappings();
                                    return !activeM[cleanItemNameForMapping(item.name)];
                                });
                            });
                        }
                        
                        await CustomDialog.alert('Termék rövidítések sikeresen elmentve!', 'Mentés sikeres', 'info');
                        overlay.remove();
                        this.render(mainContainer, orders, onExport);
                    } catch (err) {
                        console.error("Hiba a rövidítések mentésekor:", err);
                        await CustomDialog.alert('Hiba történt a mentés során: ' + err.message, 'Mentési hiba', 'error');
                    }
                });
            }
            
            // Bind listeners for Shopify Product Export CSV file input
            const csvInput = container.querySelector('#pxp-product-csv-input');
            const csvUploadBtn = container.querySelector('#pxp-btn-upload-product-csv');
            const csvStatus = container.querySelector('#pxp-product-csv-status');
            
            if (csvUploadBtn && csvInput) {
                csvUploadBtn.addEventListener('click', () => csvInput.click());
                
                csvInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
csvStatus.textContent = file.name;
                    
                    Papa.parse(file, {
                        header: true,
                        skipEmptyLines: true,
                        complete: async function(results) {
                            try {
                                const data = results.data;
                                const activeMappings = PannonXPService.getProductMappings();
                                let count = 0;
                                
                                let lastTitle = '';
                                let lastOption1Name = '';
                                let lastOption2Name = '';
                                let lastOption3Name = '';
                                
                                data.forEach(row => {
                                    let title = row['Title'] || '';
                                    if (!title) {
                                        title = lastTitle;
                                    } else {
                                        lastTitle = title;
                                    }
                                    if (!title) return;
                                    
                                    let opt1Name = row['Option1 Name'] || '';
                                    if (!opt1Name && row['Option1 Value']) opt1Name = lastOption1Name;
                                    else if (opt1Name) lastOption1Name = opt1Name;
                                    
                                    let opt2Name = row['Option2 Name'] || '';
                                    if (!opt2Name && row['Option2 Value']) opt2Name = lastOption2Name;
                                    else if (opt2Name) lastOption2Name = opt2Name;
                                    
                                    let opt3Name = row['Option3 Name'] || '';
                                    if (!opt3Name && row['Option3 Value']) opt3Name = lastOption3Name;
                                    else if (opt3Name) lastOption3Name = opt3Name;
                                    
                                    // Gather non-size options
                                    const optionsList = [];
                                    
                                    const optName1 = opt1Name.toLowerCase();
                                    const optVal1 = row['Option1 Value'] || '';
                                    if (optVal1 && optVal1 !== 'Default Title') {
                                        const isSizeName = /(size|méret|hossz|szélesség|magasság|átmérő)/i.test(optName1);
                                        const isSizeValue = /\b\d+(\.\d+)?\s*(cm|m|mm)\b/i.test(optVal1) || /\b\d+\s*x\s*\d+\b/i.test(optVal1);
                                        if (!isSizeName && !isSizeValue) {
                                            optionsList.push(optVal1);
                                        }
                                    }
                                    
                                    const optName2 = opt2Name.toLowerCase();
                                    const optVal2 = row['Option2 Value'] || '';
                                    if (optVal2 && optVal2 !== 'Default Title') {
                                        const isSizeName = /(size|méret|hossz|szélesség|magasság|átmérő)/i.test(optName2);
                                        const isSizeValue = /\b\d+(\.\d+)?\s*(cm|m|mm)\b/i.test(optVal2) || /\b\d+\s*x\s*\d+\b/i.test(optVal2);
                                        if (!isSizeName && !isSizeValue) {
                                            optionsList.push(optVal2);
                                        }
                                    }
                                    
                                    const optName3 = opt3Name.toLowerCase();
                                    const optVal3 = row['Option3 Value'] || '';
                                    if (optVal3 && optVal3 !== 'Default Title') {
                                        const isSizeName = /(size|méret|hossz|szélesség|magasság|átmérő)/i.test(optName3);
                                        const isSizeValue = /\b\d+(\.\d+)?\s*(cm|m|mm)\b/i.test(optVal3) || /\b\d+\s*x\s*\d+\b/i.test(optVal3);
                                        if (!isSizeName && !isSizeValue) {
                                            optionsList.push(optVal3);
                                        }
                                    }
                                    
                                    let combinedName = title;
                                    if (optionsList.length > 0) {
                                        combinedName += ' ' + optionsList.join(' ');
                                    }
                                    
                                    combinedName = ShopifyParser.formatItemName(combinedName);
                                    const cleanedName = cleanItemNameForMapping(combinedName);
                                    
                                    if (cleanedName && !activeMappings[cleanedName]) {
                                        let autoAbbrev = '';
                                        if (optionsList.length > 0) {
                                            autoAbbrev = optionsList[0].split(' ')[0];
                                        } else {
                                            autoAbbrev = cleanedName.split(' ').slice(0, 2).join(' ');
                                        }
                                        
                                        // Guess category
                                        let guessedCategoryId = 'cat_acoustic';
                                        const cleanNameLower = cleanedName.toLowerCase();
                                        if (/(ragasztó|t-rex|trex|ragaszto|hpr)/i.test(cleanNameLower)) guessedCategoryId = 'cat_adhesive';
                                        else if (/profil/i.test(cleanNameLower)) guessedCategoryId = 'cat_profile';
                                        else if (/(wood|spc\s*wood)/i.test(cleanNameLower)) guessedCategoryId = 'cat_spcwood';
                                        else if (/(stone|spc\s*stone)/i.test(cleanNameLower)) guessedCategoryId = 'cat_spcstone';

                                        activeMappings[cleanedName] = {
                                            abbrev: autoAbbrev || cleanedName,
                                            categoryId: guessedCategoryId
                                        };
                                        count++;
                                    }
                                });
                                
                                if (count > 0) {
                                    PannonXPService.saveProductMappings(activeMappings);
                                    
                                    if (orders && Array.isArray(orders)) {
                                        orders.forEach(order => {
                                            order.pxp_referencia = ShopifyParser.generateDefaultReference ? ShopifyParser.generateDefaultReference(order, 40) : order.pxp_referencia;
                                            const calc = PannonXPService.calculateWeightAndPackages(order.items);
                                            order.pxp_csomagszam = calc.packages;
                                            order.pxp_suly = calc.weight;
                                            order.pxp_packages = calc.packagesDetail;
                                            order.pxp_has_unmatched = calc.hasUnmatched || order.items.some(item => {
                                                const activeM = PannonXPService.getNormalizedProductMappings();
                                                const cleanedN = cleanItemNameForMapping(item.name);
                                                return !activeM[cleanedN];
                                            });
                                        });
                                    }
                                    
                                    await CustomDialog.alert(`${count} db új termékváltozat sikeresen beolvasva a CSV-ből méretek nélkül!`, 'Sikeres importálás', 'info');
                                    renderAbbreviationsTab();
                                    PannonXPView.render(mainContainer, orders, onExport);
                                } else {
                                    await CustomDialog.alert('Nem találtunk új egyedi terméket a fájlban, vagy mindegyik szerepel már az adatbázisban.', 'Nincs új termék', 'info');
                                }
                            } catch (err) {
                                console.error(err);
                                await CustomDialog.alert('Hiba történt a termék CSV beolvasása során: ' + err.message, 'Importálási Hiba', 'error');
                            }
                        }
                    });
                    
                    csvInput.value = '';
                });
            }
            
            container.querySelectorAll('.pxp-btn-delete-mapping').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const key = btn.dataset.key;
                    const confirmed = await CustomDialog.confirm(`Biztosan törlöd a(z) "${key}" termék rövidítését?`, 'Rövidítés törlése');
                    if (confirmed) {
                        const activeMappings = PannonXPService.getProductMappings();
                        delete activeMappings[key];
                        PannonXPService.saveProductMappings(activeMappings);
                        
                        // Recalculate references and unmatched flags for current orders
                        if (orders && Array.isArray(orders)) {
                            orders.forEach(order => {
                                order.pxp_referencia = ShopifyParser.generateDefaultReference ? ShopifyParser.generateDefaultReference(order, 40) : order.pxp_referencia;
                                const calc = PannonXPService.calculateWeightAndPackages(order.items);
                                order.pxp_has_unmatched = calc.hasUnmatched || order.items.some(item => {
                                    const activeM = PannonXPService.getNormalizedProductMappings();
                                    return !activeM[cleanItemNameForMapping(item.name)];
                                });
                            });
                        }
                        
                        renderAbbreviationsTab();
                        PannonXPView.render(mainContainer, orders, onExport);
                    }
                });
            });
            
            container.querySelector('#pxp-btn-clear-mappings').addEventListener('click', async () => {
                const confirmed = await CustomDialog.confirm('Biztosan törölni szeretnéd az ÖSSZES termék rövidítését?', 'Összes törlése', 'warning', true);
                if (confirmed) {
                    PannonXPService.saveProductMappings({});
                    
                    // Recalculate references and unmatched flags for current orders
                    if (orders && Array.isArray(orders)) {
                        orders.forEach(order => {
                            order.pxp_referencia = ShopifyParser.generateDefaultReference ? ShopifyParser.generateDefaultReference(order, 40) : order.pxp_referencia;
                            const calc = PannonXPService.calculateWeightAndPackages(order.items);
                            order.pxp_has_unmatched = true;
                        });
                    }
                    
                    renderAbbreviationsTab();
                    PannonXPView.render(mainContainer, orders, onExport);
                }
            });
        };

        // Render initially
        renderProductTab();

        // Fülváltó eseménykezelők a modalban
        const btnTabProfiles = overlay.querySelector('#tab-settings-profiles');
        const btnTabProducts = overlay.querySelector('#tab-settings-products');
        const btnTabAbbreviations = overlay.querySelector('#tab-settings-abbreviations');
        const contentProfiles = overlay.querySelector('#settings-content-profiles');
        const contentProducts = overlay.querySelector('#settings-content-products');
        const contentAbbreviations = overlay.querySelector('#settings-content-abbreviations');
        
        btnTabProfiles.addEventListener('click', () => {
            btnTabProfiles.classList.add('active');
            btnTabProfiles.style.color = 'var(--primary-color)';
            btnTabProfiles.style.borderBottom = '2px solid var(--primary-color)';
            btnTabProfiles.style.fontWeight = '600';
            
            btnTabProducts.classList.remove('active');
            btnTabProducts.style.color = '#64748b';
            btnTabProducts.style.borderBottom = '2px solid transparent';
            btnTabProducts.style.fontWeight = '500';

            btnTabAbbreviations.classList.remove('active');
            btnTabAbbreviations.style.color = '#64748b';
            btnTabAbbreviations.style.borderBottom = '2px solid transparent';
            btnTabAbbreviations.style.fontWeight = '500';
            
            contentProfiles.style.display = 'flex';
            contentProducts.style.display = 'none';
            contentAbbreviations.style.display = 'none';
        });
        
        btnTabProducts.addEventListener('click', () => {
            btnTabProducts.classList.add('active');
            btnTabProducts.style.color = 'var(--primary-color)';
            btnTabProducts.style.borderBottom = '2px solid var(--primary-color)';
            btnTabProducts.style.fontWeight = '600';
            
            btnTabProfiles.classList.remove('active');
            btnTabProfiles.style.color = '#64748b';
            btnTabProfiles.style.borderBottom = '2px solid transparent';
            btnTabProfiles.style.fontWeight = '500';

            btnTabAbbreviations.classList.remove('active');
            btnTabAbbreviations.style.color = '#64748b';
            btnTabAbbreviations.style.borderBottom = '2px solid transparent';
            btnTabAbbreviations.style.fontWeight = '500';
            
            contentProducts.style.display = 'flex';
            contentProfiles.style.display = 'none';
            contentAbbreviations.style.display = 'none';
            renderProductTab();
        });

        btnTabAbbreviations.addEventListener('click', () => {
            btnTabAbbreviations.classList.add('active');
            btnTabAbbreviations.style.color = 'var(--primary-color)';
            btnTabAbbreviations.style.borderBottom = '2px solid var(--primary-color)';
            btnTabAbbreviations.style.fontWeight = '600';
            
            btnTabProfiles.classList.remove('active');
            btnTabProfiles.style.color = '#64748b';
            btnTabProfiles.style.borderBottom = '2px solid transparent';
            btnTabProfiles.style.fontWeight = '500';

            btnTabProducts.classList.remove('active');
            btnTabProducts.style.color = '#64748b';
            btnTabProducts.style.borderBottom = '2px solid transparent';
            btnTabProducts.style.fontWeight = '500';
            
            contentAbbreviations.style.display = 'flex';
            contentProfiles.style.display = 'none';
            contentProducts.style.display = 'none';
            renderAbbreviationsTab();
        });
        
        // Bezárás gomb
        overlay.querySelector('#pxp-settings-close').addEventListener('click', () => {
            overlay.remove();
        });
        
        // --- 1. PROFILOK KEZELÉSE A MODALBAN ---
        const selectProfile = overlay.querySelector('#pxp-settings-profile-select');
        selectProfile.addEventListener('change', (e) => {
            PannonXPService.setActiveProfileId(e.target.value);
            overlay.remove();
            this.showSettingsModal(container, orders, onExport);
        });
        
        // Új profil gomb a modalban
        overlay.querySelector('#pxp-settings-btn-new-profile').addEventListener('click', async () => {
            const name = await CustomDialog.prompt('Add meg az új feladó profil nevét:', '', 'Profil hozzáadása');
            if (name) {
                const allProfiles = PannonXPService.getSenderProfiles();
                const currentActive = PannonXPService.getActiveProfile();
                const newId = 'profile_' + Date.now();
                const newProfile = { ...currentActive, id: newId, profileName: name };
                allProfiles.push(newProfile);
                PannonXPService.saveSenderProfiles(allProfiles);
                PannonXPService.setActiveProfileId(newId);
                
                overlay.remove();
                this.showSettingsModal(container, orders, onExport);
                this.render(container, orders, onExport);
            }
        });
        
        // Profil törlése
        overlay.querySelector('#pxp-settings-btn-delete-profile').addEventListener('click', async () => {
            const currentProfiles = PannonXPService.getSenderProfiles();
            if (currentProfiles.length <= 1) {
                await CustomDialog.alert('Az utolsó feladó profilt nem lehet törölni!', 'Hiba', 'error');
                return;
            }
            
            const activeProfile = PannonXPService.getActiveProfile();
            const confirmed = await CustomDialog.confirm(`Biztosan törlöd a(z) "${activeProfile.profileName}" feladó profilt?`, 'Profil törlése');
            if (confirmed) {
                const updated = currentProfiles.filter(p => p.id !== activeProfile.id);
                PannonXPService.saveSenderProfiles(updated);
                PannonXPService.setActiveProfileId(updated[0].id);
                
                overlay.remove();
                this.showSettingsModal(container, orders, onExport);
                this.render(container, orders, onExport);
            }
        });
        
        // Profil form mentés
        overlay.querySelector('#pxp-settings-profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const activeProfile = PannonXPService.getActiveProfile();
            
            const updatedProfile = {
                id: activeProfile.id,
                profileName: cleanName(overlay.querySelector('#pxp-set-s-profilename').value.trim()),
                uc_ugyfelkod: overlay.querySelector('#pxp-set-s-code').value.trim(),
                uc_ceg_nev: cleanName(overlay.querySelector('#pxp-set-s-company').value.trim()),
                uc_nev: cleanName(overlay.querySelector('#pxp-set-s-name').value.trim()),
                uc_tel: formatHungarianPhoneNumber(overlay.querySelector('#pxp-set-s-phone').value.trim()),
                uc_email: overlay.querySelector('#pxp-set-s-email').value.trim(),
                uc_ceg_cim_iranyito: overlay.querySelector('#pxp-set-s-zip').value.trim(),
                uc_ceg_cim_telepules: overlay.querySelector('#pxp-set-s-city').value.trim(),
                uc_ceg_cim_orszag: '36',
                uc_ceg_cim_kozterulet: overlay.querySelector('#pxp-set-s-street').value.trim(),
                uc_ceg_adoszam: overlay.querySelector('#pxp-set-s-tax').value.trim(),
                uc_ceg_bankszamlaszam: overlay.querySelector('#pxp-set-s-bank').value.trim(),
                szl_tartalom: overlay.querySelector('#pxp-set-s-content').value.trim()
            };
            
            const allProfiles = PannonXPService.getSenderProfiles();
            const index = allProfiles.findIndex(p => p.id === activeProfile.id);
            if (index !== -1) {
                allProfiles[index] = updatedProfile;
            }
            
            PannonXPService.saveSenderProfiles(allProfiles);
            await CustomDialog.alert('Feladó profil sikeresen mentve!', 'Mentés sikeres', 'info');
            this.render(container, orders, onExport);
        });
    }
};
