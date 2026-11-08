import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEntryRoute } from '../lib/entryRoute'
import { useAuthStore } from '../store/useAuthStore'
import { useMaterialStore } from '../store/useMaterialStore'
import mascot from '../assets/mascot-default.png'

export default function S00Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      const auth = useAuthStore.getState()
      useMaterialStore.getState().resumePending()
      navigate(getEntryRoute({ auth }), { replace: true })
    }, 800)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="flex min-h-dvh flex-col px-6 py-10">
      <div className="flex flex-1 flex-col items-center justify-center">
        <img src={mascot} alt="" className="h-30 w-30" />
        <h1 className="mt-5 text-title text-ink">통학 AI 학습</h1>
        <p className="mt-2 text-caption text-muted">버려지는 이동 시간을 성장의 시간으로</p>
      </div>

      <p className="text-center text-caption text-muted">로그인 상태 확인 중…</p>
    </div>
  )
}
