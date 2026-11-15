const PREFIX = 'cs:'
const cached = new Map()
const failedKeys = new Set()
const listeners = new Set()
let degraded = false

function notify() {
  const next = failedKeys.size > 0
  if (degraded === next) return
  degraded = next
  listeners.forEach((listener) => listener())
}

export const subscribeStorageStatus = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const getStorageStatus = () => degraded

// 저장이 막혀도 메모리의 답안 큐는 유지한다. 디스크의 오래된 값보다 미저장 값을 우선한다.
export const zustandStorage = {
  getItem(name) {
    if (failedKeys.has(name) && cached.has(name)) return cached.get(name)
    try {
      const value = localStorage.getItem(name)
      cached.set(name, value)
      failedKeys.delete(name)
      notify()
      return value
    } catch {
      failedKeys.add(name)
      notify()
      return cached.get(name) ?? null
    }
  },
  setItem(name, value) {
    cached.set(name, value)
    try {
      localStorage.setItem(name, value)
      failedKeys.delete(name)
    } catch {
      failedKeys.add(name)
    }
    notify()
  },
  removeItem(name) {
    cached.set(name, null)
    try {
      localStorage.removeItem(name)
      failedKeys.delete(name)
    } catch {
      failedKeys.add(name)
    }
    notify()
  },
}

export function retryStorage() {
  for (const name of [...failedKeys]) {
    if (!cached.has(name)) {
      zustandStorage.getItem(name)
    } else if (cached.get(name) === null) {
      zustandStorage.removeItem(name)
    } else {
      zustandStorage.setItem(name, cached.get(name))
    }
  }
}

// JSON으로 저장하고 읽는 간단한 래퍼. get은 값이 없거나 깨졌으면 fallback을 돌려준다
export const storage = {
  get(key, fallback = null) {
    try {
      const raw = zustandStorage.getItem(PREFIX + key)
      return raw ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  },
  set(key, value) {
    zustandStorage.setItem(PREFIX + key, JSON.stringify(value))
  },
  remove(key) {
    zustandStorage.removeItem(PREFIX + key)
  },
}

// 프론트에서 임시로 쓰는 고유 id (랜덤 8자 + 현재 시각)
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
// 상태 조회와 재시도 사이의 대기 시간을 지정한다.
export const wait = (min, max = min) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)))
