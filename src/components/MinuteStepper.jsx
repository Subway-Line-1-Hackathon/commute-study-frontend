import { COMMUTE } from '../lib/constants'
import { clampCommute } from '../lib/time'

// 통학 시간(분) 입력: 가운데 숫자를 직접 입력하거나 − + 버튼으로 조절한다
// − + 버튼은 5분 단위
// value는 문자열이다 (입력 중에 빈 칸도 허용해야 해서). 범위 검사는 화면에서 저장할 때 한다
export default function MinuteStepper({ label, value, onChange, required = false }) {
  const minutes = value === '' ? null : Number(value)
  // 빈 칸에서 −/+를 누르면 기본값(50분)부터 시작
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
            // 숫자가 아닌 글자는 지운다
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
