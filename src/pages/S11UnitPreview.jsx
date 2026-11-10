import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import ConfirmModal from '../components/ConfirmModal'
import MaterialGroup from '../components/MaterialGroup'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { isUnitPreparing, ROUTES, UPLOAD } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { getUnitGroups, useMaterialStore } from '../store/useMaterialStore'
import { useSessionStore } from '../store/useSessionStore'

export default function S11UnitPreview() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const subjectId = params.get('subjectId')
  const newMaterialIds = location.state?.newMaterialIds ?? []

  const subjects = useMaterialStore((s) => s.subjects)
  const materials = useMaterialStore((s) => s.materials)
  const categories = useMaterialStore((s) => s.categories)

  const groups = getUnitGroups({ materials, categories, subjects }, newMaterialIds)
  const units = groups.flatMap((g) => g.units)
  const newGroups = groups.filter((g) => g.isNew)
  const oldGroups = groups.filter((g) => !g.isNew)
  const newUnits = newGroups.flatMap((g) => g.units)

  const [selectedIds, setSelectedIds] = useState([])
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [openIds, setOpenIds] = useState(() => {
    if (newGroups.length > 0) {
      return newGroups.map((g) => g.key)
    }
    if (oldGroups.length > 0) {
      return [oldGroups[0].key]
    }
    return []
  })

  // 서버 단원은 분석이 끝난 뒤에 생기니 들어올 때 다시 받는다
  useEffect(() => {
    useMaterialStore
      .getState()
      .syncCategories()
      .catch(() => {})
  }, [])

  // 문제를 만드는 중인 단원이 있으면 끝날 때까지 5초마다 다시 확인한다
  const preparingCount = units.filter(isUnitPreparing).length
  useEffect(() => {
    if (preparingCount === 0) return
    const id = setInterval(() => {
      useMaterialStore
        .getState()
        .syncCategories()
        .catch(() => {})
    }, 5000)
    return () => clearInterval(id)
  }, [preparingCount])

  const selectedUnits = units.filter(
    (unit) => selectedIds.includes(unit.id) && !isUnitPreparing(unit),
  )

  let title = '공부할 단원을 골라요'
  let description = supabase
    ? '과목별로 나눈 단원이에요.'
    : `최근 자료 ${UPLOAD.MAX_VISIBLE}개에서 나온 단원이에요.`
  if (newUnits.length > 0 && !supabase) {
    title = `단원 ${newUnits.length}개로 나눴어요`
    description = '이전 자료 단원도 같이 고를 수 있어요.'
  }

  const toggleUnit = (unitId) => {
    if (isUnitPreparing(units.find((u) => u.id === unitId))) return
    if (selectedIds.includes(unitId)) {
      setSelectedIds(selectedIds.filter((id) => id !== unitId))
    } else {
      setSelectedIds([...selectedIds, unitId])
    }
  }

  const toggleOpen = (key) => {
    if (openIds.includes(key)) {
      setOpenIds(openIds.filter((id) => id !== key))
    } else {
      setOpenIds([...openIds, key])
    }
  }

  const toggleAll = (group) => {
    const groupIds = group.units.filter((unit) => !isUnitPreparing(unit)).map((unit) => unit.id)
    const allSelected = groupIds.every((id) => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !groupIds.includes(id)))
    } else {
      const added = groupIds.filter((id) => !selectedIds.includes(id))
      setSelectedIds([...selectedIds, ...added])
    }
  }

  // 문제 설정 화면으로. 세션은 거기서 유형·난이도를 고른 뒤 만든다
  const startSession = () => {
    const first = selectedUnits[0]
    let sessionTitle = first.title
    if (selectedUnits.length > 1) {
      sessionTitle = `${first.title} 외 ${selectedUnits.length - 1}개`
    }
    const draft = {
      source: 'categories',
      categoryIds: selectedUnits.map((u) => u.categoryId).filter((id) => id != null),
      unitId: first.id,
      unitTitle: sessionTitle,
      subjectId: first.subjectId,
    }
    setConfirmRestart(false)
    navigate(ROUTES.SETUP, { state: { draft } })
  }

  const handleCreate = () => {
    if (selectedUnits.length === 0) return

    const hasUnfinished = useSessionStore.getState().getResumable()
    if (hasUnfinished) {
      setConfirmRestart(true)
      return
    }

    startSession()
  }

  const handleUploadMore = () => {
    if (subjectId) {
      navigate(`${ROUTES.MATERIAL_UPLOAD}?subjectId=${subjectId}`)
    } else {
      navigate(ROUTES.SUBJECT_NEW)
    }
  }

  const renderGroups = (groups) => (
    <ul className="space-y-3">
      {groups.map((group) => (
        <MaterialGroup
          key={group.key}
          group={group}
          open={openIds.includes(group.key)}
          onToggleOpen={() => toggleOpen(group.key)}
          selectedIds={selectedIds}
          onToggleUnit={toggleUnit}
          onToggleAll={() => toggleAll(group)}
        />
      ))}
    </ul>
  )

  const bottomCta = (
    <>
      <Button onClick={handleCreate} disabled={selectedUnits.length === 0}>
        문제 생성하기
      </Button>
      <Button variant="secondary" onClick={handleUploadMore} className="mt-3">
        다른 자료 올리기
      </Button>
    </>
  )

  return (
    <Screen back bottomCta={bottomCta}>
      <ScreenTitle title={title} description={description} />

      {preparingCount > 0 && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-warning-soft px-4 py-3 text-caption text-warning">
          <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-warning/30 border-t-warning" />
          단원 {preparingCount}개의 문제를 만들고 있어요. 끝나면 자동으로 고를 수 있게 돼요.
        </p>
      )}

      {units.length === 0 && (
        <p className="mt-6 rounded-xl bg-surface p-4 text-caption text-muted">
          아직 준비된 단원이 없어요.
        </p>
      )}

      {newGroups.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-caption font-bold text-muted">방금 올린 자료</h2>
          {renderGroups(newGroups)}
        </section>
      )}

      {oldGroups.length > 0 && (
        <section className="mt-6">
          {newGroups.length > 0 && (
            <h2 className="mb-3 text-caption font-bold text-muted">이전 자료</h2>
          )}
          {renderGroups(oldGroups)}
        </section>
      )}

      {confirmRestart && (
        <ConfirmModal
          title="새로 시작할까요?"
          message="하던 학습은 이어서 할 수 없어요. 새로 시작할까요?"
          confirmLabel="새로 시작"
          cancelLabel="취소"
          onConfirm={startSession}
          onCancel={() => setConfirmRestart(false)}
        />
      )}
    </Screen>
  )
}
