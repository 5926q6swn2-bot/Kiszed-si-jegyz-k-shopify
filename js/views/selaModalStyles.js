// js/views/selaModalStyles.js
// Központi Sela Modal Stíluskezelő
// Gondoskodik arról, hogy a Sela Export, a Hiányzó Súlyok és a Súlykezelő ablakok
// stílusai mindig betöltve legyenek a DOM-ba még a modálok megnyitása előtt.

export function ensureSelaModalStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('sela-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'sela-modal-styles';
    style.textContent = `
        .sela-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            animation: selaFadeIn 0.2s ease-out;
        }
        @keyframes selaFadeIn {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
        }
        .sela-modal-container {
            background: #ffffff;
            width: 98vw;
            max-width: 1540px;
            height: 92vh;
            max-height: 900px;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .sela-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 20px;
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
        }
        .sela-header-title-group {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .sela-header-icon {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            background: #e0f2fe;
            color: #0284c7;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
        }
        .sela-modal-title {
            margin: 0;
            font-size: 16.5px;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: -0.01em;
        }
        .sela-modal-subtitle {
            margin: 2px 0 0 0;
            font-size: 12px;
            color: #64748b;
        }
        .sela-order-count-badge {
            display: inline-block;
            padding: 2px 8px;
            background: #e0f2fe;
            color: #0284c7;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
        }
        .sela-modal-close {
            background: none;
            border: none;
            font-size: 26px;
            line-height: 1;
            color: #94a3b8;
            cursor: pointer;
            padding: 4px;
            border-radius: 8px;
            transition: all 0.15s;
        }
        .sela-modal-close:hover {
            color: #0f172a;
            background: #e2e8f0;
        }
        .sela-bank-alert {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 16px;
            background: #fff7ed;
            border-bottom: 1px solid #fed7aa;
            color: #9a3412;
            font-size: 12.5px;
        }
        .sela-proforma-alert {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 16px;
            background: #fffbeb;
            border-bottom: 1px solid #fde68a;
            color: #92400e;
            font-size: 12.5px;
        }
        .sela-table-scroll {
            flex: 1;
            overflow: auto;
            min-height: 0;
            background: #ffffff;
        }
        .sela-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12.5px;
            text-align: left;
        }
        .sela-table thead th {
            position: sticky;
            top: 0;
            background: #f8fafc;
            padding: 7px 8px;
            font-size: 11.5px;
            font-weight: 700;
            color: #475569;
            border-bottom: 2px solid #cbd5e1;
            white-space: nowrap;
            z-index: 10;
        }
        .sela-row {
            border-bottom: 1px solid #f1f5f9;
            transition: background-color 0.15s;
        }
        .sela-row:hover {
            background: #f8fafc;
        }
        .sela-row-proforma {
            background: #f0f9ff;
        }
        .sela-row-proforma:hover {
            background: #e0f2fe;
        }
        .sela-row-bank-pending {
            background: #fff7ed;
        }
        .sela-row-bank-pending:hover {
            background: #ffedd5;
        }
        .sela-col-idx {
            color: #94a3b8;
            font-size: 11px;
            text-align: center;
            padding: 4px 6px;
        }
        .sela-btn-delete-row {
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 4px 6px;
            border-radius: 6px;
            color: #ef4444;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
        }
        .sela-btn-delete-row:hover {
            background: #fee2e2;
            color: #b91c1c;
            transform: scale(1.1);
        }
        .sela-proforma-badge {
            display: inline-block;
            padding: 1px 5px;
            background: #0284c7;
            color: #ffffff;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            white-space: nowrap;
        }
        .sela-bank-badge {
            display: inline-block;
            padding: 1px 5px;
            background: #ea580c;
            color: #ffffff;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            white-space: nowrap;
        }
        .sela-cell-input {
            padding: 4px 6px;
            border: 1px solid transparent;
            border-radius: 5px;
            background: transparent;
            font-family: inherit;
            font-size: 12.5px;
            color: #1e293b;
            box-sizing: border-box;
            transition: all 0.15s;
        }
        .sela-cell-input:hover {
            border-color: #cbd5e1;
            background: #ffffff;
        }
        .sela-cell-input:focus {
            border-color: #0284c7;
            background: #ffffff;
            outline: none;
            box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.2);
        }
        .sela-input-proforma {
            background: #ffffff;
            border-color: #7dd3fc;
            color: #0369a1;
        }
        .sela-input-required-cod {
            background: #fef2f2 !important;
            border: 2px solid #ef4444 !important;
            color: #b91c1c !important;
            font-weight: 700 !important;
        }
        .sela-input-pulse-error {
            border: 2px solid #dc2626 !important;
            background: #fee2e2 !important;
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.3) !important;
            animation: pulseError 0.8s ease-in-out infinite alternate;
        }
        @keyframes pulseError {
            from { transform: scale(1); }
            to { transform: scale(1.02); }
        }
        .sela-modal-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 20px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
        }
        .sela-checkbox-label {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 600;
            color: #1e293b;
            cursor: pointer;
            user-select: none;
        }
        .sela-checkbox-label input[type="checkbox"] {
            width: 17px;
            height: 17px;
            accent-color: #0284c7;
            cursor: pointer;
        }
        .sela-footer-right {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .sela-btn-cancel {
            padding: 7px 14px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 8px;
            background: #e2e8f0;
            color: #475569;
            border: none;
            cursor: pointer;
            transition: all 0.15s;
        }
        .sela-btn-cancel:hover {
            background: #cbd5e1;
            color: #0f172a;
        }
        .sela-btn-export {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 18px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 8px;
            background: #0284c7;
            color: #ffffff;
            border: none;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);
            transition: all 0.15s;
        }
        .sela-btn-export:hover {
            background: #0369a1;
        }
    `;
    document.head.appendChild(style);
}
