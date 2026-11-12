import { WRONG_STATUS } from './constants'
import { kstDateKey } from './date'

// 리포트 화면용 계산 (기기에 저장된 기록으로 만든다. 서버 추이는 hooks/useReport.js에서 덮어씀)
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
export const TREND_DAYS = 5 // 정답률 추이 그래프에 보여줄 최근 일수

// 'YYYY-MM-DD'를 그래프 라벨로: 오늘이면 '오늘', 아니면 요일('월' 등)
export function dayLabel(dateKey) {
  if (dateKey === kstDateKey()) {
    return '오늘'
  }
  const day = new Date(`${dateKey}T00:00:00+09:00`).getDay()
  return WEEKDAYS[day]
}

// 정답률(%) 정수. 푼 문제가 없으면 0
function toPercent(correct, answered) {
  if (answered === 0) return 0
  return Math.round((correct / answered) * 100)
}

// 못 맞힌 오답의 틀린 횟수를 단원별로 더해서 가장 많은 단원 이름을 돌려준다 (없으면 null)
function findWeakUnit(openNotes) {
  const countByUnit = {}
  for (const note of openNotes) {
    countByUnit[note.unitTitle] = (countByUnit[note.unitTitle] ?? 0) + note.wrongCount
  }

  let weakest = null
  for (const title of Object.keys(countByUnit)) {
    if (weakest === null || countByUnit[title] > countByUnit[weakest]) {
      weakest = title
    }
  }
  return weakest
}

// 리포트 숫자를 한 번에 계산한다
// -> { trend(최근 5일 정답률), accuracy(오늘 정답률), average(전체 평균 정답률, 없으면 null),
//      studyMin(오늘 공부한 분), wrongCount(오늘 틀린 수),
//      openWrongCount(남은 오답 수), weakUnit(가장 약한 단원) }
export function buildReport({ dailyStats, history, wrongNotes }) {
  // 문제를 푼 날만 골라 날짜순 정렬 후 최근 TREND_DAYS일
  const days = Object.keys(dailyStats)
    .filter((key) => dailyStats[key].answered > 0)
    .sort()
    .slice(-TREND_DAYS)

  const trend = days.map((key) => ({
    label: dayLabel(key),
    accuracy: toPercent(dailyStats[key].correct, dailyStats[key].answered),
  }))

  const todayKey = kstDateKey()
  const today = dailyStats[todayKey] ?? { answered: 0, correct: 0 }

  // 오늘 시작한 세션마다 (전체 시간 - 남은 시간) = 실제로 쓴 시간을 더한다
  let studySec = 0
  for (const session of history) {
    if (!session.plan || !session.startedAt) continue
    if (kstDateKey(session.startedAt) !== todayKey) continue

    const conceptLeft = session.conceptRemainingSec ?? 0
    const quizLeft = session.quizRemainingSec ?? 0
    studySec += Math.max(0, session.plan.totalSec - conceptLeft - quizLeft)
  }

  const openNotes = wrongNotes.filter((n) => n.status === WRONG_STATUS.OPEN)

  // 전체 평균 정답률: 지금까지 푼 모든 날의 합계 (서버 모드는 useReport에서 서버 average로 덮어씀)
  let totalAnswered = 0
  let totalCorrect = 0
  for (const s of Object.values(dailyStats)) {
    totalAnswered += s.answered
    totalCorrect += s.correct
  }

  return {
    trend,
    accuracy: toPercent(today.correct, today.answered),
    average: totalAnswered ? toPercent(totalCorrect, totalAnswered) : null,
    studyMin: Math.round(studySec / 60),
    wrongCount: today.answered - today.correct,
    openWrongCount: openNotes.length,
    weakUnit: findWeakUnit(openNotes),
  }
}

// 리포트 상단 한 줄 문구: 최근 두 날의 정답률을 비교한다
export function getHeadline(trend) {
  if (trend.length === 0) return '아직 학습 기록이 없어요'
  if (trend.length === 1) return '첫 기록이 생겼어요'

  const last = trend[trend.length - 1].accuracy
  const prev = trend[trend.length - 2].accuracy
  if (last > prev) return '정답률이 오르고 있어요'
  if (last < prev) return '조금 내려갔어요. 오답부터 다시 볼까요?'
  return '꾸준히 유지하고 있어요'
}

// 피드백 카드 문장: 정답률 변화 + 약한 단원 + 다음에 할 일을 이어 붙인다
export function getFeedback(report) {
  const { trend, weakUnit, openWrongCount } = report
  const parts = []

  if (trend.length >= 2) {
    const diff = trend[trend.length - 1].accuracy - trend[trend.length - 2].accuracy
    if (diff > 0) {
      parts.push(`지난번보다 정답률이 ${diff}%p 올랐어요.`)
    } else if (diff < 0) {
      parts.push(`지난번보다 정답률이 ${-diff}%p 내려갔어요.`)
    } else {
      parts.push('지난번과 정답률이 같아요.')
    }
  }

  if (weakUnit) {
    parts.push(`'${weakUnit}' 이해가 부족해요.`)
  }

  if (openWrongCount > 0) {
    parts.push(`다음 통학 때 오답 ${openWrongCount}문제를 다시 풀어보세요.`)
  } else {
    parts.push('틀린 문제가 없어요. 다음 단원으로 넘어가 봐요!')
  }

  return parts.join(' ')
}
