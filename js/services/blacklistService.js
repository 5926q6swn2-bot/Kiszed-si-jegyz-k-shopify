// js/services/blacklistService.js
// Feketelista Szolgáltatás: Profilok kezelése, Firestore szinkronizáció,
// intelligens telefonszám és cím egyeztetés, valamint korábbi fuvarok feltárása.

import { db, auth, collection, getDocs, doc, setDoc, deleteDoc, addDoc, query } from '../firebase-config.js';
import { Store } from '../store/state.js';

import { 
    normalizePhoneForMatch, 
    isPhoneMatch, 
    normalizeAddressForMatch, 
    isAddressMatch, 
    isEmailMatch,
    isOrderIdMatch,
    matchOrderWithBlacklist, 
    findRelatedDeliveriesForProfile 
} from '../utils/blacklistUtils.js';

export { 
    normalizePhoneForMatch, 
    isPhoneMatch, 
    normalizeAddressForMatch, 
    isAddressMatch, 
    isEmailMatch,
    isOrderIdMatch,
    matchOrderWithBlacklist, 
    findRelatedDeliveriesForProfile 
};

export const BlacklistService = {
    COLLECTION_NAME: 'blacklist_profiles',
    _profilesCache: null,

    getProfiles: async function(forceRefresh = false) {
        if (!forceRefresh && this._profilesCache) {
            return this._profilesCache;
        }

        try {
            const local = typeof localStorage !== 'undefined' ? localStorage.getItem('kopj_blacklist_profiles') : null;
            if (local && !this._profilesCache) {
                try { this._profilesCache = JSON.parse(local); } catch(e) {}
            }

            if (db) {
                const q = query(collection(db, this.COLLECTION_NAME));
                const snap = await getDocs(q);
                const profiles = [];
                snap.forEach(d => {
                    profiles.push({ id: d.id, ...d.data() });
                });

                profiles.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'hu'));

                this._profilesCache = profiles;
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('kopj_blacklist_profiles', JSON.stringify(profiles));
                }
                if (Store && typeof Store.setBlacklistProfiles === 'function') {
                    Store.setBlacklistProfiles(profiles);
                }
                return profiles;
            }
        } catch (err) {
            console.warn('[BlacklistService.getProfiles error]', err);
        }

        return this._profilesCache || [];
    },

    saveProfile: async function(profileData) {
        try {
            const phones = (Array.isArray(profileData.phones) ? profileData.phones : (profileData.phone ? String(profileData.phone).split(/[\n,;]+/) : []))
                .map(p => p.trim())
                .filter(Boolean);

            const addresses = (Array.isArray(profileData.addresses) ? profileData.addresses : (profileData.address ? String(profileData.address).split(/[\n;]+/) : []))
                .map(a => a.trim())
                .filter(Boolean);

            const emails = (Array.isArray(profileData.emails) ? profileData.emails : (profileData.email ? String(profileData.email).split(/[\n,;]+/) : []))
                .map(e => e.trim().toLowerCase())
                .filter(Boolean);

            const orderIds = (Array.isArray(profileData.orderIds) ? profileData.orderIds : (profileData.orderId ? String(profileData.orderId).split(/[\n,;]+/) : []))
                .map(id => id.trim().replace(/^#/, ''))
                .filter(Boolean);

            const docData = {
                name: (profileData.name || '').trim(),
                phones: phones,
                addresses: addresses,
                emails: emails,
                orderIds: orderIds,
                email: emails[0] || (profileData.email || '').trim(),
                note: (profileData.note || '').trim(),
                comments: Array.isArray(profileData.comments) ? profileData.comments : [],
                updatedAt: new Date().toISOString()
            };

            let id = profileData.id;
            if (id) {
                await setDoc(doc(db, this.COLLECTION_NAME, id), docData, { merge: true });
            } else {
                docData.createdAt = new Date().toISOString();
                const docRef = await addDoc(collection(db, this.COLLECTION_NAME), docData);
                id = docRef.id;
            }

            await this.getProfiles(true);
            return { id, ...docData };
        } catch (err) {
            console.error('[BlacklistService.saveProfile error]', err);
            throw err;
        }
    },

    deleteProfile: async function(profileId) {
        try {
            if (db && profileId) {
                await deleteDoc(doc(db, this.COLLECTION_NAME, profileId));
            }
            await this.getProfiles(true);
            return true;
        } catch (err) {
            console.error('[BlacklistService.deleteProfile error]', err);
            throw err;
        }
    },

    addComment: async function(profileId, text, author = '') {
        try {
            if (!profileId || !text || !text.trim()) return null;
            const profiles = await this.getProfiles();
            const profile = profiles.find(p => p.id === profileId);
            if (!profile) throw new Error('A keresett feketelista profil nem található.');

            let userEmail = author;
            if (!userEmail && typeof auth !== 'undefined' && auth.currentUser) {
                userEmail = auth.currentUser.email || '';
            }
            if (!userEmail) userEmail = 'Raktár';

            const newComment = {
                id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                text: text.trim(),
                createdAt: new Date().toISOString(),
                author: userEmail
            };

            const updatedComments = [newComment, ...(profile.comments || [])];
            await setDoc(doc(db, this.COLLECTION_NAME, profileId), {
                comments: updatedComments,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            await this.getProfiles(true);
            return newComment;
        } catch (err) {
            console.error('[BlacklistService.addComment error]', err);
            throw err;
        }
    },

    matchOrder: function(order, profiles = null) {
        const blProfiles = profiles || this._profilesCache || (Store ? Store.blacklistProfiles : []) || [];
        return matchOrderWithBlacklist(order, blProfiles);
    },

    findRelatedDeliveries: function(profile, liveOrders = null, savedRuns = null) {
        return findRelatedDeliveriesForProfile(
            profile,
            liveOrders || (Store ? Store.shopifyHubOrders : []) || [],
            savedRuns || []
        );
    }
};
