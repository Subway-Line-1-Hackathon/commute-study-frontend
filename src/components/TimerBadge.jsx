import { formatClock } from '../lib/time'

// 남은 시간 표시 (MM:SS)
export default function TimerBadge({ seconds }) {
  const urgent = seconds <= 60 // 1분 이하면 빨간색

  return (
    <div
      className={`rounded-full px-3 py-1.5 text-sm font-bold tabular-nums ${
        urgent ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
      }`}
    >
      ⏱ {formatClock(seconds)}
    </div>
  )
}
