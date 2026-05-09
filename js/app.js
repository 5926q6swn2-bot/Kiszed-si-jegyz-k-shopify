import { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, addDoc, getDocs, getDoc, setDoc, deleteDoc, updateDoc, doc, query, orderBy, where, limit, deleteField, writeBatch, arrayUnion, arrayRemove, increment } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
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
    const tabBtnAccounting = document.getElementById('tab-btn-accounting');
    const tabBtnTrash = document.getElementById('tab-btn-trash');
    const tabBtnStats = document.getElementById('tab-btn-stats');
    const tabContentHistory = document.getElementById('tab-content-history');
    const tabContentAccounting = document.getElementById('tab-content-accounting');
    const tabContentTrash = document.getElementById('tab-content-trash');
    const tabContentStats = document.getElementById('tab-content-stats');
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
    let orders = [];
    let sortableInstance = null;
    let currentLoadedRunId = null;
    let editingOrderInternalId = null;

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

        updateSettlementStatus: async function(docId, isSettled) {
            try {
                const docRef = doc(db, this.COLLECTION_NAME, docId);
                await updateDoc(docRef, {
                    isSettled: isSettled,
                    settledAt: isSettled ? Date.now() : null
                });
                return true;
            } catch (e) {
                console.error("Hiba az elszámolás állapot frissítésénél: ", e);
                return false;
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


    // --- Reset ---
    btnReset.addEventListener('click', async () => {
        if(orders.length === 0) return;
        const isConfirmed = await CustomDialog.confirm('Biztosan törlöd az összes eddigi rendelést a listából?', 'Lista Törlése', 'warning', true);
        if(isConfirmed) {
            orders = [];
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
                                errors.push({
                                    id: Math.random().toString(36).substr(2, 9),
                                    title: "Utánvét Eltérés",
                                    desc: `Utánvét a shopifyban: ${outstandingBalance} Ft, a Notes-ban ${noteCodAmount} Ft kérlek ellenőrizd!`
                                });
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
                    errors: errors,
                    items: []
                });
            }

            if (itemQty > 0 && itemName) {
                // Check if item already exists in this order (to merge quantities)
                const order = orderMap.get(orderNum);
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
        return /profil/i.test(name);
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

        if (sortableInstance) {
            sortableInstance.destroy();
        }
        const scrollContainer = document.querySelector('.content-body');
        sortableInstance = new Sortable(orderList, {
            animation: 80,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            handle: '.drag-handle',
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
            await CustomDialog.alert('Kérlek adj meg minden adatot (dátumok, cég neve, futár neve)!', 'Hiányos adatok', 'warning');
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
                await HistoryManager.updateRun(currentLoadedRunId, date, pickupDate, courier, company, sender, cleanOrders);
            } else {
                const newRun = await HistoryManager.saveRun(date, pickupDate, courier, company, sender, cleanOrders);
                currentLoadedRunId = newRun ? newRun.id : currentLoadedRunId;
            }
        } else {
            const newRun = await HistoryManager.saveRun(date, pickupDate, courier, company, sender, cleanOrders);
            currentLoadedRunId = newRun ? newRun.id : currentLoadedRunId;
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
    tabBtnAccounting.addEventListener('click', () => switchHistoryTab('accounting'));
    tabBtnTrash.addEventListener('click', () => switchHistoryTab('trash'));
    tabBtnStats.addEventListener('click', () => switchHistoryTab('stats'));

    statsDateStart.addEventListener('change', () => renderStatistics());
    statsDateEnd.addEventListener('change', () => renderStatistics());

    async function switchHistoryTab(tab) {
        // Reset all tabs
        [tabBtnHistory, tabBtnAccounting, tabBtnTrash, tabBtnStats].forEach(btn => {
            btn.classList.remove('active');
            btn.style.borderBottomColor = 'transparent';
            btn.style.color = '#64748b';
            btn.style.fontWeight = '500';
        });
        [tabContentHistory, tabContentAccounting, tabContentTrash, tabContentStats].forEach(content => {
            content.style.display = 'none';
        });

        if (tab === 'history') {
            tabBtnHistory.classList.add('active');
            tabBtnHistory.style.borderBottomColor = 'var(--primary-color)';
            tabBtnHistory.style.color = 'var(--primary-color)';
            tabBtnHistory.style.fontWeight = '600';
            tabContentHistory.style.display = 'block';
            handleHistorySearch();
        } else if (tab === 'accounting') {
            tabBtnAccounting.classList.add('active');
            tabBtnAccounting.style.borderBottomColor = 'var(--primary-color)';
            tabBtnAccounting.style.color = 'var(--primary-color)';
            tabBtnAccounting.style.fontWeight = '600';
            tabContentAccounting.style.display = 'block';
            renderAccountingRuns();
        } else if (tab === 'trash') {
            tabBtnTrash.classList.add('active');
            tabBtnTrash.style.borderBottomColor = 'var(--primary-color)';
            tabBtnTrash.style.color = 'var(--primary-color)';
            tabBtnTrash.style.fontWeight = '600';
            tabContentTrash.style.display = 'block';
            await HistoryManager.autoCleanupTrash();
            renderTrashRuns();
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
                        matches.push({ runId: run.id, runDate: run.date, runCourier: run.courier, runCompany: run.company, ...order });
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
        
        filteredRuns.forEach(run => {
            const el = document.createElement('div');
            el.className = 'history-apple-card';
            const dateStr = new Date(run.timestamp).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const modifiedBadge = run.isModified
                ? `<span class="hac-badge" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i class="ph-bold ph-pencil-simple" style="font-size:10px;"></i>Módosítva${run.modifyCount > 1 ? ` (${run.modifyCount}×)` : ''}</span>`
                : '';
            el.innerHTML = `
                <div class="hac-header">
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
                            <div class="hac-date">${run.date}</div>
                            ${modifiedBadge}
                        </div>
                        <div class="hac-meta" style="margin-top:2px;">
                            <i class="ph-bold ph-user" style="font-size:11px;color:#374151;"></i><span style="font-weight:600;color:#374151;">${run.courier}</span>
                            <span style="color:#d1d5db;">·</span><span style="color:#94a3b8;">${run.orders.length} rendelés · ${dateStr}</span>
                        </div>
                    </div>
                    <span class="hac-company">${run.company || '-'}</span>
                </div>
                <div class="hac-footer">
                    <div class="hac-prints">
                        <button class="hac-print-btn btn-print-picking" data-id="${run.id}">
                            <i class="ph-bold ph-clipboard-text"></i>Szedőlista
                        </button>
                        <button class="hac-print-btn btn-print-delivery" data-id="${run.id}">
                            <i class="ph-bold ph-truck"></i>Szállítók
                        </button>
                        <button class="hac-print-btn btn-print-summary" data-id="${run.id}">
                            <i class="ph-bold ph-file-text"></i>Összesítő
                        </button>
                        <button class="hac-print-btn hac-print-primary btn-print-bundle" data-id="${run.id}">
                            <i class="ph-bold ph-printer"></i>Teljes csomag
                        </button>
                    </div>
                    <div class="hac-actions">
                        <button class="hac-btn-load btn-load-run" data-id="${run.id}">Betöltés</button>
                        <button class="hac-btn-del btn-delete-run" data-id="${run.id}" title="Törlés">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            historyRunsContainer.appendChild(el);
        });

        attachHistoryEvents();
    }

    async function renderAccountingRuns() {
        let runs = await HistoryManager.getAllRuns();
        const onlyPending = accountingFilterPending.checked;

        // Szűrés
        runs = runs.filter(r => isFiltered(r));
        if (onlyPending) {
            runs = runs.filter(r => !r.isSettled);
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
                el.className = 'unified-card';
                el.style.margin = '0';

                let runCOD = 0;
                run.orders.forEach(o => { if(o.isCOD) runCOD += o.codAmount; });

                const settledBadge = run.isSettled
                    ? `<span class="hac-badge hac-badge-green"><i class="ph-bold ph-check-circle" style="font-size:10px;"></i>Elszámolva</span>`
                    : '';

                el.innerHTML = `
                    <div class="hac-header" style="padding:13px 16px 11px;">
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                                <div class="hac-date" style="font-size:14px;">${run.date}</div>
                                ${settledBadge}
                            </div>
                            <div class="hac-meta" style="margin-top:2px;">
                                <span class="hac-company" style="font-size:9px;padding:3px 8px;">${run.company || '-'}</span>
                                <span style="color:#d1d5db;">·</span><i class="ph-bold ph-user" style="font-size:11px;color:#374151;"></i><span style="font-weight:600;color:#374151;">${run.courier}</span>
                                <span style="color:#d1d5db;">·</span><span style="color:#94a3b8;">${run.orders.length} rendelés</span>
                                ${runCOD > 0 ? `<span style="color:#d1d5db;">·</span><strong style="color:#b91c1c;font-weight:600;">${runCOD.toLocaleString('hu-HU')} Ft</strong>` : ''}
                            </div>
                        </div>
                        <div class="hac-actions">
                            <button class="hac-btn-action hac-btn-ghost btn-print-summary" data-id="${run.id}">
                                <i class="ph-bold ph-printer" style="font-size:12px;"></i>Nyomtatás
                            </button>
                            ${!run.isSettled ? `
                                <button class="hac-btn-action hac-btn-green btn-settle-run" data-doc-id="${run.docId}">
                                    <i class="ph-bold ph-check-circle" style="font-size:12px;"></i>Kiegyenlítve
                                </button>
                            ` : `
                                <button class="hac-btn-action hac-btn-ghost btn-unsettle-run" data-doc-id="${run.docId}">Visszaállítás</button>
                            `}
                        </div>
                    </div>
                `;
                runsContainer.appendChild(el);
            });

            accountingRunsContainer.appendChild(groupEl);
        });

        // Eseménykezelők újracsatolása
        accountingRunsContainer.querySelectorAll('.btn-print-summary').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const runId = e.target.getAttribute('data-id');
                if (runId) generateDeliveryNotesHtml(runId);
            });
        });

        accountingRunsContainer.querySelectorAll('.btn-settle-run').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const docId = e.target.getAttribute('data-doc-id');
                if (await HistoryManager.updateSettlementStatus(docId, true)) renderAccountingRuns();
            });
        });

        accountingRunsContainer.querySelectorAll('.btn-unsettle-run').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const docId = e.target.getAttribute('data-doc-id');
                if (await HistoryManager.updateSettlementStatus(docId, false)) renderAccountingRuns();
            });
        });
    }

    async function renderStatistics() {
        const runs = await HistoryManager.getAllRuns();
        statsRunsContainer.innerHTML = '';
        
        let totalOrders = 0;
        let lateOrders = [];
        
        const startD = statsDateStart.value ? new Date(statsDateStart.value) : null;
        const endD = statsDateEnd.value ? new Date(statsDateEnd.value) : null;
        if (startD) startD.setHours(0, 0, 0, 0);
        if (endD) endD.setHours(23, 59, 59, 999);

        runs.forEach(run => {
            run.orders.forEach(order => {
                if (!order.orderDate) return;
                const oDate = new Date(order.orderDate);
                
                // Időszak szűrés (Rendelés napja alapján)
                if (startD && oDate < startD) return;
                if (endD && oDate > endD) return;

                totalOrders++;

                // Késés számítás
                const deliveryDate = new Date(run.date);
                const businessDays = getBusinessDaysCount(oDate, deliveryDate);

                if (businessDays > 6 && !order.isDelayIgnored) {
                    lateOrders.push({
                        ...order,
                        runDate: run.date,
                        runId: run.id,
                        docId: run.docId,
                        delay: businessDays,
                        company: run.company
                    });
                }
            });
        });

        // Statisztikai doboz frissítése
        const lateCount = lateOrders.length;
        const latePercent = totalOrders > 0 ? Math.round((lateCount / totalOrders) * 100) : 0;
        statsSummaryBox.innerHTML = `
            <div style="font-size: 11px; color: #64748b;">Összes rend.: <strong>${totalOrders} db</strong></div>
            <div style="font-size: 18px; font-weight: 800; color: #b91c1c;">${lateCount} késés</div>
            <div style="font-size: 12px; font-weight: 600; color: #ef4444;">Arány: ${latePercent}%</div>
        `;

        if (lateOrders.length === 0) {
            statsRunsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 30px;">Nincs késedelmes rendelés az adott időszakban.</p>';
            return;
        }

        // Listázás
        lateOrders.sort((a, b) => b.delay - a.delay).forEach(item => {
            const el = document.createElement('div');
            el.className = 'history-apple-card';
            el.innerHTML = `
                <div class="hac-header" style="padding:13px 16px;">
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                            <div class="hac-date" style="font-size:14px;">${item.shippingName}</div>
                            <span class="hac-badge hac-badge-red"><i class="ph-bold ph-warning" style="font-size:10px;"></i>${item.delay} munkanap</span>
                        </div>
                        <div class="hac-meta">
                            #${item.id}
                            <span style="color:#d1d5db;">·</span>Rendelve: ${new Date(item.orderDate).toLocaleDateString('hu-HU')}
                            <span style="color:#d1d5db;">·</span>Kiszállítva: ${item.runDate}
                            <span style="color:#d1d5db;">·</span>${item.company || '-'}
                        </div>
                    </div>
                    <div class="hac-actions">
                        <button class="hac-btn-action hac-btn-ghost btn-ignore-delay" data-doc-id="${item.docId}" data-order-id="${item.id}" title="Rendben van">
                            <i class="ph-bold ph-check" style="font-size:12px;"></i>Rendben
                        </button>
                    </div>
                </div>
            `;
            statsRunsContainer.appendChild(el);
        });

        // Pipa gomb kezelése
        statsRunsContainer.querySelectorAll('.btn-ignore-delay').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const docId = e.target.getAttribute('data-doc-id');
                const orderId = e.target.getAttribute('data-order-id');
                
                const confirmed = await CustomDialog.confirm('Biztosan kiveszed ezt a rendelést a késési statisztikából?', 'Szándékos késés jelölése', 'info');
                if (confirmed) {
                    await ignoreDelayInFirestore(docId, orderId);
                    renderStatistics();
                }
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
            
            el.innerHTML = `
                <div class="s-section-info" style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <span style="font-weight: 900; color: #3b82f6; font-size: 15px;">${m.id}</span>
                        <span style="font-size: 10px; background: #0f172a; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${m.runCompany}</span>
                        <span style="font-size: 11px; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-weight: 600; display: flex; align-items: center; gap: 5px;"><i class="ph-bold ph-calendar" style="font-size: 13px;"></i> ${m.runDate}</span>
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
                        <span style="margin-right: 15px;">Futár: <strong>${run.courier}</strong></span>
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
                    const subItemsHtml = (item.isCollapsedProfile && item.subItems?.length > 0)
                        ? `<div style="font-size: 9px; color: #475569; margin-top: 3px; padding-left: 6px; line-height: 1.6;">${item.subItems.map(sub => `<div>• ${sub.qty} db &nbsp;${sub.name}</div>`).join('')}</div>`
                        : '';
                    return `
                    <tr>
                        <td class="col-check"><div class="col-flex-center"><div class="checkbox-box"></div></div></td>
                        <td class="col-marker">${needsMarkerLabel(item.name) ? '<div class="col-flex-center"><span class="marker-lbl">címke</span><div class="checkbox-box marker"></div></div>' : ''}</td>
                        <td class="col-qty">${item.isCollapsedProfile ? '' : `<strong>${item.qty} db</strong>`}</td>
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
                            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px;">Szállító Partner & Futár</div>
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
                        <div style="width: 250px; text-align: center; border-top: 1px solid #000; padding-top: 10px;">Átvette (Futár)</div>
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

        generateDeliveryNotesHtml: function(run, double) {
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
                        <div style="width: 45%;"><strong>Vevő:</strong><br>${order.shippingName}<br>${order.address}<br>${order.shippingPhone || ''}</div>
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

            const firstSet = run.orders.map(o => generateSingleNote(o)).join('');
            return double ? firstSet + firstSet : firstSet;
        }
    };
});
