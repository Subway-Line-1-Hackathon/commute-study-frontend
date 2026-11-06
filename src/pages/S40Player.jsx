import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'
import QuestionCard from '../components/QuestionCard'
import TimerBadge from '../components/TimerBadge'
import { useWakeLock } from '../hooks/useWakeLock'
import { PHASE, ROUTES, SESSION_STATUS as S, WARNING_SEC } from '../lib/constants'
import { announce } from '../lib/speaker'
import { getSessionRoute, useSessionStore } from '../store/useSessionStore'

export default function S40Player() {
  const navigate = useNavigate()
  const cur = useSessionStore((s) => s.current)
  const submitAnswer = useSessionStore((s) => s.submitAnswer)
  const endSession = useSessionStore((s) => s.endSession)

  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState(null) // { question, correct, completed }
  const [timeUp, setTimeUp] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [warn, setWarn] = useState(false)

  const status = cur?.status
  const running = status === S.IN_PROGRESS && cur?.phase === PHASE.QUIZ
  useWakeLock(running)

  // 1초마다 문제 시간 감소. 종료 직전 알림과 시간 종료를 여기서 처리한다
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const store = useSessionStore.getState()
      const wasWarned = store.current?.warned
      store.tick()
      const next = useSessionStore.getState().current

      if (!wasWarned && next?.warned) {
        setWarn(true)
        announce(`학습 종료까지 ${WARNING_SEC / 60}분 남았어요. 곧 끝나요.`)
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
        setTimeout(() => setWarn(false), 8000)
      }
      if (next?.status === S.ENDED) setTimeUp(true)
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  if (!cur) return <Navigate to={ROUTES.HOME} replace />

  const finished = status === S.COMPLETED || status === S.ENDED
  if (!feedback && !timeUp && finished) return <Navigate to={ROUTES.HOME} replace />
  if (!finished && cur.phase !== PHASE.QUIZ) {
    return <Navigate to={getSessionRoute(cur)} replace />
  }

  const total = cur.questions.length
  const answered = cur.answers.length
  const question = feedback ? feedback.question : cur.questions[answered]
  if (!question) return <Navigate to={ROUTES.HOME} replace />

  const canSubmit = String(value).trim() !== ''

  const handleSubmit = () => {
    if (!canSubmit) return
    const result = submitAnswer(value)
    if (!result) return
    setFeedback({
      question: result.question,
      correct: result.correct,
      completed: result.completed,
    })
  }

  const handleNext = () => {
    if (feedback.completed) {
      navigate(ROUTES.SUMMARY, { replace: true })
      return
    }
    setFeedback(null)
    setValue('')
  }

  const handleEnd = () => {
    setConfirmEnd(false)
    endSession()
    navigate(ROUTES.HOME, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 px-5 py-4">
      {warn && (
        <div className="fixed top-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">
          곧 끝나요! 학습 종료까지 {WARNING_SEC / 60}분 남았어요.
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setConfirmEnd(true)}
          className="py-2 text-sm text-slate-500 active:text-slate-800"
        >
          ‹ 학습 종료
        </button>
        <TimerBadge seconds={cur.quizRemainingSec} />
      </div>

      <div className="mt-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>{cur.unitTitle}</span>
          <span>
            {feedback ? answered : answered + 1} / {total}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${(answered / total) * 100}%` }}
          />
        </div>
      </div>

      <main className="mt-6 flex-1">
        <QuestionCard
          key={question.id}
          question={question}
          value={value}
          onChange={setValue}
          result={feedback}
        />

        {feedback && (
          <div
            className={`mt-4 rounded-xl p-4 ${
              feedback.correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            <p className="font-semibold">{feedback.correct ? '정답이에요!' : '아쉬워요'}</p>
            {!feedback.correct && <p className="mt-1 text-sm">정답: {feedback.question.answer}</p>}
            <p className="mt-2 text-sm opacity-80">{feedback.question.explanation}</p>
          </div>
        )}
      </main>

      <div className="pt-6">
        {feedback ? (
          <button
            onClick={handleNext}
            className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            {feedback.completed ? '결과 보기' : '다음 문제'}
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white disabled:bg-slate-300"
          >
            제출
          </button>
        )}
      </div>

      {confirmEnd && (
        <ConfirmModal
          title="학습을 종료할까요?"
          message="종료하면 이어서 풀 수 없어요. 지금까지 푼 기록은 오답 노트에 남아요."
          confirmLabel="종료하기"
          cancelLabel="계속 풀기"
          onConfirm={handleEnd}
          onCancel={() => setConfirmEnd(false)}
        />
      )}

      {timeUp && (
        <ConfirmModal
          title="학습 시간이 끝났어요"
          message={`${total}문제 중 ${answered}문제를 풀었어요.`}
          confirmLabel="결과 보기"
          onConfirm={() => navigate(ROUTES.SUMMARY, { replace: true })}
        />
      )}
    </div>
  )
}
