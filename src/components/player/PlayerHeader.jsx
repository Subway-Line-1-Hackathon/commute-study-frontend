import { WARNING_SEC } from '../../lib/constants'
import { formatClock } from '../../lib/time'

function WarnBox({ onFinish, onClose }) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-card bg-warning-soft px-4 py-3">
      <p className="flex-1 text-caption font-bold text-warning">
        도착 {WARNING_SEC / 60}분 전이에요
      </p>
      <button
        type="button"
        onClick={onFinish}
        className="shrink-0 rounded-lg border border-line bg-surface px-3 py-1.5 text-caption font-bold text-ink"
      >
        마무리하기
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="-m-1 shrink-0 p-1 text-caption text-warning"
      >
        ✕
      </button>
    </div>
  )
}

export default function PlayerHeader({
  routeLabel,
  position,
  total,
  remainingSec,
  showWarn,
  onFinish,
  onCloseWarn,
}) {
  const urgent = remainingSec <= 60

  return (
    <>
      {showWarn && <WarnBox onFinish={onFinish} onClose={onCloseWarn} />}

      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-body font-bold text-ink">
          {routeLabel} · {position} / {total}
        </p>
        <p
          className={`shrink-0 text-body font-bold whitespace-nowrap tabular-nums ${
            urgent ? 'text-danger' : 'text-primary'
          }`}
        >
          남은 시간 {formatClock(remainingSec)}
        </p>
      </div>
    </>
  )
}
