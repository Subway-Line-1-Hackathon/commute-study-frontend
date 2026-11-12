import { formatClock } from '../lib/time'

// 남은 시간 표시 (MM:SS)
export default function TimerBadge({ seconds }) {
  const urgent = seconds <= 60 // 1분 이하면 빨간색

  return (
    <div
      className={`rounded-full px-3 py-1.5 text-caption font-bold tabular-nums ${
        urgent ? 'bg-danger-soft text-danger' : 'bg-primary/10 text-primary'
      }`}
    >
      ⏱ {formatClock(seconds)}
    </div>
  )
}
