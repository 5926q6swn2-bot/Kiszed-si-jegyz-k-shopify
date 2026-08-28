import { db, collection, getDocs } from '../js/firebase-config.js';

async function analyzeRuns() {
    console.log("Fetching runs from Firestore...");
    const runsSnapshot = await getDocs(collection(db, 'runs'));
    const runs = [];
    runsSnapshot.forEach(doc => {
        runs.push({ docId: doc.id, ...doc.data() });
    });
    
    console.log(`Loaded ${runs.length} runs.`);
    
    // Sort runs by date descending
    runs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    let oldTotalKp = 0;
    let oldTotalCard = 0;
    let newTotalKp = 0;
    let newTotalCard = 0;
    let newTotalUnsettled = 0;

    console.log("\n--- DETAILED RUN BREAKDOWN ---");
    runs.forEach(run => {
        const orders = run.orders || [];
        const isRunSettledNew = run.isSettled === true || typeof run.settledAt !== 'undefined' || 
            (run.paymentMethods && Object.keys(run.paymentMethods).length > 0) || 
            (run.paymentStatusMap && Object.keys(run.paymentStatusMap).length > 0);
        
        let runOldKp = 0;
        let runOldCard = 0;
        let runNewKp = 0;
        let runNewCard = 0;
        let runNewUnsettled = 0;

        orders.forEach(o => {
            if (!o.isCOD) return;
            const codAmt = o.codAmount || 0;
            const uncollected = (run.uncollectedOrderIds || []).includes(o.id);
            const bankTrans = (run.bankTransferredOrderIds || []).includes(o.id);
            if (uncollected || bankTrans) return;

            // OLD logic (before v3.1.8):
            // If run has paymentMethods, use it; otherwise default pm = 'cash'
            const pm = (run.paymentMethods || {})[o.id];
            const ps = (run.paymentStatusMap || {})[o.id];

            // Old calculation:
            if (pm === 'card') {
                if (ps === 'pending') runOldCard += codAmt;
            } else if (pm === 'bank') {
                // old bank
            } else {
                // Default cash!
                const st = (typeof ps === 'string') ? ps : (ps ? ps.cash : 'pending');
                if (st === 'pending') runOldKp += codAmt;
            }

            // NEW logic (v3.2.2):
            if (!isRunSettledNew) {
                runNewUnsettled += codAmt;
            } else {
                // Settled run
                const isTransferSettled = run.isTransferSettled === true;
                if (typeof pm === 'object' && pm !== null) {
                    const cashAmt = Math.max(0, parseInt(pm.cash) || 0);
                    const cardAmt = Math.max(0, parseInt(pm.card) || 0);
                    const statusObj = (typeof ps === 'object' && ps !== null) ? ps : {};
                    const defaultStatus = (typeof ps === 'string') ? ps : 'pending';
                    const cashSt = statusObj.cash || defaultStatus;
                    let cardSt = isTransferSettled ? (statusObj.card || defaultStatus) : 'pending';
                    if (cashSt === 'pending') runNewKp += cashAmt;
                    if (cardSt === 'pending') runNewCard += cardAmt;
                } else {
                    const method = pm || 'cash';
                    let st = 'pending';
                    if (typeof ps === 'string') st = ps;
                    else if (typeof ps === 'object' && ps !== null) st = ps[method] || ps.card || ps.cash || 'pending';

                    if (method === 'card') {
                        if (!isTransferSettled) st = 'pending';
                        if (st === 'pending') runNewCard += codAmt;
                    } else {
                        if (st === 'pending') runNewKp += codAmt;
                    }
                }
            }
        });

        oldTotalKp += runOldKp;
        oldTotalCard += runOldCard;
        newTotalKp += runNewKp;
        newTotalCard += runNewCard;
        newTotalUnsettled += runNewUnsettled;

        if (runOldKp !== runNewKp || runOldCard !== runNewCard || runNewUnsettled > 0) {
            console.log(`[${run.date || 'NoDate'}] ${run.shipper || run.company || 'NoCompany'} - ${run.driver || 'NoDriver'} (DocID: ${run.docId})`);
            console.log(`   Old KP: ${runOldKp.toLocaleString()} Ft | New KP: ${runNewKp.toLocaleString()} Ft | Diff KP: ${(runOldKp - runNewKp).toLocaleString()} Ft`);
            console.log(`   Old Card: ${runOldCard.toLocaleString()} Ft | New Card: ${runNewCard.toLocaleString()} Ft`);
            console.log(`   New Unsettled: ${runNewUnsettled.toLocaleString()} Ft | isSettled: ${run.isSettled}, paymentMethods keys: ${Object.keys(run.paymentMethods || {}).length}`);
            console.log("--------------------------------------------------");
        }
    });

    console.log(`\nTOTALS:`);
    console.log(`Old Total KP: ${oldTotalKp.toLocaleString()} Ft`);
    console.log(`New Total KP: ${newTotalKp.toLocaleString()} Ft`);
    console.log(`Diff KP: ${(oldTotalKp - newTotalKp).toLocaleString()} Ft`);
    console.log(`New Total Unsettled: ${newTotalUnsettled.toLocaleString()} Ft`);
    process.exit(0);
}

analyzeRuns().catch(err => {
    console.error("Error analyzing runs:", err);
    process.exit(1);
});
