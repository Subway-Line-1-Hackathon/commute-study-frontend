import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../lib/api'
import { COMMUTE, ROUTES } from '../lib/constants'
import { isReviewOnly, isValidCommute } from '../lib/time'
import { useAuthStore } from '../store/useAuthStore'
import Button from '../components/Button'
import MinuteStepper from '../components/MinuteStepper'
import TextField from '../components/TextField'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'

// S04 통학 시간 입력 (온보딩 2단계, 마지막)
// '다음'을 누르면 닉네임+통학 설정을 서버에 저장하고 ACTIVE 상태가 되어 홈으로 간다
export default function S04Commute() {
  const navigate = useNavigate()
  const saved = useAuthStore((s) => s.commute)
  const nickname = useAuthStore((s) => s.user?.nickname ?? '')
  const saveProfile = useAuthStore((s) => s.saveProfile)
  const activate = useAuthStore((s) => s.activate)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [departure, setDeparture] = useState(saved?.departure ?? '')
  const [arrival, setArrival] = useState(saved?.arrival ?? '')
  // 이전에 저장한 값이 있으면 그 값으로, 없으면 기본 50분으로 시작
  const [input, setInput] = useState(String(saved?.studyMin ?? COMMUTE.DEFAULT))

  const minutes = input === '' ? null : Number(input)
  const valid = minutes !== null && isValidCommute(minutes)
  const showError = minutes !== null && !valid // 범위 밖 숫자 입력
  const showReviewOnly = valid && isReviewOnly(minutes) // 20분 미만 안내

  const handleNext = async () => {
    if (!valid || saving) return
    setSaving(true)
    setSaveError('')
    try {
      await saveProfile({ nickname, studyMin: minutes, departure, arrival })
      activate()
      navigate(ROUTES.HOME, { replace: true })
    } catch (err) {
      setSaveError(errorMessage(err, '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'))
      setSaving(false)
    }
  }
  const bottomCta = (
    <>
      {saveError && <p className="mb-2 text-center text-caption text-danger">{saveError}</p>}
      <Button onClick={handleNext} disabled={!valid || saving}>
        다음
      </Button>
    </>
  )

  return (
    <Screen back={ROUTES.NICKNAME} bottomCta={bottomCta}>
      <ScreenTitle title="통학 시간을 알려주세요" />
      <p className="mt-2 text-caption text-muted">
        <span className="text-danger">*</span> 표시는 필수 입력
      </p>

      <div className="mt-8 space-y-4">
        <TextField
          label="출발역"
          value={departure}
          onChange={(e) => setDeparture(e.target.value)}
          placeholder="연천역"
        />
        <TextField
          label="도착역"
          value={arrival}
          onChange={(e) => setArrival(e.target.value)}
          placeholder="인천역"
        />

        <div>
          <MinuteStepper label="예상 소요 시간" value={input} onChange={setInput} required />
          {showError && (
            <p className="mt-2 text-caption text-danger">
              {COMMUTE.MIN}분에서 {COMMUTE.MAX}분 사이로 입력해 주세요.
            </p>
          )}
        </div>
      </div>

      {showReviewOnly && (
        <p className="mt-4 rounded-xl bg-warning-soft p-4 text-caption text-warning">
          {COMMUTE.REVIEW_ONLY_BELOW}분 미만은 복습 커리큘럼으로 진행돼요.
        </p>
      )}
    </Screen>
  )
}
