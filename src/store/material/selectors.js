import { MATERIAL_STATUS as M, UPLOAD } from '../../lib/constants'
// ---- 스토어 상태를 받아 화면용 데이터를 만드는 함수들 (selector) ----

// 최근 올린 자료부터 최대 MAX_VISIBLE개
export function getRecentMaterials(materials) {
  const newestFirst = [...materials].sort((a, b) => b.createdAt - a.createdAt)
  return newestFirst.slice(0, UPLOAD.MAX_VISIBLE)
}
export function getSubjectUnits({ categories }, subjectId) {
  return categories[subjectId] ?? []
}

// 단원 선택 화면의 묶음. 서버 단원은 자료 구분이 없어서 과목별로 묶는다
// -> [{ key, title, subjectName, units, isNew }]
function hasServerMaterialInfo({ categories, serverMaterials = [] }) {
  if (serverMaterials.length === 0) return false
  return Object.values(categories)
    .flat()
    .some((u) => u.materialId != null)
}
export function isGroupedByMaterial(state) {
  return hasServerMaterialInfo(state)
}
function getServerMaterialGroups(
  { materials, categories, subjects, serverMaterials },
  newMaterialIds,
) {
  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? ''
  const allUnits = Object.values(categories).flat()
  const newServerIds = materials
    .filter((m) => newMaterialIds.includes(m.id))
    .map((m) => String(m.serverId))
  return getRecentMaterials(serverMaterials)
    .filter((m) => m.status === M.READY)
    .map((m) => ({
      key: m.id,
      title: m.fileName,
      subjectName: subjectName(m.subjectId),
      units: allUnits.filter((u) => u.materialId === m.id),
      isNew: newServerIds.includes(m.id),
    }))
    .filter((g) => g.units.length > 0)
}
export function getUnitGroups(
  { materials, categories, subjects, serverMaterials = [] },
  newMaterialIds = [],
) {
  if (
    hasServerMaterialInfo({
      categories,
      serverMaterials,
    })
  ) {
    return getServerMaterialGroups(
      {
        materials,
        categories,
        subjects,
        serverMaterials,
      },
      newMaterialIds,
    )
  }
  const newSubjectIds = materials
    .filter((m) => newMaterialIds.includes(m.id))
    .map((m) => m.subjectId)
  return subjects
    .map((s) => ({
      key: s.id,
      title: s.name,
      subjectName: '',
      units: categories[s.id] ?? [],
      isNew: newSubjectIds.includes(s.id),
    }))
    .filter((g) => g.units.length > 0)
}
