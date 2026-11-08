import { Navigate } from 'react-router-dom'
import { AUTH_STATUS, ROUTES } from '../lib/constants'
import { getEntryRoute } from '../lib/entryRoute'
import { useAuthStore } from '../store/useAuthStore'

// 로그인 필요 (온보딩 화면용)
export function RequireAuth({ children }) {
  const status = useAuthStore((s) => s.status)
  if (status === AUTH_STATUS.ANONYMOUS) return <Navigate to={ROUTES.LOGIN} replace />
  return children
}

// ACTIVE 유저 전용 (홈, 학습 화면용). 아니면 현재 단계 화면으로 되돌림
export function RequireActive({ children }) {
  const auth = useAuthStore()
  if (auth.status !== AUTH_STATUS.ACTIVE) {
    return <Navigate to={getEntryRoute({ auth })} replace />
  }
  return children
}
