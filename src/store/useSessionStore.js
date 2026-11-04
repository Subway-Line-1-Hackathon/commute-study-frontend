import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { SESSION_STATUS as S, WRONG_STATUS, QUESTION_TYPE as T } from '../lib/constants'
import { zustandStorage, uid } from '../lib/storage'
import { generateQuestions } from '../mocks/mockQuiz'

const norm = (v) => String(v).trim().toLowerCase()
const judge = (q, a) => (q.type === T.SHORT ? norm(q.answer) === norm(a) : q.answer === a)

export const useSessionStore = create(
  persist(
    (set, get) => ({
      current: null,
      history: [],
      wrongNotes: [],
      unitProgress: {},

      createSession: ({ unit, types, difficulty, count = 5, studyMin }) => {
        const questions = generateQuestions({ unitTitle: unit.title, types, count })
        set({
          current: {
            id: uid(),
            unitId: unit.id,
            unitTitle: unit.title,
            types,
            difficulty,
            questions,
            answers: [],
            currentIndex: 0,
            remainingSec: studyMin * 60,
            status: S.READY,
            startedAt: null,
          },
        })
      },

      start: () =>
        set((s) =>
          s.current?.status === S.READY
            ? { current: { ...s.current, status: S.IN_PROGRESS, startedAt: Date.now() } }
            : s,
        ),

      submitAnswer: (value) => {
        const cur = get().current
        if (!cur || cur.status !== S.IN_PROGRESS) return null
        const q = cur.questions[cur.currentIndex]
        const correct = judge(q, value)
        const answers = [...cur.answers, { questionId: q.id, value, correct }]
        const isLast = cur.currentIndex === cur.questions.length - 1

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
        return { correct, completed: isLast, explanation: q.explanation }
      },

      next: () =>
        set((s) =>
          s.current && s.current.status === S.IN_PROGRESS
            ? { current: { ...s.current, currentIndex: s.current.currentIndex + 1 } }
            : s,
        ),

      tick: () => {
        const cur = get().current
        if (!cur || cur.status !== S.IN_PROGRESS) return
        if (cur.remainingSec <= 1) return get().endSession()
        set({ current: { ...cur, remainingSec: cur.remainingSec - 1 } })
      },

      endSession: () => {
        const cur = get().current
        if (!cur) return
        const ended = { ...cur, status: S.ENDED, remainingSec: Math.max(0, cur.remainingSec) }
        set({ current: ended, history: [ended, ...get().history] })
      },

      clearCurrent: () => set({ current: null }),

      getResumable: () => {
        const cur = get().current
        return cur?.status === S.IN_PROGRESS ? cur : null
      },
    }),
    {
      name: 'cs:session',
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

export const resumeMessage = (cur) =>
  `지난번 ${cur.unitTitle} ${cur.answers.length}/${cur.questions.length}문제까지 풀었어요. 이어서 할까요?`
