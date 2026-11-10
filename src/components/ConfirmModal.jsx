export default function ConfirmModal({
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">[TEST] {title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
        <div className="mt-6 flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-300 py-3 font-medium text-slate-600 active:bg-slate-50"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white active:bg-blue-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
