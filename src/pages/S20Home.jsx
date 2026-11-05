import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ResumeModal from '../components/ResumeModal'
import UnitCard from '../components/UnitCard'
import { MATERIAL_STATUS as M, ROUTES } from '../lib/constants'
import { isReviewOnly } from '../lib/time'
import { useAuthStore } from '../store/useAuthStore'
import { useMaterialStore } from '../store/useMaterialStore'
import { resumeMessage, useSessionStore } from '../store/useSessionStore'
import TopBar from '../components/TopBar'

export default function S20Home() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const commute = useAuthStore((s) => s.commute)
  const subjects = useMaterialStore((s) => s.subjects)
  const materials = useMaterialStore((s) => s.materials)
  const unitProgress = useSessionStore((s) => s.unitProgress)
  const endSession = useSessionStore((s) => s.endSession)
  const clearCurrent = useSessionStore((s) => s.clearCurrent)

  // 홈에 들어온 시점에 IN_PROGRESS 세션이 있으면 이어하기 팝업 노출
  const [resumable, setResumable] = useState(() => useSessionStore.getState().getResumable())

  const reviewOnly = commute ? isReviewOnly(commute.studyMin) : false

  const sections = subjects.map((subject) => {
    const subjectMaterials = materials.filter((m) => m.subjectId === subject.id)
    const units = subjectMaterials.filter((m) => m.status === M.READY).flatMap((m) => m.units)
    const pending = subjectMaterials.some((m) => m.status !== M.READY)
    return { subject, units, pending }
  })

  const handleStart = (unitId) => navigate(`${ROUTES.SETUP}?unit=${unitId}`)

  const handleResume = () => navigate(ROUTES.PLAYER)

  const handleDiscard = () => {
    endSession() // IN_PROGRESS -> ENDED
    clearCurrent()
    setResumable(null)
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-10">
      <header className="bg-white px-5 pb-6 pt-4">
        <TopBar />
        <p className="text-sm text-slate-500">
          {user?.nickname ?? user?.name ?? '학습자'}님, 안녕하세요
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">오늘은 어떤 단원을 풀까요?</h1>

        {commute && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
            <span className="text-sm text-slate-600">통학 학습 가능 시간</span>
            <span className="text-lg font-bold text-blue-600">{commute.studyMin}분</span>
          </div>
        )}

        {reviewOnly && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            학습 가능 시간이 20분 미만이라 <b>복습 퀴즈만 이용 가능</b>해요.
          </div>
        )}
      </header>

      <main className="space-y-6 px-5 pt-6">
        {sections.map(({ subject, units, pending }) => (
          <section key={subject.id}>
            <h2 className="mb-3 font-semibold text-slate-800">{subject.name}</h2>

            {units.length === 0 && (
              <p className="rounded-xl bg-white p-4 text-sm text-slate-400">
                {pending
                  ? '자료를 처리하고 있어요. 잠시만 기다려 주세요.'
                  : '등록된 단원이 없어요.'}
              </p>
            )}

            <div className="space-y-3">
              {units.map((unit) => {
                const progress = unitProgress[unit.id]
                return (
                  <UnitCard
                    key={unit.id}
                    unit={unit}
                    progress={progress}
                    disabled={reviewOnly && !progress}
                    onStart={() => handleStart(unit.id)}
                  />
                )
              })}
            </div>
          </section>
        ))}

        <button
          onClick={() => navigate(ROUTES.MATERIAL)}
          className="w-full rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 active:bg-slate-100"
        >
          + 과목, 자료 추가
        </button>
      </main>

      {resumable && (
        <ResumeModal
          message={resumeMessage(resumable)}
          onResume={handleResume}
          onDiscard={handleDiscard}
        />
      )}
    </div>
  )
}
