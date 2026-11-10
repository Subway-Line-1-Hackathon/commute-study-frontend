import { useEffect, useRef, useState } from 'react'
import { useExplanation } from '../hooks/useExplanation'
import { QUESTION_TYPE as T } from '../lib/constants'
import { speak } from '../lib/speaker'

const GAP_MS = 3000 // 문제를 읽은 뒤, 정답을 읽은 뒤 기다리는 시간

const KIND = { [T.OX]: '오엑스 문제', [T.SHORT]: '단답형 문제', [T.MCQ]: '객관식 문제' }
// O/X를 글자 그대로 읽으면 어색해서 소리 나는 대로 바꾼다
const sayAnswer = (a) => (a === 'O' ? '오' : a === 'X' ? '엑스' : a)

// 듣고 풀기: 문제 읽기 → 3초 → 정답 읽기 → 3초 → onDone
// question이 바뀌면 key로 새로 만들어 처음부터 진행한다
export default function ListenQuestion({ question, paused, onDone }) {
  const [stage, setStage] = useState('question') // 'question' | 'answer'
  const [showText, setShowText] = useState(false) // '글로 보기'를 눌렀는지
  // onDone을 ref에 담아 두면, 부모가 리렌더링으로 새 함수를 넘겨도 읽기 effect가 다시 시작되지 않는다
  const onDoneRef = useRef(onDone)
  // 서버 단답형은 정답이 오지 않아서 해설을 대신 읽는다
  const { explanation } = useExplanation(question)
  const explanationRef = useRef(explanation)

  useEffect(() => {
    explanationRef.current = explanation
  }, [explanation])

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  // 일시정지했다가 다시 재생하면 지금 단계를 처음부터 다시 읽는다
  useEffect(() => {
    if (paused) return
    let timer
    let text = `${KIND[question.type]}. ${question.prompt}`
    if (stage === 'answer') {
      if (question.answer) text = `정답은 ${sayAnswer(question.answer)}입니다.`
      else if (explanationRef.current) text = `해설입니다. ${explanationRef.current}`
      else text = '정답은 화면에서 확인해 주세요.'
    }
    // 다 읽으면 3초 뒤: 문제 단계면 정답 단계로, 정답 단계면 다음 문제로(onDone)
    const cancel = speak(text, {
      onEnd: () => {
        timer = setTimeout(
          () => (stage === 'question' ? setStage('answer') : onDoneRef.current()),
          GAP_MS,
        )
      },
    })
    // 단계가 바뀌거나 일시정지/화면 이동 시 읽던 음성과 타이머를 정리한다
    return () => {
      cancel()
      clearTimeout(timer)
    }
  }, [stage, paused, question])

  const revealed = stage === 'answer'

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        {question.type === T.OX ? 'O/X' : '단답형'} · 듣기
      </span>

      {showText || revealed ? (
        <h2 className="mt-3 text-lg leading-relaxed font-semibold text-slate-900">
          {question.prompt}
        </h2>
      ) : (
        <div className="mt-3 flex flex-col items-center py-6 text-center">
          <span className="text-4xl" aria-hidden>
            🎧
          </span>
          <p className="mt-2 text-sm text-slate-500">문제를 듣고 머릿속으로 답해 보세요</p>
          <button
            type="button"
            onClick={() => setShowText(true)}
            className="mt-3 text-xs text-slate-400 underline"
          >
            글로 보기
          </button>
        </div>
      )}

      <div
        className={`mt-5 rounded-xl p-4 transition ${
          revealed ? 'bg-green-50 text-green-800' : 'bg-slate-50 text-slate-400'
        }`}
      >
        {revealed ? (
          <>
            {question.answer && (
              <>
                <p className="text-sm">정답</p>
                <p className="mt-1 text-2xl font-bold">{question.answer}</p>
              </>
            )}
            {explanation && <p className="mt-2 text-sm opacity-80">{explanation}</p>}
          </>
        ) : (
          <p className="text-center text-sm">잠시 후 정답을 알려 드려요</p>
        )}
      </div>
    </div>
  )
}
