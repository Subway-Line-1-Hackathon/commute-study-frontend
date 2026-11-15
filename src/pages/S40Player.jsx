import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import ConfirmModal from '../components/ConfirmModal'
import ListenQuestion from '../components/ListenQuestion'
import PlayerHeader from '../components/player/PlayerHeader'
import ResultBox from '../components/player/ResultBox'
import RouteProgress from '../components/player/RouteProgress'
import SelfJudgeBox from '../components/player/SelfJudgeBox'
import QuestionCard from '../components/QuestionCard'
import { useQuizTimer } from '../hooks/useQuizTimer'
import { useWakeLock } from '../hooks/useWakeLock'
import Screen from '../layouts/Screen'
import {
  PHASE,
  QUESTION_TYPE as T,
  ROUTES,
  SESSION_STATUS as S,
  SOLVE_MODE as M,
} from '../lib/constants'
import { stopSpeaking } from '../lib/speaker'
import { errorMessage } from '../lib/api'
import { useAuthStore } from '../store/useAuthStore'
import { getSessionRoute, useSessionStore } from '../store/useSessionStore'

// S40 문제 풀이 화면
export default function S40Player() {
  const navigate = useNavigate()
  const cur = useSessionStore((s) => s.current)
  const submitAnswer = useSessionStore((s) => s.submitAnswer)
  const selfJudge = useSessionStore((s) => s.selfJudge)
  const advanceListen = useSessionStore((s) => s.advanceListen)
  const backListen = useSessionStore((s) => s.backListen)
  const endSession = useSessionStore((s) => s.endSession)
  const commute = useAuthStore((s) => s.commute)

  const [value, setValue] = useState('') // 지금 입력/선택한 답
  const [submitError, setSubmitError] = useState('')
  const [feedback, setFeedback] = useState(null) // { question, correct, reason, completed }
  const [judging, setJudging] = useState(null) // 채점 중인 문제
  const [selfCheck, setSelfCheck] = useState(null) // AI 판정이 늦을 때 { question, value }
  const [timeUp, setTimeUp] = useState(false) // 시간이 다 돼서 끝났는지 (팝업 표시)
  const [confirmEnd, setConfirmEnd] = useState(false) // '학습 멈추기' 팝업
  const [paused, setPaused] = useState(false) // 듣고 풀기 일시정지
  const [warnClosed, setWarnClosed] = useState(false)
  // 듣고 풀기 마지막 문제를 마치고 요약으로 가는 중인지.
  // 이게 없으면 세션이 끝난 상태로 바뀐 직후 '끝난 세션이면 홈으로'가 먼저 렌더링돼서 요약 대신 홈으로 가 버린다
  const [toSummary, setToSummary] = useState(false)

  const status = cur?.status
  const running = status === S.IN_PROGRESS && cur?.phase === PHASE.QUIZ
  useWakeLock(running)
  useQuizTimer(running, setTimeUp)

  const isListen = (cur?.solveMode ?? M.READ) === M.LISTEN

  // 화면을 떠나면 읽기를 멈춘다
  useEffect(() => () => stopSpeaking(), [])

  if (!cur) return <Navigate to={ROUTES.HOME} replace />
  if (toSummary) return null

  // 이미 끝난 세션이면 홈으로. 단, 마지막 문제 채점 결과나 '시간 끝' 팝업을 보여주는 중이면 그대로 둔다
  const finished = status === S.COMPLETED || status === S.ENDED
  if (!feedback && !timeUp && !judging && finished) return <Navigate to={ROUTES.HOME} replace />
  if (!finished && cur.phase !== PHASE.QUIZ) {
    return <Navigate to={getSessionRoute(cur)} replace />
  }

  const total = cur.questions.length
  const answered = cur.answers.length
  // 화면에 보여줄 문제: 채점 결과를 보는 중이면 방금 푼 문제, 아니면 다음에 풀 문제
  // (답을 기록하면 answers가 늘어나서 cur.questions[answered]는 이미 다음 문제를 가리킨다)
  const question = feedback?.question ?? selfCheck?.question ?? judging ?? cur.questions[answered]
  if (!question) return <Navigate to={ROUTES.HOME} replace />

  const canSubmit = String(value).trim() !== '' && !judging

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
    setSubmitError('')
    setJudging(cur.questions[answered])
    try {
      const result = await submitAnswer(v)
      if (!result) return
      if (result.needsSelfJudge) {
        setSelfCheck({ question: result.question, value: v })
        return
      }
      showResult(result)
    } catch (err) {
      setSubmitError(errorMessage(err, '정답을 확인하지 못했어요. 다시 시도해 주세요.'))
    } finally {
      setJudging(null)
    }
  }

  const handleSelfJudge = (correct) => {
    const result = selfJudge(selfCheck.value, correct)
    setSelfCheck(null)
    if (result) showResult(result)
  }

  const handleNext = () => {
    if (feedback.completed) {
      navigate(ROUTES.SUMMARY, { replace: true })
      return
    }
    setFeedback(null)
    setValue('')
    setSubmitError('')
  }

  const handleListenDone = () => {
    // 마지막 문제면 세션을 끝내기 전에 '요약으로 가는 중'을 먼저 화면에 반영해 둔다 (홈으로 튕기지 않게)
    if (answered === total - 1) flushSync(() => setToSummary(true))
    const result = advanceListen()
    if (result?.completed) navigate(ROUTES.SUMMARY, { replace: true })
    else setToSummary(false)
  }

  const handleEnd = () => {
    setConfirmEnd(false)
    endSession('QUIT')
    navigate(ROUTES.HOME, { replace: true })
  }

  // '마무리하기'(5분 남음 알림)·도착: 세션을 끝내기 전에 '요약으로 가는 중'을 먼저 반영해 둔다 (홈으로 튕기지 않게)
  const handleFinish = () => {
    flushSync(() => setToSummary(true))
    endSession('ARRIVED')
    navigate(ROUTES.SUMMARY, { replace: true })
  }

  let mainButton = (
    <Button onClick={() => handleSubmit()} disabled={!canSubmit}>
      정답 확인
    </Button>
  )
  if (isListen) {
    // 이전 문제로 돌아가면 그 문제를 처음부터 다시 읽는다 (멈춰 있었으면 다시 재생)
    const handleBack = () => {
      if (backListen()) setPaused(false)
    }
    mainButton = (
      <div className="flex gap-2">
        <Button variant="secondary" onClick={handleBack} disabled={answered === 0}>
          이전 문제
        </Button>
        <Button variant="secondary" onClick={() => setPaused((p) => !p)}>
          {paused ? '이어서 듣기' : '잠시 멈추기'}
        </Button>
      </div>
    )
  } else if (selfCheck) {
    mainButton = null
  } else if (feedback) {
    mainButton = (
      <Button onClick={handleNext}>{feedback.completed ? '결과 보기' : '다음 문제'}</Button>
    )
  } else if (question.type === T.OX) {
    mainButton = (
      <p className="py-3.5 text-center text-caption text-muted">O/X를 눌러 답해 주세요</p>
    )
  }

  const bottomCta = (
    <>
      {mainButton}
      <Button variant="secondary" onClick={() => setConfirmEnd(true)} className="mt-3">
        종료하기
      </Button>
    </>
  )

  const departure = commute?.departure
  const arrival = commute?.arrival
  let routeLabel = cur.unitTitle
  if (departure || arrival) {
    routeLabel = `${departure || '출발'} → ${arrival || '도착'}`
  }

  return (
    <Screen bottomCta={bottomCta}>
      <PlayerHeader
        routeLabel={routeLabel}
        position={feedback ? answered : answered + 1}
        total={total}
        remainingSec={cur.quizRemainingSec}
        showWarn={cur.warned && !warnClosed}
        onFinish={handleFinish}
        onCloseWarn={() => setWarnClosed(true)}
      />

      <div className="mt-1">
        <RouteProgress progress={(answered / total) * 100} />
      </div>

      <main className="mt-5 flex-1">
        {isListen ? (
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
            difficulty={cur.difficulty}
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            result={feedback}
            busy={Boolean(judging || selfCheck)}
          />
        )}

        {judging && <p className="mt-4 text-center text-caption text-muted">채점하고 있어요…</p>}
        {submitError && (
          <p role="alert" className="mt-4 text-center text-caption text-danger">
            {submitError}
          </p>
        )}

        {selfCheck && (
          <SelfJudgeBox
            question={selfCheck.question}
            value={selfCheck.value}
            onJudge={handleSelfJudge}
          />
        )}

        {feedback && <ResultBox feedback={feedback} myAnswer={value} />}
      </main>

      {confirmEnd && (
        <ConfirmModal
          title="학습을 멈출까요?"
          message="일시 중단하면 나중에 멈춘 곳부터 다시 풀 수 있어요."
          confirmLabel="일시 중단하기"
          onConfirm={() => navigate(ROUTES.HOME, { replace: true })}
          extraLabel="학습 종료하기"
          onExtra={handleEnd}
          cancelLabel="계속 풀기"
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
    </Screen>
  )
}
