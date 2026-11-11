import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../lib/constants'
import { useAuthStore } from '../store/useAuthStore'
import BackButton from './BackButton'

// 화면 상단 바: 왼쪽 뒤로가기(backTo가 있을 때), 오른쪽 설정·로그아웃 버튼
export default function TopBar({ backTo, showLogout = true, showSettings = false }) {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="flex items-center justify-between">
      {backTo ? <BackButton to={backTo} /> : <span />}
      <div className="flex items-center gap-4">
        {showSettings && (
          <button onClick={() => navigate(ROUTES.SETTINGS)} className="py-2 text-sm text-slate-500">
            설정
          </button>
        )}
        {showLogout && (
          <button onClick={handleLogout} className="py-2 text-sm text-slate-500">
            로그아웃
          </button>
        )}
      </div>
    </div>
  )
}
