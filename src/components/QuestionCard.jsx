import { QUESTION_TYPE as T } from '../lib/constants'
import SwipeCard from './SwipeCard'

const TYPE_LABEL = { [T.OX]: 'O/X', [T.MCQ]: '객관식', [T.SHORT]: '단답형' }

function optionClass(opt, { value, locked, answer }) {
  const base = 'w-full rounded-xl border px-4 py-3.5 font-medium transition'
  if (locked) {
    if (opt === answer) return `${base} border-green-500 bg-green-50 text-green-800`
    if (opt === value) return `${base} border-red-400 bg-red-50 text-red-700`
    return `${base} border-slate-200 bg-white text-slate-400`
  }
  if (opt === value) return `${base} border-blue-600 bg-blue-50 text-blue-700`
  return `${base} border-slate-300 bg-white text-slate-700 active:bg-slate-50`
}

// 눈으로 풀기용 문제 카드
// value: 현재 선택/입력값, result: 제출 후 { correct } (제출 전에는 null)
// onSubmit(v): O/X처럼 고르는 즉시 제출하는 경우 사용
export default function QuestionCard({ question, value, onChange, onSubmit, result }) {
  const locked = Boolean(result)
  const isOX = question.type === T.OX
  const swipe = isOX && !locked
  const options = isOX ? ['O', 'X'] : (question.choices ?? [])

  const card = (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        {TYPE_LABEL[question.type]}
      </span>
      <h2 className="mt-3 text-lg leading-relaxed font-semibold text-slate-900">
        {question.prompt}
      </h2>

      {swipe && (
        <p className="mt-6 flex justify-between text-sm font-semibold">
          <span className="text-red-500">← X</span>
          <span className="text-slate-400">밀어서 답하기</span>
          <span className="text-green-600">O →</span>
        </p>
      )}
    </div>
  )

  return (
    <div>
      {swipe ? <SwipeCard onSwipe={(v) => onSubmit?.(v)}>{card}</SwipeCard> : card}

      <div className="mt-5">
        {question.type === T.SHORT ? (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !locked && onSubmit?.()}
            disabled={locked}
            autoFocus
            placeholder="정답을 입력하세요"
            className={`w-full rounded-xl border bg-white px-4 py-3.5 text-lg outline-none focus:ring-2 ${
              !locked
                ? 'border-slate-300 focus:ring-blue-200'
                : result.correct
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-400 bg-red-50'
            }`}
          />
        ) : (
          <div className={isOX ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={locked}
                // O/X는 누르는 즉시 제출, 객관식은 고른 뒤 제출 버튼
                onClick={() => (isOX ? onSubmit?.(opt) : onChange(opt))}
                className={`${optionClass(opt, { value, locked, answer: question.answer })} ${
                  isOX ? 'text-center text-2xl' : 'text-left'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
