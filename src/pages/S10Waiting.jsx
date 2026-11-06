import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { MATERIAL_STATUS as M, ROUTES } from '../lib/constants'
import { useAuthStore } from '../store/useAuthStore'
import { useMaterialStore } from '../store/useMaterialStore'

const LABEL = {
  [M.UPLOADED]: '업로드 완료',
  [M.PROCESSING]: '강의 요약을 만드는 중...',
  [M.READY]: '준비 완료',
}

export default function S10Waiting() {
  const navigate = useNavigate()
  const materials = useMaterialStore((s) => s.materials)
  const resumePending = useMaterialStore((s) => s.resumePending)
  const activate = useAuthStore((s) => s.activate)

  const allReady = materials.length > 0 && materials.every((m) => m.status === M.READY)

  useEffect(() => {
    resumePending()
  }, [resumePending])

  useEffect(() => {
    if (allReady) {
      activate()
      navigate(ROUTES.HOME, { replace: true })
    }
  }, [allReady, activate, navigate])

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-6">
      <TopBar backTo={ROUTES.MATERIAL} />

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-lg font-semibold">자료를 준비하고 있어요</p>
        <ul className="w-full space-y-2">
          {materials.map((m) => (
            <li
              key={m.id}
              className="flex justify-between rounded-lg bg-slate-100 px-4 py-3 text-sm"
            >
              <span className="truncate">{m.fileName}</span>
              <span className="ml-3 shrink-0 text-slate-600">{LABEL[m.status]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
