import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { MATERIAL_STATUS as M } from '../lib/constants'
import { zustandStorage, uid, wait } from '../lib/storage'
import { generateUnitsAndSummary } from '../mocks/mockMaterial'

const inflight = new Set()

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
          if (!cur || cur.status === M.READY) return
          if (cur.status === M.UPLOADED) {
            await wait(2000, 3000)
            patch(id, { status: M.PROCESSING })
          }
          await wait(2000, 3000)
          const latest = get().materials.find((m) => m.id === id)
          patch(id, { status: M.READY, ...generateUnitsAndSummary(latest.fileName) })
        } finally {
          inflight.delete(id)
        }
      }

      return {
        subjects: [],
        materials: [],

        addSubject: (name) => {
          const subject = { id: uid(), name: name.trim() }
          set((s) => ({ subjects: [...s.subjects, subject] }))
          return subject
        },

        uploadMaterial: (subjectId, file) => {
          const id = uid()
          set((s) => ({
            materials: [
              ...s.materials,
              {
                id,
                subjectId,
                fileName: file.name,
                status: M.UPLOADED,
                units: [],
                summary: null,
                createdAt: Date.now(),
              },
            ],
          }))
          advance(id)
          return id
        },

        resumePending: () =>
          get()
            .materials.filter((m) => m.status !== M.READY)
            .forEach((m) => advance(m.id)),

        hasReadyMaterial: () => get().materials.some((m) => m.status === M.READY),
        allUnits: () =>
          get()
            .materials.filter((m) => m.status === M.READY)
            .flatMap((m) =>
              m.units.map((u) => ({ ...u, materialId: m.id, subjectId: m.subjectId })),
            ),
      }
    },
    { name: 'cs:materials', storage: createJSONStorage(() => zustandStorage) },
  ),
)
