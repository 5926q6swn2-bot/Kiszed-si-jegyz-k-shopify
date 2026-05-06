import { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, orderBy } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- FIREBASE AUTHENTICATION ---
    const loginOverlay = document.getElementById('login-overlay');
    const mainApp = document.getElementById('main-app');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const btnLogout = document.getElementById('btn-logout');
    const userEmailDisplay = document.getElementById('user-email-display');

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

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        loginError.style.display = 'none';
        const btnLogin = document.getElementById('btn-login');
        btnLogin.disabled = true;
        btnLogin.textContent = 'Belépés...';
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            loginError.style.display = 'block';
            loginError.textContent = 'Hibás e-mail cím vagy jelszó!';
        } finally {
            btnLogin.disabled = false;
            btnLogin.textContent = 'Belépés';
        }
    });

    btnLogout.addEventListener('click', () => {
        signOut(auth);
    });


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
    const globalDragOverlay = document.getElementById('global-drag-overlay');
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
    
    // History & Print Form Elemek
    const btnConfirmPrint = document.getElementById('btn-confirm-print');
    const psPickupDateInput = document.getElementById('ps-pickup-date');
    const psDateInput = document.getElementById('ps-date');
    const psCourierInput = document.getElementById('ps-courier');
    const psCompanyInput = document.getElementById('ps-company');
    const psSenderInput = document.getElementById('ps-sender');
    const psPrintDeliveryNotesInput = document.getElementById('ps-print-delivery-notes');
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
    const tabContentHistory = document.getElementById('tab-content-history');
    const tabContentAccounting = document.getElementById('tab-content-accounting');
    const tabContentTrash = document.getElementById('tab-content-trash');
    const accountingRunsContainer = document.getElementById('accounting-runs-container');
    const trashRunsContainer = document.getElementById('trash-runs-container');

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
                pickupDate: pickupDate || date,
                courier: courier,
                company: company,
                sender: sender || 'capsula',
                timestamp: Date.now(),
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
                let runMatched = run.courier.toLowerCase().includes(q) || (run.company && run.company.toLowerCase().includes(q));
                if (runMatched) {
                    matches.push({
                        isRunMatch: true,
                        runId: run.id,
                        runDate: run.date,
                        runCourier: run.courier,
                        runCompany: run.company || '-',
                        orderCount: run.orders.length
                    });
                } else {
                    run.orders.forEach(order => {
                        if(order.id.toLowerCase().includes(q) || order.shippingName.toLowerCase().includes(q)) {
                            matches.push({
                                isRunMatch: false,
                                runId: run.id,
                                runDate: run.date,
                                runCourier: run.courier,
                                orderId: order.id,
                                orderName: order.shippingName
                            });
                        }
                    });
                }
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
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            try {
                const q = query(collection(db, this.TRASH_COLLECTION_NAME), where('deletedAt', '<', thirtyDaysAgo));
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
                        timestamp: Date.now()
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
                let isCOD = false;
                let codAmount = 0;

                let noteCodAmount = null;
                const matchBefore = notes.match(/(\d[\d\s\.]*?)\s*(?:ft|huf)?\s*(?:ut[aá]nv[eé]t|\buv)/i);
                const matchAfter = notes.match(/(?:ut[aá]nv[eé]t|\buv).*?(\d[\d\s\.]*)/i);

                if (matchBefore) {
                    noteCodAmount = parseInt(matchBefore[1].replace(/[\s\.]/g, ''));
                } else if (matchAfter) {
                    noteCodAmount = parseInt(matchAfter[1].replace(/[\s\.]/g, ''));
                }

                if (!isBankDeposit) {
                    if (outstandingBalance > 0) {
                        isCOD = true;
                        codAmount = outstandingBalance;
                        
                        // LAPPANGÓ UTÁNVÉT FIGYELMEZTETÉS
                        if (!/ut[aá]nv[eé]t|\buv/i.test(notes)) {
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

            card.innerHTML = `
                <div class="order-header">
                    <div class="header-left">
                        <div class="order-index">${index + 1}</div>
                        <div>
                            <div class="order-id" data-field="id">${order.id}</div>
                            <div class="order-customer" data-field="shippingName">${order.shippingName}</div>
                            <div class="order-address" data-field="address">${order.address}</div>
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
        sortableInstance = new Sortable(orderList, {
            animation: 350,
            easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", 
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: function(evt) {
                const movedItem = orders.splice(evt.oldIndex, 1)[0];
                orders.splice(evt.newIndex, 0, movedItem);
                updateIndexes();
            }
        });
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
        printSettingsModal.classList.add('active');
        psCompanyInput.focus();
    });

    btnConfirmPrint.addEventListener('click', async () => {
        const date = psDateInput.value;
        const pickupDate = psPickupDateInput.value;
        const courier = psCourierInput.value.trim();
        const company = psCompanyInput.value.trim();
        const sender = psSenderInput.value;
        const shouldPrintDeliveryNotes = psPrintDeliveryNotesInput.checked;
        
        if(!date || !pickupDate || !courier || !company) {
            await CustomDialog.alert('Kérlek adj meg minden adatot (dátumok, cég neve, futár neve)!', 'Hiányos adatok', 'warning');
            return;
        }

        const cleanOrders = JSON.parse(JSON.stringify(orders)); // Deep copy
        
        printSettingsModal.classList.remove('active');
        
        if (currentLoadedRunId) {
            const choice = await CustomDialog.choice('Ezt a kört az előzményekből töltötted be.<br>Szeretnéd felülírni a korábbit, vagy teljesen új körként mentsük el?', 'Felülírás', 'Mentés Újként', 'Előzmények frissítése', 'info');
            
            if (choice === 1) { // Felülírás
                await HistoryManager.updateRun(currentLoadedRunId, date, pickupDate, courier, company, sender, cleanOrders);
            } else { // Mentés Újként
                const newRun = await HistoryManager.saveRun(date, pickupDate, courier, company, sender, cleanOrders);
                currentLoadedRunId = newRun ? newRun.id : currentLoadedRunId;
            }
        } else {
            const newRun = await HistoryManager.saveRun(date, pickupDate, courier, company, sender, cleanOrders);
            currentLoadedRunId = newRun ? newRun.id : currentLoadedRunId; // Nyomtatás után a jelenlegit tekintjük aktívnak, hátha újra nyomtatná
        }
        
        // Rövid várakozás, hogy a modal eltűnjön mielőtt kinyomtatjuk
        setTimeout(() => {
            // Update print footer in DOM before printing main screen
            const pfCompany = document.getElementById('print-footer-company');
            const pfCourier = document.getElementById('print-footer-courier');
            const pfPickup = document.getElementById('print-footer-pickup');
            const pfDelivery = document.getElementById('print-footer-delivery');
            if(pfCompany) pfCompany.textContent = company || '-';
            if(pfCourier) pfCourier.textContent = courier;
            if(pfPickup) pfPickup.textContent = pickupDate || date;
            if(pfDelivery) pfDelivery.textContent = date;

            window.print();
            
            // Ha kért szállítólevelet is, nyissuk meg a másik fület egy kis késleltetéssel
            if (shouldPrintDeliveryNotes && currentLoadedRunId) {
                setTimeout(() => {
                    generateDeliveryNotesHtml(currentLoadedRunId);
                }, 1000);
            }
        }, 150);
    });

    // --- Előzmények (History) ---
    btnHistory.addEventListener('click', () => {
        historyDateStart.value = '';
        historyDateEnd.value = '';
        historySearchInput.value = '';
        switchHistoryTab('history');
        historyModal.classList.add('active');
        historySearchInput.focus();
    });

    tabBtnHistory.addEventListener('click', () => switchHistoryTab('history'));
    tabBtnAccounting.addEventListener('click', () => switchHistoryTab('accounting'));
    tabBtnTrash.addEventListener('click', () => switchHistoryTab('trash'));

    async function switchHistoryTab(tab) {
        // Reset all tabs
        [tabBtnHistory, tabBtnAccounting, tabBtnTrash].forEach(btn => {
            btn.classList.remove('active');
            btn.style.borderBottomColor = 'transparent';
            btn.style.color = '#64748b';
            btn.style.fontWeight = '500';
        });
        [tabContentHistory, tabContentAccounting, tabContentTrash].forEach(content => {
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
        }
    }

    historySearchInput.addEventListener('input', handleHistorySearch);

    const onDateChange = () => {
        if (tabContentHistory.style.display !== 'none') {
            handleHistorySearch();
        } else if (tabContentAccounting.style.display !== 'none') {
            renderAccountingRuns();
        } else {
            renderTrashRuns();
        }
    };
    historyDateStart.addEventListener('change', onDateChange);
    historyDateEnd.addEventListener('change', onDateChange);

    function isDateInRange(runDateStr) {
        const startD = historyDateStart.value;
        const endD = historyDateEnd.value;
        if (!startD && !endD) return true;
        
        const runD = new Date(runDateStr);
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
        return true;
    }

    async function handleHistorySearch() {
        const q = historySearchInput.value.trim().toLowerCase();
        const hasDateFilter = historyDateStart.value || historyDateEnd.value;
        
        if(q.length >= 2 || hasDateFilter) {
            let matches = [];
            if (q.length >= 2) {
                matches = await HistoryManager.searchOrders(q);
                if (hasDateFilter) {
                    matches = matches.filter(m => isDateInRange(m.runDate));
                }
            } else if (hasDateFilter) {
                const allRuns = await HistoryManager.getAllRuns();
                const filteredRuns = allRuns.filter(r => isDateInRange(r.date));
                matches = [];
                filteredRuns.forEach(r => {
                    r.orders.forEach(o => {
                        matches.push({
                            runId: r.id,
                            runDate: r.date,
                            runCourier: r.courier,
                            runCompany: r.company,
                            orderId: o.id,
                            orderName: o.shippingName,
                            orderAddress: o.fullAddress
                        });
                    });
                });
            }
            
            if (q.length >= 2 || (hasDateFilter && matches.length > 0)) {
                renderSearchResults(matches);
                historySearchResults.style.display = 'block';
                historyRunsView.style.display = 'none';
            } else {
                await renderHistoryRuns(true);
                historySearchResults.style.display = 'none';
                historyRunsView.style.display = 'block';
            }
        } else {
            historySearchResults.style.display = 'none';
            historyRunsView.style.display = 'block';
            await renderHistoryRuns();
        }
    }

    async function renderHistoryRuns(applyDateFilter = false) {
        let runs = await HistoryManager.getAllRuns();
        if (applyDateFilter) {
            runs = runs.filter(r => isDateInRange(r.date));
        }
        historyRunsContainer.innerHTML = '';
        
        if(runs.length === 0) {
            historyRunsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Még nincsenek elmentett szállítási körök.</p>';
            return;
        }
        
        runs.forEach(run => {
            const el = document.createElement('div');
            el.className = 'history-run-card';
            
            const dateStr = new Date(run.timestamp).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            el.innerHTML = `
                <div class="history-run-info">
                    <div class="history-run-title">${run.date} - ${run.company || '-'} (${run.courier})</div>
                    <div class="history-run-meta">Létrehozva: ${dateStr} • ${run.orders.length} rendelés</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary btn-sm btn-load-run" data-id="${run.id}">Visszatöltés</button>
                    <button class="btn btn-secondary btn-sm btn-view-pdf" data-id="${run.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        PDF
                    </button>
                    <button class="btn btn-secondary btn-sm btn-view-delivery-note" data-id="${run.id}" title="Szállítólevelek">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Szállító
                    </button>
                    <button class="btn btn-secondary btn-sm btn-delete-run" data-id="${run.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            historyRunsContainer.appendChild(el);
        });

        attachHistoryEvents();
    }

    async function renderAccountingRuns() {
        let runs = await HistoryManager.getAllRuns();
        const hasDateFilter = historyDateStart.value || historyDateEnd.value;
        if (hasDateFilter) {
            runs = runs.filter(r => isDateInRange(r.date));
        }

        accountingRunsContainer.innerHTML = '';
        
        if(runs.length === 0) {
            accountingRunsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Nincsenek a feltételnek megfelelő szállítási körök.</p>';
            return;
        }

        runs.forEach(run => {
            const el = document.createElement('div');
            el.style.border = '1px solid #e2e8f0';
            el.style.borderRadius = '8px';
            el.style.padding = '15px';
            el.style.background = '#f8fafc';
            el.style.display = 'flex';
            el.style.justifyContent = 'space-between';
            el.style.alignItems = 'center';
            el.style.position = 'relative';
            el.style.paddingTop = '32px';
            
            let totalCOD = 0;
            run.orders.forEach(o => {
                if(o.isCOD) totalCOD += o.codAmount;
            });

            el.innerHTML = `
                <div style="position: absolute; top: 0; right: 0; background: #0f172a; color: white; padding: 5px 16px; border-radius: 0 8px 0 12px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; white-space: nowrap;">
                    ${run.company || '-'}
                </div>
                <div>
                    <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Kiszállítás: ${run.date}</div>
                    <div style="font-size: 12px; color: #64748b;">
                        Szállító: <strong>${run.courier}</strong> | 
                        Rendelések: <strong>${run.orders.length} db</strong>
                    </div>
                    <div style="font-size: 13px; color: #b91c1c; font-weight: 600; margin-top: 5px;">Várható Utánvét: ${totalCOD.toLocaleString('hu-HU')} Ft</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-secondary btn-print-summary" data-id="${run.id}" style="padding: 6px 12px; font-size: 12px; display: flex; align-items: center; gap: 5px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Összesítő és Korrekció
                    </button>
                </div>
            `;
            accountingRunsContainer.appendChild(el);
        });

        accountingRunsContainer.querySelectorAll('.btn-print-summary').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const runId = e.target.closest('button').getAttribute('data-id');
                if (runId) {
                    generateDeliveryNotesHtml(runId);
                }
            });
        });
    }

    async function renderTrashRuns() {
        const runs = await HistoryManager.getTrashRuns();
        trashRunsContainer.innerHTML = '';
        
        if(runs.length === 0) {
            trashRunsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; margin-top: 20px;">A szemetes üres.</p>';
            return;
        }

        runs.forEach(run => {
            const el = document.createElement('div');
            el.className = 'history-run-card';
            el.style.borderLeft = '4px solid #94a3b8';
            
            const deletedDate = new Date(run.deletedAt).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const origDate = run.date;
            
            el.innerHTML = `
                <div class="history-run-info">
                    <div class="history-run-title" style="color: #64748b;">${origDate} - ${run.company || '-'}</div>
                    <div class="history-run-meta">Törölve: ${deletedDate} • ${run.orders.length} rendelés</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary btn-sm btn-restore-run" data-id="${run.docId}" style="background: #15803d;">Visszaállítás</button>
                    <button class="btn btn-secondary btn-sm btn-permanent-delete-run" data-id="${run.docId}" title="Végleges törlés" style="color: #b91c1c;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
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
            hsResultsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Nincs találat.</p>';
            return;
        }
        
        matches.forEach(m => {
            const el = document.createElement('div');
            el.className = 'history-search-match';
            el.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        Rendelés: <strong>${m.orderId}</strong> (${m.orderName})
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Szállítás: ${m.runDate} • Futár: ${m.runCourier}</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary btn-sm btn-load-run" data-id="${m.runId}">Kör betöltése</button>
                        <button class="btn btn-secondary btn-sm btn-view-pdf" data-id="${m.runId}">PDF</button>
                        <button class="btn btn-secondary btn-sm btn-view-delivery-note" data-id="${m.runId}">Szállító</button>
                    </div>
                </div>
            `;
            hsResultsContainer.appendChild(el);
        });

        attachHistoryEvents();
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
                // Update internal IDs to avoid conflicts if they somehow get merged later
                orders.forEach(o => o.internalId = Math.random().toString(36).substr(2, 9));
                
                renderOrders();
                historyModal.classList.remove('active');
                CustomDialog.alert(`Kör betöltve: ${run.date} - ${run.courier} (${orders.length} rendelés)`, 'Sikeres betöltés', 'info');
            });
        });

        document.querySelectorAll('.btn-view-pdf').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const runId = e.target.closest('button').getAttribute('data-id');
                const run = await HistoryManager.getRunById(runId);
                if(!run) return;
                openPdfView(run);
            });
        });

        document.querySelectorAll('.btn-view-delivery-note').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const runId = e.target.closest('button').getAttribute('data-id');
                if (runId) {
                    generateDeliveryNotesHtml(runId);
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
            styles = `<link rel="stylesheet" href="css/style.css">`;
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
                    body { background: white !important; padding: 20px !important; color: black; }
                    .app-container { max-width: 1200px; margin: 0 auto; box-shadow: none; background: transparent; padding: 0; position: relative; min-height: 100vh; }
                    .order-card { break-inside: avoid; margin-bottom: 20px; box-shadow: none; border: 1px solid #e2e8f0; }
                    .no-print { display: none !important; }
                    .marker-lbl { position: absolute; top: -16px; left: 50%; transform: translateX(-50%); font-size: 9px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1; }
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

    btnSaveManual.addEventListener('click', async () => {
        const orderNum = document.getElementById('m-order-num').value.trim();
        const customer = document.getElementById('m-customer').value.trim();
        const address = document.getElementById('m-address').value.trim();
        const phone = document.getElementById('m-phone').value.trim();
        const balance = parseFloat(document.getElementById('m-balance').value) || 0;
        
        if (!orderNum || !customer || !address) {
            await CustomDialog.alert('Kérlek töltsd ki az alap adatokat (Rendelésszám, Név, Cím)!', 'Hiányos adatok', 'warning');
            return;
        }

        if (editingOrderInternalId === null && orders.some(o => o.id === orderNum)) {
            await CustomDialog.alert('Ez a rendelésszám már szerepel a listában!', 'Hiba', 'error');
            return;
        }

        if (editingOrderInternalId !== null) {
            if (orders.some(o => o.id === orderNum && o.internalId !== editingOrderInternalId)) {
                await CustomDialog.alert('Ez a rendelésszám már szerepel a listában!', 'Hiba', 'error');
                return;
            }
        }

        const itemRows = document.querySelectorAll('.m-item-row');
        let newItems = [];

        itemRows.forEach(row => {
            const qty = parseInt(row.querySelector('.m-item-qty').value) || 0;
            const name = row.querySelector('.m-item-name').value.trim();
            if (qty > 0 && name) {
                newItems.push({ name, qty });
            }
        });

        if (newItems.length === 0) {
            await CustomDialog.alert('Legalább egy érvényes tételt adj meg!', 'Nincs tétel', 'warning');
            return;
        }

        newItems.sort((a, b) => {
            const typeA = getItemTypeWeight(a.name);
            const typeB = getItemTypeWeight(b.name);
            return typeA - typeB;
        });

        if (editingOrderInternalId !== null) {
            const order = orders.find(o => o.internalId === editingOrderInternalId);
            if (order) {
                order.id = orderNum;
                order.shippingName = customer;
                order.address = address;
                if (!order.fullAddress) order.fullAddress = address; // Keep original full address if it exists, otherwise use new
                order.shippingPhone = phone;
                order.billingPhone = phone;
                order.isCOD = balance > 0;
                order.codAmount = balance;
                order.items = newItems;
            }
        } else {
            orders.push({
                id: orderNum,
                internalId: Math.random().toString(36).substr(2, 9),
                shippingName: customer,
                billingName: '',
                address: address,
                fullAddress: address,
                shippingPhone: phone,
                billingPhone: phone,
                tags: 'számla ki', 
                isBankDeposit: false,
                isPaid: false,
                isCOD: balance > 0,
                codAmount: balance,
                errors: [],
                items: newItems
            });
        }

        renderOrders();
        manualModal.classList.remove('active');
    });
});
