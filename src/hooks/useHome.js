import { MATERIAL_STATUS as M, SESSION_STATUS as S, WRONG_STATUS } from '../lib/constants'
import { getDDay } from '../lib/date'
import { isReviewOnly } from '../lib/time'
import { useAuthStore } from '../store/useAuthStore'
import { getRecentUnits, useMaterialStore } from '../store/useMaterialStore'
import { useSessionStore } from '../store/useSessionStore'

const PENDING = [M.UPLOADING, M.UPLOADED, M.PROCESSING]

function findSubjectOfUnit(unitId, materials, subjects) {
  if (!unitId) return null

  const material = materials.find((m) => m.units.some((unit) => unit.id === unitId))
  if (!material) return null

  return subjects.find((s) => s.id === material.subjectId) ?? null
}

export function useHome() {
  const user = useAuthStore((s) => s.user)
  const commute = useAuthStore((s) => s.commute)
  const subjects = useMaterialStore((s) => s.subjects)
  const materials = useMaterialStore((s) => s.materials)
  const current = useSessionStore((s) => s.current)
  const history = useSessionStore((s) => s.history)
  const wrongNotes = useSessionStore((s) => s.wrongNotes)

  let resumable = null
  if (current?.status === S.IN_PROGRESS) {
    resumable = current
  }

  const last = resumable ?? history[0] ?? null
  const lastSubject = findSubjectOfUnit(last?.unitId, materials, subjects)

  return {
    nickname: user?.nickname ?? '학습자',
    commute,
    reviewOnly: isReviewOnly(commute?.studyMin ?? 0),
    isFirst: materials.length === 0,
    isProcessing: materials.some((m) => PENDING.includes(m.status)),
    hasUnits: getRecentUnits(materials, subjects).length > 0,
    resumable,
    last,
    lastSubjectName: lastSubject?.name ?? '',
    lastDDay: getDDay(lastSubject?.examDate),
    openWrongCount: wrongNotes.filter((n) => n.status === WRONG_STATUS.OPEN).length,
  }
}
