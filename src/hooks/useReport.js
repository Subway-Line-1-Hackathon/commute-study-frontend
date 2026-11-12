import { useEffect, useState } from 'react'
import { kstDateKey } from '../lib/date'
import { getReport } from '../lib/endpoints'
import { buildReport, dayLabel, TREND_DAYS } from '../lib/report'
import { supabase } from '../lib/supabase'
import { useMaterialStore } from '../store/useMaterialStore'
import { useSessionStore } from '../store/useSessionStore'

// 리포트 화면 데이터를 만드는 훅
// 서버 모드: 정답률 추이·오늘 정답률·오답 수는 로그인한 계정의 서버 기록만 쓴다 (기기 기록으로 대신하지 않음)
// Mock 모드(Supabase 키 없음): 기기 기록(buildReport)만 쓴다

export const REPORT_STATUS = { LOADING: 'loading', OK: 'ok', ERROR: 'error' }

// 과목별 리포트(scope=all)의 날짜별 정답률을 응답 수로 가중 평균해 합친다
// 예: 같은 날 A과목 10문제 80%, B과목 30문제 40% -> (8+12)/40 = 50%
// -> { trend: 최근 TREND_DAYS일, today: { answered, correct } | null }
function mergeTrend(reports) {
  const byDate = {}
  for (const r of reports) {
    for (const t of r?.accuracyTrend ?? []) {
      if (t.accuracy == null) continue
      const answers = t.answers || 1
      const cur = (byDate[t.date] ??= { sum: 0, answers: 0 })
      cur.sum += t.accuracy * answers
      cur.answers += answers
    }
  }

  const trend = Object.keys(byDate)
    .sort()
    .slice(-TREND_DAYS)
    .map((date) => ({
      label: dayLabel(date),
      accuracy: Math.round((byDate[date].sum / byDate[date].answers) * 100),
    }))

  const t = byDate[kstDateKey()]
  const today = t ? { answered: t.answers, correct: Math.round(t.sum) } : null
  return { trend, today, average: mergeAverage(reports) }
}

// 과목별 전체 평균 정답률(average, 0~1)을 합친다. 과목마다 푼 문제 수(accuracyTrend의 answers 합)로 가중 평균
// 평균이 있는 과목이 하나도 없으면 null
function mergeAverage(reports) {
  let sum = 0
  let weight = 0
  for (const r of reports) {
    if (r?.average == null) continue
    const answers = (r.accuracyTrend ?? []).reduce((n, t) => n + (t.answers || 0), 0) || 1
    sum += r.average * answers
    weight += answers
  }
  return weight ? Math.round((sum / weight) * 100) : null
}

// 서버 리포트 조회. 아직 못 받았으면 LOADING, 한 과목이라도 실패하면 ERROR
function useServerReport() {
  const subjects = useMaterialStore((s) => s.subjects)
  // 과목 배열은 매번 새 객체라 의존성으로 쓰면 계속 다시 조회된다. id 문자열로 바꿔서 과목이 바뀔 때만 조회
  const key = subjects.map((s) => s.id).join(',')
  const [attempt, setAttempt] = useState(0) // '다시 시도'를 누를 때마다 1씩 올려 재조회
  const requestKey = `${key}#${attempt}`
  const [result, setResult] = useState(null) // { requestKey, status, trend, today }

  useEffect(() => {
    if (!supabase || !key) return
    let cancelled = false
    // 기기에 쌓인 답안을 먼저 서버로 보내야 방금 푼 기록까지 리포트에 들어간다
    useSessionStore
      .getState()
      .flushAttempts()
      .catch(() => {})
      .then(() =>
        Promise.all(key.split(',').map((id) => getReport(id, { scope: 'all' }).catch(() => null))),
      )
      .then((reports) => {
        if (cancelled) return
        if (reports.some((r) => r === null)) {
          setResult({ requestKey, status: REPORT_STATUS.ERROR, trend: [], today: null })
        } else {
          setResult({ requestKey, status: REPORT_STATUS.OK, ...mergeTrend(reports) })
        }
      })
    return () => {
      cancelled = true
    }
  }, [key, requestKey])

  const reload = () => setAttempt((n) => n + 1)

  // 과목이 없으면 조회할 것이 없다 = 기록 없음
  if (!key) return { status: REPORT_STATUS.OK, trend: [], today: null, reload }
  // 지금 요청의 결과가 아직 없으면 로딩 (이전 결과를 잠깐이라도 보여주지 않는다)
  if (!result || result.requestKey !== requestKey) {
    return { status: REPORT_STATUS.LOADING, trend: [], today: null, reload }
  }
  return { ...result, reload }
}

// 정답률(%) 정수. 푼 문제가 없으면 0
const toPercent = (correct, answered) => (answered ? Math.round((correct / answered) * 100) : 0)

// 리포트 화면에서 쓰는 메인 훅. 처음 열 때 오답노트도 서버와 맞춘다
// -> buildReport 결과 + { status, reload }. average는 전체 평균 정답률(%), 기록이 없으면 null
export function useReport() {
  const dailyStats = useSessionStore((s) => s.dailyStats)
  const history = useSessionStore((s) => s.history)
  const wrongNotes = useSessionStore((s) => s.wrongNotes)
  const server = useServerReport()

  useEffect(() => {
    useSessionStore
      .getState()
      .syncWrongNotes()
      .catch(() => {})
  }, [])

  const report = buildReport({ dailyStats, history, wrongNotes })
  if (!supabase) return { ...report, status: REPORT_STATUS.OK, reload: () => {} }

  // 서버 모드: 정답률 관련 숫자는 서버 기록으로만 채운다
  const today = server.today ?? { answered: 0, correct: 0 }
  return {
    ...report,
    trend: server.trend,
    accuracy: toPercent(today.correct, today.answered),
    wrongCount: today.answered - today.correct,
    average: server.average ?? null,
    status: server.status,
    reload: server.reload,
  }
}
