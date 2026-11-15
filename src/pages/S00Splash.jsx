import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEntryRoute } from '../lib/entryRoute'
import { useAuthStore } from '../store/useAuthStore'
import logo from '../assets/logo-sns-ko.svg'
import mascot from '../assets/mascot-default.png'

// S00 스플래시: 앱 첫 화면
// AuthBoundary의 인증 확인 이후 상태에 맞는 화면(로그인/온보딩/홈)으로 이동
// 구글 로그인 후 돌아오는 화면(redirectTo)도 여기다
export default function S00Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    // 실제 인증 확인은 AuthBoundary에서 모든 주소에 공통으로 적용한다.
    const timer = setTimeout(() => {
      const auth = useAuthStore.getState()
      navigate(getEntryRoute({ auth }), { replace: true })
    }, 800)

    return () => {
      clearTimeout(timer)
    }
  }, [navigate])

  return (
    <div className="flex min-h-dvh flex-col px-6 py-10">
      <div className="flex flex-1 flex-col items-center justify-center">
        <img src={mascot} alt="" className="h-30 w-30" />
        <h1 className="mt-5">
          <img src={logo} alt="SNS 스테이션 N 스터디" className="h-20 w-auto" />
        </h1>
      </div>

      <p className="text-center text-caption text-muted">로그인 상태 확인 중…</p>
    </div>
  )
}
