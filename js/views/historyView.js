/**
 * History View (Fő modul)
 * Koordinálja az Előzmények felületet és delegálja a feladatokat az al-moduloknak.
 */

import { renderAccountingRuns as renderAccounting } from './history/historyAccounting.js';
import { renderTrashRuns as renderTrash } from './history/historyTrash.js';

let ctx = {};

export function initHistoryView(context) {
    ctx = context;
}

export async function renderAccountingRuns() {
    return await renderAccounting(ctx);
}

export async function renderTrashRuns() {
    return await renderTrash(ctx);
}
