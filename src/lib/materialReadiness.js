// 업로드 직후 서버 자료 목록과 단원 응답은 서로 다른 시점에 도착한다.
// 완료 안내는 최근 자료 목록 대신 이 기기에서 시작한 업로드를 기준으로 판단한다.
export function getUploadReadiness(
  { materials, categories, subjects, dismissedReadyIds = [] },
  serverMode,
) {
  const readyMaterials = []
  const waitingMaterials = []
  const allUnits = Object.values(categories).flat()

  for (const material of materials) {
    if (!material.notifyWhenReady || material.status !== 'READY') continue
    const key = String(material.serverId ?? material.id)
    const units = serverMode
      ? allUnits.filter((unit) => String(unit.materialId) === key)
      : (material.units ?? [])
    if (units.length === 0 || units.some((unit) => unit.questionStatus === 'PREPARING')) {
      waitingMaterials.push(material)
      continue
    }
    if (dismissedReadyIds.some((id) => String(id) === key)) continue
    readyMaterials.push({
      key,
      title: material.fileName,
      subjectName:
        subjects.find((subject) => String(subject.id) === String(material.subjectId))?.name ?? '',
      units,
    })
  }
  return { readyMaterials, waitingMaterials }
}
