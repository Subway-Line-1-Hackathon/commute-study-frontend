import { useEffect, useState, useSyncExternalStore } from 'react'
import { createAuthController } from '../lib/authController'
import { supabase } from '../lib/supabase'
import { configurationError } from '../lib/runtime'
import { suspendUserData, switchUserData } from '../store/resetUserData'
import { useAuthStore } from '../store/useAuthStore'
import { useMaterialStore } from '../store/useMaterialStore'
import Button from './Button'

export default function AuthBoundary({ children }) {
  const [controller] = useState(() =>
    createAuthController({
      client: supabase,
      getAuth: useAuthStore.getState,
      switchData: switchUserData,
      suspendData: suspendUserData,
      syncSubjects: () => useMaterialStore.getState().syncSubjects(),
      syncCategories: () => useMaterialStore.getState().syncCategories(),
      resumePending: () => useMaterialStore.getState().resumePending(),
    }),
  )
  const { ready, error } = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  useEffect(() => controller.start(), [controller])

  if (ready) return children
  return (
    <div
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center"
      role="status"
    >
      <p className="text-caption text-muted">
        {configurationError ??
          (error
            ? '로그인 정보를 확인하지 못했어요. 연결을 확인하고 다시 시도해 주세요.'
            : '로그인 상태 확인 중…')}
      </p>
      {error && !configurationError && <Button onClick={controller.retry}>다시 시도</Button>}
    </div>
  )
}
