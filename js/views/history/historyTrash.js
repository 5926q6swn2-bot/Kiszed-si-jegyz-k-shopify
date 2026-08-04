/**
 * History Trash Sub-module (Szemetes fül)
 * Törölt szállítási körök megjelenítése, 90 napos visszaállítás és végleges törlés.
 */

import { HistoryManager } from '../../services/history.js';
import { CustomDialog } from '../../utils/dialog.js';

export async function renderTrashRuns(ctx) {
    const { 
        trashRunsContainer, isFiltered 
    } = ctx;
    
    if (!trashRunsContainer) return;

    let runs = await HistoryManager.getTrashRuns();
    runs.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.timestamp || 0) - (a.timestamp || 0);
    });
    trashRunsContainer.innerHTML = '';
    
    // Szűrés
    runs = runs.filter(r => isFiltered(r, true));

    if(runs.length === 0) {
        trashRunsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; margin-top: 20px;">Nincsenek a feltételnek megfelelő törölt körök.</p>';
        return;
    }

    runs.forEach(run => {
        const el = document.createElement('div');
        el.className = 'history-apple-card';
        const deletedDate = new Date(run.deletedAt).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        el.innerHTML = `
            <div class="hac-header" style="padding:13px 16px;">
                <div style="flex:1;min-width:0;">
                    <div class="hac-date">${run.date}</div>
                    <div class="hac-meta" style="margin-top:2px;">
                        <span class="hac-company" style="font-size:9px;padding:3px 8px;">${run.company || '-'}</span>
                        <span style="color:#d1d5db;">·</span><i class="ph-bold ph-user" style="font-size:11px;color:#374151;"></i><span style="font-weight:600;color:#374151;">${run.courier || '-'}</span>
                        <span style="color:#d1d5db;">·</span><span style="color:#94a3b8;">${run.orders.length} rendelés · ${deletedDate}</span>
                    </div>
                </div>
                <div class="hac-actions">
                    <button class="hac-btn-action hac-btn-green btn-restore-run" data-id="${run.docId}">
                        <i class="ph-bold ph-arrow-counter-clockwise" style="font-size:12px;"></i>Visszaállítás
                    </button>
                    <button class="hac-btn-del btn-permanent-delete-run" data-id="${run.docId}" title="Végleges törlés">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </div>
            </div>
        `;
        trashRunsContainer.appendChild(el);
    });

    trashRunsContainer.querySelectorAll('.btn-restore-run').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const docId = e.target.getAttribute('data-id');
            const ok = await HistoryManager.restoreRun(docId);
            if (ok) {
                await renderTrashRuns(ctx);
                await CustomDialog.alert('A szállítási kör sikeresen visszaállítva az előzményekbe!', 'Visszaállítva', 'success');
            }
        });
    });

    trashRunsContainer.querySelectorAll('.btn-permanent-delete-run').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const docId = e.target.closest('button').getAttribute('data-id');
            const confirm = await CustomDialog.confirm('Biztosan VÉGLEGESEN törlöd ezt a kört? Ezután már nem lehet visszaállítani!', 'Végleges Törlés', 'error', true);
            if(confirm) {
                await HistoryManager.permanentDeleteRun(docId);
                await renderTrashRuns(ctx);
            }
        });
    });
}
