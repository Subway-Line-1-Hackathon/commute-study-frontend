// 데이터 모드 판단은 인증 SDK를 불러오지 않는다. 기존 환경변수만 있는 배포도 유지한다.
export function resolveDataMode(env) {
  const configured = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)
  const mode = env.VITE_DATA_MODE || (configured ? 'server' : 'mock')
  if (mode !== 'server' && mode !== 'mock') {
    throw new Error('VITE_DATA_MODE must be server or mock')
  }
  if (mode === 'server' && !configured) {
    throw new Error('Server mode requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  }
  return mode
}

export const dataMode = resolveDataMode(import.meta.env)
export const isServerMode = dataMode === 'server'
