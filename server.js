const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { handleShopifyRoute } = require('./server/shopifyRoutes');

const PORT = process.env.PORT || 8080;
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
 console.log(' Shopify Access Token sikeresen elmentve a .env fájlba!');
}

loadEnv();

let orderUtilsModule = null;
async function getOrderUtils() {
 if (!orderUtilsModule) {
 orderUtilsModule = await import('./js/utils/orderUtils.js');
 }
 return orderUtilsModule;
}

let emailServiceModule = null;
async function getEmailService() {
 if (!emailServiceModule) {
 emailServiceModule = await import('./js/services/emailService.js');
 }
 return emailServiceModule;
}

let isPannonXpQueueRunning = false;

async function queuePannonXpAutoTagging(targetOrders, token, shop) {
 if (!token || !shop || !Array.isArray(targetOrders) || targetOrders.length === 0) return;
 if (isPannonXpQueueRunning) {
 console.log('[Auto PannonXP] Már fut egy címkéző háttérfolyamat, a mostani tételek várakoznak.');
 return;
 }

 console.log(` [Auto PannonXP Háttérfolyamat] ${targetOrders.length} db rendelés automatikus címkézése indul (PannonXP)...`);
 isPannonXpQueueRunning = true;

 setImmediate(async () => {
 try {
 for (const order of targetOrders) {
 try {
 const sId = order.id;
 const oName = order.name || `#${sId}`;

 let currentTagsStr = order.tags || '';
 let tagsArr = currentTagsStr.split(',').map(t => t.trim()).filter(Boolean);
 if (!tagsArr.some(t => t.toLowerCase() === 'pannonxp')) {
 tagsArr.push('PannonXP');
 }
 const newTagsStr = tagsArr.join(', ');

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
 order.tags = newTagsStr;
 console.log(` [Auto PannonXP] ${oName} sikeresen felcímkézve: "PannonXP"`);
 } else {
 const errData = await putRes.json().catch(() => ({}));
 console.warn(` [Auto PannonXP Hiba] ${oName}:`, errData.errors || putRes.statusText);
 }
 } catch (itemErr) {
 console.error(` [Auto PannonXP Kivétel] #${order.name || order.id}:`, itemErr.message);
 }

 // Kíméletes rate-limit: 600 ms szünet a Shopify API védelmében
 await new Promise(resolve => setTimeout(resolve, 600));
 }
 } catch (globalErr) {
 console.error(' [Auto PannonXP Globális Hiba]', globalErr);
 } finally {
 isPannonXpQueueRunning = false;
 console.log(' [Auto PannonXP Háttérfolyamat] Befejeződött.');
 }
 });
}

// ==========================================
// GYORSÍTÓTÁR ÉS PÁRHUZAMOS LEKÉRDEZÉS SEGÉDEK
// ==========================================

let productImagesCache = null;
let productImagesCacheTime = 0;
const PRODUCT_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 óra
const PRODUCT_CACHE_FILE = path.join(__dirname, '.tmp', 'products_cache.json');

// Termékképek gyorsítótárazott lekérése (Memória -> Lemez -> Shopify API)
async function getProductImageMaps(shop, token) {
 // 1. Memória gyorsítótár vizsgálata
 if (productImagesCache && (Date.now() - productImagesCacheTime < PRODUCT_CACHE_TTL_MS)) {
 return productImagesCache;
 }

 // 2. Helyi lemezes cache vizsgálata (.tmp/products_cache.json)
 try {
 if (fs.existsSync(PRODUCT_CACHE_FILE)) {
 const stat = fs.statSync(PRODUCT_CACHE_FILE);
 if (Date.now() - stat.mtimeMs < PRODUCT_CACHE_TTL_MS) {
 const fileData = JSON.parse(fs.readFileSync(PRODUCT_CACHE_FILE, 'utf8'));
 if (fileData && fileData.productImageMap && fileData.variantImageMap) {
 productImagesCache = fileData;
 productImagesCacheTime = stat.mtimeMs;
 return productImagesCache;
 }
 }
 }
 } catch (fErr) {
 console.warn('[Product Cache Read Warning]', fErr.message);
 }

 // 3. Shopify API lekérés ha még nincs vagy lejárt
 try {
 const res = await fetch(`https://${shop}/admin/api/2024-04/products.json?limit=250&fields=id,image,images,variants`, {
 headers: {
 'X-Shopify-Access-Token': token,
 'Content-Type': 'application/json'
 }
 });

 if (res.ok) {
 const prodData = await res.json();
 const productImageMap = {};
 const variantImageMap = {};

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

 productImagesCache = { productImageMap, variantImageMap };
 productImagesCacheTime = Date.now();

 // Mentés háttérben a .tmp könyvtárba
 try {
 const tmpDir = path.dirname(PRODUCT_CACHE_FILE);
 if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
 fs.writeFileSync(PRODUCT_CACHE_FILE, JSON.stringify(productImagesCache), 'utf8');
 } catch (wErr) {
 console.warn('[Product Cache Write Warning]', wErr.message);
 }

 return productImagesCache;
 }
 } catch (err) {
 console.warn('[Shopify Products Image Fetch Error]', err.message);
 }

 return productImagesCache || { productImageMap: {}, variantImageMap: {} };
}

