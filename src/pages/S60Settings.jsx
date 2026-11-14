import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../lib/constants'
import { useAuthStore } from '../store/useAuthStore'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'

// 설정 목록의 한 줄. to가 있으면 눌러서 이동, 없으면 글자만 보여준다
function SettingRow({ label, value, to }) {
  const body = (
    <>
      <span className="text-body font-bold text-ink">{label}</span>
      <span className="ml-3 truncate text-caption text-muted">
        {value}
        {to && ' ›'}
      </span>
    </>
  )
  const className =
    'flex min-h-14 items-center justify-between rounded-2xl border border-line bg-surface px-4'

  if (!to) return <div className={className}>{body}</div>
  return (
    <Link to={to} className={className}>
      {body}
    </Link>
  )
}

// S60 설정 탭: 통학 시간 / 학습 알림 / 계정 목록과 로그아웃
// 통학 시간·계정은 각자 하위 화면(S61, S62)에서 수정한다
export default function S60Settings() {
  const navigate = useNavigate()
  const commute = useAuthStore((s) => s.commute)
  const logout = useAuthStore((s) => s.logout)

  // 예: '연천역 → 인천역 · 50분'. 역을 안 넣었으면 시간만
  const departure = commute?.departure
  const arrival = commute?.arrival
  let commuteLabel = `${commute?.studyMin ?? 0}분`
  if (departure || arrival) {
    commuteLabel = `${departure || '출발역'} → ${arrival || '도착역'} · ${commuteLabel}`
  }

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  const bottomCta = (
    <button
      type="button"
      onClick={handleLogout}
      className="h-13 w-full rounded-2xl border border-line bg-surface text-body font-bold text-ink"
    >
      로그아웃
    </button>
  )

  return (
    <Screen withTabBar bottomCta={bottomCta}>
      <ScreenTitle title="설정" />

      <div className="mt-6 space-y-3">
        <SettingRow label="통학 시간" value={commuteLabel} to={ROUTES.SETTINGS_COMMUTE} />
        <SettingRow label="학습 알림" value="준비 중" />
        <SettingRow label="계정" value="Google 연동" to={ROUTES.SETTINGS_ACCOUNT} />
      </div>
    </Screen>
  )
}
