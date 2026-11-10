import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEntryRoute } from '../lib/entryRoute'
import { useAuthStore } from '../store/useAuthStore'
import Button from '../components/Button'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import logo from '../assets/logo.png'

// S01 로그인: 구글 로그인 버튼 하나
// Supabase 모드면 구글 화면으로 나갔다가 스플래시로 돌아오고, Mock 모드면 바로 다음 화면으로 간다
export default function S01Login() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false) // 버튼 중복 클릭 방지
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const redirected = await useAuthStore.getState().loginWithGoogle()
      // Supabase 로그인은 구글 화면으로 이동하므로 여기서 끝난다
      if (redirected) return
      const auth = useAuthStore.getState()
      navigate(getEntryRoute({ auth }), { replace: true })
    } catch {
      setError('로그인하지 못했어요. 잠시 후 다시 시도해 주세요.')
      setLoading(false)
    }
  }

  const bottomCta = (
    <>
      {error && <p className="mb-2 text-center text-caption text-danger">{error}</p>}
      <Button onClick={handleGoogleLogin} disabled={loading}>
        Google로 계속하기
      </Button>
    </>
  )

  return (
    <Screen bottomCta={bottomCta}>
      <img src={logo} alt="통학 AI 학습" className="h-14 w-14" />

      <div className="mt-5">
        <ScreenTitle
          title={'통학 시간을\n학습 시간으로'}
          description="앱을 쓰려면 로그인이 필요해요."
        />
      </div>
    </Screen>
  )
}
