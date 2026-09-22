// js/controllers/orderNoteController.js
// Shopify Rendelés Megjegyzés (Note) Modális Ablak és Frissítő Vezérlő

import { ShopifyApiService } from '../services/shopifyApiService.js';
import { CustomDialog } from '../utils/dialog.js';

export function openOrderNoteModal({ orderId, shopifyId, customerName, note, onSave }) {
    const existing = document.getElementById('hub-order-note-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'hub-order-note-modal';
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 20px;
        animation: fadeIn 0.15s ease-out;
    `;

    modal.innerHTML = `
        <div style="background: #ffffff; width: 100%; max-width: 520px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; animation: scaleUp 0.15s ease-out;">
            
            <!-- Modal Fejléc -->
            <div style="padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="background: #fef3c7; color: #d97706; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                        <i class="ph-bold ph-note-pencil"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">Megjegyzés (Notes)</h3>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;"><strong>${orderId}</strong> — ${customerName || 'Vásárló'}</p>
                    </div>
                </div>
                <button id="btn-close-note-modal" style="background: transparent; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; transition: background 0.15s;">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>

            <!-- Modal Tartalom -->
            <div style="padding: 20px;">
                <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                    Rendeléshez tartozó megjegyzés:
                </label>
                <textarea id="hub-order-note-input" rows="6" placeholder="Írj ide megjegyzést a rendeléshez... (pl. egyeztetett időpont, átvételi instrukció stb.)" style="width: 100%; box-sizing: border-box; padding: 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 13px; color: #0f172a; resize: vertical; outline: none; transition: border-color 0.15s; line-height: 1.5;">${(note || '').replace(/</g, '&lt;')}</textarea>
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 11.5px; color: #64748b;">
                    <i class="ph-bold ph-cloud-arrow-up" style="color: #3b82f6;"></i>
                    <span>A mentés azonnal frissíti a rendelés Notes mezőjét a Shopify-ban is.</span>
                </div>
            </div>

            <!-- Modal Lábléc -->
            <div style="padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                <button id="btn-cancel-note-modal" style="background: #ffffff; color: #475569; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 12.5px; cursor: pointer;">
                    Mégse
                </button>
                <button id="btn-save-note-modal" style="background: #2563eb; color: #ffffff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 800; font-size: 12.5px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(37,99,235,0.25);">
                    <i class="ph-bold ph-floppy-disk"></i>
                    <span>Mentés a Shopify-ba</span>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const textarea = document.getElementById('hub-order-note-input');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    const closeModal = () => modal.remove();

    document.getElementById('btn-close-note-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-note-modal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    const saveBtn = document.getElementById('btn-save-note-modal');
    saveBtn.addEventListener('click', async () => {
        const newNote = textarea.value.trim();
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph-bold ph-spinner" style="animation: spin 1s linear infinite;"></i> Mentés...';

        try {
            await ShopifyApiService.updateOrderNote({
                orderId,
                shopifyId,
                note: newNote
            });

            if (typeof onSave === 'function') {
                onSave(newNote);
            }

            closeModal();
            CustomDialog.alert(`A(z) ${orderId} rendelés megjegyzése sikeresen elmentve a Shopify-ba!`, 'Megjegyzés Mentve', 'success');
        } catch (err) {
            console.error('[updateOrderNote error]', err);
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> <span>Mentés a Shopify-ba</span>';
            CustomDialog.alert(`Nem sikerült elmenteni a megjegyzést:\n${err.message}`, 'Mentési Hiba', 'danger');
        }
    });
}
