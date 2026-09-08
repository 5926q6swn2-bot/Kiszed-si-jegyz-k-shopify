// js/services/emailService.js
// Automatikus e-mail értesítő szolgáltatás számla nélküli terítésbe helyezett rendelésekhez
// Támogatja a Resend és Brevo tranzakciós E-mail API-kat natív fetch segítségével.

/**
 * Generál egy átlátható, modern HTML levelet a számla nélküli rendelésekről.
 * 
 * @param {Object} run - A terítés adatai (date, courier, company, sender, etc.)
 * @param {Array} missingOrders - A számla nélküli rendelések listája
 * @returns {string} HTML tartalom
 */
export function generateMissingInvoiceEmailHtml(run = {}, missingOrders = [], shopDomain = 'p4q0uj-2m.myshopify.com') {
    const defaultCourier = run.courier || '';
    const defaultDate = run.date || '';
    const defaultCompany = run.company || 'Sela';
    const defaultSender = run.sender || 'PABU';

    // Terítésenkénti csoportosítás
    const groupedRuns = new Map();
    (missingOrders || []).forEach(order => {
        const runKey = order.runKey || `${order.runDate || defaultDate}|${order.courier || defaultCourier}|${order.company || defaultCompany}|${order.sender || defaultSender}`;
        if (!groupedRuns.has(runKey)) {
            groupedRuns.set(runKey, {
                date: order.runDate || defaultDate,
                courier: order.courier || defaultCourier,
                company: order.company || defaultCompany,
                sender: order.sender || defaultSender,
                orders: []
            });
        }
        groupedRuns.get(runKey).orders.push(order);
    });

    if (groupedRuns.size === 0 && Array.isArray(missingOrders) && missingOrders.length > 0) {
        groupedRuns.set('default', {
            date: defaultDate,
            courier: defaultCourier,
            company: defaultCompany,
            sender: defaultSender,
            orders: missingOrders
        });
    }

    let runsHtml = '';
    for (const [, runGroup] of groupedRuns) {
        const parts = [];
        if (runGroup.date) parts.push(runGroup.date);
        if (runGroup.company) parts.push(runGroup.company);
        if (runGroup.courier && runGroup.courier.toLowerCase() !== (runGroup.company || '').toLowerCase()) parts.push(runGroup.courier);
        const senderSuffix = (runGroup.sender && runGroup.sender.toLowerCase() !== (runGroup.company || '').toLowerCase() && runGroup.sender.toLowerCase() !== (runGroup.courier || '').toLowerCase()) ? ` (${runGroup.sender})` : '';

        const runTitle = parts.length > 0 ? `Terítés: ${parts.join(' - ')}${senderSuffix}` : 'Terítés';

        const itemsHtml = runGroup.orders.map(order => {
            const orderIdClean = String(order.id || '').replace(/^#/, '');
            const shopifyUrl = `https://${shopDomain}/admin/orders/${order.shopifyId || order.numericId || orderIdClean}`;
            const billingName = order.billingName || order.shippingName || order.customerName || '-';
            const noteText = order.note ? String(order.note).trim() : '';

            return `
                <li style="margin-bottom: 8px;">
                    <a href="${shopifyUrl}" target="_blank" style="color: #1d4ed8; text-decoration: underline; font-weight: bold;">
                        ${order.id || `#${orderIdClean}`}
                    </a>
                    - ${billingName}
                    ${noteText ? `<span style="color: #6b7280; font-size: 13px;"> (Megjegyzés: ${noteText})</span>` : ''}
                </li>
            `;
        }).join('');

        runsHtml += `
            <div style="margin-bottom: 18px;">
                <p style="margin: 0 0 6px 0; font-weight: bold; color: #111827;">
                    ${runTitle} (${runGroup.orders.length} db):
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #1f2937;">
                    ${itemsHtml}
                </ul>
            </div>
        `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Számla nélküli rendelések terítésben</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827; background-color: #ffffff;">
    <div style="max-width: 600px;">
        <p style="margin: 0 0 14px 0;">Szia,</p>

        <p style="margin: 0 0 16px 0;">
            Ezek a rendelések terítésben vannak, de még nem készült róluk számla:
        </p>

        ${runsHtml}

        <p style="margin: 24px 0 4px 0;">Üdvözlettel,</p>
        <p style="margin: 0; color: #6b7280;">Kiszedési Jegyzék Rendszer</p>
    </div>
</body>
</html>
    `;
}




/**
 * Kiküldi az automatikus e-mail értesítőt a megadott e-mail API-n keresztül (Resend vagy Brevo).
 * 
 * @param {Object} params
 * @param {Object} params.run - Terítés adatai
 * @param {Array} params.missingOrders - Hiányzó számlás rendelések
 * @param {string} [params.service] - 'resend' vagy 'brevo'
 * @param {string} [params.apiKey] - API kulcs
 * @param {string} [params.from] - Feladó címe (pl. 'onboarding@resend.dev' vagy 'ertesito@panelburkolat.com')
 * @param {string} [params.to] - Címzett (alapértelmezetten 'info@panelburkolat.com')
 * @param {string} [params.shopDomain] - Shopify shop domain
 * @returns {Promise<{ success: boolean, simulated?: boolean, id?: string, error?: string }>}
 */
export async function sendMissingInvoiceAlertEmail({
    run = {},
    missingOrders = [],
    service = 'resend',
    apiKey = '',
    from = 'onboarding@resend.dev',
    to = 'info@panelburkolat.com',
    shopDomain = 'p4q0uj-2m.myshopify.com'
}) {
    if (!Array.isArray(missingOrders) || missingOrders.length === 0) {
        return { success: true, message: 'Nincs számla nélküli rendelés, levél nem szükséges.' };
    }

    const orderCount = missingOrders.length;
    const orderNumbers = missingOrders.map(o => o.id || `#${o.numericId || ''}`).join(', ');
    const subject = 'nincs számlája ezeknek a rendeléseknek';
    const htmlContent = generateMissingInvoiceEmailHtml(run, missingOrders, shopDomain);

    // Ha nincs megadva API kulcs, szimulált módban futunk (nem dob hibát!)
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_') || apiKey === 're_123456789') {
        console.log(`[EmailService - Szimulált Mód] Levél küldése szimulálva:`);
        console.log(`   Címzett: ${to}`);
        console.log(`   Tárgy: ${subject}`);
        console.log(`   Érintett rendelések: ${orderNumbers}`);
        console.log(`   (Az éles küldéshez add meg a RESEND_API_KEY kulcsot a .env fájlban!)`);
        return {
            success: true,
            simulated: true,
            message: 'Szimulált küldés: API kulcs hiányzik a .env fájlból, de a naplózás megtörtént.'
        };
    }

    const effectiveService = String(service || 'resend').toLowerCase();

    // 1. RESEND API KÜLDÉS (https://api.resend.com/emails)
    if (effectiveService === 'resend') {
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: from,
                    to: [to],
                    subject: subject,
                    html: htmlContent
                })
            });

            const data = await res.json();
            if (res.ok && data.id) {
                console.log(`[EmailService - Resend] Értesítő levél sikeresen elküldve (${to}), ID: ${data.id}`);
                return { success: true, id: data.id, service: 'resend' };
            } else {
                // Intelligens kezelés: Ha a Resend teszt módban van (még nincs saját domain verifikálva a resend.com/domains alatt)
                if (data.message && data.message.includes('You can only send testing emails to your own email address')) {
                    const match = data.message.match(/your own email address \(([^)]+)\)/);
                    const fallbackTo = match && match[1] ? match[1] : null;

                    if (fallbackTo && fallbackTo !== to) {
                        console.warn(`[EmailService - Resend Domain Figyelmeztetés] A ${to} címre közvetlenül küldéshez a saját domain hitelesítése szükséges a resend.com/domains alatt.`);
                        console.log(`[EmailService - Resend Fallback] Levél azonnali elküldése a regisztrált fiókcímedre (${fallbackTo})...`);

                        const fallbackNoticeHtml = `
                            <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #92400e; line-height: 1.4;">
                                <strong>Resend Teszt Mód:</strong> Ez az értesítő eredetileg az <code>${to}</code> címre szólt. Amíg a <code>panelburkolat.com</code> domaint nem hitelesíted a <a href="https://resend.com/domains" target="_blank" style="color: #b45309; font-weight: bold; text-decoration: underline;">resend.com/domains</a> alatt, a Resend a regisztrált fiókcímedre (<strong>${fallbackTo}</strong>) kézbesíti a leveleket.
                            </div>
                        `;

                        try {
                            const fallbackRes = await fetch('https://api.resend.com/emails', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${apiKey.trim()}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    from: from,
                                    to: [fallbackTo],
                                    subject: `[Átirányítva: ${to}] ${subject}`,
                                    html: fallbackNoticeHtml + htmlContent
                                })
                            });

                            const fallbackData = await fallbackRes.json();
                            if (fallbackRes.ok && fallbackData.id) {
                                console.log(`[EmailService - Resend Kézbesítve] Értesítő levél elküldve (${fallbackTo}), ID: ${fallbackData.id}`);
                                return { success: true, id: fallbackData.id, service: 'resend', forwardedTo: fallbackTo };
                            }
                        } catch (fallbackErr) {
                            console.error(`[EmailService - Resend Fallback Hiba]`, fallbackErr);
                        }
                    }
                }

                console.error(`[EmailService - Resend Hiba]`, data);
                return { success: false, error: data.message || JSON.stringify(data), service: 'resend' };
            }
        } catch (err) {
            console.error(`[EmailService - Hálózati hiba Resend híváskor]`, err);
            return { success: false, error: err.message, service: 'resend' };
        }
    }

    // 2. BREVO API KÜLDÉS (https://api.brevo.com/v3/smtp/email)
    if (effectiveService === 'brevo') {
        try {
            const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': apiKey.trim(),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    sender: {
                        name: 'Kiszedési Jegyzék Értesítő',
                        email: from.includes('<') ? from.replace(/.*<([^>]+)>.*/, '$1') : from
                    },
                    to: [{ email: to, name: 'Panelburkolat Info' }],
                    subject: subject,
                    htmlContent: htmlContent
                })
            });

            const data = await res.json();
            if (res.ok && (data.messageId || data.messageIds)) {
                console.log(`[EmailService - Brevo] Értesítő levél sikeresen elküldve (${to}), ID: ${data.messageId || data.messageIds}`);
                return { success: true, id: data.messageId || data.messageIds, service: 'brevo' };
            } else {
                console.error(`[EmailService - Brevo Hiba]`, data);
                return { success: false, error: data.message || JSON.stringify(data), service: 'brevo' };
            }
        } catch (err) {
            console.error(`[EmailService - Hálózati hiba Brevo híváskor]`, err);
            return { success: false, error: err.message, service: 'brevo' };
        }
    }

    return { success: false, error: `Ismeretlen email szolgáltatás: ${service}` };
}


