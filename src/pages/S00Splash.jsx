import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEntryRoute } from '../lib/entryRoute'
import { useAuthStore } from '../store/useAuthStore'
import { useMaterialStore } from '../store/useMaterialStore'

export default function S00Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => {
      const auth = useAuthStore.getState()
      const { materials, subjects, resumePending } = useMaterialStore.getState()
      resumePending() // 새로고침으로 끊긴 업로드 처리 이어서 진행
      navigate(getEntryRoute({ auth, materials, subjects }), { replace: true })
    }, 800)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-600">
      <h1 className="text-3xl font-bold text-white">통학 학습</h1>
    </div>
  )
}
