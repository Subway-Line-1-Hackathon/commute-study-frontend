import { useNavigate } from 'react-router-dom'
import { getEntryRoute } from '../lib/entryRoute'
import { useAuthStore } from '../store/useAuthStore'
import Button from '../components/Button'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import logo from '../assets/logo.png'

export default function S01Login() {
  const navigate = useNavigate()

  const handleGoogleLogin = () => {
    useAuthStore.getState().loginWithGoogle()
    const auth = useAuthStore.getState()
    navigate(getEntryRoute({ auth }), { replace: true })
  }
  const bottomCta = <Button onClick={handleGoogleLogin}>Google로 계속하기</Button>

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
