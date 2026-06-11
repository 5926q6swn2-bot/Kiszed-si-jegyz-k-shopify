/**
 * PannonXP Szolgáltatás
 * Shopify megrendelések átalakítása a PannonXP import formátumára.
 */

export const PannonXPService = {
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

    calculateWeightAndPackages(items) {
        let acousticQty = 0;
        let profilesQty = 0;
        let otherPanelsQty = 0;
        
        items.forEach(item => {
            const name = item.name.toLowerCase();
            if (item.isCollapsedProfile && item.subItems) {
                item.subItems.forEach(sub => {
                    profilesQty += sub.qty;
                });
                return;
            }
            
            if (/akusztikus/i.test(name)) {
                acousticQty += item.qty;
            } else if (/profil/i.test(name)) {
                profilesQty += item.qty;
            } else if (/ragasztó|ragaszto/i.test(name)) {
                // Ragasztó: 0 kg
            } else if (/(panel|pvc|spc|pb-|lj-|ps-)/i.test(name)) {
                otherPanelsQty += item.qty;
            }
        });
        
        let acousticWeight = 0;
        let acousticPkgs = 0;
        
        if (acousticQty > 0) {
            if (acousticQty <= 5) {
                acousticPkgs = 1;
                const lookup = { 1: 7, 2: 13, 3: 19, 4: 26, 5: 32 };
                acousticWeight = lookup[acousticQty] || 0;
            } else {
                acousticPkgs = Math.ceil(acousticQty / 5);
                const base = Math.floor(acousticQty / acousticPkgs);
                const remainder = acousticQty % acousticPkgs;
                const lookup = { 1: 7, 2: 13, 3: 19, 4: 26, 5: 32 };
                
                for (let i = 0; i < acousticPkgs; i++) {
                    const qtyInPkg = i < remainder ? base + 1 : base;
                    acousticWeight += lookup[qtyInPkg] || 0;
                }
            }
        }
        
        const profilesWeight = profilesQty * 1.0; 
        const otherPanelsWeight = otherPanelsQty * 1.5;
        
        const totalWeight = acousticWeight + profilesWeight + otherPanelsWeight;
        const hasOtherItems = (profilesQty > 0 || otherPanelsQty > 0);
        const totalPkgs = acousticPkgs + (hasOtherItems ? 1 : 0);
        
        return {
            packages: Math.max(1, totalPkgs),
            weight: Math.max(0.5, totalWeight)
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
            rowData.push(senderSettings.uc_tel || '');
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
            rowData.push(order.shippingPhone || '');
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
            rowData.push(this.generateCsomagokJson(csomagszam, suly));
            
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
            rowData.push(order.id || ''); // szl_referenciaszam (Shopify order name, pl. #1024)
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