/**
 * Generates the clean HTML content for the morning report email.
 */
export function generateMorningReportEmailHtml(data = {}, isMonday = false, shopDomain = 'p4q0uj-2m.myshopify.com') {
    const adminBase = `https://${shopDomain}/admin/orders/`;
    const dateStr = data.dateText || (isMonday ? 'Hétfői Reggeli Összesítés' : 'Reggeli Riport');
    const targetTag = data.targetTag || '';
    const periodText = isMonday ? 'Péntek reggel 07:00 óta' : 'Tegnap reggel 07:00 óta';
    const newOrdersCount = data.newOrdersCount || 0;
    const newUnfulfilledCount = data.newUnfulfilledCount || 0;
    const unfulfilledCount = data.unfulfilledCount || 0;

    const hasOkTag = (note) => note && String(note).toLowerCase().includes('[ok]');
    const extractScheduledDateTag = (note) => {
        if (!note) return null;
        const match = String(note).match(/\[(?:(\d{4})[\.\/-])?(\d{1,2})[\.\/-](\d{1,2})\.?\]/);
        if (!match) return null;
        return `${String(match[2]).padStart(2, '0')}.${String(match[3]).padStart(2, '0')}`;
    };

    const renderNotesBox = (note) => {
        if (!note || !note.trim()) return '';
        return `<div style="font-size: 11px; color: #64748b; margin-top: 2px; line-height: 1.35;"><strong style="color: #475569;">Megjegyzés:</strong> <span style="font-style: italic;">"${note.trim()}"</span></div>`;
    };

    // Filter [ok] items on weekdays
    const missingInvoiceFiltered = (data.missingInvoice || []).filter(i => !hasOkTag(i.note));
    const wrongShippingFiltered = (data.wrongShipping || []).filter(i => !hasOkTag(i.note));
    const incompleteAddressFiltered = (data.incompleteAddress || []).filter(i => !hasOkTag(i.note));
    const dijbekKerendoFiltered = (data.dijbekKerendo || []).filter(i => !hasOkTag(i.note));
    const dijbekVarakozikFiltered = (data.dijbekVarakozik || []).filter(i => !hasOkTag(i.note));
    const oldPickupsFiltered = (data.oldPickups || []).filter(i => !hasOkTag(i.note));
    const selaDeadlinesFiltered = (data.selaDeadlines || []).filter(i => !hasOkTag(i.note));
    const unsettledRunsFiltered = (data.unsettledRuns || []).filter(i => !hasOkTag(i.note));

    // Gather today's scheduled items
    const scheduledTodayItems = [];
    const checkScheduled = (arr) => {
        (arr || []).forEach(item => {
            if (targetTag && extractScheduledDateTag(item.note) === targetTag) {
                scheduledTodayItems.push(item);
            }
        });
    };
    checkScheduled(data.missingInvoice);
    checkScheduled(data.wrongShipping);
    checkScheduled(data.incompleteAddress);
    checkScheduled(data.dijbekKerendo);
    checkScheduled(data.dijbekVarakozik);
    checkScheduled(data.oldPickups);
    checkScheduled(data.selaDeadlines);
    checkScheduled(data.unsettledRuns);

    // Monday items
    const mondayHandledItems = [];
    if (isMonday) {
        (data.missingInvoice || []).forEach(i => { if (hasOkTag(i.note)) mondayHandledItems.push({ ...i, category: "Számla hiány" }); });
        (data.wrongShipping || []).forEach(i => { if (hasOkTag(i.note)) mondayHandledItems.push({ ...i, category: "Rossz szállítás" }); });
        (data.incompleteAddress || []).forEach(i => { if (hasOkTag(i.note)) mondayHandledItems.push({ ...i, category: "Hiányos cím" }); });
        (data.dijbekKerendo || []).forEach(i => { if (hasOkTag(i.note)) mondayHandledItems.push({ ...i, category: "Díjbekérőt kell kérni" }); });
        (data.dijbekVarakozik || []).forEach(i => { if (hasOkTag(i.note)) mondayHandledItems.push({ ...i, category: "Díjbekérőt várjuk" }); });
        (data.oldPickups || []).forEach(i => { if (hasOkTag(i.note)) mondayHandledItems.push({ ...i, category: "Régi személyes átvétel" }); });
        (data.selaDeadlines || []).forEach(i => { if (hasOkTag(i.note)) mondayHandledItems.push({ ...i, category: "Sela határidő" }); });
        (data.unsettledRuns || []).forEach(i => { if (hasOkTag(i.note)) mondayHandledItems.push({ ...i, category: "Nyitott fuvar", billing: i.driver }); });
    }

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reggeli Logisztikai és Számlázási Riport</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13.5px; line-height: 1.6; color: #1e293b; background-color: #f8fafc;">
    <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        
        <div style="background: #f1f5f9; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; color: #334155;">
            Jó reggelt!<br><br>
            ${isMonday ? '<strong style="color: #6b21a8;">[HÉTFŐI REGGELI RIPORT - HÉTVÉGI ÖSSZESÍTÉS]</strong><br>' : ''}
            ${periodText} <strong>${newOrdersCount} db új rendelés</strong> érkezett (ebből unfulfilled: <strong>${newUnfulfilledCount} db</strong> — <em>viszonteladók kizárva</em>).<br>
            Jelenleg összesen <strong>${unfulfilledCount} db unfulfilled rendelés</strong> van a Shopify-ban.
        </div>
    `;

    // Section 0: Scheduled Date Alerts
    html += `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
            <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; color: #0f172a; margin-bottom: 10px;">
                Mai Napra Időzített Értesítések — [${targetTag}] (${scheduledTodayItems.length} db)
            </div>
    `;
    if (scheduledTodayItems.length === 0) {
        html += `<div style="color: #64748b; font-size: 12.5px;">Nincs a mai napra ([${targetTag}]) időzített megjegyzéses emlékeztető.</div>`;
    } else {
        html += `<ul style="margin: 0; padding-left: 18px;">`;
        scheduledTodayItems.forEach(item => {
            const cleanNum = String(item.orderId || '').replace('#', '');
            const isPickup = /átvétel|pickup/i.test(item.note || '');
            const typeStr = isPickup ? '[Személyes átvétel]' : `[Kiszállítás${item.city ? ' - ' + item.city : ''}]`;
            html += `
                <li style="margin-bottom: 8px;">
                    <a href="${adminBase}${cleanNum}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: none;">${item.orderId}</a> - <strong>${item.billing || item.city || ''}</strong> <span style="color: #2563eb; font-size: 11px;">${typeStr}</span>
                    ${renderNotesBox(item.note)}
                </li>
            `;
        });
        html += `</ul>`;
    }
    html += `</div>`;

    // Section 1: Missing Invoices
    html += `
        <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
            <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; color: #0f172a; margin-bottom: 8px;">
                1. Számla nélküli rendelések (Címkézve vagy Terítésben) (${missingInvoiceFiltered.length} db)
            </div>
    `;
    if (missingInvoiceFiltered.length === 0) {
        html += `<div style="color: #16a34a; font-size: 12.5px;">Minden feladásra kész rendelésről készült számla.</div>`;
    } else {
        html += `<ul style="margin: 0; padding-left: 18px;">`;
        missingInvoiceFiltered.forEach(item => {
            const cleanNum = String(item.orderId || '').replace('#', '');
            html += `
                <li style="margin-bottom: 8px;">
                    <a href="${adminBase}${cleanNum}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: none;">${item.orderId}</a> - <strong>${item.billing || ''}</strong> <span style="color: #dc2626; font-size: 11px; font-weight: bold;">[Számlázni!]</span>
                    ${renderNotesBox(item.note)}
                </li>
            `;
        });
        html += `</ul>`;
    }
    html += `</div>`;

    // Section 2: Address Errors
    const addressTotal = incompleteAddressFiltered.length + wrongShippingFiltered.length;
    html += `
        <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
            <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; color: #0f172a; margin-bottom: 8px;">
                2. Címhibák és Rossz Szállítási Módok (${addressTotal} db)
            </div>
    `;
    if (addressTotal === 0) {
        html += `<div style="color: #16a34a; font-size: 12.5px;">Minden szállítási cím és szállítási díj megfelelő.</div>`;
    } else {
        html += `<ul style="margin: 0; padding-left: 18px;">`;
        wrongShippingFiltered.forEach(item => {
            const cleanNum = String(item.orderId || '').replace('#', '');
            html += `
                <li style="margin-bottom: 8px;">
                    <a href="${adminBase}${cleanNum}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: none;">${item.orderId}</a> - <strong>${item.city || ''} (${item.zip || ''})</strong> <span style="color: #dc2626; font-size: 11px;">[Rossz szállítás]</span>
                    ${renderNotesBox(item.note)}
                </li>
            `;
        });
        incompleteAddressFiltered.forEach(item => {
            const cleanNum = String(item.orderId || '').replace('#', '');
            html += `
                <li style="margin-bottom: 8px;">
                    <a href="${adminBase}${cleanNum}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: none;">${item.orderId}</a> - <strong>${item.city || ''}, ${item.address || ''}</strong> <span style="color: #dc2626; font-size: 11px;">[Hiányos cím]</span>
                    ${renderNotesBox(item.note)}
                </li>
            `;
        });
        html += `</ul>`;
    }
    html += `</div>`;

    // Section 3: Proforma Orders
    const proformaTotal = dijbekKerendoFiltered.length + dijbekVarakozikFiltered.length;
    html += `
        <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
            <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; color: #0f172a; margin-bottom: 8px;">
                3. Díjbekérős Rendelések (250.000 Ft feletti nem fizetett) (${proformaTotal} db)
            </div>
    `;
    if (proformaTotal === 0) {
        html += `<div style="color: #16a34a; font-size: 12.5px;">Nincs 250.000 Ft feletti függőben lévő díjbekérős rendelés.</div>`;
    } else {
        html += `<ul style="margin: 0; padding-left: 18px;">`;
        dijbekKerendoFiltered.forEach(item => {
            const cleanNum = String(item.orderId || '').replace('#', '');
            html += `
                <li style="margin-bottom: 8px;">
                    <a href="${adminBase}${cleanNum}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: none;">${item.orderId}</a> - <strong>${item.billing || ''}</strong> (${item.amount || ''}) <span style="color: #d97706; font-size: 11px; font-weight: bold;">[Díjbekérőt kell kérni]</span>
                    ${renderNotesBox(item.note)}
                </li>
            `;
        });
        dijbekVarakozikFiltered.forEach(item => {
            const cleanNum = String(item.orderId || '').replace('#', '');
            html += `
                <li style="margin-bottom: 8px;">
                    <a href="${adminBase}${cleanNum}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: none;">${item.orderId}</a> - <strong>${item.billing || ''}</strong> (${item.amount || ''}) <span style="color: #2563eb; font-size: 11px;">[Díjbekérőt várjuk]</span>
                    ${renderNotesBox(item.note)}
                </li>
            `;
        });
        html += `</ul>`;
    }
    html += `</div>`;

    // Section 4: Old Pickups
    html += `
        <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
            <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; color: #0f172a; margin-bottom: 8px;">
                4. Régóta Várakozó Személyes Átvételek (> 2,5 hét) (${oldPickupsFiltered.length} db)
            </div>
    `;
    if (oldPickupsFiltered.length === 0) {
        html += `<div style="color: #16a34a; font-size: 12.5px;">Nincs 2,5 hétnél régebbi bolti személyes átvétel.</div>`;
    } else {
        html += `<ul style="margin: 0; padding-left: 18px;">`;
        oldPickupsFiltered.forEach(item => {
            const cleanNum = String(item.orderId || '').replace('#', '');
            html += `
                <li style="margin-bottom: 8px;">
                    <a href="${adminBase}${cleanNum}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: none;">${item.orderId}</a> - <strong>${item.billing || ''}</strong> <span style="color: #7c3aed; font-size: 11px;">[Személyes]</span>
                    <span style="color: #64748b; font-size: 12px;">— ${item.days || ''} várakozik</span>
                    ${renderNotesBox(item.note)}
                </li>
            `;
        });
        html += `</ul>`;
    }
    html += `</div>`;

    // Section 5: Sela Deadlines
    html += `
        <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
            <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; color: #0f172a; margin-bottom: 8px;">
                5. Sela Kiszállítások — 5 munkanapos határidők (${selaDeadlinesFiltered.length} db)
            </div>
    `;
    if (selaDeadlinesFiltered.length === 0) {
        html += `<div style="color: #16a34a; font-size: 12.5px;">Nincs határidő-közeli vagy lejárt Sela szállítás.</div>`;
    } else {
        html += `<ul style="margin: 0; padding-left: 18px;">`;
        selaDeadlinesFiltered.forEach(item => {
            const cleanNum = String(item.orderId || '').replace('#', '');
            html += `
                <li style="margin-bottom: 8px;">
                    <a href="${adminBase}${cleanNum}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: none;">${item.orderId}</a> - <strong>${item.billing || ''} (${item.city || ''})</strong> <span style="color: #dc2626; font-size: 11px; font-weight: bold;">[${item.status || 'Határidős'}]</span>
                    ${renderNotesBox(item.note)}
                </li>
            `;
        });
        html += `</ul>`;
    }
    html += `</div>`;

    // Section 6: PXP Pending
    const pxpTotal = (data.pxpBudapest || []).length + (data.pxpNational || []).length;
    html += `
        <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
            <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; color: #0f172a; margin-bottom: 8px;">
                6. PannonXP Csomagok (Címkézésre / Exportra vár) (${pxpTotal} db)
            </div>
    `;
    if (pxpTotal === 0) {
        html += `<div style="color: #16a34a; font-size: 12.5px;">Minden PannonXP csomag fel lett címkézve.</div>`;
    } else {
        html += `<ul style="margin: 0; padding-left: 18px;">`;
        (data.pxpBudapest || []).forEach(item => {
            const cleanNum = String(item.orderId || '').replace('#', '');
            html += `
                <li style="margin-bottom: 8px;">
                    <a href="${adminBase}${cleanNum}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: none;">${item.orderId}</a> - <strong>${item.city || 'Budapest'}</strong> <span style="color: #2563eb; font-size: 11px;">[Címkézésre vár]</span>
                    ${renderNotesBox(item.note)}
                </li>
            `;
        });
        (data.pxpNational || []).forEach(item => {
            const cleanNum = String(item.orderId || '').replace('#', '');
            html += `
                <li style="margin-bottom: 8px;">
                    <a href="${adminBase}${cleanNum}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: none;">${item.orderId}</a> - <strong>${item.city || 'Országos'}</strong> <span style="color: #2563eb; font-size: 11px;">[Címkézésre vár]</span>
                    ${renderNotesBox(item.note)}
                </li>
            `;
        });
        html += `</ul>`;
    }
    html += `</div>`;

    // Section 7: Unsettled Runs
    html += `
        <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
            <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; color: #0f172a; margin-bottom: 8px;">
                7. Lezáratlan Futár Elszámolások (> 2 munkanap) (${unsettledRunsFiltered.length} fuvar)
            </div>
    `;
    if (unsettledRunsFiltered.length === 0) {
        html += `<div style="color: #16a34a; font-size: 12.5px;">Minden futárfuvar el lett számolva.</div>`;
    } else {
        html += `<ul style="margin: 0; padding-left: 18px;">`;
        unsettledRunsFiltered.forEach(item => {
            const codVal = item.codTotal || item.amount;
            const codText = codVal ? ` — Utánvét egyenleg: <strong>${codVal}</strong>` : '';
            const isGenericNote = item.note && /fuvar még nincs elszámolva|elszámolatlan/i.test(item.note);
            const noteHtml = (item.note && !isGenericNote) ? renderNotesBox(item.note) : '';

            html += `
                <li style="margin-bottom: 8px;">
                    <strong>${item.driver || 'Futár'}</strong> fuvar — Kiszállítás napja: ${item.date || ''}
                    ${codText}
                    ${noteHtml}
                </li>
            `;
        });
        html += `</ul>`;
    }
    html += `</div>`;

    // Section 8: Monday Review
    if (isMonday) {
        html += `
            <div style="background: #faf5ff; border: 1px solid #d8b4fe; border-radius: 8px; padding: 14px 16px; margin-top: 10px;">
                <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; color: #6b21a8; margin-bottom: 6px;">
                    8. Egyeztetett rendelések (Hétfői felülvizsgálat) — [ok] (${mondayHandledItems.length} db)
                </div>
                <div style="font-size: 12px; color: #6b21a8; margin-bottom: 10px;">
                    Az alábbi [ok] megjegyzéssel rendelkező tételek riasztásai hétköznap el voltak némítva. Heti ellenőrzés:
                </div>
        `;
        if (mondayHandledItems.length === 0) {
            html += `<div style="color: #6b21a8; font-size: 12.5px;">Jelenleg nincs [ok] megjegyzéssel elhalasztott rendelés.</div>`;
        } else {
            html += `<ul style="margin: 0; padding-left: 18px;">`;
            mondayHandledItems.forEach(item => {
                const cleanNum = item.orderId ? String(item.orderId).replace('#', '') : '';
                const linkHtml = cleanNum ? `<a href="${adminBase}${cleanNum}" target="_blank" style="color: #7c3aed; font-weight: bold; text-decoration: none;">${item.orderId}</a> - ` : '';
                html += `
                    <li style="margin-bottom: 8px;">
                        ${linkHtml}<strong>${item.billing || 'Névtelen'}</strong> <span style="color: #7c3aed; font-size: 11px;">[${item.category || 'Egyeztetett'}]</span>
                        ${renderNotesBox(item.note)}
                    </li>
                `;
            });
            html += `</ul>`;
        }
        html += `</div>`;
    }

    html += `
        <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
            Ez egy automatikus reggeli összefoglaló a Kiszedési Jegyzék és Terítés rendszerből.<br>
            Generálva: ${dateStr} — Panelburkolat
        </div>
    </div>
</body>
</html>
    `;

    return html;
}

/**
 * Sends the morning report email.
 */
export async function sendMorningReportEmail({
    reportData = {},
    isMonday = false,
    service = 'resend',
    apiKey = '',
    from = 'onboarding@resend.dev',
    to = 'info@panelburkolat.com',
    shopDomain = 'p4q0uj-2m.myshopify.com'
}) {
    const now = new Date();
    const dateStr = reportData.dateText || `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}.`;
    const subject = isMonday ? `Reggeli riport - ${dateStr} [HÉTFŐI FELÜLVIZSGÁLAT]` : `Reggeli riport - ${dateStr}`;
    const htmlContent = generateMorningReportEmailHtml(reportData, isMonday, shopDomain);

    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_') || apiKey === 're_123456789') {
        console.log(`[EmailService - Reggeli Riport Szimulált Mód] Levél küldése szimulálva:`);
        console.log(`   Címzett: ${to}`);
        console.log(`   Tárgy: ${subject}`);
        console.log(`   (Az éles küldéshez add meg a RESEND_API_KEY kulcsot a .env fájlban!)`);
        return {
            success: true,
            simulated: true,
            message: 'Szimulált reggeli riport küldés megtörtént.'
        };
    }

    const effectiveService = String(service || 'resend').toLowerCase();

    if (effectiveService === 'resend') {
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from,
                    to: [to],
                    subject,
                    html: htmlContent
                })
            });
            const data = await res.json();
            if (res.ok && data.id) {
                console.log(`[EmailService - Resend] Reggeli riport sikeresen elküldve (${to}), ID: ${data.id}`);
                return { success: true, id: data.id, service: 'resend' };
            }
        } catch (err) {
            console.error('[EmailService Morning Report Error]', err);
            return { success: false, error: err.message };
        }
    }

    return { success: false, error: `Szolgáltatás hiba: ${service}` };
}

export const EmailService = {
    generateMissingInvoiceEmailHtml,
    sendMissingInvoiceAlertEmail,
    generateMorningReportEmailHtml,
    sendMorningReportEmail
};

