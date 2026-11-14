import { PHASE, SESSION_STATUS as S, WARNING_SEC } from '../../lib/constants'
import { canContinue } from './time'

export function createSessionLifecycle(set, get) {
  return {
    startContinue: () => {
      if (!canContinue(get().current)) return false
      set({ continuing: true })
      return true
    },
    cancelContinue: () => {
      if (get().continuing) set({ continuing: false })
    },
    getContinueFrom: () => {
      const cur = get().current
      return get().continuing && canContinue(cur) ? cur : null
    },
    setListenIndex: (i) =>
      set((s) => (s.current ? { current: { ...s.current, listenIndex: i } } : s)),
    skipListening: () =>
      set((s) => {
        const cur = s.current
        if (!cur || cur.phase !== PHASE.LISTEN) return s
        return {
          current: {
            ...cur,
            phase: PHASE.QUIZ,
            quizRemainingSec: cur.quizRemainingSec + cur.conceptRemainingSec,
            conceptRemainingSec: 0,
          },
        }
      }),
    tick: () => {
      const cur = get().current
      if (!cur || cur.status !== S.IN_PROGRESS) return

      if (cur.phase === PHASE.LISTEN) {
        if (cur.conceptRemainingSec > 0) {
          set({ current: { ...cur, conceptRemainingSec: cur.conceptRemainingSec - 1 } })
          return
        }
        const left = cur.quizRemainingSec - 1
        if (left <= 0) {
          set({ current: { ...cur, quizRemainingSec: 0 } })
          get().endSession('ARRIVED')
          return
        }
        set({ current: { ...cur, quizRemainingSec: left } })
        return
      }

      if (cur.phase === PHASE.QUIZ) {
        const left = cur.quizRemainingSec - 1
        if (left <= 0) {
          set({ current: { ...cur, quizRemainingSec: 0 } })
          get().endSession('ARRIVED')
          return
        }
        // 전체 시간이 10분보다 길 때만, 남은 시간이 5분 이하가 되면 경고 표시
        const shouldWarn = cur.plan.totalSec > WARNING_SEC * 2 && left <= WARNING_SEC
        set({ current: { ...cur, quizRemainingSec: left, warned: cur.warned || shouldWarn } })
      }
    },
    endSession: (reason = 'QUIT') => {
      const cur = get().current
      if (!cur || cur.status === S.COMPLETED || cur.status === S.ENDED) return
      const ended = { ...cur, status: S.ENDED }
      // 한 문제도 안 풀었으면 기록(history)에 남기지 않는다
      set({
        current: ended,
        history: cur.answers.length > 0 ? [ended, ...get().history] : get().history,
      })
      // 쌓인 답안을 먼저 보내야 피드백에 반영된다
      if (cur.serverId) {
        get()
          .queueSessionEnd(cur.serverId, reason)
          .catch(() => {})
      }
    },
    clearCurrent: () => set({ current: null }),
    getResumable: () => {
      const cur = get().current
      return cur?.status === S.IN_PROGRESS ? cur : null
    },
  }
}
