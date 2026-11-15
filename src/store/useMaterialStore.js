import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { ApiError, errorMessage } from '../lib/api'
import { MATERIAL_STATUS as M } from '../lib/constants'
import {
  deleteMaterial as apiDeleteMaterial,
  getMaterialStatus,
  retryMaterial as apiRetryMaterial,
  uploadMaterial as apiUploadMaterial,
} from '../lib/endpoints'
import { isServerMode } from '../lib/runtime'
import { createMaterialQueries } from './material/queries'
import { zustandStorage, uid, wait } from '../lib/storage'
import { generateUnitsAndSummary, MOCK_FAIL_MESSAGE, shouldMockFail } from '../mocks/mockMaterial'

export {
  getRecentMaterials,
  getSubjectUnits,
  getUnitGroups,
  isGroupedByMaterial,
} from './material/selectors'

// 과목·학습 자료·단원 전역 스토어
// 자료 하나의 흐름: 업로드(UPLOADING) -> 서버 접수(UPLOADED) -> AI 분석(PROCESSING) -> READY/FAILED
// 서버 모드는 상태를 3초마다 조회(polling)하고, Mock 모드는 타이머로 상태를 흉내 낸다

// 파일명에서 확장자를 뗀다 ("강의1.pdf" -> "강의1")
const baseName = (fileName) => fileName.replace(/\.[^.]+$/, '')

const POLL_MS = 3000 // 상태 조회 간격
const DONE = [M.READY, M.FAILED, M.EXPIRED] // 더 이상 조회할 필요 없는 상태

