import { useState } from 'react'
import { errorMessage } from '../lib/api'
import { COMMUTE, ROUTES } from '../lib/constants'
import { getTimePlan } from '../lib/plan'
import { isReviewOnly, isValidCommute } from '../lib/time'
import { useAuthStore } from '../store/useAuthStore'
import Button from '../components/Button'
import MinuteStepper from '../components/MinuteStepper'
import TextField from '../components/TextField'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'

// 초 -> 분 (반올림)
const toMin = (sec) => Math.round(sec / 60)

// S61 설정 > 통학 시간: 출발역·도착역·예상 소요 시간 수정
export default function S61CommuteEdit() {
  const user = useAuthStore((s) => s.user)
  const commute = useAuthStore((s) => s.commute)
  const saveProfile = useAuthStore((s) => s.saveProfile)

  const [departure, setDeparture] = useState(commute?.departure ?? '')
  const [arrival, setArrival] = useState(commute?.arrival ?? '')
  const [input, setInput] = useState(String(commute?.studyMin ?? COMMUTE.DEFAULT))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false) // 저장 직후 '저장했어요' 표시. 값을 고치면 false
  const [saveError, setSaveError] = useState('')

  const minutes = input === '' ? null : Number(input)
  const valid = minutes !== null && isValidCommute(minutes)
  const showError = minutes !== null && !valid
  const plan = valid ? getTimePlan(minutes) : null
  const changed =
    minutes !== (commute?.studyMin ?? null) ||
    departure.trim() !== (commute?.departure ?? '') ||
    arrival.trim() !== (commute?.arrival ?? '')
  const canSave = valid && changed && !saving

  // 입력값이 바뀌면 '저장했어요' 표시를 지운다
  const edit = (setter) => (value) => {
    setter(value)
    setSaved(false)
  }

  // 서버는 닉네임과 통학 정보를 함께 저장하므로 닉네임도 같이 보낸다
  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setSaveError('')
    try {
      await saveProfile({ nickname: user?.nickname ?? '', studyMin: minutes, departure, arrival })
      setSaved(true)
    } catch (err) {
      setSaveError(errorMessage(err, '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'))
    } finally {
      setSaving(false)
    }
  }

  const bottomCta = (
    <>
      {saveError && <p className="mb-2 text-center text-caption text-danger">{saveError}</p>}
      <Button onClick={handleSave} disabled={!canSave}>
        {saved ? '저장했어요' : '저장'}
      </Button>
    </>
  )

  return (
    <Screen back={ROUTES.SETTINGS} bottomCta={bottomCta}>
      <ScreenTitle
        title="통학 시간"
        description="입력한 시간이 그대로 학습 시간이 돼요. 바꾼 시간은 다음 학습부터 적용돼요."
      />

      <div className="mt-8 space-y-4">
        <TextField
          label="출발역"
          value={departure}
          onChange={(e) => edit(setDeparture)(e.target.value)}
          placeholder="연천역"
        />
        <TextField
          label="도착역"
          value={arrival}
          onChange={(e) => edit(setArrival)(e.target.value)}
          placeholder="인천역"
        />

        <div>
          <MinuteStepper label="예상 소요 시간" value={input} onChange={edit(setInput)} />
          {showError && (
            <p className="mt-2 text-caption text-danger">
              {COMMUTE.MIN}분에서 {COMMUTE.MAX}분 사이로 입력해 주세요.
            </p>
          )}
        </div>
      </div>

      {plan && (
        <div className="mt-4 rounded-xl bg-primary/10 p-4 text-caption text-ink">
          <p>
            학습 가능 시간 <b className="text-primary">{minutes}분</b>
          </p>
          {isReviewOnly(minutes) && (
            <p className="mt-1 text-warning">{COMMUTE.REVIEW_ONLY_MAX}분이면 오답 복습만 할 수 있어요.</p>
          )}
          {!isReviewOnly(minutes) && plan.conceptSec > 0 && (
            <p className="mt-1 text-muted">
              개념 듣기 {toMin(plan.conceptSec)}분 + 문제 풀이 {toMin(plan.quizSec)}분
            </p>
          )}
          {!isReviewOnly(minutes) && plan.conceptSec === 0 && (
            <p className="mt-1 text-muted">개념 듣기 없이 문제 풀이 {minutes}분</p>
          )}
        </div>
      )}
    </Screen>
  )
}
