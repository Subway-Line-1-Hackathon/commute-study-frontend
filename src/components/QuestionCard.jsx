import { DIFFICULTY, QUESTION_TYPE as T } from '../lib/constants'
import { CHOICE_NUMBERS } from '../lib/question'
import SwipeCard from './SwipeCard'
import TextField from './TextField'

const TYPE_LABEL = { [T.OX]: 'O/X', [T.MCQ]: '객관식', [T.SHORT]: '단답형' }
const DIFFICULTY_LABEL = {
  [DIFFICULTY.EASY]: '하',
  [DIFFICULTY.NORMAL]: '중',
  [DIFFICULTY.HARD]: '상',
}

// 보기 버튼 색: 제출 전에는 고른 것만 파랑, 제출 후(locked)에는 정답 초록 / 내가 고른 오답 빨강
function optionClass(opt, { value, locked, answer }) {
  const base = 'w-full rounded-card border-2 px-4 py-3.5 text-body font-medium'
  if (locked) {
    if (opt === answer) return `${base} border-success bg-success-soft text-success`
    if (opt === value) return `${base} border-danger bg-danger-soft text-danger`
    return `${base} border-line bg-surface text-muted`
  }
  if (opt === value) return `${base} border-primary bg-primary/10 text-ink`
  return `${base} border-line bg-surface text-ink`
}

// 눈으로 풀기용 문제 카드
// value: 현재 선택/입력값, result: 제출 후 { correct } (제출 전에는 null)
// onSubmit(v): O/X처럼 고르는 즉시 제출하는 경우 사용
export default function QuestionCard({ question, difficulty, value, onChange, onSubmit, result }) {
  const locked = Boolean(result) // 제출했으면 더 못 바꾼다
  const isOX = question.type === T.OX
  const swipe = isOX && !locked // O/X 문제는 제출 전까지 카드를 좌우로 밀어서 답할 수 있다
  const options = isOX ? ['X', 'O'] : (question.choices ?? [])

  const card = (
    <div className="rounded-card border border-line bg-surface p-5">
      <p className="text-caption text-muted">
        {TYPE_LABEL[question.type]}
        {DIFFICULTY_LABEL[difficulty] && ` · 난이도 ${DIFFICULTY_LABEL[difficulty]}`}
      </p>
      <h2 className="mt-2 text-question leading-8 text-ink">{question.prompt}</h2>

      {swipe && (
        <p className="mt-6 flex justify-between text-caption font-bold">
          <span className="text-danger">← X</span>
          <span className="text-success">O →</span>
        </p>
      )}
    </div>
  )

  return (
    <div>
      {swipe ? <SwipeCard onSwipe={(v) => onSubmit?.(v)}>{card}</SwipeCard> : card}

      <div className="mt-5">
        {/* 단답형: 입력칸 (Enter로 제출) / 그 외: 보기 버튼 */}
        {question.type === T.SHORT ? (
          <TextField
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !locked && onSubmit?.()}
            disabled={locked}
            invalid={locked && !result.correct}
            autoFocus
            placeholder="정답을 입력하세요"
          />
        ) : (
          <div className={isOX ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
            {options.map((opt, i) => (
              <button
                key={opt}
                type="button"
                disabled={locked}
                // O/X는 누르는 즉시 제출, 객관식은 고른 뒤 제출 버튼
                onClick={() => (isOX ? onSubmit?.(opt) : onChange(opt))}
                className={`${optionClass(opt, { value, locked, answer: question.answer })} ${
                  isOX ? 'text-center text-title' : 'text-left'
                }`}
              >
                {isOX ? opt : `${CHOICE_NUMBERS[i] ?? `${i + 1}.`} ${opt}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
