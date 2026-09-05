// js/services/emailService.js
// Automatikus e-mail értesítő szolgáltatás számla nélküli terítésbe helyezett rendelésekhez
// Támogatja a Resend és Brevo tranzakciós E-mail API-kat natív fetch segítségével.

/**
 * Generál egy átlátható, modern HTML levelet a számla nélküli rendelésekről.
 * 
 * @param {Object} run - A terítés adatai (date, courier, company, sender, etc.)
 * @param {Array} missingOrders - A számla nélküli rendelések listája
 * @param {string} shopDomain - A Shopify domain a közvetlen rendelés linkekhez
 * @returns {string} HTML tartalom
 */
export function generateMissingInvoiceEmailHtml(run = {}, missingOrders = [], shopDomain = 'p4q0uj-2m.myshopify.com') {
    const courier = run.courier || 'Nem megadott';
    const date = run.date || 'Nem megadott';
    const company = run.company || 'Capsula';
    const orderCount = Array.isArray(missingOrders) ? missingOrders.length : 0;

    const ordersHtml = (missingOrders || []).map(order => {
        const orderIdClean = String(order.id || '').replace(/^#/, '');
        const shopifyUrl = `https://${shopDomain}/admin/orders/${order.shopifyId || order.numericId || orderIdClean}`;
        
        const customerName = order.shippingName || order.customerName || 'Névtelen vásárló';
        const billingName = order.billingName || customerName;
        const totalFormatted = order.totalAmount 
            ? `${new Intl.NumberFormat('hu-HU').format(order.totalAmount).replace(/\u00a0/g, ' ')} Ft` 
            : '0 Ft';
        
        const paymentMethod = order.isCOD 
            ? `Utánvét (${new Intl.NumberFormat('hu-HU').format(order.codAmount || 0).replace(/\u00a0/g, ' ')} Ft)` 
            : (order.isPaid ? 'Előre kifizetve' : 'Fizetetlen / Átutalás');

        const address = `${order.zip || ''} ${order.city || ''}, ${order.address1 || order.address || ''}`.trim();

        const itemsHtml = Array.isArray(order.items) && order.items.length > 0
            ? order.items.map(it => `<li style="margin-bottom: 2px;"><strong>${it.qty || 1} db</strong> - ${it.name || it.title || ''}</li>`).join('')
            : '<li style="color: #94a3b8;">Nincs tételinformáció</li>';

        return `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap;">
                    <div style="font-size: 18px; font-weight: 700; color: #0f172a;">
                        <a href="${shopifyUrl}" target="_blank" style="color: #0284c7; text-decoration: none;">
                            ${order.id || `#${orderIdClean}`} ↗
                        </a>
                        <span style="font-size: 13px; font-weight: 600; color: #ef4444; background: #fee2e2; padding: 2px 8px; border-radius: 4px; margin-left: 8px;">
                            HIÁNYZÓ SZÁMLA
                        </span>
                    </div>
                    <div style="font-size: 16px; font-weight: 700; color: #0f172a;">
                        ${totalFormatted}
                    </div>
                </div>

                <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 12px;">
                    <tr>
                        <td style="padding: 4px 0; color: #64748b; width: 140px;">Címzett neve:</td>
                        <td style="padding: 4px 0; font-weight: 600; color: #1e293b;">${customerName}</td>
                    </tr>
                    ${billingName && billingName !== customerName ? `
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;">Számlázási név:</td>
                        <td style="padding: 4px 0; font-weight: 600; color: #b91c1c;">${billingName} (Külön számlázási név!)</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;">Szállítási cím:</td>
                        <td style="padding: 4px 0; color: #334155;">${address || '-'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;">Fizetési státusz:</td>
                        <td style="padding: 4px 0; font-weight: 600; color: #334155;">${paymentMethod}</td>
                    </tr>
                    ${order.note ? `
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;">Megjegyzés:</td>
                        <td style="padding: 4px 0; color: #b45309; font-style: italic;">${order.note}</td>
                    </tr>
                    ` : ''}
                </table>

                <div style="background: #f8fafc; border-radius: 6px; padding: 10px 14px; font-size: 12.5px; color: #334155;">
                    <strong style="color: #475569; display: block; margin-bottom: 4px;">Rendelt tételek:</strong>
                    <ul style="margin: 0; padding-left: 18px;">
                        ${itemsHtml}
                    </ul>
                </div>
            </div>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Számla nélküli rendelés került terítésbe</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a;">
    <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
        <!-- Fejléc -->
        <div style="background: linear-gradient(135deg, #b91c1c 0%, #ef4444 100%); color: #ffffff; padding: 24px 28px;">
            <div style="font-size: 24px; font-weight: 800; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                ⚠️ Figyelem: Számla nélküli rendelés terítésben!
            </div>
            <p style="margin: 0; font-size: 14px; opacity: 0.95; line-height: 1.4;">
                Az alábbi <strong>${orderCount} db</strong> rendelés terítésbe (kiszállítási jegyzékbe) lett mentve, de még <strong>nincs kiállítva a számlája</strong> (hiányzik a "számla ki" címke)!
            </p>
        </div>

        <!-- Terítés Info Doboz -->
        <div style="padding: 20px 28px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 0.5px;">
                Terítés Adatai
            </div>
            <div style="display: flex; gap: 24px; flex-wrap: wrap; font-size: 14px;">
                <div><strong>📅 Kiszállítás napja:</strong> <span style="color: #0284c7; font-weight: 600;">${date}</span></div>
                <div><strong>🚚 Szállító:</strong> <span style="font-weight: 600;">${courier}</span></div>
                <div><strong>🏢 Cég:</strong> <span style="font-weight: 600;">${company}</span></div>
            </div>
        </div>

        <!-- Rendelések listája -->
        <div style="padding: 24px 28px; background: #fafafa;">
            <div style="font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 14px;">
                Érintett rendelések (${orderCount} db):
            </div>
            ${ordersHtml}
        </div>

        <!-- Teendő / Lábléc -->
        <div style="padding: 18px 28px; background: #ffffff; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5; text-align: center;">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #ef4444;">
                Kérlek mielőbb állítsd ki a számlát és add hozzá a rendeléshez a "számla ki" taget a Shopify-ban!
            </p>
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Ez egy automatikus biztonsági értesítés a Kiszedési Jegyzék és Shopify Hub rendszerből.
            </p>
        </div>
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
    const subject = `⚠️ Számla nélküli rendelés terítésben (${orderCount} db: ${orderNumbers}) - ${run.courier || 'Terítés'}`;
    const htmlContent = generateMissingInvoiceEmailHtml(run, missingOrders, shopDomain);

    // Ha nincs megadva API kulcs, szimulált módban futunk (nem dob hibát!)
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_') || apiKey === 're_123456789') {
        console.log(`ℹ️ [EmailService - Szimulált Mód] Levél küldése szimulálva:`);
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
                console.log(`✅ [EmailService - Resend] Értesítő levél sikeresen elküldve (${to}), ID: ${data.id}`);
                return { success: true, id: data.id, service: 'resend' };
            } else {
                // Intelligens kezelés: Ha a Resend teszt módban van (még nincs saját domain verifikálva a resend.com/domains alatt)
                if (data.message && data.message.includes('You can only send testing emails to your own email address')) {
                    const match = data.message.match(/your own email address \(([^)]+)\)/);
                    const fallbackTo = match && match[1] ? match[1] : null;

                    if (fallbackTo && fallbackTo !== to) {
                        console.warn(`⚠️ [EmailService - Resend Domain Figyelmeztetés] A ${to} címre közvetlenül küldéshez a saját domain hitelesítése szükséges a resend.com/domains alatt.`);
                        console.log(`🔄 [EmailService - Resend Fallback] Levél azonnali elküldése a regisztrált fiókcímedre (${fallbackTo})...`);

                        const fallbackNoticeHtml = `
                            <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; color: #92400e; line-height: 1.4;">
                                <strong>ℹ️ Resend Teszt Mód:</strong> Ez az értesítő eredetileg az <code>${to}</code> címre szólt. Amíg a <code>panelburkolat.com</code> domaint nem hitelesíted a <a href="https://resend.com/domains" target="_blank" style="color: #b45309; font-weight: bold; text-decoration: underline;">resend.com/domains</a> alatt, a Resend a regisztrált fiókcímedre (<strong>${fallbackTo}</strong>) kézbesíti a leveleket.
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
                                console.log(`✅ [EmailService - Resend Kézbesítve] Értesítő levél elküldve (${fallbackTo}), ID: ${fallbackData.id}`);
                                return { success: true, id: fallbackData.id, service: 'resend', forwardedTo: fallbackTo };
                            }
                        } catch (fallbackErr) {
                            console.error(`❌ [EmailService - Resend Fallback Hiba]`, fallbackErr);
                        }
                    }
                }

                console.error(`❌ [EmailService - Resend Hiba]`, data);
                return { success: false, error: data.message || JSON.stringify(data), service: 'resend' };
            }
        } catch (err) {
            console.error(`❌ [EmailService - Hálózati hiba Resend híváskor]`, err);
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
                console.log(`✅ [EmailService - Brevo] Értesítő levél sikeresen elküldve (${to}), ID: ${data.messageId || data.messageIds}`);
                return { success: true, id: data.messageId || data.messageIds, service: 'brevo' };
            } else {
                console.error(`❌ [EmailService - Brevo Hiba]`, data);
                return { success: false, error: data.message || JSON.stringify(data), service: 'brevo' };
            }
        } catch (err) {
            console.error(`❌ [EmailService - Hálózati hiba Brevo híváskor]`, err);
            return { success: false, error: err.message, service: 'brevo' };
        }
    }

    return { success: false, error: `Ismeretlen email szolgáltatás: ${service}` };
}

export const EmailService = {
    generateMissingInvoiceEmailHtml,
    sendMissingInvoiceAlertEmail
};
