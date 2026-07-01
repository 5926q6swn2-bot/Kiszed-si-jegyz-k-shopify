
const { PannonXPService } = require('./pannonxp_mock.js');

const senderSettings = {
    uc_ugyfelkod: 'PABU',
    uc_nev: 'Pénzes Róbert',
    uc_tel: '+36706320209',
    uc_email: 'info@panelburkolat.com',
    uc_ceg_nev: 'Capsula Houses Kft.',
    uc_ceg_cim_iranyito: '1142',
    uc_ceg_cim_telepules: 'Budapest',
    uc_ceg_cim_orszag: '36',
    uc_ceg_cim_kozterulet: 'Mexikói út 17.',
    uc_ceg_cim_megjegyzes: '',
    uc_ceg_adoszam: '32475847-2-13',
    uc_ceg_bankszamlaszam: '11735005-26088969',
    szl_tartalom: 'Panelburkolat'
};

const orders = [
    {
        id: '#2835',
        shippingName: 'Alma Biro',
        shippingPhone: '+36205704353',
        email: '',
        shippingCompany: 'Alma Biro',
        zip: '2143',
        city: 'Kistarcsa',
        countryCode: 'HU',
        address1: 'Eperjesi út, 58',
        address2: '',
        address: 'Eperjesi út, 58',
        notes: '',
        isCOD: true,
        codAmount: 2300,
        pxp_csomagszam: 1,
        pxp_suly: 26,
        pxp_referencia: '2835 Gold4,HPR10',
        pxp_packages: [
            { suly: 26, hosszusag: 278, szelesseg: 16, magassag: 18, tipus: 'doboz' }
        ]
    }
];

// Mock formatHungarianPhoneNumber
global.formatHungarianPhoneNumber = (x) => x;

const csv = PannonXPService.convertToCSV(orders, senderSettings);
console.log('CSV length:', csv.length);
const lines = csv.split('\r\n');
console.log('Lines count:', lines.length);
for (let i = 0; i < lines.length; i++) {
  console.log(`Line ${i}: `, JSON.stringify(lines[i]));
}
