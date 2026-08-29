import { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, addDoc, getDocs, getDoc, setDoc, deleteDoc, updateDoc, doc, query, orderBy, where, limit, deleteField, writeBatch, arrayUnion, arrayRemove, increment } from './firebase-config.js';
import { CustomDialog } from './utils/dialog.js';
import { HistoryManager } from './services/history.js';
import { UnifiedPrinter } from './services/printer.js';
import { ShopifyParser, cleanItemNameForMapping, cleanName, cleanAddress, fixHungarianAccents } from './services/shopify.js';
import { PannonXPService } from './services/pannonxp.js';
import { PannonXPView } from './views/pannonxpView.js';
import { initHistoryView, renderAccountingRuns, renderTrashRuns } from './views/historyView.js';
import { Store } from './store/state.js';
import { OrdersView } from './views/ordersView.js';
import { initManualOrderController } from './controllers/manualOrderController.js';
import { renderStatistics } from './views/stats.js';
import { ExporterService } from './services/exporter.js';
import { AuditView } from './views/auditView.js';
import { OrderOverviewView } from './views/orderOverviewView.js';
import { ShopifyApiService } from './services/shopifyApiService.js';
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

            // Kezdeti állapot: Rendelésáttekintő fül aktiválása és élő rendelések lekérése
            switchMainTab('overview');
            loadLiveShopifyOrders();
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
    const tabBtnAccounting = document.getElementById('tab-btn-accounting');
    const tabBtnStats = document.getElementById('tab-btn-stats');
    const tabBtnAudit = document.getElementById('tab-btn-audit');
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

    // Fő Fülek és Konténerek
    const tabMainOverview = document.getElementById('tab-main-overview');
    const tabMainPicking = document.getElementById('tab-main-picking');
    const tabMainPannonXP = document.getElementById('tab-main-pannonxp');
    const orderOverviewContainer = document.getElementById('order-overview-container');
    const pickingWrapper = document.getElementById('picking-wrapper');
    const pannonXPContainer = document.getElementById('pannonxp-container');
    const dynamicIsland = document.getElementById('dynamic-island');
    const historyIsland = document.getElementById('history-island');

    const manualController = initManualOrderController({
        renderOrders,
        updatePrintButtonState
    });

    // --- MAIN TAB SWITCHER (Overview vs Picking vs PannonXP) ---
    function switchMainTab(tabName) {
        Store.setActiveMainTab(tabName);

        // Fül gombok stílusának frissítése
        const tabs = [
            { name: 'overview', btn: tabMainOverview },
            { name: 'picking', btn: tabMainPicking },
            { name: 'pannonxp', btn: tabMainPannonXP }
        ];

        tabs.forEach(t => {
            if (!t.btn) return;
            if (t.name === tabName) {
                t.btn.classList.add('active');
                t.btn.style.background = '#fff';
                t.btn.style.color = '#0f172a';
                t.btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                t.btn.style.fontWeight = '600';
            } else {
                t.btn.classList.remove('active');
                t.btn.style.background = 'transparent';
                t.btn.style.color = '#64748b';
                t.btn.style.boxShadow = 'none';
                t.btn.style.fontWeight = '500';
            }
        });

        // Konténerek láthatóságának kezelése
        if (orderOverviewContainer) orderOverviewContainer.style.display = (tabName === 'overview') ? 'block' : 'none';
        if (pickingWrapper) pickingWrapper.style.display = (tabName === 'picking') ? 'flex' : 'none';
        if (pannonXPContainer) pannonXPContainer.style.display = (tabName === 'pannonxp') ? 'block' : 'none';

        // Lebegő panelek láthatósága
        if (dynamicIsland) {
            if (tabName === 'picking') {
                dynamicIsland.style.display = 'flex';
                const btnSortMode = document.getElementById('btn-sort-mode');
                const btnPrint = document.getElementById('btn-print');
                const btnAddManual = document.getElementById('btn-add-manual');
                const islandDivider = document.querySelector('.island-divider');
                if (btnSortMode) btnSortMode.style.display = 'flex';
                if (btnPrint) btnPrint.style.display = 'flex';
                if (btnAddManual) btnAddManual.style.display = 'flex';
                if (islandDivider) islandDivider.style.display = 'block';
            } else {
                dynamicIsland.style.display = 'none';
            }
        }

        if (historyIsland) {
            historyIsland.style.display = (tabName === 'pannonxp') ? 'none' : 'block';
        }

        // Nézetek renderelése
        if (tabName === 'overview') {
            renderOverview();
        } else if (tabName === 'picking') {
            renderOrders();
        } else if (tabName === 'pannonxp') {
            PannonXPView.render(pannonXPContainer, Store.pxpOrders, handlePxpExport);
        }
    }

    if (tabMainOverview) tabMainOverview.addEventListener('click', () => switchMainTab('overview'));
    if (tabMainPicking) tabMainPicking.addEventListener('click', () => switchMainTab('picking'));
    if (tabMainPannonXP) tabMainPannonXP.addEventListener('click', () => switchMainTab('pannonxp'));

    // --- SHOPIFY ÉLŐ RENDELÉSEK ÉS KISZÁLLÍTÁSI JÁRATOK ÖSSZEKÖTÉSE (HUB) ---
    async function loadLiveShopifyOrders(isManual = false) {
        const refreshIcon = document.getElementById('hub-refresh-icon');
        if (refreshIcon) refreshIcon.style.animation = 'spin 1s linear infinite';

        try {
            // Párhuzamosan lekérjük a Shopify élő rendeléseket és a Firebase-ben lévő kiszállítási járatokat
            const [res, savedRuns] = await Promise.all([
                ShopifyApiService.fetchLiveOrders({ limit: 250 }),
                HistoryManager.getAllRuns().catch(err => {
                    console.warn('[HistoryManager getAllRuns error]', err);
                    return [];
                })
            ]);

            if (res.success && res.rawOrders) {
                // 1. Járatok feltérképezése (4 jegyű ID-k alapján)
                const deliveryMap = new Map();
                (savedRuns || []).forEach(run => {
                    (run.orders || []).forEach(o => {
                        if (!o || !o.id) return;
                        const cleanId = String(o.id).replace(/^#/, '').replace(/\/.*$/, '').trim();
                        if (!cleanId) return;

                        const isUncollected = (run.uncollectedOrderIds || []).map(String).includes(String(o.id));
                        const uncollectedReason = (run.uncollectedReasons || {})[o.id] || '';
                        const uncollectedResp = (run.uncollectedResponsibility || {})[o.id] || '';
                        const paymentMethod = (run.paymentMethods || {})[o.id] || '';
                        const paymentStatus = (run.paymentStatusMap || {})[o.id] || '';

                        // Ha már van bent újabb dátumú járat, a legfrissebbet tartjuk meg
                        deliveryMap.set(cleanId, {
                            runId: run.id,
                            docId: run.docId,
                            runDate: run.date || run.pickupDate || '',
                            pickupDate: run.pickupDate || '',
                            courier: run.courier || 'Futár',
                            company: run.company || '',
                            sender: run.sender || 'capsula',
                            isUncollected: isUncollected,
                            uncollectedReason: uncollectedReason,
                            uncollectedResp: uncollectedResp,
                            paymentMethod: paymentMethod,
                            paymentStatus: paymentStatus,
                            isSettled: !!run.isSettled
                        });
                    });
                });

                // 2. Shopify rendelések átalakítása és terítési adatok csatolása
                const converted = ShopifyApiService.convertApiOrders(res.rawOrders);
                converted.forEach(order => {
                    const cleanId = String(order.id || '').replace(/^#/, '').replace(/\/.*$/, '').trim();
                    const dInfo = deliveryMap.get(cleanId);
                    if (dInfo) {
                        order.deliveryInfo = dInfo;
                        order.isInDelivery = true;
                    } else {
                        order.deliveryInfo = null;
                        order.isInDelivery = false;
                    }
                });

                Store.setShopifyHubOrders(converted);
                if (Store.activeMainTab === 'overview') {
                    renderOverview();
                }
                if (isManual) {
                    CustomDialog.alert(`Sikeresen betöltve ${converted.length} db élő rendelés a Shopify-ból!`, 'Shopify Szinkron', 'success');
                }
            } else {
                if (isManual) {
                    CustomDialog.alert(res.error || 'Nem sikerült lekérni a rendeléseket a Shopify-ból.', 'Szinkron Hiba', 'danger');
                }
            }
        } catch (err) {
            console.error('[loadLiveShopifyOrders error]', err);
            if (isManual) {
                CustomDialog.alert(err.message, 'Hiba', 'danger');
            }
        } finally {
            if (refreshIcon) refreshIcon.style.animation = 'none';
        }
    }

    // --- AUTOMATIKUS VALÓS IDEJŰ SZINKRONIZÁCIÓ (FÓKUSZ & IDŐZÍTŐ) ---
    // 1. Amikor a felhasználó visszakattint a Shopify fülről a Kiszedési Jegyzékre -> Azonnali csendes frissítés!
    let lastFocusRefreshTime = 0;
    const triggerQuietRefresh = () => {
        const now = Date.now();
        // Maximum 3 másodpercenként egyszer frissít fókuszváltáskor
        if (now - lastFocusRefreshTime > 3000) {
            lastFocusRefreshTime = now;
            loadLiveShopifyOrders(false);
        }
    };

    window.addEventListener('focus', triggerQuietRefresh);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            triggerQuietRefresh();
        }
    });

    // 2. Rendszeres 15 másodperces háttér-szinkronizáció (Heartbeat polling)
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadLiveShopifyOrders(false);
        }
    }, 15000);

    // --- RENDELÉSÁTTEKINTŐ RENDERELŐ & ESEMÉNYKEZELŐ ---
    function renderOverview() {
        if (!orderOverviewContainer) return;
        OrderOverviewView.renderOrderOverview(orderOverviewContainer);
        attachOverviewEvents();
    }

    function attachOverviewEvents() {
        // Keresőmező
        const searchInput = document.getElementById('hub-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const cursorPosition = e.target.selectionStart;
                Store.setHubFilters({ search: e.target.value });
                renderOverview();
                const updatedInput = document.getElementById('hub-search-input');
                if (updatedInput) {
                    updatedInput.focus();
                    updatedInput.setSelectionRange(cursorPosition, cursorPosition);
                }
            });
        }

        // Szűrők
        const filterFulfillment = document.getElementById('hub-filter-fulfillment');
        if (filterFulfillment) {
            filterFulfillment.addEventListener('change', (e) => {
                Store.setHubFilters({ fulfillment: e.target.value });
                renderOverview();
            });
        }

        // Fő Állapot Fülek (Segmented Tabs)
        document.querySelectorAll('.hub-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                Store.setHubFilters({ tab: tab });
                renderOverview();
            });
        });

        // Gyors-Akció Chipek (Action Chips)
        document.querySelectorAll('.hub-chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const chip = btn.getAttribute('data-chip');
                const currentChip = (Store.hubFilters && Store.hubFilters.chip) || 'all';
                // Ha ugyanarra kattint, kikapcsoljuk 'all'-ra
                const nextChip = (currentChip === chip && chip !== 'all') ? 'all' : chip;
                Store.setHubFilters({ chip: nextChip });
                renderOverview();
            });
        });

        // Szűrők törlése gomb
        const btnResetFilters = document.getElementById('btn-reset-all-filters');
        if (btnResetFilters) {
            btnResetFilters.addEventListener('click', () => {
                Store.setHubFilters({ chip: 'all', search: '', tag: 'all', dateRange: 'all' });
                renderOverview();
            });
        }

        // Termékkép Lightbox Nagyítás
        document.querySelectorAll('.hub-product-thumb-container').forEach(thumb => {
            thumb.addEventListener('click', (e) => {
                e.stopPropagation();
                const imgUrl = thumb.getAttribute('data-img-url');
                const title = thumb.getAttribute('data-item-title');
                if (imgUrl) {
                    OrderOverviewView.openImageModal(imgUrl, title);
                }
            });
        });

        // Frissítés gomb
        const btnRefresh = document.getElementById('btn-refresh-hub');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => {
                loadLiveShopifyOrders(true);
            });
        }

        // Összes kijelölése checkbox
        const selectAllCheckbox = document.getElementById('hub-select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const visibleRows = document.querySelectorAll('.hub-order-row');
                    const visibleIds = Array.from(visibleRows).map(r => r.getAttribute('data-order-id')).filter(Boolean);
                    Store.selectAllHubOrders(visibleIds);
                } else {
                    Store.clearHubOrderSelection();
                }
                renderOverview();
            });
        }

        // Sor lenyitás (chevron vagy sor kattintás)
        document.querySelectorAll('.btn-toggle-row-expand').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = btn.getAttribute('data-order-id');
                OrderOverviewView.toggleExpand(orderId);
                renderOverview();
            });
        });

        document.querySelectorAll('.hub-order-row').forEach(row => {
            row.addEventListener('click', (e) => {
                // Ha konkrétan a checkboxra kattintott, a checkbox event kezeli
                if (e.target.tagName === 'INPUT' || e.target.classList.contains('hub-order-checkbox')) {
                    return;
                }
                const orderId = row.getAttribute('data-order-id');
                OrderOverviewView.toggleExpand(orderId);
                renderOverview();
            });
        });

        // Checkbox kijelölés
        document.querySelectorAll('.hub-order-checkbox').forEach(cb => {
            cb.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            cb.addEventListener('change', (e) => {
                const orderId = e.target.getAttribute('data-order-id');
                Store.toggleHubOrderSelection(orderId);
                renderOverview();
            });
        });

        // Egyedi Rendelés Teljesítése a Shopify-ban (Fulfill)
        document.querySelectorAll('.btn-fulfill-single-order').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const orderId = btn.getAttribute('data-order-id');
                const shopifyId = btn.getAttribute('data-shopify-id');

                const ok = await CustomDialog.confirm(
                    `Biztosan le akarod teljesíteni ezt a rendelést (${orderId}) a Shopify-ban?\n\nA státusza azonnal "Fulfilled" lesz és a vásárló megkapja az értesítést.`,
                    'Shopify Teljesítés (Fulfill)',
                    'Igen, Teljesítés',
                    'Mégse'
                );
                if (!ok) return;

                btn.disabled = true;
                btn.innerHTML = '<i class="ph-bold ph-spinner" style="animation: spin 1s linear infinite;"></i> Folyamatban...';

                try {
                    const res = await ShopifyApiService.fulfillOrder({ orderId, shopifyId, notifyCustomer: true });
                    if (res.success) {
                        const target = Store.shopifyHubOrders.find(o => o.id === orderId || String(o.shopifyId) === String(shopifyId));
                        if (target) {
                            target.isFulfilled = true;
                            target.fulfillmentStatus = 'fulfilled';
                        }
                        renderOverview();
                        CustomDialog.alert(`A(z) ${orderId} rendelés sikeresen le lett teljesítve a Shopify-ban! 🎉`, 'Sikeres Teljesítés', 'success');
                    }
                } catch (err) {
                    CustomDialog.alert(`Hiba történt a teljesítés során:\n${err.message}`, 'Teljesítési Hiba', 'danger');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="ph-bold ph-package"></i> <span>Teljesítés a Shopify-ban (Fulfill)</span>';
                }
            });
        });

        // Csoportos Teljesítés a Shopify-ban (Bulk Fulfill)
        const btnBulkFulfill = document.getElementById('btn-hub-bulk-fulfill');
        if (btnBulkFulfill) {
            btnBulkFulfill.addEventListener('click', async () => {
                const selectedIds = Store.selectedHubOrderIds;
                if (selectedIds.size === 0) return;

                const selectedOrders = Store.shopifyHubOrders.filter(o => selectedIds.has(o.id) && !o.isFulfilled && !o.isCancelled);
                if (selectedOrders.length === 0) {
                    CustomDialog.alert('A kijelölt rendelések között nincs nyitott (Unfulfilled) teljesíthető rendelés.', 'Figyelmeztetés', 'warning');
                    return;
                }

                const ok = await CustomDialog.confirm(
                    `Biztosan le akarod teljesíteni mind a ${selectedOrders.length} db kijelölt rendelést a Shopify-ban?`,
                    'Csoportos Shopify Teljesítés',
                    'Igen, Teljesítés',
                    'Mégse'
                );
                if (!ok) return;

                btnBulkFulfill.disabled = true;
                btnBulkFulfill.innerHTML = '<i class="ph-bold ph-spinner" style="animation: spin 1s linear infinite;"></i> Teljesítés folyamatban...';

                try {
                    const ordersPayload = selectedOrders.map(o => ({ orderId: o.id, shopifyId: o.shopifyId }));
                    const res = await ShopifyApiService.bulkFulfillOrders({ orders: ordersPayload, notifyCustomer: true });

                    const successfulIdSet = new Set((res.successfulIds || []).map(String));
                    Store.shopifyHubOrders.forEach(o => {
                        if (successfulIdSet.has(String(o.id)) || successfulIdSet.has(String(o.shopifyId))) {
                            o.isFulfilled = true;
                            o.fulfillmentStatus = 'fulfilled';
                        }
                    });
                    Store.clearHubOrderSelection();
                    renderOverview();

                    if (res.failedCount > 0) {
                        CustomDialog.alert(`Teljesítve: ${res.successCount} db rendelés.\nHibás / Már lezárt: ${res.failedCount} db.`, 'Részleges Eredmény', 'warning');
                    } else {
                        CustomDialog.alert(`Mind a ${res.successCount} db rendelés sikeresen le lett teljesítve a Shopify-ban! 🎉`, 'Csoportos Teljesítés Kész', 'success');
                    }
                } catch (err) {
                    CustomDialog.alert(`Hiba a csoportos teljesítésnél:\n${err.message}`, 'Hiba', 'danger');
                } finally {
                    if (btnBulkFulfill) {
                        btnBulkFulfill.disabled = false;
                        btnBulkFulfill.innerHTML = `<i class="ph-bold ph-package"></i> <span>Teljesítés Shopify-ban (${Store.selectedHubOrderIds.size})</span>`;
                    }
                }
            });
        }

        // Lebegő Akciógombok
        const btnSendToPicking = document.getElementById('btn-hub-send-to-picking');
        if (btnSendToPicking) {
            btnSendToPicking.addEventListener('click', () => {
                const selectedIds = Store.selectedHubOrderIds;
                if (selectedIds.size === 0) return;

                const selectedOrders = Store.shopifyHubOrders.filter(o => selectedIds.has(o.id));
                // Klónozzuk a rendeléseket, hogy a szedőlistán függetlenül módosíthatóak legyenek
                const clonedOrders = JSON.parse(JSON.stringify(selectedOrders));
                
                Store.setOrders(clonedOrders);
                CustomDialog.alert(`${clonedOrders.length} db rendelés sikeresen átkerült a Szedőlistába!`, 'Áthelyezés Sikeres', 'success');
                switchMainTab('picking');
            });
        }

        const btnSendToPxp = document.getElementById('btn-hub-send-to-pxp');
        if (btnSendToPxp) {
            btnSendToPxp.addEventListener('click', () => {
                const selectedIds = Store.selectedHubOrderIds;
                if (selectedIds.size === 0) return;

                const selectedOrders = Store.shopifyHubOrders.filter(o => selectedIds.has(o.id));
                const clonedPxpOrders = JSON.parse(JSON.stringify(selectedOrders)).map(o => ({
                    ...o,
                    pxp_selected: true
                }));

                Store.setPxpOrders(clonedPxpOrders);
                CustomDialog.alert(`${clonedPxpOrders.length} db rendelés sikeresen átkerült a PannonXP Címkekészítőbe!`, 'Áthelyezés Sikeres', 'success');
                switchMainTab('pannonxp');
            });
        }

        const btnClearSelection = document.getElementById('btn-hub-clear-selection');
        if (btnClearSelection) {
            btnClearSelection.addEventListener('click', () => {
                Store.clearHubOrderSelection();
                renderOverview();
            });
        }
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
        if (activeMainTab === 'picking') {
            if (Store.orders.length === 0) return;
            const isConfirmed = await CustomDialog.confirm('Biztosan törlöd az összes eddigi rendelést a Szedőlistából?', 'Szedőlista Törlése', 'warning', true);
            if (isConfirmed) {
                Store.setOrders([]);
                currentLoadedRunId = null;
                originalLoadedRun = null;
                sortModeActive = false;
                orderList.classList.remove('sort-mode-active');
                if (btnSortMode) btnSortMode.classList.remove('sort-mode-btn-active');
                renderOrders();
            }
        } else if (activeMainTab === 'pannonxp') {
            if (pxpOrders.length === 0) return;
            const isConfirmed = await CustomDialog.confirm('Biztosan törlöd az összes rendelést a PannonXP listából?', 'PannonXP Törlése', 'warning', true);
            if (isConfirmed) {
                pxpOrders = [];
                if (pannonXPContainer) {
                    PannonXPView.render(pannonXPContainer, pxpOrders, handlePxpExport);
                }
            }
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
        if (activeMainTab === 'picking') {
            // Parse orders for Szedőlista
            const result = ShopifyParser.parse(rows, Store.orders);
            
            result.newOrders.forEach(order => {
                Store.addOrder(order);
            });

            if (result.skippedOrderIds.size > 0) {
                CustomDialog.alert(`${result.skippedOrderIds.size} db ismétlődő rendelést automatikusan kihagytunk a betöltésből.`, 'Duplikáció szűrve');
            }

            renderOrders();
        } else if (activeMainTab === 'pannonxp') {
            // Itt csak a PannonXP-be kerülnek be
            const result = ShopifyParser.parse(rows, pxpOrders);
            
            // Register missing products to Firestore/memory
            await PannonXPService.registerMissingProducts(result.newOrders);

            // Populate PannonXP order fields for each new order
            result.newOrders.forEach(order => {
                const matchingRow = rows.find(r => r['Name'] === order.id);
                if (matchingRow) {
                    order.zip = (matchingRow['Shipping Zip'] || order.zip || '').replace(/['"]/g, '').trim();
                    order.city = (matchingRow['Shipping City'] || order.city || '').trim();
                    const rawAddrLines = [matchingRow['Shipping Address1'], matchingRow['Shipping Address2']].filter(Boolean).join(' ') || matchingRow['Shipping Street'] || '';
                    if (rawAddrLines) {
                        order.address1 = cleanAddress(rawAddrLines).replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
                    }
                    order.address2 = matchingRow['Shipping Address2'] || order.address2 || '';
                    order.countryCode = matchingRow['Shipping Country'] || order.countryCode || 'HU';
                    let companyName = fixHungarianAccents(matchingRow['Shipping Company'] || order.shippingCompany || '');
                    const shName = matchingRow['Shipping Name'] || order.shippingName || '';
                    if (companyName && shName && companyName.trim().toLowerCase() === shName.trim().toLowerCase()) {
                        companyName = cleanName(companyName);
                    }
                    order.shippingCompany = companyName;
                }
                
                order.pxp_referencia = ShopifyParser.generateDefaultReference(order, 40);

                const calc = PannonXPService.calculateWeightAndPackages(order.items);
                order.pxp_csomagszam = calc.packages;
                order.pxp_suly = calc.weight;
                order.pxp_packages = calc.packagesDetail;
                order.pxp_selected = true;
                
                const activeM = PannonXPService.getNormalizedProductMappings();
                const hasUnmapped = order.items.some(item => !activeM[cleanItemNameForMapping(item.name)]);
                const hasUnassignedCategory = order.items.some(item => {
                    const m = activeM[cleanItemNameForMapping(item.name)];
                    return !m || !m.categoryId;
                });
                order.pxp_has_unmatched = calc.hasUnmatched || hasUnmapped || hasUnassignedCategory;
                
                if (!pxpOrders.some(p => p.id === order.id)) {
                    pxpOrders.push(order);
                }
            });

            if (result.skippedOrderIds.size > 0) {
                CustomDialog.alert(`${result.skippedOrderIds.size} db ismétlődő rendelést automatikusan kihagytunk a betöltésből.`, 'Duplikáció szűrve');
            }

            if (pannonXPContainer) {
                PannonXPView.render(pannonXPContainer, pxpOrders, handlePxpExport);
            }
        }

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

        const cleanupDragState = () => {
            if (orderList) {
                orderList.classList.remove('dragging-active');
                // Force a browser reflow to fix scrollHeight/columns layout recalculation bug
                const originalDisplay = orderList.style.display;
                orderList.style.display = 'none';
                orderList.offsetHeight; // force reflow
                orderList.style.display = originalDisplay || 'block';
            }
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            if (scrollContainer) {
                scrollContainer.style.overflowY = 'auto';
            }
        };

        sortableInstance = new Sortable(orderList, {
            animation: 120,
            easing: "cubic-bezier(0.2, 0, 0, 1)",
            handle: sortModeActive ? '.order-card' : '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            scroll: scrollContainer || true,
            scrollSensitivity: 100,
            scrollSpeed: 20,
            bubbleScroll: true,
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
                cleanupDragState();
                const movedItem = Store.orders.splice(evt.oldIndex, 1)[0];
                Store.orders.splice(evt.newIndex, 0, movedItem);
                updateIndexes();
                
                // Extra layout recalculation safety
                if (orderList) {
                    const originalDisplay = orderList.style.display;
                    orderList.style.display = 'none';
                    orderList.offsetHeight; // force reflow
                    orderList.style.display = originalDisplay || 'block';
                }
            },
            onUnchoose: cleanupDragState,
            onSpill: cleanupDragState
        });

        // Biztonsági eseménykezelők, ha a húzás váratlanul megszakadna
        window.removeEventListener('mouseup', cleanupDragState);
        window.removeEventListener('touchend', cleanupDragState);
        window.addEventListener('mouseup', cleanupDragState);
        window.addEventListener('touchend', cleanupDragState);

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

        // Gyors Utánvét Beállítása Gombok az Hiba Boxban
        document.querySelectorAll('.btn-quick-set-cod').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderInternalId = btn.getAttribute('data-order-internal-id');
                const errId = btn.getAttribute('data-err-id');
                const newAmount = parseFloat(btn.getAttribute('data-amount')) || 0;
                
                const order = Store.orders.find(o => o.internalId === orderInternalId);
                if (order) {
                    order.codAmount = newAmount;
                    order.isCOD = newAmount > 0;
                    if (newAmount > 0) order.isBankDeposit = false;
                    
                    order.errors = order.errors.filter(err => err.id !== errId);
                    renderOrders();
                }
            });
        });

        // Gyors Egyedi Utánvét Mentése Gomb az Hiba Boxban
        document.querySelectorAll('.btn-quick-save-custom-cod').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderInternalId = btn.getAttribute('data-order-internal-id');
                const errId = btn.getAttribute('data-err-id');
                const errorBox = btn.closest('.error-box');
                const input = errorBox ? errorBox.querySelector('.quick-cod-custom-input') : null;
                if (!input) return;
                
                let val = parseFloat(input.value);
                if (isNaN(val) || val < 0) val = 0;
                
                const order = Store.orders.find(o => o.internalId === orderInternalId);
                if (order) {
                    order.codAmount = val;
                    order.isCOD = val > 0;
                    if (val > 0) order.isBankDeposit = false;
                    
                    order.errors = order.errors.filter(err => err.id !== errId);
                    renderOrders();
                }
            });
        });

        // Gyors Utánvét Szerkesztés a Badge-re Kattintva
        document.querySelectorAll('.clickable-cod-badge').forEach(badge => {
            badge.addEventListener('click', async (e) => {
                e.stopPropagation();
                const internalId = badge.getAttribute('data-internal-id');
                const order = Store.orders.find(o => o.internalId === internalId);
                if (!order) return;
                
                const currentVal = order.isCOD ? Math.round(order.codAmount) : 0;
                const result = await CustomDialog.prompt(
                    `Add meg a megrendelés (${order.id}) új utánvét összegét Ft-ban (0 Ft ha kifizetett / nincs utánvét):`,
                    currentVal,
                    'Utánvét Összeg Módosítása'
                );
                
                if (result !== null && result !== undefined) {
                    let val = parseFloat(result);
                    if (isNaN(val) || val < 0) val = 0;
                    
                    order.codAmount = val;
                    order.isCOD = val > 0;
                    if (val > 0) order.isBankDeposit = false;
                    
                    // Szűrjük ki az utánvéttel kapcsolatos hibákat, mivel a felhasználó kézzel felülírta
                    order.errors = order.errors.filter(err => err.type !== 'cod' && !/utánvét|anomália/i.test(err.title));
                    
                    renderOrders();
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
                        const runToPrint = {
                            id: currentLoadedRunId,
                            date: date,
                            pickupDate: pickupDate,
                            courier: courier,
                            company: company,
                            sender: sender,
                            orders: cleanOrders
                        };
                        UnifiedPrinter.clear();
                        // Mindig kinyomtatjuk az összesítőt és a korrekciós lapot (összesítő pakk), mivel az adatok változhattak
                        const summaryHtml = UnifiedPrinter.generateSummaryHtml(runToPrint, false);
                        const correctionHtml = UnifiedPrinter.generateCorrectionHtml(runToPrint);
                        
                        let deliveryHtml = '';
                        if (targetOrderIds.length > 0) {
                            deliveryHtml = UnifiedPrinter.generateDeliveryNotesHtml(runToPrint, true, targetOrderIds);
                        }
                        
                        UnifiedPrinter.area.innerHTML = summaryHtml + correctionHtml + deliveryHtml;
                        UnifiedPrinter.execute();
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

        const runToPrint = {
            id: currentLoadedRunId,
            date: date,
            pickupDate: pickupDate,
            courier: courier,
            company: company,
            sender: sender,
            orders: cleanOrders
        };

        await UnifiedPrinter.printCustom(runToPrint, { picking: printPicking, summary: printSummary, delivery: printDelivery });
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
        switchHistoryTab('accounting');
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

    if (tabBtnAccounting) tabBtnAccounting.addEventListener('click', () => switchHistoryTab('accounting'));
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
        [tabContentAccounting, tabContentStats, tabContentAudit].forEach(c => { if (c) c.style.display = 'none'; });
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
        switchHistoryTab('accounting');
    }

    async function switchHistoryTab(tab) {
        // Reset all tabs
        [tabBtnAccounting, tabBtnStats, tabBtnAudit].forEach(btn => {
            if (btn) {
                btn.classList.remove('active');
                btn.style.borderBottomColor = 'transparent';
                btn.style.color = '#64748b';
                btn.style.fontWeight = '500';
            }
        });
        [tabContentAccounting, tabContentStats, tabContentAudit].forEach(content => {
            if (content) content.style.display = 'none';
        });

        if (tab === 'accounting') {
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
        if (tabContentAccounting && tabContentAccounting.style.display !== 'none') {
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

            let filteredRuns = allRuns.filter(r => isFiltered(r));
            const onlyPending = accountingFilterPending && accountingFilterPending.checked;
            
            if (onlyPending) {
                filteredRuns = filteredRuns.filter(r => {
                    const totals = getRunPaymentTotals(r);
                    return totals.hasPending || !totals.isFullySettled;
                });
            }
            
            await ExporterService.exportAccountingToCsv(filteredRuns, onlyPending);
        });
    }

    // Cég szűrő: frissíti a gombot + újraindítja a keresést ha van aktív szöveg
    historyCompanyFilter.addEventListener('change', () => {
        updateFilterButtonState();
        if (tabContentAccounting && tabContentAccounting.style.display !== 'none') {
            renderAccountingRuns();
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

    function parseDate(dateStr) {
        if (!dateStr) return null;
        let clean = String(dateStr).trim().replace(/\./g, '-').replace(/\s+/g, '');
        if (clean.endsWith('-')) clean = clean.slice(0, -1);
        const d = new Date(clean);
        return isNaN(d.getTime()) ? null : d;
    }

    function isFiltered(run, isTrash = false) {
        // 1. Dátum szűrés — a kiszállítási dátum (run.date) alapján
        const startD = isTrash ? trashDateStart.value : historyDateStart.value;
        const endD = isTrash ? trashDateEnd.value : historyDateEnd.value;
        
        const filterDateStr = run.date || run.originalDate;
        const runD = parseDate(filterDateStr);
        if (runD) {
            runD.setHours(12, 0, 0, 0);
            
            if (startD) {
                const s = parseDate(startD);
                if (s) {
                    s.setHours(0, 0, 0, 0);
                    if (runD < s) return false;
                }
            }
            if (endD) {
                const e = parseDate(endD);
                if (e) {
                    e.setHours(23, 59, 59, 999);
                    if (runD > e) return false;
                }
            }
        }

        // 2. Cég szűrés (case-insensitive & trimmed)
        const companyFilter = isTrash ? trashCompanyFilter.value : historyCompanyFilter.value;
        if (companyFilter) {
            const runComp = (run.company || '').trim().toLowerCase();
            const filterComp = companyFilter.trim().toLowerCase();
            if (runComp !== filterComp) {
                return false;
            }
        }

        // 3. Kereső mező szűrés (pl: #3078, Vevő neve, Cím stb.)
        const searchQ = (historySearchInput ? historySearchInput.value : '').trim().toLowerCase();
        if (searchQ && !isTrash) {
            const courierMatch = (run.courier || '').toLowerCase().includes(searchQ);
            const companyMatch = (run.company || '').toLowerCase().includes(searchQ);
            const orderMatch = (run.orders || []).some(o => {
                const idMatch = (o.id || '').toLowerCase().includes(searchQ);
                const nameMatch = (o.shippingName || '').toLowerCase().includes(searchQ);
                const phoneMatch = (o.shippingPhone || '').includes(searchQ);
                const itemsMatch = (o.items || []).some(it => (it.name || '').toLowerCase().includes(searchQ));
                return idMatch || nameMatch || phoneMatch || itemsMatch;
            });
            if (!courierMatch && !companyMatch && !orderMatch) {
                return false;
            }
        }

        return true;
    }

    async function handleHistorySearch() {
        if (tabContentAccounting && tabContentAccounting.style.display !== 'none') {
            await renderAccountingRuns();
        } else if (tabContentAudit && tabContentAudit.style.display !== 'none') {
            await AuditView.updateAudit();
        }
    }


    function attachHistoryEvents() {
        document.querySelectorAll('.btn-load-run').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.closest('button').getAttribute('data-id');
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
                    renderAccountingRuns();
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

    window.auditAllPayments = async function() {
        const runs = await HistoryManager.getAllRuns();
        const list = [];
        runs.forEach(run => {
            (run.orders || []).forEach(o => {
                const pd = getPaymentDetails(run, o);
                if (pd.pendingCard > 0 || pd.pendingBank > 0 || pd.receivedCard > 0 || pd.receivedBank > 0 || (run.paymentMethods && run.paymentMethods[o.id])) {
                    list.push({
                        runDate: run.date,
                        company: run.company || '-',
                        courier: run.courier || '-',
                        orderId: o.id,
                        customer: o.shippingName,
                        codAmount: o.codAmount,
                        methodText: pd.methodText,
                        statusText: pd.statusText,
                        pendingCard: pd.pendingCard,
                        pendingKp: pd.pendingKp,
                        isTransferSettled: run.isTransferSettled === true
                    });
                }
            });
        });
        console.table(list);
        return list;
    };

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
