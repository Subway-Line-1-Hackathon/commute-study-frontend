import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'
import ConfirmModal from '../components/ConfirmModal'
import MinuteStepper from '../components/MinuteStepper'
import TextField from '../components/TextField'
import { errorMessage } from '../lib/api'
import { COMMUTE, NICKNAME_RULE, ROUTES } from '../lib/constants'
import { validateNickname } from '../lib/nickname'
import { getTimePlan } from '../lib/plan'
import { isValidCommute } from '../lib/time'
import { useAuthStore } from '../store/useAuthStore'

// 초 -> 분 (반올림)
const toMin = (sec) => Math.round(sec / 60)

// S60 설정 탭: 통학 시간·닉네임 수정, 로그아웃
// 두 항목은 저장 버튼이 따로 있지만 서버에는 항상 함께 저장된다 (아래 save 참고)
export default function S60Settings() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const commute = useAuthStore((s) => s.commute)
  const saveProfile = useAuthStore((s) => s.saveProfile)
  const logout = useAuthStore((s) => s.logout)
  const withdraw = useAuthStore((s) => s.withdraw)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false) // 탈퇴 확인 창 표시
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [commuteInput, setCommuteInput] = useState(String(commute?.studyMin ?? COMMUTE.DEFAULT))
  // 저장 직후 버튼 문구를 '저장했어요'로 바꾸기 위한 표시. 값을 다시 고치면 false로
  const [nicknameSaved, setNicknameSaved] = useState(false)
  const [commuteSaved, setCommuteSaved] = useState(false)

  // 닉네임: 올바르고 + 바뀌었을 때만 저장 버튼 활성화
  const nicknameError = nickname ? validateNickname(nickname) : ''
  const nicknameChanged = nickname.trim() !== (user?.nickname ?? '')
  const canSaveNickname = nickname.trim() !== '' && nicknameError === '' && nicknameChanged

  // 통학 시간: 범위 안이고 + 바뀌었을 때만 저장 버튼 활성화. plan은 개념/문제 시간 미리보기용
  const minutes = commuteInput === '' ? null : Number(commuteInput)
  const commuteValid = minutes !== null && isValidCommute(minutes)
  const commuteError = minutes !== null && !commuteValid
  const plan = commuteValid ? getTimePlan(minutes) : null
  const commuteChanged = minutes !== (commute?.studyMin ?? null)
  const canSaveCommute = commuteValid && commuteChanged

  // 서버는 닉네임과 통학 시간을 함께 저장하므로, 바꾸지 않은 쪽은 저장된 값을 같이 보낸다
  const save = async (profile, onSaved) => {
    setSaving(true)
    setSaveError('')
    try {
      await saveProfile({
        nickname: user?.nickname ?? '',
        studyMin: commute?.studyMin ?? COMMUTE.DEFAULT,
        departure: commute?.departure ?? '',
        arrival: commute?.arrival ?? '',
        ...profile, // 바꾼 값으로 덮어쓴다
      })
      onSaved()
    } catch (err) {
      setSaveError(errorMessage(err, '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNickname = () => {
    if (!canSaveNickname || saving) return
    save({ nickname }, () => setNicknameSaved(true))
  }

  const handleSaveCommute = () => {
    if (!canSaveCommute || saving) return
    save({ studyMin: minutes }, () => setCommuteSaved(true))
  }

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
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
    // 높이에서 하단 탭바(h-16 = 4rem)를 빼야 맨 아래 버튼이 탭바에 가려지지 않는다
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col bg-slate-50 px-5 py-4">
      <BackButton to={ROUTES.HOME} />
      <h1 className="mt-2 text-2xl font-bold text-slate-900">설정</h1>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800">통학 시간</h2>
        <p className="mt-1 text-xs text-slate-500">
          입력한 시간이 그대로 학습 시간이 돼요. 바꾼 시간은 다음 학습부터 적용돼요.
        </p>

        <div className="mt-4">
          <MinuteStepper
            label="예상 소요 시간"
            value={commuteInput}
            onChange={(v) => {
              setCommuteInput(v)
              setCommuteSaved(false)
            }}
          />
        </div>
        {commuteError && (
          <p className="mt-2 text-sm text-red-500">
            {COMMUTE.MIN}분에서 {COMMUTE.MAX}분 사이로 입력해 주세요.
          </p>
        )}

        {plan && (
          <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-slate-700">
            <p>
              학습 가능 시간 <b className="text-blue-600">{minutes}분</b>
            </p>
            {plan.conceptSec > 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                개념 듣기 {toMin(plan.conceptSec)}분 + 문제 풀이 {toMin(plan.quizSec)}분
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-700">
                {COMMUTE.REVIEW_ONLY_BELOW}분 미만이라 복습 퀴즈만 이용할 수 있어요.
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleSaveCommute}
          disabled={!canSaveCommute}
          className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:bg-slate-300"
        >
          {commuteSaved ? '저장했어요' : '통학 시간 저장'}
        </button>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800">닉네임</h2>
        <TextField
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value)
            setNicknameSaved(false)
          }}
          maxLength={NICKNAME_RULE.MAX}
          placeholder="닉네임"
          invalid={!!nicknameError}
          className="mt-3"
        />
        <p className="mt-2 min-h-5 text-sm text-red-500">{nicknameError}</p>
        <button
          onClick={handleSaveNickname}
          disabled={!canSaveNickname}
          className="mt-2 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:bg-slate-300"
        >
          {nicknameSaved ? '저장했어요' : '닉네임 저장'}
        </button>
      </section>

      {saveError && <p className="mt-4 text-center text-sm text-red-500">{saveError}</p>}

      <div className="mt-auto pt-8">
        <button
          onClick={handleLogout}
          className="w-full rounded-xl border border-slate-300 bg-white py-3.5 font-semibold text-slate-600"
        >
          로그아웃
        </button>
        <button
          onClick={() => setConfirmWithdraw(true)}
          disabled={withdrawing}
          className="mt-3 w-full py-2 text-sm text-slate-400 underline disabled:opacity-50"
        >
          {withdrawing ? '탈퇴 처리 중…' : '회원 탈퇴'}
        </button>
        {withdrawError && <p className="mt-2 text-center text-sm text-red-500">{withdrawError}</p>}
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
    </div>
  )
}
