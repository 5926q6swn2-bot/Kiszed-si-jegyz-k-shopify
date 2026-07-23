import { formatHungarianPhoneNumber } from '../utils/phoneFormatter.js?v=150';
import { cleanItemNameForMapping } from './shopify.js?v=145';
import { db, doc, getDoc, setDoc } from '../firebase-config.js?v=42';
import { CustomDialog } from '../utils/dialog.js';

let mappingsCache = null;
let profilesCache = null;
let activeProfileIdCache = null;
let rulesCache = null;

function getLevenshteinDistance(s1, s2) {
    const m = s1.length;
    const n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,    // delete
                    dp[i][j - 1] + 1,    // insert
                    dp[i - 1][j - 1] + 1 // substitute
                );
            }
        }
    }
    return dp[m][n];
}

function getStringSimilarity(str1, str2) {
    const s1 = (str1 || '').trim().toLowerCase();
    const s2 = (str2 || '').trim().toLowerCase();
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;
    
    const distance = getLevenshteinDistance(s1, s2);
    return 1.0 - distance / Math.max(s1.length, s2.length);
}

function normalizeMappings(mappings) {
    const cleaned = {};
    for (const key in mappings) {
        const cleanedKey = cleanItemNameForMapping(key);
        if (!cleanedKey) continue;
        
        let val = mappings[key];
        if (typeof val === 'string') {
            // Guess category from name
            let guessedCategoryId = 'cat_acoustic';
            const cleanNameLower = cleanedKey.toLowerCase();
            if (/(ragasztó|t-rex|trex|ragaszto|hpr)/i.test(cleanNameLower)) guessedCategoryId = 'cat_adhesive';
            else if (/profil/i.test(cleanNameLower)) guessedCategoryId = 'cat_profile';
            else if (/(wood|spc\s*wood)/i.test(cleanNameLower)) guessedCategoryId = 'cat_spcwood';
            else if (/(stone|spc\s*stone)/i.test(cleanNameLower)) guessedCategoryId = 'cat_spcstone';
            
            val = {
                abbrev: val,
                categoryId: guessedCategoryId
            };
        } else if (val && typeof val === 'object') {
            val = {
                abbrev: val.abbrev || '',
                categoryId: val.categoryId || '',
                linkedTo: val.linkedTo || undefined
            };
        }
        cleaned[cleanedKey] = val;
    }
    return cleaned;
}

