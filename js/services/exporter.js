// js/services/exporter.js
// Exportáló szolgáltatás a terítések és elszámolások CSV-be mentéséhez

export const ExporterService = {
    exportAccountingToCsv: function(runs) {
        if (!runs || runs.length === 0) {
            alert("Nincs exportálható adat a megadott szűrési feltételekkel!");
            return;
        }

        const headers = [
            "Terítés ID",
            "Kiszállítás Dátuma",
            "Szállító Cég",
            "Szállító Neve",
            "Rendelésszám",
            "Vevő Neve",
            "Cím",
            "Telefon",
            "Utánvétes?",
            "Elvárt Utánvét (Ft)",
            "Rendelés Státusza",
            "Begyűjtött Készpénz (Ft)",
            "Szállító Tartozása (Ft)",
            "Sikertelenség Oka",
            "Felelős"
        ];

        const csvRows = [];
        // UTF-8 BOM a magyar karakterek helyes Excel megjelenítéséhez
        csvRows.push('\ufeff' + headers.join(";"));

        runs.forEach(run => {
            const uncollected = run.uncollectedOrderIds || [];
            const bankTransferred = run.bankTransferredOrderIds || [];
            const partialOrders = run.partialOrders || {};
            const reasons = run.uncollectedReasons || {};
            const responsibility = run.uncollectedResponsibility || {};

            // 1. Kiszámoljuk az elvárt készpénzt a körhöz a lezártság megállapításához
            let totalCOD = 0;
            let bankTransferredSum = 0;
            let uncollectedSum = 0;
            let partialDiffs = 0;

            run.orders.forEach(o => {
                if (o.isCOD) {
                    totalCOD += o.codAmount || 0;
                    if (bankTransferred.includes(o.id)) {
                        bankTransferredSum += o.codAmount || 0;
                    } else if (uncollected.includes(o.id)) {
                        uncollectedSum += o.codAmount || 0;
                    } else if (partialOrders[o.id]) {
                        partialDiffs += ((o.codAmount || 0) - (partialOrders[o.id].amount || 0));
                    }
                }
            });

            const expectedCash = totalCOD - bankTransferredSum - uncollectedSum - partialDiffs;
            const dynamicIsSettled = run.isSettled || (typeof run.settledAmount !== 'undefined' && run.settledAmount >= expectedCash);

            // 2. Minden rendelést hozzáadunk a CSV-hez
            run.orders.forEach(o => {
                const isCodText = o.isCOD ? "Igen" : "Nem";
                const expectedCodAmount = o.isCOD ? (o.codAmount || 0) : 0;

                const isUnc = uncollected.includes(o.id);
                const isBank = bankTransferred.includes(o.id);
                const isPart = !isUnc && !isBank && !!partialOrders[o.id];

                // Rendelés státusza
                let orderStatus = "";
                if (!o.isCOD) {
                    orderStatus = isUnc ? "Nem átadva" : "Átadva";
                } else {
                    if (isBank) {
                        orderStatus = "Elutalva (Banki utalás)";
                    } else if (isUnc) {
                        orderStatus = "Nincs beszedve (Kiesett)";
                    } else if (isPart) {
                        orderStatus = "Részlegesen fizetve";
                    } else if (dynamicIsSettled) {
                        orderStatus = "Elszámolva (Átvéve)";
                    } else {
                        orderStatus = "Függőben (Beszedve, elszámolásra vár)";
                    }
                }

                // Begyűjtött készpénz
                let collectedCash = 0;
                if (o.isCOD) {
                    if (isBank || isUnc) {
                        collectedCash = 0;
                    } else if (isPart) {
                        collectedCash = partialOrders[o.id].amount || 0;
                    } else {
                        collectedCash = o.codAmount || 0;
                    }
                }

                // Szállító tartozása (készpénz ami még nincs átadva nekünk)
                let courierDebt = 0;
                if (o.isCOD) {
                    if (dynamicIsSettled) {
                        courierDebt = 0; // Már elszámolva és átadva a cégnek
                    } else {
                        // Ha a kör nincs elszámolva, a futár tartozik a beszedett készpénzzel
                        courierDebt = collectedCash;
                    }
                }

                // Sikertelenség indoka
                let failReason = "";
                if (isUnc) {
                    failReason = reasons[o.id] || "";
                } else if (isPart) {
                    failReason = partialOrders[o.id].comment || "";
                }

                // Felelős fél
                let respPerson = "";
                if (isUnc || isPart) {
                    const rawResp = responsibility[o.id] || "vevo";
                    if (rawResp === "mienk") respPerson = "Cégünk";
                    else if (rawResp === "szallito") respPerson = "Szállító";
                    else respPerson = "Vevő / Egyéb";
                }

                // Mezők tisztítása a CSV formátumhoz (idézőjelek duplázása, pontosvesszők és újsorok cseréje)
                const clean = (val) => {
                    if (val === undefined || val === null) return "";
                    let str = String(val);
                    if (str.includes(";") || str.includes("\n") || str.includes('"')) {
                        str = str.replace(/"/g, '""');
                        return `"${str}"`;
                    }
                    return str;
                };

                const rowData = [
                    clean(run.id),
                    clean(run.date),
                    clean(run.company || "-"),
                    clean(run.courier),
                    clean(o.id),
                    clean(o.shippingName),
                    clean(o.address),
                    clean(o.shippingPhone),
                    clean(isCodText),
                    expectedCodAmount,
                    clean(orderStatus),
                    collectedCash,
                    courierDebt,
                    clean(failReason),
                    clean(respPerson)
                ];

                csvRows.push(rowData.join(";"));
            });
        });

        // Letöltés indítása
        const csvContent = csvRows.join("\r\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().substring(0, 10);
        link.setAttribute("href", url);
        link.setAttribute("download", `elszamolas_export_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
