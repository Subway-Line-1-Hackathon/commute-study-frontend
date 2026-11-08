import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COMMUTE, ROUTES } from '../lib/constants'
import { isReviewOnly, isValidCommute } from '../lib/time'
import { useAuthStore } from '../store/useAuthStore'
import Button from '../components/Button'
import MinuteStepper from '../components/MinuteStepper'
import TextField from '../components/TextField'
import TopBar from '../components/TopBar'

export default function S04Commute() {
  const navigate = useNavigate()
  const saved = useAuthStore((s) => s.commute)
  const saveCommute = useAuthStore((s) => s.saveCommute)
  const activate = useAuthStore((s) => s.activate)

  const [departure, setDeparture] = useState(saved?.departure ?? '')
  const [arrival, setArrival] = useState(saved?.arrival ?? '')
  const [input, setInput] = useState(String(saved?.studyMin ?? COMMUTE.DEFAULT))

  const minutes = input === '' ? null : Number(input)
  const valid = minutes !== null && isValidCommute(minutes)
  const showError = minutes !== null && !valid

  const handleNext = () => {
    if (!valid) return
    saveCommute({ studyMin: minutes, departure, arrival })
    activate()
    navigate(ROUTES.HOME, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white px-6 py-6">
      <TopBar backTo={ROUTES.NICKNAME} />

      <h1 className="mt-4 text-2xl font-bold text-slate-900">통학 시간을 알려주세요</h1>
      <p className="mt-2 text-xs text-slate-500">
        <span className="text-red-500">*</span> 표시는 필수 입력
      </p>

      <div className="mt-6 space-y-5">
        <TextField
          label="출발역"
          value={departure}
          onChange={(e) => setDeparture(e.target.value)}
          placeholder="예: 연천역"
        />
        <TextField
          label="도착역"
          value={arrival}
          onChange={(e) => setArrival(e.target.value)}
          placeholder="예: 인천역"
        />

        <div>
          <MinuteStepper label="학습 가능 시간" value={input} onChange={setInput} required />
          {showError && (
            <p className="mt-1 text-sm text-red-500">
              {COMMUTE.MIN}분에서 {COMMUTE.MAX}분 사이로 입력해 주세요.
            </p>
          )}
        </div>
      </div>
      {valid && isReviewOnly(minutes) && (
        <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          {COMMUTE.REVIEW_ONLY_BELOW}분 미만은 복습 커리큘럼으로 진행돼요.
        </div>
      )}
      <div className="mt-auto pt-10">
        <Button onClick={handleNext} disabled={!valid}>
          다음
        </Button>
      </div>
    </div>
  )
}
