import { formatHungarianPhoneNumber } from '../utils/phoneFormatter.js';
import { cleanItemNameForMapping } from './shopify.js';

export const PannonXPService = {
    getProductMappings() {
        const stored = localStorage.getItem('pxp_product_mappings');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const cleaned = {};
                for (const key in parsed) {
                    const cleanedKey = cleanItemNameForMapping(key);
                    if (cleanedKey) {
                        cleaned[cleanedKey] = parsed[key];
                    }
                }
                return cleaned;
            } catch (e) {
                console.error("Hiba a termék rövidítések betöltésekor:", e);
            }
        }
        return {};
    },

    saveProductMappings(mappings) {
        const cleaned = {};
        for (const key in mappings) {
            const cleanedKey = cleanItemNameForMapping(key);
            if (cleanedKey) {
                cleaned[cleanedKey] = mappings[key];
            }
        }
        localStorage.setItem('pxp_product_mappings', JSON.stringify(cleaned));
    },

    // Alapértelmezett beállítások (local storage-ból tölthető)
    getSenderProfiles() {
        const stored = localStorage.getItem('pxp_sender_profiles');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Hiba a mentett profilok betöltésekor:", e);
            }
        }
        
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
                szl_tartalom: 'Panelburkolat'
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
                szl_tartalom: 'Webáruházi termék'
            }
        ];
    },

    saveSenderProfiles(profiles) {
        localStorage.setItem('pxp_sender_profiles', JSON.stringify(profiles));
    },

    getActiveProfileId() {
        return localStorage.getItem('pxp_active_profile_id') || 'capsula';
    },

    setActiveProfileId(id) {
        localStorage.setItem('pxp_active_profile_id', id);
    },

    getActiveProfile() {
        const profiles = this.getSenderProfiles();
        const activeId = this.getActiveProfileId();
        return profiles.find(p => p.id === activeId) || profiles[0];
    },

    getPackagingRules() {
        const stored = localStorage.getItem('pxp_packaging_rules');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.categories) {
                    return parsed;
                }
                return this.migrateOldRulesToCategories(parsed);
            } catch (e) {
                console.error("Hiba a csomagolási szabályok betöltésekor:", e);
            }
        }
        return {
            categories: this.getDefaultCategories()
        };
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

    savePackagingRules(rules) {
        localStorage.setItem('pxp_packaging_rules', JSON.stringify(rules));
    },

    // A PannonXP CSV oszlopainak listája (pontosan 54 oszlop)
    COLUMNS: [
        'uc_ugyfelkod', 'uc_nev', 'uc_tel', 'uc_email', 'uc_ceg_nev', 'uc_ceg_cim_iranyito', 'uc_ceg_cim_telepules', 'uc_ceg_cim_orszag', 'uc_ceg_cim_kozterulet', 'uc_ceg_cim_megjegyzes', 'uc_ceg_adoszam', 'uc_ceg_bankszamlaszam',
        'ucc_ugyfelkod', 'ucc_nev', 'ucc_tel', 'ucc_email', 'ucc_ceg_nev', 'ucc_ceg_cim_iranyito', 'ucc_ceg_cim_telepules', 'uc_ceg_cim_orszag', 'uc_ceg_cim_kozterulet', 'uc_ceg_cim_megjegyzes', 'uc_ceg_adoszam',
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
            
            const processItem = (itemName, itemQty) => {
                const matchedCat = categoriesWithRegex.find(cat => cat.regex.test(itemName));
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
                    processItem(sub.name.toLowerCase(), sub.qty);
                });
                return;
            }
            
            processItem(name, item.qty);
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
                        description: `${qtyInPkg} db ${cat.name}`
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
                        description: `${qtyInPkg} db ${cat.name} (+doboz)`
                    });
                }
            }
        });
        
        // RAGASZTÓ LOGIKA
        // Ha van akupanel a rendelésben (qtyMap['cat_acoustic'] > 0), a ragasztó súlyát rárakjuk az akupanel csomagokra
        const hasAcoustic = (qtyMap['cat_acoustic'] || 0) > 0;
        const acousticPkgs = packagesDetail.filter(p => p.description && p.description.includes('Akusztikus Panelek'));
        
        if (hasAcoustic && acousticPkgs.length > 0) {
            if (adhesiveWeight > 0) {
                acousticPkgs.forEach(p => {
                    p.description += ' (+ragasztó)';
                });
            }
        } else {
            // Ha nincs akupanel, a ragasztók saját dobozt kapnak a beállított maxQty, boxWeight és itemWeight szerint
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
                        description: `${qtyInPkg} db ${cat.name}`
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
                description: "Egyéb termékek"
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
                description: "Csomag"
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
        
        // 1. Sor: ID-k (számok 0-tól 53-ig)
        const idRow = ['ID:'].concat(Array.from({ length: 54 }, (_, i) => i));
        csvRows.push(idRow.map(val => this.escapeCsvValue(val)).join(';'));
        
        // 2. Sor: Mezőnevek
        const headerRow = ['Mezőnév:'].concat(this.COLUMNS);
        csvRows.push(headerRow.map(val => this.escapeCsvValue(val)).join(';'));
        
        // 3. Sor: Minta adat vagy rögtön a valós adatok?
        // A mintafájlban a 3. és 4. sor is bemutató adatok, de az importálónak valószínűleg nem kell a "Minta adat" sor,
        // viszont a biztonság kedvéért pontosan ugyanazt a formátumot követjük, de nem teszünk bele statikus minta sort,
        // vagy ha igen, akkor üres előtaggal a megrendeléseket.
        // A leírás szerint: "az oszlopok azonosítása a mezőnév alapján történik", a mezőnevek a 2. sorban vannak.
        // A minta fájlban a 3. sornak az első cellája "Minta adat:", a 4. sor első cellája pedig üres.
        // Így a valódi megrendelések soraiban az első cellát üresen hagyjuk!
        
        orders.forEach(order => {
            const rowData = [];
            rowData.push(''); // Első oszlop üres (ahol a minta fájlban "Minta adat:" szerepel)
            
            // 1. Feladó beállítások
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
            rowData.push(addressParts.join(', ') || order.address || '');
            
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
            rowData.push(suly.toString());
            
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
            rowData.push(order.pxp_referencia || order.id || ''); // szl_referenciaszam (Shopify order name or formatted reference)
            rowData.push('0'); // szl_koltsegviselo (0 = feladó fizet)
            rowData.push(senderSettings.uc_ceg_adoszam || ''); // szl_adoszam (feladó adószáma)
            rowData.push('0'); // szl_maganszemely (0 = cég fizet)
            
            // 4. Harmadik fél adatok (ucch_...) - mind üres
            for (let i = 0; i < 11; i++) {
                rowData.push('');
            }
            
            csvRows.push(rowData.map(val => this.escapeCsvValue(val)).join(';'));
        });
        
        // PannonXP által kedvelt kódolás a pontosvesszős elválasztással
        return csvRows.join('\r\n');
    },

    escapeCsvValue(val) {
        if (val === null || val === undefined) return '';
        let str = String(val);
        // Ha tartalmaz pontosvesszőt, idézőjelet vagy sortörést, akkor idézőjelbe tesszük
        if (/[;"\r\n]/.test(str)) {
            str = '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }
};
