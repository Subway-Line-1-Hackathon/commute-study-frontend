import { SESSION_STATUS as S } from '../../lib/constants'
import {
  endSession as apiEndSession,
  getCurrentSession,
  getWrongNotes,
  saveAttempts,
} from '../../lib/endpoints'
import { getRecordSubjects } from '../../lib/recordSubjects'
import { uid } from '../../lib/storage'
import { supabase } from '../../lib/supabase'
import { useMaterialStore } from '../useMaterialStore'
import { fromServerNote } from './wrongNotes'

export function createSessionSync(set, get) {
  let flushing = Promise.resolve()
  const flushAttempts = () => {
    const accountId = get().accountId
    const active = () => get().accountId === accountId
    // 실패한 전송 때문에 이후 재시도까지 막히지 않도록 이전 실패는 여기서 정리한다.
    flushing = flushing
      .catch(() => {})
      .then(async () => {
        if (!supabase || !active()) return
        const pending = get().pendingAttempts
        if (pending.length === 0 && get().pendingEnds.length === 0) return
        if (!accountId) throw new Error('답안을 작성한 계정을 확인할 수 없어요.')
        let failure
        // API가 세션 단위로 받으므로 세션 id별로 묶는다
        const bySession = {}
        for (const a of pending) (bySession[a.sessionId] ??= []).push(a)
        for (const [sessionId, list] of Object.entries(bySession)) {
          try {
            // 100개씩 나눠 보내고, 보낸 것만 pendingAttempts에서 지운다
            for (let i = 0; i < list.length; i += 100) {
              if (!active()) return
              const chunk = list.slice(i, i + 100)
              await saveAttempts(
                {
                  sessionId: Number(sessionId),
                  attempts: chunk.map((a) => {
                    // sessionId, key는 프론트 관리용이라 빼고 보낸다
                    const { sessionId: _s, key: _k, ...rest } = a // eslint-disable-line no-unused-vars
                    return rest
                  }),
                },
                { accountId },
              )
              if (!active()) return
              const sent = new Set(chunk.map((a) => a.key))
              set((s) => ({ pendingAttempts: s.pendingAttempts.filter((a) => !sent.has(a.key)) }))
            }
          } catch (err) {
            // 404도 잘못된 계정·문제일 수 있으므로 답안을 임의로 지우지 않는다.
            failure ??= err
          }
        }
        if (!active()) return
        for (const end of get().pendingEnds) {
          if (!active()) return
          // 해당 세션의 답안이 모두 저장되기 전에는 종료/피드백 생성을 요청하지 않는다.
          if (get().pendingAttempts.some((a) => String(a.sessionId) === String(end.sessionId)))
            continue
          try {
            await apiEndSession(end.sessionId, end.reason, { accountId })
            if (!active()) return
            set((s) => ({ pendingEnds: s.pendingEnds.filter((e) => e.key !== end.key) }))
          } catch (err) {
            failure ??= err
          }
        }
        if (failure) throw failure
      })
    return flushing
  }

  return {
    flushAttempts,
    queueSessionEnd: (sessionId, reason) => {
      if (!get().pendingEnds.some((e) => String(e.sessionId) === String(sessionId))) {
        set((s) => ({ pendingEnds: [...s.pendingEnds, { key: uid(), sessionId, reason }] }))
      }
      return flushAttempts()
    },
    syncCurrent: async () => {
      if (!supabase) return
      const cur = get().current
      if (cur?.status !== S.IN_PROGRESS || !cur.serverId) return
      const res = await getCurrentSession()
      if (get().current !== cur) return
      if (!res || String(res.sessionId) !== String(cur.serverId)) {
        const ended = { ...cur, status: S.ENDED }
        set({
          current: ended,
          history: cur.answers.length > 0 ? [ended, ...get().history] : get().history,
        })
      }
    },
    syncWrongNotes: async () => {
      if (!supabase) return
      const accountId = get().accountId
      await flushAttempts()
      if (get().accountId !== accountId) return
      const materialState = useMaterialStore.getState()
      const { categories } = materialState
      const subjects = getRecordSubjects(materialState, get())
      const unitTitles = {}
      for (const units of Object.values(categories)) {
        for (const u of units) unitTitles[u.categoryId] = u.title
      }
      const notesBeforeRequest = get().wrongNotes
      const results = await Promise.all(
        subjects.map((s) =>
          getWrongNotes(s.id)
            .then((res) =>
              (res?.items ?? []).map((i) => ({
                ...fromServerNote(i, s.id, unitTitles),
                subjectName: s.name,
              })),
            )
            .catch(() => null),
        ),
      )
      // 한 과목이라도 실패하면 일부만 덮어써서 오답이 사라져 보이지 않게, 이번엔 반영하지 않는다
      if (
        get().accountId !== accountId ||
        get().wrongNotes !== notesBeforeRequest ||
        results.some((r) => r === null)
      )
        return
      set({ wrongNotes: results.flat() })
    },
  }
}
