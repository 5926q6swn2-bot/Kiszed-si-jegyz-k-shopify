import { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, addDoc, getDocs, getDoc, setDoc, deleteDoc, updateDoc, doc, query, orderBy, where, limit, deleteField, writeBatch, arrayUnion, arrayRemove, increment } from './firebase-config.js?v=40';

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
    const CustomDialog = {
        overlay: document.getElementById('custom-dialog-overlay'),
        icon: document.getElementById('cd-icon'),
        title: document.getElementById('cd-title'),
        msg: document.getElementById('cd-msg'),
        input: document.getElementById('cd-input'),
        btnCancel: document.getElementById('cd-btn-cancel'),
        btnConfirm: document.getElementById('cd-btn-confirm'),

        show: function(options) {
            return new Promise((resolve) => {
                this.title.textContent = options.title || 'Figyelem';
                this.msg.innerHTML = options.message || '';
                
                const type = options.type || 'info';
                this.icon.className = `cd-icon ${type}`;
                if(type === 'warning') this.icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
                else if(type === 'error') this.icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
                else this.icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

                if (options.isPrompt) {
                    this.input.style.display = 'block';
                    this.input.value = options.defaultValue || '';
                    this.input.focus();
                } else {
                    this.input.style.display = 'none';
                    this.input.value = '';
                }

                if (options.isConfirm || options.isPrompt) {
                    this.btnCancel.style.display = 'block';
                    this.btnConfirm.className = `cd-btn ${options.confirmDanger ? 'cd-btn-danger' : 'cd-btn-primary'}`;
                } else {
                    this.btnCancel.style.display = 'none';
                    this.btnConfirm.className = 'cd-btn cd-btn-primary';
                }
                
                this.btnConfirm.textContent = options.confirmText || 'Rendben';

                const cleanup = () => {
                    this.overlay.classList.remove('active');
                    this.btnConfirm.removeEventListener('click', onConfirm);
                    this.btnCancel.removeEventListener('click', onCancel);
                };

                const onConfirm = () => {
                    cleanup();
                    resolve(options.isPrompt ? this.input.value : true);
                };

                const onCancel = () => {
                    cleanup();
                    resolve(options.isPrompt ? null : false);
                };

                this.btnConfirm.addEventListener('click', onConfirm);
                this.btnCancel.addEventListener('click', onCancel);
                
                this.overlay.classList.add('active');
            });
        },
        alert: function(message, title = 'Figyelem', type = 'info') {
            return this.show({ message, title, type, isConfirm: false });
        },
        confirm: function(message, title = 'Megerősítés', type = 'warning', confirmDanger = true) {
            return this.show({ message, title, type, isConfirm: true, confirmDanger });
        },
        prompt: function(message, defaultValue = '', title = 'Adatmegadás') {
            return this.show({ message, title, type: 'info', isPrompt: true, defaultValue });
        },
        choice: function(message, btn1Text, btn2Text, title = 'Választás', type = 'info') {
            return new Promise((resolve) => {
                this.title.textContent = title;
                this.msg.innerHTML = message;
                
                this.icon.className = `cd-icon ${type}`;
                if(type === 'warning') this.icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
                else this.icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

                this.input.style.display = 'none';
                
                this.btnCancel.style.display = 'block';
                this.btnCancel.textContent = btn2Text;
                
                this.btnConfirm.className = 'cd-btn cd-btn-primary';
                this.btnConfirm.textContent = btn1Text;

                const cleanup = () => {
                    this.overlay.classList.remove('active');
                    this.btnConfirm.removeEventListener('click', onBtn1);
                    this.btnCancel.removeEventListener('click', onBtn2);
                    this.btnCancel.textContent = 'Mégsem';
                    this.btnConfirm.textContent = 'Rendben';
                };

                const onBtn1 = () => { cleanup(); resolve(1); };
                const onBtn2 = () => { cleanup(); resolve(2); };

                this.btnConfirm.addEventListener('click', onBtn1);
                this.btnCancel.addEventListener('click', onBtn2);
                
                this.overlay.classList.add('active');
            });
        }
    };

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
    const btnQuickDelivery = document.getElementById('btn-quick-delivery');

    // Modal Elemek
    const manualModal = document.getElementById('manual-modal');
    const quickDeliveryModal = document.getElementById('quick-delivery-modal');
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
    const tabBtnQuick = document.getElementById('tab-btn-quick');
    const tabBtnAccounting = document.getElementById('tab-btn-accounting');
    const tabBtnStats = document.getElementById('tab-btn-stats');
    const tabContentHistory = document.getElementById('tab-content-history');
    const tabContentQuick = document.getElementById('tab-content-quick');
    const tabContentAccounting = document.getElementById('tab-content-accounting');
    const tabContentStats = document.getElementById('tab-content-stats');
    const trashView = document.getElementById('trash-view');
    const modalTabsBar = document.querySelector('#history-modal .modal-tabs');
    const modalSearchBar = document.querySelector('#history-modal .modal-body > .form-group');
    const quickRunsContainer = document.getElementById('quick-runs-container');
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

    // --- HistoryManager (Előzmények kezelése Firestore-al) ---
    const HistoryManager = {
        COLLECTION_NAME: 'szedolista_history',
        TRASH_COLLECTION_NAME: 'szedolista_trash',
        
        getAllRuns: async function() {
            try {
                const q = query(collection(db, this.COLLECTION_NAME), orderBy('timestamp', 'desc'));
                const querySnapshot = await getDocs(q);
                const runs = [];
                querySnapshot.forEach((docSnap) => {
                    runs.push({
                        ...docSnap.data(),
                        docId: docSnap.id
                    });
                });
                return runs;
            } catch (e) {
                console.error("Hiba a Firebase lekérdezésnél: ", e);
                return [];
            }
        },
        
        saveRun: async function(date, pickupDate, courier, company, sender, ordersList) {
            const newRun = {
                id: 'run_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                date: date,
                originalDate: date,
                pickupDate: pickupDate || date,
                courier: courier,
                company: company,
                sender: sender || 'capsula',
                timestamp: Date.now(),
                isPrinted: true,
                orders: ordersList,
                userId: auth.currentUser ? auth.currentUser.uid : null
            };
            try {
                const docRef = await addDoc(collection(db, this.COLLECTION_NAME), newRun);
                newRun.docId = docRef.id;
                return newRun;
            } catch (e) {
                console.error("Hiba a mentésnél: ", e);
                return null;
            }
        },
        
        searchOrders: async function(qStr) {
            const runs = await this.getAllRuns();
            const q = qStr.toLowerCase().trim();
            if(!q) return [];
            
            let matches = [];
            runs.forEach(run => {
                run.orders.forEach(order => {
                    const itemsMatch = order.items.some(it => it.name.toLowerCase().includes(q));
                    const nameMatch = order.shippingName.toLowerCase().includes(q);
                    const idMatch = order.id.toLowerCase().includes(q);
                    const addrMatch = order.address && order.address.toLowerCase().includes(q);
                    const phoneMatch = order.shippingPhone && order.shippingPhone.includes(q);

                    if(idMatch || nameMatch || addrMatch || phoneMatch || itemsMatch) {
                        matches.push({
                            runId: run.id,
                            runDate: run.date,
                            runCourier: run.courier,
                            runCompany: run.company || '-',
                            ...order
                        });
                    }
                });
            });
            return matches;
        },
        
        getRunById: async function(runId) {
            const runs = await this.getAllRuns();
            return runs.find(r => r.id === runId) || null;
        },
        
        deleteRun: async function(runId) {
            const runs = await this.getAllRuns();
            const runToMove = runs.find(r => r.id === runId);
            if (runToMove && runToMove.docId) {
                try {
                    const trashData = {
                        ...runToMove,
                        deletedAt: Date.now()
                    };
                    delete trashData.docId; // Ne vigyük át a régi doksi azonosítót
                    
                    // 1. Áthelyezés a szemetesbe
                    await addDoc(collection(db, this.TRASH_COLLECTION_NAME), trashData);
                    
                    // 2. Törlés az eredeti helyről
                    await deleteDoc(doc(db, this.COLLECTION_NAME, runToMove.docId));
                    return true;
                } catch(e) {
                    console.error("Hiba a szemetesbe mozgatásnál: ", e);
                    return false;
                }
            }
            return false;
        },

        getTrashRuns: async function() {
            try {
                const q = query(collection(db, this.TRASH_COLLECTION_NAME), orderBy('deletedAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const runs = [];
                querySnapshot.forEach((docSnap) => {
                    runs.push({
                        ...docSnap.data(),
                        docId: docSnap.id
                    });
                });
                return runs;
            } catch (e) {
                console.error("Hiba a szemetes lekérdezésénél: ", e);
                return [];
            }
        },

        restoreRun: async function(docId) {
            try {
                const docRef = doc(db, this.TRASH_COLLECTION_NAME, docId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const runData = docSnap.data();
                    const restoredData = { ...runData };
                    delete restoredData.deletedAt;
                    
                    // 1. Vissza az eredeti gyűjteménybe
                    await addDoc(collection(db, this.COLLECTION_NAME), restoredData);
                    
                    // 2. Törlés a szemetesből
                    await deleteDoc(docRef);
                    return true;
                }
            } catch (e) {
                console.error("Hiba a visszaállításnál: ", e);
            }
            return false;
        },

        permanentDeleteRun: async function(docId) {
            try {
                await deleteDoc(doc(db, this.TRASH_COLLECTION_NAME, docId));
                return true;
            } catch (e) {
                console.error("Hiba a végleges törlésnél: ", e);
                return false;
            }
        },

        autoCleanupTrash: async function() {
            const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
            try {
                const q = query(collection(db, this.TRASH_COLLECTION_NAME), where('deletedAt', '<', ninetyDaysAgo));
                const querySnapshot = await getDocs(q);
                const deletePromises = [];
                querySnapshot.forEach(docSnap => {
                    deletePromises.push(deleteDoc(docSnap.ref));
                });
                await Promise.all(deletePromises);
                if (deletePromises.length > 0) {
                    console.log(`${deletePromises.length} régi elem törölve a szemetesből.`);
                }
            } catch (e) {
                console.error("Hiba az automata takarításnál: ", e);
            }
        },

        updateSettlementStatus: async function(docId, settledAmount, totalCOD, uncollectedOrderIds = [], uncollectedReasons = {}, partialOrders = {}, bankTransferredOrderIds = [], uncollectedResponsibility = {}) {
            try {
                const docRef = doc(db, this.COLLECTION_NAME, docId);
                const docSnap = await getDoc(docRef);
                let isSettled = false;
                if (docSnap.exists()) {
                    const runData = docSnap.data();
                    const ordersList = runData.orders || [];
                    
                    let bankTransferredSum = 0;
                    let uncollectedSum = 0;
                    let partialDiffs = 0;
                    
                    ordersList.forEach(o => {
                        if (o.isCOD) {
                            if (bankTransferredOrderIds.some(id => String(id) === String(o.id))) {
                                bankTransferredSum += o.codAmount;
                            } else if (uncollectedOrderIds.some(id => String(id) === String(o.id))) {
                                uncollectedSum += o.codAmount;
                            } else if (partialOrders[o.id] || partialOrders[String(o.id)]) {
                                const partialVal = partialOrders[o.id] || partialOrders[String(o.id)];
                                partialDiffs += (o.codAmount - (partialVal.amount || 0));
                            }
                        }
                    });
                    
                    const expectedAmount = totalCOD - bankTransferredSum - uncollectedSum - partialDiffs;
                    isSettled = settledAmount >= expectedAmount;
                } else {
                    isSettled = settledAmount >= totalCOD;
                }

                await updateDoc(docRef, {
                    isSettled: isSettled,
                    settledAmount: settledAmount,
                    uncollectedOrderIds: uncollectedOrderIds,
                    uncollectedReasons: uncollectedReasons,
                    partialOrders: partialOrders,
                    bankTransferredOrderIds: bankTransferredOrderIds,
                    uncollectedResponsibility: uncollectedResponsibility,
                    settledAt: Date.now()
                });
                return true;
            } catch (e) {
                console.error("Hiba az elszámolás állapot frissítésénél: ", e);
                return false;
            }
        },

        updateResponsibilityInFirestore: async function(docId, orderId, responsibility) {
            try {
                const docRef = doc(db, this.COLLECTION_NAME, docId);
                await updateDoc(docRef, {
                    [`uncollectedResponsibility.${orderId}`]: responsibility
                });
                return true;
            } catch (e) {
                console.error("Hiba a felelősség frissítésénél: ", e);
                return false;
            }
        },

        markAsBankTransferred: async function(docId, orderId) {
            try {
                const docRef = doc(db, this.COLLECTION_NAME, docId);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) return false;
                const runData = docSnap.data();
                
                let uncollected = runData.uncollectedOrderIds || [];
                let bankTransferred = runData.bankTransferredOrderIds || [];
                
                uncollected = uncollected.filter(id => id !== orderId);
                if (!bankTransferred.includes(orderId)) {
                    bankTransferred.push(orderId);
                }
                
                await updateDoc(docRef, {
                    uncollectedOrderIds: uncollected,
                    bankTransferredOrderIds: bankTransferred,
                    [`uncollectedReasons.${orderId}`]: deleteField(),
                    [`uncollectedResponsibility.${orderId}`]: deleteField()
                });
                return true;
            } catch (e) {
                console.error("Hiba a banki utalás rögzítésénél: ", e);
                return false;
            }
        },

        revertToPending: async function(docId) {
            try {
                const docRef = doc(db, this.COLLECTION_NAME, docId);
                await updateDoc(docRef, {
                    isSettled: false,
                    settledAmount: null,
                    settledAt: null,
                    uncollectedOrderIds: deleteField(),
                    uncollectedReasons: deleteField(),
                    partialOrders: deleteField(),
                    bankTransferredOrderIds: deleteField(),
                    uncollectedResponsibility: deleteField()
                });
                return true;
            } catch (e) {
                console.error("Hiba a visszaállításnál: ", e);
                return false;
            }
        },

        mergeRuns: async function(selectedRunIds, newDate, newCourier, newCompany) {
            try {
                const runs = await this.getAllRuns();
                const selectedRuns = runs.filter(r => selectedRunIds.includes(r.id));
                if (selectedRuns.length < 2) return null;

                const allOrders = selectedRuns.flatMap(r => r.orders);
                const mergedId = 'run_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                const mergedData = {
                    id: mergedId,
                    date: newDate,
                    originalDate: newDate,
                    pickupDate: newDate,
                    courier: newCourier,
                    company: newCompany,
                    orders: allOrders,
                    timestamp: Date.now(),
                    isPrinted: false,
                    isMerged: true,
                    mergedFromIds: selectedRuns.map(r => r.id),
                    mergedFromDocIds: selectedRuns.map(r => r.docId),
                    mergedAt: Date.now(),
                };
                await addDoc(collection(db, this.COLLECTION_NAME), mergedData);
                for (const run of selectedRuns) {
                    const docRef = doc(db, this.COLLECTION_NAME, run.docId);
                    await updateDoc(docRef, { isMergedInto: mergedId, mergedAt: Date.now() });
                }
                return mergedData;
            } catch (e) {
                console.error("Hiba az összevonásnál:", e);
                return null;
            }
        },

        revertMerge: async function(mergedRunDocId) {
            try {
                const runs = await this.getAllRuns();
                const mergedRun = runs.find(r => r.docId === mergedRunDocId);
                if (!mergedRun || !mergedRun.mergedFromDocIds) return false;
                for (const origDocId of mergedRun.mergedFromDocIds) {
                    const docRef = doc(db, this.COLLECTION_NAME, origDocId);
                    await updateDoc(docRef, { isMergedInto: deleteField(), mergedAt: deleteField() });
                }
                await deleteDoc(doc(db, this.COLLECTION_NAME, mergedRunDocId));
                return true;
            } catch (e) {
                console.error("Hiba a visszavonásnál:", e);
                return false;
            }
        },

        saveQuickDeliveryRun: async function(data) {
            const shortId = Math.random().toString(36).substr(2, 5);
            const today = new Date().toISOString().split('T')[0];
            const newRun = {
                id: 'qdrun_' + Date.now() + '_' + shortId,
                date: today,
                pickupDate: today,
                courier: data.company || '—',
                company: data.company || '',
                sender: data.sender || 'capsula',
                timestamp: Date.now(),
                isPrinted: true,
                isQuickDelivery: true,
                quickDeliveryData: data,
                orders: [{
                    id: '#GYORS-' + shortId.toUpperCase(),
                    shippingName: data.recipient || '—',
                    address: data.address || '',
                    fullAddress: data.address || '',
                    shippingPhone: data.phone || '',
                    isCOD: false,
                    codAmount: 0,
                    items: data.items.length > 0 ? data.items : [{ name: '—', qty: 1 }]
                }],
                userId: auth.currentUser ? auth.currentUser.uid : null
            };
            try {
                const docRef = await addDoc(collection(db, this.COLLECTION_NAME), newRun);
                newRun.docId = docRef.id;
                return newRun;
            } catch (e) {
                console.error("Hiba a gyors szállítólevél mentésnél: ", e);
                return null;
            }
        },

        updateRun: async function(runId, date, pickupDate, courier, company, sender, ordersList) {
            const runs = await this.getAllRuns();
            const runToUpdate = runs.find(r => r.id === runId);
            if (runToUpdate && runToUpdate.docId) {
                try {
                    const docRef = doc(db, this.COLLECTION_NAME, runToUpdate.docId);
                    await updateDoc(docRef, {
                        date: date,
                        pickupDate: pickupDate || date,
                        courier: courier,
                        company: company,
                        sender: sender || 'capsula',
                        orders: ordersList,
                        timestamp: Date.now(),
                        isModified: true,
                        modifiedAt: Date.now(),
                        modifyCount: increment(1)
                    });
                    return true;
                } catch(e) {
                    console.error("Hiba a frissítésnél: ", e);
                    return null;
                }
            }
            return null;
        }
    };

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

    // --- Gyors Szállítólevél ---
    const qdItemsContainer = document.getElementById('qd-items-container');
    const btnQdAddItem = document.getElementById('btn-qd-add-item');
    const btnConfirmQuickDelivery = document.getElementById('btn-confirm-quick-delivery');

    function addQdItemRow(container) {
        const row = document.createElement('div');
        row.className = 'm-item-row';
        row.style.cssText = 'display:flex;gap:8px;margin-bottom:6px;';
        row.innerHTML = `
            <input type="number" class="m-item-qty" placeholder="Db" min="1" value="1" style="width:60px;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;">
            <input type="text" class="m-item-name" placeholder="Termék megnevezése" style="flex:1;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;">
            <button type="button" class="btn-remove-item" style="background:none;border:none;font-size:18px;color:#94a3b8;cursor:pointer;padding:4px 8px;">×</button>
        `;
        row.querySelector('.btn-remove-item').addEventListener('click', () => row.remove());
        container.appendChild(row);
    }

    if (btnQuickDelivery) {
        btnQuickDelivery.addEventListener('click', () => {
            // Reset form
            document.getElementById('qd-sender').value = 'capsula';
            document.getElementById('qd-company').value = '';
            document.getElementById('qd-company-details').value = '';
            document.getElementById('qd-recipient').value = '';
            document.getElementById('qd-recipient-company').value = '';
            document.getElementById('qd-address').value = '';
            document.getElementById('qd-phone').value = '';
            qdItemsContainer.innerHTML = '';
            addQdItemRow(qdItemsContainer);
            quickDeliveryModal.classList.add('active');
        });
    }

    if (btnQdAddItem) {
        btnQdAddItem.addEventListener('click', () => addQdItemRow(qdItemsContainer));
    }

    document.querySelectorAll('.close-quick-delivery').forEach(btn => {
        btn.addEventListener('click', () => quickDeliveryModal.classList.remove('active'));
    });

    if (btnConfirmQuickDelivery) {
        btnConfirmQuickDelivery.addEventListener('click', () => {
            const sender = document.getElementById('qd-sender').value;
            const company = document.getElementById('qd-company').value;
            const companyDetails = document.getElementById('qd-company-details').value.trim();
            const recipient = document.getElementById('qd-recipient').value.trim();
            const recipientCompany = document.getElementById('qd-recipient-company').value.trim();
            const address = document.getElementById('qd-address').value.trim();
            const phone = document.getElementById('qd-phone').value.trim();

            const items = [];
            qdItemsContainer.querySelectorAll('.m-item-row').forEach(row => {
                const qty = parseInt(row.querySelector('.m-item-qty').value) || 1;
                const name = row.querySelector('.m-item-name').value.trim();
                if (name) items.push({ qty, name });
            });

            const qdData = {
                sender, company, companyDetails,
                recipient, recipientCompany, address, phone,
                items
            };

            UnifiedPrinter.area.innerHTML = UnifiedPrinter.generateQuickDeliveryNoteHtml(qdData);
            UnifiedPrinter.execute();
            quickDeliveryModal.classList.remove('active');

            HistoryManager.saveQuickDeliveryRun(qdData).catch(e => console.error('Gyors SzL mentési hiba:', e));
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

    // Név Formázó (280x122 -> 280 cm, stb.)
    function formatItemName(name) {
        if (!name) return '';
        
        // Ha profil, kivesszük a méreteket, mert nincsenek összekészítve
        if (isProfile(name)) {
            let cleanName = name.replace(/\b\d+(\.\d+)?\s*(cm|m|mm)\b/gi, '')
                                .replace(/\b\d+\s*x\s*\d+\b/gi, '')
                                .replace(/\(\s*\)/g, '')
                                .trim();
            // Esetleges extra szóközök takarítása
            return cleanName.replace(/\s{2,}/g, ' ');
        }

        // Egyéb panelek esetén méret rövidítés (elnyeli a már meglévő cm szócskát is, hogy ne legyen cmcm)
        let formatted = name.replace(/280\s*x\s*122\s*(cm)?/gi, '280 cm');
        formatted = formatted.replace(/244\s*x\s*122\s*(cm)?/gi, '244 cm');
        
        return formatted;
    }

    // --- Üzleti Logika ---
    function processShopifyData(rows) {
        const orderMap = new Map();
        const skippedOrderIds = new Set();

        rows.forEach(row => {
            const orderNum = row['Name'];
            if (!orderNum) return;
            
            // Duplikáció szűrés (ha már a meglévő orders tömbben benne van, kihagyjuk)
            if (orders.some(o => o.id === orderNum)) {
                skippedOrderIds.add(orderNum);
                return;
            }

            const rawItemName = row['Lineitem name'] || '';
            const itemName = formatItemName(rawItemName);
            const itemQty = parseInt(row['Lineitem quantity']) || 0;
            const itemPriceStr = row['Lineitem price'] || "0";
            const itemPrice = parseFloat(itemPriceStr) || 0;
            
            if (!orderMap.has(orderNum)) {
                let shippingAddress = [
                    row['Shipping Zip'], 
                    row['Shipping City']
                ].filter(Boolean);

                let fullShippingAddress = [
                    row['Shipping Zip'],
                    row['Shipping City'],
                    row['Shipping Address1'],
                    row['Shipping Address2']
                ].filter(Boolean);
                
                const shippingPhone = row['Shipping Phone'] || '';
                const billingPhone = row['Billing Phone'] || shippingPhone;

                // Hibák gyűjtése
                let errors = [];

                // 0. Fulfilled ellenőrzés
                const fulfillmentStatus = (row['Fulfillment Status'] || '').toLowerCase();
                if (fulfillmentStatus === 'fulfilled') {
                    errors.push({
                        id: Math.random().toString(36).substr(2, 9),
                        title: "Már teljesítve!",
                        desc: "Ez egy fulfilled rendelés, biztos újra ki akarod küldeni?"
                    });
                }

                // 1. Számla ki ellenőrzés
                const tags = row['Tags'] || '';
                const shippingName = row['Shipping Name'] || 'Ismeretlen';
                const billingName = row['Billing Name'] || shippingName;
                if (!tags.toLowerCase().includes('számla ki')) {
                    errors.push({
                        id: Math.random().toString(36).substr(2, 9),
                        title: "Hiányzó Számla",
                        desc: `Nincs "számla ki" tag, számla legyen kiállítva! Számlázási név: ${billingName}`
                    });
                }

                // 1b. Removed tétel ellenőrzés
                if (tags.toLowerCase().includes('removed')) {
                    errors.push({
                        id: Math.random().toString(36).substr(2, 9),
                        title: "Törölt tétel!",
                        desc: "Törölt tétel van a megrendelésben, kérlek ellenőrizd le a Shopifyban!"
                    });
                }

                // 2. Utalás ellenőrzés (Bank Deposit & not paid)
                const financialStatus = (row['Financial Status'] || '').toLowerCase();
                const paymentMethod = (row['Payment Method'] || '').toLowerCase();
                const totalAmount = parseFloat(row['Total']) || 0;
                let isBankDeposit = paymentMethod.includes('bank deposit');
                let isPaid = (financialStatus === 'paid');
                
                if (isBankDeposit && !isPaid) {
                    const formattedTotal = new Intl.NumberFormat('hu-HU').format(totalAmount);
                    errors.push({
                        id: Math.random().toString(36).substr(2, 9),
                        title: "Függő Utalás",
                        desc: `Utalást várunk: ${formattedTotal} Ft , Számlázási név: ${billingName} , Szállítási név: ${shippingName}`
                    });
                }

                // 3. Utánvét Logika (Csak ha NEM bank deposit)
                const outstandingBalance = parseFloat(row['Outstanding Balance']) || 0;
                const shippingCost = parseFloat(row['Shipping']) || 0;
                const notes = (row['Notes'] || '').toLowerCase();
                const createdAtStr = row['Created at'] || '';
                let isCOD = false;
                let codAmount = 0;

                let noteCodAmount = null;
                const matchBefore = notes.match(/(\d[\d\s\.]*?)\s*(?:ft|huf)?\s*(?:ut[aá]nv[eé]t|\buv)/i);
                const matchAfter = notes.match(/(?:ut[aá]nv[eé]t|\buv).*?(\d[\d\s\.]*)/i);
                const matchFt = notes.match(/(\d(?:[\d .]*\d)?)\s*ft/i);

                if (matchBefore) {
                    noteCodAmount = parseInt(matchBefore[1].replace(/[\s\.]/g, ''));
                } else if (matchAfter) {
                    noteCodAmount = parseInt(matchAfter[1].replace(/[\s\.]/g, ''));
                } else if (matchFt) {
                    noteCodAmount = parseInt(matchFt[1].replace(/[\s\.]/g, ''));
                }

                if (!isBankDeposit) {
                    if (outstandingBalance > 0) {
                        isCOD = true;
                        codAmount = outstandingBalance;
                        
                        // LAPPANGÓ UTÁNVÉT FIGYELMEZTETÉS
                        if (!/ut[aá]nv[eé]t|\buv/i.test(notes) && noteCodAmount === null) {
                            errors.push({
                                id: Math.random().toString(36).substr(2, 9),
                                title: "Lappangó Utánvét!",
                                desc: `Shopify szerint van utánvét, de a Notes üres. Kérdéses összeg: ${outstandingBalance} Ft`
                            });
                        } else if (noteCodAmount !== null) {
                            
                            // Speciális 250k szabály
                            const shippingGross = Math.round(shippingCost * 1.27);
                            let expectedAmount = outstandingBalance;
                            
                            // 10 Ft kerekítési tolerancia a sima egyenlegre vagy a szállítás nélküli egyenlegre
                            if (Math.abs(outstandingBalance - noteCodAmount) <= 10 ||
                                (outstandingBalance > 250000 && Math.abs((outstandingBalance - shippingGross) - noteCodAmount) <= 10)) {
                                codAmount = noteCodAmount; // Helyes! Nincs hiba.
                            } else {
                                // Shopify CSV bug: order edit után az Outstanding Balance nem frissül helyesen.
                                // Két eset: ÁFA exkluzív (hozzáadva) vagy inkluzív (már benne van az árban)
                                const subtotal = parseFloat(row['Subtotal']) || 0;
                                const tax1Name = row['Tax 1 Name'] || '';
                                const vatMatch = tax1Name.match(/(\d+(?:\.\d+)?)\s*%/);
                                const vatRate = vatMatch ? parseFloat(vatMatch[1]) / 100 : 0.27;
                                const calculatedExclusive = Math.round((subtotal + shippingCost) * (1 + vatRate));
                                const calculatedInclusive = Math.round(subtotal + shippingCost);
                                const matchesCalc = Math.abs(calculatedExclusive - noteCodAmount) <= 10 || Math.abs(calculatedInclusive - noteCodAmount) <= 10;
                                if (matchesCalc && Math.abs(outstandingBalance - noteCodAmount) > 10) {
                                    codAmount = noteCodAmount; // CSV bug, notes helyes, nincs hiba
                                } else {
                                    errors.push({
                                        id: Math.random().toString(36).substr(2, 9),
                                        title: "Utánvét Eltérés",
                                        desc: `Utánvét a shopifyban: ${outstandingBalance} Ft, a Notes-ban ${noteCodAmount} Ft kérlek ellenőrizd!`
                                    });
                                }
                            }
                        }
                    } else if (noteCodAmount !== null && noteCodAmount > 0) {
                        isCOD = true;
                        codAmount = noteCodAmount;
                        errors.push({
                            id: Math.random().toString(36).substr(2, 9),
                            title: "Fizetési Anomália",
                            desc: `A shopify szerint nincs utánvét, de a Notes-ban szerepel egy összeg: ${noteCodAmount} Ft`
                        });
                    }
                }

                orderMap.set(orderNum, {
                    id: orderNum,
                    internalId: Math.random().toString(36).substr(2, 9), 
                    shippingName: shippingName,
                    billingName: billingName,
                    address: shippingAddress.join(', '),
                    fullAddress: fullShippingAddress.join(', '),
                    shippingPhone: shippingPhone,
                    billingPhone: billingPhone,
                    tags: tags,
                    isBankDeposit: isBankDeposit,
                    isPaid: isPaid,
                    isCOD: isCOD,
                    codAmount: codAmount,
                    orderDate: createdAtStr,
                    isPlannedDelay: false,
                    isFulfilled: fulfillmentStatus === 'fulfilled',
                    errors: errors,
                    items: []
                });
            }

            const lineFulfillmentStatus = (row['Lineitem fulfillment status'] || '').toLowerCase();
            if (itemQty > 0 && itemName) {
                const order = orderMap.get(orderNum);
                // Ha a rendelés "fulfilled" de a tétel "pending" → el lett távolítva a rendelésből, kihagyjuk
                if (!(order.isFulfilled && lineFulfillmentStatus === 'pending')) {
                    const existingItem = order.items.find(i => i.name === itemName);
                    if (existingItem) {
                        existingItem.qty += itemQty;
                    } else {
                        order.items.push({
                            name: itemName,
                            qty: itemQty,
                            price: itemPrice
                        });
                    }
                }
            }
        });

        // Hozzáadás a meglévőkhöz
        const newOrders = Array.from(orderMap.values());
        
        newOrders.forEach(order => {
            if (order.tags.toLowerCase().includes('prof.ök.')) {
                const profiles = order.items.filter(item => isProfile(item.name));
                if (profiles.length > 0) {
                    order.items = order.items.filter(item => !isProfile(item.name));
                    let totalPrice = profiles.reduce((sum, item) => sum + (item.price * item.qty), 0);
                    order.items.push({
                        name: "Összekészített profilok",
                        qty: 1,
                        price: totalPrice,
                        isCollapsedProfile: true,
                        subItems: profiles
                    });
                }
            }
            
            order.items.sort((a, b) => {
                const typeA = getItemTypeWeight(a.name);
                const typeB = getItemTypeWeight(b.name);
                return typeA - typeB;
            });
            
            orders.push(order);
        });

        if (skippedOrderIds.size > 0) {
            CustomDialog.alert(`${skippedOrderIds.size} db ismétlődő rendelést automatikusan kihagytunk a betöltésből.`, 'Duplikáció szűrve');
        }

        renderOrders();
        
        const now = new Date();
        printDateDisplay.textContent = `Készült: ${now.toLocaleDateString('hu-HU')} ${now.toLocaleTimeString('hu-HU')}`;
    }
    
    function getItemTypeWeight(name) {
        const lowerName = name.toLowerCase();
        if (/(panel|pvc|spc|akusztikus|pb-|lj-|ps-)/.test(lowerName)) return 1;
        if (/(ragasztó)/.test(lowerName)) return 2;
        return 3;
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

    function isProfile(name) {
        return /profil/i.test(name) && name !== "Összekészített profilok";
    }

    function needsMarkerLabel(name, isCollapsedProfile) {
        if (isCollapsedProfile) return false;
        const excludedRegex = /(ragasztó|tapadóhíd|mélyalapozó|profil)/i;
        if (excludedRegex.test(name)) return false;
        return true;
    }

    // --- UI Renderelés ---
    function renderOrders() {
        orderList.innerHTML = '';
        
        if (orders.length === 0) {
            emptyState.style.display = 'flex';
            btnPrint.disabled = true;
            return;
        }

        emptyState.style.display = 'none';

        orders.forEach((order, index) => {
            const card = document.createElement('div');
            card.className = `order-card ${order.errors.length > 0 ? 'has-error' : ''}`;
            card.setAttribute('data-id', order.id);
            card.setAttribute('data-internal-id', order.internalId);

            let codHtml = '';
            if (order.isBankDeposit) {
                if (order.isPaid) {
                    codHtml = `<span class="badge badge-paid" data-internal-id="${order.internalId}">UTALVA (FIZETVE)</span>`;
                } else {
                    codHtml = `<span class="badge badge-warning" data-internal-id="${order.internalId}">UTALÁST VÁRUNK</span>`;
                }
            } else if (order.isCOD) {
                const formattedAmount = new Intl.NumberFormat('hu-HU').format(order.codAmount);
                codHtml = `<span class="badge badge-cod" data-internal-id="${order.internalId}">UTÁNVÉT: ${formattedAmount} Ft</span>`;
            } else {
                codHtml = `<span class="badge badge-paid" data-internal-id="${order.internalId}">Fizetve / Nincs Utánvét</span>`;
            }

            let errorsHtml = '';
            if (order.errors.length > 0) {
                errorsHtml = order.errors.map((err) => `
                    <div class="error-box no-print" id="err-${err.id}">
                        <div class="error-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            ${err.title}
                        </div>
                        <div class="error-desc">${err.desc}</div>
                        <button class="btn-ack" data-order-internal-id="${order.internalId}" data-err-id="${err.id}">Ellenőrizve</button>
                    </div>
                `).join('');
            }

            let itemsHtml = order.items.map((item, iIdx) => {
                const showMarker = needsMarkerLabel(item.name, item.isCollapsedProfile);
                let toggleHtml = '';
                let subItemsHtml = '';
                
                if (item.isCollapsedProfile && item.subItems && item.subItems.length > 0) {
                    toggleHtml = ` <span class="profile-toggle no-print" data-toggle-id="${order.internalId}-${iIdx}" style="cursor: pointer; color: var(--primary); font-size: 11px; margin-left: 6px; font-weight: 600;">▼</span>`;
                    subItemsHtml = `
                        <div id="sub-${order.internalId}-${iIdx}" class="profile-subitems" style="padding: 4px 0 0 12px; font-size: 10px; color: #64748b; line-height: 1.3;">
                            ${item.subItems.map(sub => `<div style="margin-bottom: 1px;">• ${sub.qty} db - ${sub.name}</div>`).join('')}
                        </div>
                    `;
                }

                return `
                    <tr>
                        <td class="col-check"><div class="col-flex-center"><div class="checkbox-box"></div></div></td>
                        <td class="col-marker">${showMarker ? '<div class="col-flex-center"><span class="marker-lbl">címke</span><div class="checkbox-box marker"></div></div>' : ''}</td>
                        <td class="col-qty nowrap">${item.isCollapsedProfile ? '' : `<strong data-field="itemQty-${iIdx}">${item.qty} db</strong>`}</td>
                        <td class="col-name" data-field="itemName-${iIdx}">${item.name}${toggleHtml}${subItemsHtml}</td>
                    </tr>
                `;
            }).join('');

            // Lead Time (Átfutási idő) számítása
            let delayBadge = '';
            let orderDateHtml = '';
            if (order.orderDate) {
                const oDate = new Date(order.orderDate);
                const deliveryDate = new Date(); // Aktuális idő
                const businessDays = getBusinessDaysCount(oDate, deliveryDate);
                
                const formattedOrderDate = oDate.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
                orderDateHtml = `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Rendelés: ${formattedOrderDate}</div>`;

                if (businessDays > 6 && !order.isPlannedDelay) {
                    delayBadge = `<span class="badge" style="background: #fff7ed; color: #c2410c; border: 1px solid #fdba74; margin-left: 8px; font-size: 10px; padding: 2px 8px;">⚠️ ${businessDays} munkanap késés</span>`;
                }
            }

            card.innerHTML = `
                <div class="drag-handle no-print" title="Húzd át az átrendezéshez">
                    <i class="ph-bold ph-dots-six-vertical"></i>
                </div>
                <div class="order-header">
                    <div class="header-left">
                        <div class="order-index">${index + 1}</div>
                        <div>
                            <div class="order-id" data-field="id">
                                ${order.id}
                                ${delayBadge}
                            </div>
                            <div class="order-customer" data-field="shippingName">${order.shippingName}</div>
                            <div class="order-address" data-field="address">${order.address}</div>
                            ${orderDateHtml}
                        </div>
                    </div>
                    <div class="order-meta">
                        <div class="meta-buttons no-print">
                            <button class="btn-print-order" title="Szállítólevél Nyomtatása" style="display:inline-flex;align-items:center;justify-content:center;padding:5px;cursor:pointer;border:none;background:none;color:#64748b;transition:color .15s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'">
                                <i class="ph-bold ph-printer" style="font-size: 14px;"></i>
                            </button>
                            <button class="btn-edit" title="Szerkesztés">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn-delete" title="Törlés">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                        <div class="badge-container">
                            ${codHtml}
                        </div>
                    </div>
                </div>
                ${errorsHtml}
                <table class="items-table">
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
            `;
            orderList.appendChild(card);
        });

        attachCardEvents();
        updatePrintButtonState();
        updateIndexes();

        initSortable();
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
    tabBtnQuick.addEventListener('click', () => switchHistoryTab('quick'));
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
        [tabContentHistory, tabContentQuick, tabContentAccounting, tabContentStats].forEach(c => { c.style.display = 'none'; });
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
        [tabBtnHistory, tabBtnQuick, tabBtnAccounting, tabBtnStats].forEach(btn => {
            btn.classList.remove('active');
            btn.style.borderBottomColor = 'transparent';
            btn.style.color = '#64748b';
            btn.style.fontWeight = '500';
        });
        [tabContentHistory, tabContentQuick, tabContentAccounting, tabContentStats].forEach(content => {
            content.style.display = 'none';
        });

        if (tab === 'history') {
            tabBtnHistory.classList.add('active');
            tabBtnHistory.style.borderBottomColor = 'var(--primary-color)';
            tabBtnHistory.style.color = 'var(--primary-color)';
            tabBtnHistory.style.fontWeight = '600';
            tabContentHistory.style.display = 'block';
            handleHistorySearch();
        } else if (tab === 'quick') {
            tabBtnQuick.classList.add('active');
            tabBtnQuick.style.borderBottomColor = '#3b82f6';
            tabBtnQuick.style.color = '#3b82f6';
            tabBtnQuick.style.fontWeight = '600';
            tabContentQuick.style.display = 'block';
            renderQuickDeliveryRuns();
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
            // Ha van aktív szöveges keresés, azt is frissítjük az új szűrőkkel
            if (historySearchInput.value.trim().length >= 2) {
                handleHistorySearch();
            } else {
                renderHistoryRuns();
            }
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
        if (historySearchInput.value.trim().length >= 2) {
            handleHistorySearch();
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
        const q = historySearchInput.value.trim().toLowerCase();

        if (q.length >= 2) {
            // Szöveges keresés: dátum + cég szűrő is érvényes egyszerre (isFiltered-en át)
            const allRuns = await HistoryManager.getAllRuns();
            const filteredRuns = allRuns.filter(r => isFiltered(r));

            const matches = [];
            filteredRuns.forEach(run => {
                run.orders.forEach(order => {
                    const nameMatch  = order.shippingName?.toLowerCase().includes(q);
                    const idMatch    = order.id?.toLowerCase().includes(q);
                    const addrMatch  = order.address?.toLowerCase().includes(q);
                    const phoneMatch = order.shippingPhone?.includes(q);
                    const itemsMatch = order.items?.some(it => it.name.toLowerCase().includes(q));
                    if (idMatch || nameMatch || addrMatch || phoneMatch || itemsMatch) {
                        matches.push({ runId: run.id, runDate: run.date, runCourier: run.courier, runCompany: run.company, runData: run, ...order });
                    }
                });
            });

            historySearchResults.style.display = 'block';
            historyRunsView.style.display = 'none';
            renderSearchResults(matches);
        } else {
            // Böngésző mód: csak kártyák, dátum + cég szűrővel
            historySearchResults.style.display = 'none';
            historyRunsView.style.display = 'block';
            await renderHistoryRuns();
        }
    }

    async function renderHistoryRuns() {
        const runs = await HistoryManager.getAllRuns();
        historyRunsContainer.innerHTML = '';
        
        // Szűrés a dátum/cég szerint
        const filteredRuns = runs.filter(r => isFiltered(r));

        if(filteredRuns.length === 0) {
            historyRunsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; margin-top: 20px;">Nincsenek a feltételnek megfelelő mentett körök.</p>';
            return;
        }
        
        // Összevont eredetiek és gyors szállítólevelek elrejtése
        const visibleRuns = filteredRuns.filter(r => !r.isMergedInto && !r.isQuickDelivery);

        visibleRuns.forEach(run => {
            const el = document.createElement('div');
            el.className = 'history-apple-card';
            if (selectedForMerge.has(run.id)) el.classList.add('merge-selected');
            const dateStr = new Date(run.timestamp).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const modifiedBadge = run.isModified
                ? `<span class="hac-badge" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ph-bold ph-pencil-simple" style="font-size:10px;"></i>Módosítva${run.modifyCount > 1 ? ` (${run.modifyCount}×)` : ''}</span>`
                : '';
            const mergedBadge = run.isMerged
                ? `<span class="hac-badge hac-badge-merged"><i class="ph-bold ph-git-merge" style="font-size:9px;"></i>Összevont (${run.mergedFromIds?.length || 0} kör)</span>`
                : '';
            const revertBtn = run.isMerged
                ? `<button class="hac-btn-action hac-btn-revert btn-revert-merge" data-doc-id="${run.docId}" title="Összevonás visszavonása"><i class="ph-bold ph-arrow-counter-clockwise" style="font-size:11px;"></i>Visszavon</button>`
                : '';

            if (run.isQuickDelivery) {
                const qd = run.quickDeliveryData || {};
                const qdPreview = [
                    qd.recipient ? `<span class="hac-order-chip"><span class="hac-chip-id"><i class="ph-bold ph-user" style="font-size:9px;"></i></span><span class="hac-chip-name">${qd.recipient}</span></span>` : '',
                    qd.recipientCompany ? `<span class="hac-order-chip"><span class="hac-chip-name">${qd.recipientCompany}</span></span>` : '',
                    qd.address ? `<span class="hac-order-chip"><span class="hac-chip-id"><i class="ph-bold ph-map-pin" style="font-size:9px;"></i></span><span class="hac-chip-name">${qd.address}</span></span>` : '',
                    ...(qd.items || []).map(it => `<span class="hac-order-chip"><span class="hac-chip-id">${it.qty}×</span><span class="hac-chip-name">${it.name}</span></span>`)
                ].filter(Boolean).join('');
                el.innerHTML = `
                    <div class="hac-row">
                        <div class="hac-info">
                            <span class="hac-badge" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;display:inline-flex;align-items:center;gap:4px;"><i class="ph-bold ph-lightning" style="font-size:10px;"></i>Gyors SzL</span>
                            <span class="hac-date">${run.date}</span>
                            ${run.company ? `<span class="hac-company">${run.company}</span>` : ''}
                            <span class="hac-sep">·</span>
                            <span class="hac-courier">${qd.recipient || '—'}</span>
                            <span class="hac-sep">·</span>
                            <span class="hac-timestamp">${dateStr}</span>
                        </div>
                        <div class="hac-prints">
                            <button class="hac-print-btn hac-print-primary btn-reprint-quick" data-id="${run.id}" title="Újra nyomtatás (3 pld.)">
                                <i class="ph-bold ph-printer"></i>Nyomtatás
                            </button>
                        </div>
                        <div class="hac-actions">
                            <button class="hac-btn-del btn-delete-run" data-id="${run.id}" title="Törlés">
                                <i class="ph-bold ph-trash"></i>
                            </button>
                            <button class="hac-btn-preview btn-toggle-preview" title="Részletek">
                                <i class="ph-bold ph-caret-down"></i>
                            </button>
                        </div>
                    </div>
                    <div class="hac-preview">
                        <div class="hac-preview-inner">${qdPreview || '<span style="color:#94a3b8;font-style:italic;font-size:12px;">Nincs részlet</span>'}</div>
                    </div>
                `;
            } else {
                const previewChips = run.orders.map(o =>
                    `<span class="hac-order-chip" title="${o.address || ''}" style="gap:5px;display:inline-flex;align-items:center;">
                        <span class="hac-chip-id">${o.id}</span>
                        <span class="hac-chip-name">${o.shippingName || ''}</span>
                        <i class="ph-bold ph-printer btn-print-chip-delivery no-print" data-run-id="${run.id}" data-order-id="${o.id}" style="cursor:pointer;color:#64748b;font-size:11px;padding:2px;transition:color .15s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'"></i>
                    </span>`
                ).join('');
                el.innerHTML = `
                    <div class="hac-row">
                        <label class="hac-checkbox-wrap" title="Kijelölés összevonáshoz">
                            <input type="checkbox" class="run-select-cb" data-id="${run.id}" ${selectedForMerge.has(run.id) ? 'checked' : ''}>
                        </label>
                        <div class="hac-info">
                            <span class="hac-company">${run.company || '-'}</span>
                            <span class="hac-date">${run.date}</span>
                            ${mergedBadge}${modifiedBadge}
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
                            ${revertBtn}
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
            }
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

        attachHistoryEvents();
    }

    async function renderQuickDeliveryRuns() {
        const allRuns = await HistoryManager.getAllRuns();
        const runs = allRuns.filter(r => r.isQuickDelivery);
        quickRunsContainer.innerHTML = '';

        if (runs.length === 0) {
            quickRunsContainer.innerHTML = '<p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:30px;">Nincsenek mentett gyors szállítólevelek.</p>';
            return;
        }

        runs.forEach(run => {
            const el = document.createElement('div');
            el.className = 'history-apple-card';
            const dateStr = new Date(run.timestamp).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const qd = run.quickDeliveryData || {};
            const qdPreview = [
                qd.recipient ? `<span class="hac-order-chip"><span class="hac-chip-id"><i class="ph-bold ph-user" style="font-size:9px;"></i></span><span class="hac-chip-name">${qd.recipient}</span></span>` : '',
                qd.recipientCompany ? `<span class="hac-order-chip"><span class="hac-chip-name">${qd.recipientCompany}</span></span>` : '',
                qd.address ? `<span class="hac-order-chip"><span class="hac-chip-id"><i class="ph-bold ph-map-pin" style="font-size:9px;"></i></span><span class="hac-chip-name">${qd.address}</span></span>` : '',
                qd.phone ? `<span class="hac-order-chip"><span class="hac-chip-id"><i class="ph-bold ph-phone" style="font-size:9px;"></i></span><span class="hac-chip-name">${qd.phone}</span></span>` : '',
                ...(qd.items || []).map(it => `<span class="hac-order-chip"><span class="hac-chip-id">${it.qty}×</span><span class="hac-chip-name">${it.name}</span></span>`)
            ].filter(Boolean).join('');

            el.innerHTML = `
                <div class="hac-row">
                    <div class="hac-info">
                        <span class="hac-date">${run.date}</span>
                        ${run.company ? `<span class="hac-company">${run.company}</span>` : ''}
                        <span class="hac-sep">·</span>
                        <span class="hac-courier">${qd.recipient || '—'}</span>
                        <span class="hac-sep">·</span>
                        <span class="hac-timestamp">${dateStr}</span>
                    </div>
                    <div class="hac-prints">
                        <button class="hac-print-btn hac-print-primary btn-reprint-quick" data-id="${run.id}" title="Újra nyomtatás (2 pld.)">
                            <i class="ph-bold ph-printer"></i>Nyomtatás
                        </button>
                    </div>
                    <div class="hac-actions">
                        <button class="hac-btn-del btn-delete-quick" data-id="${run.id}" title="Törlés">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                        <button class="hac-btn-preview btn-toggle-preview" title="Részletek">
                            <i class="ph-bold ph-caret-down"></i>
                        </button>
                    </div>
                </div>
                <div class="hac-preview">
                    <div class="hac-preview-inner">${qdPreview || '<span style="color:#94a3b8;font-style:italic;font-size:12px;">Nincs részlet</span>'}</div>
                </div>
            `;
            quickRunsContainer.appendChild(el);
        });

        quickRunsContainer.querySelectorAll('.btn-reprint-quick').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.closest('button').getAttribute('data-id');
                const run = await HistoryManager.getRunById(runId);
                if (run && run.quickDeliveryData) {
                    UnifiedPrinter.area.innerHTML = UnifiedPrinter.generateQuickDeliveryNoteHtml(run.quickDeliveryData);
                    UnifiedPrinter.execute();
                }
            });
        });

        quickRunsContainer.querySelectorAll('.btn-delete-quick').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.closest('button').getAttribute('data-id');
                const ok = await CustomDialog.confirm('Biztosan törlöd ezt a gyors szállítólevelet?', 'Törlés', 'warning', true);
                if (ok) {
                    await HistoryManager.deleteRun(runId);
                    renderQuickDeliveryRuns();
                }
            });
        });
    }

    function showSettlementDialog(run, runCOD, existingState = null) {
        return new Promise((resolve) => {
            const codOrders    = run.orders.filter(o => o.isCOD);
            const nonCodOrders = run.orders.filter(o => !o.isCOD);
            const prevBankTransferred = new Set(existingState?.bankTransferredOrderIds || run.bankTransferredOrderIds || []);
            const prevUncollected  = new Set(existingState?.uncollectedOrderIds || run.uncollectedOrderIds || []);
            const prevReasons      = existingState?.uncollectedReasons || run.uncollectedReasons || {};
            const prevPartials     = existingState?.partialOrders || run.partialOrders || {};

            const makeReasonHtml = (orderId, wasUncollected) => {
                const pr = prevReasons[orderId] || '';
                const currentResp = existingState?.uncollectedResponsibility?.[orderId] || run.uncollectedResponsibility?.[orderId] || 'vevo';
                
                const rMienkActive = currentResp === 'mienk';
                const rSzallitoActive = currentResp === 'szallito';
                const rVevoActive = currentResp === 'vevo' || !currentResp;

                return `<div class="sd-reason-row" style="display:${wasUncollected?'block':'none'};padding:12px 20px 16px 116px;background:#fff7ed;border-top:1px dashed #fed7aa;">
                    <div style="font-size:12px;font-weight:700;color:#c2410c;margin-bottom:8px;">Megrendelés nem lett átadva. Kérlek add meg az okot:</div>
                    <input class="sd-reason-input" type="text" placeholder="Miért nem lett átadva? (Kötelező kitölteni, pl. Sérült termék, vevő lemondta...)"
                        value="${pr.replace(/"/g,'&quot;')}"
                        style="width:100%;box-sizing:border-box;font-size:13px;border:2px solid #fbbf24;border-radius:8px;padding:8px 12px;font-family:inherit;margin-bottom:12px;outline:none;background:#fff;">
                    
                    <div class="sd-resp-selector" style="display:flex;align-items:center;gap:8px;" data-order-id="${orderId}">
                        <span style="font-size:12px;color:#92400e;font-weight:700;margin-right:6px;">Kinek a hibájából hiúsult meg?</span>
                        <button type="button" class="sd-resp-btn mienk ${rMienkActive ? 'active' : ''}" data-resp="mienk" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rMienkActive ? '#fca5a5' : '#e2e8f0'};background:${rMienkActive ? '#fee2e2' : '#fff'};color:${rMienkActive ? '#b91c1c' : '#64748b'};transition:all .15s;">Saját hiba</button>
                        <button type="button" class="sd-resp-btn szallito ${rSzallitoActive ? 'active' : ''}" data-resp="szallito" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rSzallitoActive ? '#fed7aa' : '#e2e8f0'};background:${rSzallitoActive ? '#ffedd5' : '#fff'};color:${rSzallitoActive ? '#c2410c' : '#64748b'};transition:all .15s;">Szállító</button>
                        <button type="button" class="sd-resp-btn vevo ${rVevoActive ? 'active' : ''}" data-resp="vevo" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rVevoActive ? '#cbd5e1' : '#e2e8f0'};background:${rVevoActive ? '#e2e8f0' : '#fff'};color:${rVevoActive ? '#475569' : '#64748b'};transition:all .15s;">Vevő / Egyéb</button>
                    </div>
                </div>`;
            };

            const codRowsHtml = codOrders.map(o => {
                const wasUncollected = prevUncollected.has(o.id);
                const wasBankTransferred = prevBankTransferred.has(o.id);
                const prevPartial    = prevPartials[o.id];
                const wasPartial     = !wasUncollected && !wasBankTransferred && !!prevPartial;
                
                const currentResp = existingState?.uncollectedResponsibility?.[o.id] || run.uncollectedResponsibility?.[o.id] || 'vevo';
                const rMienkActive = currentResp === 'mienk';
                const rSzallitoActive = currentResp === 'szallito';
                const rVevoActive = currentResp === 'vevo' || !currentResp;

                const itemsList = (o.items || []).map(it => `<span style="display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:2px 6px;margin:2px 4px 2px 0;"><b>${it.qty}×</b> ${it.name}</span>`).join('');
                
                return `
                <div class="sd-order-row" style="border-bottom:1px solid #f1f5f9;">
                    <label style="display:grid;grid-template-columns: 24px 80px minmax(0, 2fr) minmax(0, 1fr) minmax(240px, auto);align-items:start;gap:12px;padding:14px 20px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                        <div style="display:flex;align-items:center;padding-top:2px;">
                            <input type="checkbox" data-order-id="${o.id}" data-amount="${o.codAmount}" data-is-cod="true" ${wasUncollected ? '' : 'checked'}
                                style="width:20px;height:20px;cursor:pointer;accent-color:#22c55e;">
                        </div>
                        <span style="font-size:14px;font-weight:700;color:#374151;padding-top:2px;">${o.id}</span>
                        <div style="display:flex;flex-direction:column;gap:4px;overflow:hidden;padding-top:2px;">
                            <div style="font-size:14px;color:#0f172a;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.shippingName || '—'}</div>
                            ${itemsList ? `<div style="font-size:11px;color:#64748b;display:inline-flex;align-items:center;gap:4px;cursor:pointer;user-select:none;width:fit-content;padding:2px 6px;border-radius:6px;transition:background .15s;" class="sd-items-toggle" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'" onclick="event.preventDefault();event.stopPropagation();this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('i').style.transform=this.nextElementSibling.style.display==='none'?'rotate(0deg)':'rotate(180deg)'">
                                <i class="ph-bold ph-caret-down" style="transition:transform .2s;"></i> ${o.items.length} termék mutatása
                            </div>
                            <div class="sd-items-list" style="display:none;font-size:11px;color:#475569;margin-top:2px;" onclick="event.preventDefault();event.stopPropagation();">${itemsList}</div>` : ''}
                        </div>
                        <div style="display:flex;align-items:center;padding-top:2px;">
                            <span class="sd-full-amount" style="font-size:15px;font-weight:800;color:${wasBankTransferred?'#0284c7':wasPartial?'#1d4ed8':'#b91c1c'};">${wasBankTransferred ? 'Utalva (0 Ft KP)' : wasPartial ? (prevPartial.amount||o.codAmount).toLocaleString('hu-HU') + ' Ft' : o.codAmount.toLocaleString('hu-HU') + ' Ft'}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;padding-top:2px;">
                            <button class="sd-bank-toggle" onclick="event.preventDefault();event.stopPropagation();" data-active="${wasBankTransferred ? 'true' : 'false'}"
                                style="display:${wasUncollected?'none':'inline-flex'};align-items:center;gap:4px;font-size:11px;font-weight:600;color:${wasBankTransferred?'#0284c7':'#64748b'};background:${wasBankTransferred?'#f0f9ff':'#f8fafc'};border:1px solid ${wasBankTransferred?'#bae6fd':'#e2e8f0'};border-radius:6px;padding:6px 10px;cursor:pointer;font-family:inherit;transition:all .15s;">
                                <i class="ph-bold ph-bank" style="font-size:12px;"></i> Banki utalás
                            </button>
                            <button class="sd-partial-toggle" onclick="event.preventDefault();event.stopPropagation();"
                                style="display:${wasUncollected || wasBankTransferred ?'none':'inline-flex'};align-items:center;gap:4px;font-size:11px;font-weight:600;color:${wasPartial?'#1d4ed8':'#64748b'};background:${wasPartial?'#eff6ff':'#f8fafc'};border:1px solid ${wasPartial?'#93c5fd':'#e2e8f0'};border-radius:6px;padding:6px 10px;cursor:pointer;font-family:inherit;transition:all .15s;">
                                <i class="ph-bold ph-split-horizontal" style="font-size:12px;"></i> Részlegesen fizetett
                            </button>
                        </div>
                    </label>
                    <div class="sd-partial-row" style="display:${wasPartial?'block':'none'};padding:12px 20px 16px 116px;background:#eff6ff;border-top:1px dashed #93c5fd;">
                        <div style="font-size:12px;font-weight:700;color:#1d4ed8;margin-bottom:8px;">Részleges fizetés történt. Kérlek add meg a részleteket:</div>
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
                            <input class="sd-partial-amount" type="number" min="0" max="${o.codAmount}"
                                value="${wasPartial ? (prevPartial.amount||'') : ''}" placeholder="${o.codAmount}"
                                style="width:120px;font-size:14px;font-weight:700;color:#1e40af;border:2px solid #93c5fd;border-radius:8px;padding:6px 10px;font-family:inherit;outline:none;">
                            <span style="font-size:13px;color:#64748b;font-weight:600;">Ft átvett összeg <span style="color:#94a3b8;font-weight:normal;">(teljes elvárt: ${o.codAmount.toLocaleString('hu-HU')} Ft)</span></span>
                            <button class="sd-partial-reset" onclick="event.stopPropagation();" style="margin-left:auto;font-size:12px;font-weight:600;color:#64748b;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:6px 12px;cursor:pointer;font-family:inherit;transition:all .15s;">Mégsem</button>
                        </div>
                        <input class="sd-partial-comment" type="text" placeholder="Miért volt részleges? (pl. 1 db tábla sérült)..."
                            value="${wasPartial ? (prevPartial.comment||'').replace(/"/g,'&quot;') : ''}"
                            style="width:100%;box-sizing:border-box;font-size:13px;border:2px solid #93c5fd;border-radius:8px;padding:8px 12px;font-family:inherit;margin-bottom:12px;outline:none;">
                        
                        <div class="sd-resp-selector" style="display:flex;align-items:center;gap:8px;" data-order-id="${o.id}">
                            <span style="font-size:12px;color:#1d4ed8;font-weight:700;margin-right:6px;">Kinek a hibájából?</span>
                            <button type="button" class="sd-resp-btn mienk ${rMienkActive ? 'active' : ''}" data-resp="mienk" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rMienkActive ? '#fca5a5' : '#e2e8f0'};background:${rMienkActive ? '#fee2e2' : '#fff'};color:${rMienkActive ? '#b91c1c' : '#64748b'};transition:all .1s;">Saját hiba</button>
                            <button type="button" class="sd-resp-btn szallito ${rSzallitoActive ? 'active' : ''}" data-resp="szallito" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rSzallitoActive ? '#fed7aa' : '#e2e8f0'};background:${rSzallitoActive ? '#ffedd5' : '#fff'};color:${rSzallitoActive ? '#c2410c' : '#64748b'};transition:all .1s;">Szállító</button>
                            <button type="button" class="sd-resp-btn vevo ${rVevoActive ? 'active' : ''}" data-resp="vevo" style="font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;border:1px solid ${rVevoActive ? '#cbd5e1' : '#e2e8f0'};background:${rVevoActive ? '#e2e8f0' : '#fff'};color:${rVevoActive ? '#475569' : '#64748b'};transition:all .1s;">Vevő / Egyéb</button>
                        </div>
                    </div>
                    ${makeReasonHtml(o.id, wasUncollected)}
                </div>`;
            }).join('');

            const nonCodRowsHtml = nonCodOrders.map(o => {
                const wasUncollected = prevUncollected.has(o.id);
                const itemsList = (o.items || []).map(it => `<span style="display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:2px 6px;margin:2px 4px 2px 0;"><b>${it.qty}×</b> ${it.name}</span>`).join('');
                return `
                <div class="sd-order-row" style="border-bottom:1px solid #f1f5f9;">
                    <label style="display:grid;grid-template-columns: 24px 80px minmax(0, 2fr) minmax(0, 1fr) minmax(240px, auto);align-items:start;gap:12px;padding:14px 20px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                        <div style="display:flex;align-items:center;padding-top:2px;">
                            <input type="checkbox" data-order-id="${o.id}" data-is-cod="false" ${wasUncollected ? '' : 'checked'}
                                style="width:20px;height:20px;cursor:pointer;accent-color:#22c55e;">
                        </div>
                        <span style="font-size:14px;font-weight:700;color:#374151;padding-top:2px;">${o.id}</span>
                        <div style="display:flex;flex-direction:column;gap:4px;overflow:hidden;padding-top:2px;">
                            <div style="font-size:14px;color:#0f172a;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o.shippingName || '—'}</div>
                            ${itemsList ? `<div style="font-size:11px;color:#64748b;display:inline-flex;align-items:center;gap:4px;cursor:pointer;user-select:none;width:fit-content;padding:2px 6px;border-radius:6px;transition:background .15s;" class="sd-items-toggle" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='transparent'" onclick="event.preventDefault();event.stopPropagation();this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('i').style.transform=this.nextElementSibling.style.display==='none'?'rotate(0deg)':'rotate(180deg)'">
                                <i class="ph-bold ph-caret-down" style="transition:transform .2s;"></i> ${o.items.length} termék mutatása
                            </div>
                            <div class="sd-items-list" style="display:none;font-size:11px;color:#475569;margin-top:2px;" onclick="event.preventDefault();event.stopPropagation();">${itemsList}</div>` : ''}
                        </div>
                        <div style="display:flex;align-items:center;padding-top:2px;">
                            <span style="font-size:13px;font-weight:700;color:#64748b;background:#f1f5f9;border-radius:6px;padding:4px 10px;">Nem utánvétes</span>
                        </div>
                        <div></div>
                    </label>
                    ${makeReasonHtml(o.id, wasUncollected)}
                </div>`;
            }).join('');

            const hasBoth = codOrders.length > 0 && nonCodOrders.length > 0;
            const secLabel = (t) => `<div style="padding:6px 20px;font-size:10px;font-weight:700;color:#94a3b8;background:#f8fafc;letter-spacing:.7px;border-bottom:1px solid #e2e8f0;border-top:1px solid #e2e8f0;">${t}</div>`;
            const rowsHtml =
                (codOrders.length > 0    ? (hasBoth ? secLabel('UTÁNVÉTES RENDELÉSEK')  : '') + codRowsHtml    : '') +
                (nonCodOrders.length > 0 ? (hasBoth ? secLabel('EGYÉB RENDELÉSEK')       : '') + nonCodRowsHtml : '');

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';

            overlay.innerHTML = `
                <div style="background:#fff;border-radius:20px;width:100%;max-width:850px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,0.35);overflow:hidden;">
                    <div style="background:#0f172a;color:#fff;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
                        <div>
                            <div style="font-weight:700;font-size:15px;letter-spacing:-.2px;">Terítés rögzítése</div>
                            <div style="font-size:12px;color:#94a3b8;margin-top:3px;">${run.date} · ${run.courier || '—'} · ${run.orders.length} rendelés${codOrders.length > 0 ? ` · ${codOrders.length} utánvétes` : ''}</div>
                        </div>
                        <button id="sd-close" style="background:rgba(255,255,255,.08);border:none;color:#94a3b8;cursor:pointer;padding:6px;border-radius:10px;display:flex;line-height:1;">
                            <i class="ph-bold ph-x" style="font-size:17px;"></i>
                        </button>
                    </div>
                    <div style="padding:10px 20px 8px;background:#f8fafc;border-bottom:1px solid #e2e8f0;flex-shrink:0;">
                        <span style="font-size:12px;color:#64748b;font-weight:600;">Pipáld ki az <strong style="color:#0f172a;">átadott</strong> rendeléseket · Utánvéteseknél módosítható az elszámolás</span>
                    </div>
                    <div style="overflow-y:auto;flex:1;">${rowsHtml}</div>
                    <div style="padding:14px 20px;border-top:2px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#fff;flex-shrink:0;">
                        <div>
                            <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Elvárt készpénz</div>
                            <div id="sd-total" style="font-size:22px;font-weight:800;color:#0f172a;line-height:1.2;">${runCOD.toLocaleString('hu-HU')} Ft</div>
                            <div id="sd-missing" style="font-size:12px;font-weight:700;color:#f97316;margin-top:2px;display:none;"></div>
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button id="sd-cancel" style="background:none;border:1.5px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;padding:9px 18px;border-radius:12px;cursor:pointer;font-family:inherit;">Mégsem</button>
                            <button id="sd-save" style="background:#0f172a;border:none;color:#fff;font-size:13px;font-weight:700;padding:9px 20px;border-radius:12px;cursor:pointer;font-family:inherit;">Rögzítés</button>
                        </div>
                    </div>
                </div>`;

            document.body.appendChild(overlay);

            const updateTotal = () => {
                let total = 0;
                overlay.querySelectorAll('.sd-order-row').forEach(row => {
                    const cb = row.querySelector('input[type=checkbox]');
                    if (!cb.checked || cb.getAttribute('data-is-cod') !== 'true') return;
                    
                    const bankBtn = row.querySelector('.sd-bank-toggle');
                    const isBankTransferred = bankBtn && bankBtn.getAttribute('data-active') === 'true';
                    if (isBankTransferred) return;

                    const fullAmount   = parseInt(cb.getAttribute('data-amount'));
                    const partialRow   = row.querySelector('.sd-partial-row');
                    const partialInput = row.querySelector('.sd-partial-amount');
                    if (partialRow && partialRow.style.display !== 'none' && partialInput.value !== '') {
                        total += Math.min(parseInt(partialInput.value) || 0, fullAmount);
                    } else {
                        total += fullAmount;
                    }
                });
                overlay.querySelector('#sd-total').textContent = total.toLocaleString('hu-HU') + ' Ft';
                const missingEl = overlay.querySelector('#sd-missing');
                if (missingEl) missingEl.style.display = 'none';
            };

            overlay.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', (e) => {
                const row    = e.target.closest('.sd-order-row');
                const isCOD  = cb.getAttribute('data-is-cod') === 'true';
                const reasonRow = row.querySelector('.sd-reason-row');
                if (e.target.checked) {
                    reasonRow.style.display = 'none';
                    const rInput = row.querySelector('.sd-reason-input');
                    if (rInput) rInput.value = '';
                    if (isCOD) {
                        const pt = row.querySelector('.sd-partial-toggle');
                        const bt = row.querySelector('.sd-bank-toggle');
                        if (pt) pt.style.display = 'inline-flex';
                        if (bt) bt.style.display = 'inline-flex';
                    }
                } else {
                    if (isCOD) {
                        const pr = row.querySelector('.sd-partial-row');
                        const pt = row.querySelector('.sd-partial-toggle');
                        const bt = row.querySelector('.sd-bank-toggle');
                        if (pr) { pr.style.display = 'none'; row.querySelector('.sd-partial-amount').value = ''; row.querySelector('.sd-partial-comment').value = ''; }
                        if (pt) pt.style.display = 'none';
                        if (bt) {
                            bt.style.display = 'none';
                            bt.setAttribute('data-active', 'false');
                            bt.style.background = '#f8fafc';
                            bt.style.color = '#64748b';
                            bt.style.borderColor = '#e2e8f0';
                        }
                        row.querySelector('.sd-full-amount').style.color = '#b91c1c';
                        row.querySelector('.sd-full-amount').textContent = parseInt(cb.getAttribute('data-amount')).toLocaleString('hu-HU') + ' Ft';
                    }
                    reasonRow.style.display = 'block';
                    const rInput = row.querySelector('.sd-reason-input');
                    if (rInput) rInput.focus();
                }
                updateTotal();
            }));

            // Felelősség gombok eseménydelegált kezelése a terítés dialógusban
            overlay.addEventListener('click', (e) => {
                const btn = e.target.closest('.sd-resp-btn');
                if (!btn) return;
                e.preventDefault();
                e.stopPropagation();
                
                const selector = btn.closest('.sd-resp-selector');
                const buttons = selector.querySelectorAll('.sd-resp-btn');
                buttons.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '#fff';
                    b.style.color = '#64748b';
                    b.style.borderColor = '#e2e8f0';
                });
                
                btn.classList.add('active');
                const resp = btn.getAttribute('data-resp');
                if (resp === 'mienk') {
                    btn.style.background = '#fee2e2';
                    btn.style.borderColor = '#fca5a5';
                    btn.style.color = '#b91c1c';
                } else if (resp === 'szallito') {
                    btn.style.background = '#ffedd5';
                    btn.style.borderColor = '#fed7aa';
                    btn.style.color = '#c2410c';
                } else {
                    btn.style.background = '#e2e8f0';
                    btn.style.borderColor = '#cbd5e1';
                    btn.style.color = '#475569';
                }
            });

            // Banki utalás toggle
            overlay.querySelectorAll('.sd-bank-toggle').forEach(btn => btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = btn.closest('.sd-order-row');
                const isBankTransferred = btn.getAttribute('data-active') === 'true';
                const isChecked = row.querySelector('input[type=checkbox]').checked;
                if (!isChecked) return;
                
                const newActive = !isBankTransferred;
                btn.setAttribute('data-active', newActive ? 'true' : 'false');
                
                btn.style.background = newActive ? '#f0f9ff' : '#f8fafc';
                btn.style.color = newActive ? '#0284c7' : '#64748b';
                btn.style.borderColor = newActive ? '#bae6fd' : '#e2e8f0';
                
                const pt = row.querySelector('.sd-partial-toggle');
                const fullAmountEl = row.querySelector('.sd-full-amount');
                const cb = row.querySelector('input[type=checkbox]');
                const fullAmount = parseInt(cb.getAttribute('data-amount'));
                
                if (newActive) {
                    row.querySelector('.sd-partial-row').style.display = 'none';
                    row.querySelector('.sd-partial-amount').value = '';
                    row.querySelector('.sd-partial-comment').value = '';
                    if (pt) {
                        pt.style.display = 'none';
                        pt.style.background = '#f8fafc';
                        pt.style.color = '#64748b';
                        pt.style.borderColor = '#e2e8f0';
                    }
                    fullAmountEl.style.color = '#0284c7';
                    fullAmountEl.textContent = 'Utalva (0 Ft KP)';
                } else {
                    if (pt) pt.style.display = 'inline-flex';
                    fullAmountEl.style.color = '#b91c1c';
                    fullAmountEl.textContent = fullAmount.toLocaleString('hu-HU') + ' Ft';
                }
                updateTotal();
            }));

            // Részleges toggle
            overlay.querySelectorAll('.sd-partial-toggle').forEach(btn => btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = btn.closest('.sd-order-row');
                const partialRow = row.querySelector('.sd-partial-row');
                const isOpen = partialRow.style.display !== 'none';
                if (isOpen) {
                    partialRow.style.display = 'none';
                    row.querySelector('.sd-partial-amount').value = '';
                    row.querySelector('.sd-partial-comment').value = '';
                    btn.style.background = '#f8fafc';
                    btn.style.color = '#64748b';
                    btn.style.borderColor = '#e2e8f0';
                    row.querySelector('.sd-full-amount').style.color = '#b91c1c';
                } else {
                    partialRow.style.display = 'block';
                    const cb = row.querySelector('input[type=checkbox]');
                    const amountInput = row.querySelector('.sd-partial-amount');
                    if (!amountInput.value) amountInput.value = cb.getAttribute('data-amount');
                    amountInput.focus();
                    btn.style.background = '#eff6ff';
                    btn.style.color = '#1d4ed8';
                    btn.style.borderColor = '#93c5fd';
                    row.querySelector('.sd-full-amount').style.color = '#1d4ed8';
                }
                updateTotal();
            }));

            // Részleges összeg változásakor frissítse a teljes összeget és a végösszeget
            overlay.querySelectorAll('.sd-partial-amount').forEach(input => {
                input.addEventListener('input', (e) => {
                    const row = input.closest('.sd-order-row');
                    const fullAmount = parseInt(row.querySelector('input[type=checkbox]').getAttribute('data-amount'));
                    const val = Math.min(parseInt(e.target.value) || 0, fullAmount);
                    row.querySelector('.sd-full-amount').textContent = (val || fullAmount).toLocaleString('hu-HU') + ' Ft';
                    updateTotal();
                });
            });

            // Mégsem részleges
            overlay.querySelectorAll('.sd-partial-reset').forEach(btn => btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = btn.closest('.sd-order-row');
                row.querySelector('.sd-partial-row').style.display = 'none';
                row.querySelector('.sd-partial-amount').value = '';
                row.querySelector('.sd-partial-comment').value = '';
                const toggle = row.querySelector('.sd-partial-toggle');
                toggle.style.background = '#f8fafc';
                toggle.style.color = '#64748b';
                toggle.style.borderColor = '#e2e8f0';
                const fullAmount = parseInt(row.querySelector('input[type=checkbox]').getAttribute('data-amount'));
                row.querySelector('.sd-full-amount').textContent = fullAmount.toLocaleString('hu-HU') + ' Ft';
                row.querySelector('.sd-full-amount').style.color = '#b91c1c';
                updateTotal();
            }));

            updateTotal();

            const cleanup = () => overlay.remove();
            overlay.querySelector('#sd-close').addEventListener('click', () => { cleanup(); resolve(null); });
            overlay.querySelector('#sd-cancel').addEventListener('click', () => { cleanup(); resolve(null); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) { cleanup(); resolve(null); } });

            overlay.querySelector('#sd-save').addEventListener('click', () => {
                let settledAmount = 0;
                const uncollectedOrderIds = [];
                const uncollectedReasons  = {};
                const uncollectedResponsibility = {};
                const partialOrders       = {};
                const bankTransferredOrderIds = [];

                overlay.querySelectorAll('.sd-order-row').forEach(row => {
                    const cb      = row.querySelector('input[type=checkbox]');
                    const orderId = cb.getAttribute('data-order-id');
                    const isCOD   = cb.getAttribute('data-is-cod') === 'true';

                    if (cb.checked) {
                        if (isCOD) {
                            const bankBtn = row.querySelector('.sd-bank-toggle');
                            const isBankTransferred = bankBtn && bankBtn.getAttribute('data-active') === 'true';
                            if (isBankTransferred) {
                                bankTransferredOrderIds.push(orderId);
                            } else {
                                const fullAmount   = parseInt(cb.getAttribute('data-amount'));
                                const partialRow   = row.querySelector('.sd-partial-row');
                                const partialInput = row.querySelector('.sd-partial-amount');
                                if (partialRow && partialRow.style.display !== 'none' && partialInput.value !== '') {
                                    const partialAmount = Math.min(parseInt(partialInput.value) || 0, fullAmount);
                                    const comment = row.querySelector('.sd-partial-comment').value.trim();
                                    settledAmount += partialAmount;
                                    partialOrders[orderId] = { amount: partialAmount, comment };
                                    
                                    // Részleges megrendelés felelősség rögzítése
                                    const selector = partialRow.querySelector('.sd-resp-selector');
                                    if (selector) {
                                        const activeBtn = selector.querySelector('.sd-resp-btn.active');
                                        const resp = activeBtn ? activeBtn.getAttribute('data-resp') : 'vevo';
                                        uncollectedResponsibility[orderId] = resp;
                                    } else {
                                        uncollectedResponsibility[orderId] = 'vevo';
                                    }
                                } else {
                                    settledAmount += fullAmount;
                                }
                            }
                        }
                    } else {
                        uncollectedOrderIds.push(orderId);
                        const reasonInput = row.querySelector('.sd-reason-input');
                        if (reasonInput) {
                            const reason = reasonInput.value.trim();
                            if (reason) uncollectedReasons[orderId] = reason;
                        }
                        
                        // Teljesen meghiúsult megrendelés felelősség rögzítése
                        const selector = row.querySelector('.sd-reason-row .sd-resp-selector');
                        if (selector) {
                            const activeBtn = selector.querySelector('.sd-resp-btn.active');
                            const resp = activeBtn ? activeBtn.getAttribute('data-resp') : 'vevo';
                            uncollectedResponsibility[orderId] = resp;
                        } else {
                            uncollectedResponsibility[orderId] = 'vevo';
                        }
                    }
                });
                cleanup();
                resolve({ settledAmount, uncollectedOrderIds, uncollectedReasons, partialOrders, bankTransferredOrderIds, uncollectedResponsibility });
            });
        });
    }

    async function renderAccountingRuns() {
        let runs = await HistoryManager.getAllRuns();
        const onlyPending = accountingFilterPending.checked;

        // Szűrés: csak COD-os fuvarok; részleges is eltűnik ha filter ON
        runs = runs.filter(r => isFiltered(r));
        runs = runs.filter(r => r.orders.some(o => o.isCOD));
        if (onlyPending) {
            runs = runs.filter(r => !r.isSettled && !(r.settledAmount > 0));
        }

        accountingRunsContainer.innerHTML = '';

        if(runs.length === 0) {
            accountingRunsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Nincsenek a feltételnek megfelelő elszámolások.</p>`;
            return;
        }

        // Csoportosítás cégek szerint
        const groups = {};
        runs.forEach(run => {
            const comp = run.company || 'Egyéb';
            if (!groups[comp]) groups[comp] = [];
            groups[comp].push(run);
        });

        Object.keys(groups).sort().forEach(companyName => {
            const companyRuns = groups[companyName];
            let companyTotalCOD = 0;
            companyRuns.forEach(r => {
                if (!r.isSettled) {
                    r.orders.forEach(o => { if(o.isCOD) companyTotalCOD += o.codAmount; });
                }
            });

            const groupEl = document.createElement('div');
            groupEl.className = 'accounting-company-group';
            groupEl.style.marginBottom = '25px';

            groupEl.innerHTML = `
                <div style="background: #0f172a; color: white; padding: 10px 16px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 700; letter-spacing: 0.5px;">${companyName}</span>
                    <span style="font-size: 13px; background: #334155; padding: 2px 10px; border-radius: 20px;">Függőben: <strong>${companyTotalCOD.toLocaleString('hu-HU')} Ft</strong></span>
                </div>
                <div class="group-runs" style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 10px; background: #f8fafc; display: flex; flex-direction: column; gap: 8px;">
                </div>
            `;

            const runsContainer = groupEl.querySelector('.group-runs');
            companyRuns.forEach(run => {
                const el = document.createElement('div');
                el.className = 'unified-card acc-run-card';
                el.style.cssText = 'margin:0;overflow:hidden;';

                let runCOD = 0;
                run.orders.forEach(o => { if(o.isCOD) runCOD += o.codAmount; });
                el.setAttribute('data-total-cod', runCOD);
                el.setAttribute('data-run-id', run.id);

                const isPartial = !run.isSettled && run.settledAmount > 0;
                const circleColor = run.isSettled ? '#22c55e' : isPartial ? '#f97316' : '#cbd5e1';
                const circleBg = run.isSettled ? '#22c55e' : isPartial ? '#fff7ed' : '#fff';
                const circleTextColor = run.isSettled ? '#fff' : isPartial ? '#f97316' : '#94a3b8';
                const circleTitle = run.isSettled ? 'Visszaállítás függőbe' : isPartial ? 'Módosítás / Visszaállítás' : 'Visszaérkezett az utánvét';
                const btnClass = (run.isSettled || isPartial) ? 'btn-unsettle-run' : 'btn-settle-run';

                const statusBadge = run.isSettled
                    ? `<span class="hac-badge hac-badge-green" style="font-size:10px;"><i class="ph-bold ph-check-circle" style="font-size:10px;"></i>Elszámolva</span>`
                    : isPartial
                        ? `<span style="font-size:10px;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:1px 7px;">~${run.settledAmount.toLocaleString('hu-HU')} / ${runCOD.toLocaleString('hu-HU')} Ft</span>`
                        : '';

                const uncollected    = run.uncollectedOrderIds || [];
                const reasons        = run.uncollectedReasons || {};
                const partialOrders  = run.partialOrders || {};
                const bankTransferred = run.bankTransferredOrderIds || [];
                const orderChips = run.orders.map(o => {
                    const isUncollected = uncollected.includes(o.id);
                    const isBankTransferred = bankTransferred.includes(o.id);
                    const partialInfo   = o.isCOD && !isUncollected && !isBankTransferred ? partialOrders[o.id] : null;
                    const reasonText    = isUncollected && reasons[o.id] ? ` · ${reasons[o.id]}` : '';
                    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;${isUncollected ? 'opacity:.55;' : ''}">
                        <span style="font-size:12px;font-weight:700;color:#374151;min-width:95px;${isUncollected ? 'text-decoration:line-through;' : ''}">${o.id}</span>
                        <span style="font-size:12px;color:#64748b;flex:1;">${o.shippingName || '—'}</span>
                        ${o.isCOD
                            ? isUncollected
                                ? `<span style="font-size:11px;font-weight:700;color:#f97316;">nem érkezett<span style="font-weight:400;color:#94a3b8;">${reasonText}</span></span>`
                                : isBankTransferred
                                    ? `<span style="font-size:11px;font-weight:700;color:#3b82f6;">Elutalva (Banki utalás)<span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft</span></span>`
                                    : partialInfo
                                        ? `<span style="font-size:11px;font-weight:700;color:#1d4ed8;">~${partialInfo.amount.toLocaleString('hu-HU')} Ft<span style="font-weight:400;color:#94a3b8;"> / ${o.codAmount.toLocaleString('hu-HU')} Ft${partialInfo.comment ? ' · ' + partialInfo.comment : ''}</span></span>`
                                        : `<span style="font-size:11px;font-weight:700;color:#b91c1c;">${o.codAmount.toLocaleString('hu-HU')} Ft</span>`
                            : isUncollected
                                ? `<span style="font-size:11px;font-weight:700;color:#f97316;">nem lett átadva<span style="font-weight:400;color:#94a3b8;">${reasonText}</span></span>`
                                : '<span style="font-size:11px;color:#94a3b8;">átadva</span>'}
                    </div>`;
                }).join('');

                el.innerHTML = `
                    <div style="display:flex;align-items:center;gap:12px;padding:11px 14px;">
                        <button class="${btnClass}" data-doc-id="${run.docId}"
                            title="${circleTitle}"
                            style="flex-shrink:0;width:36px;height:36px;border-radius:50%;border:2px solid ${circleColor};background:${circleBg};color:${circleTextColor};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;">
                            <i class="ph-bold ph-check" style="font-size:16px;"></i>
                        </button>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;flex-wrap:wrap;">
                                <span style="font-size:14px;font-weight:700;color:#0f172a;">${run.date}</span>
                                ${statusBadge}
                                ${uncollected.length > 0 ? `<span style="font-size:10px;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:1px 7px;"><i class="ph-bold ph-warning" style="font-size:9px;"></i> ${uncollected.length} kiesett</span>` : ''}
                            </div>
                            <div class="hac-meta">
                                <i class="ph-bold ph-user" style="font-size:11px;color:#374151;"></i>
                                <span style="font-weight:600;color:#374151;">${run.courier || '—'}</span>
                                <span style="color:#d1d5db;">·</span>
                                <span style="color:#94a3b8;">${run.orders.length} rendelés</span>
                                ${runCOD > 0 ? `<span style="color:#d1d5db;">·</span><strong style="color:#b91c1c;">${runCOD.toLocaleString('hu-HU')} Ft</strong>` : ''}
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <button class="hac-btn-action hac-btn-ghost btn-print-summary" data-id="${run.id}" style="font-size:12px;">
                                <i class="ph-bold ph-printer" style="font-size:12px;"></i>
                            </button>
                            ${(run.isSettled || isPartial) ? `<button class="hac-btn-action hac-btn-ghost btn-modify-settlement" data-doc-id="${run.docId}" data-run-id="${run.id}" title="Elszámolás módosítása" style="font-size:12px;">
                                <i class="ph-bold ph-pencil-simple" style="font-size:12px;"></i>
                            </button>` : ''}
                            ${(run.isSettled || isPartial || uncollected.length > 0) ? `<button class="hac-btn-action btn-nullify-settlement" data-doc-id="${run.docId}" data-run-id="${run.id}" title="Visszavonás" style="font-size:11px;font-weight:700;color:#dc2626;background:#fee2e2;border:1.5px solid #fca5a5;border-radius:8px;padding:4px 9px;cursor:pointer;font-family:inherit;flex-shrink:0;">
                                <i class="ph-bold ph-x-circle" style="font-size:11px;"></i> Visszavonás
                            </button>` : ''}
                            <button class="acc-expand-btn" style="background:none;border:1.5px solid #e2e8f0;border-radius:8px;padding:6px 8px;cursor:pointer;color:#64748b;display:flex;align-items:center;transition:all .2s;" title="Rendelések mutatása">
                                <i class="ph-bold ph-caret-down" style="font-size:13px;transition:transform .2s;"></i>
                            </button>
                        </div>
                    </div>
                    <div class="acc-orders-panel" style="display:none;padding:0 14px 12px 62px;border-top:1px solid #f1f5f9;">
                        ${orderChips}
                    </div>
                `;
                runsContainer.appendChild(el);
            });

            accountingRunsContainer.appendChild(groupEl);
        });

        // Eseménykezelők újracsatolása
        accountingRunsContainer.querySelectorAll('.btn-print-summary').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const runId = e.target.closest('button').getAttribute('data-id');
                if (runId) generateDeliveryNotesHtml(runId);
            });
        });

        accountingRunsContainer.querySelectorAll('.btn-settle-run').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.target.closest('button');
                const docId = button.getAttribute('data-doc-id');
                const card = button.closest('.acc-run-card');
                const totalCOD = parseInt(card.getAttribute('data-total-cod'));
                const runId = card.getAttribute('data-run-id');
                const run = await HistoryManager.getRunById(runId);
                if (!run) return;
                const result = await showSettlementDialog(run, totalCOD);
                if (result === null) return;
                if (await HistoryManager.updateSettlementStatus(docId, result.settledAmount, totalCOD, result.uncollectedOrderIds, result.uncollectedReasons, result.partialOrders, result.bankTransferredOrderIds, result.uncollectedResponsibility)) renderAccountingRuns();
            });
        });

        accountingRunsContainer.querySelectorAll('.btn-unsettle-run').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const docId = e.target.closest('button').getAttribute('data-doc-id');
                const ok = await CustomDialog.confirm('Visszaállítás függőbe?\nAz elszámolási adat törlődik.');
                if (!ok) return;
                if (await HistoryManager.revertToPending(docId)) renderAccountingRuns();
            });
        });

        accountingRunsContainer.querySelectorAll('.btn-nullify-settlement').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.target.closest('button');
                const docId  = button.getAttribute('data-doc-id');
                const ok = await CustomDialog.confirm('Visszavonás?\nAz elszámolás törlődik, a kör függőbe kerül.');
                if (!ok) return;
                if (await HistoryManager.revertToPending(docId)) renderAccountingRuns();
            });
        });

        accountingRunsContainer.querySelectorAll('.btn-modify-settlement').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.target.closest('button');
                const docId = button.getAttribute('data-doc-id');
                const runId = button.getAttribute('data-run-id');
                const card = button.closest('.acc-run-card');
                const totalCOD = parseInt(card.getAttribute('data-total-cod'));
                const run = await HistoryManager.getRunById(runId);
                if (!run) return;
                const existingState = {
                    uncollectedOrderIds: run.uncollectedOrderIds || [],
                    uncollectedReasons: run.uncollectedReasons || {},
                    partialOrders: run.partialOrders || {},
                    bankTransferredOrderIds: run.bankTransferredOrderIds || [],
                    uncollectedResponsibility: run.uncollectedResponsibility || {}
                };
                const result = await showSettlementDialog(run, totalCOD, existingState);
                if (result === null) return;
                if (await HistoryManager.updateSettlementStatus(docId, result.settledAmount, totalCOD, result.uncollectedOrderIds, result.uncollectedReasons, result.partialOrders, result.bankTransferredOrderIds, result.uncollectedResponsibility)) renderAccountingRuns();
            });
        });

        accountingRunsContainer.querySelectorAll('.acc-expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.acc-run-card');
                if (!card) return;
                const panel = card.querySelector('.acc-orders-panel');
                const icon = btn.querySelector('i');
                const isOpen = panel.style.display !== 'none';
                panel.style.display = isOpen ? 'none' : 'block';
                icon.style.transform = isOpen ? '' : 'rotate(180deg)';
            });
        });
    }

    async function renderStatistics() {
        if (statsLeafletMap) { statsLeafletMap.remove(); statsLeafletMap = null; }
        const allRuns = await HistoryManager.getAllRuns();
        statsRunsContainer.innerHTML = '<p style="color:#94a3b8;font-size:13px;text-align:center;padding:30px;">Betöltés...</p>';

        const startD = statsDateStart.value ? new Date(statsDateStart.value + 'T00:00:00') : null;
        const endD   = statsDateEnd.value   ? new Date(statsDateEnd.value   + 'T23:59:59') : null;

        const runs = allRuns.filter(r => {
            if (r.isQuickDelivery) return false;
            if (!r.date) return true;
            const d = new Date(r.date + 'T00:00:00');
            if (startD && d < startD) return false;
            if (endD   && d > endD)   return false;
            return true;
        });

        statsRunsContainer.innerHTML = '';

        // Render sub-tabs bar at the top of the Statistics container
        const subtabsBar = document.createElement('div');
        subtabsBar.className = 'stats-subtabs no-print';
        subtabsBar.innerHTML = [
            { id: 'charts', label: 'Diagramok', icon: 'ph-chart-bar' },
            { id: 'products', label: 'Termékek', icon: 'ph-package' },
            { id: 'map', label: 'Térkép', icon: 'ph-map-pin' },
            { id: 'kiesett', label: 'Kiesett rendelések', icon: 'ph-warning' }
        ].map(t => `
            <button class="stats-subtab-btn ${activeStatsTab === t.id ? 'active' : ''}" data-tab="${t.id}">
                <i class="ph-bold ${t.icon}"></i> ${t.label}
            </button>
        `).join('');
        statsRunsContainer.appendChild(subtabsBar);

        subtabsBar.querySelectorAll('.stats-subtab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                activeStatsTab = btn.getAttribute('data-tab');
                renderStatistics();
            });
        });

        if (runs.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.style.cssText = 'color:#94a3b8;font-size:13px;text-align:center;padding:30px;';
            emptyMsg.textContent = 'Nincsenek adatok a kiválasztott időszakban.';
            statsRunsContainer.appendChild(emptyMsg);
            return;
        }

        const makeSection = (title, icon, contentHtml, fullWidth = false) => {
            const el = document.createElement('div');
            el.style.cssText = `border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;display:flex;flex-direction:column;${fullWidth ? 'grid-column:1/-1;' : ''}`;
            el.innerHTML = `
                <div style="background:#0f172a;color:#fff;padding:10px 14px;display:flex;align-items:center;gap:8px;flex-shrink:0;">
                    <i class="ph-bold ${icon}" style="font-size:14px;color:#94a3b8;"></i>
                    <span style="font-weight:700;font-size:13px;letter-spacing:-.2px;">${title}</span>
                </div>
                <div style="padding:12px 14px;background:#fff;flex:1;">${contentHtml}</div>`;
            return el;
        };

        const makeBar = (value, max, color = '#0f172a') => {
            const pct = max > 0 ? Math.round((value / max) * 100) : 0;
            return `<div style="background:#f1f5f9;border-radius:4px;height:7px;flex:1;min-width:60px;overflow:hidden;">
                <div style="background:${color};height:7px;width:${pct}%;border-radius:4px;"></div></div>`;
        };

        const makeCollapsible = (rowsArr, label, visible = 5) => {
            if (rowsArr.length <= visible) return rowsArr.join('');
            const uid = 'sc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
            const remaining = rowsArr.length - visible;
            return rowsArr.slice(0, visible).join('') +
                `<div id="${uid}" style="display:none;">${rowsArr.slice(visible).join('')}</div>
                 <button class="stats-expand-btn" data-target="${uid}" data-remaining="${remaining}" data-label="${label}"
                     style="margin-top:10px;width:100%;font-size:12px;font-weight:600;color:#3b82f6;background:#f8fafc;border:1px solid #dbeafe;border-radius:8px;cursor:pointer;padding:7px 14px;font-family:inherit;text-align:center;">
                     + ${remaining} további ${label}
                 </button>`;
        };

        // ── Cross-run recovery lookup ─────────────────────────────────
        // Ha egy kiesett rendelés egy LATER körben sikeresen elszámolásra kerül,
        // ne számítson örök kiesésnek a statisztikában.
        const successCollected = new Map();
        runs.forEach(r => {
            if (!r.isSettled && !(r.settledAmount > 0)) return;
            const uncollSet = new Set(r.uncollectedOrderIds || []);
            (r.orders || []).forEach(o => {
                if (o.isCOD && !uncollSet.has(o.id)) {
                    if (!successCollected.has(o.id)) successCollected.set(o.id, []);
                    successCollected.get(o.id).push(r.date);
                }
            });
        });
        const recoveredSet = new Set();
        runs.forEach((r, rIdx) => {
            (r.uncollectedOrderIds || []).forEach(orderId => {
                const laterDates = (successCollected.get(orderId) || []).filter(d => d > r.date);
                if (laterDates.length > 0) recoveredSet.add(`${rIdx}::${orderId}`);
            });
        });
        const getRecoveredCOD = (r, rIdx) =>
            (r.uncollectedOrderIds || []).reduce((sum, id) => {
                if (!recoveredSet.has(`${rIdx}::${id}`)) return sum;
                const o = (r.orders || []).find(x => x.id === id);
                return sum + (o && o.isCOD ? (o.codAmount || 0) : 0);
            }, 0);

        // ── 1. Szállítói összesítő ──────────────────────────────────────
        const courierMap = {};
        runs.forEach((r, rIdx) => {
            const c = r.courier || '—';
            if (!courierMap[c]) courierMap[c] = {
                runs: 0, orders: 0, cod: 0, uncollected: 0, recovered: 0,
                uncollectedSzallito: 0, uncollectedMienk: 0, uncollectedVevo: 0,
                uncollectedDetails: []
            };
            courierMap[c].runs++;
            r.orders.forEach(o => {
                courierMap[c].orders++;
                if (o.isCOD) courierMap[c].cod += o.codAmount;
            });
            const runReasons  = r.uncollectedReasons || {};
            const runPartials = r.partialOrders || {};
            const runResponsibility = r.uncollectedResponsibility || {};
            (r.uncollectedOrderIds || []).forEach(id => {
                const o = r.orders.find(x => x.id === id);
                if (!o || !o.isCOD) return;
                if (recoveredSet.has(`${rIdx}::${id}`)) {
                    courierMap[c].recovered += o.codAmount;
                } else {
                    courierMap[c].uncollected += o.codAmount;
                    const resp = runResponsibility[id] || 'vevo';
                    if (resp === 'szallito') courierMap[c].uncollectedSzallito += o.codAmount;
                    else if (resp === 'mienk') courierMap[c].uncollectedMienk += o.codAmount;
                    else courierMap[c].uncollectedVevo += o.codAmount;

                    courierMap[c].uncollectedDetails.push({
                        id, name: o.shippingName || '—', codAmount: o.codAmount,
                        reason: runReasons[id] || '', date: r.date || '—', isPartial: false
                    });
                }
            });
            Object.entries(runPartials).forEach(([id, info]) => {
                const o = r.orders.find(x => x.id === id);
                if (!o || !o.isCOD) return;
                const diff = o.codAmount - (info.amount || 0);
                if (diff <= 0) return;
                courierMap[c].uncollected += diff;
                const resp = runResponsibility[id] || 'vevo';
                if (resp === 'szallito') courierMap[c].uncollectedSzallito += diff;
                else if (resp === 'mienk') courierMap[c].uncollectedMienk += diff;
                else courierMap[c].uncollectedVevo += diff;

                courierMap[c].uncollectedDetails.push({
                    id, name: o.shippingName || '—', codAmount: diff,
                    reason: info.comment || '', date: r.date || '—',
                    isPartial: true, fullAmount: o.codAmount, partialAmount: info.amount
                });
            });
        });

        const courierRows = Object.entries(courierMap)
            .sort((a, b) => b[1].orders - a[1].orders)
            .map(([name, d]) => {
                const detailHtml = d.uncollectedDetails.map(det => `
                    <div style="display:flex;align-items:center;gap:8px;padding:4px 12px;font-size:12px;flex-wrap:wrap;">
                        <span style="font-weight:700;color:#0f172a;min-width:90px;">${det.id}</span>
                        <span style="color:#64748b;flex:1;min-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${det.name}</span>
                        <span style="color:#94a3b8;min-width:82px;">${det.date}</span>
                        ${det.isPartial
                            ? `<span style="font-size:10px;font-weight:700;color:#1d4ed8;background:#eff6ff;border-radius:5px;padding:1px 5px;">Részleges</span><span style="font-weight:700;color:#b91c1c;">−${det.codAmount.toLocaleString('hu-HU')} Ft</span>`
                            : `<span style="font-weight:700;color:#b91c1c;min-width:75px;">${det.codAmount.toLocaleString('hu-HU')} Ft</span>`}
                        <span style="font-size:11px;color:#64748b;background:#f1f5f9;border-radius:6px;padding:2px 7px;">${det.reason || 'ok nélkül'}</span>
                    </div>`).join('');

                let responsibilityBreakdown = '';
                if (d.uncollected > 0) {
                    const parts = [];
                    if (d.uncollectedSzallito > 0) parts.push(`Szállítóé: <strong>${d.uncollectedSzallito.toLocaleString('hu-HU')} Ft</strong>`);
                    if (d.uncollectedMienk > 0) parts.push(`Saját: <strong>${d.uncollectedMienk.toLocaleString('hu-HU')} Ft</strong>`);
                    if (d.uncollectedVevo > 0) parts.push(`Vevő/Egyéb: <strong>${d.uncollectedVevo.toLocaleString('hu-HU')} Ft</strong>`);
                    responsibilityBreakdown = `<span style="font-size:11px;color:#64748b;margin-left:8px;">(${parts.join(' · ')})</span>`;
                }

                return `
                <div class="stat-courier-wrapper" style="border-bottom:1px solid #f1f5f9;">
                    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;flex-wrap:wrap;">
                        <span style="font-size:13px;font-weight:700;color:#0f172a;min-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span>
                        <span style="font-size:12px;color:#64748b;min-width:70px;">${d.runs} terítés</span>
                        <span style="font-size:12px;color:#64748b;min-width:80px;">${d.orders} rendelés</span>
                        <span style="font-size:12px;font-weight:700;color:#0f172a;min-width:110px;">${d.cod.toLocaleString('hu-HU')} Ft COD</span>
                        ${d.uncollected > 0 ? `<span class="courier-kiesett-toggle" style="font-size:11px;font-weight:700;color:#f97316;cursor:pointer;display:inline-flex;align-items:center;gap:3px;user-select:none;">−${d.uncollected.toLocaleString('hu-HU')} Ft kiesett<i class="ph-bold ph-caret-down toggle-chevron" style="font-size:10px;transition:transform .2s;"></i></span>` : ''}
                        ${responsibilityBreakdown}
                        ${d.recovered  > 0 ? `<span style="font-size:11px;color:#64748b;">↩ ${d.recovered.toLocaleString('hu-HU')} Ft utólag beérkezett</span>` : ''}
                    </div>
                    ${d.uncollected > 0 ? `<div class="courier-kiesett-detail" style="display:none;padding:4px 0 8px;background:#fffbeb;border-top:1px dashed #fed7aa;border-radius:0 0 6px 6px;">${detailHtml}</div>` : ''}
                </div>`;
            }).join('');

        // Futárok fül eltávolítva — courierMap adatok megmaradnak a kiesett rendelések fülhöz

        // ── 2. Havi forgalom & Havi utánvét volumen ───────────────────
        if (activeStatsTab === 'charts') {
            const monthMap = {};
            runs.forEach(r => {
                if (!r.date) return;
                const m = r.date.substring(0, 7);
                if (!monthMap[m]) monthMap[m] = { runs: 0, orders: 0 };
                monthMap[m].runs++;
                monthMap[m].orders += r.orders.length;
            });

            const maxOrders = Math.max(...Object.values(monthMap).map(m => m.orders), 1);
            const monthRows = Object.keys(monthMap).sort().map(m => {
                const d = monthMap[m];
                const [y, mo] = m.split('-');
                return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f1f5f9;">
                    <span style="font-size:12px;font-weight:700;color:#374151;min-width:68px;">${y}. ${mo}.</span>
                    <span style="font-size:12px;color:#64748b;min-width:78px;">${d.runs} terítés</span>
                    <span style="font-size:12px;font-weight:700;color:#0f172a;min-width:70px;">${d.orders} rend.</span>
                    ${makeBar(d.orders, maxOrders)}
                </div>`;
            }).join('');

            statsRunsContainer.appendChild(makeSection('Havi forgalom', 'ph-chart-bar', monthRows));

            const codMonthMap = {};
            runs.forEach((r, rIdx) => {
                if (!r.date) return;
                const m = r.date.substring(0, 7);
                if (!codMonthMap[m]) codMonthMap[m] = { total: 0, received: 0, uncollected: 0, pending: 0, recovered: 0, bankTransferred: 0 };
                let runCOD = 0;
                r.orders.forEach(o => { if (o.isCOD) runCOD += o.codAmount; });
                codMonthMap[m].total += runCOD;

                const bankTransferredOrderIds = r.bankTransferredOrderIds || [];
                let bankSum = 0;
                r.orders.forEach(o => {
                    if (o.isCOD && bankTransferredOrderIds.includes(o.id)) {
                        bankSum += o.codAmount;
                    }
                });
                codMonthMap[m].bankTransferred += bankSum;

                if (r.isSettled || r.settledAmount > 0) {
                    const recv = r.settledAmount || 0;
                    const recoveredCOD = getRecoveredCOD(r, rIdx);
                    codMonthMap[m].received    += recv;
                    codMonthMap[m].uncollected += (runCOD - recv - bankSum) - recoveredCOD;
                    codMonthMap[m].recovered   += recoveredCOD;
                } else {
                    codMonthMap[m].pending += runCOD;
                }
            });

            const maxCOD = Math.max(...Object.values(codMonthMap).map(m => m.total), 1);
            const codRows = Object.keys(codMonthMap).sort()
                .filter(m => codMonthMap[m].total > 0)
                .map(m => {
                    const d = codMonthMap[m];
                    const [y, mo] = m.split('-');
                    const recvPct   = maxCOD > 0 ? (d.received    / maxCOD * 100) : 0;
                    const bankPct   = maxCOD > 0 ? (d.bankTransferred / maxCOD * 100) : 0;
                    const uncPct    = maxCOD > 0 ? (d.uncollected / maxCOD * 100) : 0;
                    const pendPct   = maxCOD > 0 ? (d.pending     / maxCOD * 100) : 0;
                    return `<div style="padding:9px 0;border-bottom:1px solid #f1f5f9;">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;">
                            <span style="font-size:12px;font-weight:700;color:#374151;min-width:68px;">${y}. ${mo}.</span>
                            <span style="font-size:13px;font-weight:800;color:#0f172a;">${d.total.toLocaleString('hu-HU')} Ft</span>
                            ${d.received    > 0 ? `<span style="font-size:11px;font-weight:700;color:#22c55e;">✓ ${d.received.toLocaleString('hu-HU')} Ft KP</span>` : ''}
                            ${d.bankTransferred > 0 ? `<span style="font-size:11px;font-weight:700;color:#3b82f6;">🏦 ${d.bankTransferred.toLocaleString('hu-HU')} Ft utalva</span>` : ''}
                            ${d.uncollected > 0 ? `<span style="font-size:11px;font-weight:700;color:#f97316;">~ ${d.uncollected.toLocaleString('hu-HU')} Ft kiesett</span>` : ''}
                            ${d.recovered   > 0 ? `<span style="font-size:11px;color:#64748b;">↩ ${d.recovered.toLocaleString('hu-HU')} Ft utólag</span>` : ''}
                            ${d.pending     > 0 ? `<span style="font-size:11px;color:#94a3b8;">${d.pending.toLocaleString('hu-HU')} Ft függőben</span>` : ''}
                        </div>
                        <div style="display:flex;height:7px;border-radius:4px;overflow:hidden;background:#f1f5f9;">
                            <div style="background:#22c55e;width:${recvPct}%;"></div>
                            <div style="background:#3b82f6;width:${bankPct}%;"></div>
                            <div style="background:#f97316;width:${uncPct}%;"></div>
                            <div style="background:#cbd5e1;width:${pendPct}%;"></div>
                        </div>
                    </div>`;
                }).join('');

            statsRunsContainer.appendChild(makeSection('Havi utánvét volumen', 'ph-money',
                codRows || '<p style="color:#94a3b8;font-size:13px;">Nincs utánvétes adat</p>'
            ));

            // ── 2b. Heti trend (utolsó 12 hét) ────────────────────────
            const weekMap = {};
            runs.forEach(r => {
                if (!r.date) return;
                const d = new Date(r.date + 'T00:00:00');
                const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 86400000);
                const weekNum = Math.floor(dayOfYear / 7);
                const yearWeek = `${d.getFullYear()}-W${String(weekNum + 1).padStart(2, '0')}`;
                if (!weekMap[yearWeek]) weekMap[yearWeek] = { orders: 0, runs: 0 };
                weekMap[yearWeek].orders += r.orders.length;
                weekMap[yearWeek].runs++;
            });
            const weekKeys = Object.keys(weekMap).sort().slice(-12);
            const maxWeekOrders = Math.max(...weekKeys.map(k => weekMap[k].orders), 1);
            const weekRows = weekKeys.map(k => {
                const d = weekMap[k];
                return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f1f5f9;">
                    <span style="font-size:12px;font-weight:700;color:#374151;min-width:68px;">${k}</span>
                    <span style="font-size:12px;color:#64748b;min-width:78px;">${d.runs} terítés</span>
                    <span style="font-size:12px;font-weight:700;color:#0f172a;min-width:70px;">${d.orders} rend.</span>
                    ${makeBar(d.orders, maxWeekOrders, '#8b5cf6')}
                </div>`;
            }).join('');
            statsRunsContainer.appendChild(makeSection('Heti trend (utolsó 12 hét)', 'ph-trend-up', weekRows || '<p style="color:#94a3b8;font-size:13px;">Nincs adat</p>'));

            // ── 2c. Napi átlag kiszállítás (havi bontás) ───────────────
            const dailyAvgMap = {};
            runs.forEach(r => {
                if (!r.date) return;
                const m = r.date.substring(0, 7);
                if (!dailyAvgMap[m]) dailyAvgMap[m] = { totalOrders: 0, days: new Set() };
                dailyAvgMap[m].totalOrders += r.orders.length;
                dailyAvgMap[m].days.add(r.date);
            });
            const maxDailyAvg = Math.max(...Object.values(dailyAvgMap).map(d => d.totalOrders / d.days.size), 1);
            const dailyAvgRows = Object.keys(dailyAvgMap).sort().map(m => {
                const d = dailyAvgMap[m];
                const avg = (d.totalOrders / d.days.size).toFixed(1);
                const [y, mo] = m.split('-');
                return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f1f5f9;">
                    <span style="font-size:12px;font-weight:700;color:#374151;min-width:68px;">${y}. ${mo}.</span>
                    <span style="font-size:12px;color:#64748b;min-width:78px;">${d.days.size} munkanap</span>
                    <span style="font-size:12px;font-weight:700;color:#0f172a;min-width:90px;">${avg} rend./nap</span>
                    ${makeBar(d.totalOrders / d.days.size, maxDailyAvg, '#06b6d4')}
                </div>`;
            }).join('');
            statsRunsContainer.appendChild(makeSection('Napi átlag kiszállítás', 'ph-calendar-blank', dailyAvgRows || '<p style="color:#94a3b8;font-size:13px;">Nincs adat</p>'));

            // ── 2d. Kiesési arány (havi bontás) ────────────────────────
            const failRateMap = {};
            runs.forEach(r => {
                if (!r.date) return;
                const m = r.date.substring(0, 7);
                if (!failRateMap[m]) failRateMap[m] = { total: 0, failed: 0 };
                failRateMap[m].total += r.orders.length;
                failRateMap[m].failed += (r.uncollectedOrderIds || []).length;
                failRateMap[m].failed += Object.keys(r.partialOrders || {}).length;
            });
            const failRateRows = Object.keys(failRateMap).sort().map(m => {
                const d = failRateMap[m];
                const pct = d.total > 0 ? ((d.failed / d.total) * 100).toFixed(1) : '0.0';
                const [y, mo] = m.split('-');
                const pctNum = parseFloat(pct);
                const barColor = pctNum > 15 ? '#ef4444' : pctNum > 8 ? '#f97316' : '#22c55e';
                return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f1f5f9;">
                    <span style="font-size:12px;font-weight:700;color:#374151;min-width:68px;">${y}. ${mo}.</span>
                    <span style="font-size:12px;color:#64748b;min-width:108px;">${d.failed} / ${d.total} rendelés</span>
                    <span style="font-size:12px;font-weight:700;color:${barColor};min-width:55px;">${pct}%</span>
                    ${makeBar(pctNum, 100, barColor)}
                </div>`;
            }).join('');
            statsRunsContainer.appendChild(makeSection('Kiesési arány', 'ph-chart-line-down', failRateRows || '<p style="color:#94a3b8;font-size:13px;">Nincs adat</p>'));
        }

        // ── 4. Top termékek ───────────────────────────────────────────
        if (activeStatsTab === 'products') {
            const itemMap = {};
            runs.forEach(r => r.orders.forEach(o => o.items.forEach(it => {
                if (!it.name || it.name === '—') return;
                itemMap[it.name] = (itemMap[it.name] || 0) + (it.qty || 1);
            })));

            // Normalizáció: hasonló terméknevek összevonása
            const normalizeProductName = (name) => {
                return name
                    .toLowerCase()
                    .replace(/[\s\-_]+/g, ' ')  // kötőjel/alulvonás -> szóköz
                    .replace(/\s+/g, ' ')        // többszörös szóköz -> egy
                    .trim();
            };

            // Összevonás normalizált név szerint
            const mergedMap = {};       // normName -> { totalQty, bestName, variants }
            Object.entries(itemMap).forEach(([name, qty]) => {
                const norm = normalizeProductName(name);
                if (!mergedMap[norm]) {
                    mergedMap[norm] = { totalQty: 0, bestName: name, bestQty: 0, variants: [] };
                }
                mergedMap[norm].totalQty += qty;
                mergedMap[norm].variants.push({ name, qty });
                if (qty > mergedMap[norm].bestQty) {
                    mergedMap[norm].bestQty = qty;
                    mergedMap[norm].bestName = name;
                }
            });

            const topItems = Object.values(mergedMap)
                .sort((a, b) => b.totalQty - a.totalQty);
            const maxQty = topItems.length > 0 ? topItems[0].totalQty : 1;

            const itemRows = topItems.map((item, i) => {
                const isMerged = item.variants.length > 1;
                const variantInfo = isMerged
                    ? `<div style="padding:2px 0 0 32px;"><span style="font-size:10px;color:#94a3b8;font-style:italic;">${item.variants.length} variáns összevonva: ${item.variants.map(v => v.name).join(', ')}</span></div>`
                    : '';
                return `
                <div style="border-bottom:1px solid #f1f5f9;">
                    <div style="display:flex;align-items:center;gap:10px;padding:7px 0;">
                        <span style="font-size:12px;font-weight:700;color:#94a3b8;min-width:22px;text-align:right;">${i + 1}.</span>
                        <span style="font-size:13px;color:#374151;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.bestName}${isMerged ? ' <span style="font-size:10px;font-weight:600;color:#8b5cf6;background:#f5f3ff;border-radius:5px;padding:1px 5px;margin-left:4px;">összevont</span>' : ''}</span>
                        <span style="font-size:12px;font-weight:700;color:#0f172a;min-width:45px;text-align:right;">${item.totalQty} db</span>
                        ${makeBar(item.totalQty, maxQty, '#6366f1')}
                    </div>
                    ${variantInfo}
                </div>`;
            }).join('');

            statsRunsContainer.appendChild(makeSection('Szállított termékek', 'ph-package',
                itemRows || '<p style="color:#94a3b8;font-size:13px;">Nincs termékadat</p>'
            , true));
        }

        // ── 5. Területi sűrűség (térkép) ──────────────────────────────
        const HU_ZIP = {
            // Budapest kerületek (3-digit prefix → coords)
            '101':[47.499,19.039],'102':[47.541,18.974],'103':[47.567,19.040],
            '104':[47.574,19.093],'105':[47.503,19.052],'106':[47.510,19.062],
            '107':[47.500,19.071],'108':[47.492,19.076],'109':[47.475,19.071],
            '110':[47.475,19.132],'111':[47.465,18.998],'112':[47.491,18.978],
            '113':[47.532,19.064],'114':[47.524,19.117],'115':[47.581,19.111],
            '116':[47.535,19.168],'117':[47.507,19.212],'118':[47.449,19.142],
            '119':[47.442,19.110],'120':[47.438,19.067],'121':[47.425,19.058],
            '122':[47.423,18.978],'123':[47.407,19.094],
            // Pest megye
            '2030':[47.390,18.901],'2040':[47.452,18.957],'2045':[47.469,18.897],
            '2051':[47.575,18.864],'2100':[47.598,19.358],'2120':[47.633,19.137],
            '2130':[47.698,19.260],'2170':[47.560,19.593],'2220':[47.300,19.135],
            '2310':[47.405,18.920],'2360':[47.353,19.081],'2400':[46.962,18.935],
            '2500':[47.795,18.741],'2600':[47.777,19.133],'2700':[47.167,19.800],
            '2750':[47.033,19.782],'2800':[47.587,18.388],'2900':[47.869,17.267],
            // Nógrád
            '3100':[48.098,19.797],
            // Heves
            '3000':[47.670,19.680],'3200':[47.785,19.930],'3300':[47.903,20.377],
            // BAZ
            '3400':[47.821,20.574],
            '3526':[48.104,20.778],'3527':[48.104,20.778],'3528':[48.095,20.762],
            '3529':[48.104,20.778],'3530':[48.095,20.778],'3531':[48.106,20.763],
            '3532':[48.095,20.762],'3580':[47.912,21.052],
            '3600':[48.218,20.289],'3700':[48.256,20.637],
            // Hajdú-Bihar
            '4024':[47.532,21.627],'4025':[47.532,21.627],'4026':[47.545,21.637],
            '4027':[47.522,21.597],'4028':[47.552,21.607],'4029':[47.512,21.677],
            '4031':[47.522,21.647],'4032':[47.502,21.607],'4033':[47.542,21.587],
            '4034':[47.562,21.657],'4100':[47.217,21.545],'4200':[47.450,21.389],
            '4220':[47.670,21.516],
            // Szabolcs-Szatmár
            '4400':[47.950,21.724],'4700':[47.950,22.323],
            // JNSz
            '5000':[47.176,20.182],'5100':[47.522,19.699],
            // Békés
            '5600':[46.679,21.088],'5700':[46.647,21.277],'5900':[46.566,20.661],
            // Bács-Kiskun
            '6000':[46.906,19.691],'6100':[46.710,19.852],'6400':[46.432,19.482],
            '6500':[46.179,18.952],'6600':[46.656,20.261],
            // Csongrád
            '6720':[46.253,20.148],'6721':[46.253,20.148],'6722':[46.253,20.148],
            '6723':[46.253,20.148],'6724':[46.253,20.148],'6725':[46.253,20.148],
            '6726':[46.233,20.148],'6727':[46.253,20.168],
            '6800':[46.423,20.328],'6900':[46.386,20.089],
            // Tolna
            '7100':[46.347,18.706],
            // Baranya
            '7400':[46.359,17.796],
            '7621':[46.073,18.233],'7622':[46.063,18.223],'7623':[46.083,18.243],
            '7624':[46.063,18.203],'7625':[46.073,18.253],'7630':[46.033,18.213],
            // Somogy
            '8600':[46.619,17.635],'8700':[46.359,17.796],
            // Fejér
            '8000':[47.187,18.411],'8100':[47.234,18.029],
            // Veszprém
            '8200':[47.093,17.910],'8360':[46.758,17.238],
            '8400':[47.100,17.557],'8500':[47.327,17.470],
            // Zala
            '8800':[46.459,16.990],'8900':[46.842,16.842],
            // Győr-Moson-Sopron
            '9021':[47.688,17.650],'9022':[47.698,17.640],'9023':[47.678,17.660],
            '9024':[47.668,17.650],'9025':[47.688,17.660],'9026':[47.698,17.650],
            '9027':[47.708,17.640],'9028':[47.678,17.630],
            '9200':[47.869,17.267],'9400':[47.681,16.583],
            // Vas
            '9700':[47.231,16.622],'9800':[47.003,16.837],
        };

        const lookupZip = (zip) => {
            if (HU_ZIP[zip]) return HU_ZIP[zip];
            if (zip.startsWith('1') && HU_ZIP[zip.substring(0, 3)]) return HU_ZIP[zip.substring(0, 3)];
            return null;
        };

        // zip → {count, label, coords?}
        // Budapest (1xxx): egybe kezelve egy pontként
        const BUDAPEST_COORDS = [47.4979, 19.0402];
        // ── 5. Területi sűrűség (térkép) ──────────────────────────────
        if (activeStatsTab === 'map') {
            const zipMap = {};
            runs.forEach(r => r.orders.forEach(o => {
                if (!o.address) return;
                const m = o.address.match(/^(\d{4})[,\s]+([^,]+)/);
                if (!m) return;
                const zip = m[1];
                const city = m[2].trim();
                const isBp = zip.startsWith('1') || city.toLowerCase().startsWith('budapest');
                const key = isBp ? '__budapest__' : zip;
                const label = isBp ? 'Budapest' : city;
                const coords = isBp ? BUDAPEST_COORDS : null;
                if (!zipMap[key]) zipMap[key] = { count: 0, label, zip: key, coords, orderIds: [] };
                zipMap[key].count++;
                zipMap[key].orderIds.push(o.id);
            }));

            const sortedLocs = Object.values(zipMap).sort((a, b) => b.count - a.count);
            const maxLocCount = sortedLocs.length > 0 ? sortedLocs[0].count : 1;

            const mapSectionEl = document.createElement('div');
            mapSectionEl.style.cssText = 'border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;grid-column:1/-1;display:flex;flex-direction:column;';
            mapSectionEl.innerHTML = `
                <div style="background:#0f172a;color:#fff;padding:10px 14px;display:flex;align-items:center;gap:8px;flex-shrink:0;">
                    <i class="ph-bold ph-map-pin" style="font-size:14px;color:#94a3b8;"></i>
                    <span style="font-weight:700;font-size:13px;letter-spacing:-.2px;">Területi sűrűség</span>
                    <span id="stats-map-status" style="font-size:11px;color:#64748b;margin-left:auto;"></span>
                </div>
                <div style="padding:12px 14px;background:#fff;flex:1;">
                    <div id="stats-map-leaflet" style="height:460px;border-radius:10px;overflow:hidden;margin-bottom:12px;border:1px solid #e2e8f0;"></div>
                    <div id="stats-location-list"></div>
                </div>`;
            statsRunsContainer.appendChild(mapSectionEl);

            // Leaflet init
            statsLeafletMap = L.map('stats-map-leaflet', { zoomControl: true, scrollWheelZoom: false });
            statsLeafletMap.fitBounds([[45.7, 16.1], [48.6, 22.9]]);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>',
                subdomains: 'abcd', maxZoom: 19
            }).addTo(statsLeafletMap);

            // Duplikált szállítás és kiesési okok összegyűjtése
            const orderAppearanceCount = {};  // orderId -> number of runs it appeared in
            const orderFirstFailReason = {};  // orderId -> reason from first failed attempt
            runs.forEach(r => {
                const rUnc = new Set(r.uncollectedOrderIds || []);
                const rReasons = r.uncollectedReasons || {};
                r.orders.forEach(o => {
                    orderAppearanceCount[o.id] = (orderAppearanceCount[o.id] || 0) + 1;
                    if (rUnc.has(o.id) && !orderFirstFailReason[o.id]) {
                        orderFirstFailReason[o.id] = rReasons[o.id] || '';
                    }
                });
            });

            const locListEl = document.getElementById('stats-location-list');
            const locRowsArr = sortedLocs.map((loc, i) => {
                const ids = (loc.orderIds || []).slice().sort((a, b) =>
                    parseInt(a.replace(/\D/g, '') || '0') - parseInt(b.replace(/\D/g, '') || '0')
                );
                // Deduplikált ID-k, de jelöljük a többszörösen szállítottakat
                const uniqueIds = [...new Set(ids)];
                const idBadges = uniqueIds.map(id => {
                    const count = orderAppearanceCount[id] || 1;
                    const isDuplicate = count > 1;
                    const failReason = orderFirstFailReason[id] || '';
                    let badge = `<span style="font-size:10px;font-weight:600;color:#1d4ed8;white-space:nowrap;">${id}</span>`;
                    if (isDuplicate) {
                        badge = `<span style="font-size:10px;font-weight:600;color:#c2410c;white-space:nowrap;" title="${failReason ? 'Elso kiesés oka: ' + failReason : 'Többszörösen szállítva'}">${id} <span style="font-size:9px;font-weight:700;color:#fff;background:#c2410c;border-radius:4px;padding:0 3px;">${count}x</span>${failReason ? ' <span style=&quot;font-size:9px;color:#94a3b8;&quot;>(' + failReason + ')</span>' : ''}</span>`;
                    }
                    return badge;
                }).join(' ');

                return `
                <div style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:12px;font-weight:700;color:#94a3b8;min-width:22px;text-align:right;">${i + 1}.</span>
                        <span style="font-size:13px;font-weight:600;color:#374151;min-width:100px;">${loc.label}</span>
                        <span style="font-size:12px;font-weight:700;color:#0f172a;min-width:55px;text-align:right;">${loc.count} rend.</span>
                        ${makeBar(loc.count, maxLocCount, '#3b82f6')}
                    </div>
                    <div style="padding:3px 0 0 32px;display:flex;flex-wrap:wrap;gap:4px 8px;">${idBadges}</div>
                </div>`;
            });
            locListEl.innerHTML = locRowsArr.length > 0
                ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 20px;margin-top:8px;">${locRowsArr.join('')}</div>`
                : '<p style="color:#94a3b8;font-size:13px;">Nincs cím adat</p>';

            // Markerek: kis tömör pontok, méret sqrt-skálán
            const addMarker = (coords, loc) => {
                const r = 4 + Math.round(Math.sqrt(loc.count / maxLocCount) * 10);
                L.circleMarker(coords, {
                    radius: r, fillColor: '#1d4ed8', color: '#fff',
                    weight: 1, opacity: 1, fillOpacity: 0.85
                }).bindTooltip(() => {
                    const ids = (loc.orderIds || []).slice().sort((a, b) =>
                        parseInt(a.replace(/\D/g, '') || '0') - parseInt(b.replace(/\D/g, '') || '0')
                    );
                    const cols  = ids.length <= 5 ? 1 : ids.length <= 14 ? 2 : 3;
                    const maxW  = cols === 1 ? 130 : cols === 2 ? 210 : 300;
                    const idGrid = ids.length > 0
                        ? `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:3px 12px;margin-top:6px;max-width:${maxW}px;">
                               ${ids.map(id => `<span style="font-size:11px;font-weight:600;color:#1d4ed8;white-space:nowrap;">${id}</span>`).join('')}
                           </div>`
                        : '';
                    return `<div style="padding:2px 0;"><strong style="font-size:13px;">${loc.label}</strong> <span style="font-size:12px;color:#64748b;">· ${loc.count} rendelés</span>${idGrid}</div>`;
                }, { direction: 'top', offset: [0, -r - 2], opacity: 1 }).addTo(statsLeafletMap);
            };

            const unknown = [];
            sortedLocs.forEach(loc => {
                // Budapest: közvetlen koordináta
                if (loc.coords) { addMarker(loc.coords, loc); return; }
                // Lookup tábla
                const coords = lookupZip(loc.zip);
                if (coords) {
                    addMarker(coords, loc);
                } else if (geoCache[loc.zip]) {
                    addMarker(geoCache[loc.zip], loc);
                } else if (!geoCache[loc.zip + '_miss']) {
                    unknown.push(loc);
                }
            });

            // Nominatim queue (1 req/sec)
            if (unknown.length > 0) {
                const statusEl = document.getElementById('stats-map-status');
                if (statusEl) statusEl.textContent = `Geocoding: 0/${unknown.length}…`;
                (async () => {
                    for (let i = 0; i < unknown.length; i++) {
                        const loc = unknown[i];
                        try {
                            const res = await fetch(
                                `https://nominatim.openstreetmap.org/search?postalcode=${loc.zip}&country=hu&format=json&limit=1`,
                                { headers: { 'Accept': 'application/json' } }
                            );
                            const data = await res.json();
                            if (data && data[0]) {
                                const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                                geoCache[loc.zip] = coords;
                                localStorage.setItem('hu_zip_geocache_v1', JSON.stringify(geoCache));
                                addMarker(coords, loc);
                            } else {
                                geoCache[loc.zip + '_miss'] = true;
                                localStorage.setItem('hu_zip_geocache_v1', JSON.stringify(geoCache));
                            }
                        } catch (_) { /* hálózati hiba — kihagyjuk */ }
                        if (statusEl) statusEl.textContent = i + 1 < unknown.length
                            ? `Geocoding: ${i + 1}/${unknown.length}…`
                            : '';
                        if (i + 1 < unknown.length) await new Promise(r => setTimeout(r, 1100));
                    }
                })();
            }
        }

        // ── 6+7. Kiesett rendelések (újraszállítás infóval) ───────────
        if (activeStatsTab === 'kiesett') {
            // Minden rendelés összes megjelenése: orderId → [{date, courier, isUncollected, isPartial, wasReceived}]
            const orderRunsMap = new Map();
            runs.forEach(r => {
                const rUnc  = new Set(r.uncollectedOrderIds || []);
                const rPart = r.partialOrders || {};
                const settled = r.isSettled || (r.settledAmount > 0);
                r.orders.forEach(o => {
                    if (!orderRunsMap.has(o.id)) orderRunsMap.set(o.id, []);
                    const isUnc  = rUnc.has(o.id);
                    const isPart = !!rPart[o.id];
                    orderRunsMap.get(o.id).push({
                        date: r.date, courier: r.courier,
                        isUncollected: isUnc, isPartial: isPart,
                        wasReceived: !isUnc && !isPart && settled,
                        wasPartialReceived: isPart && settled,
                    });
                });
            });

            const kiesettRows = [];
            runs.forEach(r => {
                const runReasons  = r.uncollectedReasons || {};
                const runPartials = r.partialOrders || {};
                const runResponsibility = r.uncollectedResponsibility || {};
                (r.uncollectedOrderIds || []).forEach(id => {
                    const o = (r.orders || []).find(x => x.id === id);
                    const laterEntries = (orderRunsMap.get(id) || []).filter(e => e.date > (r.date || ''));
                    kiesettRows.push({
                        id, isPartial: false, isCOD: !!(o && o.isCOD),
                        name: o ? (o.shippingName || '—') : '—',
                        date: r.date || '—', courier: r.courier || '—',
                        codAmount: o && o.isCOD ? (o.codAmount || 0) : 0,
                        reason: runReasons[id] || '',
                        laterEntries,
                        docId: r.docId,
                        responsibility: runResponsibility[id] || 'vevo'
                    });
                });
                Object.entries(runPartials).forEach(([id, info]) => {
                    const o = (r.orders || []).find(x => x.id === id);
                    if (!o || !o.isCOD) return;
                    const diff = o.codAmount - (info.amount || 0);
                    if (diff <= 0) return;
                    const laterEntries = (orderRunsMap.get(id) || []).filter(e => e.date > (r.date || ''));
                    kiesettRows.push({
                        id, isPartial: true, isCOD: true,
                        name: o.shippingName || '—',
                        date: r.date || '—', courier: r.courier || '—',
                        codAmount: diff, fullAmount: o.codAmount, partialAmount: info.amount,
                        reason: info.comment || '',
                        laterEntries,
                        docId: r.docId,
                        responsibility: runResponsibility[id] || 'vevo'
                    });
                });
            });
            kiesettRows.sort((a, b) => {
                const aRec = (a.laterEntries || []).some(e => e.wasReceived || e.wasPartialReceived) ? 1 : 0;
                const bRec = (b.laterEntries || []).some(e => e.wasReceived || e.wasPartialReceived) ? 1 : 0;
                if (aRec !== bRec) return aRec - bRec;
                return b.date.localeCompare(a.date);
            });

            const renderLaterEntries = (entries) => {
                if (!entries || entries.length === 0) return '';
                const redeliveries = entries.filter(e => e.date);
                if (redeliveries.length === 0) return '';
                const last = redeliveries[redeliveries.length - 1];
                const outcome = last.isUncollected
                    ? `<span style="font-size:10px;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #fed7aa;border-radius:5px;padding:1px 6px;">ismét kiesett</span>`
                    : last.wasReceived || last.wasPartialReceived
                        ? `<span style="font-size:10px;font-weight:700;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;padding:1px 6px;">átvéve ✓</span>`
                        : `<span style="font-size:10px;color:#94a3b8;background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:1px 6px;">függőben</span>`;
                return `<div style="margin-top:4px;padding-left:14px;border-left:2px solid #e2e8f0;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span style="font-size:11px;color:#94a3b8;">↳</span>
                    <span style="font-size:11px;font-weight:600;color:#64748b;">${redeliveries.length}× újra szállítva</span>
                    <span style="font-size:11px;color:#94a3b8;">·</span>
                    <span style="font-size:11px;color:#64748b;">${last.date} · ${last.courier || '—'}</span>
                    ${outcome}
                </div>`;
            };

            const kiesettCards = kiesettRows.map(k => {
                const isRecovered = k.laterEntries && k.laterEntries.some(e => e.wasReceived || e.wasPartialReceived);
                const amtColor = isRecovered ? '#94a3b8' : '#b91c1c';
                
                const resp = k.responsibility || 'vevo';
                let pillClass = 'vevo';
                let pillIcon = '<i class="ph-bold ph-user"></i>';
                let pillLabel = 'Vevő / Egyéb';
                if (resp === 'mienk') {
                    pillClass = 'mienk';
                    pillIcon = '<i class="ph-bold ph-x-circle"></i>';
                    pillLabel = 'Saját hiba';
                } else if (resp === 'szallito') {
                    pillClass = 'szallito';
                    pillIcon = '<i class="ph-bold ph-truck"></i>';
                    pillLabel = 'Szállító hibája';
                }

                const actionContainer = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
                    <div class="responsibility-display" style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:11px;color:#64748b;font-weight:600;margin-right:4px;">Felelős:</span>
                        <span class="resp-pill ${pillClass}" data-doc-id="${k.docId}" data-order-id="${k.id}" data-resp="${resp}" title="Kattints a felelős módosításához">
                            ${pillIcon}${pillLabel}
                        </span>
                    </div>
                    ${!isRecovered && k.isCOD && !k.isPartial ? `<button class="btn-mark-bank" data-doc-id="${k.docId}" data-order-id="${k.id}" style="display:flex;align-items:center;gap:4px;font-size:10px;font-weight:600;color:#0284c7;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:3px 8px;cursor:pointer;transition:all .15s;" title="Áthelyezés utalt státuszba (nem lesz kiesett)">
                        <i class="ph-bold ph-bank" style="font-size:10px;"></i>Utólag elutalva
                    </button>` : ''}
                </div>
                `;

                return `
                <div class="stat-kiesett-card" style="padding:10px 8px;border-bottom:1px solid #f1f5f9;">
                    <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;">
                        <span style="font-size:12px;font-weight:700;color:#0f172a;">${k.id}</span>
                        <span style="font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;">${k.name}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:4px;">
                        <span style="font-size:11px;color:#94a3b8;">${k.date}</span>
                        <span style="font-size:11px;color:#374151;">${k.courier}</span>
                        ${!k.isCOD
                            ? `<span style="font-size:10px;color:#64748b;background:#f1f5f9;border-radius:5px;padding:1px 6px;">Nem utánvétes</span>`
                            : k.isPartial
                                ? `<span style="font-size:10px;font-weight:700;color:#1d4ed8;background:#eff6ff;border:1px solid #93c5fd;border-radius:5px;padding:1px 6px;">Részleges</span>
                                   <span style="font-size:11px;font-weight:700;color:${amtColor};">-${k.codAmount.toLocaleString('hu-HU')} Ft</span>`
                                : k.codAmount > 0
                                    ? `<span style="font-size:11px;font-weight:700;color:${amtColor};">${k.codAmount.toLocaleString('hu-HU')} Ft</span>`
                                    : ''}
                        ${k.reason ? `<span style="font-size:10px;color:#64748b;background:#f1f5f9;border-radius:5px;padding:2px 7px;">${k.reason}</span>` : ''}
                    </div>
                    ${renderLaterEntries(k.laterEntries)}
                    ${actionContainer}
                </div>`;
            }).join('');

            const kiesettContentHtml = kiesettRows.length > 0
                ? `<div class="stats-kiesett-grid">${kiesettCards}</div>`
                : '<p style="color:#94a3b8;font-size:13px;">Nincs kiesett rendelés a kiválasztott időszakban.</p>';

            statsRunsContainer.appendChild(makeSection('Kiesett rendelések', 'ph-warning', kiesettContentHtml, true));

            // "Utólag elutalva" gomb kattintáskezelő
            statsRunsContainer.querySelectorAll('.btn-mark-bank').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const docId = btn.getAttribute('data-doc-id');
                    const orderId = btn.getAttribute('data-order-id');
                    const ok = await CustomDialog.confirm(`Biztosan utólag elutalva állapotra állítod a ${orderId} rendelést? Ez kiveszi a kiesettek közül.`, 'Utólag elutalva', 'info');
                    if (ok) {
                        const success = await HistoryManager.markAsBankTransferred(docId, orderId);
                        if (success) {
                            renderStatsView(); // Újratölti a statisztikát
                        }
                    }
                });
            });

            // Felelősség pirula kattintáskezelő (ciklikus váltás)
            statsRunsContainer.querySelectorAll('.resp-pill').forEach(pill => {
                pill.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const docId = pill.getAttribute('data-doc-id');
                    const orderId = pill.getAttribute('data-order-id');
                    const currentResp = pill.getAttribute('data-resp');
                    
                    // Ciklikus váltás: vevo -> mienk -> szallito -> vevo
                    let nextResp = 'vevo';
                    let nextLabel = 'Vevő / Egyéb';
                    let nextClass = 'vevo';
                    let nextIcon = '<i class="ph-bold ph-user"></i>';

                    if (currentResp === 'vevo') {
                        nextResp = 'mienk';
                        nextLabel = 'Saját hiba';
                        nextClass = 'mienk';
                        nextIcon = '<i class="ph-bold ph-x-circle"></i>';
                    } else if (currentResp === 'mienk') {
                        nextResp = 'szallito';
                        nextLabel = 'Szállító hibája';
                        nextClass = 'szallito';
                        nextIcon = '<i class="ph-bold ph-truck"></i>';
                    }

                    // Vizuális visszajelzés azonnal (optimista frissítés)
                    pill.className = `resp-pill ${nextClass}`;
                    pill.setAttribute('data-resp', nextResp);
                    pill.innerHTML = `${nextIcon}${nextLabel}`;

                    // Mentés a háttérben
                    const ok = await HistoryManager.updateResponsibilityInFirestore(docId, orderId, nextResp);
                    if (ok) {
                        // Újrarajzolás vibrálás nélkül a bento boxok/courier breakdown frissítéséhez
                        renderStatistics();
                    } else {
                        alert("Hiba történt a felelősség rögzítésekor.");
                        // Visszaállítás hiba esetén
                        pill.className = `resp-pill ${currentResp}`;
                        pill.setAttribute('data-resp', currentResp);
                        let currLabel = 'Vevő / Egyéb';
                        let currIcon = '<i class="ph-bold ph-user"></i>';
                        if (currentResp === 'mienk') { currLabel = 'Saját hiba'; currIcon = '<i class="ph-bold ph-x-circle"></i>'; }
                        else if (currentResp === 'szallito') { currLabel = 'Szállító hibája'; currIcon = '<i class="ph-bold ph-truck"></i>'; }
                        pill.innerHTML = `${currIcon}${currLabel}`;
                    }
                });
            });
        }

        // Expand/collapse eseménykezelő a lenyitható szekciókhoz
        statsRunsContainer.querySelectorAll('.stats-expand-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const el = document.getElementById(btn.dataset.target);
                if (!el) return;
                const isOpen = el.style.display !== 'none';
                el.style.display = isOpen ? 'none' : '';
                btn.textContent = isOpen
                    ? `+ ${btn.dataset.remaining} további ${btn.dataset.label}`
                    : 'Kevesebb mutatása';
            });
        });
    }

    async function ignoreDelayInFirestore(docId, orderId) {
        try {
            const runs = await HistoryManager.getAllRuns();
            const run = runs.find(r => r.docId === docId);
            if (!run) return;

            const updatedOrders = run.orders.map(o => {
                if (o.id === orderId) return { ...o, isDelayIgnored: true };
                return o;
            });

            const docRef = doc(db, HistoryManager.COLLECTION_NAME, docId);
            await updateDoc(docRef, { orders: updatedOrders });
            return true;
        } catch (e) {
            console.error("Hiba a késés elrejtésénél: ", e);
            return false;
        }
    }

    accountingFilterPending.addEventListener('change', () => {
        renderAccountingRuns();
    });

    async function renderTrashRuns() {
        let runs = await HistoryManager.getTrashRuns();
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
                    await renderTrashRuns();
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
                    await renderTrashRuns();
                }
            });
        });
    }

    function renderSearchResults(matches) {
        hsResultsContainer.innerHTML = '';
        
        if(matches.length === 0) {
            hsResultsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">Nincs találat.</p>';
            return;
        }
        
        matches.forEach(m => {
            const el = document.createElement('div');
            el.className = 'history-run-card search-result-card';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'space-between';
            el.style.padding = '20px 28px';
            el.style.gap = '24px';
            el.style.marginBottom = '12px';
            el.style.background = '#fff';
            el.style.borderRadius = '20px';
            el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)';
            el.style.borderLeft = '6px solid #3b82f6';
            
            const itemsSummary = m.items.map(it => `${it.qty}× ${it.name}`).join(', ');
            
            let accountingBadgeHtml = '';
            if (m.isCOD) {
                let badgeText = 'Függőben lévő elszámolás';
                let badgeColor = '#f59e0b';
                let badgeBg = '#fef3c7';

                let dynamicIsSettled = m.runData && m.runData.isSettled;
                if (m.runData && !dynamicIsSettled && typeof m.runData.settledAmount !== 'undefined') {
                    let bankTransferredSum = 0;
                    let uncollectedSum = 0;
                    let partialDiffs = 0;
                    (m.runData.orders || []).forEach(o => {
                        if (o.isCOD) {
                            if (m.runData.bankTransferredOrderIds && m.runData.bankTransferredOrderIds.some(id => String(id) === String(o.id))) {
                                bankTransferredSum += o.codAmount;
                            } else if (m.runData.uncollectedOrderIds && m.runData.uncollectedOrderIds.some(id => String(id) === String(o.id))) {
                                uncollectedSum += o.codAmount;
                            } else if (m.runData.partialOrders && (m.runData.partialOrders[o.id] || m.runData.partialOrders[String(o.id)])) {
                                const partialVal = m.runData.partialOrders[o.id] || m.runData.partialOrders[String(o.id)];
                                partialDiffs += (o.codAmount - (partialVal.amount || 0));
                            }
                        }
                    });
                    const expectedAmount = (m.runData.totalCOD || 0) - bankTransferredSum - uncollectedSum - partialDiffs;
                    dynamicIsSettled = m.runData.settledAmount >= expectedAmount;
                }

                if (m.runData && m.runData.bankTransferredOrderIds && m.runData.bankTransferredOrderIds.some(id => String(id) === String(m.id))) {
                    badgeText = 'Utólag elutalva';
                    badgeColor = '#3b82f6';
                    badgeBg = '#dbeafe';
                } else if (m.runData && m.runData.uncollectedOrderIds && m.runData.uncollectedOrderIds.some(id => String(id) === String(m.id))) {
                    badgeText = 'Nincs beszedve';
                    badgeColor = '#ef4444';
                    badgeBg = '#fee2e2';
                } else if (m.runData && m.runData.partialOrders && (m.runData.partialOrders[m.id] || m.runData.partialOrders[String(m.id)])) {
                    badgeText = 'Részlegesen beszedve';
                    badgeColor = '#f97316';
                    badgeBg = '#ffedd5';
                } else if (dynamicIsSettled) {
                    badgeText = 'Készpénzben elszámolva';
                    badgeColor = '#10b981';
                    badgeBg = '#d1fae5';
                }

                accountingBadgeHtml = `<span style="font-size: 11px; background: ${badgeBg}; color: ${badgeColor}; padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-left: 5px; display: flex; align-items: center; gap: 4px;"><i class="ph-bold ph-currency-circle-dollar" style="font-size: 13px;"></i> ${badgeText}</span>`;
            } else {
                accountingBadgeHtml = `<span style="font-size: 11px; background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-left: 5px; display: flex; align-items: center; gap: 4px;"><i class="ph-bold ph-prohibit" style="font-size: 13px;"></i> Nincs utánvét</span>`;
            }
            
            el.innerHTML = `
                <div class="s-section-info" style="flex: 1;">
                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 6px;">
                        <span style="font-weight: 900; color: #3b82f6; font-size: 15px;">${m.id}</span>
                        <span style="font-size: 10px; background: #0f172a; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${m.runCompany}</span>
                        <span style="font-size: 11px; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-weight: 600; display: flex; align-items: center; gap: 5px;"><i class="ph-bold ph-calendar" style="font-size: 13px;"></i> ${m.runDate}</span>
                        <span style="font-size: 11px; background: #e0f2fe; color: #0284c7; padding: 2px 8px; border-radius: 4px; font-weight: 700; display: flex; align-items: center; gap: 4px;"><i class="ph-bold ph-truck" style="font-size: 13px;"></i> ${m.runCourier}</span>
                        ${accountingBadgeHtml}
                    </div>
                    <div style="font-size: 17px; font-weight: 800; color: #1e293b; margin-bottom: 2px;">${m.shippingName}</div>
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <i class="ph-bold ph-map-pin" style="color: #94a3b8; font-size: 16px;"></i>
                        ${m.address || '-'}
                    </div>
                    <div style="font-size: 11px; color: #475569; background: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; line-height: 1.4;">
                        <i class="ph-bold ph-package" style="margin-right: 5px; color: #64748b; font-size: 14px;"></i>
                        <strong>Tételek:</strong> ${itemsSummary}
                    </div>
                </div>

                <div class="s-section-actions" style="display: flex; flex-direction: column; gap: 10px; min-width: 320px; border-left: 1px solid #f1f5f9; padding-left: 24px;">
                    <button class="btn btn-primary btn-load-run" data-id="${m.runId}" style="padding: 12px; font-size: 13px; font-weight: 700; border-radius: 12px; background: #3b82f6;">Kör betöltése</button>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;">
                        <button class="btn btn-secondary btn-sm btn-print-picking" data-id="${m.runId}" style="padding: 10px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 10px; border: 1.5px solid #e2e8f0;">
                            <i class="ph-bold ph-clipboard-text"></i>
                            Szedő
                        </button>
                        <button class="btn btn-secondary btn-sm btn-print-delivery" data-id="${m.runId}" style="padding: 10px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 10px; border: 1.5px solid #e2e8f0;">
                            <i class="ph-bold ph-truck"></i>
                            Szállítók
                        </button>
                        <button class="btn btn-secondary btn-sm btn-print-summary" data-id="${m.runId}" style="padding: 10px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 10px; border: 1.5px solid #e2e8f0;">
                            <i class="ph-bold ph-file-text"></i>
                            Összesítő
                        </button>
                        <button class="btn btn-secondary btn-sm btn-print-bundle" data-id="${m.runId}" style="padding: 10px; font-size: 11px; font-weight: 800; background: #0a0a0a; color: #fff; border: none; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 10px;">
                            <i class="ph-bold ph-printer"></i>
                            CSOMAG
                        </button>
                    </div>
                </div>
            `;
            hsResultsContainer.appendChild(el);
        });

        // Eseménykezelők a keresési találatokhoz
        hsResultsContainer.querySelectorAll('.btn-load-run').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.getAttribute('data-id');
                const run = await HistoryManager.getRunById(runId);
                if (run) {
                    const confirm = await CustomDialog.confirm(`Biztosan betöltöd ezt a kört? (${run.date} - ${run.courier})<br>A jelenlegi (nem mentett) adataid elvesznek!`, 'Kör betöltése', 'warning');
                    if (confirm) {
                        orders = JSON.parse(JSON.stringify(run.orders));
                        currentLoadedRunId = run.id;
                        originalLoadedRun = JSON.parse(JSON.stringify(run));
                        renderOrders();
                        historyModal.classList.remove('active');
                    }
                }
            });
        });

        hsResultsContainer.querySelectorAll('.btn-print-picking').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.getAttribute('data-id');
                const run = await HistoryManager.getRunById(runId);
                if (run) await UnifiedPrinter.printSingle(run, 'picking');
            });
        });

        hsResultsContainer.querySelectorAll('.btn-print-delivery').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.getAttribute('data-id');
                const run = await HistoryManager.getRunById(runId);
                if (run) await UnifiedPrinter.printSingle(run, 'delivery');
            });
        });

        hsResultsContainer.querySelectorAll('.btn-print-summary').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.getAttribute('data-id');
                const run = await HistoryManager.getRunById(runId);
                if (run) await UnifiedPrinter.printSingle(run, 'summary');
            });
        });

        hsResultsContainer.querySelectorAll('.btn-print-bundle').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.getAttribute('data-id');
                const run = await HistoryManager.getRunById(runId);
                if (run) await UnifiedPrinter.printBundle(run);
            });
        });
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

    function generatePdfHtml(run) {
        let cardsHtml = run.orders.map((order, index) => {
            let codHtml = '';
            if (order.isBankDeposit) {
                if (order.isPaid) {
                    codHtml = `<span class="badge badge-paid">UTALVA (FIZETVE)</span>`;
                } else {
                    codHtml = `<span class="badge badge-warning">UTALÁST VÁRUNK</span>`;
                }
            } else if (order.isCOD) {
                const formattedAmount = new Intl.NumberFormat('hu-HU').format(order.codAmount);
                codHtml = `<span class="badge badge-cod">UTÁNVÉT: ${formattedAmount} Ft</span>`;
            } else {
                codHtml = `<span class="badge badge-paid">Fizetve / Nincs Utánvét</span>`;
            }

            let errorsHtml = '';
            if (order.errors && order.errors.length > 0) {
                errorsHtml = order.errors.map((err) => `
                    <div class="error-box">
                        <div class="error-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            ${err.title}
                        </div>
                        <div class="error-desc">${err.desc}</div>
                    </div>
                `).join('');
            }

            let itemsHtml = order.items.map((item, iIdx) => {
                const showMarker = needsMarkerLabel(item.name, item.isCollapsedProfile);
                let toggleHtml = '';
                let subItemsHtml = '';
                
                if (item.isCollapsedProfile && item.subItems && item.subItems.length > 0) {
                    toggleHtml = ` <span class="profile-toggle no-print" onclick="
                        var el = document.getElementById('pdf-sub-${index}-${iIdx}');
                        if(el.style.display==='none'){el.style.display='block';this.textContent='▲';}
                        else{el.style.display='none';this.textContent='▼';}
                    " style="cursor: pointer; color: #3b82f6; font-size: 11px; margin-left: 6px; font-weight: 600;">▼</span>`;
                    subItemsHtml = `
                        <div id="pdf-sub-${index}-${iIdx}" class="profile-subitems no-print" style="display: none; padding: 6px 0 0 12px; font-size: 11px; color: #475569;">
                            ${item.subItems.map(sub => `<div style="margin-bottom: 2px;">• ${sub.qty} db - ${sub.name}</div>`).join('')}
                        </div>
                    `;
                }

                return `
                    <tr>
                        <td class="col-check"><div class="col-flex-center"><div class="checkbox-box"></div></div></td>
                        <td class="col-marker">${showMarker ? '<div class="col-flex-center"><span class="marker-lbl">címke</span><div class="checkbox-box marker"></div></div>' : ''}</td>
                        <td class="col-qty nowrap"><strong>${item.qty} db</strong></td>
                        <td class="col-name">${item.name}${toggleHtml}${subItemsHtml}</td>
                    </tr>
                `;
            }).join('');

            return `
                <div class="order-card ${order.errors && order.errors.length > 0 ? 'has-error' : ''}">
                    <div class="order-header">
                        <div class="header-left">
                            <div class="order-index">${index + 1}</div>
                            <div>
                                <div class="order-id">${order.id}</div>
                                <div class="order-customer">${order.shippingName}</div>
                                <div class="order-address">${order.address}</div>
                            </div>
                        </div>
                        <div class="order-meta">
                            <div class="badge-container">${codHtml}</div>
                        </div>
                    </div>
                    ${errorsHtml}
                    <table class="items-table">
                        <tbody>${itemsHtml}</tbody>
                    </table>
                </div>
            `;
        }).join('');

        let styles = '';
        try {
            styles = Array.from(document.styleSheets).map(sheet => {
                if (sheet.href) return `<link rel="stylesheet" href="${sheet.href}">`;
                return `<style>${Array.from(sheet.cssRules).map(rule => rule.cssText).join('')}</style>`;
            }).join('\n');
        } catch (e) {
            styles = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="css/style.css">`;
        }

        const dateStr = new Date(run.timestamp).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        return `
            <!DOCTYPE html>
            <html lang="hu">
            <head>
                <meta charset="UTF-8">
                <title>Kiszedési Jegyzék - ${run.date} - ${run.courier}</title>
                ${styles}
                <style>
                    body { background: white !important; padding: 10px !important; color: black; }
                    .app-container { max-width: 1200px; margin: 0 auto; box-shadow: none; background: transparent; padding: 0; position: relative; min-height: 100vh; }
                    .order-card { break-inside: avoid; margin-bottom: 8px; box-shadow: none; border: 1px solid #e2e8f0; padding: 6px !important; }
                    .order-header { margin-bottom: 4px !important; padding-bottom: 4px !important; }
                    .items-table td { padding: 2px 4px !important; vertical-align: middle !important; font-size: 11px !important; }
                    .no-print { display: none !important; }
                    .col-flex-center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0px; }
                    .marker-lbl { font-size: 7px; color: #64748b; font-weight: 800; text-transform: uppercase; line-height: 1; margin-bottom: 1px; }
                    .print-document-header { text-align: center; margin-bottom: 6px; border-bottom: 1.5px solid black; padding-bottom: 4px; }
                    .print-document-header h1 { font-size: 16px; margin: 0; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
                    .print-document-footer { 
                        position: fixed; 
                        bottom: 10px; 
                        right: 10px; 
                        background: white; 
                        border: 1.5px solid #000; 
                        padding: 6px 12px; 
                        border-radius: 6px; 
                        font-size: 10px; 
                        z-index: 1000;
                        display: flex;
                        align-items: center;
                        box-shadow: 0 0 10px white;
                    }
                    .print-document-footer strong { font-size: 11px; font-weight: 800; display: inline; margin-left: 3px; }
                </style>
            </head>
            <body>
                <div class="app-container">
                    <div class="print-document-header">
                        <h1>Kiszedési jegyzék</h1>
                    </div>
                    
                    <div class="print-document-footer">
                        <span style="color: #64748b; text-transform: uppercase; margin-right: 15px;">Szállítási Adatok:</span>
                        <span style="margin-right: 15px;">Cég: <strong>${run.company || '-'}</strong></span>
                        <span style="margin-right: 15px;">Szállító: <strong>${run.courier}</strong></span>
                        <span style="margin-right: 15px;">Felvétel: <strong>${run.pickupDate || run.date}</strong></span>
                        <span>Kiszállítás: <strong>${run.date}</strong></span>
                    </div>

                    <div class="content-body" style="padding-bottom: 120px;">
                        <div class="order-list">
                            ${cardsHtml}
                        </div>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(() => window.print(), 500);
                    };
                </script>
            </body>
            </html>
        `;
    }

    function openPdfView(run) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            CustomDialog.alert('Kérlek engedélyezd a felugró ablakokat a PDF nézethez!', 'Hiba', 'error');
            return;
        }
        printWindow.document.write(generatePdfHtml(run));
        printWindow.document.close();
    }

    window.generateDeliveryNotesHtml = async function(runId) {
        const run = await HistoryManager.getRunById(runId);
        if (!run) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            CustomDialog.alert('Kérlek engedélyezd a felugró ablakokat a szállítólevelekhez!', 'Hiba', 'error');
            return;
        }

        const senderData = run.sender === 'ev' 
            ? {
                name: "Egyéni Vállalkozó (Példa)",
                address: "1234 Példaváros, Minta utca 1.",
                bank: "00000000-00000000",
                phone: "+36 30 000 0000",
                email: "pelda@email.com"
            }
            : {
                name: "Capsula Houses Kft.",
                address: "Széles utca 70., 2040, Budaörs, Magyarország",
                bank: "11735005-26088969",
                phone: "+36 70 590 8157",
                email: "info@panelburkolat.com"
            };

        let notesHtml = `
            <!DOCTYPE html>
            <html lang="hu">
            <head>
                <meta charset="UTF-8">
                <title>Szállítólevelek - ${run.date}</title>
                <style>
                    @page { size: A4 portrait; margin: 15mm; }
                    body {
                        font-family: 'Inter', sans-serif, Arial;
                        margin: 0;
                        padding: 0;
                        color: #1e293b;
                        background: #f1f5f9;
                    }
                    .page {
                        width: 210mm;
                        padding: 18mm 20mm;
                        box-sizing: border-box;
                        break-after: page;
                        page-break-after: always;
                        background: white;
                        margin: 15mm auto;
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    }
                    @media print {
                        body { background: none; }
                        .page { 
                            margin: 0; 
                            border: none; 
                            padding: 10mm 15mm; 
                            box-shadow: none; 
                            break-after: page; 
                            page-break-after: always; 
                            width: 100%;
                            height: 100%;
                            position: relative;
                        }
                        .signatures { break-inside: avoid; page-break-inside: avoid; margin-top: 25px; }
                        .summary { break-inside: avoid; page-break-inside: avoid; }
                        table { break-inside: auto; }
                        tr { break-inside: avoid; page-break-inside: avoid; }
                        h3 { break-after: avoid; page-break-after: avoid; }
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        border-bottom: 2px solid #e2e8f0;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }
                    .header-block {
                        width: 48%;
                    }
                    .header-title {
                        font-size: 14px;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 8px;
                        font-weight: 600;
                    }
                    .info-text {
                        font-size: 14px;
                        line-height: 1.5;
                    }
                    .doc-title {
                        text-align: center;
                        font-size: 24px;
                        font-weight: 700;
                        margin: 20px 0;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                        font-size: 14px;
                    }
                    th, td {
                        padding: 10px;
                        text-align: left;
                        border-bottom: 1px solid #e2e8f0;
                        vertical-align: middle;
                    }
                    th {
                        background: #f8fafc;
                        font-weight: 600;
                        color: #475569;
                    }
                    .text-right {
                        text-align: right;
                    }
                    .summary {
                        margin-top: 30px;
                        display: flex;
                        justify-content: flex-end;
                    }
                    .summary-box {
                        width: 300px;
                        background: #f8fafc;
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                    }
                    .summary-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                        font-size: 14px;
                    }
                    .summary-row.total {
                        font-weight: 700;
                        font-size: 16px;
                        border-top: 1px solid #cbd5e1;
                        padding-top: 8px;
                        margin-top: 8px;
                    }
                    .signatures {
                        margin-top: 80px;
                        display: flex;
                        justify-content: space-between;
                    }
                    .signature-box {
                        width: 250px;
                        text-align: center;
                    }
                    .signature-line {
                        border-bottom: 1px solid #000;
                        margin-bottom: 10px;
                        height: 30px;
                    }
                    .footer {
                        margin-top: 25px;
                        text-align: center;
                        font-size: 11px;
                        color: #94a3b8;
                        border-top: 1px dashed #e2e8f0;
                        padding-top: 10px;
                    }
                </style>
            </head>
            <body>
        `;

        let aggregatedItems = {};
        let totalCOD = 0;

        run.orders.forEach(order => {
            if (order.isCOD) {
                totalCOD += order.codAmount;
            }
            order.items.forEach(item => {
                if (item.isCollapsedProfile && item.subItems && item.subItems.length > 0) {
                    item.subItems.forEach(sub => {
                        if (!aggregatedItems[sub.name]) {
                            aggregatedItems[sub.name] = 0;
                        }
                        aggregatedItems[sub.name] += sub.qty;
                    });
                } else {
                    if (!aggregatedItems[item.name]) {
                        aggregatedItems[item.name] = 0;
                    }
                    aggregatedItems[item.name] += item.qty;
                }
            });
        });

        let summaryItemsHtml = Object.keys(aggregatedItems)
            .sort()
            .map(name => {
                return `
                    <tr>
                        <td>${name}</td>
                        <td class="text-right" style="font-size: 16px;"><strong>${aggregatedItems[name]} db</strong></td>
                    </tr>
                `;
            }).join('');

        const orderIdsList = run.orders.map(o => o.id).join(', ');

        let correctionRows = run.orders.map(order => {
            return `
                <tr>
                    <td style="font-weight: 700;">${order.id}</td>
                    <td>${order.shippingName}</td>
                    <td class="text-right" style="font-weight: 700; color: ${order.isCOD ? '#b91c1c' : '#15803d'};">
                        ${order.isCOD ? order.codAmount.toLocaleString('hu-HU') + ' Ft' : 'Fizetve'}
                    </td>
                    <td style="text-align: center; border-left: 2px solid #cbd5e1;">
                        <div style="width: 20px; height: 20px; border: 1px solid #94a3b8; border-radius: 3px; display: inline-block;"></div>
                    </td>
                    <td></td>
                </tr>
            `;
        }).join('');

        // === Összesítő lap HTML (2x kell) ===
        const summaryPageHtml = `
            <div class="page">
                <div class="doc-title" style="font-size: 28px; margin-bottom: 5px;">Összesítő (Átadás-Átvétel)</div>
                <div style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 10px;">Kelt: ${run.date} | Szállító: ${run.courier}</div>
                <div style="text-align: center; background: #0f172a; color: white; font-size: 22px; font-weight: 800; padding: 12px 24px; border-radius: 10px; margin-bottom: 30px; letter-spacing: 1px;">${run.company || '-'}</div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 30px; text-align: center;">
                    <div style="font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 5px; text-transform: uppercase;">Összes beszedendő utánvét a körben:</div>
                    <div style="font-size: 32px; font-weight: 800; color: #b91c1c;">${totalCOD.toLocaleString('hu-HU')} Ft</div>
                </div>

                <h3 style="margin-bottom: 15px; color: #334155; font-size: 18px;">Átadott termékek összesítve:</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Megnevezés</th>
                            <th class="text-right">Összes Mennyiség</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${summaryItemsHtml}
                    </tbody>
                </table>

                <div style="margin-top: 20px; padding: 15px; background: #f1f5f9; border-radius: 8px;">
                    <div style="font-size: 14px; color: #475569; font-weight: 600; margin-bottom: 5px;">Körben lévő rendelések:</div>
                    <div style="font-size: 14px; font-weight: 700; line-height: 1.5;">${orderIdsList}</div>
                </div>

                <div class="signatures" style="margin-top: 60px;">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>Átadó (Raktár)</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Dátum: ...............................</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>Átvette (Szállító: ${run.courier})</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Dátum: ...............................</div>
                    </div>
                </div>
            </div>
            
        `;
        // === Korrekciós lap HTML (1x kell) ===
        const correctionPageHtml = `
            <div class="page">
                <div class="doc-title" style="font-size: 28px; margin-bottom: 5px;">Korrekciós és Elszámoló Lap</div>
                <div style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 30px;">Kelt: ${run.date} | Szállító: ${run.courier} | Kitöltendő visszavételkor!</div>

                <table>
                    <thead>
                        <tr>
                            <th>Rendelésszám</th>
                            <th>Vevő Neve</th>
                            <th class="text-right">Utánvét</th>
                            <th style="text-align: center; border-left: 2px solid #cbd5e1; width: 100px;">Nem vette át</th>
                            <th>Visszahozott tételek (Kézzel kitöltendő)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${correctionRows}
                    </tbody>
                </table>

                <div style="margin-top: 40px; width: 400px; margin-left: auto;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px;">
                        <span>Eredeti Várható Utánvét:</span>
                        <strong>${totalCOD.toLocaleString('hu-HU')} Ft</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; color: #b91c1c;">
                        <span>Meghiúsult Utánvét (Mínusz):</span>
                        <strong style="border-bottom: 1px dashed #b91c1c; width: 120px; text-align: right;">.................... Ft</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px solid #cbd5e1; font-size: 20px; font-weight: 800; color: #15803d;">
                        <span>Befizetett Készpénz:</span>
                        <strong style="border-bottom: 2px solid #15803d; width: 150px; text-align: right;">.................... Ft</strong>
                    </div>
                </div>

                <div class="signatures" style="margin-top: 80px;">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>Átvette (Raktár)</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Dátum: ...............................</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div>Befizette (Szállító: ${run.courier})</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Dátum: ...............................</div>
                    </div>
                </div>
            </div>
        `;

        // === Szállítólevelek HTML (2x kell, sorban kétszer) ===
        const deliveryNotesHtmlAll = run.orders.map((order) => {
            let totalOrderValue = 0;
            const itemsHtml = order.items.map(item => {
                const itemTotal = item.price * item.qty;
                totalOrderValue += itemTotal;

                if (item.isCollapsedProfile && item.subItems && item.subItems.length > 0) {
                    // Ha összekészített profil, akkor CSAK a tételeit listázzuk, a gyűjtőnevet nem
                    return item.subItems.map(sub => `
                        <tr>
                            <td style="padding-left: 20px;">• ${sub.name}</td>
                            <td class="text-right">${sub.qty} db</td>
                        </tr>
                    `).join('');
                }

                return `
                    <tr>
                        <td>${item.name}</td>
                        <td class="text-right">${item.qty} db</td>
                    </tr>
                `;
            }).join('');

            return `
                <div class="page">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                        <div class="doc-title" style="margin-bottom: 0;">Szállítólevél</div>
                        <div style="font-size: 28px; font-weight: 900; background: #f8fafc; padding: 10px 20px; border-radius: 8px; color: #0f172a; border: 2px solid #e2e8f0;">
                            ${order.id}
                        </div>
                    </div>
                    <div style="text-align: left; color: #64748b; font-size: 14px; margin-top: -20px; margin-bottom: 30px;">Kelt: ${run.date}</div>

                    <div class="header">
                        <div class="header-block">
                            <div class="header-title">Feladó (Eladó)</div>
                            <div class="info-text">
                                <strong>${senderData.name}</strong><br>
                                Cím: ${senderData.address}<br>
                                Bankszámla: ${senderData.bank}<br>
                                Tel: ${senderData.phone}<br>
                                E-mail: ${senderData.email}
                            </div>
                        </div>
                        <div class="header-block">
                            <div class="header-title">Címzett (Vevő)</div>
                            <div class="info-text">
                                <strong>${order.shippingName}</strong><br>
                                Cím: ${order.fullAddress}<br>
                                Tel: ${order.shippingPhone}
                            </div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Megnevezés</th>
                                <th class="text-right">Mennyiség</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="summary">
                        <div class="summary-box">
                            ${order.isCOD ? `
                            <div class="summary-row total" style="color: #b91c1c; border-top-color: #fca5a5;">
                                <span>UTÁNVÉT:</span>
                                <span style="font-size: 22px;">${order.codAmount.toLocaleString('hu-HU')} Ft</span>
                            </div>
                            ` : `
                            <div class="summary-row total" style="color: #15803d; border-top-color: #86efac;">
                                <span>FIZETENDŐ:</span>
                                <span style="font-size: 22px;">0 Ft (Fizetve)</span>
                            </div>
                            `}
                        </div>
                    </div>

                    <div style="break-inside: avoid; page-break-inside: avoid; margin-top: 40px;">
                        <div class="signatures" style="margin-top: 0;">
                            <div class="signature-box">
                                <div class="signature-line"></div>
                                <div>Átadó</div>
                            </div>
                            <div class="signature-box">
                                <div class="signature-line"></div>
                                <div>Átvette (Vevő)</div>
                            </div>
                        </div>
                        <div class="footer" style="margin-top: 20px;">
                            Ez a dokumentum a szállítást kísérő bizonylat. Nem minősül számlának.
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // === Összerakás: 2x Összesítő, 1x Korrekciós, 2x Szállítólevelek sorozat ===
        notesHtml += summaryPageHtml + summaryPageHtml + correctionPageHtml + deliveryNotesHtmlAll + deliveryNotesHtmlAll;

        notesHtml += `
            <script>
                // Opcionális: automatikus nyomtatás
                // window.onload = function() { window.print(); }
            </script>
            </body>
            </html>
        `;

        printWindow.document.write(notesHtml);
        printWindow.document.close();
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

    // --- UNIFIED PRINTER (Egyablakos Nyomtatási Rendszer) ---
    const UnifiedPrinter = {
        area: document.getElementById('print-area'),

        printBundle: async function(run) {
            this.clear();
            const pickingHtml = this.generatePickingHtml(run);
            const summaryHtml = this.generateSummaryHtml(run, true); // 2x summary
            const correctionHtml = this.generateCorrectionHtml(run);
            const deliveryHtml = this.generateDeliveryNotesHtml(run, true); // 2x delivery

            this.area.innerHTML = pickingHtml + summaryHtml + correctionHtml + deliveryHtml;
            this.execute();
        },

        printSingle: async function(run, type) {
            this.clear();
            let html = '';
            if (type === 'picking') html = this.generatePickingHtml(run);
            if (type === 'summary') html = this.generateSummaryHtml(run, false) + this.generateCorrectionHtml(run);
            if (type === 'delivery') html = this.generateDeliveryNotesHtml(run, true);

            this.area.innerHTML = html;
            this.execute();
        },

        printCustom: async function(run, types) {
            this.clear();
            let html = '';
            if (types.picking) html += this.generatePickingHtml(run);
            if (types.summary) html += this.generateSummaryHtml(run, true) + this.generateCorrectionHtml(run);
            if (types.delivery) html += this.generateDeliveryNotesHtml(run, true);
            if (!html) return;
            this.area.innerHTML = html;
            this.execute();
        },

        clear: function() {
            this.area.innerHTML = '';
        },

        execute: function() {
            // Rövid várakozás a renderelésre
            setTimeout(() => {
                window.print();
                this.clear();
            }, 500);
        },

        generatePickingHtml: function(run) {
            const cardsHtml = run.orders.map((order, index) => {
                let codHtml = '';
                if (order.isBankDeposit) {
                    codHtml = `<span class="badge ${order.isPaid ? 'badge-paid' : 'badge-warning'}">${order.isPaid ? 'UTALVA' : 'UTALÁST VÁRUNK'}</span>`;
                } else if (order.isCOD) {
                    codHtml = `<span class="badge badge-cod">UTÁNVÉT: ${order.codAmount.toLocaleString('hu-HU')} Ft</span>`;
                } else {
                    codHtml = `<span class="badge badge-paid">Fizetve</span>`;
                }

                const itemsHtml = order.items.map(item => {
                    const isCollapsed = item.isCollapsedProfile || item.name === "Összekészített profilok";
                    const subItemsHtml = (isCollapsed && item.subItems?.length > 0)
                        ? `<div style="font-size: 9px; color: #475569; margin-top: 3px; padding-left: 6px; line-height: 1.6;">${item.subItems.map(sub => `<div>• ${sub.qty} db &nbsp;${sub.name}</div>`).join('')}</div>`
                        : '';
                    return `
                    <tr>
                        <td class="col-check"><div class="col-flex-center"><div class="checkbox-box"></div></div></td>
                        <td class="col-marker">${needsMarkerLabel(item.name) ? '<div class="col-flex-center"><span class="marker-lbl">címke</span><div class="checkbox-box marker"></div></div>' : ''}</td>
                        <td class="col-qty">${isCollapsed ? '' : `<strong>${item.qty} db</strong>`}</td>
                        <td class="col-name">${item.name}${subItemsHtml}</td>
                    </tr>`;
                }).join('');

                return `
                    <div class="order-card ${order.errors?.length > 0 ? 'has-error' : ''}">
                        <div class="order-header">
                            <div class="header-left">
                                <div class="order-index">${index + 1}</div>
                                <div>
                                    <div class="order-id">${order.id}</div>
                                    <div class="order-customer">${order.shippingName}</div>
                                    <div class="order-address">${order.address}</div>
                                </div>
                            </div>
                            <div class="order-meta">${codHtml}</div>
                        </div>
                        <table class="items-table"><tbody>${itemsHtml}</tbody></table>
                    </div>
                `;
            }).join('');

            return `
                <div class="print-page" style="padding: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #000; padding-bottom: 12px; margin-bottom: 25px;">
                        <div>
                            <h1 style="margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">Kiszedési Jegyzék</h1>
                            <div style="font-size: 18px; color: #000; font-weight: 800; margin-top: 5px;">Kiszállítás napja: ${run.date}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px;">Szállító Partner & Szállító</div>
                            <div style="background: #000; color: #fff; padding: 6px 15px; border-radius: 8px; font-size: 20px; font-weight: 900; display: inline-block;">
                                ${run.company} <span style="color: #64748b; font-weight: 400; margin: 0 8px;">|</span> ${run.courier}
                            </div>
                        </div>
                    </div>
                    <div class="order-list">${cardsHtml}</div>
                </div>
            `;
        },

        generateSummaryHtml: function(run, double) {
            let aggregatedItems = {};
            let totalCOD = 0;
            run.orders.forEach(order => {
                if (order.isCOD) totalCOD += order.codAmount;
                order.items.forEach(item => {
                    const name = item.name;
                    aggregatedItems[name] = (aggregatedItems[name] || 0) + item.qty;
                });
            });

            const itemsHtml = Object.keys(aggregatedItems).sort().map(name => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${name}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${aggregatedItems[name]} db</td>
                </tr>
            `).join('');

            const page = `
                <div class="print-page" style="padding: 40px;">
                    <div style="text-align: center; font-size: 28px; font-weight: 800; margin-bottom: 10px;">ÖSSZESÍTŐ (Átadás-Átvétel)</div>
                    <div style="text-align: center; margin-bottom: 20px;">${run.date} | ${run.courier}</div>
                    <div style="background: #000; color: #fff; text-align: center; padding: 15px; font-size: 24px; font-weight: 800; border-radius: 8px; margin-bottom: 30px;">${run.company}</div>
                    
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 30px; text-align: center;">
                        <div style="font-size: 14px; color: #64748b; margin-bottom: 5px;">ÖSSZES UTÁNVÉT A KÖRBEN:</div>
                        <div style="font-size: 32px; font-weight: 800; color: #b91c1c;">${totalCOD.toLocaleString('hu-HU')} Ft</div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse;">
                        <thead><tr style="background: #f1f5f9;"><th style="text-align: left; padding: 10px;">Megnevezés</th><th style="text-align: right; padding: 10px;">Mennyiség</th></tr></thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>

                    <div style="margin-top: 100px; display: flex; justify-content: space-between;">
                        <div style="width: 250px; text-align: center; border-top: 1px solid #000; padding-top: 10px;">Átadó (Raktár)</div>
                        <div style="width: 250px; text-align: center; border-top: 1px solid #000; padding-top: 10px;">Átvette (Szállító)</div>
                    </div>
                </div>
            `;
            return double ? page + page : page;
        },

        generateCorrectionHtml: function(run) {
            const rows = run.orders.map(o => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${o.id}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${o.shippingName}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${o.isCOD ? o.codAmount.toLocaleString('hu-HU') + ' Ft' : 'Fizetve'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;"><div style="width: 18px; height: 18px; border: 1px solid #000; margin: auto;"></div></td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"></td>
                </tr>
            `).join('');

            return `
                <div class="print-page" style="padding: 40px;">
                    <div style="text-align: center; font-size: 26px; font-weight: 800; margin-bottom: 10px;">KORREKCIÓS ÉS ELSZÁMOLÓ LAP</div>
                    <div style="text-align: center; margin-bottom: 30px;">${run.date} | ${run.courier} | ${run.company}</div>
                    
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead><tr style="background: #f1f5f9;"><th style="text-align: left; padding: 8px;">ID</th><th style="text-align: left; padding: 8px;">Vevő</th><th style="text-align: right; padding: 8px;">Utánvét</th><th style="text-align: center; padding: 8px;">Sikertelen</th><th style="text-align: left; padding: 8px;">Megjegyzés</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>

                    <div style="margin-top: 50px; width: 350px; margin-left: auto;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;"><span>Várható utánvét:</span><strong>${(run.orders.reduce((sum, o) => sum + (o.isCOD ? o.codAmount : 0), 0)).toLocaleString('hu-HU')} Ft</strong></div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;"><span>Meghiúsult:</span><span>.................... Ft</span></div>
                        <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 800; border-top: 2px solid #000; padding-top: 10px;"><span>Befizetve:</span><span>.................... Ft</span></div>
                    </div>
                </div>
            `;
        },

        generateDeliveryNotesHtml: function(run, double, filterOrderIds = null) {
            const senderData = run.sender === 'ev' 
                ? {
                    name: "Egyéni Vállalkozó (Példa)",
                    address: "1234 Példaváros, Minta utca 1.",
                    bank: "00000000-00000000",
                    phone: "+36 30 000 0000",
                    email: "pelda@email.com"
                }
                : {
                    name: "Capsula Houses Kft.",
                    address: "Széles utca 70., 2040, Budaörs, Magyarország",
                    bank: "11735005-26088969",
                    phone: "+36 70 590 8157",
                    email: "info@panelburkolat.com"
                };

            const generateSingleNote = (order) => `
                <div class="print-page" style="padding: 60px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
                        <div style="font-size: 24px; font-weight: 800;">SZÁLLÍTÓLEVÉL</div>
                        <div style="font-size: 28px; font-weight: 900; border: 3px solid #000; padding: 10px 20px;">${order.id}</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                        <div style="width: 45%;"><strong>Eladó:</strong><br>${senderData.name}<br>${senderData.address}<br>${senderData.bank}</div>
                        <div style="width: 45%;"><strong>Vevő:</strong><br>${order.shippingName}<br>${order.fullAddress || order.address}<br>${order.shippingPhone || ''}</div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                        <thead><tr style="border-bottom: 2px solid #000;"><th style="text-align: left; padding: 10px;">Tétel</th><th style="text-align: right; padding: 10px;">Mennyiség</th></tr></thead>
                        <tbody>${order.items.map(it => `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;">${it.name}</td><td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${it.qty} db</td></tr>`).join('')}</tbody>
                    </table>
                    <div style="background: #f8fafc; padding: 20px; text-align: right; font-size: 18px; font-weight: 800;">
                        Fizetendő (Utánvét): ${order.isCOD ? order.codAmount.toLocaleString('hu-HU') + ' Ft' : '0 Ft (FIZETVE)'}
                    </div>
                    <div style="margin-top: 100px; display: flex; justify-content: space-between;">
                        <div style="width: 200px; border-top: 1px solid #000; text-align: center; padding-top: 10px;">Átadó</div>
                        <div style="width: 200px; border-top: 1px solid #000; text-align: center; padding-top: 10px;">Átvevő</div>
                    </div>
                </div>
            `;

            let ordersToPrint = run.orders || [];
            if (filterOrderIds) {
                ordersToPrint = ordersToPrint.filter(o => filterOrderIds.includes(o.id));
            }

            const firstSet = ordersToPrint.map(o => generateSingleNote(o)).join('');
            return double ? firstSet + firstSet : firstSet;
        },

        generateQuickDeliveryNoteHtml: function(data) {
            const senderData = data.sender === 'ev'
                ? {
                    name: "Egyéni Vállalkozó (Példa)",
                    address: "1234 Példaváros, Minta utca 1.",
                    bank: "00000000-00000000",
                    phone: "+36 30 000 0000",
                    email: "pelda@email.com"
                }
                : {
                    name: "Capsula Houses Kft.",
                    address: "Széles utca 70., 2040, Budaörs, Magyarország",
                    bank: "11735005-26088969",
                    phone: "+36 70 590 8157",
                    email: "info@panelburkolat.com"
                };

            const itemRows = data.items.length > 0
                ? data.items.map(it => `<tr><td style="padding:10px;border-bottom:1px solid #eee;">${it.name}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${it.qty} db</td></tr>`).join('')
                : `<tr><td colspan="2" style="padding:10px;color:#94a3b8;font-style:italic;">—</td></tr>`;

            const recipientBlock = [
                data.recipient,
                data.recipientCompany,
                data.address,
                data.phone
            ].filter(Boolean).join('<br>') || '<span style="color:#94a3b8;font-style:italic;">—</span>';

            const carrierBlock = [
                data.company,
                data.companyDetails
            ].filter(Boolean).join('<br>') || '<span style="color:#94a3b8;font-style:italic;">—</span>';

            const page = `
                <div class="print-page" style="padding:60px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;">
                        <div style="font-size:24px;font-weight:800;">SZÁLLÍTÓLEVÉL</div>
                        <div style="font-size:13px;color:#64748b;text-align:right;">Kelt: ${new Date().toLocaleDateString('hu-HU')}</div>
                    </div>

                    <div style="display:flex;justify-content:space-between;margin-bottom:30px;gap:20px;">
                        <div style="flex:1;padding:16px;border:1px solid #e2e8f0;border-radius:10px;">
                            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Feladó</div>
                            <strong>${senderData.name}</strong><br>
                            ${senderData.address}<br>
                            <span style="color:#64748b;font-size:13px;">${senderData.phone} · ${senderData.email}</span>
                        </div>
                        <div style="flex:1;padding:16px;border:1px solid #e2e8f0;border-radius:10px;">
                            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Szállító Cég</div>
                            ${carrierBlock}
                            <div style="margin-top:20px;font-size:12px;color:#94a3b8;">Rendszám: ……………………</div>
                        </div>
                    </div>

                    <div style="padding:16px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:30px;">
                        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Átvevő</div>
                        ${recipientBlock}
                    </div>

                    <table style="width:100%;border-collapse:collapse;margin-bottom:30px;">
                        <thead><tr style="border-bottom:2px solid #000;"><th style="text-align:left;padding:10px;">Tétel</th><th style="text-align:right;padding:10px;">Mennyiség</th></tr></thead>
                        <tbody>${itemRows}</tbody>
                    </table>

                    <div style="display:flex;justify-content:space-between;margin-top:80px;">
                        <div style="width:220px;text-align:center;border-top:1px solid #000;padding-top:10px;">Átadó (Raktár)</div>
                        <div style="width:220px;text-align:center;border-top:1px solid #000;padding-top:10px;">Átvevő (Szállító)</div>
                    </div>
                </div>
            `;

            return page + page;
        }
    };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
