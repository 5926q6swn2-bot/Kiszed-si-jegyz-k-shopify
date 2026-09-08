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

export const EmailService = {
    generateMissingInvoiceEmailHtml,
    sendMissingInvoiceAlertEmail
};
