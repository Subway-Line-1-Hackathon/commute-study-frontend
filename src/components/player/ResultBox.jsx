import correctMascot from '../../assets/mascot-correct.png'
import wrongMascot from '../../assets/mascot-wrong.png'
import { useExplanation } from '../../hooks/useExplanation'
import { choiceLabel } from '../../lib/question'
import AskAi from '../AskAi'

function Verdict({ correct, question, myAnswer }) {
  const mine = choiceLabel(question, myAnswer)
  const answer = choiceLabel(question, question.answer)

  let detail = ''
  if (!correct && mine && answer) detail = `내 답 ${mine} · 정답 ${answer}`
  if (!correct && !mine && answer) detail = `정답 ${answer}`
  if (correct && answer) detail = `정답 ${answer}`

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${
        correct ? 'border-success/20 bg-success-soft' : 'border-danger/20 bg-danger-soft'
      }`}
    >
      <img src={correct ? correctMascot : wrongMascot} alt="" className="h-10 w-10 shrink-0" />
      <div className="min-w-0">
        <p className={`text-question leading-tight ${correct ? 'text-success' : 'text-danger'}`}>
          {correct ? '정답이에요' : '오답이에요'}
        </p>
        {detail && <p className="mt-0.5 text-caption text-ink">{detail}</p>}
      </div>
    </div>
  )
}

// 채점 결과. 해설이 없으면(서버 단답형) 서버에서 조회한다
export default function ResultBox({ feedback, myAnswer }) {
  const { question, correct, reason } = feedback
  const { explanation, sourcePage } = useExplanation(question)
  const hasExplanation = Boolean(reason || explanation)

  return (
    <div className="mt-4 space-y-3">
      <Verdict correct={correct} question={question} myAnswer={myAnswer} />

      {hasExplanation && (
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-body font-bold text-ink">해설</p>
          {reason && <p className="mt-2 text-body leading-7 text-ink">{reason}</p>}
          {explanation && <p className="mt-2 text-body leading-7 text-ink">{explanation}</p>}
          {sourcePage != null && (
            <span className="mt-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-caption font-bold text-primary">
              자료 p.{sourcePage} 참고
            </span>
          )}
        </div>
      )}

      {!correct && <AskAi questionId={question.id} />}
    </div>
  )
}
