// 서버 문제 형식 <-> 화면 문제 형식 변환
// 서버: { id, type: 'OX'|'MC'|'SHORT', stem, choices, answer: 'O'|'X'|'1'~'4'(단답은 없음), explanation, sourcePage }
// 화면: { id, type: 'OX'|'MCQ'|'SHORT', prompt, choices, answer(보여줄 정답 글자), explanation, sourcePage }
import { DIFFICULTY, QUESTION_TYPE as T } from './constants'

const TO_SERVER_TYPE = { [T.OX]: 'OX', [T.MCQ]: 'MC', [T.SHORT]: 'SHORT' }
const FROM_SERVER_TYPE = { OX: T.OX, MC: T.MCQ, SHORT: T.SHORT }

export const toServerTypes = (types) => types.map((t) => TO_SERVER_TYPE[t])

export const DIFFICULTY_LEVEL = {
  [DIFFICULTY.EASY]: 1,
  [DIFFICULTY.NORMAL]: 2,
  [DIFFICULTY.HARD]: 3,
}

export function fromServerQuestion(q) {
  const type = FROM_SERVER_TYPE[q.type] ?? T.SHORT
  const choices = q.choices ?? []
  let answer = q.answer ?? null
  // 객관식 정답은 선택지 번호("1"~)로 온다. 화면은 선택지 글자로 비교한다
  if (type === T.MCQ && answer != null) answer = choices[Number(answer) - 1] ?? answer
  return {
    id: q.id,
    type,
    prompt: q.stem ?? '',
    choices,
    answer,
    explanation: q.explanation ?? null,
    sourcePage: q.sourcePage ?? null,
  }
}

// 답안 저장 API에 보낼 답: O/X는 "O"/"X", 객관식은 번호, 단답은 입력 글자
export function toServerAnswer(q, value) {
  if (q.type === T.MCQ) {
    const idx = q.choices.indexOf(value)
    return idx >= 0 ? String(idx + 1) : String(value)
  }
  return String(value)
}

// 요약문을 듣기 문단으로 나눈다 (줄 단위, 앞의 "- " 기호 제거)
export function summaryToScript(summary) {
  if (!summary) return []
  return summary
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(Boolean)
    .map((text, i) => ({ id: `seg-${i}`, text, sourcePage: null }))
}
