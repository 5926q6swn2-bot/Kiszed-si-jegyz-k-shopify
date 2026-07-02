// js/services/exporter.js
// Exportáló szolgáltatás a terítések és elszámolások CSV-be mentéséhez
import { CustomDialog } from '../utils/dialog.js';

export const ExporterService = {
    exportAccountingToCsv: async function(runs, onlyPending = false) {
        if (!runs || runs.length === 0) {
            await CustomDialog.alert("Nincs exportálható adat a megadott szűresi feltételekkel!", "Nincs adat", "warning");
            return;
        }

        const headers = [
            "Kiszállítás Dátuma",
            "Szállító Cég",
            "Szállító Neve",
            "Rendelésszám",
            "Vevő Neve",
            "Fizetés Módja",
            "Függő KP (futártól) (Ft)",
            "Kártyás utalásra vár (szállítótól) (Ft)",
            "Státusz",
            "Megjegyzés"
        ];

        const csvRows = [];
        // UTF-8 BOM a magyar karakterek helyes Excel megjelenítéséhez
        csvRows.push('\ufeff' + headers.join(";"));

        runs.forEach(run => {
            const uncollected = run.uncollectedOrderIds || [];
            const bankTransferred = run.bankTransferredOrderIds || [];
            const partialOrders = run.partialOrders || {};
            const reasons = run.uncollectedReasons || {};
            const paymentStatusMap = run.paymentStatusMap || {};
            const paymentMethods = run.paymentMethods || {};

            // Minden rendelést hozzáadunk a CSV-hez
            run.orders.forEach(o => {
                const isUnc = uncollected.includes(o.id);
                const isBank = bankTransferred.includes(o.id);
                const status = paymentStatusMap[o.id] || 'received';

                if (onlyPending) {
                    // Csak olyan COD-os rendelést exportálunk, ami nem kiesett, nem banki utalt, és még függőben van
                    const isPendingCOD = o.isCOD && !isUnc && !isBank && status === 'pending';
                    if (!isPendingCOD) return;
                }

                const isPart = !isUnc && !isBank && !!partialOrders[o.id];

                // Fizetés módja
                let paymentMethodText = "Nem utánvétes";
                let method = "none";
                if (o.isCOD) {
                    if (isBank) {
                        paymentMethodText = "Átutalás";
                        method = "bank";
                    } else {
                        const m = paymentMethods[o.id] || 'cash';
                        if (m === 'card') {
                            paymentMethodText = "Bankkártya";
                            method = "card";
                        } else if (m === 'bank') {
                            paymentMethodText = "Átutalás";
                            method = "bank";
                        } else {
                            paymentMethodText = "Készpénz (KP)";
                            method = "cash";
                        }
                    }
                }

                // Rendelés státusza
                let orderStatus = "";
                if (!o.isCOD) {
                    orderStatus = isUnc ? "Nem lett átadva" : "Átadva";
                } else {
                    if (isUnc) {
                        orderStatus = "Sikertelen (Kiesett)";
                    } else if (isPart) {
                        orderStatus = status === 'pending' ? "Részlegesen fizetve (Függő)" : "Részlegesen fizetve (Rendezett)";
                    } else {
                        orderStatus = status === 'pending' ? "Függő kintlévőség" : "Kiegyenlítve";
                    }
                }

                // Függő kintlévőségek összegeinek bontása (csak ha még PENDING, azaz nem kaptuk kézhez)
                let collectedAmount = 0;
                if (o.isCOD && !isUnc) {
                    if (isPart) {
                        collectedAmount = partialOrders[o.id].amount || 0;
                    } else {
                        collectedAmount = o.codAmount || 0;
                    }
                }

                const isPending = status === 'pending';
                const pendingKp = (method === 'cash' && isPending) ? collectedAmount : 0;
                const pendingCard = (method === 'card' && isPending) ? collectedAmount : 0;

                // Megjegyzés / Sikertelenség oka
                let failReason = "";
                if (isUnc) {
                    failReason = reasons[o.id] || "";
                } else if (isPart) {
                    failReason = partialOrders[o.id].comment || "";
                }

                // Mezők tisztítása a CSV formátumhoz
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
                    clean(run.date),
                    clean(run.company || "-"),
                    clean(run.courier),
                    clean(o.id),
                    clean(o.shippingName),
                    clean(paymentMethodText),
                    pendingKp,
                    pendingCard,
                    clean(orderStatus),
                    clean(failReason)
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
