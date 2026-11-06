import { WRONG_STATUS } from './constants'
import { QUESTION_SEC } from './plan'

export const WRONG_LIMIT = { OPEN: 100, RESOLVED: 50 }
export const MAX_SESSION_QUESTIONS = 30

// 목록 상한을 넘으면 오래된 것부터 화면에서만 제외한다 (기록 자체는 남는다)
export const getOpenNotes = (notes) =>
  notes
    .filter((n) => n.status === WRONG_STATUS.OPEN)
    .sort((a, b) => b.lastWrongAt - a.lastWrongAt)
    .slice(0, WRONG_LIMIT.OPEN)

export const getResolvedNotes = (notes) =>
  notes
    .filter((n) => n.status === WRONG_STATUS.RESOLVED)
    .sort((a, b) => b.resolvedAt - a.resolvedAt)
    .slice(0, WRONG_LIMIT.RESOLVED)

// 많이 틀린 순 -> 오래된 순으로, 주어진 시간 안에 풀 수 있는 만큼 고른다
export function pickReviewNotes(openNotes, quizSec) {
  const sorted = [...openNotes].sort(
    (a, b) => b.wrongCount - a.wrongCount || a.lastWrongAt - b.lastWrongAt,
  )
  const picked = []
  let usedSec = 0
  for (const note of sorted) {
    const sec = QUESTION_SEC[note.question.type] ?? 60
    if (picked.length > 0 && usedSec + sec > quizSec) break
    picked.push(note)
    usedSec += sec
    if (picked.length >= MAX_SESSION_QUESTIONS) break
  }
  return { picked, usedSec }
}
