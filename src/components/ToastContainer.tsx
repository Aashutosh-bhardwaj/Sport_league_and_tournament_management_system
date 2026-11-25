import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from './Modal';

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const isErr = t.type === 'error';
        const isOk = t.type === 'success';
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-white border shadow-lg ${
              isErr ? 'border-red-200' : isOk ? 'border-emerald-200' : 'border-blue-200'
            }`}
          >
            {isErr ? (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            ) : isOk ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              className="p-1 text-slate-400 hover:text-slate-700 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ConfirmDialogHost() {
  const { confirmOptions, closeConfirm } = useApp();
  if (!confirmOptions) return null;

  const handleConfirm = async () => {
    try {
      await confirmOptions.onConfirm();
    } finally {
      closeConfirm();
    }
  };

  return (
    <Modal open={true} onClose={closeConfirm} title={confirmOptions.title} maxWidth="sm">
      <p className="text-sm text-slate-600 leading-relaxed">{confirmOptions.message}</p>
      <div className="flex items-center justify-end gap-2.5 mt-6">
        <button
          type="button"
          onClick={closeConfirm}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
            confirmOptions.danger !== false
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-[#0B3D91] hover:bg-[#093175]'
          }`}
        >
          {confirmOptions.confirmLabel ?? 'Confirm'}
        </button>
      </div>
    </Modal>
  );
}
