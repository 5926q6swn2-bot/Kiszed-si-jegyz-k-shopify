import { HistoryManager } from '../services/history.js?v=43';
import { CustomDialog } from '../utils/dialog.js?v=43';
import { db, doc, updateDoc } from '../firebase-config.js?v=42';

let statsLeafletMap = null;
let activeStatsTab = 'charts';
const statsDateStart = document.getElementById('stats-date-start');
const statsDateEnd = document.getElementById('stats-date-end');
const statsRunsContainer = document.getElementById('stats-runs-container');
const geoCache = JSON.parse(localStorage.getItem('hu_zip_geocache_v1') || '{}');

export async function renderStatistics() {
        if (statsLeafletMap) { statsLeafletMap.remove(); statsLeafletMap = null; }
        const allRuns = await HistoryManager.getAllRuns();
        statsRunsContainer.innerHTML = '<p style="color:#94a3b8;font-size:13px;text-align:center;padding:30px;">Betöltés...</p>';

        const startD = statsDateStart.value ? new Date(statsDateStart.value + 'T00:00:00') : null;
        const endD   = statsDateEnd.value   ? new Date(statsDateEnd.value   + 'T23:59:59') : null;

        const runs = allRuns.filter(r => {
            if (!r.date) return true;
            const d = new Date(r.date + 'T00:00:00');
            if (startD && d < startD) return false;
            if (endD   && d > endD)   return false;
            return true;
        });

        statsRunsContainer.innerHTML = '';

        // Render sub-tabs bar at the top of the Statistics container
        const subtabsBar = document.createElement('div');
        subtabsBar.className = 'stats-subtabs no-print';
        subtabsBar.innerHTML = [
            { id: 'charts', label: 'Diagramok', icon: 'ph-chart-bar' },
            { id: 'products', label: 'Termékek', icon: 'ph-package' },
            { id: 'map', label: 'Térkép', icon: 'ph-map-pin' },
            { id: 'kiesett', label: 'Kiesett rendelések', icon: 'ph-warning' }
        ].map(t => `
            <button class="stats-subtab-btn ${activeStatsTab === t.id ? 'active' : ''}" data-tab="${t.id}">
                <i class="ph-bold ${t.icon}"></i> ${t.label}
            </button>
        `).join('');
        statsRunsContainer.appendChild(subtabsBar);

        subtabsBar.querySelectorAll('.stats-subtab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                activeStatsTab = btn.getAttribute('data-tab');
                renderStatistics();
            });
        });

        if (runs.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.style.cssText = 'color:#94a3b8;font-size:13px;text-align:center;padding:30px;';
            emptyMsg.textContent = 'Nincsenek adatok a kiválasztott időszakban.';
            statsRunsContainer.appendChild(emptyMsg);
            return;
        }

        const makeSection = (title, icon, contentHtml, fullWidth = false) => {
            const el = document.createElement('div');
            el.style.cssText = `border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;display:flex;flex-direction:column;${fullWidth ? 'grid-column:1/-1;' : ''}`;
            el.innerHTML = `
                <div style="background:#0f172a;color:#fff;padding:10px 14px;display:flex;align-items:center;gap:8px;flex-shrink:0;">
                    <i class="ph-bold ${icon}" style="font-size:14px;color:#94a3b8;"></i>
                    <span style="font-weight:700;font-size:13px;letter-spacing:-.2px;">${title}</span>
                </div>
                <div style="padding:12px 14px;background:#fff;flex:1;">${contentHtml}</div>`;
            return el;
        };

        const makeBar = (value, max, color = '#0f172a') => {
            const pct = max > 0 ? Math.round((value / max) * 100) : 0;
            return `<div style="background:#f1f5f9;border-radius:4px;height:7px;flex:1;min-width:60px;overflow:hidden;">
                <div style="background:${color};height:7px;width:${pct}%;border-radius:4px;"></div></div>`;
        };

        const makeCollapsible = (rowsArr, label, visible = 5) => {
            if (rowsArr.length <= visible) return rowsArr.join('');
            const uid = 'sc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
            const remaining = rowsArr.length - visible;
            return rowsArr.slice(0, visible).join('') +
                `<div id="${uid}" style="display:none;">${rowsArr.slice(visible).join('')}</div>
                 <button class="stats-expand-btn" data-target="${uid}" data-remaining="${remaining}" data-label="${label}"
                     style="margin-top:10px;width:100%;font-size:12px;font-weight:600;color:#3b82f6;background:#f8fafc;border:1px solid #dbeafe;border-radius:8px;cursor:pointer;padding:7px 14px;font-family:inherit;text-align:center;">
                     + ${remaining} további ${label}
                 </button>`;
        };

        // ── Cross-run recovery lookup ─────────────────────────────────
        // Ha egy kiesett rendelés egy LATER körben sikeresen elszámolásra kerül,
        // ne számítson örök kiesésnek a statisztikában.
        const successCollected = new Map();
        runs.forEach(r => {
            if (!r.isSettled && !(r.settledAmount > 0)) return;
            const uncollSet = new Set(r.uncollectedOrderIds || []);
            (r.orders || []).forEach(o => {
                if (o.isCOD && !uncollSet.has(o.id)) {
                    if (!successCollected.has(o.id)) successCollected.set(o.id, []);
                    successCollected.get(o.id).push(r.date);
                }
            });
        });
        const recoveredSet = new Set();
        runs.forEach((r, rIdx) => {
            (r.uncollectedOrderIds || []).forEach(orderId => {
                const laterDates = (successCollected.get(orderId) || []).filter(d => d > r.date);
                if (laterDates.length > 0) recoveredSet.add(`${rIdx}::${orderId}`);
            });
        });
        const getRecoveredCOD = (r, rIdx) =>
            (r.uncollectedOrderIds || []).reduce((sum, id) => {
                if (!recoveredSet.has(`${rIdx}::${id}`)) return sum;
                const o = (r.orders || []).find(x => x.id === id);
                return sum + (o && o.isCOD ? (o.codAmount || 0) : 0);
            }, 0);

        // ── 1. Szállítói összesítő ──────────────────────────────────────
        const courierMap = {};
        runs.forEach((r, rIdx) => {
            const c = r.courier || '—';
            if (!courierMap[c]) courierMap[c] = {
                runs: 0, orders: 0, cod: 0, uncollected: 0, recovered: 0,
                uncollectedSzallito: 0, uncollectedMienk: 0, uncollectedVevo: 0,
                uncollectedDetails: []
            };
            courierMap[c].runs++;
            r.orders.forEach(o => {
                courierMap[c].orders++;
                if (o.isCOD) courierMap[c].cod += o.codAmount;
            });
            const runReasons  = r.uncollectedReasons || {};
            const runPartials = r.partialOrders || {};
            const runResponsibility = r.uncollectedResponsibility || {};
            (r.uncollectedOrderIds || []).forEach(id => {
                const o = r.orders.find(x => x.id === id);
                if (!o || !o.isCOD) return;
                if (recoveredSet.has(`${rIdx}::${id}`)) {
                    courierMap[c].recovered += o.codAmount;
                } else {
                    courierMap[c].uncollected += o.codAmount;
                    const resp = runResponsibility[id] || 'vevo';
                    if (resp === 'szallito') courierMap[c].uncollectedSzallito += o.codAmount;
                    else if (resp === 'mienk') courierMap[c].uncollectedMienk += o.codAmount;
                    else courierMap[c].uncollectedVevo += o.codAmount;

                    courierMap[c].uncollectedDetails.push({
                        id, name: o.shippingName || '—', codAmount: o.codAmount,
                        reason: runReasons[id] || '', date: r.date || '—', isPartial: false
                    });
                }
            });
            Object.entries(runPartials).forEach(([id, info]) => {
                const o = r.orders.find(x => x.id === id);
                if (!o || !o.isCOD) return;
                const diff = o.codAmount - (info.amount || 0);
                if (diff <= 0) return;
                courierMap[c].uncollected += diff;
                const resp = runResponsibility[id] || 'vevo';
                if (resp === 'szallito') courierMap[c].uncollectedSzallito += diff;
                else if (resp === 'mienk') courierMap[c].uncollectedMienk += diff;
                else courierMap[c].uncollectedVevo += diff;

                courierMap[c].uncollectedDetails.push({
                    id, name: o.shippingName || '—', codAmount: diff,
                    reason: info.comment || '', date: r.date || '—',
                    isPartial: true, fullAmount: o.codAmount, partialAmount: info.amount
                });
            });
        });

        const courierRows = Object.entries(courierMap)
            .sort((a, b) => b[1].orders - a[1].orders)
            .map(([name, d]) => {
                const detailHtml = d.uncollectedDetails.map(det => `
                    <div style="display:flex;align-items:center;gap:8px;padding:4px 12px;font-size:12px;flex-wrap:wrap;">
                        <span style="font-weight:700;color:#0f172a;min-width:90px;">${det.id}</span>
                        <span style="color:#64748b;flex:1;min-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${det.name}</span>
                        <span style="color:#94a3b8;min-width:82px;">${det.date}</span>
                        ${det.isPartial
                            ? `<span style="font-size:10px;font-weight:700;color:#1d4ed8;background:#eff6ff;border-radius:5px;padding:1px 5px;">Részleges</span><span style="font-weight:700;color:#b91c1c;">−${det.codAmount.toLocaleString('hu-HU')} Ft</span>`
                            : `<span style="font-weight:700;color:#b91c1c;min-width:75px;">${det.codAmount.toLocaleString('hu-HU')} Ft</span>`}
                        <span style="font-size:11px;color:#64748b;background:#f1f5f9;border-radius:6px;padding:2px 7px;">${det.reason || 'ok nélkül'}</span>
                    </div>`).join('');

                let responsibilityBreakdown = '';
                if (d.uncollected > 0) {
                    const parts = [];
                    if (d.uncollectedSzallito > 0) parts.push(`Szállítóé: <strong>${d.uncollectedSzallito.toLocaleString('hu-HU')} Ft</strong>`);
                    if (d.uncollectedMienk > 0) parts.push(`Saját: <strong>${d.uncollectedMienk.toLocaleString('hu-HU')} Ft</strong>`);
                    if (d.uncollectedVevo > 0) parts.push(`Vevő/Egyéb: <strong>${d.uncollectedVevo.toLocaleString('hu-HU')} Ft</strong>`);
                    responsibilityBreakdown = `<span style="font-size:11px;color:#64748b;margin-left:8px;">(${parts.join(' · ')})</span>`;
                }

                return `
                <div class="stat-courier-wrapper" style="border-bottom:1px solid #f1f5f9;">
                    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;flex-wrap:wrap;">
                        <span style="font-size:13px;font-weight:700;color:#0f172a;min-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span>
                        <span style="font-size:12px;color:#64748b;min-width:70px;">${d.runs} terítés</span>
                        <span style="font-size:12px;color:#64748b;min-width:80px;">${d.orders} rendelés</span>
                        <span style="font-size:12px;font-weight:700;color:#0f172a;min-width:110px;">${d.cod.toLocaleString('hu-HU')} Ft COD</span>
                        ${d.uncollected > 0 ? `<span class="courier-kiesett-toggle" style="font-size:11px;font-weight:700;color:#f97316;cursor:pointer;display:inline-flex;align-items:center;gap:3px;user-select:none;">−${d.uncollected.toLocaleString('hu-HU')} Ft kiesett<i class="ph-bold ph-caret-down toggle-chevron" style="font-size:10px;transition:transform .2s;"></i></span>` : ''}
                        ${responsibilityBreakdown}
                        ${d.recovered  > 0 ? `<span style="font-size:11px;color:#64748b;">↩ ${d.recovered.toLocaleString('hu-HU')} Ft utólag beérkezett</span>` : ''}
                    </div>
                    ${d.uncollected > 0 ? `<div class="courier-kiesett-detail" style="display:none;padding:4px 0 8px;background:#fffbeb;border-top:1px dashed #fed7aa;border-radius:0 0 6px 6px;">${detailHtml}</div>` : ''}
                </div>`;
            }).join('');

        // Futárok fül eltávolítva — courierMap adatok megmaradnak a kiesett rendelések fülhöz

        // ── 2. Havi forgalom & Havi utánvét volumen ───────────────────
        if (activeStatsTab === 'charts') {
            const monthMap = {};
            runs.forEach(r => {
                if (!r.date) return;
                const m = r.date.substring(0, 7);
                if (!monthMap[m]) monthMap[m] = { runs: 0, orders: 0 };
                monthMap[m].runs++;
                monthMap[m].orders += r.orders.length;
            });

            const maxOrders = Math.max(...Object.values(monthMap).map(m => m.orders), 1);
            const monthRows = Object.keys(monthMap).sort().map(m => {
                const d = monthMap[m];
                const [y, mo] = m.split('-');
                return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f1f5f9;">
                    <span style="font-size:12px;font-weight:700;color:#374151;min-width:68px;">${y}. ${mo}.</span>
                    <span style="font-size:12px;color:#64748b;min-width:78px;">${d.runs} terítés</span>
                    <span style="font-size:12px;font-weight:700;color:#0f172a;min-width:70px;">${d.orders} rend.</span>
                    ${makeBar(d.orders, maxOrders)}
                </div>`;
            }).join('');

            statsRunsContainer.appendChild(makeSection('Havi forgalom', 'ph-chart-bar', monthRows));

            const codMonthMap = {};
            runs.forEach((r, rIdx) => {
                if (!r.date) return;
                const m = r.date.substring(0, 7);
                if (!codMonthMap[m]) codMonthMap[m] = { total: 0, received: 0, uncollected: 0, pending: 0, recovered: 0, bankTransferred: 0 };
                let runCOD = 0;
                r.orders.forEach(o => { if (o.isCOD) runCOD += o.codAmount; });
                codMonthMap[m].total += runCOD;

                const bankTransferredOrderIds = r.bankTransferredOrderIds || [];
                let bankSum = 0;
                r.orders.forEach(o => {
                    if (o.isCOD && bankTransferredOrderIds.includes(o.id)) {
                        bankSum += o.codAmount;
                    }
                });
                codMonthMap[m].bankTransferred += bankSum;

                if (r.isSettled || r.settledAmount > 0) {
                    const recv = r.settledAmount || 0;
                    const recoveredCOD = getRecoveredCOD(r, rIdx);
                    codMonthMap[m].received    += recv;
                    codMonthMap[m].uncollected += (runCOD - recv - bankSum) - recoveredCOD;
                    codMonthMap[m].recovered   += recoveredCOD;
                } else {
                    codMonthMap[m].pending += runCOD;
                }
            });

            const maxCOD = Math.max(...Object.values(codMonthMap).map(m => m.total), 1);
            const codRows = Object.keys(codMonthMap).sort()
                .filter(m => codMonthMap[m].total > 0)
                .map(m => {
                    const d = codMonthMap[m];
                    const [y, mo] = m.split('-');
                    const recvPct   = maxCOD > 0 ? (d.received    / maxCOD * 100) : 0;
                    const bankPct   = maxCOD > 0 ? (d.bankTransferred / maxCOD * 100) : 0;
                    const uncPct    = maxCOD > 0 ? (d.uncollected / maxCOD * 100) : 0;
                    const pendPct   = maxCOD > 0 ? (d.pending     / maxCOD * 100) : 0;
                    return `<div style="padding:9px 0;border-bottom:1px solid #f1f5f9;">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;">
                            <span style="font-size:12px;font-weight:700;color:#374151;min-width:68px;">${y}. ${mo}.</span>
                            <span style="font-size:13px;font-weight:800;color:#0f172a;">${d.total.toLocaleString('hu-HU')} Ft</span>
                            ${d.received    > 0 ? `<span style="font-size:11px;font-weight:700;color:#22c55e;">✓ ${d.received.toLocaleString('hu-HU')} Ft KP</span>` : ''}
                            ${d.bankTransferred > 0 ? `<span style="font-size:11px;font-weight:700;color:#3b82f6;">🏦 ${d.bankTransferred.toLocaleString('hu-HU')} Ft utalva</span>` : ''}
                            ${d.uncollected > 0 ? `<span style="font-size:11px;font-weight:700;color:#f97316;">~ ${d.uncollected.toLocaleString('hu-HU')} Ft kiesett</span>` : ''}
                            ${d.recovered   > 0 ? `<span style="font-size:11px;color:#64748b;">↩ ${d.recovered.toLocaleString('hu-HU')} Ft utólag</span>` : ''}
                            ${d.pending     > 0 ? `<span style="font-size:11px;color:#94a3b8;">${d.pending.toLocaleString('hu-HU')} Ft függőben</span>` : ''}
                        </div>
                        <div style="display:flex;height:7px;border-radius:4px;overflow:hidden;background:#f1f5f9;">
                            <div style="background:#22c55e;width:${recvPct}%;"></div>
                            <div style="background:#3b82f6;width:${bankPct}%;"></div>
                            <div style="background:#f97316;width:${uncPct}%;"></div>
                            <div style="background:#cbd5e1;width:${pendPct}%;"></div>
                        </div>
                    </div>`;
                }).join('');

            statsRunsContainer.appendChild(makeSection('Havi utánvét volumen', 'ph-money',
                codRows || '<p style="color:#94a3b8;font-size:13px;">Nincs utánvétes adat</p>'
            ));

            // ── 2b. Heti trend (utolsó 12 hét) ────────────────────────
            const weekMap = {};
            runs.forEach(r => {
                if (!r.date) return;
                const d = new Date(r.date + 'T00:00:00');
                const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 86400000);
                const weekNum = Math.floor(dayOfYear / 7);
                const yearWeek = `${d.getFullYear()}-W${String(weekNum + 1).padStart(2, '0')}`;
                if (!weekMap[yearWeek]) weekMap[yearWeek] = { orders: 0, runs: 0 };
                weekMap[yearWeek].orders += r.orders.length;
                weekMap[yearWeek].runs++;
            });
            const weekKeys = Object.keys(weekMap).sort().slice(-12);
            const maxWeekOrders = Math.max(...weekKeys.map(k => weekMap[k].orders), 1);
            const weekRows = weekKeys.map(k => {
                const d = weekMap[k];
                return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f1f5f9;">
                    <span style="font-size:12px;font-weight:700;color:#374151;min-width:68px;">${k}</span>
                    <span style="font-size:12px;color:#64748b;min-width:78px;">${d.runs} terítés</span>
                    <span style="font-size:12px;font-weight:700;color:#0f172a;min-width:70px;">${d.orders} rend.</span>
                    ${makeBar(d.orders, maxWeekOrders, '#8b5cf6')}
                </div>`;
            }).join('');
            statsRunsContainer.appendChild(makeSection('Heti trend (utolsó 12 hét)', 'ph-trend-up', weekRows || '<p style="color:#94a3b8;font-size:13px;">Nincs adat</p>'));

            // ── 2c. Napi átlag kiszállítás (havi bontás) ───────────────
            const dailyAvgMap = {};
            runs.forEach(r => {
                if (!r.date) return;
                const m = r.date.substring(0, 7);
                if (!dailyAvgMap[m]) dailyAvgMap[m] = { totalOrders: 0, days: new Set() };
                dailyAvgMap[m].totalOrders += r.orders.length;
                dailyAvgMap[m].days.add(r.date);
            });
            const maxDailyAvg = Math.max(...Object.values(dailyAvgMap).map(d => d.totalOrders / d.days.size), 1);
            const dailyAvgRows = Object.keys(dailyAvgMap).sort().map(m => {
                const d = dailyAvgMap[m];
                const avg = (d.totalOrders / d.days.size).toFixed(1);
                const [y, mo] = m.split('-');
                return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f1f5f9;">
                    <span style="font-size:12px;font-weight:700;color:#374151;min-width:68px;">${y}. ${mo}.</span>
                    <span style="font-size:12px;color:#64748b;min-width:78px;">${d.days.size} munkanap</span>
                    <span style="font-size:12px;font-weight:700;color:#0f172a;min-width:90px;">${avg} rend./nap</span>
                    ${makeBar(d.totalOrders / d.days.size, maxDailyAvg, '#06b6d4')}
                </div>`;
            }).join('');
            statsRunsContainer.appendChild(makeSection('Napi átlag kiszállítás', 'ph-calendar-blank', dailyAvgRows || '<p style="color:#94a3b8;font-size:13px;">Nincs adat</p>'));

            // ── 2d. Kiesési arány (havi bontás) ────────────────────────
            const failRateMap = {};
            runs.forEach(r => {
                if (!r.date) return;
                const m = r.date.substring(0, 7);
                if (!failRateMap[m]) failRateMap[m] = { total: 0, failed: 0 };
                failRateMap[m].total += r.orders.length;
                failRateMap[m].failed += (r.uncollectedOrderIds || []).length;
                failRateMap[m].failed += Object.keys(r.partialOrders || {}).length;
            });
            const failRateRows = Object.keys(failRateMap).sort().map(m => {
                const d = failRateMap[m];
                const pct = d.total > 0 ? ((d.failed / d.total) * 100).toFixed(1) : '0.0';
                const [y, mo] = m.split('-');
                const pctNum = parseFloat(pct);
                const barColor = pctNum > 15 ? '#ef4444' : pctNum > 8 ? '#f97316' : '#22c55e';
                return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f1f5f9;">
                    <span style="font-size:12px;font-weight:700;color:#374151;min-width:68px;">${y}. ${mo}.</span>
                    <span style="font-size:12px;color:#64748b;min-width:108px;">${d.failed} / ${d.total} rendelés</span>
                    <span style="font-size:12px;font-weight:700;color:${barColor};min-width:55px;">${pct}%</span>
                    ${makeBar(pctNum, 100, barColor)}
                </div>`;
            }).join('');
            statsRunsContainer.appendChild(makeSection('Kiesési arány', 'ph-chart-line-down', failRateRows || '<p style="color:#94a3b8;font-size:13px;">Nincs adat</p>'));
        }

        // ── 4. Top termékek ───────────────────────────────────────────
        if (activeStatsTab === 'products') {
            const itemMap = {};
            runs.forEach(r => r.orders.forEach(o => o.items.forEach(it => {
                if (!it.name || it.name === '—') return;
                itemMap[it.name] = (itemMap[it.name] || 0) + (it.qty || 1);
            })));

            // Normalizáció: hasonló terméknevek összevonása
            const normalizeProductName = (name) => {
                return name
                    .toLowerCase()
                    .replace(/[\s\-_]+/g, ' ')  // kötőjel/alulvonás -> szóköz
                    .replace(/\s+/g, ' ')        // többszörös szóköz -> egy
                    .trim();
            };

            // Összevonás normalizált név szerint
            const mergedMap = {};       // normName -> { totalQty, bestName, variants }
            Object.entries(itemMap).forEach(([name, qty]) => {
                const norm = normalizeProductName(name);
                if (!mergedMap[norm]) {
                    mergedMap[norm] = { totalQty: 0, bestName: name, bestQty: 0, variants: [] };
                }
                mergedMap[norm].totalQty += qty;
                mergedMap[norm].variants.push({ name, qty });
                if (qty > mergedMap[norm].bestQty) {
                    mergedMap[norm].bestQty = qty;
                    mergedMap[norm].bestName = name;
                }
            });

            const topItems = Object.values(mergedMap)
                .sort((a, b) => b.totalQty - a.totalQty);
            const maxQty = topItems.length > 0 ? topItems[0].totalQty : 1;

            const itemRows = topItems.map((item, i) => {
                const isMerged = item.variants.length > 1;
                const variantInfo = isMerged
                    ? `<div style="padding:2px 0 0 32px;"><span style="font-size:10px;color:#94a3b8;font-style:italic;">${item.variants.length} variáns összevonva: ${item.variants.map(v => v.name).join(', ')}</span></div>`
                    : '';
                return `
                <div style="border-bottom:1px solid #f1f5f9;">
                    <div style="display:flex;align-items:center;gap:10px;padding:7px 0;">
                        <span style="font-size:12px;font-weight:700;color:#94a3b8;min-width:22px;text-align:right;">${i + 1}.</span>
                        <span style="font-size:13px;color:#374151;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.bestName}${isMerged ? ' <span style="font-size:10px;font-weight:600;color:#8b5cf6;background:#f5f3ff;border-radius:5px;padding:1px 5px;margin-left:4px;">összevont</span>' : ''}</span>
                        <span style="font-size:12px;font-weight:700;color:#0f172a;min-width:45px;text-align:right;">${item.totalQty} db</span>
                        ${makeBar(item.totalQty, maxQty, '#6366f1')}
                    </div>
                    ${variantInfo}
                </div>`;
            }).join('');

            statsRunsContainer.appendChild(makeSection('Szállított termékek', 'ph-package',
                itemRows || '<p style="color:#94a3b8;font-size:13px;">Nincs termékadat</p>'
            , true));
        }

        // ── 5. Területi sűrűség (térkép) ──────────────────────────────
        const HU_ZIP = {
            // Budapest kerületek (3-digit prefix → coords)
            '101':[47.499,19.039],'102':[47.541,18.974],'103':[47.567,19.040],
            '104':[47.574,19.093],'105':[47.503,19.052],'106':[47.510,19.062],
            '107':[47.500,19.071],'108':[47.492,19.076],'109':[47.475,19.071],
            '110':[47.475,19.132],'111':[47.465,18.998],'112':[47.491,18.978],
            '113':[47.532,19.064],'114':[47.524,19.117],'115':[47.581,19.111],
            '116':[47.535,19.168],'117':[47.507,19.212],'118':[47.449,19.142],
            '119':[47.442,19.110],'120':[47.438,19.067],'121':[47.425,19.058],
            '122':[47.423,18.978],'123':[47.407,19.094],
            // Pest megye
            '2030':[47.390,18.901],'2040':[47.452,18.957],'2045':[47.469,18.897],
            '2051':[47.575,18.864],'2100':[47.598,19.358],'2120':[47.633,19.137],
            '2130':[47.698,19.260],'2170':[47.560,19.593],'2220':[47.300,19.135],
            '2310':[47.405,18.920],'2360':[47.353,19.081],'2400':[46.962,18.935],
            '2500':[47.795,18.741],'2600':[47.777,19.133],'2700':[47.167,19.800],
            '2750':[47.033,19.782],'2800':[47.587,18.388],'2900':[47.869,17.267],
            // Nógrád
            '3100':[48.098,19.797],
            // Heves
            '3000':[47.670,19.680],'3200':[47.785,19.930],'3300':[47.903,20.377],
            // BAZ
            '3400':[47.821,20.574],
            '3526':[48.104,20.778],'3527':[48.104,20.778],'3528':[48.095,20.762],
            '3529':[48.104,20.778],'3530':[48.095,20.778],'3531':[48.106,20.763],
            '3532':[48.095,20.762],'3580':[47.912,21.052],
            '3600':[48.218,20.289],'3700':[48.256,20.637],
            // Hajdú-Bihar
            '4024':[47.532,21.627],'4025':[47.532,21.627],'4026':[47.545,21.637],
            '4027':[47.522,21.597],'4028':[47.552,21.607],'4029':[47.512,21.677],
            '4031':[47.522,21.647],'4032':[47.502,21.607],'4033':[47.542,21.587],
            '4034':[47.562,21.657],'4100':[47.217,21.545],'4200':[47.450,21.389],
            '4220':[47.670,21.516],
            // Szabolcs-Szatmár
            '4400':[47.950,21.724],'4700':[47.950,22.323],
            // JNSz
            '5000':[47.176,20.182],'5100':[47.522,19.699],
            // Békés
            '5600':[46.679,21.088],'5700':[46.647,21.277],'5900':[46.566,20.661],
            // Bács-Kiskun
            '6000':[46.906,19.691],'6100':[46.710,19.852],'6400':[46.432,19.482],
            '6500':[46.179,18.952],'6600':[46.656,20.261],
            // Csongrád
            '6720':[46.253,20.148],'6721':[46.253,20.148],'6722':[46.253,20.148],
            '6723':[46.253,20.148],'6724':[46.253,20.148],'6725':[46.253,20.148],
            '6726':[46.233,20.148],'6727':[46.253,20.168],
            '6800':[46.423,20.328],'6900':[46.386,20.089],
            // Tolna
            '7100':[46.347,18.706],
            // Baranya
            '7400':[46.359,17.796],
            '7621':[46.073,18.233],'7622':[46.063,18.223],'7623':[46.083,18.243],
            '7624':[46.063,18.203],'7625':[46.073,18.253],'7630':[46.033,18.213],
            // Somogy
            '8600':[46.619,17.635],'8700':[46.359,17.796],
            // Fejér
            '8000':[47.187,18.411],'8100':[47.234,18.029],
            // Veszprém
            '8200':[47.093,17.910],'8360':[46.758,17.238],
            '8400':[47.100,17.557],'8500':[47.327,17.470],
            // Zala
            '8800':[46.459,16.990],'8900':[46.842,16.842],
            // Győr-Moson-Sopron
            '9021':[47.688,17.650],'9022':[47.698,17.640],'9023':[47.678,17.660],
            '9024':[47.668,17.650],'9025':[47.688,17.660],'9026':[47.698,17.650],
            '9027':[47.708,17.640],'9028':[47.678,17.630],
            '9200':[47.869,17.267],'9400':[47.681,16.583],
            // Vas
            '9700':[47.231,16.622],'9800':[47.003,16.837],
        };

        const lookupZip = (zip) => {
            if (HU_ZIP[zip]) return HU_ZIP[zip];
            if (zip.startsWith('1') && HU_ZIP[zip.substring(0, 3)]) return HU_ZIP[zip.substring(0, 3)];
            return null;
        };

        // zip → {count, label, coords?}
        // Budapest (1xxx): egybe kezelve egy pontként
        const BUDAPEST_COORDS = [47.4979, 19.0402];
        // ── 5. Területi sűrűség (térkép) ──────────────────────────────
        if (activeStatsTab === 'map') {
            const zipMap = {};
            runs.forEach(r => r.orders.forEach(o => {
                if (!o.address) return;
                const m = o.address.match(/^(\d{4})[,\s]+([^,]+)/);
                if (!m) return;
                const zip = m[1];
                const city = m[2].trim();
                const isBp = zip.startsWith('1') || city.toLowerCase().startsWith('budapest');
                const key = isBp ? '__budapest__' : zip;
                const label = isBp ? 'Budapest' : city;
                const coords = isBp ? BUDAPEST_COORDS : null;
                if (!zipMap[key]) zipMap[key] = { count: 0, label, zip: key, coords, orderIds: [] };
                zipMap[key].count++;
                zipMap[key].orderIds.push(o.id);
            }));

            const sortedLocs = Object.values(zipMap).sort((a, b) => b.count - a.count);
            const maxLocCount = sortedLocs.length > 0 ? sortedLocs[0].count : 1;

            const mapSectionEl = document.createElement('div');
            mapSectionEl.style.cssText = 'border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;grid-column:1/-1;display:flex;flex-direction:column;';
            mapSectionEl.innerHTML = `
                <div style="background:#0f172a;color:#fff;padding:10px 14px;display:flex;align-items:center;gap:8px;flex-shrink:0;">
                    <i class="ph-bold ph-map-pin" style="font-size:14px;color:#94a3b8;"></i>
                    <span style="font-weight:700;font-size:13px;letter-spacing:-.2px;">Területi sűrűség</span>
                    <span id="stats-map-status" style="font-size:11px;color:#64748b;margin-left:auto;"></span>
                </div>
                <div style="padding:12px 14px;background:#fff;flex:1;">
                    <div id="stats-map-leaflet" style="height:460px;border-radius:10px;overflow:hidden;margin-bottom:12px;border:1px solid #e2e8f0;"></div>
                    <div id="stats-location-list"></div>
                </div>`;
            statsRunsContainer.appendChild(mapSectionEl);

            // Leaflet init
            statsLeafletMap = L.map('stats-map-leaflet', { zoomControl: true, scrollWheelZoom: false });
            statsLeafletMap.fitBounds([[45.7, 16.1], [48.6, 22.9]]);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>',
                subdomains: 'abcd', maxZoom: 19
            }).addTo(statsLeafletMap);

            // Duplikált szállítás és kiesési okok összegyűjtése
            const orderAppearanceCount = {};  // orderId -> number of runs it appeared in
            const orderFirstFailReason = {};  // orderId -> reason from first failed attempt
            runs.forEach(r => {
                const rUnc = new Set(r.uncollectedOrderIds || []);
                const rReasons = r.uncollectedReasons || {};
                r.orders.forEach(o => {
                    orderAppearanceCount[o.id] = (orderAppearanceCount[o.id] || 0) + 1;
                    if (rUnc.has(o.id) && !orderFirstFailReason[o.id]) {
                        orderFirstFailReason[o.id] = rReasons[o.id] || '';
                    }
                });
            });

            const locListEl = document.getElementById('stats-location-list');
            const locRowsArr = sortedLocs.map((loc, i) => {
                const ids = (loc.orderIds || []).slice().sort((a, b) =>
                    parseInt(a.replace(/\D/g, '') || '0') - parseInt(b.replace(/\D/g, '') || '0')
                );
                // Deduplikált ID-k, de jelöljük a többszörösen szállítottakat
                const uniqueIds = [...new Set(ids)];
                const idBadges = uniqueIds.map(id => {
                    const count = orderAppearanceCount[id] || 1;
                    const isDuplicate = count > 1;
                    const failReason = orderFirstFailReason[id] || '';
                    let badge = `<span style="font-size:10px;font-weight:600;color:#1d4ed8;white-space:nowrap;">${id}</span>`;
                    if (isDuplicate) {
                        badge = `<span style="font-size:10px;font-weight:600;color:#c2410c;white-space:nowrap;" title="${failReason ? 'Elso kiesés oka: ' + failReason : 'Többszörösen szállítva'}">${id} <span style="font-size:9px;font-weight:700;color:#fff;background:#c2410c;border-radius:4px;padding:0 3px;">${count}x</span>${failReason ? ' <span style=&quot;font-size:9px;color:#94a3b8;&quot;>(' + failReason + ')</span>' : ''}</span>`;
                    }
                    return badge;
                }).join(' ');

                return `
                <div style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:12px;font-weight:700;color:#94a3b8;min-width:22px;text-align:right;">${i + 1}.</span>
                        <span style="font-size:13px;font-weight:600;color:#374151;min-width:100px;">${loc.label}</span>
                        <span style="font-size:12px;font-weight:700;color:#0f172a;min-width:55px;text-align:right;">${loc.count} rend.</span>
                        ${makeBar(loc.count, maxLocCount, '#3b82f6')}
                    </div>
                    <div style="padding:3px 0 0 32px;display:flex;flex-wrap:wrap;gap:4px 8px;">${idBadges}</div>
                </div>`;
            });
            locListEl.innerHTML = locRowsArr.length > 0
                ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 20px;margin-top:8px;">${locRowsArr.join('')}</div>`
                : '<p style="color:#94a3b8;font-size:13px;">Nincs cím adat</p>';

            // Markerek: kis tömör pontok, méret sqrt-skálán
            const addMarker = (coords, loc) => {
                const r = 4 + Math.round(Math.sqrt(loc.count / maxLocCount) * 10);
                L.circleMarker(coords, {
                    radius: r, fillColor: '#1d4ed8', color: '#fff',
                    weight: 1, opacity: 1, fillOpacity: 0.85
                }).bindTooltip(() => {
                    const ids = (loc.orderIds || []).slice().sort((a, b) =>
                        parseInt(a.replace(/\D/g, '') || '0') - parseInt(b.replace(/\D/g, '') || '0')
                    );
                    const cols  = ids.length <= 5 ? 1 : ids.length <= 14 ? 2 : 3;
                    const maxW  = cols === 1 ? 130 : cols === 2 ? 210 : 300;
                    const idGrid = ids.length > 0
                        ? `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:3px 12px;margin-top:6px;max-width:${maxW}px;">
                               ${ids.map(id => `<span style="font-size:11px;font-weight:600;color:#1d4ed8;white-space:nowrap;">${id}</span>`).join('')}
                           </div>`
                        : '';
                    return `<div style="padding:2px 0;"><strong style="font-size:13px;">${loc.label}</strong> <span style="font-size:12px;color:#64748b;">· ${loc.count} rendelés</span>${idGrid}</div>`;
                }, { direction: 'top', offset: [0, -r - 2], opacity: 1 }).addTo(statsLeafletMap);
            };

            const unknown = [];
            sortedLocs.forEach(loc => {
                // Budapest: közvetlen koordináta
                if (loc.coords) { addMarker(loc.coords, loc); return; }
                // Lookup tábla
                const coords = lookupZip(loc.zip);
                if (coords) {
                    addMarker(coords, loc);
                } else if (geoCache[loc.zip]) {
                    addMarker(geoCache[loc.zip], loc);
                } else if (!geoCache[loc.zip + '_miss']) {
                    unknown.push(loc);
                }
            });

            // Nominatim queue (1 req/sec)
            if (unknown.length > 0) {
                const statusEl = document.getElementById('stats-map-status');
                if (statusEl) statusEl.textContent = `Geocoding: 0/${unknown.length}…`;
                (async () => {
                    for (let i = 0; i < unknown.length; i++) {
                        const loc = unknown[i];
                        try {
                            const res = await fetch(
                                `https://nominatim.openstreetmap.org/search?postalcode=${loc.zip}&country=hu&format=json&limit=1`,
                                { headers: { 'Accept': 'application/json' } }
                            );
                            const data = await res.json();
                            if (data && data[0]) {
                                const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                                geoCache[loc.zip] = coords;
                                localStorage.setItem('hu_zip_geocache_v1', JSON.stringify(geoCache));
                                addMarker(coords, loc);
                            } else {
                                geoCache[loc.zip + '_miss'] = true;
                                localStorage.setItem('hu_zip_geocache_v1', JSON.stringify(geoCache));
                            }
                        } catch (_) { /* hálózati hiba — kihagyjuk */ }
                        if (statusEl) statusEl.textContent = i + 1 < unknown.length
                            ? `Geocoding: ${i + 1}/${unknown.length}…`
                            : '';
                        if (i + 1 < unknown.length) await new Promise(r => setTimeout(r, 1100));
                    }
                })();
            }
        }

        // ── 6+7. Kiesett rendelések (újraszállítás infóval) ───────────
        if (activeStatsTab === 'kiesett') {
            // Minden rendelés összes megjelenése: orderId → [{date, courier, isUncollected, isPartial, wasReceived}]
            const orderRunsMap = new Map();
            runs.forEach(r => {
                const rUnc  = new Set(r.uncollectedOrderIds || []);
                const rPart = r.partialOrders || {};
                const settled = r.isSettled || (r.settledAmount > 0);
                r.orders.forEach(o => {
                    if (!orderRunsMap.has(o.id)) orderRunsMap.set(o.id, []);
                    const isUnc  = rUnc.has(o.id);
                    const isPart = !!rPart[o.id];
                    orderRunsMap.get(o.id).push({
                        date: r.date, courier: r.courier,
                        isUncollected: isUnc, isPartial: isPart,
                        wasReceived: !isUnc && !isPart && settled,
                        wasPartialReceived: isPart && settled,
                    });
                });
            });

            const kiesettRows = [];
            runs.forEach(r => {
                const runReasons  = r.uncollectedReasons || {};
                const runPartials = r.partialOrders || {};
                const runResponsibility = r.uncollectedResponsibility || {};
                (r.uncollectedOrderIds || []).forEach(id => {
                    const o = (r.orders || []).find(x => x.id === id);
                    const laterEntries = (orderRunsMap.get(id) || []).filter(e => e.date > (r.date || ''));
                    kiesettRows.push({
                        id, isPartial: false, isCOD: !!(o && o.isCOD),
                        name: o ? (o.shippingName || '—') : '—',
                        date: r.date || '—', courier: r.courier || '—',
                        codAmount: o && o.isCOD ? (o.codAmount || 0) : 0,
                        reason: runReasons[id] || '',
                        laterEntries,
                        docId: r.docId,
                        responsibility: runResponsibility[id] || 'vevo'
                    });
                });
                Object.entries(runPartials).forEach(([id, info]) => {
                    const o = (r.orders || []).find(x => x.id === id);
                    if (!o || !o.isCOD) return;
                    const diff = o.codAmount - (info.amount || 0);
                    if (diff <= 0) return;
                    const laterEntries = (orderRunsMap.get(id) || []).filter(e => e.date > (r.date || ''));
                    kiesettRows.push({
                        id, isPartial: true, isCOD: true,
                        name: o.shippingName || '—',
                        date: r.date || '—', courier: r.courier || '—',
                        codAmount: diff, fullAmount: o.codAmount, partialAmount: info.amount,
                        reason: info.comment || '',
                        laterEntries,
                        docId: r.docId,
                        responsibility: runResponsibility[id] || 'vevo'
                    });
                });
            });
            kiesettRows.sort((a, b) => {
                const aRec = (a.laterEntries || []).some(e => e.wasReceived || e.wasPartialReceived) ? 1 : 0;
                const bRec = (b.laterEntries || []).some(e => e.wasReceived || e.wasPartialReceived) ? 1 : 0;
                if (aRec !== bRec) return aRec - bRec;
                return b.date.localeCompare(a.date);
            });

            const renderLaterEntries = (entries) => {
                if (!entries || entries.length === 0) return '';
                const redeliveries = entries.filter(e => e.date);
                if (redeliveries.length === 0) return '';
                const last = redeliveries[redeliveries.length - 1];
                const outcome = last.isUncollected
                    ? `<span style="font-size:10px;font-weight:700;color:#f97316;background:#fff7ed;border:1px solid #fed7aa;border-radius:5px;padding:1px 6px;">ismét kiesett</span>`
                    : last.wasReceived || last.wasPartialReceived
                        ? `<span style="font-size:10px;font-weight:700;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;padding:1px 6px;">átvéve ✓</span>`
                        : `<span style="font-size:10px;color:#94a3b8;background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:1px 6px;">függőben</span>`;
                return `<div style="margin-top:4px;padding-left:14px;border-left:2px solid #e2e8f0;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span style="font-size:11px;color:#94a3b8;">↳</span>
                    <span style="font-size:11px;font-weight:600;color:#64748b;">${redeliveries.length}× újra szállítva</span>
                    <span style="font-size:11px;color:#94a3b8;">·</span>
                    <span style="font-size:11px;color:#64748b;">${last.date} · ${last.courier || '—'}</span>
                    ${outcome}
                </div>`;
            };

            const kiesettCards = kiesettRows.map(k => {
                const isRecovered = k.laterEntries && k.laterEntries.some(e => e.wasReceived || e.wasPartialReceived);
                const amtColor = isRecovered ? '#94a3b8' : '#b91c1c';
                
                const resp = k.responsibility || 'vevo';
                let pillClass = 'vevo';
                let pillIcon = '<i class="ph-bold ph-user"></i>';
                let pillLabel = 'Vevő / Egyéb';
                if (resp === 'mienk') {
                    pillClass = 'mienk';
                    pillIcon = '<i class="ph-bold ph-x-circle"></i>';
                    pillLabel = 'Saját hiba';
                } else if (resp === 'szallito') {
                    pillClass = 'szallito';
                    pillIcon = '<i class="ph-bold ph-truck"></i>';
                    pillLabel = 'Szállító hibája';
                }

                const actionContainer = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
                    <div class="responsibility-display" style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:11px;color:#64748b;font-weight:600;margin-right:4px;">Felelős:</span>
                        <span class="resp-pill ${pillClass}" data-doc-id="${k.docId}" data-order-id="${k.id}" data-resp="${resp}" title="Kattints a felelős módosításához">
                            ${pillIcon}${pillLabel}
                        </span>
                    </div>
                    ${!isRecovered && k.isCOD && !k.isPartial ? `<button class="btn-mark-bank" data-doc-id="${k.docId}" data-order-id="${k.id}" style="display:flex;align-items:center;gap:4px;font-size:10px;font-weight:600;color:#0284c7;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:3px 8px;cursor:pointer;transition:all .15s;" title="Áthelyezés utalt státuszba (nem lesz kiesett)">
                        <i class="ph-bold ph-bank" style="font-size:10px;"></i>Utólag elutalva
                    </button>` : ''}
                </div>
                `;

                return `
                <div class="stat-kiesett-card" style="padding:10px 8px;border-bottom:1px solid #f1f5f9;">
                    <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;">
                        <span style="font-size:12px;font-weight:700;color:#0f172a;">${k.id}</span>
                        <span style="font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;">${k.name}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:4px;">
                        <span style="font-size:11px;color:#94a3b8;">${k.date}</span>
                        <span style="font-size:11px;color:#374151;">${k.courier}</span>
                        ${!k.isCOD
                            ? `<span style="font-size:10px;color:#64748b;background:#f1f5f9;border-radius:5px;padding:1px 6px;">Nem utánvétes</span>`
                            : k.isPartial
                                ? `<span style="font-size:10px;font-weight:700;color:#1d4ed8;background:#eff6ff;border:1px solid #93c5fd;border-radius:5px;padding:1px 6px;">Részleges</span>
                                   <span style="font-size:11px;font-weight:700;color:${amtColor};">-${k.codAmount.toLocaleString('hu-HU')} Ft</span>`
                                : k.codAmount > 0
                                    ? `<span style="font-size:11px;font-weight:700;color:${amtColor};">${k.codAmount.toLocaleString('hu-HU')} Ft</span>`
                                    : ''}
                        ${k.reason ? `<span style="font-size:10px;color:#64748b;background:#f1f5f9;border-radius:5px;padding:2px 7px;">${k.reason}</span>` : ''}
                    </div>
                    ${renderLaterEntries(k.laterEntries)}
                    ${actionContainer}
                </div>`;
            }).join('');

            const kiesettContentHtml = kiesettRows.length > 0
                ? `<div class="stats-kiesett-grid">${kiesettCards}</div>`
                : '<p style="color:#94a3b8;font-size:13px;">Nincs kiesett rendelés a kiválasztott időszakban.</p>';

            statsRunsContainer.appendChild(makeSection('Kiesett rendelések', 'ph-warning', kiesettContentHtml, true));

            // "Utólag elutalva" gomb kattintáskezelő
            statsRunsContainer.querySelectorAll('.btn-mark-bank').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const docId = btn.getAttribute('data-doc-id');
                    const orderId = btn.getAttribute('data-order-id');
                    const ok = await CustomDialog.confirm(`Biztosan utólag elutalva állapotra állítod a ${orderId} rendelést? Ez kiveszi a kiesettek közül.`, 'Utólag elutalva', 'info');
                    if (ok) {
                        const success = await HistoryManager.markAsBankTransferred(docId, orderId);
                        if (success) {
                            renderStatsView(); // Újratölti a statisztikát
                        }
                    }
                });
            });

            // Felelősség pirula kattintáskezelő (ciklikus váltás)
            statsRunsContainer.querySelectorAll('.resp-pill').forEach(pill => {
                pill.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const docId = pill.getAttribute('data-doc-id');
                    const orderId = pill.getAttribute('data-order-id');
                    const currentResp = pill.getAttribute('data-resp');
                    
                    // Ciklikus váltás: vevo -> mienk -> szallito -> vevo
                    let nextResp = 'vevo';
                    let nextLabel = 'Vevő / Egyéb';
                    let nextClass = 'vevo';
                    let nextIcon = '<i class="ph-bold ph-user"></i>';

                    if (currentResp === 'vevo') {
                        nextResp = 'mienk';
                        nextLabel = 'Saját hiba';
                        nextClass = 'mienk';
                        nextIcon = '<i class="ph-bold ph-x-circle"></i>';
                    } else if (currentResp === 'mienk') {
                        nextResp = 'szallito';
                        nextLabel = 'Szállító hibája';
                        nextClass = 'szallito';
                        nextIcon = '<i class="ph-bold ph-truck"></i>';
                    }

                    // Vizuális visszajelzés azonnal (optimista frissítés)
                    pill.className = `resp-pill ${nextClass}`;
                    pill.setAttribute('data-resp', nextResp);
                    pill.innerHTML = `${nextIcon}${nextLabel}`;

                    // Mentés a háttérben
                    const ok = await HistoryManager.updateResponsibilityInFirestore(docId, orderId, nextResp);
                    if (ok) {
                        // Újrarajzolás vibrálás nélkül a bento boxok/courier breakdown frissítéséhez
                        renderStatistics();
                    } else {
                        alert("Hiba történt a felelősség rögzítésekor.");
                        // Visszaállítás hiba esetén
                        pill.className = `resp-pill ${currentResp}`;
                        pill.setAttribute('data-resp', currentResp);
                        let currLabel = 'Vevő / Egyéb';
                        let currIcon = '<i class="ph-bold ph-user"></i>';
                        if (currentResp === 'mienk') { currLabel = 'Saját hiba'; currIcon = '<i class="ph-bold ph-x-circle"></i>'; }
                        else if (currentResp === 'szallito') { currLabel = 'Szállító hibája'; currIcon = '<i class="ph-bold ph-truck"></i>'; }
                        pill.innerHTML = `${currIcon}${currLabel}`;
                    }
                });
            });
        // Expand/collapse eseménykezelő a lenyitható szekciókhoz
        statsRunsContainer.querySelectorAll('.stats-expand-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const el = document.getElementById(btn.dataset.target);
                if (!el) return;
                const isOpen = el.style.display !== 'none';
                el.style.display = isOpen ? 'none' : '';
                btn.textContent = isOpen
                    ? `+ ${btn.dataset.remaining} további ${btn.dataset.label}`
                    : 'Kevesebb mutatása';
            });
        });
    }
}

export function initStatsEvents() {
    statsDateStart.addEventListener('change', () => renderStatistics());
    statsDateEnd.addEventListener('change', () => renderStatistics());
    document.getElementById('stats-clear-btn').addEventListener('click', () => {
        statsDateStart.value = '';
        statsDateEnd.value = '';
        renderStatistics();
    });
}

    async function ignoreDelayInFirestore(docId, orderId) {
        try {
            const runs = await HistoryManager.getAllRuns();
            const run = runs.find(r => r.docId === docId);
            if (!run) return;

            const updatedOrders = run.orders.map(o => {
                if (o.id === orderId) return { ...o, isDelayIgnored: true };
                return o;
            });

            const docRef = doc(db, HistoryManager.COLLECTION_NAME, docId);
            await updateDoc(docRef, { orders: updatedOrders });
            return true;
        } catch (e) {
            console.error("Hiba a késés elrejtésénél: ", e);
            return false;
        }
    }