// Célzott, villámgyors GraphQL lekérdezés a személyes átvételes / Ready for pickup rendelésekhez
// Esemény-lavina (events 10) nélkül -> 6.5 mp helyett ~1.2 mp!
async function fetchGraphQLReadyOrders(shop, token) {
 const readyOrderNames = new Set();
 let hasNext = true;
 let cursor = null;
 let page = 0;

 try {
 while (hasNext && page < 5) {
 page++;
 const afterParam = cursor ? `, after: "${cursor}"` : '';
 const query = `
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
 }
 }
 }
 }
 `;

 const gqlRes = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
 method: 'POST',
 headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
 body: JSON.stringify({ query })
 });

 if (!gqlRes.ok) break;

 const gqlData = await gqlRes.json();
 const ordersData = gqlData.data && gqlData.data.orders;
 const edges = (ordersData && ordersData.edges) || [];

 for (const edge of edges) {
 const node = edge.node;
 const hasReadyTag = (node.tags || []).some(t => /ready for pickup|átvehető|atveheto/i.test(t));
 const hasReadyFO = (node.fulfillmentOrders && node.fulfillmentOrders.edges || []).some(foEdge => {
 const fo = foEdge.node;
 const isPickupMethod = fo.deliveryMethod && (fo.deliveryMethod.methodType === 'PICK_UP' || fo.deliveryMethod.methodType === 'PICKUP' || fo.deliveryMethod.methodType === 'LOCAL_PICKUP');
 const isReadyStatus = fo.status === 'IN_PROGRESS' || fo.status === 'in_progress' || fo.requestStatus === 'PREPARED';
 return isPickupMethod && isReadyStatus;
 });
 const isDisplayReady = String(node.displayFulfillmentStatus || '').toUpperCase() === 'READY_FOR_PICKUP';

 if (hasReadyTag || hasReadyFO || isDisplayReady) {
 readyOrderNames.add(node.name);
 readyOrderNames.add(String(node.id).replace('gid://shopify/Order/', ''));
 }
 }

 hasNext = ordersData && ordersData.pageInfo && ordersData.pageInfo.hasNextPage;
 cursor = ordersData && ordersData.pageInfo && ordersData.pageInfo.endCursor;
 }
 } catch (eErr) {
 console.warn('[Shopify Events ReadyForPickup Warning]', eErr.message);
 }

 return readyOrderNames;
}

