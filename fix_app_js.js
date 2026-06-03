const fs = require('fs');

let content = fs.readFileSync('js/app.js', 'utf8');

// 1. Remove let orders = []; (handling CRLF)
content = content.replace(/^[ \t]*let orders = \[\];[ \t]*\r?\n/m, '');

// 2. Fix variable assignments
content = content.replace(/\borders\.length\b/g, 'Store.orders.length');
content = content.replace(/\borders = \[\]/g, 'Store.setOrders([])');
content = content.replace(/\borders\.push\(/g, 'Store.addOrder(');
content = content.replace(/\borders\.some\(/g, 'Store.orders.some(');
content = content.replace(/\borders\.find\(/g, 'Store.orders.find(');
content = content.replace(/\borders\.filter\(/g, 'Store.orders.filter(');
content = content.replace(/\borders = Store\.orders\.filter\((.*)\)/g, 'Store.setOrders(Store.orders.filter($1))');
content = content.replace(/ShopifyParser\.parse\(rows, orders\)/, 'ShopifyParser.parse(rows, Store.orders)');
content = content.replace(/\borders, orderList/g, 'orders: Store.orders, orderList');
content = content.replace(/\borders\.splice/g, 'Store.orders.splice');
content = content.replace(/JSON\.stringify\(orders\)/g, 'JSON.stringify(Store.orders)');
content = content.replace(/\borders = JSON\.parse\((.*)\)/g, 'Store.setOrders(JSON.parse($1))');
content = content.replace(/\borders\.forEach\(/g, 'Store.orders.forEach(');

// 3. Remove merge elements
content = content.replace(/^[ \t]*const btnToggleMergeMode.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const mergeActionBar.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const mergeSelectionLabel.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const btnDoMerge.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const btnCancelMergeMode.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const mergeModal =.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const mergeDate.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const mergeCompany.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const mergeCourier.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const btnMergeSubmit.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const btnMergeCancel.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const closeMergeModal.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const mergeModalSubtitle.*$\r?\n/m, '');
content = content.replace(/^[ \t]*let mergeSelectionMode.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const selectedForMerge.*$\r?\n/m, '');

// 4. Remove merge functions
content = content.replace(/^[ \t]*function updateMergeBar\(\) \{[\s\S]*?btnMergeSubmit\.addEventListener\('click', async \(\) => \{[\s\S]*?\}\);\r?\n/m, '');

// 5. Remove manual mode elements since we extract manualController
content = content.replace(/^[ \t]*const btnAddItemRow.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const mItemsContainer.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const btnSaveManual.*$\r?\n/m, '');
content = content.replace(/^[ \t]*const editOverlay.*$\r?\n/m, '');

// 6. Remove manual edit logic
content = content.replace(/^[ \t]*\/\/ --- Manuális Rendelés Modal ---[\s\S]*?updatePrintButtonState\(\);\r?\n[ \t]*\}\);\r?\n/m, '');

// 7. Replace manual modal edit click
content = content.replace(/[ \t]*if\(order\) \{\r?\n[ \t]*editingOrderInternalId[\s\S]*?manualModal\.classList\.add\('active'\);\r?\n[ \t]*\}/, '                if(order) manualController.editOrder(order);');

// 8. Replace btnAddManual event
content = content.replace(/[ \t]*btnAddManual\.addEventListener\('click', \(\) => \{\r?\n[ \t]*editingOrderInternalId = null;[\s\S]*?manualModal\.classList\.add\('active'\);\r?\n[ \t]*\}\);/, "    btnAddManual.addEventListener('click', () => {\n        manualController.resetForm();\n        manualModal.classList.add('active');\n    });");

// 9. Add manual controller init
content = content.replace(/^[ \t]*\/\/ --- HistoryManager ---/m, "    const manualController = initManualOrderController({\n        renderOrders,\n        updatePrintButtonState\n    });\n\n    // --- HistoryManager ---");
content = content.replace(/import \{ OrdersView \} from '\.\/views\/ordersView\.js';/, "import { Store } from './store/state.js';\nimport { OrdersView } from './views/ordersView.js';\nimport { initManualOrderController } from './controllers/manualOrderController.js';");

// 10. Remove undefined editingOrderInternalId
content = content.replace(/^[ \t]*let editingOrderInternalId = null;\r?\n/m, '');

fs.writeFileSync('js/app.js', content, 'utf8');
console.log("App.js fixed.");
