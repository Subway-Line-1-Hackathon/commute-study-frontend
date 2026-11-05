import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../lib/constants'
import { useAuthStore } from '../store/useAuthStore'
import BackButton from './BackButton'

export default function TopBar({ backTo, showLogout = true }) {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="flex items-center justify-between">
      {backTo ? <BackButton to={backTo} /> : <span />}
      {showLogout && (
        <button
          onClick={handleLogout}
          className="py-2 text-sm text-slate-500 active:text-slate-800"
        >
          로그아웃
        </button>
      )}
    </div>
  )
}
