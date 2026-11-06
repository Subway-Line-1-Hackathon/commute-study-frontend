import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  PHASE,
  ROUTES,
  SESSION_STATUS as S,
  WARNING_SEC,
  WRONG_STATUS,
  QUESTION_TYPE as T,
} from '../lib/constants'
import { getTimePlan } from '../lib/plan'
import { zustandStorage, uid } from '../lib/storage'
import { generateQuestions } from '../mocks/mockQuiz'
import { generateScript } from '../mocks/mockScript'

const norm = (v) => String(v).trim().toLowerCase()
const judge = (q, a) => (q.type === T.SHORT ? norm(q.answer) === norm(a) : q.answer === a)

export const useSessionStore = create(
  persist(
    (set, get) => ({
      current: null,
      history: [],
      wrongNotes: [],
      unitProgress: {},

      // READY. 20분 미만(개념 시간 0)이면 듣기 없이 문제 설정으로 시작
      createSession: ({ unit, studyMin }) => {
        const plan = getTimePlan(studyMin)
        const reviewOnly = plan.conceptSec === 0
        set({
          current: {
            id: uid(),
            unitId: unit.id,
            unitTitle: unit.title,
            plan,
            script: reviewOnly ? [] : generateScript({ unit, targetSec: plan.conceptSec }),
            listenIndex: 0,
            phase: reviewOnly ? PHASE.QUIZ_SETUP : PHASE.LISTEN,
            conceptRemainingSec: plan.conceptSec,
            quizRemainingSec: plan.quizSec,
            warned: false,
            types: [],
            difficulty: null,
            questions: [],
            answers: [],
            status: S.READY,
            startedAt: null,
          },
        })
      },

      // READY -> IN_PROGRESS (출발)
      start: () =>
        set((s) =>
          s.current?.status === S.READY
            ? { current: { ...s.current, status: S.IN_PROGRESS, startedAt: Date.now() } }
            : s,
        ),

      setListenIndex: (i) =>
        set((s) => (s.current ? { current: { ...s.current, listenIndex: i } } : s)),

      // 개념 듣기 건너뛰기: 남은 개념 시간은 문제 풀이 시간에 더한다
      skipListening: () =>
        set((s) => {
          const cur = s.current
          if (!cur || cur.phase !== PHASE.LISTEN) return s
          return {
            current: {
              ...cur,
              phase: PHASE.QUIZ_SETUP,
              quizRemainingSec: cur.quizRemainingSec + cur.conceptRemainingSec,
              conceptRemainingSec: 0,
            },
          }
        }),

      // 문제 설정 완료 -> 문제 풀이 시작
      startQuiz: ({ types, difficulty, count }) => {
        const cur = get().current
        if (!cur || cur.phase !== PHASE.QUIZ_SETUP) return
        const questions = generateQuestions({ unitTitle: cur.unitTitle, types, count })
        set({
          current: { ...cur, phase: PHASE.QUIZ, types, difficulty, questions, answers: [] },
        })
      },

      // 답안 제출. 마지막 문제면 COMPLETED
      submitAnswer: (value) => {
        const cur = get().current
        if (!cur || cur.status !== S.IN_PROGRESS || cur.phase !== PHASE.QUIZ) return null

        const idx = cur.answers.length
        const q = cur.questions[idx]
        if (!q) return null

        const correct = judge(q, value)
        const answers = [...cur.answers, { questionId: q.id, value, correct }]
        const isLast = idx === cur.questions.length - 1

        let wrongNotes = get().wrongNotes
        if (!correct) {
          wrongNotes = [
            ...wrongNotes,
            {
              id: uid(),
              questionId: q.id,
              unitId: cur.unitId,
              prompt: q.prompt,
              answer: q.answer,
              status: WRONG_STATUS.OPEN,
            },
          ]
        }

        const next = { ...cur, answers, status: isLast ? S.COMPLETED : S.IN_PROGRESS }
        const patch = { current: next, wrongNotes }
        if (isLast) {
          patch.unitProgress = {
            ...get().unitProgress,
            [cur.unitId]: {
              solved: answers.filter((a) => a.correct).length,
              total: cur.questions.length,
            },
          }
          patch.history = [next, ...get().history]
        }
        set(patch)
        return { correct, completed: isLast, question: q }
      },

      // 1초마다 호출. 듣기 중이면 개념 시간, 문제 풀이 중이면 문제 시간이 줄어든다
      tick: () => {
        const cur = get().current
        if (!cur || cur.status !== S.IN_PROGRESS) return

        if (cur.phase === PHASE.LISTEN) {
          const left = cur.conceptRemainingSec - 1
          if (left <= 0) {
            set({ current: { ...cur, conceptRemainingSec: 0, phase: PHASE.QUIZ_SETUP } })
          } else {
            set({ current: { ...cur, conceptRemainingSec: left } })
          }
          return
        }

        if (cur.phase === PHASE.QUIZ) {
          const left = cur.quizRemainingSec - 1
          if (left <= 0) {
            set({ current: { ...cur, quizRemainingSec: 0 } })
            get().endSession()
            return
          }
          const shouldWarn = cur.plan.totalSec > WARNING_SEC * 2 && left <= WARNING_SEC
          set({ current: { ...cur, quizRemainingSec: left, warned: cur.warned || shouldWarn } })
        }
      },

      // 중도 종료 / 시간 종료
      endSession: () => {
        const cur = get().current
        if (!cur || cur.status === S.COMPLETED || cur.status === S.ENDED) return
        const ended = { ...cur, status: S.ENDED }
        set({
          current: ended,
          history: cur.answers.length > 0 ? [ended, ...get().history] : get().history,
        })
      },

      clearCurrent: () => set({ current: null }),

      getResumable: () => {
        const cur = get().current
        return cur?.status === S.IN_PROGRESS ? cur : null
      },
    }),
    {
      name: 'cs:session',
      version: 2,
      // 예전 구조의 세션은 버린다 (오답과 진도는 유지)
      migrate: (persisted) => ({ ...persisted, current: null }),
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        current: s.current,
        history: s.history,
        wrongNotes: s.wrongNotes,
        unitProgress: s.unitProgress,
      }),
    },
  ),
)

// 세션 단계에 맞는 화면 경로
export function getSessionRoute(cur) {
  if (!cur || cur.status === S.COMPLETED || cur.status === S.ENDED) return ROUTES.HOME
  if (cur.phase === PHASE.LISTEN) return ROUTES.LISTEN
  if (cur.phase === PHASE.QUIZ_SETUP) return ROUTES.SETUP
  return ROUTES.PLAYER
}

export function resumeMessage(cur) {
  if (cur.phase === PHASE.LISTEN) {
    return `지난번 ${cur.unitTitle} 개념 듣기를 하던 중이었어요. 이어서 할까요?`
  }
  if (cur.phase === PHASE.QUIZ_SETUP) {
    return `지난번 ${cur.unitTitle} 문제 풀이를 시작하려던 참이었어요. 이어서 할까요?`
  }
  return `지난번 ${cur.unitTitle} ${cur.answers.length}/${cur.questions.length}문제까지 풀었어요. 이어서 할까요?`
}
