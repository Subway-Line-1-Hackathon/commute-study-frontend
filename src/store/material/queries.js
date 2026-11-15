import {
  createSubject as apiCreateSubject,
  getCategories,
  getMaterials,
  getSubjects,
} from '../../lib/endpoints'

// 서버 단원(category) -> 화면 단원
function toUnit(c, subjectId) {
  let pages = null
  if (c.pageStart != null && c.pageEnd != null) pages = c.pageEnd - c.pageStart + 1
  return {
    id: String(c.id),
    categoryId: c.id,
    subjectId,
    materialId: c.materialId != null ? String(c.materialId) : null,
    title: c.name,
    pages,
    progress: c.progress ?? 0,
    // 0~1
    accuracy: c.accuracy ?? null,
    // 0~1
    state: c.state ?? null,
    questionStatus: c.questionStatus ?? null, // AVAILABLE | PREPARING ...
  }
}
export function createMaterialQueries(set, get, captureRequest) {
  const categoryRequests = new Map()
  const syncCategory = (id) => {
    const key = String(id)
    const previous = categoryRequests.get(key)
    if (previous?.isCurrent()) return previous.promise
    const request = {
      isCurrent: captureRequest(),
      promise: null,
    }
    categoryRequests.set(key, request)
    request.promise = Promise.resolve().then(async () => {
      if (!request.isCurrent()) return
      try {
        const res = await getCategories(id)
        if (!request.isCurrent()) return
        set((s) => ({
          categories: {
            ...s.categories,
            [key]: (res?.categories ?? []).map((c) => toUnit(c, key)),
          },
          categoryQueries: {
            ...s.categoryQueries,
            [key]: {
              loading: false,
              error: false,
            },
          },
        }))
      } catch {
        if (!request.isCurrent()) return
        // READY 자료의 안내는 완료된 것으로 간주해 닫고, 다음 조회에도 다시 띄우지 않는다.
        set((s) => ({
          categoryQueries: {
            ...s.categoryQueries,
            [key]: {
              loading: false,
              error: true,
            },
          },
          dismissedReadyIds: [
            ...new Set([
              ...(s.dismissedReadyIds ?? []),
              ...s.materials
                .filter(
                  (material) =>
                    String(material.subjectId) === key &&
                    material.status === 'READY' &&
                    material.notifyWhenReady,
                )
                .map((material) => String(material.serverId ?? material.id)),
            ]),
          ],
        }))
      } finally {
        if (categoryRequests.get(key) === request) categoryRequests.delete(key)
      }
    })
    set((s) => ({
      categoryQueries: {
        ...s.categoryQueries,
        [key]: {
          loading: true,
          error: Boolean(s.categoryQueries?.[key]?.error),
        },
      },
    }))
    return request.promise
  }
  return {
    syncMaterials: async () => {
      const isCurrent = captureRequest()
      const res = await getMaterials()
      if (!isCurrent()) return
      const serverMaterials = (res?.materials ?? []).map((m) => ({
        id: String(m.id),
        subjectId: String(m.subjectId),
        fileName: m.fileName,
        status: m.status,
        createdAt: Date.parse(m.createdAt),
      }))
      set({
        serverMaterials,
      })
    },
    // 과목 등록. 서버가 연결돼 있으면 서버에 만들고 받은 id를 쓴다
    addSubject: async (name, examDate = null) => {
      const isCurrent = captureRequest()
      const body = {
        name: name.trim(),
        examDate: examDate || null,
      }
      const res = await apiCreateSubject({
        ...body,
        examDate: body.examDate ?? undefined,
      })
      if (!isCurrent()) throw new Error('계정이 변경되어 과목 등록을 취소했어요.')
      const id = String(res.subjectId)
      const subject = {
        id,
        ...body,
      }
      set((s) => ({
        subjects: [...s.subjects, subject],
      }))
      return subject
    },
    // 서버의 과목 목록으로 바꾼다. id는 URL 쿼리와 비교하기 쉽게 문자열로 둔다
    syncSubjects: async () => {
      const isCurrent = captureRequest()
      const res = await getSubjects()
      if (!isCurrent()) return
      const subjects = (res?.subjects ?? []).map((s) => ({
        id: String(s.id),
        name: s.name,
        examDate: s.examDate ?? null,
        dDay: s.dDay ?? null,
      }))
      set((s) => ({
        subjects,
        // 다른 기기에서 삭제한 과목도, 이 기기에 있던 ID는 보존한다.
        archivedSubjects: [...(s.archivedSubjects ?? []), ...s.subjects].filter(
          (sub, index, all) =>
            !subjects.some((active) => active.id === sub.id) &&
            all.findIndex((item) => item.id === sub.id) === index,
        ),
      }))
    },
    // 과목별 단원(진도·정답률 포함)을 서버에서 받는다. subjectId가 없으면 모든 과목
    syncCategories: async (subjectId) => {
      get()
        .syncMaterials()
        .catch(() => {})
      const ids = subjectId ? [subjectId] : get().subjects.map((s) => s.id)
      await Promise.all(ids.map(syncCategory))
    },
  }
}
