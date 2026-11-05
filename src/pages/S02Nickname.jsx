import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { NICKNAME_RULE, ROUTES } from '../lib/constants'
import { validateNickname } from '../lib/nickname'
import { useAuthStore } from '../store/useAuthStore'

export default function S02Nickname() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const saveNickname = useAuthStore((s) => s.saveNickname)

  const [input, setInput] = useState(user?.nickname ?? '')

  const error = input ? validateNickname(input) : ''
  const valid = input.trim() !== '' && error === ''

  const handleNext = () => {
    if (!valid) return
    saveNickname(input)
    navigate(ROUTES.COMMUTE, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white px-6 py-6">
      <TopBar />

      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        반가워요!
        <br />
        닉네임을 정해주세요
      </h1>
      <p className="mt-2 text-sm text-slate-500">통학 학습에서 사용할 이름이에요.</p>

      <div className="mt-10">
        <label className="mb-2 block text-sm font-medium text-slate-700">닉네임</label>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleNext()}
          maxLength={NICKNAME_RULE.MAX}
          placeholder="예: 통학러"
          autoFocus
          className={`w-full rounded-xl border px-4 py-3.5 text-lg outline-none focus:ring-2 ${
            error ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-200'
          }`}
        />
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-red-500">{error}</span>
          <span className="text-slate-400">
            {input.trim().length}/{NICKNAME_RULE.MAX}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-10">
        <button
          onClick={handleNext}
          disabled={!valid}
          className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white disabled:bg-slate-300"
        >
          다음
        </button>
      </div>
    </div>
  )
}
