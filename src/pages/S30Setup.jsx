import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import BackButton from '../components/BackButton'
import Chip from '../components/Chip'
import SegmentedToggle from '../components/SegmentedToggle'
import { DIFFICULTY, MATERIAL_STATUS as M, QUESTION_TYPE as T, ROUTES } from '../lib/constants'
import { useAuthStore } from '../store/useAuthStore'
import { useMaterialStore } from '../store/useMaterialStore'
import { useSessionStore } from '../store/useSessionStore'

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
]

export default function S30Setup() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const unitId = params.get('unit')

  const commute = useAuthStore((s) => s.commute)
  const subjects = useMaterialStore((s) => s.subjects)
  const materials = useMaterialStore((s) => s.materials)

  const [types, setTypes] = useState([T.MCQ])
  const [difficulty, setDifficulty] = useState(DIFFICULTY.NORMAL)
  const [count, setCount] = useState(5)

  // 단원 찾기 (잘못된 주소로 들어오면 홈으로)
  let unit = null
  let subjectName = ''
  for (const m of materials) {
    if (m.status !== M.READY) continue
    const found = m.units.find((u) => u.id === unitId)
    if (found) {
      unit = found
      subjectName = subjects.find((s) => s.id === m.subjectId)?.name ?? ''
      break
    }
  }
  if (!unit) return <Navigate to={ROUTES.HOME} replace />

  const toggleType = (value) => {
    setTypes((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]))
  }

  const handleStart = () => {
    if (types.length === 0) return
    const { getResumable, endSession, createSession } = useSessionStore.getState()
    if (getResumable()) endSession() // 진행 중이던 세션은 종료 처리
    createSession({
      unit,
      types,
      difficulty,
      count,
      studyMin: commute?.studyMin ?? 20,
    })
    navigate(ROUTES.PLAYER)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white px-5 py-6">
      <BackButton to={ROUTES.HOME} />

      <p className="mt-2 text-sm text-slate-500">{subjectName}</p>
      <h1 className="text-2xl font-bold text-slate-900">{unit.title}</h1>

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
      </section>

      <div className="mt-auto pt-10">
        <button
          onClick={handleStart}
          disabled={types.length === 0}
          className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white disabled:bg-slate-300"
        >
          학습 시작
        </button>
      </div>
    </div>
  )
}
