const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.svg': 'image/svg+xml'
};

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        process.env[key] = val;
      }
    }
  }
}

function saveAccessToken(token) {
  process.env.SHOPIFY_ACCESS_TOKEN = token;
  const envPath = path.join(__dirname, '.env');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
    if (content.includes('SHOPIFY_ACCESS_TOKEN=')) {
      content = content.replace(/SHOPIFY_ACCESS_TOKEN=.*(\r?\n|$)/, `SHOPIFY_ACCESS_TOKEN=${token}$1`);
    } else {
      content += `\nSHOPIFY_ACCESS_TOKEN=${token}\n`;
    }
  } else {
    content = `SHOPIFY_ACCESS_TOKEN=${token}\n`;
  }
  fs.writeFileSync(envPath, content, 'utf8');
  console.log('✅ Shopify Access Token sikeresen elmentve a .env fájlba!');
}

loadEnv();

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // --- API VÉGPONTOK ---

  // 1. Shopify OAuth Indítás
  if (pathname === '/api/shopify/auth') {
    const shop = process.env.SHOPIFY_SHOP || '';
    const clientId = process.env.SHOPIFY_CLIENT_ID || '';
    const scopes = process.env.SHOPIFY_SCOPES || 'read_all_orders,read_orders,write_orders,read_products,read_customers,write_customers,read_fulfillments,write_fulfillments,read_merchant_managed_fulfillment_orders,write_merchant_managed_fulfillment_orders,read_assigned_fulfillment_orders,write_assigned_fulfillment_orders,read_third_party_fulfillment_orders,write_third_party_fulfillment_orders,read_locations';
    const host = req.headers.host || 'localhost:8080';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const redirectUri = `${protocol}://${host}/api/auth/callback`;
    const state = Math.random().toString(36).substring(2);

    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    
    console.log(`[Shopify Auth] Átirányítás ide: ${authUrl}`);
    res.writeHead(302, { Location: authUrl });
    res.end();
    return;
  }

  // 2. Shopify OAuth Callback (Token csere)
  if (pathname === '/api/auth/callback') {
    const code = parsedUrl.query.code;
    const shop = process.env.SHOPIFY_SHOP || '';
    const clientId = process.env.SHOPIFY_CLIENT_ID || '';
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || '';

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>❌ Hiba: Nem érkezett autorizációs kód a Shopify-tól!</h1>');
      return;
    }

    try {
      console.log(`[Shopify Callback] Kód beváltása access tokenre: ${shop}`);
      const tokenUrl = `https://${shop}/admin/oauth/access_token`;
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code
        })
      });

      const data = await response.json();
      if (data.access_token) {
        saveAccessToken(data.access_token);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Shopify Csatlakoztatva</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: rgba(30, 41, 59, 0.9); padding: 40px; border-radius: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.5); max-width: 500px; }
              h1 { color: #10b981; margin-bottom: 12px; }
              p { color: #94a3b8; font-size: 16px; line-height: 1.5; }
              .btn { display: inline-block; margin-top: 24px; padding: 12px 28px; background: #2563eb; color: white; border-radius: 10px; text-decoration: none; font-weight: bold; }
              .token-box { background: #020617; padding: 12px; border-radius: 8px; font-family: monospace; color: #38bdf8; font-size: 13px; word-break: break-all; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>🎉 Sikeres Kapcsolódás!</h1>
              <p>A Shopify boltod (<strong>${shop}</strong>) sikeresen összekapcsolódott a Kiszedési Jegyzék rendszerrel.</p>
              <div class="token-box">Access Token: ${data.access_token.substring(0, 10)}... (Elmentve a .env-be)</div>
              <p>Átirányítás 3 másodpercen belül a rendszerbe...</p>
              <a class="btn" href="/?shopify_connected=true">Vissza az Alkalmazásba</a>
            </div>
            <script>
              setTimeout(() => {
                window.location.href = '/?shopify_connected=true';
              }, 3000);
            </script>
          </body>
          </html>
        `);
        return;
      } else {
        throw new Error(JSON.stringify(data));
      }
    } catch (err) {
      console.error('[Shopify Callback Error]', err);
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>❌ Hiba történt a token beszerzésekor:</h1><pre>${err.message}</pre><a href="/">Vissza</a>`);
      return;
    }
  }

  // 3. Shopify Státusz Lekérdezés
  if (pathname === '/api/shopify/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      connected: !!process.env.SHOPIFY_ACCESS_TOKEN,
      shop: process.env.SHOPIFY_SHOP || 'p4q0uj-2m.myshopify.com',
      tokenPreview: process.env.SHOPIFY_ACCESS_TOKEN ? `${process.env.SHOPIFY_ACCESS_TOKEN.substring(0, 8)}...` : null
    }));
    return;
  }

  // 4. Shopify Élő Rendelések Lekérése
  if (pathname === '/api/shopify/orders') {
    const token = process.env.SHOPIFY_ACCESS_TOKEN;
    const shop = process.env.SHOPIFY_SHOP || 'p4q0uj-2m.myshopify.com';

    if (!token) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Nincs érvényes Shopify Access Token. Kérlek csatlakoztasd a boltot!' }));
      return;
    }

    try {
      const statusParam = parsedUrl.query.status || 'any';
      const fulfillmentStatusParam = parsedUrl.query.fulfillment_status || 'any';
      const limit = parsedUrl.query.limit || '250';
      const fields = [
        'id', 'name', 'created_at', 'tags', 'financial_status', 'fulfillment_status',
        'total_price', 'total_outstanding', 'current_total_price', 'current_total_outstanding',
        'subtotal_price', 'total_shipping_price_set', 'total_tax', 'currency',
        'customer', 'shipping_address', 'billing_address', 'line_items', 'shipping_lines',
        'note', 'note_attributes', 'payment_gateway_names', 'cancelled_at'
      ].join(',');

      // Segédfüggvény Shopify lapozásos lekéréshez (Link rel="next" támogatással)
      async function fetchPagedOrders(initialUrl, maxPages = 10) {
        let results = [];
        let nextUrl = initialUrl;
        let pageCount = 0;
        while (nextUrl && pageCount < maxPages) {
          pageCount++;
          console.log(`[Shopify API] Lapozás (${pageCount}. oldal): ${nextUrl}`);
          const res = await fetch(nextUrl, {
            headers: {
              'X-Shopify-Access-Token': token,
              'Content-Type': 'application/json'
            }
          });
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Shopify API hiba (${res.status}): ${errText}`);
          }
          const data = await res.json();
          const pagedOrders = data.orders || [];
          results = results.concat(pagedOrders);

          const linkHeader = res.headers.get('link') || res.headers.get('Link');
          nextUrl = null;
          if (linkHeader) {
            const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/i);
            if (match) {
              nextUrl = match[1];
            }
          }
        }
        return results;
      }

      // Párhuzamosan lekérjük:
      // 1. Az összes nyitott/unfulfilled rendelést (akár 100+ vagy 250+ darab)
      // 2. Az összes részleges (partial) rendelést
      // 3. A legutóbbi 250 általános rendelést (fulfilled archívum)
      // 4. A termékképeket
      const [unfulfilledOrders, partialOrders, recentAnyOrders, productsRes] = await Promise.all([
        fetchPagedOrders(`https://${shop}/admin/api/2024-04/orders.json?status=any&fulfillment_status=unfulfilled&limit=250&fields=${fields}`, 10),
        fetchPagedOrders(`https://${shop}/admin/api/2024-04/orders.json?status=any&fulfillment_status=partial&limit=250&fields=${fields}`, 10),
        fetchPagedOrders(`https://${shop}/admin/api/2024-04/orders.json?status=any&limit=250&fields=${fields}`, 1),
        fetch(`https://${shop}/admin/api/2024-04/products.json?limit=250&fields=id,image,images,variants`, {
          headers: {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json'
          }
        }).catch(err => {
          console.warn('[Shopify Products Image Error]', err);
          return null;
        })
      ]);

      // Összefésülés és deduplikálás ID szerint
      const orderMap = new Map();
      [...unfulfilledOrders, ...partialOrders, ...recentAnyOrders].forEach(o => {
        if (o && o.id && !orderMap.has(o.id)) {
          orderMap.set(o.id, o);
        }
      });

      // Rendezés dátum szerint csökkenőbe (legújabb legfelül)
      const orders = Array.from(orderMap.values()).sort((a, b) => {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });

      console.log(`[Shopify API] Összesen összefésülve: ${orders.length} rendelés (Unfulfilled: ${unfulfilledOrders.length}, Partial: ${partialOrders.length})`);

      // Személyes átvételes / Ready for pickup események lekérdezése GraphQL-lel az ÖSSZES nyitott rendeléshez (lapozással)
      try {
        const readyOrderNames = new Set();
        let hasNext = true;
        let cursor = null;
        let page = 0;

        while (hasNext && page < 5) {
          page++;
          const afterParam = cursor ? `, after: "${cursor}"` : '';
          const eventsQuery = `
            query {
              orders(first: 250, query: "status:open", sortKey: CREATED_AT, reverse: true${afterParam}) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                edges {
                  node {
                    id
                    name
                    tags
                    displayFulfillmentStatus
                    fulfillmentOrders(first: 5) {
                      edges {
                        node {
                          status
                          requestStatus
                          deliveryMethod {
                            methodType
                          }
                        }
                      }
                    }
                    events(first: 10) {
                      edges {
                        node {
                          message
                        }
                      }
                    }
                  }
                }
              }
            }
          `;
          const gqlRes = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
            method: 'POST',
            headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: eventsQuery })
          });
          if (gqlRes.ok) {
            const gqlData = await gqlRes.json();
            const ordersData = gqlData.data && gqlData.data.orders;
            const edges = (ordersData && ordersData.edges) || [];
            
            for (const edge of edges) {
              const node = edge.node;
              const hasReadyEmail = (node.events && node.events.edges || []).some(e => /ready for pickup|átvehető/i.test(e.node.message || ''));
              const hasReadyTag = (node.tags || []).some(t => /ready for pickup|átvehető|atveheto/i.test(t));
              const hasReadyFO = (node.fulfillmentOrders && node.fulfillmentOrders.edges || []).some(foEdge => {
                const fo = foEdge.node;
                const isPickupMethod = fo.deliveryMethod && (fo.deliveryMethod.methodType === 'PICK_UP' || fo.deliveryMethod.methodType === 'PICKUP' || fo.deliveryMethod.methodType === 'LOCAL_PICKUP');
                const isReadyStatus = fo.status === 'IN_PROGRESS' || fo.status === 'in_progress' || fo.requestStatus === 'PREPARED';
                return isPickupMethod && isReadyStatus;
              });
              const isDisplayReady = String(node.displayFulfillmentStatus || '').toUpperCase() === 'READY_FOR_PICKUP';

              if (hasReadyEmail || hasReadyTag || hasReadyFO || isDisplayReady) {
                readyOrderNames.add(node.name);
                readyOrderNames.add(String(node.id).replace('gid://shopify/Order/', ''));
              }
            }

            hasNext = ordersData && ordersData.pageInfo && ordersData.pageInfo.hasNextPage;
            cursor = ordersData && ordersData.pageInfo && ordersData.pageInfo.endCursor;
          } else {
            hasNext = false;
          }
        }

        orders.forEach(o => {
          if (readyOrderNames.has(String(o.name)) || readyOrderNames.has(String(o.id))) {
            o.is_ready_for_pickup = true;
          }
        });

        console.log(`🟣 [Ready for pickup Felismerve] Összesen ${readyOrderNames.size} rendelés átvehetőre állítva a boltban.`);
      } catch (eErr) {
        console.warn('[Shopify Events ReadyForPickup Warning]', eErr.message);
      }

      // Termékképek feltérképezése
      let productImageMap = {};
      let variantImageMap = {};
      if (productsRes && productsRes.ok) {
        const prodData = await productsRes.json().catch(() => ({}));
        (prodData.products || []).forEach(p => {
          const mainImg = p.image ? p.image.src : (p.images && p.images[0] ? p.images[0].src : null);
          if (mainImg) productImageMap[p.id] = mainImg;

          (p.variants || []).forEach(v => {
            if (v.image_id && p.images) {
              const matched = p.images.find(img => img.id === v.image_id);
              if (matched) variantImageMap[v.id] = matched.src;
            }
          });
        });
      }

      // Képek csatolása a tételekhez
      orders.forEach(order => {
        (order.line_items || []).forEach(item => {
          item.image_url = variantImageMap[item.variant_id] || productImageMap[item.product_id] || null;
        });
      });

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(JSON.stringify({
        success: true,
        ordersCount: orders.length,
        orders: orders
      }));
      return;
    } catch (err) {
      console.error('[Shopify Orders Error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // 4. Shopify Egyedi Rendelés Teljesítés (Fulfillment)
  if (pathname === '/api/shopify/fulfill' && req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const token = process.env.SHOPIFY_ACCESS_TOKEN;
        const shop = process.env.SHOPIFY_SHOP || 'p4q0uj-2m.myshopify.com';

        if (!token) {
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Nincs érvényes Shopify Access Token!' }));
          return;
        }

        const body = JSON.parse(bodyStr || '{}');
        let orderId = body.orderId;
        let shopifyId = body.shopifyId;
        const notifyCustomer = body.notifyCustomer !== false;
        const trackingNumber = body.trackingNumber || '';
        const trackingCompany = body.trackingCompany || '';

        // Ha csak a 4 jegyű rendelésszám van megadva (#3892 vagy 3892)
        if (!shopifyId && orderId) {
          const cleanNum = String(orderId).replace(/^#/, '').trim();
          const findUrl = `https://${shop}/admin/api/2024-04/orders.json?name=${encodeURIComponent('#' + cleanNum)}&status=any&limit=1&fields=id,name`;
          const findRes = await fetch(findUrl, {
            headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
          });
          const findData = await findRes.json();
          if (findData.orders && findData.orders.length > 0) {
            shopifyId = findData.orders[0].id;
          }
        }

        if (!shopifyId) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Nem található a rendelés azonosítója (Shopify ID).' }));
          return;
        }

        // 1. Fulfillment Orders lekérdezése
        const foUrl = `https://${shop}/admin/api/2024-04/orders/${shopifyId}/fulfillment_orders.json`;
        const foRes = await fetch(foUrl, {
          headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
        });
        const foData = await foRes.json();

        if (!foData.fulfillment_orders || foData.fulfillment_orders.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ 
            error: 'Ehhez a rendeléshez nem található teljesíthető tétel (Fulfillment Order). Lehet, hogy már teljesítve van vagy törölték.',
            details: foData
          }));
          return;
        }

        const openFos = foData.fulfillment_orders.filter(fo => fo.status === 'open' || fo.status === 'in_progress');
        if (openFos.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ 
            error: 'A rendelés már teljesen le van zárva / teljesítve a Shopify-ban!',
            details: foData.fulfillment_orders.map(fo => ({ id: fo.id, status: fo.status }))
          }));
          return;
        }

        // 2. Fulfillment létrehozása
        const fulfillmentPayload = {
          fulfillment: {
            line_items_by_fulfillment_order: openFos.map(fo => ({
              fulfillment_order_id: fo.id
            })),
            notify_customer: notifyCustomer
          }
        };

        if (trackingNumber) {
          fulfillmentPayload.fulfillment.tracking_info = {
            number: trackingNumber,
            company: trackingCompany || 'Pannon XP'
          };
        }

        const fulfillUrl = `https://${shop}/admin/api/2024-04/fulfillments.json`;
        const fulfillRes = await fetch(fulfillUrl, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fulfillmentPayload)
        });

        const fulfillResult = await fulfillRes.json();

        if (fulfillRes.ok && fulfillResult.fulfillment) {
          console.log(`✅ [Shopify Fulfillment] Rendelés (${orderId || shopifyId}) sikeresen teljesítve!`);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            orderId: orderId,
            shopifyId: shopifyId,
            fulfillment: fulfillResult.fulfillment
          }));
          return;
        } else {
          console.error(`❌ [Shopify Fulfillment Hiba]`, fulfillResult);
          res.writeHead(fulfillRes.status || 400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            error: fulfillResult.errors ? JSON.stringify(fulfillResult.errors) : 'Hiba történt a teljesítés során.',
            details: fulfillResult
          }));
          return;
        }
      } catch (err) {
        console.error('[Shopify Fulfill Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    });
    return;
  }

  // 5. Shopify Csoportos Rendelés Teljesítés (Bulk Fulfillment)
  if (pathname === '/api/shopify/bulk-fulfill' && req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const token = process.env.SHOPIFY_ACCESS_TOKEN;
        const shop = process.env.SHOPIFY_SHOP || 'p4q0uj-2m.myshopify.com';

        if (!token) {
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Nincs érvényes Shopify Access Token!' }));
          return;
        }

        const body = JSON.parse(bodyStr || '{}');
        const ordersToFulfill = body.orders || []; // [{ orderId, shopifyId }]
        const notifyCustomer = body.notifyCustomer !== false;

        if (!Array.isArray(ordersToFulfill) || ordersToFulfill.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Nem lett megadva teljesítendő rendeléslista.' }));
          return;
        }

        const results = {
          total: ordersToFulfill.length,
          successCount: 0,
          failedCount: 0,
          successfulIds: [],
          errors: []
        };

        for (const item of ordersToFulfill) {
          let sId = item.shopifyId;
          const oId = item.orderId || sId;

          try {
            if (!sId && oId) {
              const cleanNum = String(oId).replace(/^#/, '').trim();
              const findUrl = `https://${shop}/admin/api/2024-04/orders.json?name=${encodeURIComponent('#' + cleanNum)}&status=any&limit=1&fields=id`;
              const findRes = await fetch(findUrl, {
                headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
              });
              const findData = await findRes.json();
              if (findData.orders && findData.orders.length > 0) {
                sId = findData.orders[0].id;
              }
            }

            if (!sId) {
              results.failedCount++;
              results.errors.push({ orderId: oId, error: 'Shopify azonosító nem található.' });
              continue;
            }

            // FO lekérés
            const foUrl = `https://${shop}/admin/api/2024-04/orders/${sId}/fulfillment_orders.json`;
            const foRes = await fetch(foUrl, {
              headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
            });
            const foData = await foRes.json();

            const openFos = (foData.fulfillment_orders || []).filter(fo => fo.status === 'open' || fo.status === 'in_progress');
            if (openFos.length === 0) {
              results.failedCount++;
              results.errors.push({ orderId: oId, error: 'Nincs nyitott teljesíthető tétel.' });
              continue;
            }

            // Fulfill küldés
            const fulfillPayload = {
              fulfillment: {
                line_items_by_fulfillment_order: openFos.map(fo => ({ fulfillment_order_id: fo.id })),
                notify_customer: notifyCustomer
              }
            };

            const fulfillUrl = `https://${shop}/admin/api/2024-04/fulfillments.json`;
            const fulfillRes = await fetch(fulfillUrl, {
              method: 'POST',
              headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
              body: JSON.stringify(fulfillPayload)
            });

            if (fulfillRes.ok) {
              results.successCount++;
              results.successfulIds.push(oId);
            } else {
              const errBody = await fulfillRes.json();
              results.failedCount++;
              results.errors.push({ orderId: oId, error: errBody.errors ? JSON.stringify(errBody.errors) : 'API hiba' });
            }
          } catch (e) {
            results.failedCount++;
            results.errors.push({ orderId: oId, error: e.message });
          }
        }

        console.log(`📦 [Bulk Fulfillment Kész] Összes: ${results.total}, Sikeres: ${results.successCount}, Hibás: ${results.failedCount}`);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          ...results
        }));
        return;
      } catch (err) {
        console.error('[Shopify Bulk Fulfill Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    });
    return;
  }

  // 6. Shopify Címkék (Tags) Frissítése (Egyedi & Csoportos)
  if (pathname === '/api/shopify/update-tags' && req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const token = process.env.SHOPIFY_ACCESS_TOKEN;
        const shop = process.env.SHOPIFY_SHOP || 'p4q0uj-2m.myshopify.com';

        if (!token) {
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Nincs érvényes Shopify Access Token!' }));
          return;
        }

        const body = JSON.parse(bodyStr || '{}');
        const ordersList = body.orders || (body.orderId || body.shopifyId ? [{ orderId: body.orderId, shopifyId: body.shopifyId }] : []);
        const addTag = body.addTag ? String(body.addTag).trim() : '';
        const removeTag = body.removeTag ? String(body.removeTag).trim() : '';

        if (!Array.isArray(ordersList) || ordersList.length === 0 || (!addTag && !removeTag)) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Érvénytelen kérés: rendelések vagy módosítandó címke hiányzik.' }));
          return;
        }

        const results = {
          total: ordersList.length,
          successCount: 0,
          failedCount: 0,
          updatedOrders: [],
          errors: []
        };

        for (const item of ordersList) {
          let sId = item.shopifyId;
          const oId = item.orderId || sId;

          try {
            if (!sId && oId) {
              const cleanNum = String(oId).replace(/^#/, '').trim();
              const findUrl = `https://${shop}/admin/api/2024-04/orders.json?name=${encodeURIComponent('#' + cleanNum)}&status=any&limit=1&fields=id,tags`;
              const findRes = await fetch(findUrl, {
                headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
              });
              const findData = await findRes.json();
              if (findData.orders && findData.orders.length > 0) {
                sId = findData.orders[0].id;
                item.currentTags = findData.orders[0].tags;
              }
            }

            if (!sId) {
              results.failedCount++;
              results.errors.push({ orderId: oId, error: 'Shopify azonosító nem található.' });
              continue;
            }

            // Ha nincs meg a jelenlegi tags string, lekérjük
            let currentTagsStr = item.currentTags;
            if (currentTagsStr === undefined) {
              const getUrl = `https://${shop}/admin/api/2024-04/orders/${sId}.json?fields=id,tags`;
              const getRes = await fetch(getUrl, {
                headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
              });
              const getData = await getRes.json();
              currentTagsStr = (getData.order && getData.order.tags) || '';
            }

            let tagsArr = currentTagsStr.split(',').map(t => t.trim()).filter(Boolean);

            if (addTag) {
              const exists = tagsArr.some(t => t.toLowerCase() === addTag.toLowerCase());
              if (!exists) {
                tagsArr.push(addTag);
              }
            }

            if (removeTag) {
              tagsArr = tagsArr.filter(t => t.toLowerCase() !== removeTag.toLowerCase());
            }

            const newTagsStr = tagsArr.join(', ');

            // PUT kérés a Shopify-nak
            const putUrl = `https://${shop}/admin/api/2024-04/orders/${sId}.json`;
            const putRes = await fetch(putUrl, {
              method: 'PUT',
              headers: {
                'X-Shopify-Access-Token': token,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                order: {
                  id: sId,
                  tags: newTagsStr
                }
              })
            });

            if (putRes.ok) {
              results.successCount++;
              results.updatedOrders.push({ orderId: oId, shopifyId: sId, tags: newTagsStr });
            } else {
              const errBody = await putRes.json();
              results.failedCount++;
              results.errors.push({ orderId: oId, error: errBody.errors ? JSON.stringify(errBody.errors) : 'Tag frissítési hiba' });
            }
          } catch (e) {
            results.failedCount++;
            results.errors.push({ orderId: oId, error: e.message });
          }
        }

        console.log(`🏷️ [Shopify Tags Frissítve] Összes: ${results.total}, Sikeres: ${results.successCount}, Hibás: ${results.failedCount}`);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          ...results
        }));
        return;
      } catch (err) {
        console.error('[Shopify Update Tags Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    });
    return;
  }

  // 7. Shopify Személyes Átvétel (Ready for Pickup / Átvehetőre Állítás)
  if (pathname === '/api/shopify/ready-for-pickup' && req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const token = process.env.SHOPIFY_ACCESS_TOKEN;
        const shop = process.env.SHOPIFY_SHOP || 'p4q0uj-2m.myshopify.com';

        if (!token) {
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Nincs érvényes Shopify Access Token!' }));
          return;
        }

        const body = JSON.parse(bodyStr || '{}');
        const ordersList = body.orders || (body.orderId || body.shopifyId ? [{ orderId: body.orderId, shopifyId: body.shopifyId }] : []);

        if (!Array.isArray(ordersList) || ordersList.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Nincs megadva rendelés.' }));
          return;
        }

        const results = {
          total: ordersList.length,
          successCount: 0,
          failedCount: 0,
          updatedOrders: [],
          errors: []
        };

        for (const item of ordersList) {
          let sId = item.shopifyId;
          const oId = item.orderId || sId;

          try {
            if (!sId && oId) {
              const cleanNum = String(oId).replace(/^#/, '').trim();
              const findUrl = `https://${shop}/admin/api/2024-04/orders.json?name=${encodeURIComponent('#' + cleanNum)}&status=any&limit=1&fields=id,tags`;
              const findRes = await fetch(findUrl, {
                headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
              });
              const findData = await findRes.json();
              if (findData.orders && findData.orders.length > 0) {
                sId = findData.orders[0].id;
                if (item.currentTags === undefined) {
                  item.currentTags = findData.orders[0].tags;
                }
              }
            }

            if (!sId) {
              results.failedCount++;
              results.errors.push({ orderId: oId, error: 'Shopify ID nem található' });
              continue;
            }

            // 1. Natív Shopify Fulfillment Order Prepared for Pickup átállítás (GraphQL)
            let nativePickupMarked = false;
            let errorMessage = null;
            try {
              const foUrl = `https://${shop}/admin/api/2024-04/orders/${sId}/fulfillment_orders.json`;
              const foRes = await fetch(foUrl, {
                headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
              });
              const foData = await foRes.json();

              if (foData.fulfillment_orders && foData.fulfillment_orders.length > 0) {
                for (const fo of foData.fulfillment_orders) {
                  if (fo.status === 'open') {
                    const pickupGql = `
                      mutation preparedForPickup($input: FulfillmentOrderLineItemsPreparedForPickupInput!) {
                        fulfillmentOrderLineItemsPreparedForPickup(input: $input) {
                          userErrors {
                            field
                            message
                          }
                        }
                      }
                    `;
                    const gqlRes = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
                      method: 'POST',
                      headers: {
                        'X-Shopify-Access-Token': token,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        query: pickupGql,
                        variables: {
                          input: {
                            lineItemsByFulfillmentOrder: [
                              {
                                fulfillmentOrderId: `gid://shopify/FulfillmentOrder/${fo.id}`
                              }
                            ]
                          }
                        }
                      })
                    });
                    const gqlData = await gqlRes.json();
                    if (gqlData.data && gqlData.data.fulfillmentOrderLineItemsPreparedForPickup && (!gqlData.data.fulfillmentOrderLineItemsPreparedForPickup.userErrors || gqlData.data.fulfillmentOrderLineItemsPreparedForPickup.userErrors.length === 0)) {
                      nativePickupMarked = true;
                      console.log(`🟣 [Shopify Ready for Pickup] Fulfillment Order (${fo.id}) sikeresen átállítva átvehetőre!`);
                    } else {
                      const userErrors = gqlData.data?.fulfillmentOrderLineItemsPreparedForPickup?.userErrors;
                      const userErrMsg = userErrors && userErrors.map(e => e.message).join(', ');
                      errorMessage = userErrMsg || (gqlData.errors && gqlData.errors.map(e => e.message).join(', ')) || 'GraphQL hiba';
                      console.warn(`[FO Ready for Pickup GQL Warning for ${oId}]:`, errorMessage);
                    }
                  } else if (fo.status === 'in_progress') {
                    nativePickupMarked = true;
                  }
                }
              } else {
                errorMessage = 'Nem található nyitott Fulfillment Order ehhez a rendeléshez.';
              }
            } catch (foErr) {
              errorMessage = foErr.message;
              console.warn(`[FO Ready For Pickup Warning for ${oId}]:`, foErr.message);
            }

            if (nativePickupMarked) {
              results.successCount++;
              results.updatedOrders.push({ orderId: oId, shopifyId: sId, nativePickupMarked: true });
            } else {
              results.failedCount++;
              results.errors.push({ orderId: oId, error: errorMessage || 'Nem sikerült átállítani a rendelést átvehetőre a Shopify-ban.' });
            }
          } catch (e) {
            results.failedCount++;
            results.errors.push({ orderId: oId, error: e.message });
          }
        }

        console.log(`🟣 [Ready for pickup Kész] Összes: ${results.total}, Sikeres: ${results.successCount}, Hibás: ${results.failedCount}`);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          ...results
        }));
        return;
      } catch (err) {
        console.error('[Shopify Ready for pickup Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    });
    return;
  }

  // 8. Shopify Megjegyzés (Note) Frissítése
  if (pathname === '/api/shopify/update-note' && req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const token = process.env.SHOPIFY_ACCESS_TOKEN;
        const shop = process.env.SHOPIFY_SHOP || 'p4q0uj-2m.myshopify.com';

        if (!token) {
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Nincs érvényes Shopify Access Token!' }));
          return;
        }

        const body = JSON.parse(bodyStr || '{}');
        const orderId = body.orderId;
        let shopifyId = body.shopifyId;
        const note = typeof body.note === 'string' ? body.note : '';

        if (!shopifyId && orderId) {
          const cleanNum = String(orderId).replace(/^#/, '').trim();
          const findUrl = `https://${shop}/admin/api/2024-04/orders.json?name=${encodeURIComponent('#' + cleanNum)}&status=any&limit=1&fields=id`;
          const findRes = await fetch(findUrl, {
            headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
          });
          const findData = await findRes.json();
          if (findData.orders && findData.orders.length > 0) {
            shopifyId = findData.orders[0].id;
          }
        }

        if (!shopifyId) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Shopify azonosító nem található.' }));
          return;
        }

        const putUrl = `https://${shop}/admin/api/2024-04/orders/${shopifyId}.json`;
        const putRes = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            order: {
              id: shopifyId,
              note: note
            }
          })
        });

        const putData = await putRes.json();
        if (putRes.ok && putData.order) {
          console.log(`📝 [Shopify Note Frissítve] Rendelés: ${orderId || shopifyId}, Megjegyzés hossza: ${note.length} karakter`);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            orderId: orderId,
            shopifyId: shopifyId,
            note: putData.order.note
          }));
          return;
        } else {
          const errBody = putData.errors ? JSON.stringify(putData.errors) : 'Megjegyzés mentési hiba';
          res.writeHead(putRes.status || 400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: errBody }));
          return;
        }
      } catch (err) {
        console.error('[Shopify Update Note Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    });
    return;
  }

  // --- STATIKUS FÁJLOK KISZOLGÁLÁSA ---
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, pathname);
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code == 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found - A fájl nem található: ' + pathname);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Szerver hiba: ' + err.code);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Szerver fut: http://localhost:${PORT}/`);
  console.log(`🔗 Shopify Auth URL: http://localhost:${PORT}/api/shopify/auth`);
});
