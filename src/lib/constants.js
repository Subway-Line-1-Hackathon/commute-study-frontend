export const AUTH_STATUS = {
  ANONYMOUS: 'ANONYMOUS',
  AUTHENTICATED: 'AUTHENTICATED',
  ACTIVE: 'ACTIVE',
}
export const MATERIAL_STATUS = { UPLOADED: 'UPLOADED', PROCESSING: 'PROCESSING', READY: 'READY' }
export const SESSION_STATUS = {
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ENDED: 'ENDED',
}
export const WRONG_STATUS = { OPEN: 'OPEN', RESOLVED: 'RESOLVED' }
export const QUESTION_TYPE = { OX: 'OX', MCQ: 'MCQ', SHORT: 'SHORT' }
export const DIFFICULTY = { EASY: 'EASY', NORMAL: 'NORMAL', HARD: 'HARD' }

export const COMMUTE = { MIN: 5, MAX: 180, RATIO: 0.7, REVIEW_ONLY_BELOW: 20 }

export const ROUTES = {
  NICKNAME: '/onboarding/nickname',
  SPLASH: '/',
  LOGIN: '/login',
  COMMUTE: '/onboarding/commute',
  MATERIAL: '/onboarding/material',
  WAITING: '/onboarding/waiting',
  HOME: '/home',
  SETUP: '/study/setup',
  PLAYER: '/study/play',
  SUMMARY: '/study/summary',
}
export const NICKNAME_RULE = { MIN: 2, MAX: 10 }
