/**
 * History Accounting Sub-module (Elszámolások fül & Elszámolás Modal)
 * Futár elszámolások kezelése, osztott fizetés és elszámolási státuszok rögzítése.
 */

import { HistoryManager } from '../../services/history.js';
import { CustomDialog } from '../../utils/dialog.js';
import { getPaymentDetails, getRunPaymentTotals } from '../../utils/paymentUtils.js';

export function showSettlementDialog(run, runCOD, existingState = null) {
    return new Promise((resolve) => {
        const codOrders    = run.orders.filter(o => o.isCOD);
        const nonCodOrders = run.orders.filter(o => !o.isCOD);
        const prevBankTransferred = new Set(existingState?.bankTransferredOrderIds || run.bankTransferredOrderIds || []);
        const prevUncollected  = new Set(existingState?.uncollectedOrderIds || run.uncollectedOrderIds || []);
        const prevReasons      = existingState?.uncollectedReasons || run.uncollectedReasons || {};
        const prevPartials     = existingState?.partialOrders || run.partialOrders || {};
        const prevPaymentMethods = existingState?.paymentMethods || run.paymentMethods || {};
        const prevPaymentStatusMap = existingState?.paymentStatusMap || run.paymentStatusMap || {};

        const makeReasonHtml = (orderId, wasUncollected) => {
            const orderObj = run.orders.find(ord => String(ord.id) === String(orderId));
            const isRet = orderObj ? !!orderObj.isReturn : false;
            const pr = prevReasons[orderId] || '';
            const currentResp = existingState?.uncollectedResponsibility?.[orderId] || run.uncollectedResponsibility?.[orderId] || 'vevo';
            
            const rMienkActive = currentResp === 'mienk';
            const rSzallitoActive = currentResp === 'szallito';
            const rVevoActive = currentResp === 'vevo' || !currentResp;

            return `<div class="sd-reason-row" style="display:${wasUncollected?'block':'none'};padding:12px 20px 16px 116px;background:#fff7ed;border-top:1px dashed #fed7aa;">
                <div style="font-size:12px;font-weight:700;color:#c2410c;margin-bottom:8px;">${isRet ? 'A visszaszállítás meghiúsult. Kérlek add meg az okot:' : 'Megrendelés nem lett átadva. Kérlek add meg az okot:'}</div>
                <input class="sd-reason-input" type="text" placeholder="${isRet ? 'Miért maradt el a visszahozatal? (pl. Vevő nem adta oda, elhalasztva...)' : 'Miért nem lett átadva? (Kötelező kitölteni, pl. Sérült termék, vevő lemondta...)'}"
                    value="${pr.replace(/"/g,'&quot;')}"
                    style="width:100%;box-sizing:border-box;font-size:13px;border:2px solid #fbbf24;border-radius:8px;padding:8px 12px;font-family:inherit;margin-bottom:12px;outline:none;background:#fff;">
                
                <div class="sd-resp-selector" style="display:flex;align-items:center;gap:8px;" data-order-id="${orderId}">
                    <span style="font-size:12px;color:#92400e;font-weight:700;margin-right:6px;">Kinek a hibájából hiúsult meg?</span>
                    <button type="button" class="sd-resp-btn mienk ${rMienkActive ? 'active' : ''}" data-resp="mienk" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rMienkActive ? '#fca5a5' : '#cbd5e1'};background:${rMienkActive ? '#fee2e2' : '#fff'};color:${rMienkActive ? '#b91c1c' : '#64748b'};transition:all .15s;">Saját hiba</button>
                    <button type="button" class="sd-resp-btn szallito ${rSzallitoActive ? 'active' : ''}" data-resp="szallito" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rSzallitoActive ? '#fed7aa' : '#cbd5e1'};background:${rSzallitoActive ? '#ffedd5' : '#fff'};color:${rSzallitoActive ? '#c2410c' : '#64748b'};transition:all .15s;">Szállító</button>
                    <button type="button" class="sd-resp-btn vevo ${rVevoActive ? 'active' : ''}" data-resp="vevo" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rVevoActive ? '#cbd5e1' : '#cbd5e1'};background:${rVevoActive ? '#e2e8f0' : '#fff'};color:${rVevoActive ? '#475569' : '#64748b'};transition:all .15s;">Vevő / Egyéb</button>
                </div>
            </div>`;
        };

        const codRowsHtml = codOrders.map(o => {
            const wasUncollected = prevUncollected.has(o.id);
            const wasBankTransferred = prevBankTransferred.has(o.id);
            const prevPartial    = prevPartials[o.id];
            const wasPartial     = !wasUncollected && !!prevPartial;
            const pm             = prevPaymentMethods[o.id] || (wasBankTransferred ? 'bank' : 'cash');
            
            let currentPm = { cash: 0, card: 0, bank: 0 };
            let currentStatus = { cash: 'pending', card: 'pending', bank: 'pending' };

            const isSplitSaved = typeof pm === 'object' && pm !== null;
            if (isSplitSaved) {
                currentPm = { cash: pm.cash || 0, card: pm.card || 0, bank: pm.bank || 0 };
            } else {
                currentPm[pm] = o.codAmount;
            }

            const prevStatus = prevPaymentStatusMap[o.id];
            if (typeof prevStatus === 'object' && prevStatus !== null) {
                currentStatus = {
                    cash: prevStatus.cash || 'pending',
                    card: prevStatus.card || 'pending',
                    bank: prevStatus.bank || 'pending'
                };
            } else {
                const singleStatus = prevStatus ? (prevStatus !== 'pending' ? 'received' : 'pending') : 'pending';
                if (isSplitSaved) {
                    currentStatus = {
                        cash: pm.cash > 0 ? singleStatus : 'pending',
                        card: pm.card > 0 ? singleStatus : 'pending',
                        bank: pm.bank > 0 ? singleStatus : 'pending'
                    };
                } else {
                    currentStatus = { cash: 'pending', card: 'pending', bank: 'pending' };
                    currentStatus[pm] = singleStatus;
                }
            }

            // FORCIBLY ENSURE CARD AND BANK ARE PENDING UNLESS BANK TRANSFER IS CONFIRMED!
            if (run.isTransferSettled !== true) {
                currentStatus.card = 'pending';
                currentStatus.bank = 'pending';
            }
            
            const showSplitPanel = wasPartial || isSplitSaved;
            const currentResp = existingState?.uncollectedResponsibility?.[o.id] || run.uncollectedResponsibility?.[o.id] || 'vevo';
            const rMienkActive = currentResp === 'mienk';
            const rSzallitoActive = currentResp === 'szallito';
            const rVevoActive = currentResp === 'vevo' || !currentResp;

            const itemsList = (o.items || []).map(it => `<span style="display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:2px 6px;margin:2px 4px 2px 0;"><b>${it.qty}×</b> ${it.name}</span>`).join('');
            
            const simpleControlsStyle = showSplitPanel ? 'display:none;' : 'display:inline-flex;';
            const splitContainerStyle = (!wasUncollected && showSplitPanel) ? 'display:flex;' : 'display:none;';
            
            const paymentMethodSelectorHtml = `
            <div class="sd-paymethod-selector" style="${simpleControlsStyle}align-items:center;gap:4px;" data-order-id="${o.id}">
                <button type="button" class="sd-paymethod-btn cash ${(!isSplitSaved && pm === 'cash') ? 'active' : ''}" data-method="cash" style="font-size:11px;font-weight:600;padding:6px 10px;border-radius:6px;cursor:pointer;font-family:inherit;border:1px solid ${(!isSplitSaved && pm === 'cash') ? '#cbd5e1' : '#e2e8f0'};background:${(!isSplitSaved && pm === 'cash') ? '#e2e8f0' : '#f8fafc'};color:${(!isSplitSaved && pm === 'cash') ? '#1e293b' : '#64748b'};transition:all .15s;">
                    💵 KP
                </button>
                <button type="button" class="sd-paymethod-btn card ${(!isSplitSaved && pm === 'card') ? 'active' : ''}" data-method="card" style="font-size:11px;font-weight:600;padding:6px 10px;border-radius:6px;cursor:pointer;font-family:inherit;border:1px solid ${(!isSplitSaved && pm === 'card') ? '#93c5fd' : '#e2e8f0'};background:${(!isSplitSaved && pm === 'card') ? '#eff6ff' : '#f8fafc'};color:${(!isSplitSaved && pm === 'card') ? '#1d4ed8' : '#64748b'};transition:all .15s;">
                    💳 Kártya
                </button>
                <button type="button" class="sd-paymethod-btn bank ${(!isSplitSaved && pm === 'bank') ? 'active' : ''}" data-method="bank" style="font-size:11px;font-weight:600;padding:6px 10px;border-radius:6px;cursor:pointer;font-family:inherit;border:1px solid ${(!isSplitSaved && pm === 'bank') ? '#bae6fd' : '#e2e8f0'};background:${(!isSplitSaved && pm === 'bank') ? '#f0f9ff' : '#f8fafc'};color:${(!isSplitSaved && pm === 'bank') ? '#0284c7' : '#64748b'};transition:all .15s;">
                    🏦 Utalás
                </button>
            </div>
            `;

            let isReceived = false;
            if (pm === 'card' || pm === 'bank') {
                isReceived = run.isTransferSettled === true;
            } else {
                isReceived = prevPaymentStatusMap[o.id] ? (prevPaymentStatusMap[o.id] !== 'pending') : false;
            }

            const paymentStatusSelectorHtml = `
            <div class="sd-paystatus-container" style="${simpleControlsStyle}align-items:center;gap:6px;" data-order-id="${o.id}">
                <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;font-weight:700;color:#374151;user-select:none;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:5px 8px;transition:all .15s;" class="sd-paystatus-label">
                    <input type="checkbox" class="sd-paystatus-checkbox" ${(!isSplitSaved && isReceived) ? 'checked' : ''} style="cursor:pointer;accent-color:#16a34a;width:14px;height:14px;">
                    <span>💵 Nálunk van</span>
                </label>
            </div>
            `;

            const splitToggleBtnHtml = `
            <button type="button" class="sd-split-toggle-btn" style="${simpleControlsStyle}align-items:center;gap:4px;font-size:11px;font-weight:600;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;cursor:pointer;font-family:inherit;transition:all .15s;">
                <i class="ph-bold ph-split-horizontal" style="font-size:12px;"></i> Részleges / Bontás
            </button>
            `;
            
            const splitContainerHtml = `
            <div class="sd-payment-split-container" style="${splitContainerStyle}flex-direction:column;gap:8px;padding:12px 20px 16px 116px;background:#f8fafc;border-top:1px dashed #cbd5e1;">
                <div style="font-size:11px;font-weight:700;color:#475569;display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                    <span>Osztott fizetési bontás (Összesen elvárt: <strong style="color:#0f172a;">${o.codAmount.toLocaleString('hu-HU')} Ft</strong>) · <span class="sd-split-status" style="font-weight:800;color:#16a34a;">Rendben</span></span>
                    <button type="button" class="sd-split-back-btn" style="font-size:10px;font-weight:700;color:#64748b;background:#fff;border:1px solid #cbd5e1;border-radius:6px;padding:3px 8px;cursor:pointer;font-family:inherit;">Vissza az egyszerű fizetéshez</button>
                </div>
                
                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;">
                    <div style="display:flex;flex-direction:column;gap:4px;background:#fff;padding:8px 12px;border-radius:8px;border:1px solid #cbd5e1;">
                        <label style="font-size:11px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:4px;">
                            💵 KP (készpénz)
                        </label>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <input class="sd-split-amount-kp" type="number" min="0" max="${o.codAmount}" value="${isSplitSaved ? (currentPm.cash || '') : ''}" placeholder="0" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:13px;font-weight:700;font-family:inherit;">
                            <label style="display:flex;align-items:center;gap:3px;font-size:10px;cursor:pointer;font-weight:700;padding:4px 6px;border-radius:6px;user-select:none;" class="sd-split-status-label-kp">
                                <input type="checkbox" class="sd-split-status-kp" ${currentStatus.cash === 'received' ? 'checked' : ''} style="accent-color:#16a34a;cursor:pointer;"> Nálunk van
                            </label>
                        </div>
                    </div>
                    
                    <div style="display:flex;flex-direction:column;gap:4px;background:#fff;padding:8px 12px;border-radius:8px;border:1px solid #cbd5e1;">
                        <label style="font-size:11px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:4px;">
                            💳 Kártya
                        </label>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <input class="sd-split-amount-card" type="number" min="0" max="${o.codAmount}" value="${isSplitSaved ? (currentPm.card || '') : ''}" placeholder="0" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:13px;font-weight:700;font-family:inherit;">
                            <label style="display:flex;align-items:center;gap:3px;font-size:10px;cursor:pointer;font-weight:700;padding:4px 6px;border-radius:6px;user-select:none;" class="sd-split-status-label-card">
                                <input type="checkbox" class="sd-split-status-card" ${(run.isTransferSettled === true && currentStatus.card === 'received') ? 'checked' : ''} style="accent-color:#2563eb;cursor:pointer;"> Nálunk van
                            </label>
                        </div>
                    </div>

                    <div style="display:flex;flex-direction:column;gap:4px;background:#fff;padding:8px 12px;border-radius:8px;border:1px solid #cbd5e1;">
                        <label style="font-size:11px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:4px;">
                            🏦 Közvetlen utalás
                        </label>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <input class="sd-split-amount-bank" type="number" min="0" max="${o.codAmount}" value="${isSplitSaved ? (currentPm.bank || '') : ''}" placeholder="0" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;font-size:13px;font-weight:700;font-family:inherit;">
                            <label style="display:flex;align-items:center;gap:3px;font-size:10px;cursor:pointer;font-weight:700;padding:4px 6px;border-radius:6px;user-select:none;" class="sd-split-status-label-bank">
                                <input type="checkbox" class="sd-split-status-bank" ${(run.isTransferSettled === true && currentStatus.bank === 'received') ? 'checked' : ''} style="accent-color:#0284c7;cursor:pointer;"> Nálunk van
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="sd-split-partial-row" style="display:none;background:#eff6ff;border:1px dashed #93c5fd;border-radius:8px;padding:12px;margin-top:8px;">
                    <div style="font-size:12px;font-weight:700;color:#1d4ed8;margin-bottom:8px;">
                        ⚠️ Részleges fizetés történt! Hiányzó összeg: <span class="sd-split-diff-amount">0</span> Ft
                    </div>
                    <input class="sd-split-partial-comment" type="text" placeholder="Miért volt részleges? (pl. 1 db termék sérült, visszahozta)..." value="${wasPartial ? (prevPartial.comment||'').replace(/"/g,'&quot;') : ''}" style="width:100%;box-sizing:border-box;font-size:13px;border:2px solid #93c5fd;border-radius:8px;padding:8px 12px;outline:none;background:#fff;margin-bottom:12px;font-family:inherit;">
                    
                    <div class="sd-resp-selector" style="display:flex;align-items:center;gap:8px;" data-order-id="${o.id}">
                        <span style="font-size:11px;color:#1d4ed8;font-weight:700;margin-right:6px;">Kinek a hibájából?</span>
                        <button type="button" class="sd-resp-btn mienk ${rMienkActive ? 'active' : ''}" data-resp="mienk" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rMienkActive ? '#fca5a5' : '#cbd5e1'};background:${rMienkActive ? '#fee2e2' : '#fff'};color:${rMienkActive ? '#b91c1c' : '#64748b'};transition:all .1s;">Saját hiba</button>
                        <button type="button" class="sd-resp-btn szallito ${rSzallitoActive ? 'active' : ''}" data-resp="szallito" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rSzallitoActive ? '#fed7aa' : '#cbd5e1'};background:${rSzallitoActive ? '#ffedd5' : '#fff'};color:${rSzallitoActive ? '#c2410c' : '#64748b'};transition:all .1s;">Szállító</button>
                        <button type="button" class="sd-resp-btn vevo ${rVevoActive ? 'active' : ''}" data-resp="vevo" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rVevoActive ? '#cbd5e1' : '#cbd5e1'};background:${rVevoActive ? '#e2e8f0' : '#fff'};color:${rVevoActive ? '#475569' : '#64748b'};transition:all .1s;">Vevő / Egyéb</button>
                    </div>
                </div>
            </div>
            `;

            return `
            <div class="sd-order-row" style="border-bottom:1px solid #f1f5f9;">
                <label style="display:grid;grid-template-columns: 24px 80px minmax(0, 2fr) minmax(0, 1fr) minmax(360px, auto);align-items:start;gap:12px;padding:14px 20px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                    <div style="display:flex;align-items:center;padding-top:2px;">
                        <input type="checkbox" data-order-id="${o.id}" data-amount="${o.codAmount}" data-is-cod="true" ${wasUncollected ? '' : 'checked'}
                            style="width:20px;height:20px;cursor:pointer;accent-color:#22c55e;">
                    </div>
                    <span style="font-size:14px;font-weight:700;color:#374151;padding-top:2px;">${o.id}</span>
                    <div style="display:flex;flex-direction:column;gap:4px;overflow:hidden;padding-top:2px;">
                        <div style="font-size:14px;color:#0f172a;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.shippingName || '—'}</div>
                        ${itemsList ? `<div style="font-size:11px;color:#64748b;display:inline-flex;align-items:center;gap:4px;cursor:pointer;user-select:none;width:fit-content;padding:2px 6px;border-radius:6px;transition:background .15s;" class="sd-items-toggle" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'" onclick="event.preventDefault();event.stopPropagation();this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('i').style.transform=this.nextElementSibling.style.display==='none'?'rotate(0deg)':'rotate(180deg)'">
                            <i class="ph-bold ph-caret-down" style="transition:transform .2s;"></i> ${o.items.length} termék mutatása
                        </div>
                        <div class="sd-items-list" style="display:none;font-size:11px;color:#475569;margin-top:2px;" onclick="event.preventDefault();event.stopPropagation();">${itemsList}</div>` : ''}
                    </div>
                    <div style="display:flex;align-items:center;padding-top:2px;">
                        <span class="sd-full-amount" style="font-size:15px;font-weight:800;color:#b91c1c;">— Ft</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;padding-top:2px;">
                        ${paymentMethodSelectorHtml}
                        ${paymentStatusSelectorHtml}
                        ${splitToggleBtnHtml}
                    </div>
                </label>
                ${splitContainerHtml}
                ${makeReasonHtml(o.id, wasUncollected)}
            </div>`;
        }).join('');

        const nonCodRowsHtml = nonCodOrders.map(o => {
            const wasUncollected = prevUncollected.has(o.id);
            const itemsList = (o.items || []).map(it => `<span style="display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:2px 6px;margin:2px 4px 2px 0;"><b>${it.qty}×</b> ${it.name}</span>`).join('');
            return `
            <div class="sd-order-row" style="border-bottom:1px solid #f1f5f9;">
                <label style="display:grid;grid-template-columns: 24px 80px minmax(0, 2fr) minmax(0, 1fr);align-items:start;gap:12px;padding:14px 20px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                    <div style="display:flex;align-items:center;padding-top:2px;">
                        <input type="checkbox" data-order-id="${o.id}" data-amount="0" data-is-cod="false" ${wasUncollected ? '' : 'checked'}
                            style="width:20px;height:20px;cursor:pointer;accent-color:#22c55e;">
                    </div>
                    <span style="font-size:14px;font-weight:700;color:#374151;padding-top:2px;">${o.id}</span>
                    <div style="display:flex;flex-direction:column;gap:4px;overflow:hidden;padding-top:2px;">
                        <div style="font-size:14px;color:#0f172a;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.shippingName || '—'}</div>
                        ${itemsList ? `<div style="font-size:11px;color:#64748b;display:inline-flex;align-items:center;gap:4px;cursor:pointer;user-select:none;width:fit-content;padding:2px 6px;border-radius:6px;transition:background .15s;" class="sd-items-toggle" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'" onclick="event.preventDefault();event.stopPropagation();this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('i').style.transform=this.nextElementSibling.style.display==='none'?'rotate(0deg)':'rotate(180deg)'">
                            <i class="ph-bold ph-caret-down" style="transition:transform .2s;"></i> ${o.items.length} termék mutatása
                        </div>
                        <div class="sd-items-list" style="display:none;font-size:11px;color:#475569;margin-top:2px;" onclick="event.preventDefault();event.stopPropagation();">${itemsList}</div>` : ''}
                    </div>
                    <div style="display:flex;align-items:center;padding-top:2px;">
                        <span style="font-size:12px;font-weight:600;color:${o.isReturn ? '#6b21a8' : '#94a3b8'};">${o.isReturn ? '⟲ Visszaszállítás' : 'Nincs utánvét (0 Ft)'}</span>
                    </div>
                </label>
                ${makeReasonHtml(o.id, wasUncollected)}
            </div>`;
        }).join('');

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,.6);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;animation:fadeIn .2s ease;';
        
        overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px;max-width:960px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);overflow:hidden;animation:slideUp .25s ease;">
            
            <!-- Fejléc -->
            <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;">
                <div>
                    <h3 style="margin:0;font-size:17px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;">
                        <i class="ph-bold ph-currency-circle-dollar" style="color:#22c55e;"></i>
                        Elszámolás Rögzítése
                    </h3>
                    <div style="font-size:12px;color:#64748b;margin-top:3px;">
                        ${run.date} · <strong>${run.company || '-'}</strong> (${run.courier || '-'}) · <strong>${run.orders.length} rendelés</strong>
                    </div>
                </div>
                <button type="button" id="sd-close" style="background:none;border:none;color:#64748b;font-size:20px;cursor:pointer;padding:4px;border-radius:8px;line-height:1;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='none'">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>

            <!-- Összesítő sáv (Készpénz / Utalás / Egyéb bontás) -->
            <div style="padding:16px 24px;background:#1e293b;color:white;display:grid;grid-template-columns:repeat(4, 1fr);gap:16px;box-shadow:inset 0 2px 4px rgba(0,0,0,0.1);">
                <div>
                    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.3px;">Készpénz (Beérkezett)</div>
                    <div id="sd-total-kp-received" style="font-size:18px;font-weight:800;color:#22c55e;margin-top:2px;">0 Ft</div>
                </div>
                <div>
                    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.3px;">Függő KP (Futárnál)</div>
                    <div id="sd-total-kp-pending" style="font-size:18px;font-weight:800;color:#f59e0b;margin-top:2px;">0 Ft</div>
                </div>
                <div>
                    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.3px;">Kártyás utalásra vár</div>
                    <div id="sd-total-card-pending" style="font-size:18px;font-weight:800;color:#3b82f6;margin-top:2px;">0 Ft</div>
                </div>
                <div>
                    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.3px;">Banki utalás / Beért kártya</div>
                    <div id="sd-total-other" style="font-size:18px;font-weight:800;color:#38bdf8;margin-top:2px;">0 Ft</div>
                </div>
            </div>

            <!-- Rendelések listája (Görgethető) -->
            <div style="flex:1;overflow-y:auto;" id="sd-orders-list">
                ${codRowsHtml}
                ${nonCodRowsHtml}
            </div>

            <!-- Lábléc / Akciógombok -->
            <div style="padding:16px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;align-items:center;justify-content:space-between;">
                <div style="font-size:12px;color:#64748b;">
                    Pipáld ki a sikeresen átadott/beszedett rendeléseket!
                </div>
                <div style="display:flex;align-items:center;gap:12px;">
                    <button type="button" id="sd-cancel" style="padding:10px 18px;font-size:13px;font-weight:600;color:#64748b;background:#fff;border:1px solid #cbd5e1;border-radius:10px;cursor:pointer;font-family:inherit;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">Mégse</button>
                    <button type="button" id="sd-save" style="padding:10px 22px;font-size:13px;font-weight:700;color:#fff;background:#22c55e;border:none;border-radius:10px;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(34,197,94,.3);display:flex;align-items:center;gap:6px;" onmouseover="this.style.background='#16a34a'" onmouseout="this.style.background='#22c55e'">
                        <i class="ph-bold ph-check-circle" style="font-size:16px;"></i>
                        Elszámolás Mentése
                    </button>
                </div>
            </div>

        </div>
        `;

        document.body.appendChild(overlay);

        const updateRowAmountDisplay = (row) => {
            const cb = row.querySelector('input[type=checkbox]:not(.sd-paystatus-checkbox):not(.sd-split-status-kp):not(.sd-split-status-card):not(.sd-split-status-bank)');
            const splitContainer = row.querySelector('.sd-payment-split-container');
            const fullAmtSpan = row.querySelector('.sd-full-amount');
            if (!cb || !fullAmtSpan) return;

            const isSplitActive = splitContainer && splitContainer.style.display !== 'none';
            const fullAmount = parseInt(cb.getAttribute('data-amount')) || 0;

            if (isSplitActive) {
                const valKp = Math.max(0, parseInt(row.querySelector('.sd-split-amount-kp').value) || 0);
                const valCard = Math.max(0, parseInt(row.querySelector('.sd-split-amount-card').value) || 0);
                const valBank = Math.max(0, parseInt(row.querySelector('.sd-split-amount-bank').value) || 0);
                const sum = valKp + valCard + valBank;
                const statusSpan = splitContainer.querySelector('.sd-split-status');
                const partialRow = splitContainer.querySelector('.sd-split-partial-row');
                const diffSpan = splitContainer.querySelector('.sd-split-diff-amount');

                if (sum === fullAmount) {
                    if (statusSpan) { statusSpan.textContent = 'Rendben'; statusSpan.style.color = '#16a34a'; }
                    if (partialRow) partialRow.style.display = 'none';
                    fullAmtSpan.textContent = `${sum.toLocaleString('hu-HU')} Ft`;
                    fullAmtSpan.style.color = '#16a34a';
                } else if (sum < fullAmount) {
                    const diff = fullAmount - sum;
                    if (statusSpan) { statusSpan.textContent = `Részleges (-${diff.toLocaleString('hu-HU')} Ft)`; statusSpan.style.color = '#1d4ed8'; }
                    if (partialRow) partialRow.style.display = 'block';
                    if (diffSpan) diffSpan.textContent = diff.toLocaleString('hu-HU');
                    fullAmtSpan.textContent = `${sum.toLocaleString('hu-HU')} Ft (részleges)`;
                    fullAmtSpan.style.color = '#1d4ed8';
                } else {
                    const diff = sum - fullAmount;
                    if (statusSpan) { statusSpan.textContent = `Túlfizetés (+${diff.toLocaleString('hu-HU')} Ft)`; statusSpan.style.color = '#dc2626'; }
                    if (partialRow) partialRow.style.display = 'none';
                    fullAmtSpan.textContent = `${sum.toLocaleString('hu-HU')} Ft (többlet)`;
                    fullAmtSpan.style.color = '#dc2626';
                }
            } else {
                fullAmtSpan.textContent = `${fullAmount.toLocaleString('hu-HU')} Ft`;
                fullAmtSpan.style.color = cb.checked ? '#b91c1c' : '#94a3b8';
            }
        };

        const updateTotal = () => {
            let totalKpReceived = 0;
            let totalKpPending = 0;
            let totalCardPending = 0;
            let totalOther = 0;

            overlay.querySelectorAll('.sd-order-row').forEach(row => {
                const cb = row.querySelector('input[type=checkbox]:not(.sd-paystatus-checkbox):not(.sd-split-status-kp):not(.sd-split-status-card):not(.sd-split-status-bank)');
                if (!cb || cb.getAttribute('data-is-cod') !== 'true') return;
                
                updateRowAmountDisplay(row);
                if (!cb.checked) return;

                const splitContainer = row.querySelector('.sd-payment-split-container');
                const isSplitActive = splitContainer && splitContainer.style.display !== 'none';

                if (isSplitActive) {
                    const valKp = Math.max(0, parseInt(row.querySelector('.sd-split-amount-kp').value) || 0);
                    const valCard = Math.max(0, parseInt(row.querySelector('.sd-split-amount-card').value) || 0);
                    const valBank = Math.max(0, parseInt(row.querySelector('.sd-split-amount-bank').value) || 0);

                    const statusKp = row.querySelector('.sd-split-status-kp').checked;
                    const statusCard = row.querySelector('.sd-split-status-card').checked;
                    const statusBank = row.querySelector('.sd-split-status-bank').checked;

                    if (statusKp) totalKpReceived += valKp;
                    else totalKpPending += valKp;

                    if (statusCard) totalOther += valCard;
                    else totalCardPending += valCard;

                    if (statusBank) totalOther += valBank;
                } else {
                    const fullAmount = parseInt(cb.getAttribute('data-amount'));
                    const paymethodSelector = row.querySelector('.sd-paymethod-selector');
                    const activePayBtn = paymethodSelector ? paymethodSelector.querySelector('.sd-paymethod-btn.active') : null;
                    const method = activePayBtn ? activePayBtn.getAttribute('data-method') : 'cash';

                    const statusCheckbox = row.querySelector('.sd-paystatus-checkbox');
                    const isReceived = statusCheckbox ? statusCheckbox.checked : false;

                    if (method === 'bank') {
                        totalOther += fullAmount;
                    } else if (method === 'card') {
                        if (isReceived) totalOther += fullAmount;
                        else totalCardPending += fullAmount;
                    } else { // cash
                        if (isReceived) totalKpReceived += fullAmount;
                        else totalKpPending += fullAmount;
                    }
                }
            });

            overlay.querySelector('#sd-total-kp-received').textContent = totalKpReceived.toLocaleString('hu-HU') + ' Ft';
            overlay.querySelector('#sd-total-kp-pending').textContent = totalKpPending.toLocaleString('hu-HU') + ' Ft';
            overlay.querySelector('#sd-total-card-pending').textContent = totalCardPending.toLocaleString('hu-HU') + ' Ft';
            overlay.querySelector('#sd-total-other').textContent = totalOther.toLocaleString('hu-HU') + ' Ft';
        };

        overlay.querySelectorAll('input[type=checkbox]:not(.sd-paystatus-checkbox):not(.sd-split-status-kp):not(.sd-split-status-card):not(.sd-split-status-bank)').forEach(cb => cb.addEventListener('change', (e) => {
            const row    = e.target.closest('.sd-order-row');
            const isCOD  = cb.getAttribute('data-is-cod') === 'true';
            const reasonRow = row.querySelector('.sd-reason-row');
            if (e.target.checked) {
                reasonRow.style.display = 'none';
                const rInput = row.querySelector('.sd-reason-input');
                if (rInput) rInput.value = '';
                if (isCOD) {
                    row.querySelector('.sd-paymethod-selector').style.display = 'inline-flex';
                    row.querySelector('.sd-paystatus-container').style.display = 'inline-flex';
                    row.querySelector('.sd-split-toggle-btn').style.display = 'inline-flex';
                    row.querySelector('.sd-payment-split-container').style.display = 'none';
                }
            } else {
                if (isCOD) {
                    row.querySelector('.sd-paymethod-selector').style.display = 'none';
                    row.querySelector('.sd-paystatus-container').style.display = 'none';
                    row.querySelector('.sd-split-toggle-btn').style.display = 'none';
                    row.querySelector('.sd-payment-split-container').style.display = 'none';
                }
                reasonRow.style.display = 'block';
                const rInput = row.querySelector('.sd-reason-input');
                if (rInput) rInput.focus();
            }
            updateTotal();
        }));

        overlay.addEventListener('click', (e) => {
            const btn = e.target.closest('.sd-resp-btn');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            
            const selector = btn.closest('.sd-resp-selector');
            const buttons = selector.querySelectorAll('.sd-resp-btn');
            buttons.forEach(b => {
                b.classList.remove('active');
                b.style.background = '#fff';
                b.style.color = '#64748b';
                b.style.borderColor = '#cbd5e1';
            });
            
            btn.classList.add('active');
            const resp = btn.getAttribute('data-resp');
            if (resp === 'mienk') {
                btn.style.background = '#fee2e2';
                btn.style.borderColor = '#fca5a5';
                btn.style.color = '#b91c1c';
            } else if (resp === 'szallito') {
                btn.style.background = '#ffedd5';
                btn.style.borderColor = '#fed7aa';
                btn.style.color = '#c2410c';
            } else {
                btn.style.background = '#e2e8f0';
                btn.style.borderColor = '#cbd5e1';
                btn.style.color = '#475569';
            }
        });

        // Split toggle button click
        overlay.addEventListener('click', (e) => {
            const btn = e.target.closest('.sd-split-toggle-btn');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            
            const row = btn.closest('.sd-order-row');
            const splitContainer = row.querySelector('.sd-payment-split-container');
            const cb = row.querySelector('input[type=checkbox]');
            const fullAmount = parseInt(cb.getAttribute('data-amount'));
            
            splitContainer.style.display = 'flex';
            row.querySelector('.sd-paymethod-selector').style.display = 'none';
            row.querySelector('.sd-paystatus-container').style.display = 'none';
            btn.style.display = 'none';
            
            const kpInput = splitContainer.querySelector('.sd-split-amount-kp');
            const cardInput = splitContainer.querySelector('.sd-split-amount-card');
            const bankInput = splitContainer.querySelector('.sd-split-amount-bank');
            
            if (!kpInput.value && !cardInput.value && !bankInput.value) {
                kpInput.value = fullAmount;
            }
            
            updateTotal();
        });

        // Split back button click (revert to simple mode)
        overlay.addEventListener('click', (e) => {
            const btn = e.target.closest('.sd-split-back-btn');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            
            const row = btn.closest('.sd-order-row');
            const splitContainer = row.querySelector('.sd-payment-split-container');
            
            splitContainer.style.display = 'none';
            splitContainer.querySelector('.sd-split-amount-kp').value = '';
            splitContainer.querySelector('.sd-split-amount-card').value = '';
            splitContainer.querySelector('.sd-split-amount-bank').value = '';
            splitContainer.querySelector('.sd-split-partial-comment').value = '';
            
            row.querySelector('.sd-paymethod-selector').style.display = 'inline-flex';
            row.querySelector('.sd-paystatus-container').style.display = 'inline-flex';
            row.querySelector('.sd-split-toggle-btn').style.display = 'inline-flex';
            
            updateTotal();
        });

        overlay.querySelectorAll('.sd-split-amount-kp, .sd-split-amount-card, .sd-split-amount-bank').forEach(input => {
            input.addEventListener('input', () => updateTotal());
        });
        overlay.querySelectorAll('.sd-split-status-kp, .sd-split-status-card, .sd-split-status-bank').forEach(chk => {
            chk.addEventListener('change', () => updateTotal());
        });

        // Fizetési mód gombok eseménykezelése egyszerű módban
        overlay.addEventListener('click', (e) => {
            const btn = e.target.closest('.sd-paymethod-btn');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            
            const selector = btn.closest('.sd-paymethod-selector');
            const buttons = selector.querySelectorAll('.sd-paymethod-btn');
            buttons.forEach(b => {
                b.classList.remove('active');
                b.style.background = '#f8fafc';
                b.style.color = '#64748b';
                b.style.borderColor = '#e2e8f0';
            });
            
            btn.classList.add('active');
            const method = btn.getAttribute('data-method');
            const row = btn.closest('.sd-order-row');
            const statusCheckbox = row ? row.querySelector('.sd-paystatus-checkbox') : null;

            if (method === 'cash') {
                btn.style.background = '#e2e8f0';
                btn.style.borderColor = '#cbd5e1';
                btn.style.color = '#1e293b';
                if (statusCheckbox) statusCheckbox.checked = true;
            } else if (method === 'card') {
                btn.style.background = '#eff6ff';
                btn.style.borderColor = '#93c5fd';
                btn.style.color = '#1d4ed8';
                if (statusCheckbox) statusCheckbox.checked = false; // Kártyás fizetésnél alapértelmezés szerint "Utalásra vár" (pending)
            } else {
                btn.style.background = '#f0f9ff';
                btn.style.borderColor = '#bae6fd';
                btn.style.color = '#0284c7';
                if (statusCheckbox) statusCheckbox.checked = false; // Utalásnál is alapértelmezés szerint pending
            }
            updateTotal();
        });

        // Nálunk van checkbox egyszerű módban
        overlay.addEventListener('change', (e) => {
            const chk = e.target.closest('.sd-paystatus-checkbox');
            if (!chk) return;
            updateTotal();
        });

        updateTotal();

        const cleanup = () => overlay.remove();
        overlay.querySelector('#sd-close').addEventListener('click', () => { cleanup(); resolve(null); });
        overlay.querySelector('#sd-cancel').addEventListener('click', () => { cleanup(); resolve(null); });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) { cleanup(); resolve(null); } });

        overlay.querySelector('#sd-save').addEventListener('click', () => {
            let settledAmount = 0;
            let settledKpAmount = 0;
            let settledCardAmount = 0;
            const paymentMethods = {};
            const paymentStatusMap = {};
            const uncollectedOrderIds = [];
            const uncollectedReasons  = {};
            const uncollectedResponsibility = {};
            const partialOrders       = {};
            const bankTransferredOrderIds = [];

            overlay.querySelectorAll('.sd-order-row').forEach(row => {
                const cb = row.querySelector('input[type=checkbox]:not(.sd-paystatus-checkbox):not(.sd-split-status-kp):not(.sd-split-status-card):not(.sd-split-status-bank)');
                const orderId = cb.getAttribute('data-order-id');
                const isCOD   = cb.getAttribute('data-is-cod') === 'true';

                if (cb.checked) {
                    if (isCOD) {
                        const splitContainer = row.querySelector('.sd-payment-split-container');
                        const isSplitActive = splitContainer && splitContainer.style.display !== 'none';

                        if (isSplitActive) {
                            const valKp = Math.max(0, parseInt(row.querySelector('.sd-split-amount-kp').value) || 0);
                            const valCard = Math.max(0, parseInt(row.querySelector('.sd-split-amount-card').value) || 0);
                            const valBank = Math.max(0, parseInt(row.querySelector('.sd-split-amount-bank').value) || 0);

                            const statusKp = row.querySelector('.sd-split-status-kp').checked ? 'received' : 'pending';
                            const statusCard = row.querySelector('.sd-split-status-card').checked ? 'received' : 'pending';
                            const statusBank = row.querySelector('.sd-split-status-bank').checked ? 'received' : 'pending';

                            paymentMethods[orderId] = { cash: valKp, card: valCard, bank: valBank };
                            paymentStatusMap[orderId] = { cash: statusKp, card: statusCard, bank: statusBank };

                            const fullAmount = parseInt(cb.getAttribute('data-amount'));
                            const sum = valKp + valCard + valBank;

                            if (sum < fullAmount) {
                                const comment = row.querySelector('.sd-split-partial-comment').value.trim();
                                partialOrders[orderId] = { amount: sum, comment };

                                const selector = row.querySelector('.sd-split-partial-row .sd-resp-selector');
                                if (selector) {
                                    const activeBtn = selector.querySelector('.sd-resp-btn.active');
                                    const resp = activeBtn ? activeBtn.getAttribute('data-resp') : 'vevo';
                                    uncollectedResponsibility[orderId] = resp;
                                } else {
                                    uncollectedResponsibility[orderId] = 'vevo';
                                }
                            }

                            settledAmount += sum;
                            settledKpAmount += valKp;
                            settledCardAmount += valCard;

                            if (valBank > 0) {
                                bankTransferredOrderIds.push(orderId);
                            }
                        } else {
                            const paymethodSelector = row.querySelector('.sd-paymethod-selector');
                            const activePayBtn = paymethodSelector ? paymethodSelector.querySelector('.sd-paymethod-btn.active') : null;
                            const method = activePayBtn ? activePayBtn.getAttribute('data-method') : 'cash';
                            paymentMethods[orderId] = method;

                            const statusCheckbox = row.querySelector('.sd-paystatus-checkbox');
                            const isReceived = statusCheckbox ? statusCheckbox.checked : false;
                            paymentStatusMap[orderId] = isReceived ? 'received' : 'pending';

                            const fullAmount = parseInt(cb.getAttribute('data-amount'));
                            settledAmount += fullAmount;
                            if (method === 'card') {
                                settledCardAmount += fullAmount;
                            } else if (method === 'bank') {
                                bankTransferredOrderIds.push(orderId);
                            } else {
                                settledKpAmount += fullAmount;
                            }
                        }
                    }
                } else {
                    uncollectedOrderIds.push(orderId);
                    const reasonInput = row.querySelector('.sd-reason-input');
                    if (reasonInput) {
                        const reason = reasonInput.value.trim();
                        if (reason) uncollectedReasons[orderId] = reason;
                    }
                    
                    const selector = row.querySelector('.sd-reason-row .sd-resp-selector');
                    if (selector) {
                        const activeBtn = selector.querySelector('.sd-resp-btn.active');
                        const resp = activeBtn ? activeBtn.getAttribute('data-resp') : 'vevo';
                        uncollectedResponsibility[orderId] = resp;
                    } else {
                        uncollectedResponsibility[orderId] = 'vevo';
                    }
                }
            });
            cleanup();
            resolve({ 
                settledAmount, 
                settledKpAmount, 
                settledCardAmount, 
                paymentMethods, 
                paymentStatusMap,
                uncollectedOrderIds, 
                uncollectedReasons, 
                partialOrders, 
                bankTransferredOrderIds, 
                uncollectedResponsibility 
            });
        });
    });
}

export async function renderAccountingRuns(ctx) {
    const { 
        accountingRunsContainer, accountingFilterPending, isFiltered, generateDeliveryNotesHtml 
    } = ctx;
    
    if (!accountingRunsContainer) return;

    let runs = await HistoryManager.getAllRuns();
    runs.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.timestamp || 0) - (a.timestamp || 0);
    });

    runs.forEach(run => {
        if (!run.paymentStatusMap || Object.keys(run.paymentStatusMap).length === 0) {
            const map = {};
            const uncollected = run.uncollectedOrderIds || [];
            const bankTransferred = run.bankTransferredOrderIds || [];
            const paymentMethods = run.paymentMethods || {};
            const hasSettled = (run.settledAmount || 0) > 0 || run.isSettled;
            const isTransferSettled = run.isTransferSettled === true;
            
            run.orders.forEach(o => {
                if (o.isCOD) {
                    if (uncollected.includes(o.id) || bankTransferred.includes(o.id)) {
                        map[o.id] = 'received';
                    } else {
                        const method = paymentMethods[o.id] || 'cash';
                        if (typeof method === 'object' && method !== null) {
                            const statusObj = {};
                            if (method.cash > 0) statusObj.cash = hasSettled ? 'received' : 'pending';
                            if (method.card > 0) statusObj.card = isTransferSettled ? 'received' : 'pending';
                            if (method.bank > 0) statusObj.bank = isTransferSettled ? 'received' : 'pending';
                            map[o.id] = statusObj;
                        } else if (method === 'card' || method === 'bank') {
                            map[o.id] = isTransferSettled ? 'received' : 'pending';
                        } else {
                            map[o.id] = hasSettled ? 'received' : 'pending';
                        }
                    }
                }
            });
            run.paymentStatusMap = map;
        }
    });

    const onlyPending = accountingFilterPending ? accountingFilterPending.checked : false;
    runs = runs.filter(r => isFiltered(r));
    if (onlyPending) {
        runs = runs.filter(r => {
            const totals = getRunPaymentTotals(r);
            return totals.hasPending || !totals.isFullySettled;
        });
    }

    accountingRunsContainer.innerHTML = '';

    if(runs.length === 0) {
        accountingRunsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Nincsenek a feltételnek megfelelő elszámolások.</p>`;
        return;
    }

    let totalFilteredPendingKp = 0;
    let totalFilteredPendingCard = 0;

    runs.forEach(r => {
        const totals = getRunPaymentTotals(r);
        totalFilteredPendingKp += totals.pendingKp;
        totalFilteredPendingCard += totals.pendingCard;
    });

    const summaryCard = document.createElement('div');
    summaryCard.style.cssText = 'background: linear-gradient(135deg, #1e293b, #0f172a); color: white; padding: 18px 24px; border-radius: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);';
    summaryCard.innerHTML = `
        <div>
            <div style="font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Szűrt követelések összesen</div>
            <div style="font-size: 11px; color: #64748b;">A fenti szűrők (Dátum, Szállítócég) alapján számítva</div>
        </div>
        <div style="display: flex; gap: 32px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(249, 115, 22, 0.15); display: flex; align-items: center; justify-content: center; color: #f97316;">
                    <i class="ph-bold ph-hand-coins" style="font-size: 18px;"></i>
                </div>
                <div>
                    <div style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Függő KP (futártól)</div>
                    <div style="font-size: 18px; font-weight: 800; color: #f97316;">${totalFilteredPendingKp.toLocaleString('hu-HU')} Ft</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; border-left: 1px solid #334155; padding-left: 24px;">
                <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(37, 99, 235, 0.15); display: flex; align-items: center; justify-content: center; color: #3b82f6;">
                    <i class="ph-bold ph-bank" style="font-size: 18px;"></i>
                </div>
                <div>
                    <div style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Kártyás utalásra vár</div>
                    <div style="font-size: 18px; font-weight: 800; color: #3b82f6;">${totalFilteredPendingCard.toLocaleString('hu-HU')} Ft</div>
                </div>
            </div>
        </div>
    `;
    accountingRunsContainer.appendChild(summaryCard);

    // Csoportosítás cégek szerint
    const groups = {};
    runs.forEach(run => {
        const comp = run.company || 'Egyéb';
        if (!groups[comp]) groups[comp] = [];
        groups[comp].push(run);
    });

    Object.keys(groups).sort().forEach(companyName => {
        const companyRuns = groups[companyName];
        let companyTotalCOD = 0;
        companyRuns.forEach(r => {
            const totals = getRunPaymentTotals(r);
            if (!totals.isFullySettled) {
                companyTotalCOD += (totals.pendingKp + totals.pendingCard);
            }
        });

        const groupEl = document.createElement('div');
        groupEl.className = 'accounting-company-group';
        groupEl.style.marginBottom = '25px';

        groupEl.innerHTML = `
            <div style="background: #0f172a; color: white; padding: 10px 16px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; letter-spacing: 0.5px;">${companyName}</span>
                <span style="font-size: 13px; background: #334155; padding: 2px 10px; border-radius: 20px;">Függőben: <strong>${companyTotalCOD.toLocaleString('hu-HU')} Ft</strong></span>
            </div>
            <div class="group-runs" style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 10px; background: #f8fafc; display: flex; flex-direction: column; gap: 8px;">
            </div>
        `;

        const runsContainer = groupEl.querySelector('.group-runs');
        companyRuns.forEach(run => {
            const el = document.createElement('div');
            el.className = 'unified-card acc-run-card';
            el.style.cssText = 'margin:0;overflow:hidden;';

            const totals = getRunPaymentTotals(run);
            const runCOD = totals.totalCod;
            el.setAttribute('data-total-cod', runCOD);
            el.setAttribute('data-run-id', run.id);

            const uncollected    = run.uncollectedOrderIds || [];
            const reasons        = run.uncollectedReasons || {};
            const partialOrders  = run.partialOrders || {};
            const bankTransferred = run.bankTransferredOrderIds || [];
            const paymentMethods = run.paymentMethods || {};
            const paymentStatusMap = run.paymentStatusMap || {};

            const pendingKpAmount = totals.pendingKp;
            const pendingCardAmount = totals.pendingCard;

            const isPartial = !totals.isFullySettled && run.settledAmount > 0;
            const hasCardWait = pendingCardAmount > 0;
            const hasKpWait = pendingKpAmount > 0;
            const isFullySettled = totals.isFullySettled;

            const isNeverSettled = totals.isNeverSettled;
            const circleColor = isFullySettled ? '#22c55e' : (isNeverSettled ? '#0284c7' : (hasKpWait ? '#eab308' : (hasCardWait ? '#2563eb' : '#cbd5e1')));
            const circleBg = isFullySettled ? '#22c55e' : (isNeverSettled ? '#f0f9ff' : (hasKpWait ? '#fef9c3' : (hasCardWait ? '#eff6ff' : '#fff')));
            const circleTextColor = isFullySettled ? '#fff' : (isNeverSettled ? '#0284c7' : (hasKpWait ? '#ca8a04' : (hasCardWait ? '#2563eb' : '#94a3b8')));
            const circleTitle = isFullySettled ? 'Elszámolva' : (isNeverSettled ? 'Elszámolásra vár' : (hasKpWait ? 'Függő készpénz' : (hasCardWait ? 'Kártyás utalásra vár' : 'Elszámolásra vár')));
            const btnClass = (isFullySettled || isPartial) ? 'btn-unsettle-run' : 'btn-settle-run';

            const kpWaitBadge = hasKpWait
                ? `<span style="font-size:10px;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:1px 7px;display:inline-flex;align-items:center;gap:3px;"><i class="ph-bold ph-hand-coins" style="font-size:10px;"></i>Függő KP: ${pendingKpAmount.toLocaleString('hu-HU')} Ft</span>`
                : '';

            const cardWaitBadge = hasCardWait
                ? `<span style="font-size:10px;font-weight:700;color:#2563eb;background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;padding:1px 7px;display:inline-flex;align-items:center;gap:3px;"><i class="ph-bold ph-bank" style="font-size:10px;"></i>Utalásra vár: ${pendingCardAmount.toLocaleString('hu-HU')} Ft</span>`
                : '';

            let statusBadge = '';
            if (isFullySettled) {
                statusBadge = `<span class="hac-badge hac-badge-green" style="font-size:10px;"><i class="ph-bold ph-check-circle" style="font-size:10px;"></i>Elszámolva</span>`;
            } else if (isNeverSettled) {
                statusBadge = `<span style="font-size:10px;font-weight:700;color:#0284c7;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:1px 7px;display:inline-flex;align-items:center;gap:3px;"><i class="ph-bold ph-hourglass-high" style="font-size:10px;"></i>Elszámolásra vár: ${totals.unsettledCod.toLocaleString('hu-HU')} Ft</span>`;
            } else {
                if (hasKpWait) statusBadge += kpWaitBadge + ' ';
                if (hasCardWait) statusBadge += cardWaitBadge;
                if (!hasKpWait && !hasCardWait && isPartial) {
                    statusBadge = `<span style="font-size:10px;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:1px 7px;">~${run.settledAmount.toLocaleString('hu-HU')} / ${runCOD.toLocaleString('hu-HU')} Ft</span>`;
                }
            }

            const codBadges = run.orders.filter(o => o.isCOD || o.isReturn).map(o => {
                const pd = getPaymentDetails(run, o);
                let badgeBg = '#f1f5f9';
                let badgeColor = '#475569';
                let statusLabel = 'Függő';

                if (o.isReturn) {
                    badgeBg = pd.isUncollected ? '#fee2e2' : '#f5f3ff';
                    badgeColor = pd.isUncollected ? '#ef4444' : '#6b21a8';
                    statusLabel = pd.isUncollected ? 'Meghiúsult visszahozatal' : 'Visszahozva';
                } else {
                    if (pd.isUncollected) {
                        badgeBg = '#fee2e2';
                        badgeColor = '#ef4444';
                        statusLabel = 'Kiesett';
                    } else if (pd.isBankTransferred) {
                        badgeBg = '#dbeafe';
                        badgeColor = '#3b82f6';
                        statusLabel = 'Utalva';
                    } else if (pd.isPartial) {
                        badgeBg = '#ffedd5';
                        badgeColor = '#f97316';
                        statusLabel = pd.isPending ? `Részleges (Vár: ${(pd.pendingKp + pd.pendingCard).toLocaleString('hu-HU')} Ft)` : 'Részleges';
                    } else if (pd.isNeverSettled) {
                        badgeBg = '#f1f5f9';
                        badgeColor = '#475569';
                        statusLabel = `Elszámolásra vár (${(o.codAmount || 0).toLocaleString('hu-HU')} Ft)`;
                    } else if (pd.isPending) {
                        if (pd.pendingCard > 0) {
                            badgeBg = '#eff6ff';
                            badgeColor = '#2563eb';
                            statusLabel = `Vár: ${pd.pendingCard.toLocaleString('hu-HU')} Ft`;
                        } else {
                            badgeBg = '#fff7ed';
                            badgeColor = '#c2410c';
                            statusLabel = `Vár: ${pd.pendingKp.toLocaleString('hu-HU')} Ft`;
                        }
                    } else {
                        badgeBg = '#d1fae5';
                        badgeColor = '#10b981';
                        statusLabel = pd.methodText;
                    }
                }
                return `<span class="acc-order-badge" style="font-size:10px; font-weight:700; background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeColor}33; padding:2px 6px; border-radius:6px; display:inline-flex; align-items:center; gap:3px;" title="${o.shippingName || ''} · ${statusLabel}">
                    ${o.id}
                </span>`;
            }).join(' ');

            const codBadgeContainer = codBadges 
                ? `<div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
                    <span style="font-size:10px; font-weight:600; color:#64748b; margin-right:4px;">Utánvétek:</span>
                    ${codBadges}
                   </div>` 
                : '';

            const orderChips = run.orders.map(o => {
                const isUncollected = uncollected.includes(o.id);
                const isBankTransferred = bankTransferred.includes(o.id);
                const partialInfo   = o.isCOD && !isUncollected && !isBankTransferred ? partialOrders[o.id] : null;
                const reasonText    = isUncollected && reasons[o.id] ? ` · ${reasons[o.id]}` : '';
                const method        = paymentMethods[o.id] || 'cash';
                const status        = paymentStatusMap[o.id] || 'received';
                const statusText    = status === 'pending' ? ' ⏳' : ' ✓';
                const statusColor   = status === 'pending' ? '#d97706' : '#16a34a';

                const pd = getPaymentDetails(run, o);

                const isSplit = typeof method === 'object' && method !== null;
                let paymentBreakdownHtml = '';
                if (isSplit) {
                    const sObj = typeof status === 'object' && status !== null ? status : {};
                    const parts = [];
                    if (method.cash > 0) {
                        const got = sObj.cash !== 'pending';
                        parts.push(`<span style="color:${got?'#10b981':'#d97706'}; font-weight:700;">${method.cash.toLocaleString('hu-HU')} Ft KP ${got?'✓':'⏳'}</span>`);
                    }
                    if (method.card > 0) {
                        const got = sObj.card !== 'pending';
                        parts.push(`<span style="color:${got?'#10b981':'#2563eb'}; font-weight:700;">${method.card.toLocaleString('hu-HU')} Ft Kártya ${got?'✓':'⏳'}</span>`);
                    }
                    if (method.bank > 0) {
                        const got = sObj.bank !== 'pending';
                        parts.push(`<span style="color:${got?'#10b981':'#0284c7'}; font-weight:700;">${method.bank.toLocaleString('hu-HU')} Ft Utalás ${got?'✓':'⏳'}</span>`);
                    }
                    paymentBreakdownHtml = `<span style="font-size:11px;font-weight:700;color:#1e293b; display:inline-flex; align-items:center; gap:4px; flex-wrap:wrap;">Bontott: ${parts.join(' + ')} <span style="font-weight:400;color:#94a3b8;">/ ${o.codAmount.toLocaleString('hu-HU')} Ft</span></span>`;
                }
                
                return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;${isUncollected ? 'opacity:.55;' : ''}">
                    <span style="font-size:12px;font-weight:700;color:#374151;min-width:95px;${isUncollected ? 'text-decoration:line-through;' : ''}">${o.id}</span>
                    <span style="font-size:12px;color:#64748b;flex:1;">${o.shippingName || '—'}</span>
                    ${o.isReturn
                        ? isUncollected
                            ? `<span style="font-size:11px;font-weight:700;color:#ef4444;">meghiúsult visszahozatal<span style="font-weight:400;color:#94a3b8;">${reasonText}</span></span>`
                            : `<span style="font-size:11px;font-weight:700;color:#6b21a8;">visszahozva</span>`
                        : o.isCOD
                            ? isUncollected
                                ? `<span style="font-size:11px;font-weight:700;color:#f97316;">nem érkezett<span style="font-weight:400;color:#94a3b8;">${reasonText}</span></span>`
                                : isBankTransferred && !isSplit
                                    ? `<span style="font-size:11px;font-weight:700;color:#3b82f6;">Elutalva (Banki utalás)<span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft</span></span>`
                                    : isSplit
                                        ? paymentBreakdownHtml
                                        : pd.isNeverSettled
                                            ? `<span style="font-size:11px;font-weight:700;color:#0284c7;">⏳ Utánvét (Elszámolásra vár)<span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft</span></span>`
                                            : partialInfo
                                                ? `<span style="font-size:11px;font-weight:700;color:#1d4ed8;">~${partialInfo.amount.toLocaleString('hu-HU')} Ft ${method === 'card' ? '💳' : method === 'bank' ? '🏦' : '💵'}<span style="font-size:11.5px;font-weight:700;color:${statusColor}">${statusText}</span><span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft${partialInfo.comment ? ' · ' + partialInfo.comment : ''}</span></span>`
                                                : (method === 'card'
                                                    ? `<span style="font-size:11px;font-weight:700;color:#2563eb;">💳 Kártya<span style="font-size:11.5px;font-weight:700;color:${statusColor}">${statusText}</span><span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft</span></span>`
                                                    : method === 'bank'
                                                        ? `<span style="font-size:11px;font-weight:700;color:#0284c7;">🏦 Utalás<span style="font-size:11.5px;font-weight:700;color:${statusColor}">${statusText}</span><span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft</span></span>`
                                                        : `<span style="font-size:11px;font-weight:700;color:#10b981;">💵 KP<span style="font-size:11.5px;font-weight:700;color:${statusColor}">${statusText}</span><span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft</span></span>`)
                            : isUncollected
                                ? `<span style="font-size:11px;font-weight:700;color:#f97316;">nem lett átadva<span style="font-weight:400;color:#94a3b8;">${reasonText}</span></span>`
                                : '<span style="font-size:11px;color:#94a3b8;">átadva</span>'}
                </div>`;
            }).join('');

            const settleKpBtn = hasKpWait
                ? `<button class="hac-btn-action btn-settle-kp" data-doc-id="${run.docId}" title="KP beérkezett" style="font-size:11px;font-weight:700;color:#f97316;background:#fff7ed;border:1.5px solid #fed7aa;border-radius:8px;padding:4px 9px;cursor:pointer;font-family:inherit;flex-shrink:0;">
                    <i class="ph-bold ph-hand-coins" style="font-size:11px;"></i> KP megjött
                   </button>`
                : '';

            const settleTransferBtn = hasCardWait
                ? `<button class="hac-btn-action btn-settle-transfer" data-doc-id="${run.docId}" title="Utalás beérkezett" style="font-size:11px;font-weight:700;color:#2563eb;background:#eff6ff;border:1.5px solid #93c5fd;border-radius:8px;padding:4px 9px;cursor:pointer;font-family:inherit;flex-shrink:0;">
                    <i class="ph-bold ph-check-square" style="font-size:11px;"></i> Kártya utalva
                   </button>`
                : '';

            el.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px;padding:11px 14px;">
                    <button class="${btnClass}" data-doc-id="${run.docId}"
                        title="${circleTitle}"
                        style="flex-shrink:0;width:36px;height:36px;border-radius:50%;border:2px solid ${circleColor};background:${circleBg};color:${circleTextColor};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;">
                        <i class="ph-bold ph-check" style="font-size:16px;"></i>
                    </button>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;flex-wrap:wrap;">
                            <span style="font-size:14px;font-weight:700;color:#0f172a;">${run.date}</span>
                            ${statusBadge}
                            ${uncollected.length > 0 ? `<span style="font-size:10px;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:1px 7px;"><i class="ph-bold ph-warning" style="font-size:9px;"></i> ${uncollected.length} kiesett</span>` : ''}
                        </div>
                        <div class="hac-meta">
                            <i class="ph-bold ph-user" style="font-size:11px;color:#374151;"></i>
                            <span style="font-weight:600;color:#374151;">${run.courier || '—'}</span>
                            <span style="color:#d1d5db;">·</span>
                            <span style="color:#94a3b8;">${run.orders.length} rendelés</span>
                            ${runCOD > 0 ? `<span style="color:#d1d5db;">·</span><strong style="color:#b91c1c;">${runCOD.toLocaleString('hu-HU')} Ft</strong>` : ''}
                        </div>
                        ${codBadgeContainer}
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        ${settleKpBtn}
                        ${settleTransferBtn}
                        <button class="hac-btn-action hac-btn-ghost btn-print-summary" data-id="${run.id}" style="font-size:12px;">
                            <i class="ph-bold ph-printer" style="font-size:12px;"></i>
                        </button>
                        ${(run.isSettled || isPartial) ? `<button class="hac-btn-action hac-btn-ghost btn-modify-settlement" data-doc-id="${run.docId}" data-run-id="${run.id}" title="Elszámolás módosítása" style="font-size:12px;">
                            <i class="ph-bold ph-pencil-simple" style="font-size:12px;"></i>
                        </button>` : ''}
                        ${(run.isSettled || isPartial || uncollected.length > 0) ? `<button class="hac-btn-action btn-nullify-settlement" data-doc-id="${run.docId}" data-run-id="${run.id}" title="Visszavonás" style="font-size:11px;font-weight:700;color:#dc2626;background:#fee2e2;border:1.5px solid #fca5a5;border-radius:8px;padding:4px 9px;cursor:pointer;font-family:inherit;flex-shrink:0;">
                            <i class="ph-bold ph-x-circle" style="font-size:11px;"></i> Visszavonás
                        </button>` : ''}
                        <button class="acc-expand-btn" style="background:none;border:1.5px solid #e2e8f0;border-radius:8px;padding:6px 8px;cursor:pointer;color:#64748b;display:flex;align-items:center;transition:all .2s;" title="Rendelések mutatása">
                            <i class="ph-bold ph-caret-down" style="font-size:13px;transition:transform .2s;"></i>
                        </button>
                    </div>
                </div>
                <div class="acc-orders-panel" style="display:none;padding:0 14px 12px 62px;border-top:1px solid #f1f5f9;">
                    ${orderChips}
                </div>
            `;
            runsContainer.appendChild(el);
        });

        accountingRunsContainer.appendChild(groupEl);
    });

    accountingRunsContainer.querySelectorAll('.btn-print-summary').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const runId = e.target.closest('button').getAttribute('data-id');
            if (runId && typeof generateDeliveryNotesHtml === 'function') generateDeliveryNotesHtml(runId);
        });
    });

    accountingRunsContainer.querySelectorAll('.btn-settle-run').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            const docId = button.getAttribute('data-doc-id');
            const card = button.closest('.acc-run-card');
            const totalCOD = parseInt(card.getAttribute('data-total-cod'));
            const runId = card.getAttribute('data-run-id');
            const run = await HistoryManager.getRunById(runId);
            if (!run) return;
            const result = await showSettlementDialog(run, totalCOD);
            if (result === null) return;
            if (await HistoryManager.updateSettlementStatus(
                docId, 
                result.settledAmount, 
                totalCOD, 
                result.uncollectedOrderIds, 
                result.uncollectedReasons, 
                result.partialOrders, 
                result.bankTransferredOrderIds, 
                result.uncollectedResponsibility,
                result.settledKpAmount,
                result.settledCardAmount,
                result.paymentMethods,
                null,
                result.paymentStatusMap
            )) renderAccountingRuns(ctx);
        });
    });

    accountingRunsContainer.querySelectorAll('.btn-unsettle-run').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            try {
                const button = e.target.closest('button');
                const docId = button.getAttribute('data-doc-id');
                if (!docId || docId === 'undefined') {
                    alert("Hiba: A terítés dokumentum azonosítója (docId) nem található!");
                    return;
                }
                const ok = await CustomDialog.confirm('Visszaállítás függőbe?\nAz elszámolási adat törlődik.');
                if (!ok) return;
                const success = await HistoryManager.revertToPending(docId);
                if (success) {
                    renderAccountingRuns(ctx);
                } else {
                    alert("Hiba történt a Firebase visszaállítás közben. Ellenőrizd a konzolt!");
                }
            } catch (err) {
                alert("Hiba a visszaállításkor: " + err.message);
            }
        });
    });

    accountingRunsContainer.querySelectorAll('.btn-nullify-settlement').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            try {
                const button = e.target.closest('button');
                const docId  = button.getAttribute('data-doc-id');
                if (!docId || docId === 'undefined') {
                    alert("Hiba: A terítés dokumentum azonosítója (docId) nem található!");
                    return;
                }
                const ok = await CustomDialog.confirm('Visszavonás?\nAz elszámolás törlődik, a kör függőbe kerül.');
                if (!ok) return;
                const success = await HistoryManager.revertToPending(docId);
                if (success) {
                    renderAccountingRuns(ctx);
                } else {
                    alert("Hiba történt a Firebase visszaállítás közben. Ellenőrizd a konzolt!");
                }
            } catch (err) {
                alert("Hiba a visszavonáskor: " + err.message);
            }
        });
    });

    accountingRunsContainer.querySelectorAll('.btn-modify-settlement').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            const docId = button.getAttribute('data-doc-id');
            const runId = button.getAttribute('data-run-id');
            const card = button.closest('.acc-run-card');
            const totalCOD = parseInt(card.getAttribute('data-total-cod'));
            const run = await HistoryManager.getRunById(runId);
            if (!run) return;
            const existingState = {
                uncollectedOrderIds: run.uncollectedOrderIds || [],
                uncollectedReasons: run.uncollectedReasons || {},
                partialOrders: run.partialOrders || {},
                bankTransferredOrderIds: run.bankTransferredOrderIds || [],
                uncollectedResponsibility: run.uncollectedResponsibility || {},
                paymentMethods: run.paymentMethods || {},
                settledKpAmount: run.settledKpAmount || null,
                settledCardAmount: run.settledCardAmount || null,
                paymentStatusMap: run.paymentStatusMap || {}
            };
            const result = await showSettlementDialog(run, totalCOD, existingState);
            if (result === null) return;
            if (await HistoryManager.updateSettlementStatus(
                docId, 
                result.settledAmount, 
                totalCOD, 
                result.uncollectedOrderIds, 
                result.uncollectedReasons, 
                result.partialOrders, 
                result.bankTransferredOrderIds, 
                result.uncollectedResponsibility,
                result.settledKpAmount,
                result.settledCardAmount,
                result.paymentMethods,
                null,
                result.paymentStatusMap
            )) renderAccountingRuns(ctx);
        });
    });

    accountingRunsContainer.querySelectorAll('.btn-settle-transfer').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const docId = e.target.closest('button').getAttribute('data-doc-id');
            const ok = await CustomDialog.confirm('Megerősíted, hogy a kártyás utalás megérkezett a bankszámlára ehhez a terítéshez?');
            if (!ok) return;
            if (await HistoryManager.settlePaymentGroup(docId, 'card')) {
                renderAccountingRuns(ctx);
            }
        });
    });

    accountingRunsContainer.querySelectorAll('.btn-settle-kp').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const docId = e.target.closest('button').getAttribute('data-doc-id');
            const ok = await CustomDialog.confirm('Megerősíted, hogy a függő készpénz (KP) beérkezett ehhez a terítéshez?');
            if (!ok) return;
            if (await HistoryManager.settlePaymentGroup(docId, 'cash')) {
                renderAccountingRuns(ctx);
            }
        });
    });

    accountingRunsContainer.querySelectorAll('.acc-expand-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.acc-run-card');
            if (!card) return;
            const panel = card.querySelector('.acc-orders-panel');
            const icon = btn.querySelector('i');
            const isOpen = panel.style.display !== 'none';
            panel.style.display = isOpen ? 'none' : 'block';
            icon.style.transform = isOpen ? '' : 'rotate(180deg)';
        });
    });
}
