import { COMMUTE } from '../lib/constants'
import { clampCommute } from '../lib/time'

// − + 버튼은 5분 단위
export default function MinuteStepper({ label, value, onChange, required = false }) {
  const minutes = value === '' ? null : Number(value)
  const base = Number.isFinite(minutes) ? Math.round(minutes) : COMMUTE.DEFAULT

  const step = (delta) => onChange(String(clampCommute(base + delta)))

  return (
    <div className="rounded-xl border border-slate-300 p-4">
      <p className="text-sm text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => step(-COMMUTE.STEP)}
          disabled={minutes !== null && minutes <= COMMUTE.MIN}
          aria-label={`${COMMUTE.STEP}분 줄이기`}
          className="h-11 w-11 shrink-0 rounded-full border border-slate-300 text-xl text-slate-600 active:bg-slate-50 disabled:opacity-40"
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
            className="w-20 bg-transparent text-center text-3xl font-bold text-slate-900 outline-none"
          />
          <span className="text-2xl font-bold text-slate-900">분</span>
        </div>
        <button
          type="button"
          onClick={() => step(COMMUTE.STEP)}
          disabled={minutes !== null && minutes >= COMMUTE.MAX}
          aria-label={`${COMMUTE.STEP}분 늘리기`}
          className="h-11 w-11 shrink-0 rounded-full border border-slate-300 text-xl text-slate-600 active:bg-slate-50 disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  )
}
