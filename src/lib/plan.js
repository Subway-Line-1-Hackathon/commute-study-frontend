import { COMMUTE, QUESTION_TYPE as T } from './constants'

// 학습 가능 시간(분)에 따른 개념 듣기 비율. 이 표만 고치면 전체에 반영돼요.
const PLAN_TABLE = [
  { minStudyMin: 60, conceptRatio: 0.5 },
  { minStudyMin: 40, conceptRatio: 0.4 },
  { minStudyMin: COMMUTE.REVIEW_ONLY_BELOW, conceptRatio: 0.3 },
]

export function getTimePlan(studyMin) {
  const row = PLAN_TABLE.find((r) => studyMin >= r.minStudyMin)
  const conceptRatio = row ? row.conceptRatio : 0 // 20분 미만은 문제만
  const totalSec = studyMin * 60
  const conceptSec = Math.round(totalSec * conceptRatio)
  return { totalSec, conceptSec, quizSec: totalSec - conceptSec, conceptRatio }
}

// 문항당 걸리는 시간(초)
export const QUESTION_SEC = { [T.OX]: 30, [T.MCQ]: 60, [T.SHORT]: 90 }

// 고른 유형의 평균 시간으로, 남은 시간에 풀 수 있는 문항 수
export function recommendCount(types, sec) {
  if (types.length === 0) return 0
  const avg = types.reduce((sum, t) => sum + QUESTION_SEC[t], 0) / types.length
  return Math.max(1, Math.floor(sec / avg))
}
