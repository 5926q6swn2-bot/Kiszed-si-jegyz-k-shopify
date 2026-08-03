/**
 * History View (Fő modul)
 * Koordinálja az Előzmények felületet és delegálja a feladatokat az al-moduloknak.
 */

import { renderHistoryRuns as renderList } from './history/historyList.js';
import { renderOrdersTab as renderOrders, renderSearchResults as renderSearch } from './history/historyOrders.js';
import { renderAccountingRuns as renderAccounting } from './history/historyAccounting.js';
import { renderTrashRuns as renderTrash } from './history/historyTrash.js';

let ctx = {};

export function initHistoryView(context) {
    ctx = context;
}

export async function renderHistoryRuns() {
    return await renderList(ctx);
}

export async function renderOrdersTab() {
    return await renderOrders(ctx);
}

export async function renderAccountingRuns() {
    return await renderAccounting(ctx);
}

export async function renderTrashRuns() {
    return await renderTrash(ctx);
}

export function renderSearchResults(matches) {
    return renderSearch(ctx, matches);
}
