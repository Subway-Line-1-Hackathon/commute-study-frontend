import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { errorMessage } from '../lib/api'
import { MATERIAL_STATUS as M, UPLOAD } from '../lib/constants'
import {
  createSubject as apiCreateSubject,
  getCategories,
  getMaterialStatus,
  getSubjects,
  retryMaterial as apiRetryMaterial,
  uploadMaterial as apiUploadMaterial,
} from '../lib/endpoints'
import { supabase } from '../lib/supabase'
import { zustandStorage, uid, wait } from '../lib/storage'
import { generateUnitsAndSummary, MOCK_FAIL_MESSAGE, shouldMockFail } from '../mocks/mockMaterial'

const inflight = new Set()
const baseName = (fileName) => fileName.replace(/\.[^.]+$/, '')
let uploadQueue = Promise.resolve()

const POLL_MS = 3000
const DONE = [M.READY, M.FAILED, M.EXPIRED]

// 서버 단원(category) -> 화면 단원
function toUnit(c, subjectId) {
  let pages = null
  if (c.pageStart != null && c.pageEnd != null) pages = c.pageEnd - c.pageStart + 1
  return {
    id: String(c.id),
    categoryId: c.id,
    subjectId,
    title: c.name,
    pages,
    progress: c.progress ?? 0, // 0~1
    accuracy: c.accuracy ?? null, // 0~1
    state: c.state ?? null,
    questionStatus: c.questionStatus ?? null, // AVAILABLE | PREPARING ...
  }
}

