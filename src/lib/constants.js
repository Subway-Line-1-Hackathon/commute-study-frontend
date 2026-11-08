export const AUTH_STATUS = {
  ANONYMOUS: 'ANONYMOUS',
  AUTHENTICATED: 'AUTHENTICATED',
  ACTIVE: 'ACTIVE',
}
export const MATERIAL_STATUS = {
  UPLOADING: 'UPLOADING',
  UPLOADED: 'UPLOADED',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  FAILED: 'FAILED',
}
export const SESSION_STATUS = {
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ENDED: 'ENDED',
}
export const PHASE = { LISTEN: 'LISTEN', QUIZ_SETUP: 'QUIZ_SETUP', QUIZ: 'QUIZ' }
export const WRONG_STATUS = { OPEN: 'OPEN', RESOLVED: 'RESOLVED' }
export const QUESTION_TYPE = { OX: 'OX', MCQ: 'MCQ', SHORT: 'SHORT' }
// 문제 푸는 방식: 눈으로 풀기(화면) / 듣고 풀기(음성)
export const SOLVE_MODE = { READ: 'READ', LISTEN: 'LISTEN' }
// 방식마다 고를 수 있는 문제 양식
export const SOLVE_MODE_TYPES = {
  READ: [QUESTION_TYPE.OX, QUESTION_TYPE.SHORT, QUESTION_TYPE.MCQ],
  LISTEN: [QUESTION_TYPE.OX, QUESTION_TYPE.SHORT],
}
export const DIFFICULTY = { EASY: 'EASY', NORMAL: 'NORMAL', HARD: 'HARD' }

export const COMMUTE = { MIN: 10, MAX: 120, STEP: 5, DEFAULT: 50, REVIEW_ONLY_BELOW: 20 }
export const NICKNAME_RULE = { MIN: 2, MAX: 10 }
export const WARNING_SEC = 180 // 문제 풀이 종료 3분 전에 "곧 끝나요" 알림

export const ROUTES = {
  SPLASH: '/',
  LOGIN: '/login',
  NICKNAME: '/onboarding/nickname',
  COMMUTE: '/onboarding/commute',
  SUBJECT_NEW: '/subjects/new',
  MATERIAL_UPLOAD: '/materials/upload',
  HOME: '/home',
  LISTEN: '/study/listen',
  SETUP: '/study/setup',
  PLAYER: '/study/play',
  SUMMARY: '/study/summary',
  SETTINGS: '/settings',
  REVIEW: '/study/review',
  WRONG_NOTES: '/wrong-notes',
}
export const SUBJECT_NAME = { MAX: 20 }
export const UPLOAD = { MAX_MB: 30, MAX_PER_SUBJECT: 5, EXTENSIONS: ['pdf', 'pptx', 'png'] }
