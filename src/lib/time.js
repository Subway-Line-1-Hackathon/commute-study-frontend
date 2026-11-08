import { COMMUTE } from './constants'

export const isValidCommute = (m) => Number.isInteger(m) && m >= COMMUTE.MIN && m <= COMMUTE.MAX

export const clampCommute = (m) => Math.min(COMMUTE.MAX, Math.max(COMMUTE.MIN, m))

export const isReviewOnly = (studyMin) => studyMin < COMMUTE.REVIEW_ONLY_BELOW

export const formatClock = (sec) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
