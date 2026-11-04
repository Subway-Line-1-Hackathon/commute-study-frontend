import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COMMUTE, ROUTES } from '../lib/constants'
import { calcStudyMinutes, isReviewOnly, isValidCommute } from '../lib/time'
import { useAuthStore } from '../store/useAuthStore'

export default function S04Commute() {
  const navigate = useNavigate()
  const saved = useAuthStore((s) => s.commute)
  const saveCommute = useAuthStore((s) => s.saveCommute)
  const logout = useAuthStore((s) => s.logout)

  const [input, setInput] = useState(saved ? String(saved.oneWayMin) : '')

  const minutes = input === '' ? null : Number(input)
  const valid = minutes !== null && isValidCommute(minutes)
  const studyMin = valid ? calcStudyMinutes(minutes) : null
  const showError = minutes !== null && !valid

  const handleNext = () => {
    if (!valid) return
    saveCommute(minutes)
    navigate(ROUTES.MATERIAL)
  }

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white px-6 py-10">
      <button onClick={handleLogout} className="self-start py-2 text-sm text-slate-500">
        ‹ 로그아웃
      </button>

      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        편도 통학 시간을
        <br />
        알려주세요
      </h1>
      <p className="mt-2 text-sm text-slate-500">이동 시간의 70%를 학습 시간으로 계산해요.</p>

      <div className="mt-10">
        <label className="mb-2 block text-sm font-medium text-slate-700">편도 이동 시간</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예: 50"
            className={`w-full rounded-xl border px-4 py-3.5 text-lg outline-none focus:ring-2 ${
              showError
                ? 'border-red-400 focus:ring-red-200'
                : 'border-slate-300 focus:ring-blue-200'
            }`}
          />
          <span className="shrink-0 text-slate-600">분</span>
        </div>
        {showError && (
          <p className="mt-2 text-sm text-red-500">
            {COMMUTE.MIN}분에서 {COMMUTE.MAX}분 사이로 입력해 주세요.
          </p>
        )}
      </div>

      {valid && (
        <div className="mt-6 rounded-xl bg-blue-50 p-4">
          <p className="text-sm text-slate-600">학습 가능 시간</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">{studyMin}분</p>
          <p className="mt-1 text-xs text-slate-500">{minutes}분 × 70%</p>
        </div>
      )}

      {valid && isReviewOnly(studyMin) && (
        <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          학습 가능 시간이 20분 미만이에요. <b>복습 퀴즈만 이용 가능</b>해요.
        </div>
      )}

      <div className="mt-auto pt-10">
        <button
          onClick={handleNext}
          disabled={!valid}
          className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white disabled:bg-slate-300"
        >
          다음
        </button>
      </div>
    </div>
  )
}
