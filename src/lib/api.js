// 백엔드 호출 공통 클라이언트
// dev에서는 vite 프록시(/api)를 타므로 BASE가 비어 있어도 된다.
// 배포 시 VITE_API_BASE_URL에 백엔드 주소를 넣는다.
const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

let getToken = () => null
// 로그인 모듈(Supabase 등)이 붙으면 토큰 공급 함수를 등록한다
export const setTokenProvider = (fn) => {
  getToken = fn
}

// fetch를 직접 쓰는 곳(SSE 등)에서 쓰는 주소와 인증 헤더
export const apiUrl = (path) => `${BASE}${path}`
export async function authHeader() {
  const token = await getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export class ApiError extends Error {
  constructor(status, body) {
    super(`API ${status}`)
    this.status = status
    this.body = body
  }
}

// 화면에 보여줄 에러 문구. 서버가 준 message가 있으면 그걸 쓴다
export function errorMessage(err, fallback = '잠시 후 다시 시도해 주세요.') {
  if (err instanceof ApiError && typeof err.body?.message === 'string') return err.body.message
  return fallback
}

export async function api(path, { method = 'GET', body, query, signal } = {}) {
  const qs = query
    ? '?' +
      new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== null),
      ).toString()
    : ''
  const token = await getToken()
  const isForm = body instanceof FormData

  const res = await fetch(`${BASE}${path}${qs}`, {
    method,
    signal,
    headers: {
      ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}
