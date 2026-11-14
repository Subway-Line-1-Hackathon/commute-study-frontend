import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import ConfirmModal from '../components/ConfirmModal'
import MaterialGroup from '../components/MaterialGroup'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { useReviewOnly } from '../hooks/useReviewOnly'
import { COMMUTE, isUnitPreparing, ROUTES, UPLOAD } from '../lib/constants'
import { getUnitGroups, isGroupedByMaterial, useMaterialStore } from '../store/useMaterialStore'
import { useSessionStore } from '../store/useSessionStore'
import { ApiError, errorMessage } from '../lib/api'

// S11 단원 선택: 분석으로 나뉜 단원 중 공부할 단원을 골라 문제 설정 화면(S30)으로 넘어간다
// 단원은 자료(Mock) 또는 과목(서버) 단위 묶음으로 접었다 폈다 할 수 있다
export default function S11UnitPreview() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const subjectId = params.get('subjectId')
  const newMaterialIds = location.state?.newMaterialIds ?? [] // S10에서 방금 올린 자료 id

  const subjects = useMaterialStore((s) => s.subjects)
  const materials = useMaterialStore((s) => s.materials)
  const categories = useMaterialStore((s) => s.categories)
  const serverMaterials = useMaterialStore((s) => s.serverMaterials)
  const reviewOnly = useReviewOnly()

  const groups = getUnitGroups({ materials, categories, subjects, serverMaterials }, newMaterialIds)
  const byMaterial = isGroupedByMaterial({ categories, serverMaterials })
  const units = groups.flatMap((g) => g.units)
  const newGroups = groups.filter((g) => g.isNew)
  const oldGroups = groups.filter((g) => !g.isNew)
  const newUnits = newGroups.flatMap((g) => g.units)

  const [selectedIds, setSelectedIds] = useState([]) // 체크한 단원 id
  const [confirmRestart, setConfirmRestart] = useState(false) // "새로 시작할까요?" 팝업 표시
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  // 펼쳐진 묶음 key. 처음에는 방금 올린 자료 묶음, 없으면 첫 묶음만 펼친다
  const [openIds, setOpenIds] = useState(() => {
    const readyMaterialId = location.state?.readyMaterialId
    if (readyMaterialId && groups.some((group) => group.key === readyMaterialId)) {
      return [readyMaterialId]
    }
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
  let description = byMaterial
    ? `최근 자료 ${UPLOAD.MAX_VISIBLE}개에서 나온 단원이에요.`
    : '과목별로 나눈 단원이에요.'
  if (newUnits.length > 0 && byMaterial) {
    title = `단원 ${newUnits.length}개로 나눴어요`
    description = '이전 자료 단원도 같이 고를 수 있어요.'
  }

  // 단원 하나 체크/해제 (문제 준비 중인 단원은 무시)
  const toggleUnit = (unitId) => {
    if (isUnitPreparing(units.find((u) => u.id === unitId))) return
    if (selectedIds.includes(unitId)) {
      setSelectedIds(selectedIds.filter((id) => id !== unitId))
    } else {
      setSelectedIds([...selectedIds, unitId])
    }
  }

  // 묶음 접기/펼치기
  const toggleOpen = (key) => {
    if (openIds.includes(key)) {
      setOpenIds(openIds.filter((id) => id !== key))
    } else {
      setOpenIds([...openIds, key])
    }
  }

  // 묶음 전체 선택/해제: 이미 다 골랐으면 전부 해제, 아니면 빠진 것만 추가
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
      sessionTitle = `${first.title} 외 ${selectedUnits.length - 1}개 단원`
    }
    // 세션 초안. S30에서 유형·난이도를 더해 createSession에 넘긴다
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

  // '문제 생성하기': 하던 학습이 있으면 먼저 확인 팝업을 띄운다
  const handleCreate = () => {
    if (selectedUnits.length === 0) return

    const hasUnfinished = useSessionStore.getState().getResumable()
    if (hasUnfinished) {
      setConfirmRestart(true)
      return
    }

    startSession()
  }

  // '다른 자료 올리기': 과목이 정해져 있으면 그 과목 업로드로, 아니면 과목 등록부터
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
          onRemove={byMaterial && !deleting ? () => setDeleteTarget(group) : undefined}
        />
      ))}
    </ul>
  )

  const bottomCta = (
    <>
      {reviewOnly && (
        <p className="mb-2 text-center text-caption text-muted">
          통학 시간이 {COMMUTE.REVIEW_ONLY_MAX}분이라 오답 복습만 할 수 있어요.
        </p>
      )}
      <Button onClick={handleCreate} disabled={reviewOnly || selectedUnits.length === 0}>
        문제 생성하기
      </Button>
      {!reviewOnly && (
        <Button variant="secondary" onClick={handleUploadMore} className="mt-3">
          다른 자료 올리기
        </Button>
      )}
    </>
  )

  return (
    <Screen back bottomCta={bottomCta}>
      <ScreenTitle title={title} description={description} />
      {deleteError && <p className="mt-3 text-caption text-danger">{deleteError}</p>}

      {preparingCount > 0 && (
        <p className="mt-4 flex items-center gap-2 rounded-card bg-warning-soft px-4 py-3 text-caption text-warning">
          <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-warning/30 border-t-warning" />
          단원 {preparingCount}개의 문제를 만들고 있어요. 끝나면 자동으로 고를 수 있게 돼요.
        </p>
      )}

      {units.length === 0 && (
        <p className="mt-6 rounded-card bg-surface p-4 text-caption text-muted">
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

      {deleteTarget && (
        <ConfirmModal
          title={`'${deleteTarget.title}' 자료를 지울까요?`}
          message="자료와 단원이 목록에서 사라져요. 지금까지 푼 기록은 남아요."
          confirmLabel="지우기"
          onConfirm={async () => {
            if (deleting) return
            setDeleting(true)
            setDeleteError('')
            try {
              await useMaterialStore.getState().removeMaterial(deleteTarget.key)
              const removed = new Set(deleteTarget.units.map((u) => u.id))
              setSelectedIds((ids) => ids.filter((id) => !removed.has(id)))
            } catch (err) {
              setDeleteError(
                err instanceof ApiError && err.status === 409
                  ? '분석 중인 자료는 지울 수 없어요.'
                  : errorMessage(err, '자료를 지우지 못했어요. 잠시 후 다시 시도해 주세요.'),
              )
            } finally {
              setDeleting(false)
              setDeleteTarget(null)
            }
          }}
          onCancel={() => setDeleteTarget(null)}
        />
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
