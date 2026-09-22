// js/controllers/courierSelectController.js
// Szállítócéghez kötött Intelligens Futárválasztó Vezérlő

export const COMPANY_COURIERS = {
    'LétaiSela': ['Bábel Ádám', 'István', 'Csaba'],
    'Sela': ['Adrián', 'Dévald', 'Ernő', 'Tomi', 'Kónya Gyuri', 'Kabai Gyuri', 'Tapasztó Zoltán'],
    'ÁdámFuvar': ['Ádám'],
    'FákóTrans': [],
    'Mizsei': []
};

export function updateCourierSelectElements({ psCourierSelect, psCustomCourierGroup, psCourierInput }, selectedCompany, preferredCourier = '') {
    if (!psCourierSelect) return;
    psCourierSelect.innerHTML = '';

    const normPreferred = (preferredCourier || '').trim();

    if (!selectedCompany || selectedCompany === 'new') {
        if (selectedCompany === 'new') {
            const opt = document.createElement('option');
            opt.value = '__custom__';
            opt.textContent = '-- Egyedi / Új futár beírása --';
            opt.selected = true;
            psCourierSelect.appendChild(opt);
            psCourierSelect.disabled = false;
            if (psCustomCourierGroup) psCustomCourierGroup.style.display = 'block';
            if (psCourierInput) psCourierInput.value = normPreferred;
        } else {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '-- Előbb válassz céget --';
            psCourierSelect.appendChild(opt);
            psCourierSelect.disabled = true;
            if (psCustomCourierGroup) psCustomCourierGroup.style.display = 'none';
            if (psCourierInput) psCourierInput.value = '';
        }
        return;
    }

    psCourierSelect.disabled = false;
    const couriers = COMPANY_COURIERS[selectedCompany] || [];

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = couriers.length > 0 ? '-- Válassz futárt --' : '-- Új futár beírása --';
    psCourierSelect.appendChild(defaultOpt);

    let matchFound = false;
    couriers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        if (normPreferred && normPreferred.toLowerCase() === c.toLowerCase()) {
            opt.selected = true;
            matchFound = true;
        }
        psCourierSelect.appendChild(opt);
    });

    const customOpt = document.createElement('option');
    customOpt.value = '__custom__';
    customOpt.textContent = '-- Új / Más futár beírása --';
    psCourierSelect.appendChild(customOpt);

    if (normPreferred) {
        if (matchFound) {
            if (psCustomCourierGroup) psCustomCourierGroup.style.display = 'none';
            if (psCourierInput) psCourierInput.value = psCourierSelect.value;
        } else {
            customOpt.selected = true;
            if (psCustomCourierGroup) psCustomCourierGroup.style.display = 'block';
            if (psCourierInput) psCourierInput.value = normPreferred;
        }
    } else {
        if (couriers.length === 0) {
            customOpt.selected = true;
            if (psCustomCourierGroup) psCustomCourierGroup.style.display = 'block';
        } else {
            defaultOpt.selected = true;
            if (psCustomCourierGroup) psCustomCourierGroup.style.display = 'none';
        }
        if (psCourierInput) psCourierInput.value = '';
    }
}
