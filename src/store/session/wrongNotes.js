import { QUESTION_TYPE as T, WRONG_STATUS } from '../../lib/constants'
import { fromServerQuestion } from '../../lib/question'
import { uid } from '../../lib/storage'

export function upsertWrong(notes, q, cur, now) {
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

export function fromServerNote(item, subjectId, unitTitles) {
  const lastWrongAt = item.lastWrongAt ? Date.parse(item.lastWrongAt) : Date.now()
  const resolved = item.status === WRONG_STATUS.RESOLVED
  // 서버 오답에는 해설이 없다. 해설은 화면에서 따로 조회한다
  const question = fromServerQuestion({
    id: item.questionId,
    type: item.type,
    stem: item.stem,
    choices: item.choices,
    answer: item.answer,
    sourcePage: item.sourcePage,
  })
  // 객관식 내 답도 번호("1")로 와서 보기 글자로 바꾼다
  let lastAnswer = item.lastAnswer ?? null
  if (lastAnswer != null && question.type === T.MCQ) {
    lastAnswer = question.choices[Number(lastAnswer) - 1] ?? lastAnswer
  }
  return {
    id: String(item.questionId),
    questionId: item.questionId,
    unitId: item.categoryId,
    unitTitle: item.categoryName ?? unitTitles[item.categoryId] ?? '',
    subjectId,
    question,
    lastAnswer,
    status: item.status,
    wrongCount: item.wrongCount ?? 1,
    lastWrongAt,
    resolvedAt: resolved ? lastWrongAt : null,
  }
}
