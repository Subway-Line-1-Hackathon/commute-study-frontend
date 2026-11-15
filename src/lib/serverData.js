// 백엔드의 숫자 ID가 없는 예전 로컬 생성 데이터는 복원하지 않는다.
export const isServerId = (id) => id != null && /^[1-9]\d*$/.test(String(id))

export function cleanMaterialData(data) {
  return {
    ...data,
    subjects: (data.subjects ?? []).filter((subject) => isServerId(subject.id)),
    archivedSubjects: (data.archivedSubjects ?? []).filter((subject) => isServerId(subject.id)),
    materials: (data.materials ?? []).filter(
      (material) =>
        isServerId(material.serverId) ||
        (isServerId(material.subjectId) &&
          (material.status === 'UPLOADING' || material.uploadFailed)),
    ),
    categories: Object.fromEntries(
      Object.entries(data.categories ?? {})
        .filter(([id]) => isServerId(id))
        .map(([id, units]) => [id, units.filter((unit) => isServerId(unit.categoryId ?? unit.id))]),
    ),
    serverMaterials: (data.serverMaterials ?? []).filter((material) => isServerId(material.id)),
    dismissedReadyIds: (data.dismissedReadyIds ?? []).filter(isServerId),
  }
}

export function cleanSessionData(data) {
  const history = (data.history ?? []).filter((session) => isServerId(session.serverId))
  return {
    ...data,
    current: isServerId(data.current?.serverId) ? data.current : null,
    history,
    wrongNotes: (data.wrongNotes ?? []).filter((note) => isServerId(note.questionId)),
    pendingAttempts: (data.pendingAttempts ?? []).filter((attempt) =>
      isServerId(attempt.sessionId),
    ),
    pendingEnds: (data.pendingEnds ?? []).filter((end) => isServerId(end.sessionId)),
    // 생성된 기록만 있었던 기기의 집계도 함께 비운다.
    dailyStats: history.length || !data.history?.length ? (data.dailyStats ?? {}) : {},
    continuing: isServerId(data.current?.serverId) && Boolean(data.continuing),
  }
}
