import { WRONG_STATUS } from './constants'
import { QUESTION_SEC } from './plan'

// 오답노트 목록 정리와 복습 문제 고르기
export const WRONG_LIMIT = { OPEN: 100, RESOLVED: 50 } // 화면에 보여줄 최대 개수
export const MAX_SESSION_QUESTIONS = 30 // 한 세션에서 풀 수 있는 최대 문항 수

// 목록 상한을 넘으면 오래된 것부터 화면에서만 제외한다 (기록 자체는 남는다)
// 아직 못 맞힌 오답: 최근에 틀린 순
export const getOpenNotes = (notes) =>
  notes
    .filter((n) => n.status === WRONG_STATUS.OPEN)
    .sort((a, b) => b.lastWrongAt - a.lastWrongAt)
    .slice(0, WRONG_LIMIT.OPEN)

// 해결한 오답: 최근에 해결한 순
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
    // 시간이 넘치면 멈춘다. 단, 시간이 아무리 짧아도 최소 1문제는 넣는다
    if (picked.length > 0 && usedSec + sec > quizSec) break
    picked.push(note)
    usedSec += sec
    if (picked.length >= MAX_SESSION_QUESTIONS) break
  }
  return { picked, usedSec }
}
