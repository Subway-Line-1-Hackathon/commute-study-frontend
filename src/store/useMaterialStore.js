import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { MATERIAL_STATUS as M, UPLOAD } from '../lib/constants'
import { zustandStorage, uid, wait } from '../lib/storage'
import { generateUnitsAndSummary, MOCK_FAIL_MESSAGE, shouldMockFail } from '../mocks/mockMaterial'

const inflight = new Set()
const baseName = (fileName) => fileName.replace(/\.[^.]+$/, '')
let uploadQueue = Promise.resolve()

export const useMaterialStore = create(
  persist(
    (set, get) => {
      const patch = (id, p) =>
        set((s) => ({ materials: s.materials.map((m) => (m.id === id ? { ...m, ...p } : m)) }))

      const advance = async (id) => {
        if (inflight.has(id)) return
        inflight.add(id)
        try {
          const cur = get().materials.find((m) => m.id === id)
          if (!cur || (cur.status !== M.UPLOADED && cur.status !== M.PROCESSING)) return
          if (cur.status === M.UPLOADED) {
            await wait(2000, 3000)
            patch(id, { status: M.PROCESSING })
          }
          await wait(2000, 3000)
          const latest = get().materials.find((m) => m.id === id)
          if (shouldMockFail(latest.fileName) && !latest.retried) {
            patch(id, { status: M.FAILED, errorMessage: MOCK_FAIL_MESSAGE })
            return
          }
          patch(id, {
            status: M.READY,
            errorMessage: null,
            ...generateUnitsAndSummary(latest.fileName),
          })
        } finally {
          inflight.delete(id)
        }
      }

      const upload = async (id) => {
        for (let progress = 10; progress <= 100; progress += 10) {
          await wait(120, 200)
          if (!get().materials.some((m) => m.id === id)) return
          patch(id, { progress })
        }
        patch(id, { status: M.UPLOADED, progress: null })
        advance(id)
      }

      return {
        subjects: [],
        materials: [],

        addSubject: (name, examDate = null) => {
          const subject = { id: uid(), name: name.trim(), examDate: examDate || null }
          set((s) => ({ subjects: [...s.subjects, subject] }))
          return subject
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
                subjectId,
                fileName,
                fileSize,
                pageCount: files.length,
                status: M.UPLOADING,
                progress: 0,
                errorMessage: null,
                retried: false,
                units: [],
                summary: null,
                createdAt: Date.now(),
              },
            ],
          }))
          uploadQueue = uploadQueue.then(() => upload(id)).catch(() => {})
          return id
        },

        retryMaterial: (id) => {
          const cur = get().materials.find((m) => m.id === id)
          if (!cur || cur.status !== M.FAILED || cur.retried) return
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
        allUnits: () =>
          get()
            .materials.filter((m) => m.status === M.READY)
            .flatMap((m) =>
              m.units.map((u) => ({ ...u, materialId: m.id, subjectId: m.subjectId })),
            ),
      }
    },
    {
      name: 'cs:materials',
      version: 1,
      // 예전에 4개 단원으로 나뉘어 저장된 자료를 하나로 합친다
      migrate: (persisted) => ({
        ...persisted,
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
      }),
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
)

export function getRecentMaterials(materials) {
  const newestFirst = [...materials].sort((a, b) => b.createdAt - a.createdAt)
  return newestFirst.slice(0, UPLOAD.MAX_VISIBLE)
}

export function getRecentUnits(materials, subjects) {
  const recentReady = getRecentMaterials(materials).filter((m) => m.status === M.READY)

  const units = []
  for (const material of recentReady) {
    const subject = subjects.find((s) => s.id === material.subjectId)
    for (const unit of material.units) {
      units.push({
        ...unit,
        materialId: material.id,
        subjectId: material.subjectId,
        subjectName: subject?.name ?? '',
      })
    }
  }
  return units
}
