// localStorage 관련 유틸
// 사생활 보호 모드 등에서 localStorage가 막히면 에러가 나므로 전부 try/catch로 감싼다
const PREFIX = 'cs:' // 다른 사이트/앱과 키가 겹치지 않게 붙이는 접두어

// JSON으로 저장하고 읽는 간단한 래퍼. get은 값이 없거나 깨졌으면 fallback을 돌려준다
export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      return raw ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      /* 저장 실패는 무시 */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key)
    } catch {
      /* 삭제 실패는 무시 */
    }
  },
}

// zustand persist 미들웨어에 넘기는 저장소 (스토어 상태를 새로고침 후에도 유지)
export const zustandStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
}

// 프론트에서 임시로 쓰는 고유 id (랜덤 8자 + 현재 시각)
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
// min~max ms 사이 랜덤하게 기다린다 (Mock 응답 지연 흉내용). 사용: await wait(300, 800)
export const wait = (min, max = min) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)))
