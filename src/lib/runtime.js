export function getConfigurationError(env) {
  return env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY
    ? null
    : '로그인 설정이 준비되지 않았어요. 관리자에게 문의해 주세요.'
}

export const configurationError = getConfigurationError(import.meta.env)
