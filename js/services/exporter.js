// js/services/exporter.js
// Exportáló szolgáltatás a terítések és elszámolások CSV-be mentéséhez
import { CustomDialog } from '../utils/dialog.js';
import { getPaymentDetails } from '../utils/paymentUtils.js';

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
            const reasons = run.uncollectedReasons || {};
            const partialOrders = run.partialOrders || {};

            run.orders.forEach(o => {
                const pd = getPaymentDetails(run, o);

                if (onlyPending && !pd.isPending) {
                    return;
                }

                let failReason = "";
                if (pd.isUncollected) {
                    failReason = reasons[o.id] || "";
                } else if (pd.isPartial && partialOrders[o.id]) {
                    failReason = partialOrders[o.id].comment || "";
                }

                rows.push({
                    date: run.date,
                    company: run.company || "-",
                    courier: run.courier || "-",
                    orderId: o.id,
                    customerName: o.shippingName || "—",
                    paymentMethodText: pd.methodText,
                    pendingKp: pd.pendingKp,
                    pendingCard: pd.pendingCard + pd.pendingBank,
                    orderStatus: pd.statusText,
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
