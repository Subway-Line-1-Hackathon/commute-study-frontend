import Button from './Button'

// 확인/취소 팝업 (화면 전체를 어둡게 덮고 아래쪽에 뜬다)
// onCancel을 안 넘기면 확인 버튼만 보인다 (단순 알림용)
// onExtra를 넘기면 버튼을 세로로 쌓아 선택지를 하나 더 보여 준다
export default function ConfirmModal({
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
  extraLabel,
  onExtra,
}) {
  let buttons = (
    <div className="flex gap-3">
      {onCancel && (
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          {cancelLabel}
        </Button>
      )}
      <Button onClick={onConfirm} className="flex-1">
        {confirmLabel}
      </Button>
    </div>
  )

  if (onExtra) {
    buttons = (
      <div className="space-y-3">
        <Button onClick={onConfirm}>{confirmLabel}</Button>
        <Button variant="secondary" onClick={onExtra}>
          {extraLabel}
        </Button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="w-full py-2 text-caption text-muted">
            {cancelLabel}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        <h2 className="text-question text-ink">{title}</h2>
        {message && <p className="mt-2 text-caption leading-relaxed text-muted">{message}</p>}
        <div className="mt-6">{buttons}</div>
      </div>
    </div>
  )
}
