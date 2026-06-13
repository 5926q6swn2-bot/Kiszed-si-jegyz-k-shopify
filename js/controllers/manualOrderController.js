import { Store } from '../store/state.js';
import { CustomDialog } from '../utils/dialog.js';
import { formatHungarianPhoneNumber } from '../utils/phoneFormatter.js';
import { generateDefaultReference } from '../services/shopify.js?v=145';

export function initManualOrderController({ renderOrders, updatePrintButtonState }) {
    const btnAddManual = document.getElementById('btn-add-manual');
    const manualModal = document.getElementById('manual-modal');
    const btnSaveManual = document.getElementById('btn-save-manual');
    const mItemsContainer = document.getElementById('m-items-container');
    const btnAddItemRow = document.getElementById('btn-add-item-row');

    btnAddManual.addEventListener('click', () => {
        Store.setEditingOrderInternalId(null);
        document.getElementById('manual-modal-title').textContent = 'Manuális Rendelés';
        document.getElementById('manual-modal-desc').textContent = 'Kézi felvitel a listához';
        document.getElementById('btn-save-manual').textContent = 'Hozzáadás';
        document.getElementById('manual-order-form').reset();
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
        const customerName = document.getElementById('m-customer').value.trim();
        const address = document.getElementById('m-address').value.trim();
        const phone = formatHungarianPhoneNumber(document.getElementById('m-phone').value.trim());
        const balanceRaw = parseFloat(document.getElementById('m-balance').value) || 0;

        if (!orderNum || !customerName) {
            await CustomDialog.alert('A rendelésszám és a vevő neve kötelező!', 'Hiányzó mezők', 'warning');
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

        const isCOD = balanceRaw > 0;

        if (Store.editingOrderInternalId) {
            const order = Store.orders.find(o => o.internalId === Store.editingOrderInternalId);
            if (order) {
                order.id = orderNum;
                order.shippingName = customerName;
                order.billingName = customerName;
                order.address = address;
                order.fullAddress = address;
                order.shippingPhone = phone;
                order.billingPhone = phone;
                order.isCOD = isCOD;
                order.codAmount = isCOD ? balanceRaw : 0;
                order.isBankDeposit = false;
                order.isPaid = !isCOD;
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
                shippingPhone: phone,
                billingPhone: phone,
                tags: '',
                isBankDeposit: false,
                isPaid: !isCOD,
                isCOD: isCOD,
                codAmount: isCOD ? balanceRaw : 0,
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
        document.getElementById('m-address').value = order.address;
        document.getElementById('m-phone').value = order.shippingPhone;
        document.getElementById('m-balance').value = order.isCOD ? order.codAmount : 0;
        
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
