import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import StatCard from '../components/StatCard'
import TopBar from '../components/TopBar'
import FeedbackCard from '../components/report/FeedbackCard'
import { useExplanation } from '../hooks/useExplanation'
import {
  MATERIAL_STATUS as M,
  ROUTES,
  SESSION_STATUS as S,
  SOLVE_MODE,
  WRONG_STATUS,
} from '../lib/constants'
import { getReport } from '../lib/endpoints'
import { wait } from '../lib/storage'
import { useMaterialStore } from '../store/useMaterialStore'
import { useSessionStore } from '../store/useSessionStore'

// 통학 후 AI 피드백. 세션이 끝난 뒤 서버가 따로 만들어서(최대 약 15초) 몇 번 다시 조회한다
function useSessionFeedback(cur) {
  const serverId = cur?.serverId
  const subjectId = cur?.subjectId
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (!serverId || !subjectId) return
    let cancelled = false
    const run = async () => {
      // 남은 답안을 먼저 보내야 서버 피드백에 반영된다
      await useSessionStore.getState().flushAttempts()
      // 3초 간격으로 최대 6번(약 18초) 조회
      for (let i = 0; i < 6 && !cancelled; i += 1) {
        try {
          const res = await getReport(subjectId, { scope: 'session', sessionId: serverId })
          if (res?.feedback) {
            if (!cancelled) setFeedback(res.feedback)
            return
          }
        } catch {
          /* 다음에 다시 */
        }
        await wait(3000)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [serverId, subjectId])

  return feedback
}

// 문제 해설 한 줄 (없으면 아무것도 안 그림)
function Explanation({ question }) {
  const { explanation } = useExplanation(question)
  if (!explanation) return null
  return <p className="mt-2 text-xs leading-relaxed text-slate-500">{explanation}</p>
}

// 초 -> "3분 20초" / "45초"
const formatDuration = (sec) => {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}

// 정답률에 따른 응원 문구
const getComment = (percent) => {
  if (percent >= 80) return '아주 잘했어요! 🎉'
  if (percent >= 50) return '좋아요, 조금만 더 다져봐요.'
  return '복습하면 금방 늘어요. 💪'
}

// S50 통학 후 요약: 방금 끝난 세션의 결과
// 눈으로 풀기 -> 정답률, 정답/오답 수, AI 피드백, 자료 요약, 틀린 문제
// 듣고 풀기 -> 들은 문제 수와 문제·정답 다시 보기
export default function S50Summary() {
  const navigate = useNavigate()
  const cur = useSessionStore((s) => s.current)
  const openWrongCount = useSessionStore(
    (s) => s.wrongNotes.filter((n) => n.status === WRONG_STATUS.OPEN).length,
  )
  const materials = useMaterialStore((s) => s.materials)
  const aiFeedback = useSessionFeedback(cur)

  // 끝난 세션이 없으면 보여줄 게 없으니 홈으로
  const finished =
    cur && (cur.status === S.COMPLETED || cur.status === S.ENDED) && cur.questions.length > 0
  if (!finished) return <Navigate to={ROUTES.HOME} replace />

  const total = cur.questions.length
  const answered = cur.answers.length
  const correctCount = cur.answers.filter((a) => a.correct).length
  const wrongCount = answered - correctCount
  const percent = answered > 0 ? Math.round((correctCount / answered) * 100) : 0
  // 실제로 쓴 시간 = 전체 시간 - 남은 개념 시간 - 남은 문제 시간
  const elapsedSec = Math.max(0, cur.plan.totalSec - cur.conceptRemainingSec - cur.quizRemainingSec)

  // 틀린 답과 그 문제를 짝지은 목록
  const wrongItems = cur.answers
    .filter((a) => !a.correct)
    .map((a) => ({ answer: a, question: cur.questions.find((q) => q.id === a.questionId) }))
    .filter((item) => item.question)

  const unit = materials
    .filter((m) => m.status === M.READY)
    .flatMap((m) => m.units)
    .find((u) => u.id === cur.unitId)
  // 서버 세션은 받은 요약문을, Mock은 자료 요약을 보여준다
  const summaryLines = cur.serverId
    ? cur.script.map((seg) => seg.text)
    : [unit?.summary].filter(Boolean)

  const timeUp = cur.status === S.ENDED // 다 풀기 전에 끝남 (시간 종료 또는 중단)
  const isListen = cur.solveMode === SOLVE_MODE.LISTEN
  // 듣고 풀기에서 들은 문제 목록
  const listened = cur.answers
    .map((a) => cur.questions.find((q) => q.id === a.questionId))
    .filter(Boolean)

  // 같은 단원을 새 세션으로 다시 출발 (문제 설정부터)
  const handleRetry = () => {
    if (cur.mode === 'review') {
      navigate(ROUTES.REVIEW, { replace: true })
      return
    }
    const draft = {
      source: 'categories',
      categoryIds: cur.categoryIds ?? [],
      unitId: cur.unitId,
      unitTitle: cur.unitTitle,
      subjectId: cur.subjectId,
    }
    navigate(ROUTES.SETUP, { replace: true, state: { draft } })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 px-5 py-4">
      <TopBar backTo={ROUTES.HOME} showLogout={false} />

      <p className="mt-2 text-sm text-slate-500">통학 후 요약</p>
      <h1 className="text-2xl font-bold text-slate-900">{cur.unitTitle}</h1>

      {timeUp && (
        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          학습이 끝나서 {total}문제 중 {answered}문제를 {isListen ? '들었어요' : '풀었어요'}.
        </div>
      )}

      {isListen ? (
        <>
          <section className="mt-5 rounded-2xl bg-blue-600 p-6 text-center text-white">
            <p className="text-sm opacity-80">들은 문제</p>
            <p className="mt-1 text-5xl font-bold">{answered}개</p>
            <p className="mt-2 text-sm">걸린 시간 {formatDuration(elapsedSec)}</p>
          </section>

          <section className="mt-6">
            <h2 className="mb-3 font-semibold text-slate-800">들은 문제 다시 보기</h2>
            <ul className="space-y-3">
              {listened.map((q) => (
                <li key={q.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="font-medium text-slate-900">{q.prompt}</p>
                  {q.answer && <p className="mt-2 text-sm text-green-600">정답: {q.answer}</p>}
                  <Explanation question={q} />
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <>
          <section className="mt-5 rounded-2xl bg-blue-600 p-6 text-center text-white">
            <p className="text-sm opacity-80">정답률</p>
            <p className="mt-1 text-5xl font-bold">{percent}%</p>
            <p className="mt-2 text-sm">{getComment(percent)}</p>
          </section>

          <div className="mt-3 flex gap-3">
            <StatCard label="정답" value={`${correctCount}개`} tone="good" />
            <StatCard
              label="오답"
              value={`${wrongCount}개`}
              tone={wrongCount > 0 ? 'bad' : 'default'}
            />
            <StatCard label="걸린 시간" value={formatDuration(elapsedSec)} />
          </div>

          {aiFeedback && <FeedbackCard message={aiFeedback} className="mt-6" />}

          {summaryLines.length > 0 && (
            <section className="mt-6 rounded-xl bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-slate-800">자료 요약</h2>
              {summaryLines.map((line, i) => (
                <p key={i} className="mt-2 text-sm leading-relaxed text-slate-600">
                  {line}
                </p>
              ))}
            </section>
          )}

          <section className="mt-6">
            <h2 className="mb-3 font-semibold text-slate-800">틀린 문제</h2>
            {wrongItems.length === 0 ? (
              <p className="rounded-xl bg-white p-4 text-sm text-slate-500">
                틀린 문제가 없어요. 완벽해요!
              </p>
            ) : (
              <ul className="space-y-3">
                {wrongItems.map(({ answer, question }) => (
                  <li key={question.id} className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="font-medium text-slate-900">{question.prompt}</p>
                    <p className="mt-2 text-sm text-red-500">내 답: {answer.value}</p>
                    {question.answer && (
                      <p className="text-sm text-green-600">정답: {question.answer}</p>
                    )}
                    <Explanation question={question} />
                  </li>
                ))}
              </ul>
            )}
            {openWrongCount > 0 && (
              <p className="mt-3 text-center text-xs text-slate-400">
                오답 노트에 {openWrongCount}문제가 저장되어 있어요.
              </p>
            )}
          </section>
        </>
      )}

      <div className="mt-auto flex gap-3 pt-8">
        <button
          onClick={handleRetry}
          className="flex-1 rounded-xl border border-slate-300 bg-white py-3.5 font-semibold text-slate-700"
        >
          다시 학습
        </button>
        <button
          onClick={() => navigate(ROUTES.HOME, { replace: true })}
          className="flex-1 rounded-xl bg-blue-600 py-3.5 font-semibold text-white"
        >
          홈으로
        </button>
      </div>
    </div>
  )
}
