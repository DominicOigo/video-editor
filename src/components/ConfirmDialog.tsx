import { AlertCircle } from './Icons';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ isOpen, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="bg-surface-900 border border-surface-800/50 rounded-2xl p-5 mx-4 max-w-sm w-full shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            variant === 'danger' ? 'bg-red-500/10' : 'bg-surface-800'
          }`}>
            <AlertCircle className={`w-5 h-5 ${variant === 'danger' ? 'text-red-400' : 'text-yellow-400'}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary text-xs px-3 py-1.5">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`btn-primary text-xs px-3 py-1.5 ${
            variant === 'danger' ? '!bg-red-500/20 !text-red-300 hover:!bg-red-500/30 !border-red-500/30' : ''
          }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
