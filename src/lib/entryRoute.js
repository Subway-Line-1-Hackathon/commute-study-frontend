import { AUTH_STATUS, ROUTES } from './constants'

// 지금 로그인/온보딩 상태에서 가야 할 화면 주소를 돌려준다
// 로그인 전 -> 로그인 / 온보딩 완료 -> 홈 / 닉네임 없음 -> 닉네임 입력 / 그 외 -> 통학 시간 입력
// 스플래시와 RequireActive 가드가 이 함수로 이동할 곳을 정한다
export function getEntryRoute({ auth }) {
  if (auth.status === AUTH_STATUS.ANONYMOUS) return ROUTES.LOGIN
  if (auth.status === AUTH_STATUS.ACTIVE) return ROUTES.HOME
  if (!auth.user?.nickname) return ROUTES.NICKNAME
  return ROUTES.COMMUTE
}
