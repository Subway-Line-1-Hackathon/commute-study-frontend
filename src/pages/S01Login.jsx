import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import Button from '../components/Button'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import logo from '../assets/logo.png'

// S01 로그인: 구글 로그인 버튼 하나
// 구글 인증 후 스플래시로 돌아온다.
export default function S01Login() {
  const [loading, setLoading] = useState(false) // 버튼 중복 클릭 방지
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      await useAuthStore.getState().loginWithGoogle()
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
      <img src={logo} alt="SNS" className="h-14 w-14" />

      <div className="mt-5">
        <ScreenTitle
          title={'통학 시간을\n학습 시간으로'}
          description="앱을 쓰려면 로그인이 필요해요."
        />
      </div>
    </Screen>
  )
}
