import { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, addDoc, getDocs, getDoc, setDoc, deleteDoc, updateDoc, doc, query, orderBy, where, limit, deleteField, writeBatch, arrayUnion, arrayRemove, increment } from './firebase-config.js?v=40';
import { CustomDialog } from './utils/dialog.js';
import { HistoryManager } from './services/history.js';
import { UnifiedPrinter } from './services/printer.js';
import { ShopifyParser } from './services/shopify.js';
import { initHistoryView, renderHistoryRuns, renderOrdersTab, renderAccountingRuns, renderTrashRuns, renderSearchResults } from './views/historyView.js';
import { OrdersView } from './views/ordersView.js';
import { renderStatistics } from './views/stats.js';

import { generatePdfHtml, openPdfView, generateDeliveryNotesHtml } from './utils/printTemplates.js';
function initApp() {
    console.log("KOPJ Rendszer: app.js elindult");

    // --- GLOBÁLIS HIBAJELZŐ ---
    window.onerror = function(msg, url, lineNo, columnNo, error) {
        alert("KRITIKUS HIBA:\n" + msg + "\nSor: " + lineNo + "\nFile: " + url);
        return false;
    };

    // --- FIREBASE AUTHENTICATION ---
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const mainApp = document.getElementById('main-app');
    const btnLogout = document.getElementById('btn-logout');
    const userEmailDisplay = document.getElementById('user-email-display');

    // (A bejelentkezést már az index.html kezeli)
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Bejelentkezve
            loginOverlay.classList.remove('active');
            mainApp.style.display = 'flex';
            userEmailDisplay.textContent = user.email;
        } else {
            // Kijelentkezve
            loginOverlay.classList.add('active');
            mainApp.style.display = 'none';
        }
    });

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            signOut(auth);
        });
    }


    // --- EGYEDI DIALOG RENDSZER ---
    // A CustomDialog modulárisan van beimportálva a fájl tetején.

    // DOM Elemek
    const fileInput = document.getElementById('file-input');
    const orderList = document.getElementById('order-list');
    const emptyState = document.getElementById('empty-state');
    const printDateDisplay = document.getElementById('print-date-display');
    
    // Island & Top Gombok
    const btnImport = document.getElementById('btn-import');
    const btnAddManual = document.getElementById('btn-add-manual');
    const btnReset = document.getElementById('btn-reset');
    const btnPrint = document.getElementById('btn-print');
    const btnHistory = document.getElementById('btn-history');
    const btnSortMode = document.getElementById('btn-sort-mode');

    // Modal Elemek
    const manualModal = document.getElementById('manual-modal');
    const printSettingsModal = document.getElementById('print-settings-modal');
    const historyModal = document.getElementById('history-modal');
    const btnCloseModals = document.querySelectorAll('.close-modal');
    const btnAddItemRow = document.getElementById('btn-add-item-row');
    const mItemsContainer = document.getElementById('m-items-container');
    const btnSaveManual = document.getElementById('btn-save-manual');
    const editOverlay = document.getElementById('edit-overlay');
    
    // Biztonsági ellenőrzés
    if (!loginForm) console.warn("HIÁNYZIK: login-form");
    if (!mainApp) console.warn("HIÁNYZIK: main-app");
    if (!loginOverlay) console.warn("HIÁNYZIK: login-overlay");
    
    // History & Print Form Elemek
    const btnConfirmPrint = document.getElementById('btn-confirm-print');
    const psPickupDateInput = document.getElementById('ps-pickup-date');
    const psDateInput = document.getElementById('ps-date');
    const psCourierInput = document.getElementById('ps-courier');
    const psCompanyInput = document.getElementById('ps-company');
    const psSenderInput = document.getElementById('ps-sender');
    const historySearchInput = document.getElementById('history-search-input');
    const historyDateStart = document.getElementById('history-date-start');
    const historyDateEnd = document.getElementById('history-date-end');
    const historyRunsContainer = document.getElementById('history-runs-container');
    const historySearchResults = document.getElementById('history-search-results');
    const hsResultsContainer = document.getElementById('hs-results-container');
    const historyRunsView = document.getElementById('history-runs-view');
    const tabBtnHistory = document.getElementById('tab-btn-history');
    const tabBtnOrders = document.getElementById('tab-btn-orders');
    const tabBtnAccounting = document.getElementById('tab-btn-accounting');
    const tabBtnStats = document.getElementById('tab-btn-stats');
    const tabContentHistory = document.getElementById('tab-content-history');
    const tabContentOrders = document.getElementById('tab-content-orders');
    const tabContentAccounting = document.getElementById('tab-content-accounting');
    const tabContentStats = document.getElementById('tab-content-stats');
    const trashView = document.getElementById('trash-view');
    const modalTabsBar = document.querySelector('#history-modal .modal-tabs');
    const modalSearchBar = document.querySelector('#history-modal .modal-body > .form-group');
    const accountingRunsContainer = document.getElementById('accounting-runs-container');
    const trashRunsContainer = document.getElementById('trash-runs-container');
    const statsRunsContainer = document.getElementById('stats-runs-container');
    const statsSummaryBox = document.getElementById('stats-summary-box');
    const statsDateStart = document.getElementById('stats-date-start');
    const statsDateEnd = document.getElementById('stats-date-end');
    const accountingFilterPending = document.getElementById('accounting-filter-pending');
    const historyCompanyFilter = document.getElementById('history-company-filter');
    const trashCompanyFilter = document.getElementById('trash-company-filter');
    const trashDateStart = document.getElementById('trash-date-start');
    const trashDateEnd = document.getElementById('trash-date-end');
    const psNewCompanyGroup = document.getElementById('ps-new-company-group');
    const psNewCompanyInput = document.getElementById('ps-new-company');
    const btnToggleMergeMode = document.getElementById('btn-toggle-merge-mode');
    const mergeActionBar = document.getElementById('merge-action-bar');
    const mergeSelectionLabel = document.getElementById('merge-selection-label');
    const btnDoMerge = document.getElementById('btn-do-merge');
    const btnCancelMergeMode = document.getElementById('btn-cancel-merge-mode');
    const mergeModal = document.getElementById('merge-modal');
    const mergeDate = document.getElementById('merge-date');
    const mergeCompany = document.getElementById('merge-company');
    const mergeCourier = document.getElementById('merge-courier');
    const btnMergeSubmit = document.getElementById('btn-merge-submit');
    const btnMergeCancel = document.getElementById('btn-merge-cancel');
    const closeMergeModal = document.getElementById('close-merge-modal');
    const mergeModalSubtitle = document.getElementById('merge-modal-subtitle');

    // Állapot
    let orders = [];
    let sortableInstance = null;
    let sortModeActive = false;
    let currentLoadedRunId = null;
    let originalLoadedRun = null;
    let editingOrderInternalId = null;
    let mergeSelectionMode = false;
    const selectedForMerge = new Set();
    let statsLeafletMap = null;
    let activeStatsTab = 'charts';
    const geoCache = JSON.parse(localStorage.getItem('hu_zip_geocache_v1') || '{}');

    // --- HistoryManager ---
    // A HistoryManager modulárisan van beimportálva a fájl tetején.

    // Kezdeti üres állapot renderelése
    renderOrders();


    // --- Rendezési mód toggle ---
    if (btnSortMode) {
        btnSortMode.addEventListener('click', () => {
            if (orders.length === 0) return;
            sortModeActive = !sortModeActive;
            orderList.classList.toggle('sort-mode-active', sortModeActive);
            btnSortMode.classList.toggle('sort-mode-btn-active', sortModeActive);
            initSortable();
        });
    }


    // --- Reset ---
    btnReset.addEventListener('click', async () => {
        if(orders.length === 0) return;
        const isConfirmed = await CustomDialog.confirm('Biztosan törlöd az összes eddigi rendelést a listából?', 'Lista Törlése', 'warning', true);
        if(isConfirmed) {
            orders = [];
            currentLoadedRunId = null;
            originalLoadedRun = null;
            sortModeActive = false;
            orderList.classList.remove('sort-mode-active');
            if (btnSortMode) btnSortMode.classList.remove('sort-mode-btn-active');
            renderOrders();
        }
    });

    // --- Fájl feltöltés ---
    btnImport.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });

    async function handleFile(file) {
        if (!file.name.endsWith('.csv')) {
            await CustomDialog.alert('Kérlek érvényes CSV fájlt tölts fel a Shopify-ból!', 'Hibás formátum', 'error');
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                processShopifyData(results.data);
            }
        });
        
        fileInput.value = '';
    }

    // --- Üzleti Logika ---
    function processShopifyData(rows) {
        const result = ShopifyParser.parse(rows, orders);
        
        result.newOrders.forEach(order => {
            orders.push(order);
        });

        if (result.skippedOrderIds.size > 0) {
            CustomDialog.alert(`${result.skippedOrderIds.size} db ismétlődő rendelést automatikusan kihagytunk a betöltésből.`, 'Duplikáció szűrve');
        }

        renderOrders();
        
        const now = new Date();
        printDateDisplay.textContent = `Készült: ${now.toLocaleDateString('hu-HU')} ${now.toLocaleTimeString('hu-HU')}`;
    }

    // Segédfüggvény munkanapok számolásához
    function getBusinessDaysCount(startDate, endDate) {
        if (!startDate || !endDate) return 0;
        let count = 0;
        let curDate = new Date(startDate.getTime());
        curDate.setHours(12, 0, 0, 0);
        const targetDate = new Date(endDate.getTime());
        targetDate.setHours(12, 0, 0, 0);

        while (curDate < targetDate) {
            curDate.setDate(curDate.getDate() + 1);
            const dayOfWeek = curDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Nem vasárnap és nem szombat
                count++;
            }
        }
        return count;
    }

    

    function needsMarkerLabel(name, isCollapsedProfile) {
        if (isCollapsedProfile) return false;
        const excludedRegex = /(ragasztó|tapadóhíd|mélyalapozó|profil)/i;
        if (excludedRegex.test(name)) return false;
        return true;
    }

    // --- UI Renderelés ---
    function renderOrders() {
        OrdersView.render({
            orders, orderList, emptyState, btnPrint,
            needsMarkerLabel, getBusinessDaysCount,
            attachCardEvents, updatePrintButtonState, updateIndexes, initSortable,
            sortModeActive
        });
    }

    function initSortable() {
        if (sortableInstance) {
            sortableInstance.destroy();
        }
        const scrollContainer = document.querySelector('.content-body');
        sortableInstance = new Sortable(orderList, {
            animation: 80,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            handle: sortModeActive ? '.order-card' : '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            scroll: scrollContainer || true,
            scrollSensitivity: 80,
            scrollSpeed: 12,
            onStart: function() {
                orderList.classList.add('dragging-active');
                document.body.style.userSelect = 'none';
                document.body.style.webkitUserSelect = 'none';
            },
            onMove: function(evt) {
                if (!evt.related) return;
                const items = Array.from(orderList.children);
                const relatedIndex = items.indexOf(evt.related);
                if (relatedIndex < 0) return;
                const newPos = evt.willInsertAfter ? relatedIndex + 1 : relatedIndex;
                const ghost = orderList.querySelector('.sortable-ghost');
                if (ghost) {
                    const badge = ghost.querySelector('.order-index');
                    if (badge) badge.textContent = newPos + 1;
                }
            },
            onEnd: function(evt) {
                orderList.classList.remove('dragging-active');
                document.body.style.userSelect = '';
                document.body.style.webkitUserSelect = '';
                const movedItem = orders.splice(evt.oldIndex, 1)[0];
                orders.splice(evt.newIndex, 0, movedItem);
                updateIndexes();
            }
        });

        // Compact custom drag image via native setDragImage (runs after Sortable binds dragstart, so overrides it)
        if (!orderList.dataset.dragImgListenerSet) {
            orderList.dataset.dragImgListenerSet = '1';
            orderList.addEventListener('dragstart', function(e) {
                if (!e.dataTransfer) return;
                const card = e.target.closest('.order-card');
                if (!card) return;
                const badgeEl = card.querySelector('.order-index');
                const idEl = card.querySelector('.order-id');
                const badgeNum = badgeEl ? badgeEl.textContent.trim() : '';
                const orderId = idEl ? (idEl.firstChild && idEl.firstChild.nodeType === 3 ? idEl.firstChild.textContent.trim() : idEl.textContent.trim().split('\n')[0].trim()) : '';
                const img = document.createElement('div');
                img.style.cssText = 'position:fixed;top:-200px;left:0;background:rgba(255,255,255,0.97);border:2px solid #6366f1;border-radius:12px;padding:8px 16px 8px 10px;display:flex;align-items:center;gap:10px;min-width:160px;box-shadow:0 8px 20px rgba(0,0,0,0.15);';
                img.innerHTML = `<div style="width:28px;height:28px;background:#1e293b;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${badgeNum}</div><span style="font-weight:700;font-size:14px;color:#1e293b;">${orderId}</span>`;
                document.body.appendChild(img);
                e.dataTransfer.setDragImage(img, 25, 20);
                requestAnimationFrame(() => img.remove());
            });
        }
    }

    function updateIndexes() {
        const cards = orderList.querySelectorAll('.order-card');
        cards.forEach((card, index) => {
            const indexBadge = card.querySelector('.order-index');
            if (indexBadge) {
                indexBadge.textContent = index + 1;
            }
        });
    }

    function attachCardEvents() {
        document.querySelectorAll('.btn-print-order').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const card = e.target.closest('.order-card');
                const internalId = card.getAttribute('data-internal-id');
                const order = orders.find(o => o.internalId === internalId);
                
                if (order) {
                    const tempRun = {
                        date: new Date().toLocaleDateString('hu-HU'),
                        courier: 'Egyedi Nyomtatás',
                        company: 'KOPJ',
                        sender: 'capsula',
                        orders: [order]
                    };
                    await UnifiedPrinter.printSingle(tempRun, 'delivery');
                }
            });
        });

        document.querySelectorAll('.btn-ack').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderInternalId = e.target.getAttribute('data-order-internal-id');
                const errId = e.target.getAttribute('data-err-id');
                
                const order = orders.find(o => o.internalId === orderInternalId);
                if (order) {
                    const errObj = order.errors.find(err => err.id === errId);
                    
                    if (errObj && errObj.title === "Függő Utalás") {
                        order.isPaid = true;
                    }

                    order.errors = order.errors.filter(err => err.id !== errId);
                    
                    const errorBox = document.getElementById(`err-${errId}`);
                    if (errorBox) {
                        errorBox.classList.add('shrink-out');
                        setTimeout(() => {
                            errorBox.remove();
                            if(order.errors.length === 0) {
                                const card = document.querySelector(`.order-card[data-internal-id="${orderInternalId}"]`);
                                if(card) card.classList.remove('has-error');
                            }
                            if (order.isBankDeposit && order.isPaid) {
                                const badge = document.querySelector(`.badge[data-internal-id="${orderInternalId}"]`);
                                if (badge) {
                                    badge.className = 'badge badge-paid nowrap';
                                    badge.textContent = 'UTALVA (FIZETVE)';
                                }
                            }
                            updatePrintButtonState();
                        }, 400); 
                    }
                }
            });
        });

        document.querySelectorAll('.profile-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const toggleId = e.target.getAttribute('data-toggle-id');
                const subItemsDiv = document.getElementById(`sub-${toggleId}`);
                if (subItemsDiv) {
                    if (subItemsDiv.style.display === 'none') {
                        subItemsDiv.style.display = 'block';
                        e.target.textContent = '▲';
                    } else {
                        subItemsDiv.style.display = 'none';
                        e.target.textContent = '▼';
                    }
                }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const card = e.target.closest('.order-card');
                const internalId = card.getAttribute('data-internal-id');
                const order = orders.find(o => o.internalId === internalId);
                
                const isConfirmed = await CustomDialog.confirm(`Biztosan törlöd a(z) <strong>${order.id}</strong> számú rendelést?`, 'Rendelés Törlése', 'warning', true);
                
                if(isConfirmed) {
                    // Nincs inline editing, ezt kivesszük
                    
                    card.classList.add('shatter-out');
                    
                    setTimeout(() => {
                        orders = orders.filter(o => o.internalId !== internalId);
                        card.remove();
                        updateIndexes();
                        updatePrintButtonState();
                        
                        if(orders.length === 0) {
                            emptyState.style.display = 'flex';
                        }
                    }, 500);
                }
            });
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.order-card');
                const internalId = card.getAttribute('data-internal-id');
                const order = orders.find(o => o.internalId === internalId);
                
                if(order) {
                    editingOrderInternalId = internalId;
                    document.getElementById('manual-modal-title').textContent = 'Megrendelés Szerkesztése';
                    document.getElementById('manual-modal-desc').textContent = 'Adatok módosítása';
                    document.getElementById('btn-save-manual').textContent = 'Mentés';
                    
                    document.getElementById('m-order-num').value = order.id;
                    document.getElementById('m-customer').value = order.shippingName;
                    document.getElementById('m-address').value = order.address;
                    document.getElementById('m-phone').value = order.shippingPhone;
                    document.getElementById('m-balance').value = order.isCOD ? order.codAmount : 0;
                    
                    mItemsContainer.innerHTML = '';
                    order.items.forEach(item => {
                        const row = document.createElement('div');
                        row.className = 'm-item-row';
                        row.innerHTML = `
                            <input type="number" class="m-item-qty" placeholder="Db" min="1" value="${item.qty}" required>
                            <input type="text" class="m-item-name" placeholder="Termék megnevezése" value="${item.name}" required>
                            <button type="button" class="btn-remove-item">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        `;
                        mItemsContainer.appendChild(row);
                        row.querySelector('.btn-remove-item').addEventListener('click', function() {
                            row.remove();
                        });
                    });
                    
                    manualModal.classList.add('active');
                }
            });
        });
    }

    function updatePrintButtonState() {
        const hasAnyErrors = orders.some(o => o.errors.length > 0);
        
        if (hasAnyErrors || orders.length === 0) {
            btnPrint.disabled = true;
            if (hasAnyErrors) {
                btnPrint.setAttribute('title', 'Kérlek előbb nyugtázd a hibákat!');
            }
        } else {
            btnPrint.disabled = false;
            btnPrint.removeAttribute('title');
        }
    }

    // --- Modál Bezárások ---
    btnCloseModals.forEach(btn => {
        btn.addEventListener('click', () => {
            manualModal.classList.remove('active');
            printSettingsModal.classList.remove('active');
            historyModal.classList.remove('active');
        });
    });

    // --- Nyomtatás és Mentés ---
    btnPrint.addEventListener('click', async () => {
        if (currentLoadedRunId) {
            const run = await HistoryManager.getRunById(currentLoadedRunId);
            if (run) {
                psDateInput.value = run.date;
                psPickupDateInput.value = run.pickupDate || run.date;
                psCourierInput.value = run.courier;
                psCompanyInput.value = run.company || '';
                psSenderInput.value = run.sender || 'capsula';
            } else {
                psDateInput.value = new Date().toISOString().split('T')[0];
                psPickupDateInput.value = psDateInput.value;
                psCourierInput.value = '';
                psCompanyInput.value = '';
                psSenderInput.value = 'capsula';
            }
        } else {
            psDateInput.value = new Date().toISOString().split('T')[0];
            psPickupDateInput.value = psDateInput.value;
            psCourierInput.value = '';
            psCompanyInput.value = '';
            psSenderInput.value = 'capsula';
        }
        psCompanyInput.value = '';
        psNewCompanyGroup.style.display = 'none';
        psNewCompanyInput.value = '';
        // Nyomtatási togglek visszaállítása: mind a 3 aktív, "csak mentés" ki
        ['picking', 'summary', 'delivery'].forEach(t => {
            const chk = document.getElementById(`ps-chk-${t}`);
            const lbl = document.querySelector(`.ps-print-toggle[data-type="${t}"]`);
            if (chk) chk.checked = true;
            if (lbl) { lbl.style.border = '1.5px solid #3b82f6'; lbl.style.background = '#eff6ff'; lbl.style.color = '#1e40af'; }
        });
        const noneChk = document.getElementById('ps-chk-none');
        const noneLbl = document.getElementById('ps-save-only-lbl');
        if (noneChk) noneChk.checked = false;
        if (noneLbl) { noneLbl.style.border = '1.5px solid #e2e8f0'; noneLbl.style.background = '#f8fafc'; noneLbl.style.color = '#475569'; }

        printSettingsModal.classList.add('active');
        psCompanyInput.focus();
    });

    // Nyomtatási toggle logika (checkboxok)
    function setPrintToggleStyle(lbl, active) {
        lbl.style.border = active ? '1.5px solid #3b82f6' : '1.5px solid #e2e8f0';
        lbl.style.background = active ? '#eff6ff' : '#f8fafc';
        lbl.style.color = active ? '#1e40af' : '#475569';
    }

    ['picking', 'summary', 'delivery'].forEach(t => {
        const lbl = document.querySelector(`.ps-print-toggle[data-type="${t}"]`);
        if (!lbl) return;
        lbl.addEventListener('click', () => {
            const chk = document.getElementById(`ps-chk-${t}`);
            chk.checked = !chk.checked;
            setPrintToggleStyle(lbl, chk.checked);
            // Ha valamelyik dokumentum be van kapcsolva, "csak mentés" legyen ki
            const noneChk = document.getElementById('ps-chk-none');
            const noneLbl = document.getElementById('ps-save-only-lbl');
            if (chk.checked) { noneChk.checked = false; setPrintToggleStyle(noneLbl, false); }
        });
    });

    const saveOnlyLbl = document.getElementById('ps-save-only-lbl');
    if (saveOnlyLbl) {
        saveOnlyLbl.addEventListener('click', () => {
            const noneChk = document.getElementById('ps-chk-none');
            noneChk.checked = !noneChk.checked;
            setPrintToggleStyle(saveOnlyLbl, noneChk.checked);
            // Ha "csak mentés" be van kapcsolva, minden dokumentum toggle ki
            if (noneChk.checked) {
                ['picking', 'summary', 'delivery'].forEach(t => {
                    const chk = document.getElementById(`ps-chk-${t}`);
                    const lbl = document.querySelector(`.ps-print-toggle[data-type="${t}"]`);
                    chk.checked = false;
                    setPrintToggleStyle(lbl, false);
                });
            }
        });
    }

    psCompanyInput.addEventListener('change', () => {
        if (psCompanyInput.value === 'new') {
            psNewCompanyGroup.style.display = 'block';
            psNewCompanyInput.focus();
        } else {
            psNewCompanyGroup.style.display = 'none';
        }
    });

    function detectRunChanges(originalRun, currentOrders) {
        if (!originalRun || !originalRun.orders) return { added: [], modified: [], deleted: [] };
        
        const origOrders = originalRun.orders;
        const origMap = new Map(origOrders.map(o => [o.id, o]));
        const currMap = new Map(currentOrders.map(o => [o.id, o]));
        
        const added = [];
        const modified = [];
        const deleted = [];
        
        currentOrders.forEach(o => {
            if (!origMap.has(o.id)) {
                added.push(o);
            } else {
                const orig = origMap.get(o.id);
                // Összehasonlítjuk a tételeket és az egyéb fontos mezőket
                const itemsChanged = JSON.stringify(orig.items.map(it => ({name: it.name, qty: it.qty}))) !== 
                                     JSON.stringify(o.items.map(it => ({name: it.name, qty: it.qty})));
                const codChanged = orig.codAmount !== o.codAmount || orig.isCOD !== o.isCOD;
                const addrChanged = orig.address !== o.address;
                const phoneChanged = orig.phone !== o.phone;
                
                if (itemsChanged || codChanged || addrChanged || phoneChanged) {
                    modified.push({ order: o, origOrder: orig });
                }
            }
        });
        
        origOrders.forEach(o => {
            if (!currMap.has(o.id)) {
                deleted.push(o);
            }
        });
        
        return { added, modified, deleted };
    }

    btnConfirmPrint.addEventListener('click', async () => {
        const date = psDateInput.value;
        const pickupDate = psPickupDateInput.value;
        let company = psCompanyInput.value;
        if (company === 'new') {
            company = psNewCompanyInput.value.trim();
        }
        const courier = psCourierInput.value.trim();
        const sender = psSenderInput.value;
        
        if(!date || !pickupDate || !courier || !company) {
            await CustomDialog.alert('Kérlek adj meg minden adatot (dátumok, cég neve, szállító neve)!', 'Hiányos adatok', 'warning');
            return;
        }

        const printPicking = document.getElementById('ps-chk-picking')?.checked ?? true;
        const printSummary = document.getElementById('ps-chk-summary')?.checked ?? true;
        const printDelivery = document.getElementById('ps-chk-delivery')?.checked ?? true;
        const printNone = document.getElementById('ps-chk-none')?.checked ?? false;
        const cleanOrders = JSON.parse(JSON.stringify(orders)); // Deep copy
        printSettingsModal.classList.remove('active');

        if (currentLoadedRunId) {
            const choice = await CustomDialog.choice('Ezt a kört az előzményekből töltötted be.<br>Szeretnéd felülírni a korábbit, vagy teljesen új körként mentsük el?', 'Felülírás', 'Mentés Újként', 'Előzmények frissítése', 'info');
            if (choice === 1) {
                // Módosításdetektálás
                const changes = detectRunChanges(originalLoadedRun, cleanOrders);
                const hasChanges = changes.added.length > 0 || changes.modified.length > 0 || changes.deleted.length > 0;

                await HistoryManager.updateRun(currentLoadedRunId, date, pickupDate, courier, company, sender, cleanOrders);
                originalLoadedRun = await HistoryManager.getRunById(currentLoadedRunId);

                if (hasChanges) {
                    let msg = `<div style="font-size:13px;color:#374151;line-height:1.5;text-align:left;">`;
                    msg += `<p style="margin-bottom:10px;font-weight:600;">Módosítások észlelve a körben:</p>`;
                    
                    if (changes.added.length > 0) {
                        msg += `<div style="margin-bottom:8px;"><strong style="color:#16a34a;">Hozzáadott (${changes.added.length} db):</strong><br>`;
                        msg += `<span style="font-size:11px;color:#64748b;">${changes.added.map(o => o.id).join(', ')}</span></div>`;
                    }
                    if (changes.modified.length > 0) {
                        msg += `<div style="margin-bottom:8px;"><strong style="color:#1d4ed8;">Módosított (${changes.modified.length} db):</strong><br>`;
                        msg += `<span style="font-size:11px;color:#64748b;">${changes.modified.map(m => m.order.id).join(', ')}</span></div>`;
                    }
                    if (changes.deleted.length > 0) {
                        msg += `<div style="margin-bottom:8px;"><strong style="color:#dc2626;">Törölt (${changes.deleted.length} db):</strong><br>`;
                        msg += `<span style="font-size:11px;color:#64748b;">${changes.deleted.map(o => o.id).join(', ')}</span></div>`;
                    }
                    msg += `<p style="margin-top:12px;font-weight:700;">Hogyan szeretnéd kinyomtatni a változásokat?</p></div>`;

                    const printChoice = await CustomDialog.choice(
                        msg,
                        'Részleges (csak az újat/módosítottat)',
                        'Teljes csomag újra',
                        'Csak mentés (ne nyomtasson)',
                        'Módosítás nyomtatása',
                        'info'
                    );

                    if (printChoice === 1) {
                        const targetOrderIds = [
                            ...changes.added.map(o => o.id),
                            ...changes.modified.map(m => m.order.id)
                        ];
                        if (targetOrderIds.length > 0) {
                            const run = await HistoryManager.getRunById(currentLoadedRunId);
                            if (run) {
                                UnifiedPrinter.clear();
                                const deliveryHtml = UnifiedPrinter.generateDeliveryNotesHtml(run, true, targetOrderIds);
                                UnifiedPrinter.area.innerHTML = deliveryHtml;
                                UnifiedPrinter.execute();
                            }
                        } else {
                            await CustomDialog.alert('Nincs hozzáadott vagy módosított rendelés a részleges nyomtatáshoz (csak törlés történt).', 'Részleges Nyomtatás', 'info');
                        }
                        return; // Kilépés, ne nyomtasson teljeset
                    } else if (printChoice === 2) {
                        // Folytatás teljes nyomtatással a megszokott módon
                    } else {
                        // Csak mentés - kilépés
                        return;
                    }
                }
            } else {
                const newRun = await HistoryManager.saveRun(date, pickupDate, courier, company, sender, cleanOrders);
                currentLoadedRunId = newRun ? newRun.id : currentLoadedRunId;
                originalLoadedRun = newRun ? JSON.parse(JSON.stringify(newRun)) : null;
            }
        } else {
            const newRun = await HistoryManager.saveRun(date, pickupDate, courier, company, sender, cleanOrders);
            currentLoadedRunId = newRun ? newRun.id : currentLoadedRunId;
            originalLoadedRun = newRun ? JSON.parse(JSON.stringify(newRun)) : null;
        }

        if (printNone || (!printPicking && !printSummary && !printDelivery)) return;

        const run = await HistoryManager.getRunById(currentLoadedRunId);
        if (!run) return;

        await UnifiedPrinter.printCustom(run, { picking: printPicking, summary: printSummary, delivery: printDelivery });
    });

    // --- Előzmények (History) ---
    btnHistory.addEventListener('click', async () => {
        historyDateStart.value = '';
        historyDateEnd.value = '';
        historySearchInput.value = '';
        trashDateStart.value = '';
        trashDateEnd.value = '';
        await populateCompanyFilters();
        trashView.style.display = 'none';
        if (modalTabsBar) modalTabsBar.style.display = 'flex';
        if (modalSearchBar) modalSearchBar.style.display = 'flex';
        switchHistoryTab('history');
        historyModal.classList.add('active');
        historySearchInput.focus();
    });

    async function populateCompanyFilters() {
        const runs = await HistoryManager.getAllRuns();
        const companies = new Set();
        // Alapértelmezett cégek, amiket mindenképp mutatunk
        ['LétaiSela', 'Sela', 'ÁdámFuvar', 'FákóTrans', 'Mizsei'].forEach(c => companies.add(c));
        
        runs.forEach(r => {
            if (r.company) companies.add(r.company);
        });

        // Töltsük fel mindkét szűrőt (History és Trash)
        const currentHistVal = historyCompanyFilter.value;
        const currentTrashVal = trashCompanyFilter.value;
        
        [historyCompanyFilter, trashCompanyFilter].forEach(select => {
            const currentVal = select === historyCompanyFilter ? currentHistVal : currentTrashVal;
            select.innerHTML = '<option value="">Összes cég</option>';
            Array.from(companies).sort().forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                select.appendChild(opt);
            });
            select.value = currentVal;
        });
    }

    tabBtnHistory.addEventListener('click', () => switchHistoryTab('history'));
    tabBtnOrders.addEventListener('click', () => switchHistoryTab('orders'));
    tabBtnAccounting.addEventListener('click', () => switchHistoryTab('accounting'));
    tabBtnStats.addEventListener('click', () => switchHistoryTab('stats'));

    document.getElementById('btn-open-trash').addEventListener('click', showTrashView);
    document.getElementById('btn-close-trash').addEventListener('click', hideTrashView);

    function updateMergeBar() {
        const count = selectedForMerge.size;
        mergeSelectionLabel.textContent = `${count} kör kijelölve`;
        btnDoMerge.disabled = count < 2;
        btnDoMerge.style.opacity = count < 2 ? '0.4' : '1';
        btnDoMerge.style.cursor = count < 2 ? 'not-allowed' : 'pointer';
    }

    function enterMergeMode() {
        mergeSelectionMode = true;
        selectedForMerge.clear();
        historyRunsContainer.classList.add('merge-mode-active');
        mergeActionBar.style.display = 'block';
        btnToggleMergeMode.style.background = '#eef2ff';
        btnToggleMergeMode.style.color = '#6366f1';
        btnToggleMergeMode.style.borderColor = '#a5b4fc';
        updateMergeBar();
    }

    function exitMergeMode() {
        mergeSelectionMode = false;
        selectedForMerge.clear();
        historyRunsContainer.classList.remove('merge-mode-active');
        mergeActionBar.style.display = 'none';
        btnToggleMergeMode.style.background = '';
        btnToggleMergeMode.style.color = '';
        btnToggleMergeMode.style.borderColor = '';
        renderHistoryRuns();
    }

    btnToggleMergeMode.addEventListener('click', () => {
        if (mergeSelectionMode) exitMergeMode();
        else enterMergeMode();
    });

    btnCancelMergeMode.addEventListener('click', () => exitMergeMode());

    btnDoMerge.addEventListener('click', () => {
        if (selectedForMerge.size < 2) return;
        // Pre-fill modal
        mergeDate.value = new Date().toISOString().split('T')[0];
        const allRuns = Array.from(historyRunsContainer.querySelectorAll('.run-select-cb:checked'));
        const firstCard = allRuns[0]?.closest('.history-apple-card');
        const companyText = firstCard?.querySelector('.hac-company')?.textContent?.trim() || '';
        const courierText = firstCard?.querySelector('.hac-courier')?.textContent?.trim() || '';
        if (mergeCompany.querySelector(`option[value="${companyText}"]`)) mergeCompany.value = companyText;
        mergeCourier.value = courierText;
        const totalOrders = Array.from(selectedForMerge).reduce((sum, id) => {
            const cb = historyRunsContainer.querySelector(`.run-select-cb[data-id="${id}"]`);
            const ts = cb?.closest('.history-apple-card')?.querySelector('.hac-timestamp')?.textContent || '';
            const m = ts.match(/^(\d+) r/);
            return sum + (m ? parseInt(m[1]) : 0);
        }, 0);
        mergeModalSubtitle.textContent = `${selectedForMerge.size} kör · ${totalOrders} rendelés összesen`;
        mergeModal.classList.add('active');
    });

    [btnMergeCancel, closeMergeModal].forEach(b => b.addEventListener('click', () => mergeModal.classList.remove('active')));

    btnMergeSubmit.addEventListener('click', async () => {
        const newDate = mergeDate.value;
        const newCompany = mergeCompany.value;
        const newCourier = mergeCourier.value.trim();
        if (!newDate || !newCompany || !newCourier) {
            await CustomDialog.alert('Kérlek töltsd ki az összes mezőt.', 'Hiányos adatok', 'warning');
            return;
        }
        btnMergeSubmit.disabled = true;
        btnMergeSubmit.textContent = 'Összevonás...';
        const result = await HistoryManager.mergeRuns(Array.from(selectedForMerge), newDate, newCourier, newCompany);
        btnMergeSubmit.disabled = false;
        btnMergeSubmit.innerHTML = '<i class="ph-bold ph-git-merge"></i>Összevonás végrehajtása';
        mergeModal.classList.remove('active');
        if (result) {
            exitMergeMode();
            CustomDialog.alert(`Összevonás kész. Az új kör ${result.orders.length} rendelést tartalmaz.`, 'Sikeres összevonás', 'info');
        } else {
            CustomDialog.alert('Hiba történt az összevonás során.', 'Hiba', 'warning');
        }
    });

    statsDateStart.addEventListener('change', () => renderStatistics());
    statsDateEnd.addEventListener('change', () => renderStatistics());
    document.getElementById('stats-clear-btn').addEventListener('click', () => {
        statsDateStart.value = '';
        statsDateEnd.value = '';
        renderStatistics();
    });

    function showTrashView() {
        [tabContentHistory, tabContentOrders, tabContentAccounting, tabContentStats].forEach(c => { c.style.display = 'none'; });
        if (modalTabsBar) modalTabsBar.style.display = 'none';
        if (modalSearchBar) modalSearchBar.style.display = 'none';
        trashView.style.display = 'flex';
        HistoryManager.autoCleanupTrash();
        renderTrashRuns();
    }

    function hideTrashView() {
        trashView.style.display = 'none';
        if (modalTabsBar) modalTabsBar.style.display = 'flex';
        if (modalSearchBar) modalSearchBar.style.display = 'flex';
        switchHistoryTab('history');
    }

    async function switchHistoryTab(tab) {
        // Reset all tabs
        [tabBtnHistory, tabBtnOrders, tabBtnAccounting, tabBtnStats].forEach(btn => {
            btn.classList.remove('active');
            btn.style.borderBottomColor = 'transparent';
            btn.style.color = '#64748b';
            btn.style.fontWeight = '500';
        });
        [tabContentHistory, tabContentOrders, tabContentAccounting, tabContentStats].forEach(content => {
            content.style.display = 'none';
        });

        if (tab === 'history') {
            tabBtnHistory.classList.add('active');
            tabBtnHistory.style.borderBottomColor = 'var(--primary-color)';
            tabBtnHistory.style.color = 'var(--primary-color)';
            tabBtnHistory.style.fontWeight = '600';
            tabContentHistory.style.display = 'block';
            renderHistoryRuns();
        } else if (tab === 'orders') {
            tabBtnOrders.classList.add('active');
            tabBtnOrders.style.borderBottomColor = 'var(--primary-color)';
            tabBtnOrders.style.color = 'var(--primary-color)';
            tabBtnOrders.style.fontWeight = '600';
            tabContentOrders.style.display = 'block';
            renderOrdersTab();
        } else if (tab === 'accounting') {
            tabBtnAccounting.classList.add('active');
            tabBtnAccounting.style.borderBottomColor = 'var(--primary-color)';
            tabBtnAccounting.style.color = 'var(--primary-color)';
            tabBtnAccounting.style.fontWeight = '600';
            tabContentAccounting.style.display = 'block';
            renderAccountingRuns();
        } else if (tab === 'stats') {
            tabBtnStats.classList.add('active');
            tabBtnStats.style.borderBottomColor = 'var(--primary-color)';
            tabBtnStats.style.color = 'var(--primary-color)';
            tabBtnStats.style.fontWeight = '600';
            tabContentStats.style.display = 'block';
            renderStatistics();
        }
    }

    historySearchInput.addEventListener('input', handleHistorySearch);

    const onDateChange = () => {
        if (tabContentHistory.style.display !== 'none') {
            renderHistoryRuns();
        } else if (tabContentOrders.style.display !== 'none') {
            renderOrdersTab();
        } else if (tabContentAccounting.style.display !== 'none') {
            renderAccountingRuns();
        } else {
            renderTrashRuns();
        }
        updateFilterButtonState();
    };

    function updateFilterButtonState() {
        const btnApply = document.getElementById('btn-apply-filter');
        const btnClear = document.getElementById('btn-clear-filter');
        if (!btnApply || !btnClear) return;
        const hasFilter = historyDateStart.value || historyDateEnd.value || historyCompanyFilter.value;
        btnClear.style.border = hasFilter ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0';
        btnClear.style.color = hasFilter ? '#ef4444' : '#64748b';
    }

    const btnApplyFilter = document.getElementById('btn-apply-filter');
    const btnClearFilter = document.getElementById('btn-clear-filter');

    if (btnApplyFilter) {
        btnApplyFilter.addEventListener('click', onDateChange);
    }

    if (btnClearFilter) {
        btnClearFilter.addEventListener('click', () => {
            historyDateStart.value = '';
            historyDateEnd.value = '';
            historyCompanyFilter.value = '';
            onDateChange();
        });
    }

    // Cég szűrő: frissíti a gombot + újraindítja a keresést ha van aktív szöveg
    historyCompanyFilter.addEventListener('change', () => {
        updateFilterButtonState();
        if (tabContentHistory.style.display !== 'none') {
            renderHistoryRuns();
        } else if (tabContentOrders.style.display !== 'none') {
            renderOrdersTab();
        }
    });
    trashCompanyFilter.addEventListener('change', () => renderTrashRuns());
    trashDateStart.addEventListener('change', () => renderTrashRuns());
    trashDateEnd.addEventListener('change', () => renderTrashRuns());

    function isDateInRange(dateStr) {
        const startD = historyDateStart.value;
        const endD = historyDateEnd.value;
        const d = new Date(dateStr);
        d.setHours(12, 0, 0, 0);
        if (startD) { const s = new Date(startD); s.setHours(0,0,0,0); if (d < s) return false; }
        if (endD)   { const e = new Date(endD);   e.setHours(23,59,59,999); if (d > e) return false; }
        return true;
    }

    function isFiltered(run, isTrash = false) {
        // 1. Dátum szűrés — mindig az eredeti kiszállítási dátum alapján
        const startD = isTrash ? trashDateStart.value : historyDateStart.value;
        const endD = isTrash ? trashDateEnd.value : historyDateEnd.value;
        const filterDate = run.originalDate || run.date;
        const runD = new Date(filterDate);
        runD.setHours(12, 0, 0, 0);
        
        if (startD) {
            const s = new Date(startD);
            s.setHours(0, 0, 0, 0);
            if (runD < s) return false;
        }
        if (endD) {
            const e = new Date(endD);
            e.setHours(23, 59, 59, 999);
            if (runD > e) return false;
        }

        // 2. Cég szűrés
        const companyFilter = isTrash ? trashCompanyFilter.value : historyCompanyFilter.value;
        if (companyFilter && run.company !== companyFilter) {
            return false;
        }

        return true;
    }

    async function handleHistorySearch() {
        if (tabContentHistory.style.display !== 'none') {
            await renderHistoryRuns();
        } else if (tabContentOrders.style.display !== 'none') {
            await renderOrdersTab();
        }
    }


    function attachHistoryEvents() {
        document.querySelectorAll('.btn-load-run').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.getAttribute('data-id');
                const run = await HistoryManager.getRunById(runId);
                if(!run) return;
                
                if(orders.length > 0) {
                    const confirm = await CustomDialog.confirm('Ha betöltöd ezt a kört, a jelenlegi listád felülíródik. Folytatod?', 'Visszatöltés', 'warning', false);
                    if(!confirm) return;
                }
                
                // Deep copy restoring orders
                orders = JSON.parse(JSON.stringify(run.orders));
                orders.forEach(o => o.internalId = Math.random().toString(36).substr(2, 9));
                currentLoadedRunId = run.id;
                originalLoadedRun = JSON.parse(JSON.stringify(run));

                renderOrders();
                historyModal.classList.remove('active');
                CustomDialog.alert(`Kör betöltve: ${run.date} - ${run.courier} (${orders.length} rendelés)`, 'Sikeres betöltés', 'info');
            });
        });

        document.querySelectorAll('.btn-print-picking').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.closest('button').getAttribute('data-id');
                const run = await HistoryManager.getRunById(runId);
                if (run) await UnifiedPrinter.printSingle(run, 'picking');
            });
        });

        document.querySelectorAll('.btn-print-delivery').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.closest('button').getAttribute('data-id');
                const run = await HistoryManager.getRunById(runId);
                if (run) await UnifiedPrinter.printSingle(run, 'delivery');
            });
        });

        document.querySelectorAll('.btn-print-summary').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.closest('button').getAttribute('data-id');
                const run = await HistoryManager.getRunById(runId);
                if (run) await UnifiedPrinter.printSingle(run, 'summary');
            });
        });

        document.querySelectorAll('.btn-print-bundle').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.closest('button').getAttribute('data-id');
                const run = await HistoryManager.getRunById(runId);
                if (run) await UnifiedPrinter.printBundle(run);
            });
        });

        document.querySelectorAll('.btn-reprint-quick').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.closest('button').getAttribute('data-id');
                const run = await HistoryManager.getRunById(runId);
                if (run && run.quickDeliveryData) {
                    UnifiedPrinter.area.innerHTML = UnifiedPrinter.generateQuickDeliveryNoteHtml(run.quickDeliveryData);
                    UnifiedPrinter.execute();
                }
            });
        });

        document.querySelectorAll('.btn-delete-run').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.closest('button').getAttribute('data-id');
                const confirm = await CustomDialog.confirm('Biztosan törlöd ezt a szállítási kört az előzményekből?', 'Kör Törlése', 'warning', true);
                if(confirm) {
                    await HistoryManager.deleteRun(runId);
                    renderHistoryRuns();
                }
            });
        });

        document.querySelectorAll('.btn-toggle-preview').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = btn.closest('.history-apple-card');
                const preview = card.querySelector('.hac-preview');
                const isOpen = preview.classList.toggle('open');
                btn.classList.toggle('active', isOpen);
            });
        });

        document.querySelectorAll('.run-select-cb').forEach(cb => {
            cb.addEventListener('change', () => {
                const runId = cb.dataset.id;
                if (cb.checked) {
                    selectedForMerge.add(runId);
                    cb.closest('.history-apple-card').classList.add('merge-selected');
                } else {
                    selectedForMerge.delete(runId);
                    cb.closest('.history-apple-card').classList.remove('merge-selected');
                }
                updateMergeBar();
            });
        });

        document.querySelectorAll('.btn-revert-merge').forEach(btn => {
            btn.addEventListener('click', async () => {
                const docId = btn.dataset.docId;
                const ok = await CustomDialog.confirm('Visszavonod az összevonást? Az eredeti körök visszakerülnek a listába, az összevont kör törlődik.', 'Összevonás visszavonása', 'warning', true);
                if (!ok) return;
                const success = await HistoryManager.revertMerge(docId);
                if (success) {
                    await renderHistoryRuns();
                    CustomDialog.alert('Az összevonás sikeresen visszavonva.', 'Visszavonva', 'info');
                }
            });
        });
    }

    // --- Manuális Rendelés Modal ---
    btnAddManual.addEventListener('click', () => {
        editingOrderInternalId = null;
        document.getElementById('manual-modal-title').textContent = 'Manuális Rendelés';
        document.getElementById('manual-modal-desc').textContent = 'Kézi felvitel a listához';
        document.getElementById('btn-save-manual').textContent = 'Hozzáadás';
        document.getElementById('manual-order-form').reset();
        mItemsContainer.innerHTML = `
            <div class="m-item-row">
                <input type="number" class="m-item-qty" placeholder="Db" min="1" value="1" required>
                <input type="text" class="m-item-name" placeholder="Termék megnevezése" required>
                <button type="button" class="btn-remove-item" style="visibility: hidden;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        manualModal.classList.add('active');
    });

    btnAddItemRow.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'm-item-row';
        row.innerHTML = `
            <input type="number" class="m-item-qty" placeholder="Db" min="1" value="1" required>
            <input type="text" class="m-item-name" placeholder="Termék megnevezése" required>
            <button type="button" class="btn-remove-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;
        mItemsContainer.appendChild(row);
        
        row.querySelector('.btn-remove-item').addEventListener('click', function() {
            row.remove();
        });
    });

    btnSaveManual.addEventListener('click', () => {
        const orderNum = document.getElementById('m-order-num').value.trim();
        const customerName = document.getElementById('m-customer').value.trim();
        const address = document.getElementById('m-address').value.trim();
        const phone = document.getElementById('m-phone').value.trim();
        const balanceRaw = parseFloat(document.getElementById('m-balance').value) || 0;

        if (!orderNum || !customerName) {
            alert('A rendelésszám és a vevő neve kötelező!');
            return;
        }

        const items = [];
        document.querySelectorAll('#m-items-container .m-item-row').forEach(row => {
            const qty = parseInt(row.querySelector('.m-item-qty').value) || 0;
            const name = row.querySelector('.m-item-name').value.trim();
            if (qty > 0 && name) items.push({ name, qty });
        });

        if (items.length === 0) {
            alert('Legalább egy tételt meg kell adni!');
            return;
        }

        const isCOD = balanceRaw > 0;

        if (editingOrderInternalId) {
            const order = orders.find(o => o.internalId === editingOrderInternalId);
            if (order) {
                order.id = orderNum;
                order.shippingName = customerName;
                order.billingName = customerName;
                order.address = address;
                order.fullAddress = address;
                order.shippingPhone = phone;
                order.billingPhone = phone;
                order.isCOD = isCOD;
                order.codAmount = isCOD ? balanceRaw : 0;
                order.isBankDeposit = false;
                order.isPaid = !isCOD;
                order.items = items;
                order.isManuallyEdited = true;
            }
        } else {
            orders.push({
                id: orderNum,
                internalId: Math.random().toString(36).substr(2, 9),
                shippingName: customerName,
                billingName: customerName,
                address: address,
                fullAddress: address,
                shippingPhone: phone,
                billingPhone: phone,
                tags: '',
                isBankDeposit: false,
                isPaid: !isCOD,
                isCOD: isCOD,
                codAmount: isCOD ? balanceRaw : 0,
                orderDate: '',
                isPlannedDelay: false,
                isManuallyEdited: true,
                errors: [],
                items: items
            });
        }

        manualModal.classList.remove('active');
        editingOrderInternalId = null;
        renderOrders();
        updatePrintButtonState();
    });

    // --- UNIFIED PRINTER ---
    // A UnifiedPrinter modulárisan van beimportálva a fájl tetején.

    // --- KOPJ HISTORY VIEW INIT ---
    initHistoryView({
        historyRunsContainer,
        accountingRunsContainer,
        trashRunsContainer,
        hsResultsContainer,
        selectedForMerge,
        accountingFilterPending,
        trashCompanyFilter,
        trashDateStart,
        trashDateEnd,
        isFiltered,
        attachHistoryEvents,
        openPdfView,
        handleHistorySearch,
        historySearchInput
    });

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