export const useMaterialStore = create(
  persist(
    (set, get) => {
      const inflight = new Map() // 자료별 polling 중복 방지
      const activeUploads = new Set() // 홈으로 이동해도 전송 중인 파일은 유지
      let uploadQueue = Promise.resolve() // 파일 전송은 순서대로 처리
      let requestGeneration = 0
      const captureRequest = () => {
        const generation = requestGeneration
        return () => generation === requestGeneration
      }
      // 내부 헬퍼: 자료 id 하나의 일부 필드만 바꾼다
      const patch = (id, p) =>
        set((s) => ({ materials: s.materials.map((m) => (m.id === id ? { ...m, ...p } : m)) }))
      // 내부 헬퍼: 최신 상태에서 자료를 찾는다 (await 뒤에는 상태가 바뀌었을 수 있어 매번 다시 찾는다)
      const find = (id) => get().materials.find((m) => m.id === id)

      // Mock: 일정 시간 뒤 단원과 요약을 만든다
      const advanceMock = async (id, isCurrent) => {
        const cur = find(id)
        if (cur.status === M.UPLOADED) {
          await wait(2000, 3000)
          if (!isCurrent() || !find(id)) return
          patch(id, { status: M.PROCESSING })
        }
        await wait(2000, 3000)
        if (!isCurrent()) return
        const latest = find(id)
        if (!latest) return
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
      const pollServer = async (id, isCurrent) => {
        while (isCurrent()) {
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
          if (!isCurrent() || !find(id)) return // 계정 전환·삭제 이후 응답은 반영하지 않는다
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
      const advance = async (id, isCurrent = captureRequest()) => {
        if (!isCurrent() || inflight.has(id)) return
        inflight.set(id, isCurrent)
        try {
          const cur = find(id)
          if (!cur || (cur.status !== M.UPLOADED && cur.status !== M.PROCESSING)) return
          if (cur.serverId) await pollServer(id, isCurrent)
          else await advanceMock(id, isCurrent)
        } finally {
          if (inflight.get(id) === isCurrent) inflight.delete(id)
        }
      }

      // Mock 업로드: 진행률을 10%씩 올린 뒤 UPLOADED로 바꾸고 분석을 시작한다
      const uploadMock = async (id, isCurrent) => {
        for (let progress = 10; progress <= 100; progress += 10) {
          await wait(120, 200)
          if (!isCurrent() || !find(id)) return
          patch(id, { progress })
        }
        patch(id, { status: M.UPLOADED, progress: null })
        advance(id)
      }

      // 서버 업로드: 파일을 보내고 받은 materialId(serverId)로 상태 조회를 시작한다
      const uploadServer = async (id, files, isCurrent) => {
        const cur = find(id)
        if (!isCurrent() || !cur) return
        try {
          const res = await apiUploadMaterial(cur.subjectId, files)
          if (!isCurrent()) return
          patch(id, {
            serverId: res.materialId,
            status: res.status ?? M.UPLOADED,
            progress: null,
          })
          advance(id)
        } catch (err) {
          if (!isCurrent()) return
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
        // 이전 계정의 응답, polling, 아직 시작하지 않은 업로드를 무효화한다.
        invalidateRequests: () => {
          requestGeneration += 1
          inflight.clear()
          activeUploads.clear()
          uploadQueue = Promise.resolve()
        },
        subjects: [], // [{ id, name, examDate, dDay }]
        archivedSubjects: [], // 삭제한 과목의 오답·리포트를 조회하기 위한 ID/이름
        materials: [], // 업로드한 자료 목록 (상태, 진행률, 에러 문구 등)
        categories: {}, // { [subjectId]: unit[] } 서버 단원
        serverMaterials: [],
        dismissedReadyIds: [], // 홈에서 닫은 학습 준비 완료 카드
        dismissReadyMaterial: (id) =>
          set((s) => ({ dismissedReadyIds: [...new Set([...(s.dismissedReadyIds ?? []), id])] })),

        ...createMaterialQueries(set, get, captureRequest),

        // 자료 업로드 시작. 목록에 UPLOADING 상태로 먼저 추가하고(화면에 바로 보이게),
        // 실제 전송은 큐에 넣어 하나씩 처리한다. 프론트 임시 id를 바로 돌려준다
        // files: PDF/PPTX 1개 또는 사진(PNG·JPG) 여러 장(한 자료로 묶임)
        uploadMaterial: (subjectId, files) => {
          const id = uid()
          activeUploads.add(id)
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
                progress: isServerMode ? null : 0, // 서버 업로드는 진행률을 알 수 없어서 null
                errorMessage: null,
                retried: false, // 재시도는 1번만 허용
                units: [],
                summary: null,
                createdAt: Date.now(),
                notifyWhenReady: true, // 새 업로드만 홈 완료 안내 대상. 기존 저장 자료에는 없음.
              },
            ],
          }))
          const isCurrent = captureRequest()
          const run = () => {
            if (!isCurrent()) return
            return isServerMode ? uploadServer(id, files, isCurrent) : uploadMock(id, isCurrent)
          }
          // 앞 업로드가 끝나야 다음 업로드가 시작된다. 하나가 실패해도 큐가 멈추지 않게 catch
          uploadQueue = uploadQueue
            .then(run)
            .catch(() => {})
            .finally(() => activeUploads.delete(id))
          return id
        },

        // 분석에 실패한 자료를 한 번 더 분석시킨다 (자료당 1회)
        retryMaterial: async (id) => {
          const isCurrent = captureRequest()
          const cur = find(id)
          if (!cur || cur.status !== M.FAILED || cur.retried) return
          if (cur.serverId) {
            try {
              await apiRetryMaterial(cur.serverId)
              if (!isCurrent()) return
            } catch (err) {
              if (!isCurrent()) return
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
          set((s) => ({
            materials: s.materials
              .filter((m) => m.status !== M.UPLOADING || activeUploads.has(m.id))
              .map((m) =>
                m.status === M.UPLOADED || m.status === M.PROCESSING
                  ? { ...m, notifyWhenReady: true }
                  : m,
              ),
          }))
          get()
            .materials.filter((m) => m.status === M.UPLOADED || m.status === M.PROCESSING)
            .forEach((m) => advance(m.id))
        },

        // 분석이 끝난 자료가 하나라도 있는지
        hasReadyMaterial: () => get().materials.some((m) => m.status === M.READY),

        removeFailedMaterial: async (id) => {
          const isCurrent = captureRequest()
          const target = find(id)
          if (!target || target.status !== M.FAILED) return
          try {
            await get().removeMaterial(id)
          } catch (err) {
            if (!isCurrent()) return
            patch(id, { errorMessage: errorMessage(err, '자료를 지우지 못했어요.') })
          }
        },

        removeMaterial: async (id) => {
          const isCurrent = captureRequest()
          const local = find(id)
          const target = local ?? get().serverMaterials.find((m) => m.id === String(id))
          if (target && [M.UPLOADING, M.UPLOADED, M.PROCESSING].includes(target.status)) {
            throw new ApiError(409, { message: '분석 중인 자료는 지울 수 없어요.' })
          }
          const serverId = local?.serverId ?? (isServerMode && !local ? id : null)
          if (serverId) {
            try {
              await apiDeleteMaterial(serverId)
            } catch (err) {
              if (!(err instanceof ApiError && err.status === 404)) throw err
            }
          }
          if (!isCurrent()) return
          set((s) => ({
            materials: s.materials.filter(
              (m) => m.id !== id && !(serverId && String(m.serverId) === String(serverId)),
            ),
            serverMaterials: s.serverMaterials.filter((m) => m.id !== String(serverId ?? id)),
            categories: Object.fromEntries(
              Object.entries(s.categories).map(([subjectId, units]) => [
                subjectId,
                units.filter((u) => u.materialId !== String(serverId ?? id)),
              ]),
            ),
          }))
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