export const PannonXPService = {
    async initializeAllSettings() {
        try {
            await Promise.all([
                this.initializeMappings(),
                this.initializeSenderProfiles(),
                this.initializePackagingRules()
            ]);
            console.log("KOPJ: Minden felhős PannonXP beállítás sikeresen betöltve.");
        } catch (err) {
            console.error("Hiba a felhős beállítások közös betöltésekor:", err);
        }
    },
    async initializeMappings() {
        try {
            const docRef = doc(db, 'pxp_settings', 'product_mappings');
            const docSnap = await getDoc(docRef);
            let mappings = {};
            if (docSnap.exists()) {
                mappings = docSnap.data().mappings || {};
            } else {
                // Fallback to localStorage for smooth migration
                const local = localStorage.getItem('pxp_product_mappings');
                if (local) {
                    try {
                        mappings = JSON.parse(local);
                    } catch (err) {
                        console.error("Local storage fallback parser error:", err);
                    }
                }
            }
            
            // Deduplicate and clean mappings
            const cleaned = {};
            const seenCleaned = new Set();
            const keys = Object.keys(mappings);
            
            // Sort keys to prioritize those that have abbreviations or categoryIds assigned
            keys.sort((a, b) => {
                const valA = mappings[a] || {};
                const valB = mappings[b] || {};
                const scoreA = (valA.abbrev ? 2 : 0) + (valA.categoryId ? 1 : 0);
                const scoreB = (valB.abbrev ? 2 : 0) + (valB.categoryId ? 1 : 0);
                return scoreB - scoreA;
            });
            
            const newMappings = {};
            for (const key of keys) {
                const cleanedKey = cleanItemNameForMapping(key);
                if (!cleanedKey) continue;
                
                const val = mappings[key] || {};
                // Skip empty mappings (no abbreviation and no category)
                if (!val.abbrev && !val.categoryId) {
                    continue;
                }
                
                if (!seenCleaned.has(cleanedKey)) {
                    seenCleaned.add(cleanedKey);
                    const formattedKey = key.trim().replace(/\s+/g, ' ');
                    newMappings[formattedKey] = val;
                }
            }
            
            // Consolidate abbreviation mappings
            this.consolidateMappings(newMappings);
            
            mappingsCache = newMappings;
            
            // Save mappings to cloud if we migrated or if deduplication/consolidation changed the structure
            await setDoc(docRef, { mappings: newMappings });
            
            return newMappings;
        } catch (e) {
            console.error("Hiba a felhős termék rövidítések betöltésekor:", e);
            mappingsCache = mappingsCache || {};
            return mappingsCache;
        }
    },

    getProductMappings() {
        if (mappingsCache === null) {
            console.warn("getProductMappings called before initializeMappings! Returning local storage fallback.");
            const stored = localStorage.getItem('pxp_product_mappings');
            if (stored) {
                try {
                    return JSON.parse(stored);
                } catch (e) {}
            }
            return {};
        }
        return mappingsCache;
    },

    getNormalizedProductMappings() {
        const raw = this.getProductMappings();
        return normalizeMappings(raw);
    },

    consolidateMappings(mappings) {
        if (!mappings) return;
        
        // 1. Clear existing linkedTo fields first
        for (const key in mappings) {
            if (mappings[key]) {
                delete mappings[key].linkedTo;
            }
        }
        
        // 2. Group keys by abbreviation
        const abbrevGroups = {};
        for (const key in mappings) {
            const val = mappings[key] || {};
            const abbrev = (val.abbrev || '').trim().toLowerCase();
            if (!abbrev) continue;
            
            if (!abbrevGroups[abbrev]) {
                abbrevGroups[abbrev] = [];
            }
            abbrevGroups[abbrev].push(key);
        }
        
        // 3. Mark secondary keys as linked to the shortest parent key in each group
        for (const abbrev in abbrevGroups) {
            const groupKeys = abbrevGroups[abbrev];
            if (groupKeys.length > 1) {
                groupKeys.sort((a, b) => a.length - b.length);
                const parentKey = groupKeys[0];
                for (let i = 1; i < groupKeys.length; i++) {
                    const keyToLink = groupKeys[i];
                    mappings[keyToLink] = {
                        ...mappings[keyToLink],
                        linkedTo: parentKey
                    };
                }
            }
        }
        return mappings;
    },

    async saveProductMappings(mappings) {
        // Consolidate abbreviations before saving
        this.consolidateMappings(mappings);
        
        mappingsCache = mappings;
        localStorage.setItem('pxp_product_mappings', JSON.stringify(mappings));
        
        try {
            const docRef = doc(db, 'pxp_settings', 'product_mappings');
            await setDoc(docRef, { mappings });
        } catch (e) {
            console.error("Hiba a felhős mentéskor:", e);
        }
    },

    async registerMissingProducts(orders) {
        if (!orders || orders.length === 0) return;
        const mappings = { ...this.getProductMappings() };
        const normalizedMappings = this.getNormalizedProductMappings();
        let updated = false;
        
        for (const order of orders) {
            for (const item of (order.items || [])) {
                const processSingleItem = async (itemName) => {
                    const cleanedKey = cleanItemNameForMapping(itemName);
                    if (!cleanedKey || normalizedMappings[cleanedKey]) return;
                    
                    // Directly register as empty/blank mapping (no fuzzy matching / confirm prompt)
                    mappings[itemName] = {
                        abbrev: '',
                        categoryId: ''
                    };
                    normalizedMappings[cleanedKey] = { abbrev: '', categoryId: '' };
                    updated = true;
                };

                if (item.isCollapsedProfile && item.subItems) {
                    for (const sub of item.subItems) {
                        await processSingleItem(sub.name);
                    }
                } else {
                    await processSingleItem(item.name);
                }
            }
        }
        
        if (updated) {
            await this.saveProductMappings(mappings);
        }
    },

    async initializeSenderProfiles() {
        try {
            const docRef = doc(db, 'pxp_settings', 'sender_profiles');
            const docSnap = await getDoc(docRef);
            let profiles = null;
            let activeProfileId = null;
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                profiles = data.profiles;
                activeProfileId = data.activeProfileId;
            } else {
                // Fallback to localStorage migration
                const localProfiles = localStorage.getItem('pxp_sender_profiles');
                const localActiveId = localStorage.getItem('pxp_active_profile_id');
                if (localProfiles) {
                    try {
                        profiles = JSON.parse(localProfiles);
                    } catch (e) {}
                }
                if (localActiveId) {
                    activeProfileId = localActiveId;
                }
                
                // Write defaults to cloud if no local storage
                if (!profiles) {
                    profiles = this.getDefaultProfiles();
                    activeProfileId = 'capsula';
                }
                
                await setDoc(docRef, { profiles, activeProfileId });
            }
            
            profilesCache = profiles;
            activeProfileIdCache = activeProfileId;
        } catch (e) {
            console.error("Hiba a felhős feladó profilok betöltésekor:", e);
            profilesCache = profilesCache || this.getDefaultProfiles();
            activeProfileIdCache = activeProfileIdCache || 'capsula';
        }
    },

    // Alapértelmezett beállítások
    getSenderProfiles() {
        if (profilesCache === null) {
            console.warn("getSenderProfiles called before initialize! Returning local storage fallback.");
            const stored = localStorage.getItem('pxp_sender_profiles');
            if (stored) {
                try {
                    return JSON.parse(stored);
                } catch (e) {}
            }
            return this.getDefaultProfiles();
        }
        return profilesCache;
    },

    getDefaultProfiles() {
        return [
            {
                id: 'capsula',
                profileName: 'Capsula Houses Kft.',
                uc_ugyfelkod: 'MINT',
                uc_nev: 'Capsula Kapcsolattartó',
                uc_tel: '+36301234567',
                uc_email: 'info@capsulahouses.hu',
                uc_ceg_nev: 'Capsula Houses Kft.',
                uc_ceg_cim_iranyito: '1107',
                uc_ceg_cim_telepules: 'Budapest',
                uc_ceg_cim_orszag: '36',
                uc_ceg_cim_kozterulet: 'Fokos utca 1.',
                uc_ceg_cim_megjegyzes: '',
                uc_ceg_adoszam: '12345678-2-42',
                uc_ceg_bankszamlaszam: '11111111-22222222-33333333',
                szl_tartalom: 'Panelburkolatok és kiegészítők'
            },
            {
                id: 'minta',
                profileName: 'Minta cég Kft.',
                uc_ugyfelkod: 'MINT',
                uc_nev: 'Minta Péter',
                uc_tel: '+36201234567',
                uc_email: 'minta@minta-ceg.hu',
                uc_ceg_nev: 'Minta cég Kft.',
                uc_ceg_cim_iranyito: '1234',
                uc_ceg_cim_telepules: 'Budapest',
                uc_ceg_cim_orszag: '36',
                uc_ceg_cim_kozterulet: 'Minta utca 1.',
                uc_ceg_cim_megjegyzes: '',
                uc_ceg_adoszam: '12345678-1-12',
                uc_ceg_bankszamlaszam: '11111111-22222222-00000000',
                szl_tartalom: 'Panelburkolatok és kiegészítők'
            }
        ];
    },

    async saveSenderProfiles(profiles) {
        profilesCache = profiles;
        localStorage.setItem('pxp_sender_profiles', JSON.stringify(profiles));
        
        try {
            const docRef = doc(db, 'pxp_settings', 'sender_profiles');
            await setDoc(docRef, { profiles, activeProfileId: activeProfileIdCache || 'capsula' });
        } catch (e) {
            console.error("Hiba a feladó profilok felhőbe mentésekor:", e);
        }
    },

    getActiveProfileId() {
        if (activeProfileIdCache === null) {
            return localStorage.getItem('pxp_active_profile_id') || 'capsula';
        }
        return activeProfileIdCache;
    },

    async setActiveProfileId(id) {
        activeProfileIdCache = id;
        localStorage.setItem('pxp_active_profile_id', id);
        
        try {
            const docRef = doc(db, 'pxp_settings', 'sender_profiles');
            await setDoc(docRef, { profiles: profilesCache || this.getDefaultProfiles(), activeProfileId: id });
        } catch (e) {
            console.error("Hiba az aktív profil ID felhőbe mentésekor:", e);
        }
    },

    getActiveProfile() {
        const profiles = this.getSenderProfiles();
        const activeId = this.getActiveProfileId();
        return profiles.find(p => p.id === activeId) || profiles[0];
    },

    async initializePackagingRules() {
        try {
            const docRef = doc(db, 'pxp_settings', 'packaging_rules');
            const docSnap = await getDoc(docRef);
            let rules = null;
            
            if (docSnap.exists()) {
                rules = docSnap.data().rules;
            } else {
                // Fallback to localStorage migration
                const localRules = localStorage.getItem('pxp_packaging_rules');
                if (localRules) {
                    try {
                        const parsed = JSON.parse(localRules);
                        if (parsed && parsed.categories) {
                            rules = parsed;
                        } else {
                            rules = this.migrateOldRulesToCategories(parsed);
                        }
                    } catch (e) {}
                }
                
                if (!rules) {
                    rules = { categories: this.getDefaultCategories() };
                }
                
                await setDoc(docRef, { rules });
            }
            
            rulesCache = rules;
        } catch (e) {
            console.error("Hiba a felhős csomagolási szabályok betöltésekor:", e);
            rulesCache = rulesCache || { categories: this.getDefaultCategories() };
        }
    },

    getPackagingRules() {
        if (rulesCache === null) {
            console.warn("getPackagingRules called before initialize! Returning local storage fallback.");
            const stored = localStorage.getItem('pxp_packaging_rules');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed && parsed.categories) {
                        return parsed;
                    }
                    return this.migrateOldRulesToCategories(parsed);
                } catch (e) {}
            }
            return {
                categories: this.getDefaultCategories()
            };
        }
        return rulesCache;
    },

    getDefaultCategories() {
        return [
            {
                id: 'cat_acoustic',
                name: 'Akusztikus Panelek',
                keywords: 'akusztikus, akupanel',
                maxLength: 278,
                maxQty: 5,
                type: 'cards',
                rules: {
                    1: { weight: 6.5, width: 10, height: 10 },
                    2: { weight: 13, width: 12, height: 15 },
                    3: { weight: 19.5, width: 15, height: 15 },
                    4: { weight: 26, width: 20, height: 15 },
                    5: { weight: 32.5, width: 25, height: 20 }
                }
            },
            {
                id: 'cat_spcwood',
                name: 'SPC Wood Padlók',
                keywords: 'wood + spc',
                maxLength: 122,
                maxQty: 8,
                type: 'cards',
                rules: {
                    1: { weight: 18, width: 20, height: 5 },
                    2: { weight: 36, width: 20, height: 10 },
                    3: { weight: 54, width: 20, height: 15 },
                    4: { weight: 72, width: 20, height: 20 },
                    5: { weight: 90, width: 20, height: 25 },
                    6: { weight: 108, width: 20, height: 30 },
                    7: { weight: 126, width: 20, height: 35 },
                    8: { weight: 144, width: 20, height: 40 }
                }
            },
            {
                id: 'cat_spcstone',
                name: 'SPC Stone Padlók',
                keywords: 'stone + spc',
                maxLength: 122,
                maxQty: 8,
                type: 'cards',
                rules: {
                    1: { weight: 18, width: 20, height: 5 },
                    2: { weight: 36, width: 20, height: 10 },
                    3: { weight: 54, width: 20, height: 15 },
                    4: { weight: 72, width: 20, height: 20 },
                    5: { weight: 90, width: 20, height: 25 },
                    6: { weight: 108, width: 20, height: 30 },
                    7: { weight: 126, width: 20, height: 35 },
                    8: { weight: 144, width: 20, height: 40 }
                }
            },
            {
                id: 'cat_profile',
                name: 'Profilok',
                keywords: 'profil',
                maxLength: 278,
                maxQty: 50,
                type: 'weight',
                itemWeight: 1.0,
                boxWeight: 1.0,
                width: 5,
                height: 5
            },
            {
                id: 'cat_adhesive',
                name: 'Ragasztók & Segédanyagok',
                keywords: 't-rex, trex, hpr, ragasztó, ragaszto',
                type: 'adhesive',
                itemWeight: 0.5,
                boxWeight: 0.0,
                maxQty: 12,
                maxLength: 30,
                width: 20,
                height: 10
            }
        ];
    },

    migrateOldRulesToCategories(oldRules) {
        const categories = this.getDefaultCategories();
        if (oldRules) {
            const acoustic = categories.find(c => c.id === 'cat_acoustic');
            if (acoustic) {
                if (oldRules.acousticKeywords) acoustic.keywords = oldRules.acousticKeywords.replace(/\|/g, ', ');
                if (oldRules.acousticMaxLength) acoustic.maxLength = oldRules.acousticMaxLength;
                if (oldRules.acousticMaxQty) acoustic.maxQty = oldRules.acousticMaxQty;
                if (oldRules.acousticRules) acoustic.rules = oldRules.acousticRules;
            }
            const spcWood = categories.find(c => c.id === 'cat_spcwood');
            if (spcWood) {
                if (oldRules.spcWoodKeywords) spcWood.keywords = oldRules.spcWoodKeywords.replace(/\|/g, ', ').replace(/\.\*/g, ' + ');
                if (oldRules.spcWoodMaxLength) spcWood.maxLength = oldRules.spcWoodMaxLength;
                if (oldRules.spcWoodMaxQty) spcWood.maxQty = oldRules.spcWoodMaxQty;
                if (oldRules.spcWoodRules) spcWood.rules = oldRules.spcWoodRules;
            }
            const spcStone = categories.find(c => c.id === 'cat_spcstone');
            if (spcStone) {
                if (oldRules.spcStoneKeywords) spcStone.keywords = oldRules.spcStoneKeywords.replace(/\|/g, ', ').replace(/\.\*/g, ' + ');
                if (oldRules.spcStoneMaxLength) spcStone.maxLength = oldRules.spcStoneMaxLength;
                if (oldRules.spcStoneMaxQty) spcStone.maxQty = oldRules.spcStoneMaxQty;
                if (oldRules.spcStoneRules) spcStone.rules = oldRules.spcStoneRules;
            }
            const profile = categories.find(c => c.id === 'cat_profile');
            if (profile) {
                if (oldRules.profileKeywords) profile.keywords = oldRules.profileKeywords.replace(/\|/g, ', ');
                if (oldRules.profileWeight) profile.itemWeight = oldRules.profileWeight;
                if (oldRules.profileBoxWeight) profile.boxWeight = oldRules.profileBoxWeight;
                if (oldRules.profileLength) profile.maxLength = oldRules.profileLength;
                if (oldRules.profileWidth) profile.width = oldRules.profileWidth;
                if (oldRules.profileHeight) profile.height = oldRules.profileHeight;
                if (oldRules.profileMaxQty) profile.maxQty = oldRules.profileMaxQty;
            }
            const adhesive = categories.find(c => c.id === 'cat_adhesive');
            if (adhesive) {
                if (oldRules.adhesiveKeywords) adhesive.keywords = oldRules.adhesiveKeywords.replace(/\|/g, ', ');
                if (oldRules.adhesiveWeight) adhesive.itemWeight = oldRules.adhesiveWeight;
                if (oldRules.adhesiveBoxWeight) adhesive.boxWeight = oldRules.adhesiveBoxWeight;
                if (oldRules.adhesiveMaxQty) adhesive.maxQty = oldRules.adhesiveMaxQty;
                if (oldRules.adhesiveLength) adhesive.maxLength = oldRules.adhesiveLength;
                if (oldRules.adhesiveWidth) adhesive.width = oldRules.adhesiveWidth;
                if (oldRules.adhesiveHeight) adhesive.height = oldRules.adhesiveHeight;
            }
        }
        return { categories };
    },

    async savePackagingRules(rules) {
        rulesCache = rules;
        localStorage.setItem('pxp_packaging_rules', JSON.stringify(rules));
        
        try {
            const docRef = doc(db, 'pxp_settings', 'packaging_rules');
            await setDoc(docRef, { rules });
        } catch (e) {
            console.error("Hiba a csomagolási szabályok felhőbe mentésekor:", e);
        }
    },

    // A PannonXP CSV oszlopainak listája (pontosan 54 oszlop)
    COLUMNS: [
        'uc_ugyfelkod', 'uc_nev', 'uc_tel', 'uc_email', 'uc_ceg_nev', 'uc_ceg_cim_iranyito', 'uc_ceg_cim_telepules', 'uc_ceg_cim_orszag', 'uc_ceg_cim_kozterulet', 'uc_ceg_cim_megjegyzes', 'uc_ceg_adoszam', 'uc_ceg_bankszamlaszam',
        'ucc_ugyfelkod', 'ucc_nev', 'ucc_tel', 'ucc_email', 'ucc_ceg_nev', 'ucc_ceg_cim_iranyito', 'ucc_ceg_cim_telepules', 'ucc_ceg_cim_orszag', 'ucc_ceg_cim_kozterulet', 'ucc_ceg_cim_megjegyzes', 'ucc_ceg_adoszam',
        'szl_12h', 'szl_okmany', 'szl_okmanyok', 'szl_sms', 'szl_visszaru', 'szl_csomagszam', 'szl_csomag_suly', 'szl_csomagok', 'szl_raklapos', 'szl_tartalom', 'szl_biztositas', 'szl_aruertek', 'szl_utanvet', 'szl_ekaer_szam', 'szl_ekaer_email', 'szl_koltseghely', 'szl_referenciaszam', 'szl_koltsegviselo', 'szl_adoszam', 'szl_maganszemely',
        'ucch_ugyfelkod', 'ucch_nev', 'ucch_tel', 'ucch_email', 'ucch_ceg_nev', 'ucch_ceg_cim_iranyito', 'ucch_ceg_cim_telepules', 'ucch_ceg_cim_orszag', 'ucch_ceg_cim_kozterulet', 'ucch_ceg_cim_megjegyzes', 'ucch_ceg_adoszam'
    ],

    // JSON csomagadatok generálása
    generateCsomagokJson(count, totalWeight) {
        const pkg = {};
        const sulyPerCsomag = (parseFloat(totalWeight) / parseInt(count)).toFixed(2);
        
        for (let i = 1; i <= count; i++) {
            pkg[i.toString()] = {
                db: 1,
                suly: sulyPerCsomag.toString(),
                hosszusag: 30,
                szelesseg: 20,
                magassag: 10,
                tipus: "doboz"
            };
        }
        return JSON.stringify(pkg);
    },

    generateCsomagokJsonFromDetail(packages) {
        const pkg = {};
        packages.forEach((p, idx) => {
            pkg[(idx + 1).toString()] = {
                db: 1,
                suly: parseFloat(p.suly).toFixed(2),
                hosszusag: parseInt(p.hosszusag) || 30,
                szelesseg: parseInt(p.szelesseg) || 20,
                magassag: parseInt(p.magassag) || 10,
                tipus: p.tipus || "doboz"
            };
        });
        return JSON.stringify(pkg);
    },

    calculateWeightAndPackages(items) {
        const rules = this.getPackagingRules();
        const categories = rules.categories || [];
        const mappings = this.getNormalizedProductMappings() || {};
        
        // Helper to convert user-friendly keywords to regex
        const parseKeywordsToRegex = (input) => {
            if (!input) return /$^/;
            const alternatives = input.split(',').map(alt => alt.trim()).filter(Boolean);
            if (alternatives.length === 0) return /$^/;
            
            const pattern = alternatives.map(alt => {
                const parts = alt.split('+').map(part => part.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).filter(Boolean);
                if (parts.length === 1) {
                    return parts[0];
                } else {
                    return parts.map(p => `(?=.*${p})`).join('') + '.*';
                }
            }).join('|');
            
            return new RegExp(pattern, 'i');
        };
        
        // Map category regexes
        const categoriesWithRegex = categories.map(cat => ({
            ...cat,
            regex: parseKeywordsToRegex(cat.keywords)
        }));
        
        // Count quantities for each category
        const qtyMap = {};
        categories.forEach(cat => {
            qtyMap[cat.id] = 0;
        });
        let otherQty = 0;
        let adhesiveWeight = 0;
        
        items.forEach(item => {
            const name = item.name.toLowerCase();
            
            const processItem = (itemName, itemQty, originalName) => {
                const cleanedName = cleanItemNameForMapping(originalName || itemName);
                const mapping = mappings[cleanedName];
                
                let matchedCat = null;
                if (mapping && typeof mapping === 'object' && mapping.categoryId) {
                    matchedCat = categories.find(cat => cat.id === mapping.categoryId);
                }
                
                // Fallback to keyword regex matching
                if (!matchedCat) {
                    matchedCat = categoriesWithRegex.find(cat => cat.regex.test(itemName));
                }
                
                if (matchedCat) {
                    qtyMap[matchedCat.id] += itemQty;
                    if (matchedCat.type === 'adhesive') {
                        adhesiveWeight += itemQty * (matchedCat.itemWeight || 0.5);
                    }
                } else {
                    otherQty += itemQty;
                }
            };
            
            if (item.isCollapsedProfile && item.subItems) {
                item.subItems.forEach(sub => {
                    processItem(sub.name.toLowerCase(), sub.qty, sub.name);
                });
                return;
            }
            
            processItem(name, item.qty, item.name);
        });
        
        const packagesDetail = [];
        
        // Generate packages for each category (except adhesives which are handled conditionally)
        categories.forEach(cat => {
            if (cat.type === 'adhesive') return;
            const qty = qtyMap[cat.id] || 0;
            if (qty === 0) return;
            
            if (cat.type === 'cards') {
                const maxPerPkg = cat.maxQty || 5;
                const pkgs = Math.ceil(qty / maxPerPkg);
                const base = Math.floor(qty / pkgs);
                const remainder = qty % pkgs;
                
                for (let i = 0; i < pkgs; i++) {
                    const qtyInPkg = i < remainder ? base + 1 : base;
                    const catRules = cat.rules || {};
                    const rule = catRules[qtyInPkg] || catRules[cat.maxQty] || { weight: qtyInPkg * 10, width: 20, height: 10 };
                    
                    packagesDetail.push({
                        suly: rule.weight,
                        hosszusag: cat.maxLength || 278,
                        szelesseg: rule.width,
                        magassag: rule.height,
                        tipus: "doboz",
                        description: "Panelburkolatok és kiegészítők"
                    });
                }
            } else if (cat.type === 'weight') {
                const maxPerPkg = cat.maxQty || 50;
                const pkgs = Math.ceil(qty / maxPerPkg);
                const base = Math.floor(qty / pkgs);
                const remainder = qty % pkgs;
                
                for (let i = 0; i < pkgs; i++) {
                    const qtyInPkg = i < remainder ? base + 1 : base;
                    const weight = (cat.boxWeight || 0) + (qtyInPkg * (cat.itemWeight || 1.0));
                    packagesDetail.push({
                        suly: weight,
                        hosszusag: cat.maxLength || 278,
                        szelesseg: cat.width || 5,
                        magassag: cat.height || 5,
                        tipus: "doboz",
                        description: "Panelburkolatok és kiegészítők"
                    });
                }
            }
        });
        
        // RAGASZTÓ LOGIKA
        // Ha van akupanel a rendelésben (qtyMap['cat_acoustic'] > 0), a ragasztó bekerülhet a panelek mellé doboz nélkül.
        // Viszont ha a ragasztók száma 7 vagy annál több, mindenképp külön dobozba (csomagba) kell csomagolni.
        const hasAcoustic = (qtyMap['cat_acoustic'] || 0) > 0;
        const adhesiveQty = qtyMap['cat_adhesive'] || 0;
        const acousticPkgs = packagesDetail.filter(p => p.description && p.description.includes('Panelburkolatok'));
        const shouldGlueBeSeparate = !hasAcoustic || adhesiveQty >= 7;
        
        if (!shouldGlueBeSeparate && acousticPkgs.length > 0) {
            // Nem kell külön csomag, mert bekerül az akupanel mellé doboz nélkül
        } else {
            // Ha külön csomagba kell rakni, a ragasztók saját dobozt kapnak a beállított maxQty, boxWeight és itemWeight szerint
            categories.forEach(cat => {
                if (cat.type !== 'adhesive') return;
                const qty = qtyMap[cat.id] || 0;
                if (qty === 0) return;
                
                const maxPerPkg = cat.maxQty || 12;
                const pkgs = Math.ceil(qty / maxPerPkg);
                const base = Math.floor(qty / pkgs);
                const remainder = qty % pkgs;
                
                for (let i = 0; i < pkgs; i++) {
                    const qtyInPkg = i < remainder ? base + 1 : base;
                    const weight = (cat.boxWeight || 0) + (qtyInPkg * (cat.itemWeight || 0.5));
                    packagesDetail.push({
                        suly: parseFloat(weight.toFixed(2)),
                        hosszusag: cat.maxLength || 30,
                        szelesseg: cat.width || 20,
                        magassag: cat.height || 10,
                        tipus: "doboz",
                        description: "Panelburkolatok és kiegészítők"
                    });
                }
            });
        }
        
        // Egyéb unmatched termékek külön doboza
        if (otherQty > 0) {
            packagesDetail.push({
                suly: Math.max(0.5, otherQty * 1.5),
                hosszusag: 30,
                szelesseg: 20,
                magassag: 10,
                tipus: "doboz",
                description: "Panelburkolatok és kiegészítők"
            });
        }
        
        // Biztonsági mentőöv, ha teljesen üres a lista
        if (packagesDetail.length === 0) {
            packagesDetail.push({
                suly: 1.0,
                hosszusag: 30,
                szelesseg: 20,
                magassag: 10,
                tipus: "doboz",
                description: "Panelburkolatok és kiegészítők"
            });
        }
        
        const totalWeight = packagesDetail.reduce((sum, p) => sum + p.suly, 0);
        
        return {
            packages: packagesDetail.length,
            weight: parseFloat(totalWeight.toFixed(2)),
            packagesDetail: packagesDetail,
            hasUnmatched: otherQty > 0
        };
    },

    // Rendelések átalakítása CSV-vé
    convertToCSV(orders, senderSettings) {
        const csvRows = [];
        
        // 1. Sor: Mezőnevek (ID sor és 'Mezőnév:' előtag nélkül)
        const headerRow = [...this.COLUMNS];
        csvRows.push(headerRow.map(val => this.escapeCsvValue(val)).join(';'));
        
        orders.forEach(order => {
            const rowData = [];
            
            // 1. Feladó beállítások (nincs szükség üres oszlopra az elején)
            rowData.push(senderSettings.uc_ugyfelkod || '');
            rowData.push(senderSettings.uc_nev || '');
            rowData.push(formatHungarianPhoneNumber(senderSettings.uc_tel || ''));
            rowData.push(senderSettings.uc_email || '');
            rowData.push(senderSettings.uc_ceg_nev || '');
            rowData.push(senderSettings.uc_ceg_cim_iranyito || '');
            rowData.push(senderSettings.uc_ceg_cim_telepules || '');
            rowData.push(senderSettings.uc_ceg_cim_orszag || '36');
            rowData.push(senderSettings.uc_ceg_cim_kozterulet || '');
            rowData.push(senderSettings.uc_ceg_cim_megjegyzes || '');
            rowData.push(senderSettings.uc_ceg_adoszam || '');
            rowData.push(senderSettings.uc_ceg_bankszamlaszam || '');
            
            // 2. Címzett adatok (Shopify-ból)
            rowData.push(''); // ucc_ugyfelkod (üres)
            rowData.push(order.shippingName || '');
            rowData.push(formatHungarianPhoneNumber(order.shippingPhone || ''));
            rowData.push(order.email || ''); // email
            
            // Ha van cég megadva a Shopify-ban, azt használjuk, különben a nevet
            rowData.push(order.shippingCompany || order.shippingName || ''); 
            
            // Cím felbontása (irányítószám, település, közterület)
            // A shopify parser már kiszedte a fullAddress-t vagy address-t
            // Megpróbáljuk a Shopify raw address mezőiből pontosan kinyerni
            rowData.push(order.zip || '');
            rowData.push(order.city || '');
            rowData.push(order.countryCode === 'HU' || !order.countryCode ? '36' : order.countryCode);
            
            // Közterület (utca, házszám, emelet, ajtó)
            let addressParts = [];
            if (order.address1) addressParts.push(order.address1);
            if (order.address2) addressParts.push(order.address2);
            let exportedStreet = addressParts.join(' ').replace(/,/g, ' ').replace(/\s+/g, ' ').trim() || (order.address || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
            rowData.push(exportedStreet);
            
            // Címzett megjegyzés
            rowData.push(order.notes || '');
            rowData.push(''); // ucc_ceg_adoszam (üres)
            
            // 3. Szállítási opciók
            rowData.push('0'); // szl_12h (alapértelmezett: 0)
            rowData.push('0'); // szl_okmany (alapértelmezett: 0)
            rowData.push('');  // szl_okmanyok
            rowData.push('1'); // szl_sms (alapértelmezett: 1)
            rowData.push('0'); // szl_visszaru (alapértelmezett: 0)
            
            // Csomagszám és súly
            const csomagszam = parseInt(order.pxp_csomagszam) || 1;
            const suly = parseFloat(order.pxp_suly) || 0.5;
            rowData.push(csomagszam.toString());
            rowData.push(suly.toFixed(2));
            
            if (order.pxp_packages && order.pxp_packages.length === csomagszam) {
                rowData.push(this.generateCsomagokJsonFromDetail(order.pxp_packages));
            } else {
                rowData.push(this.generateCsomagokJson(csomagszam, suly));
            }
            
            rowData.push('0'); // szl_raklapos
            rowData.push(senderSettings.szl_tartalom || 'Webáruházi termék');
            rowData.push('0'); // szl_biztositas
            rowData.push('0'); // szl_aruertek
            
            // Utánvét összege
            const COD = order.isCOD ? Math.round(order.codAmount) : 0;
            rowData.push(COD.toString());
            
            rowData.push(''); // szl_ekaer_szam
            rowData.push(''); // szl_ekaer_email
            rowData.push(''); // szl_koltseghely
            const refVal = (order.pxp_referencia || order.id || '').replace(/^#/, '');
            rowData.push(refVal); // szl_referenciaszam (Shopify order name or formatted reference)
            rowData.push(''); // szl_koltsegviselo (üresen hagyjuk, a PannonXP a fiók alapértelmezettét használja)
            rowData.push(''); // szl_adoszam (üresen hagyjuk)
            rowData.push(''); // szl_maganszemely (üresen hagyjuk)
            
            // 4. Harmadik fél adatok (ucch_...) - mind üres
            for (let i = 0; i < 11; i++) {
                rowData.push('');
            }
            
            csvRows.push(rowData.map(val => this.escapeCsvValue(val)).join(';'));
        });
        
        // PannonXP által kért kódolás a pontosvesszős elválasztással
        return csvRows.join('\r\n');
    },

    escapeCsvValue(val) {
        if (val === null || val === undefined) return '';
        let str = String(val);
        // A pontosvesszőket és sortöréseket kicseréljük szóközre, hogy a gyengébb CSV importőrök se csússzanak el
        str = str.replace(/;/g, ' ').replace(/[\r\n]+/g, ' ');
        // Ha tartalmaz idézőjelet, akkor idézőjelbe tesszük és duplázzuk az idézőjeleket
        if (/["]/.test(str)) {
            str = '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }
};
