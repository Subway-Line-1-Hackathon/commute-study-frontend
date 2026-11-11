// Mock 모드에서 쓰는 가짜 문제 생성기
import { QUESTION_TYPE as T } from '../lib/constants'
import { uid } from '../lib/storage'

// 유형별 가짜 문제 하나. O/X 정답은 번갈아 O, X / 객관식 정답은 '보기 2' / 단답 정답은 '정답'
const make = (type, unitTitle, i) => {
  if (type === T.OX)
    return {
      id: uid(),
      type,
      prompt: `[${unitTitle}] 문제 ${i + 1}: 이 단원의 핵심 개념은 항상 참이다.`,
      answer: i % 2 === 0 ? 'O' : 'X',
      explanation: 'Mock 해설입니다.',
    }
  if (type === T.MCQ)
    return {
      id: uid(),
      type,
      prompt: `[${unitTitle}] 문제 ${i + 1}: 올바른 설명을 고르세요.`,
      choices: ['보기 1', '보기 2', '보기 3', '보기 4'],
      answer: '보기 2',
      explanation: 'Mock 해설입니다.',
    }
  return {
    id: uid(),
    type: T.SHORT,
    prompt: `[${unitTitle}] 문제 ${i + 1}: 핵심 용어를 쓰세요.`,
    answer: '정답',
    explanation: 'Mock 해설입니다.',
  }
}

// 고른 유형을 돌아가며 count개 만든다 (예: [OX, SHORT] -> OX, SHORT, OX, SHORT, ...)
export function generateQuestions({ unitTitle, types, count = 5 }) {
  const pool = types.length ? types : [T.MCQ]
  return Array.from({ length: count }, (_, i) => make(pool[i % pool.length], unitTitle, i))
}
