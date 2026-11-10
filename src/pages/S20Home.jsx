import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ResumeModal from '../components/ResumeModal'
import TopBar from '../components/TopBar'
import UnitCard from '../components/UnitCard'
import { MATERIAL_STATUS as M, ROUTES } from '../lib/constants'
import { getOpenNotes } from '../lib/review'
import { supabase } from '../lib/supabase'
import { isReviewOnly } from '../lib/time'
import { useAuthStore } from '../store/useAuthStore'
import { getSubjectUnits, useMaterialStore } from '../store/useMaterialStore'
import { getSessionRoute, resumeMessage, useSessionStore } from '../store/useSessionStore'

// 단원 진도 표시. 서버는 진도(0~1)·정답률을 주고, Mock은 마지막 결과를 쓴다
function unitProgressOf(unit, unitProgress) {
  if (supabase) {
    if (!unit.progress && unit.accuracy == null) return null
    const percent = Math.round((unit.progress ?? 0) * 100)
    const label = unit.accuracy != null ? `정답률 ${Math.round(unit.accuracy * 100)}%` : '진행 중'
    return { percent, label }
  }
  const p = unitProgress[unit.id]
  if (!p) return null
  return {
    percent: Math.round((p.solved / p.total) * 100),
    label: `최근 결과 ${p.solved}/${p.total} 정답`,
  }
}

// S20 홈: 통학 시간, 과목별 단원 목록(진도), 오답노트 바로가기
// 하던 학습이 있으면 "이어서 할까요?" 팝업을 띄운다
// 20분 미만이면 새 단원 학습은 막고 오답 복습만 할 수 있다
export default function S20Home() {
  const navigate = useNavigate()
  // 다른 화면에서 특정 과목으로 스크롤해 달라고 넘겨준 과목 id
  const focusSubjectId = useLocation().state?.focusSubjectId
  const user = useAuthStore((s) => s.user)
  const commute = useAuthStore((s) => s.commute)
  const subjects = useMaterialStore((s) => s.subjects)
  const materials = useMaterialStore((s) => s.materials)
  const categories = useMaterialStore((s) => s.categories)
  const unitProgress = useSessionStore((s) => s.unitProgress)
  const openCount = useSessionStore((s) => getOpenNotes(s.wrongNotes).length)
  const endSession = useSessionStore((s) => s.endSession)
  const clearCurrent = useSessionStore((s) => s.clearCurrent)

  // 홈에 들어온 시점에 IN_PROGRESS 세션이 있으면 이어하기 팝업 노출
  const [resumable, setResumable] = useState(() => useSessionStore.getState().getResumable())

  const studyMin = commute?.studyMin ?? 20
  const reviewOnly = isReviewOnly(studyMin)

  // 서버의 단원 진도·오답노트·진행 중 세션을 맞추고, 못 보낸 답안을 보낸다
  useEffect(() => {
    if (!supabase) return
    const session = useSessionStore.getState()
    session.flushAttempts()
    useMaterialStore
      .getState()
      .syncCategories()
      .then(() => session.syncWrongNotes())
      .catch(() => {})
    session
      .syncCurrent()
      .then(() => setResumable(useSessionStore.getState().getResumable()))
      .catch(() => {})
  }, [])

  // 과목별 섹션 데이터: 단원 목록 + 아직 처리 중인 자료가 있는지
  const sections = subjects.map((subject) => {
    const subjectMaterials = materials.filter((m) => m.subjectId === subject.id)
    const units = getSubjectUnits({ materials, categories }, subject.id)
    const pending = subjectMaterials.some((m) =>
      [M.UPLOADING, M.UPLOADED, M.PROCESSING].includes(m.status),
    )
    return { subject, units, pending }
  })
  const hasUnits = sections.some((s) => s.units.length > 0)
  const isFirst = materials.length === 0 && !hasUnits // 처음 온 사용자 -> '첫 자료 올리기' 버튼

  // focusSubjectId가 있으면 그 과목 섹션으로 부드럽게 스크롤
  useEffect(() => {
    if (!focusSubjectId) return
    document
      .getElementById(`subject-${focusSubjectId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusSubjectId])

  // 이어하기: 세션 단계(듣기/풀이)에 맞는 화면으로
  const handleResume = () => navigate(getSessionRoute(resumable))

  // 그만하기: 세션을 끝내고 팝업을 닫는다
  const handleDiscard = () => {
    endSession('QUIT') // IN_PROGRESS -> ENDED
    clearCurrent()
    setResumable(null)
  }

  // 출발 준비: 문제 설정 화면에서 유형·난이도를 고르고 세션을 만든다
  const handleDepart = (unit) => {
    const draft = {
      source: 'categories',
      categoryIds: unit.categoryId != null ? [unit.categoryId] : [],
      unitId: unit.id,
      unitTitle: unit.title,
      subjectId: unit.subjectId,
    }
    navigate(ROUTES.SETUP, { state: { draft } })
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
                const progress = unitProgressOf(unit, unitProgress)
                return (
                  <UnitCard
                    key={unit.id}
                    unit={unit}
                    progress={progress}
                    // 막는 경우: 복습만 가능한데 한 번도 안 푼 단원 / 문제 준비 중인 단원
                    disabled={(reviewOnly && !progress) || unit.questionStatus === 'PREPARING'}
                    onStart={() => handleDepart(unit)}
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
    </div>
  )
}
