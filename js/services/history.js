import { db, auth, collection, query, orderBy, getDocs, addDoc, getDoc, setDoc, deleteDoc, updateDoc, doc, where, limit, deleteField, writeBatch, arrayUnion, arrayRemove, increment } from '../firebase-config.js?v=42';

export const HistoryManager = {
        COLLECTION_NAME: 'szedolista_history',
        TRASH_COLLECTION_NAME: 'szedolista_trash',
        
        getAllRuns: async function() {
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

        updateSettlementStatus: async function(docId, settledAmount, totalCOD, uncollectedOrderIds = [], uncollectedReasons = {}, partialOrders = {}, bankTransferredOrderIds = [], uncollectedResponsibility = {}, settledKpAmount = null, settledCardAmount = null, paymentMethods = {}, isTransferSettled = null, paymentStatusMap = {}) {
            try {
                const docRef = doc(db, this.COLLECTION_NAME, docId);
                const docSnap = await getDoc(docRef);
                let isSettled = false;
                if (docSnap.exists()) {
                    const runData = docSnap.data();
                    const ordersList = runData.orders || [];
                    
                    let hasPendingCOD = false;
                    ordersList.forEach(o => {
                        if (o.isCOD && !uncollectedOrderIds.includes(o.id)) {
                            const status = paymentStatusMap[o.id] || 'received';
                            if (typeof status === 'object' && status !== null) {
                                if (Object.values(status).includes('pending')) {
                                    hasPendingCOD = true;
                                }
                            } else if (status === 'pending') {
                                hasPendingCOD = true;
                            }
                        }
                    });
                    
                    isSettled = !hasPendingCOD;
                } else {
                    isSettled = settledAmount >= totalCOD;
                }

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
                
                let allTransferSettled = true;
                Object.keys(paymentStatusMap).forEach(orderId => {
                    const status = paymentStatusMap[orderId];
                    const method = paymentMethods[orderId];
                    if (typeof status === 'object' && status !== null) {
                        if (status.card === 'pending') {
                            allTransferSettled = false;
                        }
                    } else {
                        if (method === 'card' && status === 'pending') {
                            allTransferSettled = false;
                        }
                    }
                });
                updateData.isTransferSettled = allTransferSettled;

                await updateDoc(docRef, updateData);
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
                
                let hasPendingCOD = false;
                ordersList.forEach(o => {
                    if (o.isCOD && !uncollectedOrderIds.includes(o.id)) {
                        const status = paymentStatusMap[o.id] || 'received';
                        if (typeof status === 'object' && status !== null) {
                            if (Object.values(status).includes('pending')) {
                                hasPendingCOD = true;
                            }
                        } else if (status === 'pending') {
                            hasPendingCOD = true;
                        }
                    }
                });
                
                const isSettled = !hasPendingCOD;
                const updateData = {
                    paymentStatusMap: paymentStatusMap,
                    isSettled: isSettled
                };
                
                let allTransferSettled = true;
                Object.keys(paymentStatusMap).forEach(orderId => {
                    const status = paymentStatusMap[orderId];
                    const method = paymentMethods[orderId];
                    if (typeof status === 'object' && status !== null) {
                        if (status.card === 'pending') {
                            allTransferSettled = false;
                        }
                    } else {
                        if (method === 'card' && status === 'pending') {
                            allTransferSettled = false;
                        }
                    }
                });
                updateData.isTransferSettled = allTransferSettled;
                
                await updateDoc(docRef, updateData);
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
                return true;
            } catch (e) {
                console.error("Hiba a visszaállításnál: ", e);
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