const fs = require('fs');

function cleanFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const r of replacements) {
        content = content.replace(r.search, r.replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
}

// 1. Clean app.js
cleanFile('js/app.js', [
    // Import Store
    {
        search: /import \{ OrdersView \} from '\.\/views\/ordersView\.js';/,
        replace: "import { Store } from './store/state.js';\nimport { OrdersView } from './views/ordersView.js';"
    },
    // Remove local let orders
    {
        search: /    let orders = \[\];\n/,
        replace: ""
    },
    // Fix orders to Store.orders
    { search: /\borders\.length\b/g, replace: 'Store.orders.length' },
    { search: /\borders = \[\]/g, replace: 'Store.clearOrders()' },
    { search: /\borders\.push\(/g, replace: 'Store.addOrder(' },
    { search: /\borders\.some\(/g, replace: 'Store.orders.some(' },
    { search: /\borders\.find\(/g, replace: 'Store.orders.find(' },
    { search: /\borders\.filter\(/g, replace: 'Store.orders.filter(' },
    { search: /\borders = Store\.orders\.filter/g, replace: 'Store.setOrders(Store.orders.filter' },
    { search: /ShopifyParser\.parse\(rows, orders\)/, replace: 'ShopifyParser.parse(rows, Store.orders)' },
    { search: /\borders, orderList/g, replace: 'orders: Store.orders, orderList' },
    { search: /\borders\.splice/g, replace: 'Store.orders.splice' },
    { search: /JSON\.stringify\(orders\)/g, replace: 'JSON.stringify(Store.orders)' },
    { search: /\borders = JSON\.parse/g, replace: 'Store.setOrders(JSON.parse' },
    { search: /\borders\.forEach\(/g, replace: 'Store.orders.forEach(' },
    // Remove merge elements
    { search: /    const btnToggleMergeMode = document\.getElementById\('btn-toggle-merge-mode'\);\n    const mergeActionBar = document\.getElementById\('merge-action-bar'\);\n    const mergeSelectionLabel = document\.getElementById\('merge-selection-label'\);\n    const btnDoMerge = document\.getElementById\('btn-do-merge'\);\n    const btnCancelMergeMode = document\.getElementById\('btn-cancel-merge-mode'\);\n    const mergeModal = document\.getElementById\('merge-modal'\);\n    const mergeDate = document\.getElementById\('merge-date'\);\n    const mergeCompany = document\.getElementById\('merge-company'\);\n    const mergeCourier = document\.getElementById\('merge-courier'\);\n    const btnMergeSubmit = document\.getElementById\('btn-merge-submit'\);\n    const btnMergeCancel = document\.getElementById\('btn-merge-cancel'\);\n    const closeMergeModal = document\.getElementById\('close-merge-modal'\);\n    const mergeModalSubtitle = document\.getElementById\('merge-modal-subtitle'\);\n\n/, replace: '' },
    // Remove merge variables
    { search: /    let mergeSelectionMode = false;\n    const selectedForMerge = new Set\(\);\n/, replace: '' },
    // Remove merge functions
    { search: /    function updateMergeBar\(\) \{[\s\S]*?btnMergeSubmit\.addEventListener\('click', async \(\) => \{[\s\S]*?\}\);\n\n/g, replace: '' },
    // Remove manual mode elements since we extract manualController
    { search: /    const btnAddItemRow = document\.getElementById\('btn-add-item-row'\);\n    const mItemsContainer = document\.getElementById\('m-items-container'\);\n    const btnSaveManual = document\.getElementById\('btn-save-manual'\);\n    const editOverlay = document\.getElementById\('edit-overlay'\);\n/g, replace: '' },
    // Remove manual edit logic from app.js (already extracted to manualOrderController)
    { search: /    \/\/ --- Manuális Rendelés Modal ---[\s\S]*?updatePrintButtonState\(\);\n    \}\);\n/g, replace: '' },
    // Modify manual modal edit click
    { search: /                if\(order\) \{\n                    editingOrderInternalId[\s\S]*?manualModal\.classList\.add\('active'\);\n                \}/g, replace: '                if(order) manualController.editOrder(order);' },
    // Modify btnAddManual event
    { search: /    btnAddManual\.addEventListener\('click', \(\) => \{\n        editingOrderInternalId = null;[\s\S]*?manualModal\.classList\.add\('active'\);\n    \}\);/g, replace: "    btnAddManual.addEventListener('click', () => {\n        manualController.resetForm();\n        manualModal.classList.add('active');\n    });" },
    // Add manual controller init
    { search: /    \/\/ --- HistoryManager ---/g, replace: "    const manualController = initManualOrderController({\n        renderOrders,\n        updatePrintButtonState\n    });\n    // --- HistoryManager ---" },
    { search: /import \{ initManualOrderController \} from '\.\/controllers\/manualOrderController\.js';/g, replace: "import { initManualOrderController } from './controllers/manualOrderController.js';" },
    // Fix undefined editingOrderInternalId
    { search: /    let editingOrderInternalId = null;\n/, replace: '' }
]);

// 2. Clean index.html
cleanFile('index.html', [
    // Remove merge modal
    { search: /    \<!-- ÖSSZEVONÁS MODAL -->[\s\S]*?\<!-- ELŐZMÉNYEK MODAL -->/g, replace: '    <!-- ELŐZMÉNYEK MODAL -->' },
    // Remove merge action bar
    { search: /                \<!-- Összevonás Action Bar -->[\s\S]*?\<\/div>\n                \n                \<!-- Kártyák Container -->/g, replace: '                <!-- Kártyák Container -->' },
    // Remove btn-toggle-merge-mode
    { search: /                        \<button id="btn-toggle-merge-mode" class="history-action-btn" title="Körök összevonása">[\s\S]*?\<\/button>\n/g, replace: '' }
]);

// 3. Clean historyView.js
cleanFile('js/views/historyView.js', [
    { search: /        selectedForMerge, accountingFilterPending, /g, replace: '        accountingFilterPending, ' },
    { search: /            if \(Store\.selectedForMerge\.has\(run\.id\)\) el\.classList\.add\('merge-selected'\);\n/g, replace: '' },
    { search: /            const mergedBadge = run\.isMerged[\s\S]*?'';\n/g, replace: '' },
    { search: /            const revertBtn = run\.isMerged[\s\S]*?'';\n/g, replace: '' },
    { search: /                    \<label class="hac-checkbox-wrap" title="Kijelölés összevonáshoz">\n                        \<input type="checkbox" class="run-select-cb" data-id="\$\{run\.id\}" \$\{Store\.selectedForMerge\.has\(run\.id\) \? 'checked' : ''\}>\n                    \<\/label>\n/g, replace: '' },
    { search: /                        \$\{mergedBadge\}\$\{modifiedBadge\}\n/g, replace: '                        ${modifiedBadge}\n' },
    { search: /                        \$\{revertBtn\}\n/g, replace: '' },
    { search: /const visibleRuns = filteredRuns\.filter\(r => !r\.isMergedInto\);/g, replace: 'const visibleRuns = filteredRuns;' }
]);

// 4. Clean history.js
cleanFile('js/services/history.js', [
    { search: /        mergeRuns: async function\(selectedRunIds, newDate, newCourier, newCompany\) \{[\s\S]*?        \},/g, replace: '' },
    { search: /        revertMerge: async function\(mergedRunDocId\) \{[\s\S]*?        \},/g, replace: '' }
]);

// 5. Clean state.js
cleanFile('js/store/state.js', [
    { search: /    mergeSelectionMode: false,\n    selectedForMerge: new Set\(\),\n/g, replace: '' },
    { search: /    get mergeSelectionMode\(\) \{ return state\.mergeSelectionMode; \},\n    get selectedForMerge\(\) \{ return state\.selectedForMerge; \},\n/g, replace: '' },
    { search: /    setMergeSelectionMode\(isModeActive\) \{\n        state\.mergeSelectionMode = isModeActive;\n    \},\n\n    clearSelectedForMerge\(\) \{\n        state\.selectedForMerge\.clear\(\);\n    \},\n\n    addToSelectedForMerge\(id\) \{\n        state\.selectedForMerge\.add\(id\);\n    \},\n\n    removeFromSelectedForMerge\(id\) \{\n        state\.selectedForMerge\.delete\(id\);\n    \},\n\n/g, replace: '' }
]);

// 6. Clean stats.js
cleanFile('js/views/stats.js', [
    { search: /\$\{isMerged \? ' <span style="font-size:10px;font-weight:600;color:#8b5cf6;background:#f5f3ff;border-radius:5px;padding:1px 5px;margin-left:4px;">összevont<\/span>' : ''\}/g, replace: '' },
    { search: /                const isMerged = item\.variants\.length > 1;\n/g, replace: '' },
    { search: /                const variantInfo = isMerged[\s\S]*?:\n/g, replace: '                const variantInfo =\n' }
]);

console.log("Cleanup done.");
