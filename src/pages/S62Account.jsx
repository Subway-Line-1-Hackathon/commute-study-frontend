import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import ConfirmModal from '../components/ConfirmModal'
import TextField from '../components/TextField'
import { errorMessage } from '../lib/api'
import { COMMUTE, NICKNAME_RULE, ROUTES } from '../lib/constants'
import { validateNickname } from '../lib/nickname'
import { useAuthStore } from '../store/useAuthStore'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'

// S62 설정 > 계정: 연동 계정 확인, 닉네임 변경, 회원 탈퇴
export default function S62Account() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const commute = useAuthStore((s) => s.commute)
  const saveProfile = useAuthStore((s) => s.saveProfile)
  const withdraw = useAuthStore((s) => s.withdraw)

  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')

  // 올바르고 + 바뀌었을 때만 저장 버튼 활성화
  const nicknameError = nickname ? validateNickname(nickname) : ''
  const changed = nickname.trim() !== (user?.nickname ?? '')
  const canSave = nickname.trim() !== '' && nicknameError === '' && changed && !saving

  // 서버는 닉네임과 통학 정보를 함께 저장하므로 통학 정보도 같이 보낸다
  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setSaveError('')
    try {
      await saveProfile({
        nickname,
        studyMin: commute?.studyMin ?? COMMUTE.DEFAULT,
        departure: commute?.departure ?? '',
        arrival: commute?.arrival ?? '',
      })
      setSaved(true)
    } catch (err) {
      setSaveError(errorMessage(err, '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'))
    } finally {
      setSaving(false)
    }
  }

  // 회원 탈퇴: 확인 창 -> 서버 삭제 -> 로그인 화면. 실패하면 문구를 띄우고 다시 누를 수 있다
  const handleWithdraw = async () => {
    setConfirmWithdraw(false)
    setWithdrawing(true)
    setWithdrawError('')
    try {
      await withdraw()
      navigate(ROUTES.LOGIN, { replace: true })
    } catch (err) {
      setWithdrawError(errorMessage(err, '탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요.'))
      setWithdrawing(false)
    }
  }

  return (
    <Screen back={ROUTES.SETTINGS}>
      <ScreenTitle title="계정" />

      <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
        <p className="text-caption text-muted">연동 계정</p>
        <p className="mt-1 text-body font-bold text-ink">Google</p>
        {user?.email && <p className="mt-0.5 text-caption text-muted">{user.email}</p>}
      </section>

      <div className="mt-6">
        <TextField
          label="닉네임"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value)
            setSaved(false)
          }}
          maxLength={NICKNAME_RULE.MAX}
          placeholder="닉네임"
          invalid={!!nicknameError}
        />
        <p className="mt-2 min-h-5 text-caption text-danger">{nicknameError || saveError}</p>
        <Button onClick={handleSave} disabled={!canSave}>
          {saved ? '저장했어요' : '닉네임 저장'}
        </Button>
      </div>

      <div className="mt-auto pt-10 text-center">
        <button
          type="button"
          onClick={() => setConfirmWithdraw(true)}
          disabled={withdrawing}
          className="py-2 text-caption text-muted underline disabled:opacity-50"
        >
          {withdrawing ? '탈퇴 처리 중…' : '회원 탈퇴'}
        </button>
        {withdrawError && <p className="mt-2 text-caption text-danger">{withdrawError}</p>}
      </div>

      {confirmWithdraw && (
        <ConfirmModal
          title="정말 탈퇴할까요?"
          message="과목, 자료, 학습 기록, 오답노트가 모두 바로 삭제되고 되돌릴 수 없어요."
          confirmLabel="탈퇴하기"
          onConfirm={handleWithdraw}
          onCancel={() => setConfirmWithdraw(false)}
        />
      )}
    </Screen>
  )
}
