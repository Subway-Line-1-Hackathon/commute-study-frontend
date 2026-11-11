import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'
import ListenQuestion from '../components/ListenQuestion'
import QuestionCard from '../components/QuestionCard'
import TimerBadge from '../components/TimerBadge'
import { useExplanation } from '../hooks/useExplanation'
import { useWakeLock } from '../hooks/useWakeLock'
import {
  PHASE,
  QUESTION_TYPE as T,
  ROUTES,
  SESSION_STATUS as S,
  SOLVE_MODE as M,
  WARNING_SEC,
} from '../lib/constants'
import { announce, stopSpeaking } from '../lib/speaker'
import { getSessionRoute, useSessionStore } from '../store/useSessionStore'

// S40 문제 풀이 화면
// - 눈으로 풀기: QuestionCard로 답 입력 -> 채점 결과(Feedback) -> '다음 문제'
// - 듣고 풀기: ListenQuestion이 문제·정답을 읽고 자동으로 다음 문제로
// - 단답형 AI 채점이 실패하면 SelfJudge로 사용자가 직접 맞음/틀림을 고른다
// - 타이머: 1초마다 tick, 3분 전 경고, 0초가 되면 '시간 끝' 팝업
export default function S40Player() {
  const navigate = useNavigate()
  const cur = useSessionStore((s) => s.current)
  const submitAnswer = useSessionStore((s) => s.submitAnswer)
  const selfJudge = useSessionStore((s) => s.selfJudge)
  const advanceListen = useSessionStore((s) => s.advanceListen)
  const endSession = useSessionStore((s) => s.endSession)

  const [value, setValue] = useState('') // 지금 입력/선택한 답
  const [feedback, setFeedback] = useState(null) // { question, correct, reason, completed }
  const [judging, setJudging] = useState(false) // 단답형 서버 판정 중
  const [selfCheck, setSelfCheck] = useState(null) // AI 판정이 늦을 때 { question, value }
  const [timeUp, setTimeUp] = useState(false) // 시간이 다 돼서 끝났는지 (팝업 표시)
  const [confirmEnd, setConfirmEnd] = useState(false) // '학습 종료' 확인 팝업
  const [warn, setWarn] = useState(false) // 상단 "곧 끝나요" 배너
  const [paused, setPaused] = useState(false) // 듣고 풀기 일시정지

  const status = cur?.status
  const running = status === S.IN_PROGRESS && cur?.phase === PHASE.QUIZ
  useWakeLock(running)

  const mode = cur?.solveMode ?? M.READ
  const isListen = mode === M.LISTEN

  // 화면을 떠나면 읽기를 멈춘다
  useEffect(() => () => stopSpeaking(), [])

  // 1초마다 문제 시간 감소. 종료 직전 알림과 시간 종료를 여기서 처리한다
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const store = useSessionStore.getState()
      // tick 전후의 warned를 비교해서, 이번 tick에 처음 경고가 켜졌을 때만 알림을 한 번 띄운다
      const wasWarned = store.current?.warned
      store.tick()
      const next = useSessionStore.getState().current

      if (!wasWarned && next?.warned) {
        setWarn(true)
        announce(`학습 종료까지 ${WARNING_SEC / 60}분 남았어요. 곧 끝나요.`)
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
        setTimeout(() => setWarn(false), 8000) // 배너는 8초 뒤 사라짐
      }
      // tick 안에서 시간이 0이 되면 세션이 ENDED로 바뀐다
      if (next?.status === S.ENDED) setTimeUp(true)
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  if (!cur) return <Navigate to={ROUTES.HOME} replace />

  // 이미 끝난 세션이면 홈으로. 단, 마지막 문제 채점 결과나 '시간 끝' 팝업을 보여주는 중이면 그대로 둔다
  const finished = status === S.COMPLETED || status === S.ENDED
  if (!feedback && !timeUp && finished) return <Navigate to={ROUTES.HOME} replace />
  if (!finished && cur.phase !== PHASE.QUIZ) {
    return <Navigate to={getSessionRoute(cur)} replace />
  }

  const total = cur.questions.length
  const answered = cur.answers.length
  // 화면에 보여줄 문제: 채점 결과를 보는 중이면 방금 푼 문제, 아니면 다음에 풀 문제
  // (답을 기록하면 answers가 늘어나서 cur.questions[answered]는 이미 다음 문제를 가리킨다)
  const question = feedback?.question ?? selfCheck?.question ?? cur.questions[answered]
  if (!question) return <Navigate to={ROUTES.HOME} replace />

  const canSubmit = String(value).trim() !== '' && !judging

  // 채점 결과를 화면 상태에 넣는다
  const showResult = (result) =>
    setFeedback({
      question: result.question,
      correct: result.correct,
      reason: result.reason ?? null,
      completed: result.completed,
    })

  // 제출. O/X는 고른 값을 v로 바로 넘기고, 나머지는 입력된 value를 쓴다
  const handleSubmit = async (v = value) => {
    if (String(v).trim() === '' || judging) return
    setValue(v)
    setJudging(true)
    const result = await submitAnswer(v)
    setJudging(false)
    if (!result) return
    if (result.needsSelfJudge) {
      setSelfCheck({ question: result.question, value: v })
      return
    }
    showResult(result)
  }

  // 사용자가 맞음/틀림을 고르면 그 결과로 기록
  const handleSelfJudge = (correct) => {
    const result = selfJudge(selfCheck.value, correct)
    setSelfCheck(null)
    if (result) showResult(result)
  }

  // '다음 문제' / '결과 보기'
  const handleNext = () => {
    if (feedback.completed) {
      navigate(ROUTES.SUMMARY, { replace: true })
      return
    }
    setFeedback(null)
    setValue('')
  }

  // 듣고 풀기: 정답까지 읽고 3초 뒤 다음 문제로
  const handleListenDone = () => {
    const result = advanceListen()
    if (result?.completed) navigate(ROUTES.SUMMARY, { replace: true })
  }

  // 중간에 학습 종료
  const handleEnd = () => {
    setConfirmEnd(false)
    endSession('QUIT')
    navigate(ROUTES.HOME, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col overflow-x-hidden bg-slate-50 px-5 py-4">
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
        {isListen ? (
          // key를 문제 id로 주면 문제가 바뀔 때 컴포넌트가 새로 만들어져 내부 상태가 초기화된다
          <ListenQuestion
            key={question.id}
            question={question}
            paused={paused || !running || confirmEnd}
            onDone={handleListenDone}
          />
        ) : (
          <QuestionCard
            key={question.id}
            question={question}
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            result={feedback}
          />
        )}

        {judging && <p className="mt-4 text-center text-sm text-slate-500">채점하고 있어요…</p>}

        {selfCheck && (
          <SelfJudge
            question={selfCheck.question}
            value={selfCheck.value}
            onJudge={handleSelfJudge}
          />
        )}

        {feedback && <Feedback feedback={feedback} />}
      </main>

      {/* 하단 버튼: 듣고 풀기면 일시정지 / 자가 판정 중이면 없음 / 결과 보는 중이면 다음 / O/X면 안내 / 그 외 제출 */}
      <div className="pt-6">
        {isListen ? (
          <button
            onClick={() => setPaused((p) => !p)}
            className="w-full rounded-xl border border-slate-300 bg-white py-3.5 font-semibold text-slate-700 active:bg-slate-50"
          >
            {paused ? '▶ 이어서 듣기' : '⏸ 잠시 멈추기'}
          </button>
        ) : selfCheck ? null : feedback ? (
          <button
            onClick={handleNext}
            className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white active:bg-blue-700"
          >
            {feedback.completed ? '결과 보기' : '다음 문제'}
          </button>
        ) : question.type === T.OX ? (
          <p className="py-3.5 text-center text-sm text-slate-400">
            카드를 밀거나 O/X를 눌러 답해 주세요
          </p>
        ) : (
          <button
            onClick={() => handleSubmit()}
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
          message={`${total}문제 중 ${answered}문제를 ${isListen ? '들었어요' : '풀었어요'}.`}
          confirmLabel="결과 보기"
          onConfirm={() => navigate(ROUTES.SUMMARY, { replace: true })}
        />
      )}
    </div>
  )
}

// 채점 결과. 해설이 없으면(서버 단답형) 서버에서 조회한다
function Feedback({ feedback }) {
  const { question, correct, reason } = feedback
  const { explanation, sourcePage } = useExplanation(question)
  return (
    <div
      className={`mt-4 rounded-xl p-4 ${correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
    >
      <p className="font-semibold">{correct ? '정답이에요!' : '아쉬워요'}</p>
      {!correct && question.answer && <p className="mt-1 text-sm">정답: {question.answer}</p>}
      {reason && <p className="mt-1 text-sm">{reason}</p>}
      {explanation && <p className="mt-2 text-sm opacity-80">{explanation}</p>}
      {sourcePage != null && <p className="mt-1 text-xs opacity-60">자료 {sourcePage}쪽</p>}
    </div>
  )
}

// AI 판정이 늦거나 실패했을 때: 해설을 보여주고 맞음/틀림을 직접 고른다
function SelfJudge({ question, value, onJudge }) {
  const { explanation, sourcePage } = useExplanation(question)
  return (
    <div className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-900">
      <p className="font-semibold">자동 채점이 늦어지고 있어요</p>
      <p className="mt-1 text-sm">내 답: {value}</p>
      {question.answer && <p className="mt-1 text-sm">정답: {question.answer}</p>}
      {explanation && <p className="mt-2 text-sm opacity-80">{explanation}</p>}
      {sourcePage != null && <p className="mt-1 text-xs opacity-60">자료 {sourcePage}쪽</p>}
      <p className="mt-3 text-sm">내 답이 맞았나요?</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <button
          onClick={() => onJudge(true)}
          className="rounded-xl bg-green-600 py-3 font-semibold text-white active:bg-green-700"
        >
          맞았어요
        </button>
        <button
          onClick={() => onJudge(false)}
          className="rounded-xl bg-red-500 py-3 font-semibold text-white active:bg-red-600"
        >
          틀렸어요
        </button>
      </div>
    </div>
  )
}
