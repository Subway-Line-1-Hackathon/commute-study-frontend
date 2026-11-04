const PREFIX = 'cs:'

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

export const zustandStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
export const wait = (min, max = min) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)))
