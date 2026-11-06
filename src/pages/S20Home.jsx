import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'
import ResumeModal from '../components/ResumeModal'
import TopBar from '../components/TopBar'
import UnitCard from '../components/UnitCard'
import { MATERIAL_STATUS as M, ROUTES } from '../lib/constants'
import { getTimePlan } from '../lib/plan'
import { getOpenNotes } from '../lib/review'
import { isReviewOnly } from '../lib/time'
import { useAuthStore } from '../store/useAuthStore'
import { useMaterialStore } from '../store/useMaterialStore'
import { getSessionRoute, resumeMessage, useSessionStore } from '../store/useSessionStore'

const toMin = (sec) => Math.round(sec / 60)

export default function S20Home() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const commute = useAuthStore((s) => s.commute)
  const subjects = useMaterialStore((s) => s.subjects)
  const materials = useMaterialStore((s) => s.materials)
  const unitProgress = useSessionStore((s) => s.unitProgress)
  const openCount = useSessionStore((s) => getOpenNotes(s.wrongNotes).length)
  const endSession = useSessionStore((s) => s.endSession)
  const clearCurrent = useSessionStore((s) => s.clearCurrent)

  // 홈에 들어온 시점에 IN_PROGRESS 세션이 있으면 이어하기 팝업 노출
  const [resumable, setResumable] = useState(() => useSessionStore.getState().getResumable())
  const [departUnit, setDepartUnit] = useState(null)

  const studyMin = commute?.studyMin ?? 20
  const reviewOnly = isReviewOnly(studyMin)
  const plan = getTimePlan(studyMin)

  const departMessage =
    plan.conceptSec > 0
      ? `개념 듣기 ${toMin(plan.conceptSec)}분 + 문제 풀이 ${toMin(plan.quizSec)}분, 총 ${studyMin}분이에요. 이어폰을 준비하고 출발해요.`
      : `학습 가능 시간이 짧아서 문제 풀이 ${toMin(plan.quizSec)}분으로 진행해요.`

  const sections = subjects.map((subject) => {
    const subjectMaterials = materials.filter((m) => m.subjectId === subject.id)
    const units = subjectMaterials.filter((m) => m.status === M.READY).flatMap((m) => m.units)
    const pending = subjectMaterials.some((m) => m.status !== M.READY)
    return { subject, units, pending }
  })

  const handleResume = () => navigate(getSessionRoute(resumable))

  const handleDiscard = () => {
    endSession() // IN_PROGRESS -> ENDED
    clearCurrent()
    setResumable(null)
  }

  // 출발: 세션을 만들고 시작한 뒤, 단계에 맞는 화면으로 이동
  const handleDepart = () => {
    const store = useSessionStore.getState()
    if (store.getResumable()) store.endSession()
    store.createSession({ unit: departUnit, studyMin })
    useSessionStore.getState().start()
    navigate(getSessionRoute(useSessionStore.getState().current))
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-10">
      <header className="bg-white px-5 pb-6 pt-4">
        <TopBar showSettings />
        <p className="mt-2 text-sm text-slate-500">{user?.nickname ?? '학습자'}님, 안녕하세요</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">오늘은 어떤 자료로 공부할까요?</h1>

        {commute && (
          <button
            onClick={() => navigate(ROUTES.SETTINGS)}
            className="mt-4 flex w-full items-center justify-between rounded-xl bg-blue-50 px-4 py-3 text-left active:bg-blue-100"
          >
            <span className="text-sm text-slate-600">통학 학습 가능 시간</span>
            <span className="text-lg font-bold text-blue-600">
              {commute.studyMin}분{' '}
              <span className="text-xs font-normal text-slate-400">수정 ›</span>
            </span>
          </button>
        )}

        {reviewOnly && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            학습 가능 시간이 20분 미만이라 <b>복습 퀴즈만 이용 가능</b>해요.
            {openCount > 0 && (
              <button
                onClick={() => navigate(ROUTES.REVIEW)}
                className="mt-2 w-full rounded-lg bg-amber-500 py-2 font-semibold text-white active:bg-amber-600"
              >
                오답 복습 시작 ({openCount}문제)
              </button>
            )}
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
                  : '등록된 자료가 없어요.'}
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
                    onStart={() => setDepartUnit(unit)}
                  />
                )
              })}
            </div>
          </section>
        ))}

        <button
          onClick={() => navigate(ROUTES.WRONG_NOTES)}
          className="flex w-full items-center justify-between rounded-xl bg-white p-4 text-left shadow-sm active:bg-slate-50"
        >
          <div>
            <p className="font-semibold text-slate-800">오답노트</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {openCount > 0 ? `미해결 ${openCount}문제` : '틀린 문제가 아직 없어요'}
            </p>
          </div>
          <span className="text-slate-400">›</span>
        </button>

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

      {departUnit && (
        <ConfirmModal
          title={`${departUnit.title} 출발할까요?`}
          message={departMessage}
          confirmLabel="출발"
          cancelLabel="취소"
          onConfirm={handleDepart}
          onCancel={() => setDepartUnit(null)}
        />
      )}
    </div>
  )
}
