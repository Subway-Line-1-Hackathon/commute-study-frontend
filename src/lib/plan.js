import { QUESTION_TYPE as T } from './constants'

// 학습 가능 시간(분)에 따른 개념 듣기 비율. 이 표만 고치면 전체에 반영돼요.
const PLAN_TABLE = [
  { minStudyMin: 60, conceptRatio: 0.5 },
  { minStudyMin: 40, conceptRatio: 0.4 },
  { minStudyMin: 20, conceptRatio: 0.3 },
]

// 학습 시간(분)을 개념 듣기 시간과 문제 풀이 시간(초)으로 나눈다
// 예: 50분 -> 비율 0.4 -> 개념 1200초, 문제 1800초
// PLAN_TABLE은 큰 값부터 있어서, 처음으로 조건에 맞는 행이 해당 구간이다
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
// 예: OX+단답 고르고 600초 -> 평균 60초 -> 10문항. 시간이 모자라도 최소 1문항
export function recommendCount(types, sec) {
  if (types.length === 0) return 0
  const avg = types.reduce((sum, t) => sum + QUESTION_SEC[t], 0) / types.length
  return Math.max(1, Math.floor(sec / avg))
}
