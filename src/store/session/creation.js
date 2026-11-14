import { ApiError } from '../../lib/api'
import { PHASE, SESSION_STATUS as S, SOLVE_MODE } from '../../lib/constants'
import {
  createSession as apiCreateSession,
  startSession as apiStartSession,
} from '../../lib/endpoints'
import { getTimePlan, recommendCount } from '../../lib/plan'
import {
  DIFFICULTY_LEVEL,
  fromServerQuestion,
  summaryToScript,
  toServerTypes,
} from '../../lib/question'
import { getOpenNotes, MAX_SESSION_QUESTIONS, pickReviewNotes } from '../../lib/review'
import { supabase } from '../../lib/supabase'
import { uid } from '../../lib/storage'
import { generateQuestions } from '../../mocks/mockQuiz'
import { generateScript } from '../../mocks/mockScript'

const SUMMARY_SEC = 180

export function createSessionCreation(set, get) {
  return {
    createSession: async ({ draft, solveMode = SOLVE_MODE.READ, types, difficulty, studyMin }) => {
      const isReview = draft.source === 'wrongNotes'
      let serverId = null
      let questions
      let script
      let plan
      let shortage = null

      if (supabase) {
        // 서버 모드: 서버가 문제와 요약을 만들어 준다
        const body = {
          source: draft.source,
          questionTypes: toServerTypes(types),
          difficulty: DIFFICULTY_LEVEL[difficulty] ?? 2,
        }
        // 오답 복습은 단원을 골랐을 때만 보낸다 (안 보내면 전체 오답)
        if (!isReview || draft.categoryIds?.length) body.categoryIds = draft.categoryIds
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
        // 요약이 있으면 개념 듣기 최대 3분, 나머지는 문제 풀이 시간
        const totalSec = (res.studyMin ?? studyMin) * 60
        const conceptSec = script.length > 0 ? Math.min(SUMMARY_SEC, totalSec) : 0
        plan = { totalSec, conceptSec, quizSec: totalSec - conceptSec }
      } else {
        // Mock 모드: 시간 계획을 직접 계산하고 가짜 문제·대본을 만든다. 복습은 개념 듣기 없이 문제만
        plan = getTimePlan(studyMin)
        if (isReview) plan = { totalSec: plan.totalSec, conceptSec: 0, quizSec: plan.totalSec }
        if (isReview) {
          const unitIds = draft.unitIds ?? []
          const open = getOpenNotes(get().wrongNotes)
            .filter((n) => !n.question.type || types.includes(n.question.type))
            .filter((n) => unitIds.length === 0 || unitIds.includes(n.unitId))
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

      // 들을 대본이 있으면 개념 듣기부터, 없으면 바로 문제 풀이
      const listening = script.length > 0
      set({
        current: {
          id: serverId ? String(serverId) : uid(), // 화면용 id
          serverId, // 서버 세션 id (Mock이면 null)
          mode: isReview ? 'review' : 'curriculum', // 오답 복습 / 단원 학습
          source: draft.source,
          categoryIds: draft.categoryIds ?? [],
          unitId: isReview ? 'review' : draft.unitId,
          unitTitle: isReview ? '오답 복습' : draft.unitTitle,
          subjectId: draft.subjectId ?? null,
          plan, // { totalSec, conceptSec, quizSec }
          script, // 개념 듣기 문단 [{ id, text, sourcePage }]
          listenIndex: 0, // 지금 읽고 있는 문단 번호 (이어 듣기용)
          phase: listening ? PHASE.LISTEN : PHASE.QUIZ,
          conceptRemainingSec: plan.conceptSec, // 남은 개념 듣기 시간
          quizRemainingSec: plan.quizSec, // 남은 문제 풀이 시간
          warned: false, // "곧 끝나요" 알림을 띄웠는지
          solveMode, // 눈으로 풀기 / 듣고 풀기
          types,
          difficulty,
          questions,
          answers: [], // [{ questionId, value, correct, reason }]
          shortage, // 서버가 요청보다 문제를 적게 줬을 때의 정보
          status: S.IN_PROGRESS,
          startedAt: Date.now(),
        },
      })
      return get().current
    },
  }
}
