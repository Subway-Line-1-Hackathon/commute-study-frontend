import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { ApiError, errorMessage } from '../lib/api'
import { MATERIAL_STATUS as M, UPLOAD } from '../lib/constants'
import {
  createSubject as apiCreateSubject,
  deleteMaterial as apiDeleteMaterial,
  deleteSubject as apiDeleteSubject,
  updateSubject as apiUpdateSubject,
  getCategories,
  getMaterials,
  getMaterialStatus,
  getSubjects,
  retryMaterial as apiRetryMaterial,
  uploadMaterial as apiUploadMaterial,
} from '../lib/endpoints'
import { supabase } from '../lib/supabase'
import { zustandStorage, uid, wait } from '../lib/storage'
import { generateUnitsAndSummary, MOCK_FAIL_MESSAGE, shouldMockFail } from '../mocks/mockMaterial'

// 과목·학습 자료·단원 전역 스토어
// 자료 하나의 흐름: 업로드(UPLOADING) -> 서버 접수(UPLOADED) -> AI 분석(PROCESSING) -> READY/FAILED
// 서버 모드는 상태를 3초마다 조회(polling)하고, Mock 모드는 타이머로 상태를 흉내 낸다

// 지금 상태 조회(advance)가 돌고 있는 자료 id. 같은 자료를 두 번 polling하지 않게 막는다
const inflight = new Set()
// 파일명에서 확장자를 뗀다 ("강의1.pdf" -> "강의1")
const baseName = (fileName) => fileName.replace(/\.[^.]+$/, '')
// 업로드를 한 번에 하나씩 순서대로 보내기 위한 Promise 체인
let uploadQueue = Promise.resolve()

const POLL_MS = 3000 // 상태 조회 간격
const DONE = [M.READY, M.FAILED, M.EXPIRED] // 더 이상 조회할 필요 없는 상태

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
    progress: c.progress ?? 0, // 0~1
    accuracy: c.accuracy ?? null, // 0~1
    state: c.state ?? null,
    questionStatus: c.questionStatus ?? null, // AVAILABLE | PREPARING ...
  }
}

