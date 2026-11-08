import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NICKNAME_RULE, ROUTES } from '../lib/constants'
import { validateNickname } from '../lib/nickname'
import { useAuthStore } from '../store/useAuthStore'
import Button from '../components/Button'
import TextField from '../components/TextField'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'

export default function S02Nickname() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const saveNickname = useAuthStore((s) => s.saveNickname)
  const logout = useAuthStore((s) => s.logout)

  const [input, setInput] = useState(user?.nickname ?? '')

  const error = input ? validateNickname(input) : ''
  const valid = input.trim() !== '' && error === ''

  const handleNext = () => {
    if (!valid) return
    saveNickname(input)
    navigate(ROUTES.COMMUTE, { replace: true })
  }

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  const bottomCta = (
    <>
      <Button onClick={handleNext} disabled={!valid}>
        다음
      </Button>

      <Button variant="secondary" onClick={handleLogout} className="mt-3 text-caption">
        다른 계정으로 로그인
      </Button>
    </>
  )

  return (
    <Screen bottomCta={bottomCta}>
      <ScreenTitle
        title={'반가워요!\n닉네임을 정해주세요'}
        description="통학 학습에서 사용할 이름이에요."
      />

      <div className="mt-8">
        <TextField
          label="닉네임"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleNext()}
          maxLength={NICKNAME_RULE.MAX}
          placeholder="예: 통학러"
          autoFocus
          invalid={!!error}
        />

        <div className="mt-2 flex justify-between text-caption">
          <span className="text-danger">{error}</span>
          <span className="text-muted">
            {input.trim().length}/{NICKNAME_RULE.MAX}
          </span>
        </div>
      </div>
    </Screen>
  )
}
