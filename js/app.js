import { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, addDoc, getDocs, getDoc, setDoc, deleteDoc, updateDoc, doc, query, orderBy, where, limit, deleteField, writeBatch, arrayUnion, arrayRemove, increment } from './firebase-config.js?v=40';
import { CustomDialog } from './utils/dialog.js';
import { HistoryManager } from './services/history.js';
import { UnifiedPrinter } from './services/printer.js';
import { ShopifyParser, cleanItemNameForMapping } from './services/shopify.js?v=150';
import { PannonXPService } from './services/pannonxp.js?v=150';
import { PannonXPView } from './views/pannonxpView.js?v=150';
import { initHistoryView, renderHistoryRuns, renderOrdersTab, renderAccountingRuns, renderTrashRuns, renderSearchResults } from './views/historyView.js';
import { Store } from './store/state.js';
import { OrdersView } from './views/ordersView.js';
import { initManualOrderController } from './controllers/manualOrderController.js?v=150';
import { renderStatistics } from './views/stats.js';
import { ExporterService } from './services/exporter.js';
import { AuditView } from './views/auditView.js?v=171';

import { generatePdfHtml, openPdfView, generateDeliveryNotesHtml } from './utils/printTemplates.js';
function initApp() {
    console.log("KOPJ Rendszer: app.js elindult");

    // --- AKADÁLYOZZA MEG A GÖRGŐZÉST SZÁM INPUTOKNÁL ---
    document.addEventListener('wheel', function(e) {
        if (e.target.tagName === 'INPUT' && e.target.type === 'number') {
            e.target.blur();
        }
    });

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
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Bejelentkezve
            loginOverlay.classList.remove('active');
            mainApp.style.display = 'flex';
            userEmailDisplay.textContent = user.email;
            
            // Mappings és egyéb beállítások inicializálása felhőből
            await PannonXPService.initializeAllSettings();
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
    const tabBtnAudit = document.getElementById('tab-btn-audit');
    const tabContentHistory = document.getElementById('tab-content-history');
    const tabContentOrders = document.getElementById('tab-content-orders');
    const tabContentAccounting = document.getElementById('tab-content-accounting');
    const tabContentStats = document.getElementById('tab-content-stats');
    const tabContentAudit = document.getElementById('tab-content-audit');
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

    // Állapot
    let sortableInstance = null;
    let sortModeActive = false;
    let currentLoadedRunId = null;
    let originalLoadedRun = null;
    let statsLeafletMap = null;
    let activeStatsTab = 'charts';
    const geoCache = JSON.parse(localStorage.getItem('hu_zip_geocache_v1') || '{}');

    // PannonXP Állapot és Elemek
    let activeMainTab = 'picking'; // 'picking' | 'pannonxp'
    let pxpOrders = [];
    const tabMainPicking = document.getElementById('tab-main-picking');
    const tabMainPannonXP = document.getElementById('tab-main-pannonxp');
    const pannonXPContainer = document.getElementById('pannonxp-container');
    const mainContent = document.querySelector('.main-content');
    const dynamicIsland = document.getElementById('dynamic-island');
    const historyIsland = document.getElementById('history-island');

    const manualController = initManualOrderController({
        renderOrders,
        updatePrintButtonState
    });

    // --- HistoryManager ---
    // A HistoryManager modulárisan van beimportálva a fájl tetején.

    // Kezdeti üres állapot renderelése
    renderOrders();

    // --- MAIN TAB TOGGLE (Picking vs PannonXP) ---
    if (tabMainPicking && tabMainPannonXP) {
        tabMainPicking.addEventListener('click', () => {
            activeMainTab = 'picking';
            tabMainPicking.classList.add('active');
            tabMainPicking.style.background = '#fff';
            tabMainPicking.style.color = '#0f172a';
            tabMainPicking.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            tabMainPicking.style.fontWeight = '600';
            
            tabMainPannonXP.classList.remove('active');
            tabMainPannonXP.style.background = 'transparent';
            tabMainPannonXP.style.color = '#64748b';
            tabMainPannonXP.style.boxShadow = 'none';
            tabMainPannonXP.style.fontWeight = '500';
            
            if (pannonXPContainer) pannonXPContainer.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';
            if (dynamicIsland) dynamicIsland.style.display = 'flex';
            if (historyIsland) historyIsland.style.display = 'block';
            
            // Ha nincsenek rendelések a szedőlistában, mutassuk az üres állapotot
            if (Store.orders.length === 0) {
                if (emptyState) emptyState.style.display = 'flex';
            } else {
                if (emptyState) emptyState.style.display = 'none';
            }
        });
        
        tabMainPannonXP.addEventListener('click', () => {
            activeMainTab = 'pannonxp';
            tabMainPannonXP.classList.add('active');
            tabMainPannonXP.style.background = '#fff';
            tabMainPannonXP.style.color = '#0f172a';
            tabMainPannonXP.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            tabMainPannonXP.style.fontWeight = '600';
            
            tabMainPicking.classList.remove('active');
            tabMainPicking.style.background = 'transparent';
            tabMainPicking.style.color = '#64748b';
            tabMainPicking.style.boxShadow = 'none';
            tabMainPicking.style.fontWeight = '500';
            
            if (mainContent) mainContent.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';
            if (dynamicIsland) dynamicIsland.style.display = 'none';
            if (historyIsland) historyIsland.style.display = 'none';
            if (pannonXPContainer) {
                pannonXPContainer.style.display = 'block';
                PannonXPView.render(pannonXPContainer, pxpOrders, handlePxpExport);
            }
        });
    }

    function handlePxpExport() {
        const senderSettings = PannonXPService.getActiveProfile();
        const selectedOrders = pxpOrders.filter(o => o.pxp_selected);
        if (selectedOrders.length === 0) {
            CustomDialog.alert('Nincs kijelölt rendelés az exportáláshoz!', 'Figyelmeztetés', 'warning');
            return;
        }
        const csvContent = PannonXPService.convertToCSV(selectedOrders, senderSettings);
        
        // Letöltés UTF-8-ban, BOM nélkül (a PannonXP IT kérésére)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        link.setAttribute('download', `pannonxp_import_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    // --- Rendezési mód toggle ---
    if (btnSortMode) {
        btnSortMode.addEventListener('click', () => {
            if (Store.orders.length === 0) return;
            sortModeActive = !sortModeActive;
            orderList.classList.toggle('sort-mode-active', sortModeActive);
            btnSortMode.classList.toggle('sort-mode-btn-active', sortModeActive);
            initSortable();
        });
    }


    // --- Reset ---
    btnReset.addEventListener('click', async () => {
        if(Store.orders.length === 0) return;
        const isConfirmed = await CustomDialog.confirm('Biztosan törlöd az összes eddigi rendelést a listából?', 'Lista Törlése', 'warning', true);
        if(isConfirmed) {
            Store.setOrders([]);
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
                const cleanedData = (results.data || []).map(row => {
                    const cleanRow = {};
                    for (const key in row) {
                        let val = row[key];
                        if (typeof val === 'string') {
                            val = val.trim();
                            if (val.startsWith("'")) {
                                val = val.substring(1);
                            }
                            if (val.endsWith("'")) {
                                val = val.substring(0, val.length - 1);
                            }
                            val = val.trim();
                        }
                        cleanRow[key] = val;
                    }
                    return cleanRow;
                });
                processShopifyData(cleanedData);
            }
        });
        
        fileInput.value = '';
    }

    // --- Üzleti Logika ---
    async function processShopifyData(rows) {
        if (activeMainTab === 'pannonxp') {
            const result = ShopifyParser.parse(rows, pxpOrders);
            
            // Register missing products to Firestore/memory
            await PannonXPService.registerMissingProducts(result.newOrders);
            
            result.newOrders.forEach(order => {
                const matchingRow = rows.find(r => r['Name'] === order.id);
                if (matchingRow) {
                    order.zip = matchingRow['Shipping Zip'] || '';
                    order.city = matchingRow['Shipping City'] || '';
                    order.address1 = matchingRow['Shipping Address1'] || '';
                    order.address2 = matchingRow['Shipping Address2'] || '';
                    order.countryCode = matchingRow['Shipping Country'] || 'HU';
                    order.shippingCompany = matchingRow['Shipping Company'] || '';
                }
                
                const calc = PannonXPService.calculateWeightAndPackages(order.items);
                order.pxp_csomagszam = calc.packages;
                order.pxp_suly = calc.weight;
                order.pxp_packages = calc.packagesDetail;
                
                // Recalculate unmatched checks after registration
                const activeM = PannonXPService.getNormalizedProductMappings();
                const hasUnmapped = order.items.some(item => !activeM[cleanItemNameForMapping(item.name)]);
                const hasUnassignedCategory = order.items.some(item => {
                    const m = activeM[cleanItemNameForMapping(item.name)];
                    return !m || !m.categoryId;
                });
                order.pxp_has_unmatched = calc.hasUnmatched || hasUnmapped || hasUnassignedCategory;
                
                pxpOrders.push(order);
            });
            
            if (result.skippedOrderIds.size > 0) {
                CustomDialog.alert(`${result.skippedOrderIds.size} db ismétlődő rendelést automatikusan kihagytunk.`, 'Duplikáció szűrve');
            }
            
            PannonXPView.renderOrders(pxpOrders);
            
            const tbody = document.getElementById('pxp-table-body');
            if (tbody) {
                if (pxpOrders.length === 0) {
                    tbody.style.cursor = 'pointer';
                    tbody.onclick = () => fileInput.click();
                } else {
                    tbody.onclick = null;
                    tbody.style.cursor = '';
                }
            }
            return;
        }

        const result = ShopifyParser.parse(rows, Store.orders);
        
        // Register missing products to Firestore/memory
        await PannonXPService.registerMissingProducts(result.newOrders);
        
        result.newOrders.forEach(order => {
            Store.addOrder(order);
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
            orders: Store.orders, orderList, emptyState, btnPrint,
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
                const movedItem = Store.orders.splice(evt.oldIndex, 1)[0];
                Store.orders.splice(evt.newIndex, 0, movedItem);
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
                const order = Store.orders.find(o => o.internalId === internalId);
                
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
                
                const order = Store.orders.find(o => o.internalId === orderInternalId);
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
                const order = Store.orders.find(o => o.internalId === internalId);
                
                const isConfirmed = await CustomDialog.confirm(`Biztosan törlöd a(z) <strong>${order.id}</strong> számú rendelést?`, 'Rendelés Törlése', 'warning', true);
                
                if(isConfirmed) {
                    // Nincs inline editing, ezt kivesszük
                    
                    card.classList.add('shatter-out');
                    
                    setTimeout(() => {
                        Store.setOrders(Store.orders.filter(o => o.internalId !== internalId));
                        card.remove();
                        updateIndexes();
                        updatePrintButtonState();
                        
                        if(Store.orders.length === 0) {
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
                const order = Store.orders.find(o => o.internalId === internalId);
                
                if(order) manualController.openEditModal(order);
            });
        });
    }

    function updatePrintButtonState() {
        const hasAnyErrors = Store.orders.some(o => o.errors.length > 0);
        
        if (hasAnyErrors || Store.orders.length === 0) {
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
        const cleanOrders = JSON.parse(JSON.stringify(Store.orders)); // Deep copy
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
                        'Részleges (összesítő + új/módosított szállítók)',
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
                        const run = await HistoryManager.getRunById(currentLoadedRunId);
                        if (run) {
                            UnifiedPrinter.clear();
                            // Mindig kinyomtatjuk az összesítőt és a korrekciós lapot (összesítő pakk), mivel az adatok változhattak
                            const summaryHtml = UnifiedPrinter.generateSummaryHtml(run, false);
                            const correctionHtml = UnifiedPrinter.generateCorrectionHtml(run);
                            
                            let deliveryHtml = '';
                            if (targetOrderIds.length > 0) {
                                deliveryHtml = UnifiedPrinter.generateDeliveryNotesHtml(run, true, targetOrderIds);
                            }
                            
                            UnifiedPrinter.area.innerHTML = summaryHtml + correctionHtml + deliveryHtml;
                            UnifiedPrinter.execute();
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
    if (tabBtnAudit) {
        tabBtnAudit.addEventListener('click', () => switchHistoryTab('audit'));
    }

    document.getElementById('btn-open-trash').addEventListener('click', showTrashView);
    document.getElementById('btn-close-trash').addEventListener('click', hideTrashView);


    statsDateStart.addEventListener('change', () => renderStatistics());
    statsDateEnd.addEventListener('change', () => renderStatistics());
    document.getElementById('stats-clear-btn').addEventListener('click', () => {
        statsDateStart.value = '';
        statsDateEnd.value = '';
        renderStatistics();
    });

    function showTrashView() {
        [tabContentHistory, tabContentOrders, tabContentAccounting, tabContentStats, tabContentAudit].forEach(c => { if (c) c.style.display = 'none'; });
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
        [tabBtnHistory, tabBtnOrders, tabBtnAccounting, tabBtnStats, tabBtnAudit].forEach(btn => {
            if (btn) {
                btn.classList.remove('active');
                btn.style.borderBottomColor = 'transparent';
                btn.style.color = '#64748b';
                btn.style.fontWeight = '500';
            }
        });
        [tabContentHistory, tabContentOrders, tabContentAccounting, tabContentStats, tabContentAudit].forEach(content => {
            if (content) content.style.display = 'none';
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
        } else if (tab === 'audit') {
            if (tabBtnAudit && tabContentAudit) {
                tabBtnAudit.classList.add('active');
                tabBtnAudit.style.borderBottomColor = 'var(--primary-color)';
                tabBtnAudit.style.color = 'var(--primary-color)';
                tabBtnAudit.style.fontWeight = '600';
                tabContentAudit.style.display = 'flex';
                AuditView.render(tabContentAudit);
            }
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
        } else if (tabContentAudit && tabContentAudit.style.display !== 'none') {
            AuditView.updateAudit();
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

    const btnExportAccountingCsv = document.getElementById('btn-export-accounting-csv');
    if (btnExportAccountingCsv) {
        btnExportAccountingCsv.addEventListener('click', async () => {
            const allRuns = await HistoryManager.getAllRuns();
            
            // Visszakompatibilitás: paymentStatusMap generálása a régi terítésekhez
            allRuns.forEach(run => {
                if (!run.paymentStatusMap || Object.keys(run.paymentStatusMap).length === 0) {
                    const map = {};
                    const uncollected = run.uncollectedOrderIds || [];
                    const bankTransferred = run.bankTransferredOrderIds || [];
                    const paymentMethods = run.paymentMethods || {};
                    const hasSettled = (run.settledAmount || 0) > 0 || run.isSettled;
                    
                    run.orders.forEach(o => {
                        if (o.isCOD) {
                            if (uncollected.includes(o.id) || bankTransferred.includes(o.id)) {
                                map[o.id] = 'received';
                            } else if (!hasSettled) {
                                map[o.id] = 'pending';
                            } else {
                                const method = paymentMethods[o.id] || 'cash';
                                if (method === 'card') {
                                    const isTransferSettled = run.isTransferSettled !== false;
                                    map[o.id] = isTransferSettled ? 'received' : 'pending';
                                } else {
                                    map[o.id] = 'received';
                                }
                            }
                        }
                    });
                    run.paymentStatusMap = map;
                    
                    const hasPending = run.orders.some(o => o.isCOD && !uncollected.includes(o.id) && map[o.id] === 'pending');
                    if (!hasPending && hasSettled) {
                        run.isSettled = true;
                    }
                }
            });

            let filteredRuns = allRuns.filter(r => isFiltered(r));
            const onlyPending = accountingFilterPending && accountingFilterPending.checked;
            
            if (onlyPending) {
                filteredRuns = filteredRuns.filter(r => {
                    const uncollected = r.uncollectedOrderIds || [];
                    const paymentStatusMap = r.paymentStatusMap || {};
                    const hasPending = r.orders.some(o => o.isCOD && !uncollected.includes(o.id) && paymentStatusMap[o.id] === 'pending');
                    return !r.isSettled || hasPending;
                });
            }
            
            await ExporterService.exportAccountingToCsv(filteredRuns, onlyPending);
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
    if (accountingFilterPending) {
        accountingFilterPending.addEventListener('change', () => renderAccountingRuns());
    }
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
        } else if (tabContentAudit && tabContentAudit.style.display !== 'none') {
            await AuditView.updateAudit();
        }
    }


    function attachHistoryEvents() {
        document.querySelectorAll('.btn-load-run').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.getAttribute('data-id');
                const run = await HistoryManager.getRunById(runId);
                if(!run) return;
                
                if(Store.orders.length > 0) {
                    const confirm = await CustomDialog.confirm('Ha betöltöd ezt a kört, a jelenlegi listád felülíródik. Folytatod?', 'Visszatöltés', 'warning', false);
                    if(!confirm) return;
                }
                
                // Deep copy restoring orders
                Store.setOrders(JSON.parse(JSON.stringify(run.orders)));
                Store.orders.forEach(o => o.internalId = Math.random().toString(36).substr(2, 9));
                currentLoadedRunId = run.id;
                originalLoadedRun = JSON.parse(JSON.stringify(run));

                renderOrders();
                historyModal.classList.remove('active');
                CustomDialog.alert(`Kör betöltve: ${run.date} - ${run.courier} (${Store.orders.length} rendelés)`, 'Sikeres betöltés', 'info');
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


    }


    // --- UNIFIED PRINTER ---
    // A UnifiedPrinter modulárisan van beimportálva a fájl tetején.

    // --- KOPJ HISTORY VIEW INIT ---
    initHistoryView({
        historyRunsContainer,
        accountingRunsContainer,
        trashRunsContainer,
        hsResultsContainer,
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
