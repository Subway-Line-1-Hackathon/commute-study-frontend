import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import FeedbackCard from '../components/report/FeedbackCard'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { ROUTES, SESSION_STATUS as S, SOLVE_MODE } from '../lib/constants'
import { getReport, getSessionReport } from '../lib/endpoints'
import { wait } from '../lib/storage'
import { useAuthStore } from '../store/useAuthStore'
import { useSessionStore } from '../store/useSessionStore'

async function getOldFeedback(subjectId, sessionId) {
  if (!subjectId) return null
  const res = await getReport(subjectId, { scope: 'session', sessionId }).catch(() => null)
  return res?.feedback ?? null
}

// 통학 후 AI 피드백. 세션이 끝난 뒤 서버가 따로 만들어서, PENDING인 동안만 다시 조회한다
// 조회 중이면 undefined, 끝내 못 받으면 null
function useSessionFeedback(cur) {
  const serverId = cur?.serverId
  const subjectId = cur?.subjectId
  const [feedback, setFeedback] = useState(undefined)

  useEffect(() => {
    if (!serverId) return
    let cancelled = false
    const run = async () => {
      // 남은 답안을 먼저 보내야 서버 피드백에 반영된다
      await useSessionStore.getState().flushAttempts()
      // 3초 간격으로 최대 10번(약 30초) 조회
      for (let i = 0; i < 10 && !cancelled; i += 1) {
        try {
          const res = await getSessionReport(serverId)
          if (res?.feedbackStatus !== 'PENDING') {
            if (!cancelled) setFeedback(res?.feedback ?? null)
            return
          }
        } catch {
          const old = await getOldFeedback(subjectId, serverId)
          if (old) {
            if (!cancelled) setFeedback(old)
            return
          }
        }
        await wait(3000)
      }
      if (!cancelled) setFeedback(null)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [serverId, subjectId])

  return feedback
}

function withStation(name) {
  if (name.endsWith('역')) return name
  return `${name}역`
}

function withoutStation(name) {
  return name.replace(/역$/, '')
}

function TicketRoute({ departure, arrival }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-body font-bold text-ink">
      <span className="shrink-0">{withoutStation(departure)}</span>
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
      <span className="h-1 flex-1 rounded-full bg-primary" />
      <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-primary bg-surface" />
      <span className="shrink-0">{withoutStation(arrival)}</span>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="flex-1">
      <p className="text-label font-normal text-muted">{label}</p>
      <p className="mt-0.5 text-title text-ink">{value}</p>
    </div>
  )
}

// S50 통학 후 요약: 방금 끝난 세션의 결과를 승차권 모양 카드로 보여준다
export default function S50Summary() {
  const navigate = useNavigate()
  const cur = useSessionStore((s) => s.current)
  const commute = useAuthStore((s) => s.commute)
  const aiFeedback = useSessionFeedback(cur)

  // 끝난 세션이 없으면 보여줄 게 없으니 홈으로
  const finished =
    cur && (cur.status === S.COMPLETED || cur.status === S.ENDED) && cur.questions.length > 0
  if (!finished) return <Navigate to={ROUTES.HOME} replace />

  const isListen = cur.solveMode === SOLVE_MODE.LISTEN
  const answered = cur.answers.length
  const graded = cur.answers.filter((a) => a.correct != null)
  const correctCount = graded.filter((a) => a.correct).length
  const wrongCount = graded.length - correctCount
  let percent = 0
  if (graded.length > 0) percent = Math.round((correctCount / graded.length) * 100)

  // 실제로 쓴 시간 = 전체 시간 - 남은 개념 시간 - 남은 문제 시간
  const elapsedSec = Math.max(0, cur.plan.totalSec - cur.conceptRemainingSec - cur.quizRemainingSec)
  const studiedMin = Math.max(1, Math.round(elapsedSec / 60))

  const departure = commute?.departure ?? ''
  const arrival = commute?.arrival ?? ''
  const hasStations = Boolean(departure && arrival)

  let title = '오늘 통학 학습 끝!'
  if (arrival) title = `${withStation(arrival)} 도착!\n오늘 통학 학습 끝`

  let meta = `${studiedMin}분 학습`
  if (hasStations) meta += ` · ${withStation(departure)} → ${withStation(arrival)}`

  let wrongText = '틀린 문제가 없어요. 완벽해요!'
  if (wrongCount > 0) wrongText = `오답 ${wrongCount}개는 오답노트에 저장했어요`

  let feedbackText = null
  if (cur.serverId && aiFeedback === undefined) feedbackText = 'AI가 피드백을 만들고 있어요…'
  if (aiFeedback) feedbackText = aiFeedback

  const bottomCta = (
    <div className="space-y-2">
      <Button onClick={() => navigate(ROUTES.REPORT, { replace: true })}>성장 리포트 보기</Button>
      <Button variant="secondary" onClick={() => navigate(ROUTES.HOME, { replace: true })}>
        홈으로
      </Button>
    </div>
  )

  return (
    <Screen bottomCta={bottomCta}>
      <ScreenTitle title={title} />

      <section className="relative mt-6 overflow-hidden rounded-card border border-line bg-surface">
        <div className="px-4 pt-4 pb-5">
          <p className="text-label font-normal text-muted">승차권 · 통학 학습</p>
          {hasStations && <TicketRoute departure={departure} arrival={arrival} />}
          <p className="mt-2 text-caption text-muted">{meta}</p>
        </div>

        <div className="relative border-t border-dashed border-line">
          <span className="absolute -top-2 -left-2 h-4 w-4 rounded-full border border-line bg-background" />
          <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full border border-line bg-background" />
        </div>

        <div className="px-4 pt-5 pb-4">
          {isListen ? (
            <div className="flex gap-3">
              <Stat label="들은 문제" value={`${answered}개`} />
              <Stat label="학습 시간" value={`${studiedMin}분`} />
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <Stat label="푼 문제" value={`${answered}개`} />
                <Stat label="정답률" value={`${percent}%`} />
                <Stat label="오답" value={`${wrongCount}개`} />
              </div>
              <p className="mt-3 text-caption text-muted">{wrongText}</p>
            </>
          )}
        </div>
      </section>

      {feedbackText && <FeedbackCard message={feedbackText} className="mt-4" />}
    </Screen>
  )
}
