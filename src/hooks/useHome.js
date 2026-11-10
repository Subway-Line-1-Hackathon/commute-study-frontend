import { useEffect } from 'react'
import { MATERIAL_STATUS as M, SESSION_STATUS as S } from '../lib/constants'
import { getDDay } from '../lib/date'
import { getOpenNotes } from '../lib/review'
import { supabase } from '../lib/supabase'
import { isReviewOnly } from '../lib/time'
import { useAuthStore } from '../store/useAuthStore'
import { getUnitGroups, useMaterialStore } from '../store/useMaterialStore'
import { useSessionStore } from '../store/useSessionStore'

const PENDING = [M.UPLOADING, M.UPLOADED, M.PROCESSING]

function findSubject(session, materials, subjects) {
  if (!session) return null

  if (session.subjectId) {
    return subjects.find((s) => s.id === session.subjectId) ?? null
  }

  const material = materials.find((m) => m.units.some((unit) => unit.id === session.unitId))
  if (!material) return null

  return subjects.find((s) => s.id === material.subjectId) ?? null
}

function syncWithServer() {
  if (!supabase) return

  const session = useSessionStore.getState()
  session.flushAttempts()
  useMaterialStore
    .getState()
    .syncCategories()
    .then(() => session.syncWrongNotes())
    .catch(() => {})
  session.syncCurrent().catch(() => {})
}

export function useHome() {
  const user = useAuthStore((s) => s.user)
  const commute = useAuthStore((s) => s.commute)
  const subjects = useMaterialStore((s) => s.subjects)
  const materials = useMaterialStore((s) => s.materials)
  const categories = useMaterialStore((s) => s.categories)
  const current = useSessionStore((s) => s.current)
  const history = useSessionStore((s) => s.history)
  const wrongNotes = useSessionStore((s) => s.wrongNotes)

  useEffect(() => {
    syncWithServer()
  }, [])

  let resumable = null
  if (current?.status === S.IN_PROGRESS) {
    resumable = current
  }

  const last = resumable ?? history[0] ?? null
  const lastSubject = findSubject(last, materials, subjects)
  const groups = getUnitGroups({ materials, categories, subjects })

  return {
    nickname: user?.nickname ?? '학습자',
    commute,
    reviewOnly: isReviewOnly(commute?.studyMin ?? 0),
    isFirst: materials.length === 0 && groups.length === 0,
    isProcessing: materials.some((m) => PENDING.includes(m.status)),
    hasUnits: groups.some((g) => g.units.length > 0),
    resumable,
    last,
    lastSubjectName: lastSubject?.name ?? '',
    lastDDay: getDDay(lastSubject?.examDate),
    openWrongCount: getOpenNotes(wrongNotes).length,
  }
}
