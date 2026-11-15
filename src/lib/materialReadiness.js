// 업로드 직후 서버 자료 목록과 단원 응답은 서로 다른 시점에 도착한다.
// 완료 안내는 최근 자료 목록 대신 이 기기에서 시작한 업로드를 기준으로 판단한다.
export function getUploadReadiness({
  materials,
  categories,
  subjects,
  dismissedReadyIds = [],
  categoryQueries = {},
}) {
  const readyMaterials = []
  const waitingMaterials = []
  const checkingMaterials = []
  for (const material of materials) {
    if (!material.notifyWhenReady || material.status !== 'READY') continue
    const key = String(material.serverId ?? material.id)
    if (dismissedReadyIds.some((id) => String(id) === key)) continue
    const query = categoryQueries[material.subjectId]
    // READY 자료의 조회 실패는 완료된 안내로 간주해 홈에서 숨긴다.
    if (query?.error) continue
    // 다른 과목의 단원이나 연결 ID가 없는 단원으로 완료를 추측하지 않는다.
    const units = (categories[material.subjectId] ?? []).filter(
      (unit) =>
        material.serverId != null && unit.materialId != null && String(unit.materialId) === key,
    )
    if (units.length === 0) {
      checkingMaterials.push({
        ...material,
        refreshing: Boolean(query?.loading),
      })
      continue
    }
    if (units.some((unit) => unit.questionStatus === 'PREPARING')) {
      waitingMaterials.push(material)
      continue
    }
    if (units.some((unit) => unit.questionStatus !== 'AVAILABLE')) {
      checkingMaterials.push({
        ...material,
        refreshing: Boolean(query?.loading),
      })
      continue
    }
    readyMaterials.push({
      key,
      title: material.fileName,
      subjectName:
        subjects.find((subject) => String(subject.id) === String(material.subjectId))?.name ?? '',
      units,
    })
  }
  return {
    readyMaterials,
    waitingMaterials,
    checkingMaterials,
  }
}
