import { WRONG_STATUS } from './constants'
import { kstDateKey } from './date'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const TREND_DAYS = 5

function dayLabel(dateKey) {
  if (dateKey === kstDateKey()) {
    return '오늘'
  }
  const day = new Date(`${dateKey}T00:00:00+09:00`).getDay()
  return WEEKDAYS[day]
}

function toPercent(correct, answered) {
  if (answered === 0) return 0
  return Math.round((correct / answered) * 100)
}

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

export function buildReport({ dailyStats, history, wrongNotes }) {
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

  let studySec = 0
  for (const session of history) {
    if (!session.plan || !session.startedAt) continue
    if (kstDateKey(session.startedAt) !== todayKey) continue

    const conceptLeft = session.conceptRemainingSec ?? 0
    const quizLeft = session.quizRemainingSec ?? 0
    studySec += Math.max(0, session.plan.totalSec - conceptLeft - quizLeft)
  }

  const openNotes = wrongNotes.filter((n) => n.status === WRONG_STATUS.OPEN)

  return {
    trend,
    accuracy: toPercent(today.correct, today.answered),
    studyMin: Math.round(studySec / 60),
    wrongCount: today.answered - today.correct,
    openWrongCount: openNotes.length,
    weakUnit: findWeakUnit(openNotes),
  }
}

export function getHeadline(trend) {
  if (trend.length === 0) return '아직 학습 기록이 없어요'
  if (trend.length === 1) return '첫 기록이 생겼어요'

  const last = trend[trend.length - 1].accuracy
  const prev = trend[trend.length - 2].accuracy
  if (last > prev) return '정답률이 오르고 있어요'
  if (last < prev) return '조금 내려갔어요. 오답부터 다시 볼까요?'
  return '꾸준히 유지하고 있어요'
}

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
