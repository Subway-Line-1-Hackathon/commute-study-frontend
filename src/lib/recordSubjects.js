// 학습할 과목 목록과 별개로, 삭제 후에도 기록 조회에 필요한 과목 ID를 유지한다.
export function getRecordSubjects(materialState, sessionState) {
  const byId = new Map()
  const add = (id, name = '') => {
    if (id == null || id === '') return
    const key = String(id)
    if (!byId.has(key)) byId.set(key, { id: key, name })
  }
  for (const s of [...materialState.subjects, ...(materialState.archivedSubjects ?? [])]) {
    add(s.id, s.name)
  }
  for (const note of sessionState.wrongNotes) add(note.subjectId, note.subjectName)
  for (const session of [sessionState.current, ...sessionState.history]) {
    if (session) add(session.subjectId, session.subjectName)
  }
  return [...byId.values()]
}
