// 백엔드 호출 공통 클라이언트
// dev에서는 vite 프록시(/api)를 타므로 BASE가 비어 있어도 된다.
// 배포 시 VITE_API_BASE_URL에 백엔드 주소를 넣는다.
const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

// 토큰을 꺼내는 함수. 기본은 토큰 없음이고, supabase.js가 로드되면 교체된다
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

// 서버가 2xx가 아닌 응답을 줬을 때 던지는 에러
// status(HTTP 코드)와 body(서버가 준 에러 JSON)를 담아서, 화면에서 코드별로 분기할 수 있다
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

// 모든 API 호출이 지나가는 함수
// - query: 객체를 ?a=1&b=2로 바꾼다. 값이 undefined/null인 항목은 빼고 보낸다
// - body: 객체면 JSON으로, FormData면 그대로 보낸다 (파일 업로드)
// - 응답 본문은 JSON이면 파싱하고, 아니면 문자열, 비어 있으면(204 등) null을 돌려준다
// - 실패(4xx/5xx)면 ApiError를 던진다
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
      // FormData는 브라우저가 boundary가 포함된 Content-Type을 직접 넣어야 해서 지정하지 않는다
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
