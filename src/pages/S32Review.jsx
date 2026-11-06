import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'
import { ROUTES } from '../lib/constants'
import { getOpenNotes, pickReviewNotes } from '../lib/review'
import { useAuthStore } from '../store/useAuthStore'
import { useSessionStore } from '../store/useSessionStore'

export default function S32Review() {
  const navigate = useNavigate()
  const commute = useAuthStore((s) => s.commute)
  const wrongNotes = useSessionStore((s) => s.wrongNotes)

  const studyMin = commute?.studyMin ?? 20
  const open = getOpenNotes(wrongNotes)
  const { picked, usedSec } = pickReviewNotes(open, studyMin * 60)

  const handleStart = () => {
    const store = useSessionStore.getState()
    if (store.getResumable()) store.endSession()
    store.createReviewSession({ questions: picked.map((n) => n.question), studyMin })
    useSessionStore.getState().start()
    navigate(ROUTES.PLAYER)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 px-5 py-4">
      <BackButton to={ROUTES.HOME} />
      <h1 className="mt-2 text-2xl font-bold text-slate-900">오답 복습</h1>
      <p className="mt-1 text-sm text-slate-500">틀렸던 문제를 다시 풀어서 내 것으로 만들어요.</p>

      {open.length === 0 ? (
        <div className="mt-10 rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-800">복습할 오답이 없어요</p>
          <p className="mt-2 text-sm text-slate-500">문제를 풀다가 틀린 문제가 여기에 모여요.</p>
          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
          >
            홈으로
          </button>
        </div>
      ) : (
        <>
          <section className="mt-6 rounded-2xl bg-blue-600 p-5 text-white">
            <p className="text-sm opacity-80">이번 복습</p>
            <p className="mt-1 text-3xl font-bold">{picked.length}문제</p>
            <p className="mt-2 text-sm">
              예상 {Math.max(1, Math.ceil(usedSec / 60))}분 · 학습 가능 시간 {studyMin}분 안에서
              골랐어요
            </p>
          </section>

          <p className="mt-3 text-xs text-slate-500">
            미해결 오답 {open.length}문제 중, 많이 틀린 문제부터 골랐어요.
          </p>

          <ul className="mt-4 space-y-2">
            {picked.slice(0, 5).map((n) => (
              <li key={n.id} className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-xs text-slate-400">
                  {n.unitTitle} · {n.wrongCount}회 틀림
                </p>
                <p className="mt-1 text-sm text-slate-800">{n.question.prompt}</p>
              </li>
            ))}
            {picked.length > 5 && (
              <li className="text-center text-xs text-slate-400">외 {picked.length - 5}문제</li>
            )}
          </ul>

          <div className="mt-auto pt-8">
            <button
              onClick={handleStart}
              className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white active:bg-blue-700"
            >
              복습 출발
            </button>
          </div>
        </>
      )}
    </div>
  )
}
