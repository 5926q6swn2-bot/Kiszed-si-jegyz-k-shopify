// js/views/blacklistModal.js
// Feketelista Kezelő Modális Felület
// Lehetővé teszi a feketelistás profilok böngészését, szerkesztését, új profil rögzítését,
// a kapcsolódó fuvarok és meghiúsult kiszállítások áttekintését, valamint belső kommentek kezelését.

import { BlacklistService } from '../services/blacklistService.js';
import { CustomDialog } from '../utils/dialog.js';
import { Store } from '../store/state.js';

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export const BlacklistModal = {
    _context: {
        orders: [],
        savedRuns: [],
        onUpdate: null
    },
    _selectedProfileId: null,
    _searchQuery: '',

    show: async function(initialProfileId = null, context = {}) {
        this._context = {
            orders: context.orders || (Store ? Store.shopifyHubOrders : []) || [],
            savedRuns: context.savedRuns || [],
            onUpdate: context.onUpdate || null
        };
        this._selectedProfileId = initialProfileId;
        this._searchQuery = '';

        const existing = document.getElementById('blacklist-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'blacklist-modal-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,.7);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;animation:fadeIn .2s ease;';

        overlay.innerHTML = `
            <div id="blacklist-modal-container" style="background:#ffffff;border-radius:18px;max-width:1160px;width:100%;height:88vh;max-height:860px;display:flex;flex-direction:column;box-shadow:0 25px 60px -15px rgba(0,0,0,.4);overflow:hidden;font-family:inherit;border:1px solid rgba(255,255,255,0.2);">
                <!-- Fejléc -->
                <div style="padding:14px 22px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:#0f172a;color:#ffffff;flex-shrink:0;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:34px;height:34px;border-radius:8px;background:#1e293b;border:1px solid #334155;display:flex;align-items:center;justify-content:center;color:#f87171;font-size:18px;">
                            <i class="ph-bold ph-prohibit"></i>
                        </div>
                        <div>
                            <h3 style="margin:0;font-size:15px;font-weight:800;letter-spacing:0.02em;color:#ffffff;display:flex;align-items:center;gap:8px;">
                                Feketelista Kezelő
                                <span id="bl-total-badge" style="background:#334155;color:#e2e8f0;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700;">0 profil</span>
                            </h3>
                            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">
                                Kockázatos vagy át nem vett rendelések vásárlóinak központi nyilvántartása
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <button type="button" id="bl-btn-new-profile" style="background:#ef4444;color:#ffffff;border:none;padding:6px 14px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(239,68,68,0.35);transition:all .15s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                            <i class="ph-bold ph-user-plus"></i>
                            <span>Új Profil</span>
                        </button>
                        <button type="button" id="bl-btn-close" style="background:transparent;border:none;color:#94a3b8;font-size:20px;cursor:pointer;padding:4px;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:all .15s;" onmouseover="this.style.color='#ffffff';this.style.background='#334155'" onmouseout="this.style.color='#94a3b8';this.style.background='transparent'">
                            <i class="ph-bold ph-x"></i>
                        </button>
                    </div>
                </div>

                <!-- Törzs: Kétoszlopos elrendezés (Bal: Profil lista, Jobb: Profil részletek & fuvarok) -->
                <div style="display:flex;flex:1;min-height:0;overflow:hidden;background:#f8fafc;">
                    
                    <!-- Bal Oszlop: Kereső + Profil lista (340px) -->
                    <div style="width:340px;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;background:#ffffff;flex-shrink:0;">
                        <div style="padding:10px 12px;border-bottom:1px solid #f1f5f9;background:#ffffff;">
                            <div style="position:relative;">
                                <i class="ph-bold ph-magnifying-glass" style="position:absolute;left:10px;top:8px;color:#94a3b8;font-size:12px;"></i>
                                <input type="text" id="bl-search-input" placeholder="Keresés név, telefon, cím, email, ID..." style="width:100%;box-sizing:border-box;padding:5px 8px 5px 28px;border:1px solid #cbd5e1;border-radius:6px;font-size:11.5px;font-family:inherit;outline:none;background:#f8fafc;">
                            </div>
                        </div>
                        <div id="bl-profiles-list" style="flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:6px;">
                            <div style="text-align:center;padding:24px;color:#94a3b8;font-size:12px;">Profilok betöltése...</div>
                        </div>
                    </div>

                    <!-- Jobb Oszlop: Profil részletező (flex: 1) -->
                    <div id="bl-profile-detail" style="flex:1;min-width:0;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:18px;">
                        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:13px;flex-direction:column;gap:8px;">
                            <i class="ph-bold ph-cursor-click" style="font-size:28px;color:#cbd5e1;"></i>
                            <span>Válassz ki egy profilt a bal oldali listából, vagy hozz létre egy újat.</span>
                        </div>
                    </div>

                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Eseménykezelők
        document.getElementById('bl-btn-close').addEventListener('click', () => this.close());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        document.getElementById('bl-btn-new-profile').addEventListener('click', () => {
            this.showProfileFormModal();
        });

        const searchInput = document.getElementById('bl-search-input');
        searchInput.addEventListener('input', (e) => {
            this._searchQuery = e.target.value.trim().toLowerCase();
            this.renderProfilesList();
        });

        // Profilok betöltése és kirajzolása
        await this.loadAndRender();
    },

    close: function() {
        const overlay = document.getElementById('blacklist-modal-overlay');
        if (overlay) overlay.remove();
        if (this._context.onUpdate && typeof this._context.onUpdate === 'function') {
            this._context.onUpdate();
        }
    },

    loadAndRender: async function() {
        const profiles = await BlacklistService.getProfiles();
        const totalBadge = document.getElementById('bl-total-badge');
        if (totalBadge) totalBadge.innerText = `${profiles.length} profil`;

        // Ha van megadott profil id, vagy nincs kijelölve és van legalább egy profil
        if (!this._selectedProfileId && profiles.length > 0) {
            this._selectedProfileId = profiles[0].id;
        }

        this.renderProfilesList(profiles);
        this.renderSelectedProfile(profiles);
    },

    renderProfilesList: function(allProfiles = null) {
        const listContainer = document.getElementById('bl-profiles-list');
        if (!listContainer) return;

        const profiles = allProfiles || BlacklistService._profilesCache || [];
        const query = this._searchQuery;

        const filtered = profiles.filter(p => {
            if (!query) return true;
            const nameMatch = (p.name || '').toLowerCase().includes(query);
            const phoneMatch = (p.phones || (p.phone ? [p.phone] : [])).some(ph => ph.toLowerCase().includes(query));
            const addrMatch = (p.addresses || (p.address ? [p.address] : [])).some(a => a.toLowerCase().includes(query));
            const emailMatch = (p.emails || (p.email ? [p.email] : [])).some(e => e.toLowerCase().includes(query));
            const orderIdMatch = (p.orderIds || (p.orderId ? [p.orderId] : [])).some(id => String(id).toLowerCase().includes(query.replace(/^#/, '')));
            const noteMatch = (p.note || '').toLowerCase().includes(query);
            return nameMatch || phoneMatch || addrMatch || emailMatch || orderIdMatch || noteMatch;
        });

        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align:center;padding:30px 10px;color:#94a3b8;font-size:12px;">
                    <i class="ph-bold ph-magnifying-glass" style="font-size:22px;display:block;margin-bottom:6px;color:#cbd5e1;"></i>
                    ${query ? 'Nincs találat a keresésre.' : 'Még nincs rögzített feketelista profil.'}
                </div>
            `;
            return;
        }

        listContainer.innerHTML = filtered.map(p => {
            const isSelected = p.id === this._selectedProfileId;
            const phones = Array.isArray(p.phones) ? p.phones : (p.phone ? [p.phone] : []);
            const addresses = Array.isArray(p.addresses) ? p.addresses : (p.address ? [p.address] : []);
            const emails = Array.isArray(p.emails) ? p.emails : (p.email ? [p.email] : []);
            const orderIds = Array.isArray(p.orderIds) ? p.orderIds : (p.orderId ? [p.orderId] : []);

            const phoneText = phones[0] || '';
            const addrText = addresses[0] || '';
            const emailText = emails[0] || '';

            return `
                <div class="bl-profile-item" data-id="${p.id}" style="padding:10px 12px;border-radius:8px;border:1.5px solid ${isSelected ? '#0f172a' : '#e2e8f0'};background:${isSelected ? '#0f172a' : '#ffffff'};color:${isSelected ? '#ffffff' : '#0f172a'};cursor:pointer;transition:all .15s;box-shadow:${isSelected ? '0 2px 6px rgba(15,23,42,0.2)' : 'none'};">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
                        <span style="font-weight:800;font-size:12.5px;color:${isSelected ? '#ffffff' : '#0f172a'};">${escapeHtml(p.name || 'Névtelen profil')}</span>
                        <span style="background:${isSelected ? 'rgba(239,68,68,0.3)' : '#fee2e2'};color:${isSelected ? '#fca5a5' : '#dc2626'};padding:1px 5px;border-radius:4px;font-size:9.5px;font-weight:700;">
                            Feketelista
                        </span>
                    </div>

                    ${orderIds.length > 0 ? `
                        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">
                            ${orderIds.slice(0, 3).map(id => `
                                <span style="background:${isSelected ? '#334155' : '#f1f5f9'};color:${isSelected ? '#e2e8f0' : '#475569'};padding:0 5px;border-radius:4px;font-size:9.5px;font-weight:700;">
                                    #${escapeHtml(String(id).replace(/^#/, ''))}
                                </span>
                            `).join('')}
                            ${orderIds.length > 3 ? `<span style="font-size:9.5px;color:${isSelected ? '#94a3b8' : '#64748b'};">+${orderIds.length - 3}</span>` : ''}
                        </div>
                    ` : ''}

                    ${phoneText ? `
                        <div style="font-size:11px;color:${isSelected ? '#cbd5e1' : '#64748b'};display:flex;align-items:center;gap:4px;margin-bottom:2px;">
                            <i class="ph-bold ph-phone" style="font-size:10px;"></i>
                            <span>${escapeHtml(phoneText)}</span>
                            ${phones.length > 1 ? `<span style="font-size:9.5px;opacity:0.7;">(+${phones.length - 1})</span>` : ''}
                        </div>
                    ` : ''}

                    ${addrText ? `
                        <div style="font-size:10.5px;color:${isSelected ? '#94a3b8' : '#94a3b8'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px;">
                            <i class="ph-bold ph-map-pin" style="font-size:10px;"></i>
                            <span>${escapeHtml(addrText)}</span>
                        </div>
                    ` : ''}

                    ${emailText ? `
                        <div style="font-size:10px;color:${isSelected ? '#cbd5e1' : '#64748b'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px;margin-top:2px;">
                            <i class="ph-bold ph-envelope" style="font-size:10px;"></i>
                            <span>${escapeHtml(emailText)}</span>
                            ${emails.length > 1 ? `<span style="font-size:9.5px;opacity:0.7;">(+${emails.length - 1})</span>` : ''}
                        </div>
                    ` : ''}

                    ${p.note ? `
                        <div style="font-size:10px;color:${isSelected ? '#fde047' : '#b45309'};margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-style:italic;">
                            "${escapeHtml(p.note)}"
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        listContainer.querySelectorAll('.bl-profile-item').forEach(el => {
            el.addEventListener('click', () => {
                this._selectedProfileId = el.getAttribute('data-id');
                this.renderProfilesList();
                this.renderSelectedProfile();
            });
        });
    },

    renderSelectedProfile: function(allProfiles = null) {
        const detailContainer = document.getElementById('bl-profile-detail');
        if (!detailContainer) return;

        const profiles = allProfiles || BlacklistService._profilesCache || [];
        const profile = profiles.find(p => p.id === this._selectedProfileId);

        if (!profile) {
            detailContainer.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:13px;flex-direction:column;gap:8px;">
                    <i class="ph-bold ph-user-circle" style="font-size:32px;color:#cbd5e1;"></i>
                    <span>Válassz ki egy profilt a bal oldali listából.</span>
                </div>
            `;
            return;
        }

        // Kapcsolódó fuvarok megkeresése (rendelésszám, telefon, cím, email, név alapján)
        const relatedDeliveries = BlacklistService.findRelatedDeliveries(
            profile,
            this._context.orders,
            this._context.savedRuns
        );

        const orderIds = Array.isArray(profile.orderIds) ? profile.orderIds : (profile.orderId ? [profile.orderId] : []);
        const phones = Array.isArray(profile.phones) ? profile.phones : (profile.phone ? [profile.phone] : []);
        const addresses = Array.isArray(profile.addresses) ? profile.addresses : (profile.address ? [profile.address] : []);
        const emails = Array.isArray(profile.emails) ? profile.emails : (profile.email ? [profile.email] : []);
        const comments = Array.isArray(profile.comments) ? profile.comments : [];

        detailContainer.innerHTML = `
            <!-- Profil Fejléc & Adatok Kártya -->
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
                    <div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <h2 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;">${escapeHtml(profile.name)}</h2>
                            <span style="background:#0f172a;color:#ffffff;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.03em;">
                                Feketelista
                            </span>
                        </div>
                        <div style="font-size:11.5px;color:#64748b;margin-top:3px;">
                            Rögzítve: ${profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('hu-HU') : 'Nem ismert'}
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button type="button" id="bl-btn-edit-current" style="background:#f1f5f9;border:1px solid #cbd5e1;color:#334155;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all .15s;">
                            <i class="ph-bold ph-pencil-simple"></i>
                            <span>Szerkesztés</span>
                        </button>
                        <button type="button" id="bl-btn-delete-current" style="background:#fee2e2;border:1px solid #fca5a5;color:#dc2626;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all .15s;">
                            <i class="ph-bold ph-trash"></i>
                            <span>Törlés</span>
                        </button>
                    </div>
                </div>

                <!-- Adatok Rács (4 oszlop/kártya: Rendelésszámok, Telefonok, Címek, E-mailek) -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;font-size:12px;">
                    
                    <!-- 1. Rendelésszám(ok) -->
                    <div style="background:#f8fafc;padding:10px 12px;border-radius:8px;border:1px solid #f1f5f9;">
                        <span style="color:#64748b;font-weight:700;font-size:10.5px;text-transform:uppercase;display:block;margin-bottom:6px;">
                            <i class="ph-bold ph-hash" style="color:#475569;"></i> Rendelésszám(ok):
                        </span>
                        ${orderIds.length > 0 ? `
                            <div style="display:flex;flex-wrap:wrap;gap:5px;">
                                ${orderIds.map(id => `
                                    <span style="background:#0f172a;color:#ffffff;padding:2px 7px;border-radius:5px;font-weight:700;font-size:11px;">
                                        #${escapeHtml(String(id).replace(/^#/, ''))}
                                    </span>
                                `).join('')}
                            </div>
                        ` : '<span style="color:#94a3b8;">Nincs megadva</span>'}
                    </div>

                    <!-- 2. Telefonszám(ok) -->
                    <div style="background:#f8fafc;padding:10px 12px;border-radius:8px;border:1px solid #f1f5f9;">
                        <span style="color:#64748b;font-weight:700;font-size:10.5px;text-transform:uppercase;display:block;margin-bottom:6px;">
                            <i class="ph-bold ph-phone" style="color:#3b82f6;"></i> Telefonszám(ok):
                        </span>
                        ${phones.length > 0 ? phones.map(p => `
                            <div style="font-weight:700;color:#0f172a;margin-bottom:2px;">${escapeHtml(p)}</div>
                        `).join('') : '<span style="color:#94a3b8;">Nincs megadva</span>'}
                    </div>

                    <!-- 3. Cím(ek) -->
                    <div style="background:#f8fafc;padding:10px 12px;border-radius:8px;border:1px solid #f1f5f9;">
                        <span style="color:#64748b;font-weight:700;font-size:10.5px;text-transform:uppercase;display:block;margin-bottom:6px;">
                            <i class="ph-bold ph-map-pin" style="color:#ef4444;"></i> Cím(ek):
                        </span>
                        ${addresses.length > 0 ? addresses.map(a => `
                            <div style="font-weight:600;color:#0f172a;line-height:1.35;margin-bottom:3px;">${escapeHtml(a)}</div>
                        `).join('') : '<span style="color:#94a3b8;">Nincs megadva</span>'}
                    </div>

                    <!-- 4. E-mail cím(ek) -->
                    <div style="background:#f8fafc;padding:10px 12px;border-radius:8px;border:1px solid #f1f5f9;">
                        <span style="color:#64748b;font-weight:700;font-size:10.5px;text-transform:uppercase;display:block;margin-bottom:6px;">
                            <i class="ph-bold ph-envelope" style="color:#8b5cf6;"></i> E-mail cím(ek):
                        </span>
                        ${emails.length > 0 ? emails.map(e => `
                            <div style="font-weight:600;color:#0f172a;word-break:break-all;margin-bottom:2px;">${escapeHtml(e)}</div>
                        `).join('') : '<span style="color:#94a3b8;">Nincs megadva</span>'}
                    </div>

                </div>

                ${profile.note ? `
                    <div style="margin-top:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:9px 12px;font-size:12px;color:#92400e;">
                        <span style="font-weight:800;text-transform:uppercase;font-size:10px;display:block;margin-bottom:2px;letter-spacing:0.02em;">
                            Kiemelt indoklás / Figyelmeztetés:
                        </span>
                        <div style="font-style:italic;">"${escapeHtml(profile.note)}"</div>
                    </div>
                ` : ''}
            </div>

            <!-- 1. SZEKCIÓ: KAPCSOLÓDÓ FUVAROK ÉS RENDELÉSEK -->
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                    <h4 style="margin:0;font-size:13.5px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:7px;">
                        <i class="ph-bold ph-truck" style="color:#0284c7;font-size:16px;"></i>
                        <span>Kapcsolódó fuvarok és rendelések</span>
                        <span style="background:#e0f2fe;color:#0369a1;padding:1px 7px;border-radius:10px;font-size:11px;">
                            ${relatedDeliveries.length} db
                        </span>
                    </h4>
                </div>

                ${relatedDeliveries.length === 0 ? `
                    <div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px;background:#f8fafc;border-radius:8px;">
                        Nem található a rendszerben ehhez a profilhoz kapcsolódó korábbi fuvar vagy nyitott rendelés.
                    </div>
                ` : `
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${relatedDeliveries.map(d => `
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                                    <span style="font-weight:800;font-size:13px;color:#0f172a;">${escapeHtml(d.orderId)}</span>
                                    <span style="background:${d.statusColor};color:#ffffff;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700;">
                                        ${escapeHtml(d.statusText)}
                                    </span>
                                    <span style="color:#64748b;font-size:12px;">
                                        <i class="ph-bold ph-calendar-blank"></i> ${escapeHtml(d.runDate)}
                                    </span>
                                    <span style="color:#0369a1;font-weight:700;font-size:12px;">
                                        <i class="ph-bold ph-user"></i> ${escapeHtml(d.courier)}
                                    </span>
                                    ${d.company ? `<span style="background:#e2e8f0;color:#334155;padding:1px 5px;border-radius:4px;font-size:10px;">${escapeHtml(d.company)}</span>` : ''}
                                </div>
                                <div style="font-size:12px;font-weight:700;color:#0f172a;">
                                    ${d.codAmount > 0 ? `Utánvét: ${new Intl.NumberFormat('hu-HU').format(d.codAmount)} Ft` : 'Nem utánvétes'}
                                </div>
                                ${(d.failReason || d.responsibility) ? `
                                    <div style="width:100%;margin-top:4px;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;border-radius:6px;padding:4px 8px;font-size:11px;">
                                        <strong>Meghiúsulás oka:</strong> ${escapeHtml(d.failReason || 'Nem ismert')}
                                        ${d.responsibility ? ` (Felelősség: <strong>${escapeHtml(d.responsibility)}</strong>)` : ''}
                                    </div>
                                ` : ''}
                                ${d.note ? `
                                    <div style="width:100%;font-size:11px;color:#64748b;font-style:italic;">
                                        Rendelés megjegyzés: "${escapeHtml(d.note)}"
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <!-- 2. SZEKCIÓ: BELSŐ KOMMENTEK ÉS INFÓK -->
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                    <h4 style="margin:0;font-size:13.5px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:7px;">
                        <i class="ph-bold ph-chat-centered-text" style="color:#7c3aed;font-size:16px;"></i>
                        <span>Belső feljegyzések és megjegyzések</span>
                        <span style="background:#f3e8ff;color:#7c3aed;padding:1px 7px;border-radius:10px;font-size:11px;">
                            ${comments.length} bejegyzés
                        </span>
                    </h4>
                </div>

                <!-- Új Komment Űrlap -->
                <div style="margin-bottom:14px;">
                    <textarea id="bl-comment-input" rows="2" placeholder="Írj ide új információt a vásárlóról (pl. telefonos egyeztetés eredménye, átvételi kifogás)..." style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:7px;font-family:inherit;font-size:12px;color:#0f172a;resize:vertical;outline:none;line-height:1.4;"></textarea>
                    <div style="display:flex;justify-content:flex-end;margin-top:6px;">
                        <button type="button" id="bl-btn-add-comment" style="background:#7c3aed;color:#ffffff;border:none;padding:5px 14px;border-radius:6px;font-size:11.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
                            <i class="ph-bold ph-plus-circle"></i>
                            <span>Komment hozzáadása</span>
                        </button>
                    </div>
                </div>

                <!-- Kommentek listája -->
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${comments.length === 0 ? `
                        <div style="padding:14px;text-align:center;color:#94a3b8;font-size:12px;background:#f8fafc;border-radius:8px;">
                            Még nincsenek belső feljegyzések erről az egyénről.
                        </div>
                    ` : comments.map(c => `
                        <div style="background:#f8fafc;border:1px solid #f1f5f9;border-left:3px solid #7c3aed;border-radius:6px;padding:8px 12px;font-size:12px;">
                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;font-size:11px;color:#64748b;">
                                <strong style="color:#475569;">${escapeHtml(c.author || 'Munkatárs')}</strong>
                                <span>${c.createdAt ? new Date(c.createdAt).toLocaleString('hu-HU') : ''}</span>
                            </div>
                            <div style="color:#1e293b;line-height:1.4;white-space:pre-wrap;">${escapeHtml(c.text)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Szerkesztés gomb
        document.getElementById('bl-btn-edit-current')?.addEventListener('click', () => {
            this.showProfileFormModal(profile);
        });

        // Törlés gomb
        document.getElementById('bl-btn-delete-current')?.addEventListener('click', async () => {
            const confirmed = await CustomDialog.confirm(
                `Biztosan törölni szeretnéd a(z) "${profile.name}" profilt a feketelistáról?`,
                'Profil Törlése'
            );
            if (confirmed) {
                try {
                    await BlacklistService.deleteProfile(profile.id);
                    this._selectedProfileId = null;
                    await this.loadAndRender();
                    CustomDialog.alert('A profil sikeresen törölve a feketelistáról.', 'Törölve', 'success');
                } catch (e) {
                    CustomDialog.alert(`Hiba a törlés során: ${e.message}`, 'Hiba', 'danger');
                }
            }
        });

        // Komment hozzáadása gomb
        document.getElementById('bl-btn-add-comment')?.addEventListener('click', async () => {
            const input = document.getElementById('bl-comment-input');
            const text = input ? input.value.trim() : '';
            if (!text) {
                CustomDialog.alert('Kérlek írj be valamilyen szöveget a megjegyzéshez!', 'Figyelmeztetés', 'warning');
                return;
            }

            try {
                await BlacklistService.addComment(profile.id, text);
                await this.loadAndRender();
            } catch (e) {
                CustomDialog.alert(`Hiba a komment mentése közben: ${e.message}`, 'Hiba', 'danger');
            }
        });
    },

    showProfileFormModal: function(existingProfile = null) {
        const modalId = 'bl-profile-form-overlay';
        const prev = document.getElementById(modalId);
        if (prev) prev.remove();

        const isEdit = !!existingProfile;

        const initialOrderIds = isEdit ? (Array.isArray(existingProfile.orderIds) ? existingProfile.orderIds : (existingProfile.orderId ? [existingProfile.orderId] : [])) : [];
        const initialPhones = isEdit ? (Array.isArray(existingProfile.phones) ? existingProfile.phones : (existingProfile.phone ? [existingProfile.phone] : [])) : [];
        const initialAddresses = isEdit ? (Array.isArray(existingProfile.addresses) ? existingProfile.addresses : (existingProfile.address ? [existingProfile.address] : [])) : [];
        const initialEmails = isEdit ? (Array.isArray(existingProfile.emails) ? existingProfile.emails : (existingProfile.email ? [existingProfile.email] : [])) : [];

        const overlay = document.createElement('div');
        overlay.id = modalId;
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,.75);backdrop-filter:blur(6px);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;animation:fadeIn .15s ease;';

        overlay.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;max-width:580px;width:100%;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.3);font-family:inherit;">
                <!-- Fejléc -->
                <div style="padding:14px 20px;border-bottom:1px solid #e2e8f0;background:#0f172a;color:#ffffff;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <i class="ph-bold ${isEdit ? 'ph-pencil-simple' : 'ph-user-plus'}" style="color:#ef4444;font-size:18px;"></i>
                        <h3 style="margin:0;font-size:15px;font-weight:800;">
                            ${isEdit ? 'Feketelista Profil Szerkesztése' : 'Új Feketelista Profil Létrehozása'}
                        </h3>
                    </div>
                    <button type="button" id="bl-form-btn-close" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;">
                        <i class="ph-bold ph-x"></i>
                    </button>
                </div>

                <!-- Űrlap -->
                <form id="bl-profile-form" style="padding:18px 20px;display:flex;flex-direction:column;gap:14px;font-size:12px;overflow-y:auto;flex:1;">
                    
                    <!-- Gyors betöltő sáv rendelésből -->
                    <div style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:9px 12px;">
                        <div style="font-size:11px;font-weight:700;color:#334155;margin-bottom:6px;display:flex;align-items:center;gap:5px;">
                            <i class="ph-bold ph-lightning" style="color:#eab308;font-size:14px;"></i>
                            <span>Adatok automatikus betöltése meglévő rendelésből:</span>
                        </div>
                        <div style="display:flex;gap:6px;">
                            <input type="text" id="bl-quick-lookup-input" placeholder="Rendelésszám (pl. #3794 vagy 4169)..." style="flex:1;min-width:0;box-sizing:border-box;padding:6px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:12px;outline:none;background:#ffffff;">
                            <button type="button" id="bl-quick-lookup-btn" style="background:#0284c7;color:#ffffff;border:none;padding:6px 12px;border-radius:6px;font-size:11.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;transition:all .15s;" onmouseover="this.style.background='#0369a1'" onmouseout="this.style.background='#0284c7'">
                                <i class="ph-bold ph-download-simple"></i>
                                <span>Betöltés</span>
                            </button>
                        </div>
                        <div id="bl-quick-lookup-msg" style="display:none;margin-top:6px;font-size:11px;font-weight:600;line-height:1.35;"></div>
                    </div>

                    <!-- 1. Vásárló Neve -->
                    <div>
                        <label style="display:block;font-weight:700;color:#334155;margin-bottom:4px;">
                            Vásárló / Személy Neve <span style="color:#ef4444;">*</span>
                        </label>
                        <input type="text" id="bl-input-name" required value="${escapeHtml(isEdit ? existingProfile.name || '' : '')}" placeholder="pl. Kiss János vagy Minta Kft." style="width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:13px;outline:none;">
                    </div>

                    <!-- 2. Rendelésszám(ok) - Egyesével felvihető lista -->
                    <div>
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
                            <label style="font-weight:700;color:#334155;display:flex;align-items:center;gap:5px;">
                                <i class="ph-bold ph-hash" style="color:#475569;"></i>
                                <span>Rendelésszám(ok)</span>
                                <span style="font-weight:400;color:#64748b;font-size:11px;">(pl. 3794, #4169)</span>
                            </label>
                            <button type="button" id="bl-btn-add-orderid" style="background:#f1f5f9;border:1px dashed #94a3b8;color:#0284c7;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all .15s;">
                                <i class="ph-bold ph-plus"></i> Új rendelésszám
                            </button>
                        </div>
                        <div id="bl-orderids-container" style="display:flex;flex-direction:column;gap:6px;"></div>
                    </div>

                    <!-- 3. Telefonszám(ok) - Egyesével felvihető lista -->
                    <div>
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
                            <label style="font-weight:700;color:#334155;display:flex;align-items:center;gap:5px;">
                                <i class="ph-bold ph-phone" style="color:#3b82f6;"></i>
                                <span>Telefonszám(ok)</span>
                                <span style="font-weight:400;color:#64748b;font-size:11px;">(bármelyik egyezhet)</span>
                            </label>
                            <button type="button" id="bl-btn-add-phone" style="background:#f1f5f9;border:1px dashed #94a3b8;color:#0284c7;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all .15s;">
                                <i class="ph-bold ph-plus"></i> Új telefonszám
                            </button>
                        </div>
                        <div id="bl-phones-container" style="display:flex;flex-direction:column;gap:6px;"></div>
                    </div>

                    <!-- 4. Cím(ek) - Egyesével felvihető lista -->
                    <div>
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
                            <label style="font-weight:700;color:#334155;display:flex;align-items:center;gap:5px;">
                                <i class="ph-bold ph-map-pin" style="color:#ef4444;"></i>
                                <span>Cím(ek)</span>
                                <span style="font-weight:400;color:#64748b;font-size:11px;">(irányítószám, város, utca, házszám)</span>
                            </label>
                            <button type="button" id="bl-btn-add-address" style="background:#f1f5f9;border:1px dashed #94a3b8;color:#0284c7;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all .15s;">
                                <i class="ph-bold ph-plus"></i> Új cím
                            </button>
                        </div>
                        <div id="bl-addresses-container" style="display:flex;flex-direction:column;gap:6px;"></div>
                    </div>

                    <!-- 5. E-mail cím(ek) - Egyesével felvihető lista -->
                    <div>
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
                            <label style="font-weight:700;color:#334155;display:flex;align-items:center;gap:5px;">
                                <i class="ph-bold ph-envelope" style="color:#8b5cf6;"></i>
                                <span>E-mail cím(ek)</span>
                                <span style="font-weight:400;color:#64748b;font-size:11px;">(több e-mail cím is megadható)</span>
                            </label>
                            <button type="button" id="bl-btn-add-email" style="background:#f1f5f9;border:1px dashed #94a3b8;color:#0284c7;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all .15s;">
                                <i class="ph-bold ph-plus"></i> Új e-mail cím
                            </button>
                        </div>
                        <div id="bl-emails-container" style="display:flex;flex-direction:column;gap:6px;"></div>
                    </div>

                    <!-- 6. Kiemelt indoklás / Figyelmeztetés -->
                    <div>
                        <label style="display:block;font-weight:700;color:#334155;margin-bottom:4px;">
                            Kiemelt indoklás / Figyelmeztetés <span style="font-weight:400;color:#64748b;">(megjelenik a rendelésnél)</span>
                        </label>
                        <textarea id="bl-input-note" rows="2" placeholder="pl. Kétszer nem vette át a csomagot a futártól, a telefonban agresszív, csak előre fizetéssel küldhető." style="width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:12px;font-family:inherit;outline:none;">${escapeHtml(isEdit ? existingProfile.note || '' : '')}</textarea>
                    </div>

                    <!-- Lábléc gombok -->
                    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px;padding-top:12px;border-top:1px solid #f1f5f9;flex-shrink:0;">
                        <button type="button" id="bl-form-btn-cancel" style="background:#f1f5f9;border:1px solid #cbd5e1;color:#475569;padding:7px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">
                            Mégse
                        </button>
                        <button type="submit" style="background:#0f172a;color:#ffffff;border:none;padding:7px 16px;border-radius:6px;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 4px rgba(15,23,42,0.25);">
                            <i class="ph-bold ph-floppy-disk"></i>
                            <span>Mentés</span>
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);

        const closeForm = () => overlay.remove();
        document.getElementById('bl-form-btn-close').addEventListener('click', closeForm);
        document.getElementById('bl-form-btn-cancel').addEventListener('click', closeForm);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeForm();
        });

        // Dinamikus sor hozzáadó segédfüggvény
        const addDynamicRow = (container, value = '', placeholder = '', inputClass = '', inputType = 'text') => {
            const row = document.createElement('div');
            row.className = 'bl-dynamic-row';
            row.style.cssText = 'display:flex;align-items:center;gap:6px;';
            row.innerHTML = `
                <input type="${inputType}" class="${inputClass}" value="${escapeHtml(value)}" placeholder="${placeholder}" style="flex:1;min-width:0;box-sizing:border-box;padding:7px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:12px;outline:none;font-family:inherit;background:#ffffff;">
                <button type="button" class="bl-btn-remove-row" title="Törlés" style="background:#fee2e2;border:1px solid #fca5a5;color:#dc2626;width:28px;height:28px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
                    <i class="ph-bold ph-trash" style="font-size:12px;"></i>
                </button>
            `;
            row.querySelector('.bl-btn-remove-row').addEventListener('click', () => row.remove());
            container.appendChild(row);
            return row;
        };

        const orderIdsContainer = overlay.querySelector('#bl-orderids-container');
        const phonesContainer = overlay.querySelector('#bl-phones-container');
        const addressesContainer = overlay.querySelector('#bl-addresses-container');
        const emailsContainer = overlay.querySelector('#bl-emails-container');

        // Gombok: Új sor hozzáadása
        overlay.querySelector('#bl-btn-add-orderid').addEventListener('click', () => {
            const r = addDynamicRow(orderIdsContainer, '', 'pl. #3794 vagy 3794', 'bl-input-orderid');
            r.querySelector('input').focus();
        });
        overlay.querySelector('#bl-btn-add-phone').addEventListener('click', () => {
            const r = addDynamicRow(phonesContainer, '', 'pl. +36301234567 vagy 06201234567', 'bl-input-phone', 'tel');
            r.querySelector('input').focus();
        });
        overlay.querySelector('#bl-btn-add-address').addEventListener('click', () => {
            const r = addDynamicRow(addressesContainer, '', 'pl. 8052 Fehérvárcsurgó, Vörösmarty tér 1/A', 'bl-input-address');
            r.querySelector('input').focus();
        });
        overlay.querySelector('#bl-btn-add-email').addEventListener('click', () => {
            const r = addDynamicRow(emailsContainer, '', 'pl. kiss.janos@gmail.com', 'bl-input-email', 'email');
            r.querySelector('input').focus();
        });

        // Kezdeti adatok feltöltése
        if (initialOrderIds.length > 0) {
            initialOrderIds.forEach(id => addDynamicRow(orderIdsContainer, id, 'pl. #3794 vagy 3794', 'bl-input-orderid'));
        } else {
            addDynamicRow(orderIdsContainer, '', 'pl. #3794 vagy 3794', 'bl-input-orderid');
        }

        if (initialPhones.length > 0) {
            initialPhones.forEach(ph => addDynamicRow(phonesContainer, ph, 'pl. +36301234567 vagy 06201234567', 'bl-input-phone', 'tel'));
        } else {
            addDynamicRow(phonesContainer, '', 'pl. +36301234567 vagy 06201234567', 'bl-input-phone', 'tel');
        }

        if (initialAddresses.length > 0) {
            initialAddresses.forEach(a => addDynamicRow(addressesContainer, a, 'pl. 8052 Fehérvárcsurgó, Vörösmarty tér 1/A', 'bl-input-address'));
        } else {
            addDynamicRow(addressesContainer, '', 'pl. 8052 Fehérvárcsurgó, Vörösmarty tér 1/A', 'bl-input-address');
        }

        if (initialEmails.length > 0) {
            initialEmails.forEach(e => addDynamicRow(emailsContainer, e, 'pl. kiss.janos@gmail.com', 'bl-input-email', 'email'));
        } else {
            addDynamicRow(emailsContainer, '', 'pl. kiss.janos@gmail.com', 'bl-input-email', 'email');
        }

        // Gyors keresés rendelés alapján
        const lookupInput = overlay.querySelector('#bl-quick-lookup-input');
        const lookupBtn = overlay.querySelector('#bl-quick-lookup-btn');
        const lookupMsg = overlay.querySelector('#bl-quick-lookup-msg');

        const doLookup = () => {
            const rawQuery = lookupInput.value.trim();
            if (!rawQuery) return;
            const cleanQuery = rawQuery.replace(/^#/, '').toLowerCase();

            const orders = this._context.orders || (Store ? Store.shopifyHubOrders : []) || [];
            let foundOrder = orders.find(o => {
                const id = String(o.id || '').replace(/^#/, '').toLowerCase();
                const num = String(o.order_number || o.orderNumber || '').replace(/^#/, '').toLowerCase();
                return id === cleanQuery || num === cleanQuery;
            });

            if (!foundOrder && Array.isArray(this._context.savedRuns)) {
                for (const run of this._context.savedRuns) {
                    const match = (run.orders || []).find(o => String(o.id || '').replace(/^#/, '').toLowerCase() === cleanQuery);
                    if (match) {
                        foundOrder = match;
                        break;
                    }
                }
            }

            if (!foundOrder) {
                lookupMsg.style.display = 'block';
                lookupMsg.style.color = '#dc2626';
                lookupMsg.innerHTML = `<i class="ph-bold ph-warning-circle"></i> Nem található rendelés ezzel a számmal: <strong>${escapeHtml(rawQuery)}</strong>`;
                return;
            }

            // Név feltöltése ha még üres
            const custName = (foundOrder.shippingName || foundOrder.billingName || foundOrder.customerName || foundOrder.name || '').trim();
            const nameInput = overlay.querySelector('#bl-input-name');
            if (!nameInput.value.trim() && custName) {
                nameInput.value = custName;
            }

            // Rendelésszám hozzáadása
            const cleanId = String(foundOrder.id || cleanQuery).replace(/^#/, '');
            const currentOrderIds = Array.from(overlay.querySelectorAll('.bl-input-orderid'))
                .map(i => i.value.trim().replace(/^#/, ''))
                .filter(Boolean);
            if (!currentOrderIds.includes(cleanId)) {
                // Ha van egyetlen üres sor, használjuk azt
                const emptyRow = Array.from(overlay.querySelectorAll('.bl-input-orderid')).find(i => !i.value.trim());
                if (emptyRow) {
                    emptyRow.value = '#' + cleanId;
                } else {
                    addDynamicRow(orderIdsContainer, '#' + cleanId, 'pl. #3794 vagy 3794', 'bl-input-orderid');
                }
            }

            // Telefonszámok
            const phones = [foundOrder.shippingPhone, foundOrder.billingPhone, foundOrder.phone].filter(Boolean);
            const currentPhones = Array.from(overlay.querySelectorAll('.bl-input-phone'))
                .map(i => i.value.trim())
                .filter(Boolean);
            for (const ph of phones) {
                const normPh = ph.trim();
                if (!currentPhones.includes(normPh)) {
                    const emptyRow = Array.from(overlay.querySelectorAll('.bl-input-phone')).find(i => !i.value.trim());
                    if (emptyRow) {
                        emptyRow.value = normPh;
                    } else {
                        addDynamicRow(phonesContainer, normPh, 'pl. +36301234567 vagy 06201234567', 'bl-input-phone', 'tel');
                    }
                    currentPhones.push(normPh);
                }
            }

            // Címek
            const addrs = [foundOrder.fullAddress, foundOrder.address, foundOrder.address1].filter(Boolean);
            const currentAddrs = Array.from(overlay.querySelectorAll('.bl-input-address'))
                .map(i => i.value.trim())
                .filter(Boolean);
            for (const ad of addrs) {
                const normAd = ad.trim();
                if (!currentAddrs.includes(normAd)) {
                    const emptyRow = Array.from(overlay.querySelectorAll('.bl-input-address')).find(i => !i.value.trim());
                    if (emptyRow) {
                        emptyRow.value = normAd;
                    } else {
                        addDynamicRow(addressesContainer, normAd, 'pl. 8052 Fehérvárcsurgó, Vörösmarty tér 1/A', 'bl-input-address');
                    }
                    currentAddrs.push(normAd);
                }
            }

            // E-mail címek
            const emails = [foundOrder.email, foundOrder.customerEmail, foundOrder.customer?.email].filter(Boolean);
            const currentEmails = Array.from(overlay.querySelectorAll('.bl-input-email'))
                .map(i => i.value.trim().toLowerCase())
                .filter(Boolean);
            for (const em of emails) {
                const normEm = em.trim().toLowerCase();
                if (!currentEmails.includes(normEm)) {
                    const emptyRow = Array.from(overlay.querySelectorAll('.bl-input-email')).find(i => !i.value.trim());
                    if (emptyRow) {
                        emptyRow.value = normEm;
                    } else {
                        addDynamicRow(emailsContainer, normEm, 'pl. kiss.janos@gmail.com', 'bl-input-email', 'email');
                    }
                    currentEmails.push(normEm);
                }
            }

            lookupMsg.style.display = 'block';
            lookupMsg.style.color = '#15803d';
            lookupMsg.innerHTML = `<i class="ph-bold ph-check-circle"></i> Rendelés adatai (#${escapeHtml(cleanId)}${custName ? ' - ' + escapeHtml(custName) : ''}) sikeresen betöltve a mezőkbe!`;
        };

        lookupBtn.addEventListener('click', doLookup);
        lookupInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doLookup();
            }
        });

        // Űrlap mentés
        document.getElementById('bl-profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('bl-input-name').value.trim();

            const orderIds = Array.from(overlay.querySelectorAll('.bl-input-orderid'))
                .map(i => i.value.trim().replace(/^#/, ''))
                .filter(Boolean);

            const phones = Array.from(overlay.querySelectorAll('.bl-input-phone'))
                .map(i => i.value.trim())
                .filter(Boolean);

            const addresses = Array.from(overlay.querySelectorAll('.bl-input-address'))
                .map(i => i.value.trim())
                .filter(Boolean);

            const emails = Array.from(overlay.querySelectorAll('.bl-input-email'))
                .map(i => i.value.trim().toLowerCase())
                .filter(Boolean);

            const note = document.getElementById('bl-input-note').value.trim();

            if (!name) {
                CustomDialog.alert('A vásárló / személy nevének megadása kötelező!', 'Hiba', 'warning');
                return;
            }

            if (orderIds.length === 0 && phones.length === 0 && addresses.length === 0 && emails.length === 0) {
                CustomDialog.alert('Kérlek adj meg legalább egy azonosítót (rendelésszám, telefonszám, cím vagy e-mail cím), hogy a rendszer fel tudja ismerni a vásárlót!', 'Azonosító szükséges', 'warning');
                return;
            }

            try {
                const payload = {
                    id: isEdit ? existingProfile.id : null,
                    name,
                    orderIds,
                    phones,
                    addresses,
                    emails,
                    email: emails[0] || '',
                    note,
                    comments: isEdit ? (existingProfile.comments || []) : []
                };

                const saved = await BlacklistService.saveProfile(payload);
                closeForm();
                this._selectedProfileId = saved.id;
                await this.loadAndRender();
                CustomDialog.alert(`A(z) "${name}" profil sikeresen mentve a feketelistára!`, 'Mentve', 'success');
            } catch (err) {
                CustomDialog.alert(`Hiba a mentés során: ${err.message}`, 'Hiba', 'danger');
            }
        });
    },

    /**
     * Gyors hozzáadás egy rendelés adataiból előtöltve
     */
    addFromOrder: function(order, context = {}) {
        const name = (order.shippingName || order.billingName || order.customerName || '').trim();
        const phones = [order.shippingPhone, order.billingPhone, order.phone].filter(Boolean);
        const addresses = [order.fullAddress, order.address, order.address1].filter(Boolean);
        const emails = [order.email, order.customerEmail, order.customer?.email].filter(Boolean);
        const cleanId = String(order.id || '').replace(/^#/, '');

        const mockProfile = {
            id: null,
            name: name,
            orderIds: cleanId ? [cleanId] : [],
            phones: phones,
            addresses: addresses,
            emails: emails,
            email: emails[0] || '',
            note: cleanId ? `Rendelésből rögzítve: #${cleanId}` : '',
            comments: []
        };

        this.show(null, context).then(() => {
            this.showProfileFormModal(mockProfile);
        });
    }
};
