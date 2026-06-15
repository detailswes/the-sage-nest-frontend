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
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
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
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
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