export const useMaterialStore = create(
  persist(
    (set, get) => {
      // 내부 헬퍼: 자료 id 하나의 일부 필드만 바꾼다
      const patch = (id, p) =>
        set((s) => ({ materials: s.materials.map((m) => (m.id === id ? { ...m, ...p } : m)) }))
      // 내부 헬퍼: 최신 상태에서 자료를 찾는다 (await 뒤에는 상태가 바뀌었을 수 있어 매번 다시 찾는다)
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
            // 네트워크 오류 등은 잠깐 기다렸다가 다시 조회한다
            await wait(POLL_MS)
            continue
          }
          if (!find(id)) return // 기다리는 사이 자료가 지워졌으면 중단
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

      // 업로드가 끝난 자료를 READY/FAILED가 될 때까지 진행시킨다
      // serverId가 있으면 서버 polling, 없으면 Mock 진행
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

      // Mock 업로드: 진행률을 10%씩 올린 뒤 UPLOADED로 바꾸고 분석을 시작한다
      const uploadMock = async (id) => {
        for (let progress = 10; progress <= 100; progress += 10) {
          await wait(120, 200)
          if (!find(id)) return
          patch(id, { progress })
        }
        patch(id, { status: M.UPLOADED, progress: null })
        advance(id)
      }

      // 서버 업로드: 파일을 보내고 받은 materialId(serverId)로 상태 조회를 시작한다
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

      // ---- 여기부터 화면에서 쓰는 상태와 액션 ----
      return {
        subjects: [], // [{ id, name, examDate, dDay }]
        materials: [], // 업로드한 자료 목록 (상태, 진행률, 에러 문구 등)
        categories: {}, // { [subjectId]: unit[] } 서버 단원
        serverMaterials: [],

        syncMaterials: async () => {
          if (!supabase) return
          const res = await getMaterials()
          const serverMaterials = (res?.materials ?? []).map((m) => ({
            id: String(m.id),
            subjectId: String(m.subjectId),
            fileName: m.fileName,
            status: m.status,
            createdAt: Date.parse(m.createdAt),
          }))
          set({ serverMaterials })
        },

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

        updateSubject: async (id, changes) => {
          let next = changes
          if (supabase) {
            const res = await apiUpdateSubject(id, changes)
            next = { name: res.name, examDate: res.examDate ?? null, dDay: res.dDay ?? null }
          }
          set((s) => ({
            subjects: s.subjects.map((sub) => (sub.id === id ? { ...sub, ...next } : sub)),
          }))
        },

        removeSubject: async (id) => {
          if (supabase) await apiDeleteSubject(id)
          set((s) => {
            const categories = { ...s.categories }
            delete categories[id]
            return {
              subjects: s.subjects.filter((sub) => sub.id !== id),
              materials: s.materials.filter((m) => m.subjectId !== id),
              serverMaterials: s.serverMaterials.filter((m) => m.subjectId !== id),
              categories,
            }
          })
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
          get()
            .syncMaterials()
            .catch(() => {})
          const ids = subjectId ? [subjectId] : get().subjects.map((s) => s.id)
          const results = await Promise.all(
            ids.map((id) =>
              getCategories(id)
                .then((res) => [id, (res?.categories ?? []).map((c) => toUnit(c, id))])
                .catch(() => null),
            ),
          )
          // 실패한 과목(null)은 건너뛰고, 성공한 과목만 덮어쓴다
          set((s) => {
            const categories = { ...s.categories }
            for (const r of results) if (r) categories[r[0]] = r[1]
            return { categories }
          })
        },

        // 자료 업로드 시작. 목록에 UPLOADING 상태로 먼저 추가하고(화면에 바로 보이게),
        // 실제 전송은 큐에 넣어 하나씩 처리한다. 프론트 임시 id를 바로 돌려준다
        // files: PDF/PPTX 1개 또는 사진(PNG·JPG) 여러 장(한 자료로 묶임)
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
                progress: supabase ? null : 0, // 서버 업로드는 진행률을 알 수 없어서 null
                errorMessage: null,
                retried: false, // 재시도는 1번만 허용
                units: [],
                summary: null,
                createdAt: Date.now(),
              },
            ],
          }))
          const run = supabase ? () => uploadServer(id, files) : () => uploadMock(id)
          // 앞 업로드가 끝나야 다음 업로드가 시작된다. 하나가 실패해도 큐가 멈추지 않게 catch
          uploadQueue = uploadQueue.then(run).catch(() => {})
          return id
        },

        // 분석에 실패한 자료를 한 번 더 분석시킨다 (자료당 1회)
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

        // 앱을 다시 열었을 때 호출: 전송 중에 끊긴 자료(UPLOADING)는 파일이 없어 이어갈 수 없으니 지우고,
        // 분석 중이던 자료는 상태 조회를 다시 시작한다
        resumePending: () => {
          set((s) => ({ materials: s.materials.filter((m) => m.status !== M.UPLOADING) }))
          get()
            .materials.filter((m) => m.status === M.UPLOADED || m.status === M.PROCESSING)
            .forEach((m) => advance(m.id))
        },

        // 분석이 끝난 자료가 하나라도 있는지
        hasReadyMaterial: () => get().materials.some((m) => m.status === M.READY),

        removeFailedMaterial: async (id) => {
          const target = find(id)
          if (!target || target.status !== M.FAILED) return
          if (target.serverId) {
            try {
              await apiDeleteMaterial(target.serverId)
            } catch (err) {
              if (!(err instanceof ApiError && err.status === 404)) {
                patch(id, { errorMessage: errorMessage(err, '자료를 지우지 못했어요.') })
                return
              }
            }
          }
          set((s) => ({ materials: s.materials.filter((m) => m.id !== id) }))
          get()
            .syncMaterials()
            .catch(() => {})
        },
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

// ---- 스토어 상태를 받아 화면용 데이터를 만드는 함수들 (selector) ----

// 최근 올린 자료부터 최대 MAX_VISIBLE개
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
function hasServerMaterialInfo({ categories, serverMaterials = [] }) {
  if (serverMaterials.length === 0) return false
  return Object.values(categories)
    .flat()
    .some((u) => u.materialId != null)
}

export function isGroupedByMaterial(state) {
  return !supabase || hasServerMaterialInfo(state)
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
  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? ''

  if (supabase && hasServerMaterialInfo({ categories, serverMaterials })) {
    return getServerMaterialGroups(
      { materials, categories, subjects, serverMaterials },
      newMaterialIds,
    )
  }

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
