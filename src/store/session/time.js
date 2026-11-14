import { SESSION_STATUS as S } from '../../lib/constants'

export const getRemainingSec = (cur) =>
  (cur?.conceptRemainingSec ?? 0) + (cur?.quizRemainingSec ?? 0)

// 이어서 만든 세션도 처음 세션의 전체 시간을 기준으로 누적한다.
export const getElapsedSec = (cur) => Math.max(0, cur.plan.totalSec - getRemainingSec(cur))
export const MIN_CONTINUE_SEC = 60

export const canContinue = (cur) =>
  Boolean(cur) &&
  (cur.status === S.COMPLETED || cur.status === S.ENDED) &&
  getRemainingSec(cur) >= MIN_CONTINUE_SEC
