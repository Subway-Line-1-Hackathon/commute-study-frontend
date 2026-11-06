import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'
import { COMMUTE, NICKNAME_RULE, ROUTES } from '../lib/constants'
import { validateNickname } from '../lib/nickname'
import { getTimePlan } from '../lib/plan'
import { calcStudyMinutes, isValidCommute } from '../lib/time'
import { useAuthStore } from '../store/useAuthStore'

const toMin = (sec) => Math.round(sec / 60)

export default function S60Settings() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const commute = useAuthStore((s) => s.commute)
  const saveNickname = useAuthStore((s) => s.saveNickname)
  const saveCommute = useAuthStore((s) => s.saveCommute)
  const logout = useAuthStore((s) => s.logout)

  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [commuteInput, setCommuteInput] = useState(commute ? String(commute.oneWayMin) : '')
  const [nicknameSaved, setNicknameSaved] = useState(false)
  const [commuteSaved, setCommuteSaved] = useState(false)

  // 닉네임
  const nicknameError = nickname ? validateNickname(nickname) : ''
  const nicknameChanged = nickname.trim() !== (user?.nickname ?? '')
  const canSaveNickname = nickname.trim() !== '' && nicknameError === '' && nicknameChanged

  // 통학 시간
  const minutes = commuteInput === '' ? null : Number(commuteInput)
  const commuteValid = minutes !== null && isValidCommute(minutes)
  const commuteError = minutes !== null && !commuteValid
  const studyMin = commuteValid ? calcStudyMinutes(minutes) : null
  const plan = commuteValid ? getTimePlan(studyMin) : null
  const commuteChanged = minutes !== (commute?.oneWayMin ?? null)
  const canSaveCommute = commuteValid && commuteChanged

  const handleSaveNickname = () => {
    if (!canSaveNickname) return
    saveNickname(nickname)
    setNicknameSaved(true)
  }

  const handleSaveCommute = () => {
    if (!canSaveCommute) return
    saveCommute(minutes)
    setCommuteSaved(true)
  }

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 px-5 py-4">
      <BackButton to={ROUTES.HOME} />
      <h1 className="mt-2 text-2xl font-bold text-slate-900">설정</h1>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800">통학 시간</h2>
        <p className="mt-1 text-xs text-slate-500">
          편도 이동 시간의 70%가 학습 시간이 돼요. 바꾼 시간은 다음 학습부터 적용돼요.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <input
            type="number"
            inputMode="numeric"
            value={commuteInput}
            onChange={(e) => {
              setCommuteInput(e.target.value)
              setCommuteSaved(false)
            }}
            placeholder="예: 50"
            className={`w-full rounded-xl border px-4 py-3 text-lg outline-none focus:ring-2 ${
              commuteError ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-200'
            }`}
          />
          <span className="shrink-0 text-slate-600">분</span>
        </div>
        {commuteError && (
          <p className="mt-2 text-sm text-red-500">
            {COMMUTE.MIN}분에서 {COMMUTE.MAX}분 사이로 입력해 주세요.
          </p>
        )}

        {plan && (
          <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-slate-700">
            <p>
              학습 가능 시간 <b className="text-blue-600">{studyMin}분</b>
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
        <input
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value)
            setNicknameSaved(false)
          }}
          maxLength={NICKNAME_RULE.MAX}
          placeholder="닉네임"
          className={`mt-3 w-full rounded-xl border px-4 py-3 text-lg outline-none focus:ring-2 ${
            nicknameError ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-200'
          }`}
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

      <div className="mt-auto pt-8">
        <button
          onClick={handleLogout}
          className="w-full rounded-xl border border-slate-300 bg-white py-3.5 font-semibold text-slate-600 active:bg-slate-50"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}