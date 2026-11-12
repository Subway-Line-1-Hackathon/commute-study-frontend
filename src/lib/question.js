// 서버 문제 형식 <-> 화면 문제 형식 변환
// 서버: { id, type: 'OX'|'MC'|'SHORT', stem, choices, answer: 'O'|'X'|'1'~'4'(단답은 없음), explanation, sourcePage }
// 화면: { id, type: 'OX'|'MCQ'|'SHORT', prompt, choices, answer(보여줄 정답 글자), explanation, sourcePage }
import { DIFFICULTY, QUESTION_TYPE as T } from './constants'
import { stripMarkdown, stripPageRefs } from './text'

// 요약 문단 한 줄을 화면용으로 정리 (마크다운 기호, 쪽수 표기 제거)
// 예전에 저장된 세션의 문단도 화면에 그릴 때 이걸 한 번 더 거친다
export const cleanSummaryLine = (line) => stripPageRefs(stripMarkdown(line ?? '')).trim()

const TO_SERVER_TYPE = { [T.OX]: 'OX', [T.MCQ]: 'MC', [T.SHORT]: 'SHORT' }
const FROM_SERVER_TYPE = { OX: T.OX, MC: T.MCQ, SHORT: T.SHORT }

// 화면 유형 배열을 서버 유형 배열로 (세션 만들 때 사용). 예: ['OX','MCQ'] -> ['OX','MC']
export const toServerTypes = (types) => types.map((t) => TO_SERVER_TYPE[t])

// 난이도 이름 -> 서버로 보낼 숫자
export const DIFFICULTY_LEVEL = {
  [DIFFICULTY.EASY]: 1,
  [DIFFICULTY.NORMAL]: 2,
  [DIFFICULTY.HARD]: 3,
}

// 서버 문제 하나를 화면에서 쓰는 형식으로 바꾼다. 빠진 값은 null/빈 값으로 채운다
export function fromServerQuestion(q) {
  const type = FROM_SERVER_TYPE[q.type] ?? T.SHORT
  const choices = q.choices ?? []
  let answer = q.answer ?? null
  // 객관식 정답은 선택지 번호("1"~)로 온다. 화면은 선택지 글자로 비교한다
  if (type === T.MCQ && answer != null) answer = choices[Number(answer) - 1] ?? answer
  return {
    id: q.id,
    type,
    prompt: stripMarkdown(q.stem ?? ''),
    choices,
    answer,
    explanation: stripMarkdown(q.explanation ?? null),
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

function toSegment(raw, i) {
  const line = String(raw.text ?? '').replace(/^\s*(?:[-*•]|#{1,6})\s*/, '')
  return {
    id: `seg-${i}`,
    text: stripPageRefs(line).trim(),
    speech: raw.speech ?? null,
    sourcePage: raw.sourcePage ?? null,
  }
}

// 요약을 듣기 문단으로 나눈다
// - 배열 [{ text, speech, sourcePage }]: 백엔드가 구조로 줄 때
// - 문자열: 예전처럼 마크다운 한 덩어리로 줄 때 (줄 단위로 자르고, 쪽수는 없음)
export function summaryToScript(summary) {
  if (!summary) return []

  let items = summary
  if (!Array.isArray(summary)) {
    items = summary.split(/\n+/).map((text) => ({ text }))
  }

  return items.map(toSegment).filter((seg) => seg.text)
}
