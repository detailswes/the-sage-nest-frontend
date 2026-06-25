import { XIcon, WarningTriangleFilledIcon } from '../assets/icons';

const ConfirmModal = ({
  open,
  title,
  message,
  warning,
  confirmLabel = 'Delete',
  loading = false,
  checking = false,
  onConfirm,
  onClose,
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !loading && !checking) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">

        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
          <XIcon className="w-6 h-6 text-red-500" />
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-[#1F2933] text-center mb-1">{title}</h3>

        {/* Body */}
        {checking ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="w-4 h-4 rounded-full border-2 border-[#445446] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Checking for conflicts…</p>
          </div>
        ) : (
          <>
            {message && (
              <p className="text-sm text-gray-500 text-center mb-4">{message}</p>
            )}
            {warning && (
              <div className="flex items-start gap-2 px-3 py-2.5 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
                <WarningTriangleFilledIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-px" />
                <p className="text-xs text-amber-800">{warning}</p>
              </div>
            )}
          </>
        )}

        {/* Buttons */}
        {!checking && (
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-lg border border-[#E4E7E4] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading && (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              )}
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmModal;
