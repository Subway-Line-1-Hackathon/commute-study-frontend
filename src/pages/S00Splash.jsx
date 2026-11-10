import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { getEntryRoute } from '../lib/entryRoute'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { useMaterialStore } from '../store/useMaterialStore'
import mascot from '../assets/mascot-default.png'

// S00 스플래시: 앱 첫 화면
// 로그인 세션 확인 -> 서버 정보 동기화 -> 상태에 맞는 화면(로그인/온보딩/홈)으로 이동
// 구글 로그인 후 돌아오는 화면(redirectTo)도 여기다
export default function S00Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false // 화면을 떠난 뒤에는 navigate하지 않도록

    // 구글 로그인 후 이 화면으로 돌아오면 getSession이 URL의 code를 세션으로 바꿔 준다
    const checkSession = async () => {
      if (!supabase) return
      const { data } = await supabase.auth.getSession()
      useAuthStore.getState().applySession(data.session)
      if (!data.session) return

      // 서버의 닉네임·통학 설정·과목을 가져온다. 실패하면 기기에 저장된 값으로 계속한다
      try {
        await Promise.all([
          useAuthStore.getState().syncMe(),
          useMaterialStore.getState().syncSubjects(),
        ])
      } catch (err) {
        // 401: 토큰이 만료·무효 -> 로그아웃시켜 다시 로그인하게 한다
        if (err instanceof ApiError && err.status === 401) {
          useAuthStore.getState().logout()
        }
      }
    }

    // 확인이 너무 빨리 끝나도 로고가 깜빡이지 않게 최소 0.8초는 보여준다
    const minDelay = new Promise((resolve) => setTimeout(resolve, 800))

    Promise.all([checkSession(), minDelay]).then(() => {
      if (cancelled) return
      const auth = useAuthStore.getState()
      // 분석 중이던 자료가 있으면 상태 조회를 다시 시작
      useMaterialStore.getState().resumePending()
      navigate(getEntryRoute({ auth }), { replace: true })
    })

    return () => {
      cancelled = true
    }
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
