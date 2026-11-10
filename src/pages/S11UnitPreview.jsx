import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import ConfirmModal from '../components/ConfirmModal'
import MaterialGroup from '../components/MaterialGroup'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { COMMUTE, ROUTES, UPLOAD } from '../lib/constants'
import { useAuthStore } from '../store/useAuthStore'
import { getRecentUnits, useMaterialStore } from '../store/useMaterialStore'
import { getSessionRoute, useSessionStore } from '../store/useSessionStore'

function groupByMaterial(units, materials) {
  const groups = []
  for (const unit of units) {
    let group = groups.find((g) => g.materialId === unit.materialId)
    if (!group) {
      const material = materials.find((m) => m.id === unit.materialId)
      group = {
        materialId: unit.materialId,
        fileName: material?.fileName ?? '',
        subjectName: unit.subjectName,
        units: [],
      }
      groups.push(group)
    }
    group.units.push(unit)
  }
  return groups
}

export default function S11UnitPreview() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const subjectId = params.get('subjectId')
  const newMaterialIds = location.state?.newMaterialIds ?? []

  const subjects = useMaterialStore((s) => s.subjects)
  const materials = useMaterialStore((s) => s.materials)
  const studyMin = useAuthStore((s) => s.commute?.studyMin ?? COMMUTE.DEFAULT)

  const units = getRecentUnits(materials, subjects)
  const newUnits = units.filter((unit) => newMaterialIds.includes(unit.materialId))
  const oldUnits = units.filter((unit) => !newMaterialIds.includes(unit.materialId))
  const newGroups = groupByMaterial(newUnits, materials)
  const oldGroups = groupByMaterial(oldUnits, materials)

  const [selectedIds, setSelectedIds] = useState([])
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [openIds, setOpenIds] = useState(() => {
    if (newMaterialIds.length > 0) {
      return newMaterialIds
    }
    if (oldGroups.length > 0) {
      return [oldGroups[0].materialId]
    }
    return []
  })

  const selectedUnits = units.filter((unit) => selectedIds.includes(unit.id))

  let title = '공부할 단원을 골라요'
  let description = `최근 자료 ${UPLOAD.MAX_VISIBLE}개에서 나온 단원이에요.`
  if (newUnits.length > 0) {
    title = `단원 ${newUnits.length}개로 나눴어요`
    description = '이전 자료 단원도 같이 고를 수 있어요.'
  }

  const toggleUnit = (unitId) => {
    if (selectedIds.includes(unitId)) {
      setSelectedIds(selectedIds.filter((id) => id !== unitId))
    } else {
      setSelectedIds([...selectedIds, unitId])
    }
  }

  const toggleOpen = (materialId) => {
    if (openIds.includes(materialId)) {
      setOpenIds(openIds.filter((id) => id !== materialId))
    } else {
      setOpenIds([...openIds, materialId])
    }
  }

  const toggleAll = (group) => {
    const groupIds = group.units.map((unit) => unit.id)
    const allSelected = groupIds.every((id) => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !groupIds.includes(id)))
    } else {
      const added = groupIds.filter((id) => !selectedIds.includes(id))
      setSelectedIds([...selectedIds, ...added])
    }
  }

  const startSession = () => {
    const first = selectedUnits[0]
    let sessionTitle = first.title
    if (selectedUnits.length > 1) {
      sessionTitle = `${first.title} 외 ${selectedUnits.length - 1}개`
    }

    const store = useSessionStore.getState()
    if (store.getResumable()) {
      store.endSession()
    }
    store.createSession({ unit: { ...first, title: sessionTitle }, studyMin })
    store.start()
    navigate(getSessionRoute(useSessionStore.getState().current))
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
          key={group.materialId}
          group={group}
          open={openIds.includes(group.materialId)}
          onToggleOpen={() => toggleOpen(group.materialId)}
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
