import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { ApiError } from '../lib/api'
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
import {
  createSession as apiCreateSession,
  endSession as apiEndSession,
  getCurrentSession,
  getWrongNotes,
  judgeAnswer,
  saveAttempts,
  startSession as apiStartSession,
} from '../lib/endpoints'
import { getTimePlan, recommendCount } from '../lib/plan'
import {
  DIFFICULTY_LEVEL,
  fromServerQuestion,
  summaryToScript,
  toServerAnswer,
  toServerTypes,
} from '../lib/question'
import { getOpenNotes, MAX_SESSION_QUESTIONS, pickReviewNotes } from '../lib/review'
import { supabase } from '../lib/supabase'
import { zustandStorage, uid } from '../lib/storage'
import { generateQuestions } from '../mocks/mockQuiz'
import { generateScript } from '../mocks/mockScript'
import { useMaterialStore } from './useMaterialStore'

const SUMMARY_SEC = 180 // 서버는 CURRICULUM 세션에서 요약 3분을 빼고 문제 수를 정한다

const norm = (v) => String(v).trim().toLowerCase()
const judgeLocal = (q, a) => (q.type === T.SHORT ? norm(q.answer) === norm(a) : q.answer === a)

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
      subjectId: cur.subjectId ?? null,
      question: q, // 다시 풀 수 있게 문제 전체를 저장
      status: WRONG_STATUS.OPEN,
      wrongCount: 1,
      lastWrongAt: now,
      resolvedAt: null,
    },
  ]
}

// 서버 오답 -> 화면 오답노트 형식
function fromServerNote(item, subjectId, unitTitles) {
  const lastWrongAt = item.lastWrongAt ? Date.parse(item.lastWrongAt) : Date.now()
  const resolved = item.status === WRONG_STATUS.RESOLVED
  return {
    id: String(item.questionId),
    questionId: item.questionId,
    unitId: item.categoryId,
    unitTitle: unitTitles[item.categoryId] ?? '',
    subjectId,
    // 서버 오답에는 유형·정답이 없다. 해설은 화면에서 따로 조회한다
    question: { id: item.questionId, type: null, prompt: item.stem ?? '', answer: null },
    status: item.status,
    wrongCount: item.wrongCount ?? 1,
    lastWrongAt,
    resolvedAt: resolved ? lastWrongAt : null,
  }
}

let flushing = Promise.resolve()

