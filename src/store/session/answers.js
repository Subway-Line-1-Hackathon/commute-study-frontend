import { PHASE, SESSION_STATUS as S, QUESTION_TYPE as T, WRONG_STATUS } from '../../lib/constants'
import { kstDateKey } from '../../lib/date'
import { judgeAnswer } from '../../lib/endpoints'
import { toServerAnswer } from '../../lib/question'
import { uid } from '../../lib/storage'
import { prepareAnswer } from '../../lib/answer'
import { upsertWrong } from './wrongNotes'
const norm = (v) => String(v).trim().toLowerCase()
const judgeLocal = (q, a) => (q.type === T.SHORT ? norm(q.answer) === norm(a) : q.answer === a)
export function createSessionAnswers(set, get, flushAttempts) {
  const recordAnswer = (value, correct, { reason = null, selfJudged = false } = {}) => {
    const cur = get().current
    if (!cur || cur.status !== S.IN_PROGRESS || cur.phase !== PHASE.QUIZ) return null
    // 지금까지 답한 개수 = 지금 풀고 있는 문제 번호
    const idx = cur.answers.length
    const q = cur.questions[idx]
    if (!q) return null
    value = prepareAnswer(q, value)
    const isReview = cur.mode === 'review'
    const now = Date.now()
    const answers = [
      ...cur.answers,
      {
        questionId: q.id,
        value,
        correct,
        reason,
      },
    ]
    const isLast = idx === cur.questions.length - 1

    // 오답노트: 틀리면 OPEN(+횟수), 복습에서 맞히면 RESOLVED
    let wrongNotes = get().wrongNotes
    if (!correct) {
      wrongNotes = upsertWrong(wrongNotes, q, cur, now)
    } else if (isReview) {
      wrongNotes = wrongNotes.map((n) =>
        n.questionId === q.id
          ? {
              ...n,
              status: WRONG_STATUS.RESOLVED,
              resolvedAt: now,
            }
          : n,
      )
    }

    // 하루 합산 정답률 기록 (복습 응답도 포함)
    const key = kstDateKey(now)
    const prev = get().dailyStats[key] ?? {
      answered: 0,
      correct: 0,
    }
    const dailyStats = {
      ...get().dailyStats,
      [key]: {
        answered: prev.answered + 1,
        correct: prev.correct + (correct ? 1 : 0),
      },
    }
    const next = {
      ...cur,
      answers,
      status: isLast ? S.COMPLETED : S.IN_PROGRESS,
    }
    const patch = {
      current: next,
      wrongNotes,
      dailyStats,
    }
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
      patch.history = [next, ...get().history]
    }
    set(patch)
    if (cur.serverId) flushAttempts().catch(() => {})
    return {
      correct,
      reason,
      completed: isLast,
      question: q,
    }
  }
  return {
    submitAnswer: async (value) => {
      const cur = get().current
      if (!cur || cur.status !== S.IN_PROGRESS || cur.phase !== PHASE.QUIZ) return null
      const q = cur.questions[cur.answers.length]
      if (!q) return null
      value = prepareAnswer(q, value)
      if (cur.serverId && q.type === T.SHORT) {
        let res
        try {
          res = await judgeAnswer(q.id, value)
        } catch {
          // 네트워크 오류도 판정 실패로 보고 자가 판정으로 넘긴다
          res = {
            correct: null,
            timeout: true,
          }
        }
        // 기다리는 동안 새 세션·다음 문제로 이동했으면 이전 판정을 반영하지 않는다.
        const latest = get().current
        if (
          latest?.id !== cur.id ||
          latest.status !== S.IN_PROGRESS ||
          latest.phase !== PHASE.QUIZ ||
          latest.answers.length !== cur.answers.length ||
          latest.questions[latest.answers.length]?.id !== q.id
        ) {
          return null
        }
        if (res.correct == null)
          return {
            needsSelfJudge: true,
            question: q,
          }
        return recordAnswer(value, res.correct, {
          reason: res.reason ?? null,
        })
      }
      return recordAnswer(value, judgeLocal(q, value))
    },
    selfJudge: (value, correct) =>
      recordAnswer(value, correct, {
        selfJudged: true,
      }),
    advanceListen: () => {
      const cur = get().current
      if (!cur || cur.status !== S.IN_PROGRESS || cur.phase !== PHASE.QUIZ) return null
      const idx = cur.answers.length
      const q = cur.questions[idx]
      if (!q) return null
      const answers = [
        ...cur.answers,
        {
          questionId: q.id,
          value: null,
          correct: null,
          listened: true,
        },
      ]
      const isLast = idx === cur.questions.length - 1
      const next = {
        ...cur,
        answers,
        status: isLast ? S.COMPLETED : S.IN_PROGRESS,
      }
      set(
        isLast
          ? {
              current: next,
              history: [next, ...get().history],
            }
          : {
              current: next,
            },
      )
      // 답안을 보내지 않으니 서버 세션은 직접 끝낸다
      if (isLast && cur.serverId)
        get()
          .queueSessionEnd(cur.serverId, 'ARRIVED')
          .catch(() => {})
      return {
        completed: isLast,
      }
    },
  }
}
