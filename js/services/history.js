import { db, auth, collection, query, orderBy, getDocs, addDoc, getDoc, setDoc, deleteDoc, updateDoc, doc, where, limit, deleteField, writeBatch, arrayUnion, arrayRemove, increment } from '../firebase-config.js';
import { getPaymentDetails } from '../utils/paymentUtils.js';

let runsCache = null;
let lastRunsFetchTime = 0;
const RUNS_CACHE_TTL = 5 * 60 * 1000; // 5 perces gyorsítótár

export const HistoryManager = {
        COLLECTION_NAME: 'szedolista_history',
        TRASH_COLLECTION_NAME: 'szedolista_trash',
        
        getAllRuns: async function(forceRefresh = false) {
            const now = Date.now();

            const doSync = (list) => {
                if (Array.isArray(list) && list.length > 0 && typeof window !== 'undefined' && window.fetch && !window._historyCouriersSynced) {
                    window._historyCouriersSynced = true;
                    try {
                        const summary = list.map(r => ({
                            id: r.id || r.docId,
                            date: r.date || '',
                            company: r.company || '',
                            courier: r.courier || '',
                            ordersCount: (r.orders || []).length
                        }));
                        window.fetch('/api/debug/sync-couriers', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(summary)
                        }).catch(() => {});
                    } catch (e) {}
                }
            };

            if (!forceRefresh && runsCache && (now - lastRunsFetchTime < RUNS_CACHE_TTL)) {
                doSync(runsCache);
                return runsCache;
            }
            try {
                const q = query(collection(db, this.COLLECTION_NAME), orderBy('timestamp', 'desc'));
                const querySnapshot = await getDocs(q);
                const runs = [];
                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    if (data.isQuickDelivery) return;
                    runs.push({
                        ...data,
                        docId: docSnap.id
                    });
                });
                runsCache = runs;
                lastRunsFetchTime = now;

                // Automatikus futárnév korrekció: kisbetűs 'Bábel ádám' -> nagybetűs 'Bábel Ádám'
                const babelAdamRuns = runs.filter(r => r.courier && r.courier.trim().toLowerCase() === 'bábel ádám' && r.courier !== 'Bábel Ádám');
                if (babelAdamRuns.length > 0) {
                    try {
                        await Promise.all(babelAdamRuns.map(async (r) => {
                            if (r.docId) {
                                const docRef = doc(db, this.COLLECTION_NAME, r.docId);
                                await updateDoc(docRef, { courier: 'Bábel Ádám' });
                                console.log(`[Auto-Fix] Futárnév sikeresen frissítve Firestore-ban: ${r.docId} (${r.date}) -> Bábel Ádám`);
                            }
                            r.courier = 'Bábel Ádám';
                        }));
                    } catch (fixErr) {
                        console.error('[Auto-Fix] Hiba a Bábel Ádám futárnevek javításakor:', fixErr);
                    }
                }

                // Automatikus háttér szinkron a szerver felé a cégek és futárok feltérképezéséhez
                if (Array.isArray(runs) && runs.length > 0 && typeof window !== 'undefined' && window.fetch) {
                    try {
                        const summary = runs.map(r => ({
                            id: r.id || r.docId,
                            date: r.date || '',
                            company: r.company || '',
                            courier: r.courier || '',
                            ordersCount: (r.orders || []).length
                        }));
                        window.fetch('/api/debug/sync-couriers', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(summary)
                        }).catch(() => {});
                    } catch (e) {}
                }

                return runs;
            } catch (e) {
                console.error("Hiba a Firebase lekérdezésnél: ", e);
                if (runsCache) return runsCache;
                return [];
            }
        },

        invalidateCache: function() {
            runsCache = null;
            lastRunsFetchTime = 0;
        },
        
        saveRun: async function(date, pickupDate, courier, company, sender, ordersList) {
            let cleanCourier = (courier || '').trim();
            if (cleanCourier.toLowerCase() === 'bábel ádám') cleanCourier = 'Bábel Ádám';

            const newRun = {
                id: 'run_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                date: date,
                originalDate: date,
                pickupDate: pickupDate || date,
                courier: cleanCourier,
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
                this.invalidateCache();
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
            const idStr = runId != null ? String(runId).trim() : '';
            return runs.find(r => 
                (r.id && (r.id === runId || String(r.id).trim() === idStr)) || 
                (r.docId && (r.docId === runId || String(r.docId).trim() === idStr))
            ) || null;
        },
        
        deleteRun: async function(identifier, explicitDocId = null) {
            try {
                const runs = await this.getAllRuns();
                const idStr = identifier != null ? String(identifier).trim() : '';
                const expDocStr = explicitDocId != null ? String(explicitDocId).trim() : '';

                const runToMove = runs.find(r => 
                    (idStr && r.id && (r.id === identifier || String(r.id).trim() === idStr)) || 
                    (idStr && r.docId && (r.docId === identifier || String(r.docId).trim() === idStr)) || 
                    (expDocStr && r.docId && (r.docId === explicitDocId || String(r.docId).trim() === expDocStr))
                );

                const targetDocId = expDocStr || (runToMove ? runToMove.docId : (idStr && !idStr.startsWith('run_') ? idStr : null));
                const targetRunId = (runToMove ? runToMove.id : (idStr && idStr.startsWith('run_') ? idStr : null)) || targetDocId;

                if (!targetDocId && !runToMove) {
                    console.warn('[HistoryManager deleteRun] A torlendo kor nem talalhato:', identifier, explicitDocId);
                    return { success: false, error: 'A kör nem található.' };
                }

                // 1. Áthelyezés a szemetesbe (szanálással az undefined értékek ellen)
                if (runToMove) {
                    try {
                        const rawTrash = {
                            ...runToMove,
                            deletedAt: Date.now()
                        };
                        delete rawTrash.docId;
                        // JSON stringify/parse automatikusan kiszűri a Firestore-t elgáncsoló undefined értékeket
                        const cleanTrash = JSON.parse(JSON.stringify(rawTrash));
                        await addDoc(collection(db, this.TRASH_COLLECTION_NAME), cleanTrash);
                    } catch (trashErr) {
                        console.warn('[HistoryManager deleteRun] Nem sikerult a szemetesbe archivalni, de a torles folytatodik:', trashErr);
                    }
                }

                // 2. Törlés az eredeti helyről (szedolista_history)
                if (targetDocId) {
                    await deleteDoc(doc(db, this.COLLECTION_NAME, targetDocId));
                }

                // 3. Gyorsítótár azonnali frissítése a memóriában (optimista törlés)
                // Szigorúan megőrizzük a szűrt runsCache-t és frissítjük az időbélyeget,
                // hogy a következő lekérdezés véletlenül se hozza vissza a Firestore még indexelő szerveréről!
                const shouldFilterOut = (r) => {
                    if (!r) return false;
                    if (runToMove && r === runToMove) return true;
                    if (targetDocId && String(r.docId || '').trim() === String(targetDocId).trim()) return true;
                    if (targetRunId && String(r.id || '').trim() === String(targetRunId).trim()) return true;
                    if (idStr && (String(r.id || '').trim() === idStr || String(r.docId || '').trim() === idStr)) return true;
                    if (expDocStr && String(r.docId || '').trim() === expDocStr) return true;
                    return false;
                };

                if (runsCache && Array.isArray(runsCache)) {
                    runsCache = runsCache.filter(r => !shouldFilterOut(r));
                } else if (runs && Array.isArray(runs)) {
                    runsCache = runs.filter(r => !shouldFilterOut(r));
                }
                lastRunsFetchTime = Date.now();

                return { success: true, docId: targetDocId, runId: targetRunId };
            } catch (e) {
                console.error('[HistoryManager deleteRun hiba]:', e);
                return { success: false, error: e.message };
            }
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
                    this.invalidateCache();
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
                this.invalidateCache();
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

        updateSettlementStatus: async function(docId, settledAmount, totalCOD, uncollectedOrderIds = [], uncollectedReasons = {}, partialOrders = {}, bankTransferredOrderIds = [], uncollectedResponsibility = {}, settledKpAmount = null, settledCardAmount = null, paymentMethods = {}, isTransferSettled = null, paymentStatusMap = {}) {
            try {
                const docRef = doc(db, this.COLLECTION_NAME, docId);
                const docSnap = await getDoc(docRef);
                
                const tempRun = {
                    uncollectedOrderIds,
                    bankTransferredOrderIds,
                    partialOrders,
                    paymentMethods,
                    paymentStatusMap
                };

                let hasPendingCOD = false;
                if (docSnap.exists()) {
                    const runData = docSnap.data();
                    const ordersList = runData.orders || [];
                    hasPendingCOD = ordersList.some(o => getPaymentDetails(tempRun, o).isPending);
                } else {
                    hasPendingCOD = settledAmount < totalCOD;
                }

                const isSettled = !hasPendingCOD;

                const updateData = {
                    isSettled: isSettled,
                    settledAmount: settledAmount,
                    uncollectedOrderIds: uncollectedOrderIds,
                    uncollectedReasons: uncollectedReasons,
                    partialOrders: partialOrders,
                    bankTransferredOrderIds: bankTransferredOrderIds,
                    uncollectedResponsibility: uncollectedResponsibility,
                    paymentStatusMap: paymentStatusMap,
                    settledAt: Date.now()
                };

                if (settledKpAmount !== null) updateData.settledKpAmount = settledKpAmount;
                if (settledCardAmount !== null) updateData.settledCardAmount = settledCardAmount;
                if (paymentMethods) updateData.paymentMethods = paymentMethods;

                await updateDoc(docRef, updateData);
                this.invalidateCache();
                return true;
            } catch (e) {
                console.error("Hiba az elszámolás állapot frissítésénél: ", e);
                return false;
            }
        },

        settleTransfer: async function(docId) {
            return this.settlePaymentGroup(docId, 'card');
        },

        settlePaymentGroup: async function(docId, type) {
            try {
                const docRef = doc(db, this.COLLECTION_NAME, docId);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) return false;
                
                const runData = docSnap.data();
                const ordersList = runData.orders || [];
                const paymentStatusMap = runData.paymentStatusMap || {};
                const paymentMethods = runData.paymentMethods || {};
                const uncollectedOrderIds = runData.uncollectedOrderIds || [];
                
                ordersList.forEach(o => {
                    if (o.isCOD && !uncollectedOrderIds.includes(o.id)) {
                        const method = paymentMethods[o.id] || (runData.bankTransferredOrderIds?.includes(o.id) ? 'bank' : 'cash');
                        if (typeof method === 'object' && method !== null) {
                            if (typeof paymentStatusMap[o.id] !== 'object' || paymentStatusMap[o.id] === null) {
                                paymentStatusMap[o.id] = {};
                            }
                            if (type === 'cash' && method.cash > 0) {
                                paymentStatusMap[o.id].cash = 'received';
                            } else if (type === 'card' && method.card > 0) {
                                paymentStatusMap[o.id].card = 'received';
                            }
                        } else {
                            if (type === 'cash' && method === 'cash') {
                                paymentStatusMap[o.id] = 'received';
                            } else if (type === 'card' && method === 'card') {
                                paymentStatusMap[o.id] = 'received';
                            }
                        }
                    }
                });
                
                const tempRun = {
                    ...runData,
                    paymentStatusMap
                };

                const hasPendingCOD = ordersList.some(o => getPaymentDetails(tempRun, o).isPending);
                const isSettled = !hasPendingCOD;
                const updateData = {
                    paymentStatusMap: paymentStatusMap,
                    isSettled: isSettled
                };
                
                const allTransferSettled = !ordersList.some(o => {
                    const pd = getPaymentDetails(tempRun, o);
                    return pd.pendingCard > 0 || pd.pendingBank > 0;
                });
                updateData.isTransferSettled = allTransferSettled;
                
                await updateDoc(docRef, updateData);
                this.invalidateCache();
                return true;
            } catch (e) {
                console.error("Hiba a fizetési csoport elszámolásánál: ", e);
                return false;
            }
        },

        updateResponsibilityInFirestore: async function(docId, orderId, responsibility) {
            try {
                const docRef = doc(db, this.COLLECTION_NAME, docId);
                await updateDoc(docRef, {
                    [`uncollectedResponsibility.${orderId}`]: responsibility
                });
                this.invalidateCache();
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
                this.invalidateCache();
                return true;
            } catch (e) {
                console.error("Hiba a banki utalás rögzítésénél: ", e);
                return false;
            }
        },

        recordShopifyPaidOrders: async function(docId, orderIds) {
            if (!docId || !Array.isArray(orderIds) || orderIds.length === 0) return false;
            try {
                const docRef = doc(db, this.COLLECTION_NAME, docId);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) return false;
                const runData = docSnap.data();
                const existing = new Set((runData.shopifyPaidOrderIds || []).map(String));
                orderIds.forEach(id => existing.add(String(id)));
                await updateDoc(docRef, {
                    shopifyPaidOrderIds: Array.from(existing),
                    shopifyPaidUpdatedAt: Date.now()
                });
                this.invalidateCache();
                return true;
            } catch (e) {
                console.error("Hiba a shopifyPaidOrderIds frissítésénél: ", e);
                return false;
            }
        },

        revertToPending: async function(docId) {
            try {
                const docRef = doc(db, this.COLLECTION_NAME, docId);
                await updateDoc(docRef, {
                    isSettled: false,
                    settledAmount: deleteField(),
                    settledAt: deleteField(),
                    uncollectedOrderIds: deleteField(),
                    uncollectedReasons: deleteField(),
                    partialOrders: deleteField(),
                    bankTransferredOrderIds: deleteField(),
                    uncollectedResponsibility: deleteField(),
                    settledKpAmount: deleteField(),
                    settledCardAmount: deleteField(),
                    paymentMethods: deleteField(),
                    isTransferSettled: deleteField(),
                    transferSettledAt: deleteField(),
                    paymentStatusMap: deleteField()
                });
                this.invalidateCache();
                return true;
            } catch (e) {
                console.error("Hiba a visszaállításnál: ", e);
                return false;
            }
        },





        updateRun: async function(runId, date, pickupDate, courier, company, sender, ordersList) {
            let cleanCourier = (courier || '').trim();
            if (cleanCourier.toLowerCase() === 'bábel ádám') cleanCourier = 'Bábel Ádám';

            const runs = await this.getAllRuns();
            const runToUpdate = runs.find(r => r.id === runId);
            if (runToUpdate && runToUpdate.docId) {
                try {
                    const docRef = doc(db, this.COLLECTION_NAME, runToUpdate.docId);
                    await updateDoc(docRef, {
                        date: date,
                        pickupDate: pickupDate || date,
                        courier: cleanCourier,
                        company: company,
                        sender: sender || 'capsula',
                        orders: ordersList,
                        isModified: true,
                        modifiedAt: Date.now(),
                        modifyCount: increment(1)
                    });
                    this.invalidateCache();
                    return true;
                } catch(e) {
                    console.error("Hiba a frissítésnél: ", e);
                    return null;
                }
            }
            return null;
        }
    };