export const useSessionStore = create(
  persist(
    (set, get) => {
      // 기기에 쌓인 답안을 서버로 보낸다. 실패하면 남겨 두고 다음에 다시 보낸다
      const flushAttempts = () => {
        flushing = flushing.then(async () => {
          const pending = get().pendingAttempts
          if (!supabase || pending.length === 0) return
          const bySession = {}
          for (const a of pending) (bySession[a.sessionId] ??= []).push(a)
          for (const [sessionId, list] of Object.entries(bySession)) {
            try {
              for (let i = 0; i < list.length; i += 100) {
                const chunk = list.slice(i, i + 100)
                await saveAttempts({
                  sessionId: Number(sessionId),
                  attempts: chunk.map((a) => {
                    const { sessionId: _s, key: _k, ...rest } = a // eslint-disable-line no-unused-vars
                    return rest
                  }),
                })
                const sent = new Set(chunk.map((a) => a.key))
                set((s) => ({ pendingAttempts: s.pendingAttempts.filter((a) => !sent.has(a.key)) }))
              }
            } catch (err) {
              // 없는 세션·문제(404)는 다시 보내도 실패하니 버린다
              if (err instanceof ApiError && err.status === 404) {
                set((s) => ({
                  pendingAttempts: s.pendingAttempts.filter(
                    (a) => String(a.sessionId) !== sessionId,
                  ),
                }))
              }
            }
          }
        })
        return flushing
      }

      // 답 하나를 기록한다 (채점이 끝난 뒤)
      const recordAnswer = (value, correct, { reason = null, selfJudged = false } = {}) => {
        const cur = get().current
        if (!cur || cur.status !== S.IN_PROGRESS || cur.phase !== PHASE.QUIZ) return null
        const idx = cur.answers.length
        const q = cur.questions[idx]
        if (!q) return null

        const isReview = cur.mode === 'review'
        const now = Date.now()
        const answers = [...cur.answers, { questionId: q.id, value, correct, reason }]
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

        if (cur.serverId) {
          const attempt = {
            key: uid(),
            sessionId: cur.serverId,
            questionId: q.id,
            answer: toServerAnswer(q, value),
            answeredAt: new Date(now).toISOString(),
          }
          // O/X·객관식은 서버가 다시 채점한다. 단답만 판정 결과를 보낸다
          if (q.type === T.SHORT) {
            attempt.correct = correct
            if (selfJudged) attempt.selfJudged = true
          }
          patch.pendingAttempts = [...get().pendingAttempts, attempt]
        }

        if (isLast) {
          if (!isReview && !cur.serverId) {
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
        if (cur.serverId) flushAttempts()
        return { correct, reason, completed: isLast, question: q }
      }

      return {
        current: null,
        history: [],
        wrongNotes: [],
        unitProgress: {},
        dailyStats: {}, // { 'YYYY-MM-DD': { answered, correct } } 한국 시간 기준
        pendingAttempts: [], // 서버로 아직 못 보낸 답안

        // 세션을 만들고 바로 출발(IN_PROGRESS)한다
        // draft: { source: 'categories'|'wrongNotes', categoryIds, unitId, unitTitle, subjectId }
        createSession: async ({
          draft,
          solveMode = SOLVE_MODE.READ,
          types,
          difficulty,
          studyMin,
        }) => {
          const isReview = draft.source === 'wrongNotes'
          let serverId = null
          let questions
          let script
          let plan
          let shortage = null

          if (supabase) {
            const body = {
              source: draft.source,
              questionTypes: toServerTypes(types),
              difficulty: DIFFICULTY_LEVEL[difficulty] ?? 2,
            }
            if (!isReview) body.categoryIds = draft.categoryIds
            const res = await apiCreateSession(body)
            if (res.noReviewItems) {
              throw new ApiError(422, {
                message: '아직 복습할 문제가 없어요. 먼저 단원을 풀어 보세요.',
              })
            }
            questions = (res.questions ?? []).map(fromServerQuestion)
            if (questions.length === 0) {
              throw new ApiError(422, { message: '풀 수 있는 문제가 없어요.' })
            }
            await apiStartSession(res.sessionId)
            serverId = res.sessionId
            shortage = res.shortage ?? null
            script = summaryToScript(res.summary)
            const totalSec = (res.studyMin ?? studyMin) * 60
            const conceptSec = script.length > 0 ? Math.min(SUMMARY_SEC, totalSec) : 0
            plan = { totalSec, conceptSec, quizSec: totalSec - conceptSec }
          } else {
            plan = getTimePlan(studyMin)
            if (isReview) plan = { totalSec: plan.totalSec, conceptSec: 0, quizSec: plan.totalSec }
            if (isReview) {
              const open = getOpenNotes(get().wrongNotes).filter(
                (n) => !n.question.type || types.includes(n.question.type),
              )
              questions = pickReviewNotes(open, plan.quizSec).picked.map((n) => n.question)
              if (questions.length === 0) {
                throw new ApiError(422, { message: '고른 유형의 오답이 없어요.' })
              }
            } else {
              const count = Math.min(MAX_SESSION_QUESTIONS, recommendCount(types, plan.quizSec))
              questions = generateQuestions({ unitTitle: draft.unitTitle, types, count })
            }
            script =
              plan.conceptSec > 0
                ? generateScript({ unit: { title: draft.unitTitle }, targetSec: plan.conceptSec })
                : []
          }

          // 하던 세션은 끝낸다 (서버는 새 세션 시작 시 알아서 끝낸다)
          const prev = get().current
          if (prev?.status === S.IN_PROGRESS) {
            set({ current: { ...prev, status: S.ENDED } })
          }

          const listening = script.length > 0
          set({
            current: {
              id: serverId ? String(serverId) : uid(),
              serverId,
              mode: isReview ? 'review' : 'curriculum',
              source: draft.source,
              categoryIds: draft.categoryIds ?? [],
              unitId: isReview ? 'review' : draft.unitId,
              unitTitle: isReview ? '오답 복습' : draft.unitTitle,
              subjectId: draft.subjectId ?? null,
              plan,
              script,
              listenIndex: 0,
              phase: listening ? PHASE.LISTEN : PHASE.QUIZ,
              conceptRemainingSec: plan.conceptSec,
              quizRemainingSec: plan.quizSec,
              warned: false,
              solveMode,
              types,
              difficulty,
              questions,
              answers: [],
              shortage,
              status: S.IN_PROGRESS,
              startedAt: Date.now(),
            },
          })
          return get().current
        },

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
                phase: PHASE.QUIZ,
                quizRemainingSec: cur.quizRemainingSec + cur.conceptRemainingSec,
                conceptRemainingSec: 0,
              },
            }
          }),

        // 답안 채점. 단답형은 서버 판정 API를 쓰고, AI가 늦으면 자가 판정이 필요하다
        // -> { correct, reason, completed, question } | { needsSelfJudge: true, question }
        submitAnswer: async (value) => {
          const cur = get().current
          if (!cur || cur.status !== S.IN_PROGRESS || cur.phase !== PHASE.QUIZ) return null
          const q = cur.questions[cur.answers.length]
          if (!q) return null

          if (cur.serverId && q.type === T.SHORT) {
            let res
            try {
              res = await judgeAnswer(q.id, String(value).slice(0, 30))
            } catch {
              res = { correct: null, timeout: true }
            }
            if (res.correct == null) return { needsSelfJudge: true, question: q }
            return recordAnswer(value, res.correct, { reason: res.reason ?? null })
          }
          return recordAnswer(value, judgeLocal(q, value))
        },

        // 판정이 안 됐을 때 사용자가 맞음/틀림을 고른다
        selfJudge: (value, correct) => recordAnswer(value, correct, { selfJudged: true }),

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
          // 답안을 보내지 않으니 서버 세션은 직접 끝낸다
          if (isLast && cur.serverId) apiEndSession(cur.serverId, 'ARRIVED').catch(() => {})
          return { completed: isLast }
        },

        // 1초마다 호출. 듣기 중이면 개념 시간, 문제 풀이 중이면 문제 시간이 줄어든다
        tick: () => {
          const cur = get().current
          if (!cur || cur.status !== S.IN_PROGRESS) return

          if (cur.phase === PHASE.LISTEN) {
            const left = cur.conceptRemainingSec - 1
            if (left <= 0) {
              set({ current: { ...cur, conceptRemainingSec: 0, phase: PHASE.QUIZ } })
            } else {
              set({ current: { ...cur, conceptRemainingSec: left } })
            }
            return
          }

          if (cur.phase === PHASE.QUIZ) {
            const left = cur.quizRemainingSec - 1
            if (left <= 0) {
              set({ current: { ...cur, quizRemainingSec: 0 } })
              get().endSession('ARRIVED')
              return
            }
            const shouldWarn = cur.plan.totalSec > WARNING_SEC * 2 && left <= WARNING_SEC
            set({ current: { ...cur, quizRemainingSec: left, warned: cur.warned || shouldWarn } })
          }
        },

        // 중도 종료 / 시간 종료. reason: QUIT(그만하기) | ARRIVED(도착·시간 종료) | NEW_START
        endSession: (reason = 'QUIT') => {
          const cur = get().current
          if (!cur || cur.status === S.COMPLETED || cur.status === S.ENDED) return
          const ended = { ...cur, status: S.ENDED }
          set({
            current: ended,
            history: cur.answers.length > 0 ? [ended, ...get().history] : get().history,
          })
          // 쌓인 답안을 먼저 보내야 피드백에 반영된다
          if (cur.serverId) {
            flushAttempts()
              .then(() => apiEndSession(cur.serverId, reason))
              .catch(() => {})
          }
        },

        flushAttempts,

        clearCurrent: () => set({ current: null }),

        getResumable: () => {
          const cur = get().current
          return cur?.status === S.IN_PROGRESS ? cur : null
        },

        // 서버가 세션을 끝냈으면(다음 날 자동 종료 등) 기기의 진행 중 세션도 정리한다
        syncCurrent: async () => {
          if (!supabase) return
          const cur = get().current
          if (cur?.status !== S.IN_PROGRESS || !cur.serverId) return
          const res = await getCurrentSession()
          if (!res || res.sessionId !== cur.serverId) {
            set({ current: { ...cur, status: S.ENDED } })
          }
        },

        // 서버 오답노트로 바꾼다 (모든 과목)
        syncWrongNotes: async () => {
          if (!supabase) return
          const { subjects, categories } = useMaterialStore.getState()
          const unitTitles = {}
          for (const units of Object.values(categories)) {
            for (const u of units) unitTitles[u.categoryId] = u.title
          }
          const results = await Promise.all(
            subjects.map((s) =>
              getWrongNotes(s.id)
                .then((res) => (res?.items ?? []).map((i) => fromServerNote(i, s.id, unitTitles)))
                .catch(() => null),
            ),
          )
          if (results.some((r) => r === null)) return
          set({ wrongNotes: results.flat() })
        },
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
      }),
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        current: s.current,
        history: s.history,
        wrongNotes: s.wrongNotes,
        unitProgress: s.unitProgress,
        dailyStats: s.dailyStats,
        pendingAttempts: s.pendingAttempts,
      }),
    },
  ),
)

// 세션 단계에 맞는 화면 경로
export function getSessionRoute(cur) {
  if (!cur || cur.status === S.COMPLETED || cur.status === S.ENDED) return ROUTES.HOME
  if (cur.phase === PHASE.LISTEN) return ROUTES.LISTEN
  return ROUTES.PLAYER
}

export function resumeMessage(cur) {
  if (cur.phase === PHASE.LISTEN) {
    return `지난번 ${cur.unitTitle} 개념 듣기를 하던 중이었어요. 이어서 할까요?`
  }
  return `지난번 ${cur.unitTitle} ${cur.answers.length}/${cur.questions.length}문제까지 풀었어요. 이어서 할까요?`
}
