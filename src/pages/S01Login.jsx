import { useNavigate } from 'react-router-dom'
import { getEntryRoute } from '../lib/entryRoute'
import { useAuthStore } from '../store/useAuthStore'
import { useMaterialStore } from '../store/useMaterialStore'

export default function S01Login() {
  const navigate = useNavigate()

  const handleGoogleLogin = () => {
    useAuthStore.getState().loginWithGoogle()
    const auth = useAuthStore.getState()
    const { materials, subjects } = useMaterialStore.getState()
    navigate(getEntryRoute({ auth, materials, subjects }), { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between bg-white px-6 py-12">
      <div className="mt-24 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 text-3xl text-white">
          🚌
        </div>
        <h1 className="text-2xl font-bold text-slate-900">통학 학습</h1>
        <p className="mt-3 text-slate-500">
          오가는 시간을 공부 시간으로.
          <br />내 자료로 만든 퀴즈를 통학길에 풀어요.
        </p>
      </div>

      <div>
        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white py-3.5 font-medium text-slate-700 shadow-sm active:bg-slate-50"
        >
          <span className="text-lg font-bold text-blue-600">G</span>
          Google로 시작하기
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">
          개발용 Mock 로그인입니다. 클릭하면 바로 로그인돼요.
        </p>
      </div>
    </div>
  )
}
