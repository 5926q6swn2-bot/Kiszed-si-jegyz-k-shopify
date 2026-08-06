/**
 * History View (Fő modul)
 * Koordinálja az Előzmények felületet és delegálja a feladatokat az al-moduloknak.
 */

import { renderHistoryRuns as renderList } from './history/historyList.js?v=3.2.0';
import { renderOrdersTab as renderOrders, renderSearchResults as renderSearch } from './history/historyOrders.js?v=3.2.0';
import { renderAccountingRuns as renderAccounting } from './history/historyAccounting.js?v=3.2.0';
import { renderTrashRuns as renderTrash } from './history/historyTrash.js?v=3.2.0';

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
