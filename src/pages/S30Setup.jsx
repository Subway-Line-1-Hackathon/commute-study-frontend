import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Chip from '../components/Chip'
import SegmentedToggle from '../components/SegmentedToggle'
import { errorMessage } from '../lib/api'
import {
  COMMUTE,
  DIFFICULTY,
  QUESTION_TYPE as T,
  ROUTES,
  SOLVE_MODE as M,
  SOLVE_MODE_TYPES,
} from '../lib/constants'
import { useAuthStore } from '../store/useAuthStore'
import { getSessionRoute, useSessionStore } from '../store/useSessionStore'

const TYPE_LABEL = {
  [M.READ]: { [T.OX]: 'O/X 스와이프', [T.SHORT]: '단답형', [T.MCQ]: '객관식' },
  [M.LISTEN]: { [T.OX]: 'O/X', [T.SHORT]: '단답형' },
}

const MODE_OPTIONS = [
  {
    value: M.READ,
    icon: '👀',
    title: '눈으로 풀기',
    desc: '화면을 보며 풀어요. 앉아서 갈 때 좋아요.',
    types: 'O/X 스와이프 · 단답형 · 객관식',
  },
  {
    value: M.LISTEN,
    icon: '🎧',
    title: '듣고 풀기',
    desc: '문제와 정답을 차례로 읽어 드려요. 손을 쓰지 않아도 돼요.',
    types: 'O/X · 단답형',
  },
]

const DEFAULT_TYPES = { [M.READ]: [T.MCQ], [M.LISTEN]: [T.OX] }

const DIFFICULTY_OPTIONS = [
  { value: DIFFICULTY.EASY, label: '쉬움' },
  { value: DIFFICULTY.NORMAL, label: '보통' },
  { value: DIFFICULTY.HARD, label: '어려움' },
]

// 출발 전 문제 설정. 단원 선택(S-11)·홈·오답 복습에서 draft를 받아 온다
// draft: { source: 'categories'|'wrongNotes', categoryIds, unitId, unitTitle, subjectId }
export default function S30Setup() {
  const navigate = useNavigate()
  const draft = useLocation().state?.draft
  const studyMin = useAuthStore((s) => s.commute?.studyMin ?? COMMUTE.DEFAULT)

  const [mode, setMode] = useState(null) // 먼저 푸는 방식을 고른다
  const [types, setTypes] = useState([])
  const [difficulty, setDifficulty] = useState(DIFFICULTY.NORMAL)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  if (!draft) return <Navigate to={ROUTES.HOME} replace />

  const title = draft.source === 'wrongNotes' ? '오답 복습' : draft.unitTitle

  const toggleType = (value) => {
    setTypes((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]))
  }

  const chooseMode = (value) => {
    setMode(value)
    setTypes(DEFAULT_TYPES[value])
  }

  // 세션 생성(문제가 모자라면 서버가 AI로 만들어서 최대 1분 걸릴 수 있다) -> 출발
  const handleStart = async () => {
    if (!mode || types.length === 0 || creating) return
    setCreating(true)
    setError('')
    try {
      const cur = await useSessionStore
        .getState()
        .createSession({ draft, solveMode: mode, types, difficulty, studyMin })
      navigate(getSessionRoute(cur), { replace: true })
    } catch (err) {
      setError(errorMessage(err, '문제를 만들지 못했어요. 잠시 후 다시 시도해 주세요.'))
      setCreating(false)
    }
  }

  const header = (
    <div className="flex items-center justify-between">
      <button
        onClick={() => (mode ? setMode(null) : navigate(-1))}
        disabled={creating}
        className="py-2 text-sm text-slate-500 active:text-slate-800"
      >
        {mode ? '‹ 방식 다시 고르기' : '‹ 뒤로'}
      </button>
      <span className="text-sm text-slate-500">학습 {studyMin}분</span>
    </div>
  )

  if (creating) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-white px-5 py-4 text-center">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="mt-6 text-lg font-semibold text-slate-900">문제를 준비하고 있어요</p>
        <p className="mt-2 text-sm text-slate-500">
          문제가 모자라면 새로 만들어서 최대 1분 정도 걸릴 수 있어요.
        </p>
      </div>
    )
  }

  // 1단계: 푸는 방식 선택
  if (!mode) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white px-5 py-4">
        {header}
        <p className="mt-2 text-sm text-slate-500">출발 전 준비 · {title}</p>
        <h1 className="text-2xl font-bold text-slate-900">어떻게 풀까요?</h1>

        <div className="mt-8 space-y-3">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => chooseMode(opt.value)}
              className="flex w-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition active:border-blue-600 active:bg-blue-50"
            >
              <span className="text-3xl" aria-hidden>
                {opt.icon}
              </span>
              <span className="flex-1">
                <span className="block text-lg font-semibold text-slate-900">{opt.title}</span>
                <span className="mt-1 block text-sm text-slate-500">{opt.desc}</span>
                <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                  {opt.types}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const typeOptions = SOLVE_MODE_TYPES[mode].map((value) => ({
    value,
    label: TYPE_LABEL[mode][value],
  }))
  const modeTitle = MODE_OPTIONS.find((o) => o.value === mode).title

  // 2단계: 양식 · 난이도 · 문제 수
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white px-5 py-4">
      {header}

      <p className="mt-2 text-sm text-slate-500">
        {modeTitle} · {title}
      </p>
      <h1 className="text-2xl font-bold text-slate-900">어떤 문제를 풀까요?</h1>

      <section className="mt-8">
        <h2 className="mb-1 font-semibold text-slate-800">문제 양식</h2>
        <p className="mb-3 text-xs text-slate-400">여러 개를 골라도 돼요.</p>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((opt) => (
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

      <p className="mt-8 text-xs text-slate-500">
        문제 수는 학습 시간 {studyMin}분에 맞춰 정해져요.
      </p>

      <div className="mt-auto pt-10">
        {error && <p className="mb-2 text-center text-sm text-red-500">{error}</p>}
        <button
          onClick={handleStart}
          disabled={types.length === 0}
          className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white disabled:bg-slate-300"
        >
          출발하기
        </button>
      </div>
    </div>
  )
}
