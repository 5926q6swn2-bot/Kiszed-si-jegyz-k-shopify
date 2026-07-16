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
        csvRows.push('\ufeff' + headers.join(";"));
        const rows = [];

        runs.forEach(run => {
            const uncollected = run.uncollectedOrderIds || [];
            const bankTransferred = run.bankTransferredOrderIds || [];
            const partialOrders = run.partialOrders || {};
            const reasons = run.uncollectedReasons || {};
            const paymentStatusMap = run.paymentStatusMap || {};
            const paymentMethods = run.paymentMethods || {};

            run.orders.forEach(o => {
                const isUnc = uncollected.includes(o.id);
                const isBank = bankTransferred.includes(o.id);
                const status = paymentStatusMap[o.id] || 'received';

                if (onlyPending) {
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

                // Függő kintlévőségek összegeinek bontása (csak ha még PENDING)
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

                // Megjegyzés
                let failReason = "";
                if (isUnc) {
                    failReason = reasons[o.id] || "";
                } else if (isPart) {
                    failReason = partialOrders[o.id].comment || "";
                }

                rows.push({
                    date: run.date,
                    company: run.company || "-",
                    courier: run.courier,
                    orderId: o.id,
                    customerName: o.shippingName,
                    paymentMethodText: paymentMethodText,
                    pendingKp: pendingKp,
                    pendingCard: pendingCard,
                    orderStatus: orderStatus,
                    failReason: failReason
                });
            });
        });

        // Csoportosítás szállítócég szerint ABC sorrendben
        rows.sort((a, b) => a.company.localeCompare(b.company, 'hu'));

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

        let currentCompany = null;
        let companyKpSum = 0;
        let companyCardSum = 0;

        const appendSubtotal = (companyName) => {
            if (companyName === null) return;
            const subtotalRow = [
                `${companyName} ÖSSZESEN`,
                "",
                "",
                "",
                "",
                "",
                companyKpSum,
                companyCardSum,
                "",
                ""
            ];
            csvRows.push(subtotalRow.join(";"));
        };

        rows.forEach(row => {
            if (row.company !== currentCompany) {
                if (currentCompany !== null) {
                    appendSubtotal(currentCompany);
                    // Üres sor az elválasztáshoz
                    csvRows.push(";;;;;;;;;");
                }
                currentCompany = row.company;
                companyKpSum = 0;
                companyCardSum = 0;
            }

            companyKpSum += row.pendingKp;
            companyCardSum += row.pendingCard;

            const rowData = [
                clean(row.date),
                clean(row.company),
                clean(row.courier),
                clean(row.orderId),
                clean(row.customerName),
                clean(row.paymentMethodText),
                row.pendingKp,
                row.pendingCard,
                clean(row.orderStatus),
                clean(row.failReason)
            ];

            csvRows.push(rowData.join(";"));
        });

        if (currentCompany !== null) {
            appendSubtotal(currentCompany);
        }

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
