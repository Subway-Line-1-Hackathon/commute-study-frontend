import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  const focusSubjectId = useLocation().state?.focusSubjectId
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
    const pending = subjectMaterials.some((m) =>
      [M.UPLOADING, M.UPLOADED, M.PROCESSING].includes(m.status),
    )
    return { subject, units, pending }
  })
  const hasUnits = sections.some((s) => s.units.length > 0)
  const isFirst = materials.length === 0

  useEffect(() => {
    if (!focusSubjectId) return
    document
      .getElementById(`subject-${focusSubjectId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusSubjectId])

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
      <header className="bg-white px-5 pt-4 pb-6">
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
          <p className="mt-3 rounded-xl bg-warning-soft p-3 text-sm text-warning">
            학습 가능 시간이 20분 미만이라 <b>오답 복습만 할 수 있어요.</b>
            {openCount === 0 && ' 아직 복습할 문제가 없어요.'}
          </p>
        )}

        {isFirst ? (
          <button
            onClick={() => navigate(ROUTES.SUBJECT_NEW)}
            className="mt-4 flex w-full flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-primary/40 bg-background px-4 py-8 active:brightness-95"
          >
            <span className="text-lg font-bold text-primary">첫 자료 올리기</span>
            <span className="text-sm text-muted">
              강의 자료를 올리면 통학 시간에 맞춘 학습을 만들어 드려요
            </span>
          </button>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {reviewOnly ? (
              <button
                onClick={() => navigate(ROUTES.REVIEW)}
                disabled={openCount === 0}
                className="h-13 rounded-button bg-primary font-semibold text-white active:brightness-95 disabled:opacity-40"
              >
                오답 복습하기
              </button>
            ) : (
              <button
                onClick={() =>
                  document.getElementById('study-list')?.scrollIntoView({ behavior: 'smooth' })
                }
                disabled={!hasUnits}
                className="h-13 rounded-button bg-primary font-semibold text-white active:brightness-95 disabled:opacity-40"
              >
                학습하기
              </button>
            )}
            <button
              onClick={() => navigate(ROUTES.SUBJECT_NEW)}
              className="h-13 rounded-button border border-primary bg-surface font-semibold text-primary active:bg-background"
            >
              새 파일 업로드
            </button>
          </div>
        )}
      </header>

      <main id="study-list" className="scroll-mt-4 space-y-6 px-5 pt-6">
        {sections.map(({ subject, units, pending }) => (
          <section key={subject.id} id={`subject-${subject.id}`} className="scroll-mt-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">{subject.name}</h2>
              <button
                onClick={() => navigate(`${ROUTES.MATERIAL_UPLOAD}?subjectId=${subject.id}`)}
                className="text-sm font-medium text-primary"
              >
                + 자료
              </button>
            </div>

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
