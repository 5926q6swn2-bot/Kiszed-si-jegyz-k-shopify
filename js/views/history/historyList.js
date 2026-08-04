/**
 * History List Sub-module (Szedések fül)
 * A mentett szállítási körök listázása, előnézeti kártyák és nyomtatási események.
 */

import { HistoryManager } from '../../services/history.js';
import { UnifiedPrinter } from '../../services/printer.js';

export async function renderHistoryRuns(ctx) {
    const { 
        historyRunsContainer, historySearchInput, isFiltered, attachHistoryEvents 
    } = ctx;
    
    if (!historyRunsContainer) return;

    const runs = await HistoryManager.getAllRuns();
    runs.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.timestamp || 0) - (a.timestamp || 0);
    });
    historyRunsContainer.innerHTML = '';
    
    // Szűrés a dátum/cég szerint
    let filteredRuns = runs.filter(r => isFiltered(r));
    
    const q = historySearchInput ? historySearchInput.value.trim().toLowerCase() : '';
    if (q.length >= 2) {
        filteredRuns = filteredRuns.filter(run => {
            const courierMatch = run.courier ? String(run.courier).toLowerCase().includes(q) : false;
            const companyMatch = run.company ? String(run.company).toLowerCase().includes(q) : false;
            const orderMatch = run.orders.some(o => {
                const name = o.shippingName ? String(o.shippingName).toLowerCase() : '';
                const id = o.id ? String(o.id).toLowerCase() : '';
                const addr = o.address ? String(o.address).toLowerCase() : '';
                const phone = o.shippingPhone ? String(o.shippingPhone) : '';
                const items = o.items?.some(it => it.name && String(it.name).toLowerCase().includes(q)) || false;
                return id.includes(q) || name.includes(q) || addr.includes(q) || phone.includes(q) || items;
            });
            return courierMatch || companyMatch || orderMatch;
        });
    }

    if (filteredRuns.length === 0) {
        historyRunsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; margin-top: 20px;">Nincsenek a feltételnek megfelelő mentett körök.</p>';
        return;
    }
    
    const visibleRuns = filteredRuns;

    visibleRuns.forEach(run => {
        const el = document.createElement('div');
        el.className = 'history-apple-card';
        const dateStr = new Date(run.timestamp).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const modifiedBadge = run.isModified
            ? `<span class="hac-badge" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ph-bold ph-pencil-simple" style="font-size:10px;"></i>Módosítva${run.modifyCount > 1 ? ` (${run.modifyCount}×)` : ''}</span>`
            : '';

        const previewChips = run.orders.map(o => {
            const isRet = !!o.isReturn;
            const borderStyle = isRet ? 'border: 1.5px solid #d8b4fe; background: #faf5ff;' : '';
            const retIcon = isRet ? '<i class="ph-bold ph-arrow-counter-clockwise" style="color:#6b21a8;font-size:11px;" title="Visszaszállítás"></i>' : '';
            return `<span class="hac-order-chip" title="${o.address || ''}" style="gap:5px;display:inline-flex;align-items:center;${borderStyle}">
                ${retIcon}
                <span class="hac-chip-id" style="${isRet ? 'color:#6b21a8;' : ''}">${o.id}</span>
                <span class="hac-chip-name" style="${isRet ? 'color:#581c87;' : ''}">${o.shippingName || ''}</span>
                <i class="ph-bold ph-printer btn-print-chip-delivery no-print" data-run-id="${run.id}" data-order-id="${o.id}" style="cursor:pointer;color:#64748b;font-size:11px;padding:2px;transition:color .15s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'"></i>
            </span>`;
        }).join('');
        el.innerHTML = `
            <div class="hac-row">
                <div class="hac-info">
                    <span class="hac-company">${run.company || '-'}</span>
                    <span class="hac-date">${run.date}</span>
                    ${modifiedBadge}
                    <span class="hac-sep">·</span>
                    <i class="ph-bold ph-user" style="font-size:10px;color:#374151;"></i><span class="hac-courier">${run.courier}</span>
                    <span class="hac-sep">·</span>
                    <span class="hac-timestamp">${run.orders.length} r · ${dateStr}</span>
                </div>
                <div class="hac-prints">
                    <button class="hac-print-btn btn-print-picking" data-id="${run.id}" title="Szedőlista">
                        <i class="ph-bold ph-clipboard-text"></i>
                    </button>
                    <button class="hac-print-btn btn-print-delivery" data-id="${run.id}" title="Szállítólevelek">
                        <i class="ph-bold ph-truck"></i>
                    </button>
                    <button class="hac-print-btn btn-print-summary" data-id="${run.id}" title="Összesítő">
                        <i class="ph-bold ph-file-text"></i>
                    </button>
                    <button class="hac-print-btn hac-print-primary btn-print-bundle" data-id="${run.id}" title="Teljes csomag nyomtatása">
                        <i class="ph-bold ph-printer"></i>Teljes
                    </button>
                </div>
                <div class="hac-actions">
                    <button class="hac-btn-load btn-load-run" data-id="${run.id}">Betöltés</button>
                    <button class="hac-btn-del btn-delete-run" data-id="${run.id}" title="Törlés">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                    <button class="hac-btn-preview btn-toggle-preview" title="Rendelések előnézete">
                        <i class="ph-bold ph-caret-down"></i>
                    </button>
                </div>
            </div>
            <div class="hac-preview">
                <div class="hac-preview-inner">${previewChips}</div>
            </div>
        `;
        historyRunsContainer.appendChild(el);
    });

    // Klikk kezelő az előzmények chip-nyomtató gombjaihoz
    historyRunsContainer.querySelectorAll('.btn-print-chip-delivery').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            const runId = btn.getAttribute('data-run-id');
            const orderId = btn.getAttribute('data-order-id');
            const run = await HistoryManager.getRunById(runId);
            if (run) {
                const order = run.orders.find(o => o.id === orderId);
                if (order) {
                    const tempRun = {
                        date: run.date,
                        courier: run.courier,
                        company: run.company,
                        sender: run.sender || 'capsula',
                        orders: [order]
                    };
                    await UnifiedPrinter.printSingle(tempRun, 'delivery');
                }
            }
        });
    });

    if (typeof attachHistoryEvents === 'function') {
        attachHistoryEvents();
    }
}