export const useMaterialStore = create(
  persist(
    (set, get) => {
      const patch = (id, p) =>
        set((s) => ({ materials: s.materials.map((m) => (m.id === id ? { ...m, ...p } : m)) }))
      const find = (id) => get().materials.find((m) => m.id === id)

      // Mock: 일정 시간 뒤 단원과 요약을 만든다
      const advanceMock = async (id) => {
        const cur = find(id)
        if (cur.status === M.UPLOADED) {
          await wait(2000, 3000)
          patch(id, { status: M.PROCESSING })
        }
        await wait(2000, 3000)
        const latest = find(id)
        if (shouldMockFail(latest.fileName) && !latest.retried) {
          patch(id, { status: M.FAILED, errorMessage: MOCK_FAIL_MESSAGE })
          return
        }
        patch(id, {
          status: M.READY,
          errorMessage: null,
          ...generateUnitsAndSummary(latest.fileName),
        })
      }

      // 서버: READY/FAILED가 될 때까지 상태를 조회한다. READY면 과목의 단원을 다시 받는다
      const pollServer = async (id) => {
        for (;;) {
          const cur = find(id)
          if (!cur || DONE.includes(cur.status)) return
          let res
          try {
            res = await getMaterialStatus(cur.serverId)
          } catch {
            await wait(POLL_MS)
            continue
          }
          if (!find(id)) return
          if (res.status === M.READY) {
            patch(id, { status: M.READY, errorMessage: null, categoryCount: res.categoryCount })
            get()
              .syncCategories(cur.subjectId)
              .catch(() => {})
            return
          }
          if (res.status === M.FAILED || res.status === M.EXPIRED) {
            patch(id, { status: res.status, errorMessage: res.error ?? null })
            return
          }
          if (res.status !== cur.status) patch(id, { status: res.status })
          await wait(POLL_MS)
        }
      }

      const advance = async (id) => {
        if (inflight.has(id)) return
        inflight.add(id)
        try {
          const cur = find(id)
          if (!cur || (cur.status !== M.UPLOADED && cur.status !== M.PROCESSING)) return
          if (cur.serverId) await pollServer(id)
          else await advanceMock(id)
        } finally {
          inflight.delete(id)
        }
      }

      const uploadMock = async (id) => {
        for (let progress = 10; progress <= 100; progress += 10) {
          await wait(120, 200)
          if (!find(id)) return
          patch(id, { progress })
        }
        patch(id, { status: M.UPLOADED, progress: null })
        advance(id)
      }

      const uploadServer = async (id, files) => {
        const cur = find(id)
        if (!cur) return
        try {
          const res = await apiUploadMaterial(cur.subjectId, files)
          patch(id, {
            serverId: res.materialId,
            status: res.status ?? M.UPLOADED,
            progress: null,
          })
          advance(id)
        } catch (err) {
          // 서버에 올라가지 않았으니 다시 시도할 수 없다. 파일을 다시 골라야 한다
          patch(id, {
            status: M.FAILED,
            progress: null,
            retried: true,
            uploadFailed: true,
            errorMessage: errorMessage(err, '업로드하지 못했어요. 다시 올려 주세요.'),
          })
        }
      }

      return {
        subjects: [],
        materials: [],
        categories: {}, // { [subjectId]: unit[] } 서버 단원

        // 과목 등록. 서버가 연결돼 있으면 서버에 만들고 받은 id를 쓴다
        addSubject: async (name, examDate = null) => {
          const body = { name: name.trim(), examDate: examDate || null }
          let id = uid()
          if (supabase) {
            const res = await apiCreateSubject({ ...body, examDate: body.examDate ?? undefined })
            id = String(res.subjectId)
          }
          const subject = { id, ...body }
          set((s) => ({ subjects: [...s.subjects, subject] }))
          return subject
        },

        // 서버의 과목 목록으로 바꾼다. id는 URL 쿼리와 비교하기 쉽게 문자열로 둔다
        syncSubjects: async () => {
          if (!supabase) return
          const res = await getSubjects()
          const subjects = (res?.subjects ?? []).map((s) => ({
            id: String(s.id),
            name: s.name,
            examDate: s.examDate ?? null,
            dDay: s.dDay ?? null,
          }))
          set({ subjects })
        },

        // 과목별 단원(진도·정답률 포함)을 서버에서 받는다. subjectId가 없으면 모든 과목
        syncCategories: async (subjectId) => {
          if (!supabase) return
          const ids = subjectId ? [subjectId] : get().subjects.map((s) => s.id)
          const results = await Promise.all(
            ids.map((id) =>
              getCategories(id)
                .then((res) => [id, (res?.categories ?? []).map((c) => toUnit(c, id))])
                .catch(() => null),
            ),
          )
          set((s) => {
            const categories = { ...s.categories }
            for (const r of results) if (r) categories[r[0]] = r[1]
            return { categories }
          })
        },

        uploadMaterial: (subjectId, files) => {
          const id = uid()
          const first = files[0]

          let fileName = first.name
          if (files.length > 1) {
            fileName = `${first.name} 외 ${files.length - 1}장`
          }

          let fileSize = 0
          for (const file of files) {
            fileSize += file.size
          }

          set((s) => ({
            materials: [
              ...s.materials,
              {
                id,
                serverId: null,
                subjectId,
                fileName,
                fileSize,
                pageCount: files.length,
                status: M.UPLOADING,
                progress: supabase ? null : 0,
                errorMessage: null,
                retried: false,
                units: [],
                summary: null,
                createdAt: Date.now(),
              },
            ],
          }))
          const run = supabase ? () => uploadServer(id, files) : () => uploadMock(id)
          uploadQueue = uploadQueue.then(run).catch(() => {})
          return id
        },

        retryMaterial: async (id) => {
          const cur = find(id)
          if (!cur || cur.status !== M.FAILED || cur.retried) return
          if (cur.serverId) {
            try {
              await apiRetryMaterial(cur.serverId)
            } catch (err) {
              patch(id, {
                retried: true,
                errorMessage: errorMessage(err, '다시 시도하지 못했어요.'),
              })
              return
            }
          }
          patch(id, { status: M.PROCESSING, retried: true, errorMessage: null })
          advance(id)
        },

        resumePending: () => {
          set((s) => ({ materials: s.materials.filter((m) => m.status !== M.UPLOADING) }))
          get()
            .materials.filter((m) => m.status === M.UPLOADED || m.status === M.PROCESSING)
            .forEach((m) => advance(m.id))
        },

        hasReadyMaterial: () => get().materials.some((m) => m.status === M.READY),
      }
    },
    {
      name: 'cs:materials',
      version: 2,
      migrate: (persisted, version) => {
        if (version >= 1) return { categories: {}, ...persisted }
        // 예전에 4개 단원으로 나뉘어 저장된 자료를 하나로 합친다
        return {
          ...persisted,
          categories: {},
          materials: (persisted.materials ?? []).map((m) => ({
            ...m,
            units:
              m.status === M.READY
                ? [
                    {
                      id: m.units?.[0]?.id ?? m.id,
                      title: baseName(m.fileName),
                      summary: m.summary ?? '',
                    },
                  ]
                : [],
          })),
        }
      },
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
)

export function getRecentMaterials(materials) {
  const newestFirst = [...materials].sort((a, b) => b.createdAt - a.createdAt)
  return newestFirst.slice(0, UPLOAD.MAX_VISIBLE)
}

// 과목의 단원. 서버 모드는 서버 단원, Mock은 준비된 자료의 단원
export function getSubjectUnits({ materials, categories }, subjectId) {
  if (supabase) return categories[subjectId] ?? []
  return materials
    .filter((m) => m.subjectId === subjectId && m.status === M.READY)
    .flatMap((m) => m.units.map((u) => ({ ...u, materialId: m.id, subjectId })))
}

// 단원 선택 화면의 묶음. 서버 단원은 자료 구분이 없어서 과목별로 묶는다
// -> [{ key, title, subjectName, units, isNew }]
export function getUnitGroups({ materials, categories, subjects }, newMaterialIds = []) {
  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? ''

  if (supabase) {
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

  return getRecentMaterials(materials)
    .filter((m) => m.status === M.READY)
    .map((m) => ({
      key: m.id,
      title: m.fileName,
      subjectName: subjectName(m.subjectId),
      units: m.units.map((u) => ({ ...u, materialId: m.id, subjectId: m.subjectId })),
      isNew: newMaterialIds.includes(m.id),
    }))
}
