// 통학 시간·타이머 관련 작은 유틸
import { COMMUTE } from './constants'

// 통학 시간(분)이 정수이고 허용 범위(10~120분) 안인지
export const isValidCommute = (m) => Number.isInteger(m) && m >= COMMUTE.MIN && m <= COMMUTE.MAX

// 범위를 벗어난 값을 최소/최대값으로 잘라낸다
export const clampCommute = (m) => Math.min(COMMUTE.MAX, Math.max(COMMUTE.MIN, m))

// 학습 시간이 짧아서(20분 미만) 개념 듣기 없이 문제만 푸는지
export const isReviewOnly = (studyMin) => studyMin < COMMUTE.REVIEW_ONLY_BELOW

// 초를 "MM:SS" 문자열로 바꾼다 (예: 125 -> "02:05")
export const formatClock = (sec) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
