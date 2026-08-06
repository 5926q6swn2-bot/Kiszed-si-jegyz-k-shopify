/**
 * js/utils/paymentUtils.js
 * Egységes fizetési és elszámolási státusz számító segédfüggvény.
 */

export function getPaymentDetails(run, order) {
    if (!run || !order) {
        return {
            isCOD: false,
            isUncollected: false,
            isBankTransferred: false,
            isPartial: false,
            codAmount: 0,
            collectedAmount: 0,
            pendingKp: 0,
            pendingCard: 0,
            pendingBank: 0,
            receivedKp: 0,
            receivedCard: 0,
            receivedBank: 0,
            isPending: false,
            isSettled: true,
            methodText: "Nem utánvétes",
            statusText: "Átadva"
        };
    }

    const uncollected = run.uncollectedOrderIds || [];
    const bankTransferred = run.bankTransferredOrderIds || [];
    const partialOrders = run.partialOrders || {};
    const paymentMethods = run.paymentMethods || {};
    const paymentStatusMap = run.paymentStatusMap || {};

    const orderId = String(order.id);

    const isUncollected = uncollected.some(id => String(id) === orderId);
    const isBankTransferred = bankTransferred.some(id => String(id) === orderId);
    
    const partial = partialOrders[orderId] || partialOrders[order.id];
    const isPartial = !isUncollected && !isBankTransferred && !!partial;

    if (!order.isCOD) {
        return {
            isCOD: false,
            isUncollected,
            isBankTransferred: false,
            isPartial: false,
            codAmount: 0,
            collectedAmount: 0,
            pendingKp: 0,
            pendingCard: 0,
            pendingBank: 0,
            receivedKp: 0,
            receivedCard: 0,
            receivedBank: 0,
            isPending: false,
            isSettled: true,
            methodText: "Nem utánvétes",
            statusText: isUncollected ? "Nem lett átadva" : "Átadva"
        };
    }

    if (isUncollected) {
        return {
            isCOD: true,
            isUncollected: true,
            isBankTransferred: false,
            isPartial: false,
            codAmount: order.codAmount || 0,
            collectedAmount: 0,
            pendingKp: 0,
            pendingCard: 0,
            pendingBank: 0,
            receivedKp: 0,
            receivedCard: 0,
            receivedBank: 0,
            isPending: false,
            isSettled: true,
            methodText: "Sikertelen",
            statusText: "Sikertelen (Kiesett)"
        };
    }

    if (isBankTransferred) {
        return {
            isCOD: true,
            isUncollected: false,
            isBankTransferred: true,
            isPartial: false,
            codAmount: order.codAmount || 0,
            collectedAmount: order.codAmount || 0,
            pendingKp: 0,
            pendingCard: 0,
            pendingBank: 0,
            receivedKp: 0,
            receivedCard: 0,
            receivedBank: order.codAmount || 0,
            isPending: false,
            isSettled: true,
            methodText: "Átutalás",
            statusText: "Kiegyenlítve (Banki utalás)"
        };
    }

    const collectedAmount = isPartial ? (partial.amount || 0) : (order.codAmount || 0);
    const pm = paymentMethods[orderId] || paymentMethods[order.id];
    const ps = paymentStatusMap[orderId] || paymentStatusMap[order.id];

    let pendingKp = 0;
    let pendingCard = 0;
    let pendingBank = 0;
    let receivedKp = 0;
    let receivedCard = 0;
    let receivedBank = 0;
    let methodText = "Készpénz (KP)";

    const isTransferSettled = run.isTransferSettled === true;
    
    // Ellenőrizzük, hogy a futárkör el van-e már számolva (lebuktatva a raktárban)
    const hasSettledMap = run.paymentStatusMap && Object.keys(run.paymentStatusMap).length > 0;
    const isRunSettled = run.isSettled === true || typeof run.settledAt !== 'undefined' || (run.settledAmount !== undefined && run.settledAmount !== null) || hasSettledMap;

    if (!isRunSettled) {
        return {
            isCOD: true,
            isUncollected: false,
            isBankTransferred: false,
            isPartial,
            codAmount: order.codAmount || 0,
            collectedAmount,
            pendingKp: 0,
            pendingCard: 0,
            pendingBank: 0,
            pendingUnsettled: collectedAmount,
            receivedKp: 0,
            receivedCard: 0,
            receivedBank: 0,
            isPending: true,
            isSettled: false,
            isUnsettledRun: true,
            methodText: "Utánvét (Elszámolásra vár)",
            statusText: "Elszámolásra vár"
        };
    }

    if (typeof pm === 'object' && pm !== null) {
        const cashAmt = Math.max(0, parseInt(pm.cash) || 0);
        const cardAmt = Math.max(0, parseInt(pm.card) || 0);
        const bankAmt = Math.max(0, parseInt(pm.bank) || 0);

        const statusObj = (typeof ps === 'object' && ps !== null) ? ps : {};
        const defaultStatus = (typeof ps === 'string') ? ps : 'pending';

        const cashSt = statusObj.cash || defaultStatus;
        let cardSt = isTransferSettled ? (statusObj.card || defaultStatus) : 'pending';
        let bankSt = isTransferSettled ? (statusObj.bank || defaultStatus) : 'pending';

        if (cashSt === 'pending') pendingKp += cashAmt; else receivedKp += cashAmt;
        if (cardSt === 'pending') pendingCard += cardAmt; else receivedCard += cardAmt;
        if (bankSt === 'pending') pendingBank += bankAmt; else receivedBank += bankAmt;

        const parts = [];
        if (cashAmt > 0) parts.push(`KP (${cashAmt.toLocaleString('hu-HU')} Ft)`);
        if (cardAmt > 0) parts.push(`Kártya (${cardAmt.toLocaleString('hu-HU')} Ft)`);
        if (bankAmt > 0) parts.push(`Utalás (${bankAmt.toLocaleString('hu-HU')} Ft)`);
        methodText = `Bontott: ${parts.join(' + ')}`;
    } else {
        const method = pm || 'cash';
        let st = 'pending';
        if (typeof ps === 'string') {
            st = ps;
        } else if (typeof ps === 'object' && ps !== null) {
            st = ps[method] || ps.card || ps.cash || ps.bank || 'pending';
        }

        if (method === 'card') {
            if (!isTransferSettled) st = 'pending';
            methodText = "Bankkártya";
            if (st === 'pending') pendingCard = collectedAmount; else receivedCard = collectedAmount;
        } else if (method === 'bank') {
            if (!isTransferSettled) st = 'pending';
            methodText = "Átutalás";
            if (st === 'pending') pendingBank = collectedAmount; else receivedBank = collectedAmount;
        } else {
            methodText = "Készpénz (KP)";
            if (st === 'pending') pendingKp = collectedAmount; else receivedKp = collectedAmount;
        }
    }

    const isPending = (pendingKp > 0 || pendingCard > 0 || pendingBank > 0);
    let statusText = "";
    if (isPartial) {
        statusText = isPending ? "Részlegesen fizetve (Függő)" : "Részlegesen fizetve (Rendezett)";
    } else {
        statusText = isPending ? (pendingCard > 0 ? "Kártyás utalásra vár" : "Függő kintlévőség") : "Kiegyenlítve";
    }

    return {
        isCOD: true,
        isUncollected: false,
        isBankTransferred: false,
        isPartial,
        codAmount: order.codAmount || 0,
        collectedAmount,
        pendingKp,
        pendingCard,
        pendingBank,
        pendingUnsettled: 0,
        receivedKp,
        receivedCard,
        receivedBank,
        isPending,
        isSettled: !isPending,
        isUnsettledRun: false,
        methodText,
        statusText
    };
}

