import { useExplanation } from '../../hooks/useExplanation'
import Button from '../Button'

// AI 판정이 늦거나 실패했을 때: 해설을 보여주고 맞음/틀림을 직접 고른다
export default function SelfJudgeBox({ question, value, onJudge }) {
  const { explanation, sourcePage } = useExplanation(question)

  return (
    <div className="mt-4 rounded-xl bg-warning-soft p-4 text-warning">
      <p className="text-body font-bold">자동 채점이 늦어지고 있어요</p>
      <p className="mt-1 text-caption">내 답: {value}</p>
      {question.answer && <p className="mt-1 text-caption">정답: {question.answer}</p>}
      {explanation && <p className="mt-2 text-caption text-ink">{explanation}</p>}
      {sourcePage != null && (
        <p className="mt-1 text-label font-normal text-muted">자료 {sourcePage}쪽</p>
      )}
      <p className="mt-3 text-caption">내 답이 맞았나요?</p>
      <div className="mt-2 flex gap-3">
        <Button onClick={() => onJudge(true)} className="flex-1">
          맞았어요
        </Button>
        <Button variant="secondary" onClick={() => onJudge(false)} className="flex-1">
          틀렸어요
        </Button>
      </div>
    </div>
  )
}
