import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import ConfirmModal from '../components/ConfirmModal'
import UnitItem from '../components/UnitItem'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { COMMUTE, MATERIAL_STATUS as M, ROUTES } from '../lib/constants'
import { useAuthStore } from '../store/useAuthStore'
import { useMaterialStore } from '../store/useMaterialStore'
import { getSessionRoute, useSessionStore } from '../store/useSessionStore'

export default function S11UnitPreview() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const subjectId = params.get('subjectId')

  const subject = useMaterialStore((s) => s.subjects.find((item) => item.id === subjectId))
  const materials = useMaterialStore((s) => s.materials)
  const studyMin = useAuthStore((s) => s.commute?.studyMin ?? COMMUTE.DEFAULT)

  const [selectedIds, setSelectedIds] = useState([])
  const [confirmRestart, setConfirmRestart] = useState(false)

  if (!subject) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  const readyMaterials = materials.filter((m) => m.subjectId === subjectId && m.status === M.READY)
  const units = readyMaterials.flatMap((m) => m.units)
  const selectedUnits = units.filter((unit) => selectedIds.includes(unit.id))

  const toggleUnit = (unitId) => {
    if (selectedIds.includes(unitId)) {
      setSelectedIds(selectedIds.filter((id) => id !== unitId))
    } else {
      setSelectedIds([...selectedIds, unitId])
    }
  }

  const startSession = () => {
    const first = selectedUnits[0]
    let title = first.title
    if (selectedUnits.length > 1) {
      title = `${first.title} 외 ${selectedUnits.length - 1}개`
    }

    const store = useSessionStore.getState()
    if (store.getResumable()) {
      store.endSession()
    }
    store.createSession({ unit: { ...first, title }, studyMin })
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

  const bottomCta = (
    <>
      <Button onClick={handleCreate} disabled={selectedUnits.length === 0}>
        문제 생성하기
      </Button>
      <Button
        variant="secondary"
        onClick={() => navigate(`${ROUTES.MATERIAL_UPLOAD}?subjectId=${subjectId}`)}
        className="mt-3"
      >
        다른 자료 올리기
      </Button>
    </>
  )

  return (
    <Screen back bottomCta={bottomCta}>
      <ScreenTitle title={`단원 ${units.length}개로 나눴어요`} />

      <span className="mt-3 self-start rounded-full bg-success-soft px-2.5 py-1 text-label text-success">
        READY
      </span>

      <ul className="mt-6 space-y-3">
        {units.map((unit, index) => (
          <UnitItem
            key={unit.id}
            number={index + 1}
            unit={unit}
            checkable
            checked={selectedIds.includes(unit.id)}
            onToggle={() => toggleUnit(unit.id)}
          />
        ))}
      </ul>

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
