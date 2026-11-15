import { ApiError } from './api'
import { QUESTION_TYPE as T } from './constants'

export const SHORT_ANSWER_MAX_LENGTH = 30

// 채점, 로컬 기록, 서버 저장, 자가 판정이 모두 같은 답안을 사용한다.
export function prepareAnswer(question, value) {
  if (question.type !== T.SHORT) return value
  const answer = String(value).trim()
  if (!answer || answer.length > SHORT_ANSWER_MAX_LENGTH) {
    throw new ApiError(400, { message: `정답은 1~${SHORT_ANSWER_MAX_LENGTH}자로 입력해 주세요.` })
  }
  return answer
}
