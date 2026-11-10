import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  PHASE,
  ROUTES,
  SESSION_STATUS as S,
  WARNING_SEC,
  WRONG_STATUS,
  SOLVE_MODE,
  QUESTION_TYPE as T,
} from '../lib/constants'
import { kstDateKey } from '../lib/date'
import { getTimePlan } from '../lib/plan'
import { zustandStorage, uid } from '../lib/storage'
import { generateQuestions } from '../mocks/mockQuiz'
import { generateScript } from '../mocks/mockScript'

const norm = (v) => String(v).trim().toLowerCase()
const judge = (q, a) => (q.type === T.SHORT ? norm(q.answer) === norm(a) : q.answer === a)

// 틀린 문제를 오답노트에 반영. 이미 있으면 OPEN으로 되돌리고 횟수만 올린다
function upsertWrong(notes, q, cur, now) {
  const exist = notes.find((n) => n.questionId === q.id)
  if (exist) {
    return notes.map((n) =>
      n.id === exist.id
        ? {
            ...n,
            status: WRONG_STATUS.OPEN,
            wrongCount: n.wrongCount + 1,
            lastWrongAt: now,
            resolvedAt: null,
          }
        : n,
    )
  }
  return [
    ...notes,
    {
      id: uid(),
      questionId: q.id,
      unitId: cur.unitId,
      unitTitle: cur.unitTitle,
      question: q, // 다시 풀 수 있게 문제 전체를 저장
      status: WRONG_STATUS.OPEN,
      wrongCount: 1,
      lastWrongAt: now,
      resolvedAt: null,
    },
  ]
}

export const useSessionStore = create(
  persist(
    (set, get) => ({
      current: null,
      history: [],
      wrongNotes: [],
      unitProgress: {},
      dailyStats: {}, // { 'YYYY-MM-DD': { answered, correct } } 한국 시간 기준

      // 일반 학습 세션. 20분 미만(개념 시간 0)이면 듣기 없이 문제 설정으로 시작
      createSession: ({ unit, studyMin }) => {
        const plan = getTimePlan(studyMin)
        const reviewOnly = plan.conceptSec === 0
        set({
          current: {
            id: uid(),
            mode: 'curriculum',
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

      // 오답 복습 세션: 개념 듣기 없이 학습 가능 시간 전체를 문제에 쓴다
      createReviewSession: ({ questions, studyMin }) => {
        const quizSec = studyMin * 60
        set({
          current: {
            id: uid(),
            mode: 'review',
            unitId: 'review',
            unitTitle: '오답 복습',
            plan: { totalSec: quizSec, conceptSec: 0, quizSec, conceptRatio: 0 },
            script: [],
            listenIndex: 0,
            phase: PHASE.QUIZ,
            conceptRemainingSec: 0,
            quizRemainingSec: quizSec,
            warned: false,
            types: [],
            difficulty: null,
            questions,
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
      startQuiz: ({ solveMode = SOLVE_MODE.READ, types, difficulty, count }) => {
        const cur = get().current
        if (!cur || cur.phase !== PHASE.QUIZ_SETUP) return
        const questions = generateQuestions({ unitTitle: cur.unitTitle, types, count })
        set({
          current: {
            ...cur,
            phase: PHASE.QUIZ,
            solveMode,
            types,
            difficulty,
            questions,
            answers: [],
          },
        })
      },

      // 답안 제출. 마지막 문제면 COMPLETED
      submitAnswer: (value) => {
        const cur = get().current
        if (!cur || cur.status !== S.IN_PROGRESS || cur.phase !== PHASE.QUIZ) return null

        const idx = cur.answers.length
        const q = cur.questions[idx]
        if (!q) return null

        const isReview = cur.mode === 'review'
        const now = Date.now()
        const correct = judge(q, value)
        const answers = [...cur.answers, { questionId: q.id, value, correct }]
        const isLast = idx === cur.questions.length - 1

        // 오답노트: 틀리면 OPEN(+횟수), 복습에서 맞히면 RESOLVED
        let wrongNotes = get().wrongNotes
        if (!correct) {
          wrongNotes = upsertWrong(wrongNotes, q, cur, now)
        } else if (isReview) {
          wrongNotes = wrongNotes.map((n) =>
            n.questionId === q.id ? { ...n, status: WRONG_STATUS.RESOLVED, resolvedAt: now } : n,
          )
        }

        // 하루 합산 정답률 기록 (복습 응답도 포함)
        const key = kstDateKey(now)
        const prev = get().dailyStats[key] ?? { answered: 0, correct: 0 }
        const dailyStats = {
          ...get().dailyStats,
          [key]: { answered: prev.answered + 1, correct: prev.correct + (correct ? 1 : 0) },
        }

        const next = { ...cur, answers, status: isLast ? S.COMPLETED : S.IN_PROGRESS }
        const patch = { current: next, wrongNotes, dailyStats }
        if (isLast) {
          if (!isReview) {
            patch.unitProgress = {
              ...get().unitProgress,
              [cur.unitId]: {
                solved: answers.filter((a) => a.correct).length,
                total: cur.questions.length,
              },
            }
          }
          patch.history = [next, ...get().history]
        }
        set(patch)
        return { correct, completed: isLast, question: q }
      },

      // 듣고 풀기: 채점 없이 다음 문제로. 오답노트/정답률에는 넣지 않는다
      advanceListen: () => {
        const cur = get().current
        if (!cur || cur.status !== S.IN_PROGRESS || cur.phase !== PHASE.QUIZ) return null
        const idx = cur.answers.length
        const q = cur.questions[idx]
        if (!q) return null
        const answers = [
          ...cur.answers,
          { questionId: q.id, value: null, correct: null, listened: true },
        ]
        const isLast = idx === cur.questions.length - 1
        const next = { ...cur, answers, status: isLast ? S.COMPLETED : S.IN_PROGRESS }
        set(isLast ? { current: next, history: [next, ...get().history] } : { current: next })
        return { completed: isLast }
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
      version: 3,
      // 예전 구조는 정리한다 (오답은 다시 풀 수 있는 형태가 아니라 비운다)
      migrate: (persisted, version) => ({
        ...persisted,
        current: version < 2 ? null : persisted.current,
        wrongNotes: [],
        dailyStats: persisted.dailyStats ?? {},
      }),
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        current: s.current,
        history: s.history,
        wrongNotes: s.wrongNotes,
        unitProgress: s.unitProgress,
        dailyStats: s.dailyStats,
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
