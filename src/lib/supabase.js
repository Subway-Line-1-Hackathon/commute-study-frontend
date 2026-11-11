import { createClient } from '@supabase/supabase-js'
import { setTokenProvider } from './api'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// .env.local에 키가 없으면 null이고, 이때는 Mock 로그인으로 동작한다
export const supabase =
  url && anonKey ? createClient(url, anonKey, { auth: { flowType: 'pkce' } }) : null

// 백엔드 API 요청마다 Supabase 로그인 토큰을 Authorization 헤더에 붙인다
if (supabase) {
  setTokenProvider(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  })
}