export function getRunPaymentTotals(run) {
    let pendingKp = 0;
    let pendingCard = 0;
    let pendingUnsettled = 0;
    let receivedKp = 0;
    let receivedCard = 0;
    let receivedBank = 0;
    let totalCod = 0;

    if (!run || !run.orders) {
        return { pendingKp, pendingCard, pendingUnsettled, receivedKp, receivedCard, receivedBank, totalCod, hasPending: false, isFullySettled: true };
    }

    run.orders.forEach(o => {
        const pd = getPaymentDetails(run, o);
        if (pd.isCOD) {
            totalCod += pd.codAmount;
            pendingKp += pd.pendingKp;
            pendingCard += (pd.pendingCard + pd.pendingBank);
            pendingUnsettled += (pd.pendingUnsettled || 0);
            receivedKp += pd.receivedKp;
            receivedCard += pd.receivedCard;
            receivedBank += pd.receivedBank;
        }
    });

    const hasPending = pendingKp > 0 || pendingCard > 0 || pendingUnsettled > 0;
    const isNeverSettled = !run.isSettled && typeof run.settledAt === 'undefined' && !(run.settledAmount > 0) && (!run.uncollectedOrderIds || run.uncollectedOrderIds.length === 0) && (!run.paymentStatusMap || Object.keys(run.paymentStatusMap).length === 0);
    const isFullySettled = !hasPending && !isNeverSettled;

    return {
        pendingKp,
        pendingCard,
        pendingUnsettled,
        receivedKp,
        receivedCard,
        receivedBank,
        totalCod,
        hasPending,
        isNeverSettled,
        isFullySettled
    };
}
