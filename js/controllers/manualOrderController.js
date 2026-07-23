import { Store } from '../store/state.js';
import { CustomDialog } from '../utils/dialog.js';
import { formatHungarianPhoneNumber } from '../utils/phoneFormatter.js?v=150';
import { generateDefaultReference, cleanName, parseHungarianAddress } from '../services/shopify.js?v=193';

export function initManualOrderController({ renderOrders, updatePrintButtonState }) {
    const btnAddManual = document.getElementById('btn-add-manual');
    const manualModal = document.getElementById('manual-modal');
    const btnSaveManual = document.getElementById('btn-save-manual');
    const mItemsContainer = document.getElementById('m-items-container');
    const btnAddItemRow = document.getElementById('btn-add-item-row');
    const mIsReturn = document.getElementById('m-is-return');
    const mBalance = document.getElementById('m-balance');

    if (mIsReturn) {
        mIsReturn.addEventListener('change', () => {
            if (mIsReturn.checked) {
                mBalance.value = '0';
                mBalance.disabled = true;
            } else {
                mBalance.disabled = false;
            }
        });
    }

    btnAddManual.addEventListener('click', () => {
        Store.setEditingOrderInternalId(null);
        document.getElementById('manual-modal-title').textContent = 'Manuális Rendelés';
        document.getElementById('manual-modal-desc').textContent = 'Kézi felvitel a listához';
        document.getElementById('btn-save-manual').textContent = 'Hozzáadás';
        document.getElementById('manual-order-form').reset();
        if (mIsReturn) {
            mIsReturn.checked = false;
            mBalance.disabled = false;
        }
        mItemsContainer.innerHTML = `
            <div class="m-item-row">
                <input type="number" class="m-item-qty" placeholder="Db" min="1" value="1" required>
                <input type="text" class="m-item-name" placeholder="Termék megnevezése" required>
                <button type="button" class="btn-remove-item" style="visibility: hidden;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        manualModal.classList.add('active');
    });

    btnAddItemRow.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'm-item-row';
        row.innerHTML = `
            <input type="number" class="m-item-qty" placeholder="Db" min="1" value="1" required>
            <input type="text" class="m-item-name" placeholder="Termék megnevezése" required>
            <button type="button" class="btn-remove-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;
        mItemsContainer.appendChild(row);
        
        row.querySelector('.btn-remove-item').addEventListener('click', function() {
            row.remove();
        });
    });

    btnSaveManual.addEventListener('click', async () => {
        const orderNum = document.getElementById('m-order-num').value.trim();
        const customerName = cleanName(document.getElementById('m-customer').value.trim());
        const address = document.getElementById('m-address').value.trim();
        const phone = formatHungarianPhoneNumber(document.getElementById('m-phone').value.trim());
        const isReturnVal = mIsReturn ? mIsReturn.checked : false;
        const balanceRaw = isReturnVal ? 0 : (parseFloat(mBalance.value) || 0);

        if (!orderNum || !customerName) {
            await CustomDialog.alert('A rendelésszám és a vevő neve (tisztítás után is) kötelező!', 'Hiányzó mezők', 'warning');
            return;
        }

        const items = [];
        document.querySelectorAll('#m-items-container .m-item-row').forEach(row => {
            const qty = parseInt(row.querySelector('.m-item-qty').value) || 0;
            const name = row.querySelector('.m-item-name').value.trim();
            if (qty > 0 && name) items.push({ name, qty });
        });

        if (items.length === 0) {
            await CustomDialog.alert('Legalább egy tételt meg kell adni!', 'Hiányzó tételek', 'warning');
            return;
        }

        const isCOD = !isReturnVal && balanceRaw > 0;

        const parsedAddr = parseHungarianAddress(address);
        const streetCleaned = (parsedAddr.street || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

        if (Store.editingOrderInternalId) {
            const order = Store.orders.find(o => o.internalId === Store.editingOrderInternalId);
            if (order) {
                order.id = orderNum;
                order.shippingName = customerName;
                order.billingName = customerName;
                order.address = address;
                order.fullAddress = address;
                order.zip = parsedAddr.zip;
                order.city = parsedAddr.city;
                order.address1 = streetCleaned;
                order.address2 = '';
                order.shippingPhone = phone;
                order.billingPhone = phone;
                order.isReturn = isReturnVal;
                order.isCOD = isCOD;
                order.codAmount = isCOD ? balanceRaw : 0;
                order.isBankDeposit = false;
                order.isPaid = isReturnVal || !isCOD;
                order.items = items;
                order.pxp_referencia = generateDefaultReference(order, 40);
                order.isManuallyEdited = true;
            }
        } else {
            const newOrder = {
                id: orderNum,
                internalId: Math.random().toString(36).substr(2, 9),
                shippingName: customerName,
                billingName: customerName,
                address: address,
                fullAddress: address,
                zip: parsedAddr.zip,
                city: parsedAddr.city,
                address1: streetCleaned,
                address2: '',
                shippingPhone: phone,
                billingPhone: phone,
                tags: '',
                isBankDeposit: false,
                isPaid: isReturnVal || !isCOD,
                isCOD: isCOD,
                codAmount: isCOD ? balanceRaw : 0,
                isReturn: isReturnVal,
                orderDate: '',
                isPlannedDelay: false,
                isManuallyEdited: true,
                errors: [],
                items: items
            };
            newOrder.pxp_referencia = generateDefaultReference(newOrder, 40);
            Store.orders.push(newOrder);
        }

        manualModal.classList.remove('active');
        Store.setEditingOrderInternalId(null);
        renderOrders();
        updatePrintButtonState();
    });

    function openEditModal(order) {
        Store.setEditingOrderInternalId(order.internalId);
        document.getElementById('manual-modal-title').textContent = 'Megrendelés Szerkesztése';
        document.getElementById('manual-modal-desc').textContent = 'Adatok módosítása';
        document.getElementById('btn-save-manual').textContent = 'Mentés';
        
        document.getElementById('m-order-num').value = order.id;
        document.getElementById('m-customer').value = order.shippingName;
        document.getElementById('m-address').value = order.fullAddress || order.address;
        document.getElementById('m-phone').value = order.shippingPhone;
        
        if (mIsReturn) {
            mIsReturn.checked = !!order.isReturn;
            mBalance.value = order.isReturn ? 0 : (order.isCOD ? order.codAmount : 0);
            mBalance.disabled = !!order.isReturn;
        } else {
            mBalance.value = order.isCOD ? order.codAmount : 0;
        }
        
        mItemsContainer.innerHTML = '';
        order.items.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'm-item-row';
            row.innerHTML = `
                <input type="number" class="m-item-qty" placeholder="Db" min="1" value="${item.qty}" required>
                <input type="text" class="m-item-name" placeholder="Termék megnevezése" value="${item.name.replace(/"/g, '&quot;')}" required>
                <button type="button" class="btn-remove-item" ${index === 0 ? 'style="visibility: hidden;"' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            mItemsContainer.appendChild(row);
            if (index > 0) {
                row.querySelector('.btn-remove-item').addEventListener('click', function() {
                    row.remove();
                });
            }
        });
        
        manualModal.classList.add('active');
    }

    return {
        openEditModal
    };
}
