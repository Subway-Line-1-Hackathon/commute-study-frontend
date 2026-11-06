import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Chip from '../components/Chip'
import ConfirmModal from '../components/ConfirmModal'
import SegmentedToggle from '../components/SegmentedToggle'
import TimerBadge from '../components/TimerBadge'
import {
  DIFFICULTY,
  PHASE,
  QUESTION_TYPE as T,
  ROUTES,
  SESSION_STATUS as S,
} from '../lib/constants'
import { recommendCount } from '../lib/plan'
import { getSessionRoute, useSessionStore } from '../store/useSessionStore'

const TYPE_OPTIONS = [
  { value: T.OX, label: 'O/X' },
  { value: T.MCQ, label: '객관식' },
  { value: T.SHORT, label: '단답형' },
]

const DIFFICULTY_OPTIONS = [
  { value: DIFFICULTY.EASY, label: '쉬움' },
  { value: DIFFICULTY.NORMAL, label: '보통' },
  { value: DIFFICULTY.HARD, label: '어려움' },
]

const COUNT_OPTIONS = [
  { value: 5, label: '5문제' },
  { value: 10, label: '10문제' },
  { value: 15, label: '15문제' },
  { value: 20, label: '20문제' },
]

export default function S30Setup() {
  const navigate = useNavigate()
  const cur = useSessionStore((s) => s.current)
  const startQuiz = useSessionStore((s) => s.startQuiz)
  const endSession = useSessionStore((s) => s.endSession)

  const [types, setTypes] = useState([T.MCQ])
  const [difficulty, setDifficulty] = useState(DIFFICULTY.NORMAL)
  const [count, setCount] = useState(5)
  const [confirmEnd, setConfirmEnd] = useState(false)

  if (
    !cur ||
    cur.phase !== PHASE.QUIZ_SETUP ||
    cur.status === S.COMPLETED ||
    cur.status === S.ENDED
  ) {
    return <Navigate to={getSessionRoute(cur)} replace />
  }

  const recommended = recommendCount(types, cur.quizRemainingSec)
  const heard = cur.plan.conceptSec > 0

  const toggleType = (value) => {
    setTypes((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]))
  }

  const handleStart = () => {
    if (types.length === 0) return
    startQuiz({ types, difficulty, count })
    navigate(ROUTES.PLAYER, { replace: true })
  }

  const handleEnd = () => {
    setConfirmEnd(false)
    endSession()
    navigate(ROUTES.HOME, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white px-5 py-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setConfirmEnd(true)}
          className="py-2 text-sm text-slate-500 active:text-slate-800"
        >
          ‹ 그만하기
        </button>
        <TimerBadge seconds={cur.quizRemainingSec} />
      </div>

      <p className="mt-2 text-sm text-slate-500">
        {heard ? '개념 듣기가 끝났어요' : '문제 풀이'} · {cur.unitTitle}
      </p>
      <h1 className="text-2xl font-bold text-slate-900">어떤 문제를 풀까요?</h1>

      <section className="mt-8">
        <h2 className="mb-1 font-semibold text-slate-800">문제 양식</h2>
        <p className="mb-3 text-xs text-slate-400">여러 개를 골라도 돼요.</p>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={types.includes(opt.value)}
              onClick={() => toggleType(opt.value)}
            />
          ))}
        </div>
        {types.length === 0 && (
          <p className="mt-2 text-sm text-red-500">양식을 한 개 이상 선택해 주세요.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-slate-800">난이도</h2>
        <SegmentedToggle options={DIFFICULTY_OPTIONS} value={difficulty} onChange={setDifficulty} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-slate-800">문제 수</h2>
        <SegmentedToggle options={COUNT_OPTIONS} value={count} onChange={setCount} />
        {types.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            남은 시간으로는 약 {recommended}문제를 풀 수 있어요.
            {count > recommended && ' 시간이 끝나면 풀지 못한 문제는 건너뛰어요.'}
          </p>
        )}
      </section>

      <div className="mt-auto pt-10">
        <button
          onClick={handleStart}
          disabled={types.length === 0}
          className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white disabled:bg-slate-300"
        >
          문제 풀기 시작
        </button>
      </div>

      {confirmEnd && (
        <ConfirmModal
          title="학습을 그만할까요?"
          message="그만하면 이어서 할 수 없어요."
          confirmLabel="그만하기"
          cancelLabel="계속하기"
          onConfirm={handleEnd}
          onCancel={() => setConfirmEnd(false)}
        />
      )}
    </div>
  )
}