// Lapozásos REST rendelés lekérdezés segédfüggvény
async function fetchPagedOrders(initialUrl, token, maxPages = 10) {
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

// In-Memory Cache a Shopify rendelésekhez (Rate-limit és túlterhelés védelem)
const ordersCache = {
  data: null,
  timestamp: 0,
  ttl: 4000 // 4 másodperces TTL a 6 másodperces kliens-pollinghoz
};

function invalidateOrdersCache() {
  ordersCache.data = null;
  ordersCache.timestamp = 0;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Globális CORS és Preflight kezelés
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Hitelesítés ellenőrzése védett végpontokra (ha API_SECRET_TOKEN be van állítva)
  const API_SECRET_TOKEN = process.env.API_SECRET_TOKEN;
  const isProtectedApi = pathname.startsWith('/api/') && 
    pathname !== '/api/auth/callback' && 
    pathname !== '/api/shopify/auth' &&
    pathname !== '/api/shopify/status' &&
    pathname !== '/api/trigger/wakeup' &&
    pathname !== '/api/trigger/pre-wakeup' &&
    pathname !== '/api/trigger/pre-morning-wakeup';

  if (API_SECRET_TOKEN && isProtectedApi) {
    const clientToken = req.headers['x-api-key'] || parsedUrl.query.api_key;
    if (clientToken !== API_SECRET_TOKEN) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Jogosulatlan hozzáférés (Érvénytelen vagy hiányzó API kulcs).' }));
      return;
    }
  }

  // Bármely módosító (POST) Shopify művelet esetén azonnal érvénytelenítjük a gyorsítótárat
  if (req.method === 'POST' && pathname.startsWith('/api/shopify/')) {
    invalidateOrdersCache();
  }

  // --- API VÉGPONTOK ---

  // Shopify API és OAuth Útvonalak (Modularizált Route Handler)
  const shopifyHandled = await handleShopifyRoute(req, res, pathname, parsedUrl, {
    ordersCache,
    invalidateOrdersCache,
    getOrderUtils,
    fetchPagedOrders,
    fetchGraphQLReadyOrders,
    getProductImageMaps,
    saveAccessToken
  });
  if (shopifyHandled) return;


  // 9. Automatikus E-mail Értesítés Számla Nélküli Rendelés Terítésbe Helyezésekor
  if (pathname === '/api/notifications/missing-invoice' && req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        const run = body.run || {};
        const missingOrders = body.missingOrders || [];

        if (!Array.isArray(missingOrders) || missingOrders.length === 0) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, message: 'Nincs hiányzó számlás rendelés.' }));
          return;
        }

        const emailModule = await getEmailService();
        const service = process.env.EMAIL_SERVICE || 'resend';
        const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY || process.env.BREVO_API_KEY || '';
        const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
        const to = process.env.ALERT_EMAIL_RECIPIENT || 'info@panelburkolat.com';
        const shopDomain = process.env.SHOPIFY_SHOP || 'p4q0uj-2m.myshopify.com';

        const result = await emailModule.sendMissingInvoiceAlertEmail({
          run,
          missingOrders,
          service,
          apiKey,
          from,
          to,
          shopDomain
        });

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: result.success,
          simulated: result.simulated || false,
          count: missingOrders.length,
          service: result.service || service,
          error: result.error || null
        }));
        return;
      } catch (err) {
        console.error('[Notification Missing Invoice Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    });
    return;
  }

  // 9b. Reggeli Riport Manuális / Azonnali Kiküldése (GET és POST egyaránt támogatva)
  if ((pathname === '/api/reports/morning-report/send' || pathname === '/api/reports/morning-report') && (req.method === 'GET' || req.method === 'POST')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        const reportData = body.reportData || null;
        const result = await triggerMorningReportSend(reportData);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
        return;
      } catch (err) {
        console.error('[API Morning Report Send Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    });
    return;
  }
  // 9c. 06:50 AM Elő-ébresztés Endpoint (Egyszerű szerver ébresztő ping)
  if ((pathname === '/api/trigger/pre-morning-wakeup' || pathname === '/api/trigger/pre-wakeup' || pathname === '/api/trigger/wakeup') && (req.method === 'GET' || req.method === 'POST')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log('[API Wakeup Trigger] Szerver ébresztő kérés érkezett. Render szerver aktív.');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      message: 'Render szerver sikeresen felébredt.'
    }));
    return;
  }

  // 10. PannonXP Teljes Beállítások Mentése és Betöltése (Helyi / Render Szerver Fájl Tárhely)
  if (pathname === '/api/settings/pxp-all') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const PXP_BACKUP_FILE = path.join(__dirname, '.tmp', 'pxp_settings_backup.json');
    if (req.method === 'GET') {
      try {
        if (fs.existsSync(PXP_BACKUP_FILE)) {
          const data = JSON.parse(fs.readFileSync(PXP_BACKUP_FILE, 'utf8'));
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, ...data }));
          return;
        }
      } catch (err) {
        console.warn('[PXP Backup Read Warning]', err.message);
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, data: null }));
      return;
    }
    if (req.method === 'POST') {
      let bodyStr = '';
      req.on('data', chunk => { bodyStr += chunk; });
      req.on('end', () => {
        try {
          const body = JSON.parse(bodyStr || '{}');
          const tmpDir = path.dirname(PXP_BACKUP_FILE);
          if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
          
          let existingData = {};
          if (fs.existsSync(PXP_BACKUP_FILE)) {
            try {
              existingData = JSON.parse(fs.readFileSync(PXP_BACKUP_FILE, 'utf8'));
            } catch (pErr) {}
          }

          const mergedData = {
            ...existingData,
            ...body,
            updatedAt: Date.now()
          };

          fs.writeFileSync(PXP_BACKUP_FILE, JSON.stringify(mergedData, null, 2), 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }
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

let lastReportSentDateStr = '';

async function triggerMorningReportSend(customReportData = null) {
  try {
    const emailModule = await getEmailService();
    const orderUtils = await getOrderUtils();

    const now = new Date();
    const cutoffInfo = orderUtils.calculateReportCutoffDate(now);
    const targetTag = `${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    const service = process.env.EMAIL_SERVICE || 'resend';
    const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY || process.env.BREVO_API_KEY || '';
    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const to = process.env.ALERT_EMAIL_RECIPIENT || 'info@panelburkolat.com';
    const shopDomain = process.env.SHOPIFY_SHOP || 'p4q0uj-2m.myshopify.com';

    const reportData = customReportData || {
      dateText: `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}.`,
      targetTag,
      unfulfilledCount: 0,
      newOrdersCount: 0,
      newUnfulfilledCount: 0,
      missingInvoice: [],
      wrongShipping: [],
      incompleteAddress: [],
      dijbekKerendo: [],
      dijbekVarakozik: [],
      oldPickups: [],
      selaDeadlines: [],
      pxpBudapest: [],
      pxpNational: [],
      unsettledRuns: []
    };

    const res = await emailModule.sendMorningReportEmail({
      reportData,
      isMonday: cutoffInfo.isMonday,
      service,
      apiKey,
      from,
      to,
      shopDomain
    });

    console.log(` [Reggeli Riport] Sikeresen lefutott (${cutoffInfo.isMonday ? 'Hétfő' : 'Hétköznap'}), Eredmény:`, res);
    return res;
  } catch (err) {
    console.error(' [Reggeli Riport Hiba]', err);
    return { success: false, error: err.message };
  }
}

function getBudapestTime() {
  const now = new Date();
  const bpDateStr = now.toLocaleString('en-US', { timeZone: 'Europe/Budapest' });
  const bpDate = new Date(bpDateStr);
  return {
    day: bpDate.getDay(),
    hours: bpDate.getHours(),
    minutes: bpDate.getMinutes(),
    dateStr: bpDate.toISOString().slice(0, 10)
  };
}

// Automatikus reggeli riport kiküldési kapcsoló (felhasználói kérésre ideiglenesen leállítva a funkció kidolgozásáig)
const ENABLE_MORNING_REPORT_CRON = false;

function checkAndTriggerMorningReportCron() {
  if (!ENABLE_MORNING_REPORT_CRON) return;

  const { day, hours, minutes, dateStr } = getBudapestTime();

  // Csak hétfőtől péntekig, szigorúan magyar idő szerint (Europe/Budapest) 07:00 és 07:05 között
  if (day >= 1 && day <= 5 && hours === 7 && minutes >= 0 && minutes < 5) {
    if (lastReportSentDateStr !== dateStr) {
      lastReportSentDateStr = dateStr;
      console.log(` [Reggeli Riport Cron] Reggeli riport automatikus generálása és küldése indult (${dateStr}, 07:00 AM Budapest idő)...`);
      triggerMorningReportSend();
    }
  }
}

// 60 másodpercenkénti automatikus időzítő ellenőrzés
setInterval(checkAndTriggerMorningReportCron, 60 * 1000);

server.listen(PORT, () => {
  console.log(` Szerver fut: http://localhost:${PORT}/`);
  console.log(` Shopify Auth URL: http://localhost:${PORT}/api/shopify/auth`);
  if (ENABLE_MORNING_REPORT_CRON) {
    console.log(` Reggeli Riport automatikus időzítés aktív (07:00 AM Budapest idő szerint, H-P)`);
  } else {
    console.log(` Reggeli Riport automatikus időzítés szüneteltetve (TODO: részletes kidolgozás alatt)`);
  }
});
