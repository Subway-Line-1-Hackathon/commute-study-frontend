import { ApiError } from './api'

// 인증 공급자와 API 클라이언트의 연결은 앱 진입점에서 명시적으로 수행한다.
export function createTokenProvider(client, getAccountId = () => null) {
  return async (accountId = getAccountId()) => {
    const { data, error } = client ? await client.auth.getSession() : { data: { session: null } }
    if (error) throw error
    if (accountId && data.session?.user.id !== accountId) {
      throw new ApiError(401, { message: '답안을 작성한 계정으로 다시 로그인해 주세요.' })
    }
    return data.session?.access_token ?? null
  }
}
