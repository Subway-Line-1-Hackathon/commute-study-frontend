import { useEffect, useState } from 'react'
import {
  COMMUTE,
  isUnitPreparing,
  MATERIAL_STATUS as M,
  SESSION_STATUS as S,
} from '../lib/constants'
import { getDDay } from '../lib/date'
import { getOpenNotes } from '../lib/review'
import { supabase } from '../lib/supabase'
import { isReviewOnly } from '../lib/time'
import { useAuthStore } from '../store/useAuthStore'
import { getUnitGroups, useMaterialStore } from '../store/useMaterialStore'
import { useSessionStore } from '../store/useSessionStore'

const PENDING = [M.UPLOADING, M.UPLOADED, M.PROCESSING]
const ONE_DAY = 24 * 60 * 60 * 1000

function findSubject(session, materials, subjects) {
  if (!session) return null

  if (session.subjectId) {
    return subjects.find((s) => s.id === session.subjectId) ?? null
  }

  const material = materials.find((m) => m.units.some((unit) => unit.id === session.unitId))
  if (!material) return null

  return subjects.find((s) => s.id === material.subjectId) ?? null
}

function getResult(session) {
  if (!session) return null

  const scored = session.answers.filter((a) => a.correct != null)
  const correct = scored.filter((a) => a.correct).length

  let accuracy = null
  if (scored.length > 0) {
    accuracy = Math.round((correct / scored.length) * 100)
  }

  return { answered: session.answers.length, scored: scored.length, correct, accuracy }
}

function findNextUnit(session, groups) {
  if (!session) return null

  for (const group of groups) {
    const index = group.units.findIndex((unit) => unit.id === session.unitId)
    if (index === -1) continue

    for (let i = index + 1; i < group.units.length; i++) {
      const unit = group.units[i]
      if (!isUnitPreparing(unit)) return { ...unit, number: i + 1 }
    }
    return null
  }

  return null
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
  const serverMaterials = useMaterialStore((s) => s.serverMaterials)
  const current = useSessionStore((s) => s.current)
  const history = useSessionStore((s) => s.history)
  const wrongNotes = useSessionStore((s) => s.wrongNotes)

  const [openedAt] = useState(() => Date.now())

  useEffect(() => {
    useMaterialStore.getState().resumePending()
    syncWithServer()
  }, [])

  let resumable = null
  if (current?.status === S.IN_PROGRESS) {
    resumable = current
  }

  const last = resumable ?? history[0] ?? null
  const lastSubject = findSubject(last, materials, subjects)
  const groups = getUnitGroups({ materials, categories, subjects, serverMaterials })
  const openWrongCount = getOpenNotes(wrongNotes).length
  const pendingMaterials = materials.filter((m) => PENDING.includes(m.status))
  const preparingUnits = groups.flatMap((g) => g.units).filter(isUnitPreparing)
  const waiting = pendingMaterials.length > 0 || preparingUnits.length > 0

  useEffect(() => {
    if (!waiting) return
    const id = setInterval(() => {
      useMaterialStore
        .getState()
        .syncCategories()
        .catch(() => {})
    }, 5000)
    return () => clearInterval(id)
  }, [waiting])

  return {
    nickname: user?.nickname ?? '학습자',
    commute,
    reviewOnly: isReviewOnly(commute?.studyMin ?? COMMUTE.DEFAULT),
    isFirst: materials.length === 0 && groups.length === 0,
    pendingMaterials,
    failedMaterials: materials.filter(
      (m) => m.status === M.FAILED && openedAt - m.createdAt < ONE_DAY,
    ),
    preparingUnits,
    hasUnits: groups.some((g) => g.units.length > 0),
    resumable,
    last,
    lastSubjectName: lastSubject?.name ?? '',
    lastDDay: getDDay(lastSubject?.examDate),
    lastResult: getResult(last),
    nextUnit: findNextUnit(last, groups),
    openWrongCount,
  }
}
