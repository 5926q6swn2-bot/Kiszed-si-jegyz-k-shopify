/**
 * PannonXP Table Sub-module
 * A megrendelések táblázatának kirajzolása, inline mezőszerkesztők és csomagkalkulációs események.
 */

import { PannonXPService } from '../../services/pannonxp.js?v=206';
import { ShopifyParser, cleanItemNameForMapping, cleanName, cleanAddress, checkAddressValidity, parseHungarianAddress } from '../../services/shopify.js?v=206';
import { showDetailedPackagesModal, showConfigureProductModal } from './pannonxpSettings.js';

export function renderOrdersTable(container, orders, onExport, mainViewContext) {
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
        if (countText) countText.textContent = 'Nincs betöltött rendelés';
        if (exportBtn) exportBtn.disabled = true;
        return;
    }
    
    tbody.onclick = null;
    tbody.style.cursor = '';
    if (countText) countText.textContent = `${orders.length} db megrendelés betöltve`;
    
    const updateExportState = () => {
        if (!exportBtn) return;
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
    
    // Eseménykezelők
    tbody.querySelectorAll('.pxp-order-select').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            orders[idx].pxp_selected = e.target.checked;
            updateExportState();
        });
    });

    tbody.querySelectorAll('.pxp-input-address').forEach(input => {
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

            renderOrdersTable(container, orders, onExport, mainViewContext);
        });
    });

    tbody.querySelectorAll('.pxp-input-name').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            orders[idx].shippingName = cleanName(e.target.value.trim());
            e.target.value = orders[idx].shippingName;
        });
    });

    tbody.querySelectorAll('.pxp-input-phone').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            orders[idx].shippingPhone = e.target.value.trim();
        });
    });

    tbody.querySelectorAll('.pxp-input-referencia').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            orders[idx].pxp_referencia = e.target.value.trim();
        });
    });
    
    tbody.querySelectorAll('.pxp-input-cod').forEach(input => {
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

    tbody.querySelectorAll('.pxp-input-item-qty').forEach(input => {
        input.addEventListener('change', (e) => {
            const orderIdx = parseInt(e.target.dataset.orderIndex);
            const itemIdx = parseInt(e.target.dataset.itemIndex);
            const newQty = parseInt(e.target.value) || 0;
            const order = orders[orderIdx];
            
            if (newQty <= 0) {
                order.items.splice(itemIdx, 1);
            } else {
                order.items[itemIdx].qty = newQty;
            }
            
            const calc = PannonXPService.calculateWeightAndPackages(order.items);
            order.pxp_csomagszam = calc.packages;
            order.pxp_suly = calc.weight;
            order.pxp_packages = calc.packagesDetail;
            
            if (ShopifyParser.generateDefaultReference) {
                order.pxp_referencia = ShopifyParser.generateDefaultReference(order, 40);
            }
            
            const activeM = PannonXPService.getNormalizedProductMappings();
            order.pxp_has_unmatched = calc.hasUnmatched || order.items.some(item => !activeM[cleanItemNameForMapping(item.name)]);
            
            renderOrdersTable(container, orders, onExport, mainViewContext);
        });
    });

    tbody.querySelectorAll('.pxp-btn-delete-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const orderIdx = parseInt(btn.dataset.orderIndex);
            const itemIdx = parseInt(btn.dataset.itemIndex);
            const order = orders[orderIdx];
            
            order.items.splice(itemIdx, 1);
            
            const calc = PannonXPService.calculateWeightAndPackages(order.items);
            order.pxp_csomagszam = calc.packages;
            order.pxp_suly = calc.weight;
            order.pxp_packages = calc.packagesDetail;
            
            if (ShopifyParser.generateDefaultReference) {
                order.pxp_referencia = ShopifyParser.generateDefaultReference(order, 40);
            }
            
            const activeM = PannonXPService.getNormalizedProductMappings();
            order.pxp_has_unmatched = calc.hasUnmatched || order.items.some(item => !activeM[cleanItemNameForMapping(item.name)]);
            
            renderOrdersTable(container, orders, onExport, mainViewContext);
        });
    });

    tbody.querySelectorAll('.btn-ack-pxp-removed').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.orderIndex);
            const errId = btn.dataset.errId;
            const order = orders[idx];
            if (order && order.errors) {
                order.errors = order.errors.filter(err => err.id !== errId);
                renderOrdersTable(container, orders, onExport, mainViewContext);
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
    
    tbody.querySelectorAll('.pxp-input-csomagszam').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            let val = parseInt(e.target.value);
            if (isNaN(val) || val < 1) val = 1;
            
            const order = orders[idx];
            order.pxp_csomagszam = val;
            e.target.value = val;
            
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
    
    tbody.querySelectorAll('.pxp-input-suly').forEach(input => {
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
    
    tbody.querySelectorAll('.pxp-btn-edit-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.dataset.index);
            showDetailedPackagesModal(orders[idx], () => {
                renderOrdersTable(container, orders, onExport, mainViewContext);
            });
        });
    });

    tbody.querySelectorAll('.btn-quick-add-mapping').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const orderIndex = parseInt(btn.dataset.orderIndex);
            const order = orders[orderIndex];
            const originalName = btn.dataset.originalName;
            const cleanedName = btn.dataset.name;
            
            let guessedCategoryId = 'cat_acoustic';
            const cleanNameLower = cleanedName.toLowerCase();
            if (/(ragasztó|t-rex|trex|ragaszto|hpr)/i.test(cleanNameLower)) guessedCategoryId = 'cat_adhesive';
            else if (/profil/i.test(cleanNameLower)) guessedCategoryId = 'cat_profile';
            else if (/(wood|spc\s*wood)/i.test(cleanNameLower)) guessedCategoryId = 'cat_spcwood';
            else if (/(stone|spc\s*stone)/i.test(cleanNameLower)) guessedCategoryId = 'cat_spcstone';

            showConfigureProductModal(order, originalName, cleanedName, '', guessedCategoryId, () => {
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
                renderOrdersTable(container, orders, onExport, mainViewContext);
            });
        });
    });

    tbody.querySelectorAll('.btn-quick-assign-cat').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const orderIndex = parseInt(btn.dataset.orderIndex);
            const order = orders[orderIndex];
            const originalName = btn.dataset.originalName;
            const cleanedName = btn.dataset.name;
            
            const activeMappings = PannonXPService.getProductMappings() || {};
            const currentMapping = activeMappings[originalName] || {};
            const currentAbbrev = currentMapping.abbrev || '';
            
            showConfigureProductModal(order, originalName, cleanedName, currentAbbrev, '', () => {
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
                renderOrdersTable(container, orders, onExport, mainViewContext);
            });
        });
    });
}
