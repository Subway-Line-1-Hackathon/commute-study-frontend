// 앱 전체에서 쓰는 상수 모음. 문자열을 직접 쓰지 말고 여기 값을 가져다 쓴다

// 로그인 상태
// ANONYMOUS: 로그인 전 / AUTHENTICATED: 로그인했지만 온보딩(닉네임·통학시간) 미완료 / ACTIVE: 온보딩 완료
export const AUTH_STATUS = {
  ANONYMOUS: 'ANONYMOUS',
  AUTHENTICATED: 'AUTHENTICATED',
  ACTIVE: 'ACTIVE',
}
// 학습 자료 처리 상태. UPLOADING만 프론트 전용(파일 전송 중)이고 나머지는 서버 값
// UPLOADED -> PROCESSING(AI 분석 중) -> READY(단원 생성 완료) 또는 FAILED
export const MATERIAL_STATUS = {
  UPLOADING: 'UPLOADING',
  UPLOADED: 'UPLOADED',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED', // 서버 보관 기간이 지남
}
// 학습 세션 상태: 만들어짐 -> 진행 중 -> 다 풂(COMPLETED) 또는 중간 종료(ENDED)
export const SESSION_STATUS = {
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ENDED: 'ENDED',
}
// 세션 안에서 지금 어느 단계인지: 개념 듣기 -> 문제 설정 -> 문제 풀이
export const PHASE = { LISTEN: 'LISTEN', QUIZ_SETUP: 'QUIZ_SETUP', QUIZ: 'QUIZ' }
// 단원 문제 생성 상태. PREPARING이면 세션을 만들 수 없다 (CATEGORY_NOT_READY)
export const QUESTION_STATUS = { PREPARING: 'PREPARING' }
export const isUnitPreparing = (unit) => unit?.questionStatus === QUESTION_STATUS.PREPARING
// 오답노트 상태: OPEN(아직 못 맞힘) / RESOLVED(다시 풀어서 맞힘)
export const WRONG_STATUS = { OPEN: 'OPEN', RESOLVED: 'RESOLVED' }
// 문제 유형 (화면 기준 이름. 서버는 객관식을 'MC'로 쓰므로 lib/question.js에서 변환한다)
export const QUESTION_TYPE = { OX: 'OX', MCQ: 'MCQ', SHORT: 'SHORT' }
// 문제 푸는 방식: 눈으로 풀기(화면) / 듣고 풀기(음성)
export const SOLVE_MODE = { READ: 'READ', LISTEN: 'LISTEN' }
// 방식마다 고를 수 있는 문제 양식
export const SOLVE_MODE_TYPES = {
  READ: [QUESTION_TYPE.OX, QUESTION_TYPE.SHORT, QUESTION_TYPE.MCQ],
  LISTEN: [QUESTION_TYPE.OX, QUESTION_TYPE.SHORT],
}
// 난이도. 서버에는 1~3 숫자로 보낸다 (lib/question.js의 DIFFICULTY_LEVEL)
export const DIFFICULTY = { EASY: 'EASY', NORMAL: 'NORMAL', HARD: 'HARD' }

// 편도 통학 시간(분) 설정 범위. REVIEW_ONLY_MAX분 이하면 오답 복습만 할 수 있다
export const COMMUTE = { MIN: 10, MAX: 120, STEP: 5, DEFAULT: 50, REVIEW_ONLY_MAX: 10 }
export const NICKNAME_RULE = { MIN: 2, MAX: 10 }
export const WARNING_SEC = 300 // 문제 풀이 종료 5분 전에 "곧 끝나요" 알림

// 화면 주소. 라우터(routes/AppRouter.jsx)와 navigate()에서 같이 쓴다
export const ROUTES = {
  SPLASH: '/',
  LOGIN: '/login',
  NICKNAME: '/onboarding/nickname',
  COMMUTE: '/onboarding/commute',
  SUBJECT_NEW: '/subjects/new',
  MATERIAL_UPLOAD: '/materials/upload',
  UNIT_PREVIEW: '/materials/units',
  HOME: '/home',
  LISTEN: '/study/listen',
  SETUP: '/study/setup',
  PLAYER: '/study/play',
  SUMMARY: '/study/summary',
  SETTINGS: '/settings',
  SETTINGS_COMMUTE: '/settings/commute',
  SETTINGS_ACCOUNT: '/settings/account',
  SETTINGS_SUBJECTS: '/settings/subjects',
  REVIEW: '/study/review',
  WRONG_NOTES: '/wrong-notes',
  REPORT: '/report',
}
export const SUBJECT_NAME = { MAX: 20 }
// 자료 업로드 제한
export const UPLOAD = {
  MAX_MB: 30, // 파일 하나 최대 용량
  MAX_PER_UPLOAD: 5, // 한 번에 올릴 수 있는 자료 수 (사진 묶음은 1개로 셈)
  MAX_VISIBLE: 10, // 화면에 보여줄 자료 최대 개수
  MAX_DOC_PAGES: 100, // PDF/PPTX 최대 페이지
  MAX_IMAGE_PAGES: 20, // 사진(PNG·JPG) 한 묶음 최대 장수
  IMAGE_EXTENSIONS: ['png', 'jpg', 'jpeg'], // 사진 확장자 (섞어서 한 묶음으로 올릴 수 있음)
  EXTENSIONS: ['pdf', 'pptx', 'png', 'jpg', 'jpeg'], // 허용 확장자 (HEIC는 서버가 안 받음)
}
