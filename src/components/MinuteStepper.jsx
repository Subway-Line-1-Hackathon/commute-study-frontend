import { COMMUTE } from '../lib/constants'
import { clampCommute } from '../lib/time'

// − + 버튼은 5분 단위
export default function MinuteStepper({ label, value, onChange, required = false }) {
  const minutes = value === '' ? null : Number(value)
  const base = Number.isFinite(minutes) ? Math.round(minutes) : COMMUTE.DEFAULT

  const step = (delta) => onChange(String(clampCommute(base + delta)))

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-caption text-muted">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </p>

      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => step(-COMMUTE.STEP)}
          disabled={minutes !== null && minutes <= COMMUTE.MIN}
          aria-label={`${COMMUTE.STEP}분 줄이기`}
          className="h-11 w-11 shrink-0 rounded-full border border-line bg-surface text-xl text-ink active:bg-background disabled:opacity-40"
        >
          −
        </button>

        <div className="flex items-baseline justify-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            maxLength={3}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
            aria-label={label}
            style={{ width: `${Math.max(value.length, 1)}ch` }}
            className="bg-transparent text-center text-title text-ink outline-none"
          />
          <span className="text-title text-ink">분</span>
        </div>

        <button
          type="button"
          onClick={() => step(COMMUTE.STEP)}
          disabled={minutes !== null && minutes >= COMMUTE.MAX}
          aria-label={`${COMMUTE.STEP}분 늘리기`}
          className="h-11 w-11 shrink-0 rounded-full border border-line bg-surface text-xl text-ink active:bg-background disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  )
}
