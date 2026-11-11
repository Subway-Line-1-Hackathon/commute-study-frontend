import { useEffect, useState } from 'react'
import { getReport } from '../lib/endpoints'
import { buildReport, dayLabel, TREND_DAYS } from '../lib/report'
import { supabase } from '../lib/supabase'
import { useMaterialStore } from '../store/useMaterialStore'
import { useSessionStore } from '../store/useSessionStore'

// 리포트 화면 데이터를 만드는 훅. 기기 기록(buildReport) + 서버 정답률 추이를 합친다

// 과목별 리포트(scope=all)의 날짜별 정답률을 응답 수로 가중 평균해 합친다
// 예: 같은 날 A과목 10문제 80%, B과목 30문제 40% -> (8+12)/40 = 50%
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
  return Object.keys(byDate)
    .sort()
    .slice(-TREND_DAYS)
    .map((date) => ({
      label: dayLabel(date),
      accuracy: Math.round((byDate[date].sum / byDate[date].answers) * 100),
    }))
}

// 서버 정답률 추이. 서버를 안 쓰거나 아직 못 받았으면 null
function useServerTrend() {
  const subjects = useMaterialStore((s) => s.subjects)
  const [trend, setTrend] = useState(null)
  // 과목 배열은 매번 새 객체라 의존성으로 쓰면 계속 다시 조회된다. id 문자열로 바꿔서 과목이 바뀔 때만 조회
  const key = subjects.map((s) => s.id).join(',')

  useEffect(() => {
    if (!supabase || !key) return
    let cancelled = false
    Promise.all(key.split(',').map((id) => getReport(id, { scope: 'all' }).catch(() => null)))
      .then((reports) => {
        if (!cancelled) setTrend(mergeTrend(reports))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [key])

  return trend
}

// 리포트 화면에서 쓰는 메인 훅. 처음 열 때 오답노트도 서버와 맞춘다
export function useReport() {
  const dailyStats = useSessionStore((s) => s.dailyStats)
  const history = useSessionStore((s) => s.history)
  const wrongNotes = useSessionStore((s) => s.wrongNotes)
  const serverTrend = useServerTrend()

  useEffect(() => {
    useSessionStore
      .getState()
      .syncWrongNotes()
      .catch(() => {})
  }, [])

  const report = buildReport({ dailyStats, history, wrongNotes })
  // 오늘 학습 시간·정답률은 기기 기록, 추이는 서버 기록(여러 기기 합산)을 쓴다
  if (serverTrend) report.trend = serverTrend
  return report
}
