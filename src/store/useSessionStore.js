import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { PHASE, ROUTES, SESSION_STATUS as S } from '../lib/constants'
import { storage, zustandStorage } from '../lib/storage'
import { createSessionAnswers } from './session/answers'
import { createSessionCreation } from './session/creation'
import { createSessionLifecycle } from './session/lifecycle'
import { createSessionSync } from './session/sync'

export { canContinue, getElapsedSec, getRemainingSec, MIN_CONTINUE_SEC } from './session/time'

// One persisted store; action modules share the same set/get.
export const useSessionStore = create(
  persist(
    (set, get) => {
      const sync = createSessionSync(set, get)
      return {
        // 기존 v4 데이터에도 작성 계정을 붙인다. /home 직접 진입 시에도 큐가 유지된다.
        accountId: storage.get('auth')?.state?.user?.id ?? null,
        current: null,
        history: [],
        wrongNotes: [],
        unitProgress: {},
        dailyStats: {},
        pendingAttempts: [],
        pendingEnds: [],
        continuing: false,
        ...sync,
        ...createSessionCreation(set, get),
        ...createSessionAnswers(set, get, sync.flushAttempts),
        ...createSessionLifecycle(set, get),
      }
    },
    {
      name: 'cs:session',
      version: 4,
      // 예전 구조는 정리한다 (v4부터 문제 설정이 출발 전으로 바뀌어 진행 중 세션은 비운다)
      migrate: (persisted, version) => ({
        ...persisted,
        current: version < 4 ? null : persisted.current,
        wrongNotes: version < 3 ? [] : (persisted.wrongNotes ?? []),
        dailyStats: persisted.dailyStats ?? {},
        pendingAttempts: persisted.pendingAttempts ?? [],
        pendingEnds: persisted.pendingEnds ?? [],
        continuing: persisted.continuing ?? false,
      }),
      storage: createJSONStorage(() => zustandStorage),
      // localStorage에 저장할 필드만 고른다 (액션 함수는 저장하지 않음)
      partialize: (s) => ({
        accountId: s.accountId,
        current: s.current,
        history: s.history,
        wrongNotes: s.wrongNotes,
        unitProgress: s.unitProgress,
        dailyStats: s.dailyStats,
        pendingAttempts: s.pendingAttempts,
        pendingEnds: s.pendingEnds,
        continuing: s.continuing,
      }),
    },
  ),
)

export function getSessionRoute(cur) {
  if (!cur || cur.status === S.COMPLETED || cur.status === S.ENDED) return ROUTES.HOME
  if (cur.phase === PHASE.LISTEN) return ROUTES.LISTEN
  return ROUTES.PLAYER
}

// "이어서 할까요?" 모달에 띄울 문구
export function resumeMessage(cur) {
  if (cur.phase === PHASE.LISTEN) {
    return `지난번 ${cur.unitTitle} 개념 듣기를 하던 중이었어요. 이어서 할까요?`
  }
  return `지난번 ${cur.unitTitle} ${cur.questions.length}문제 중 ${cur.answers.length}문제를 풀었어요. 이어서 할까요?`
}
