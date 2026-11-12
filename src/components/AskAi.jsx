import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../lib/api'
import { askQuestion, getAiQuota } from '../lib/endpoints'
import { supabase } from '../lib/supabase'
import TextField from './TextField'

// 문제에 대해 AI에게 묻는 대화창 (서버 모드에서만 보인다)
// - 답변은 SSE로 조각조각 와서 글자가 이어 붙으며 보인다
// - 하루 질문 횟수가 정해져 있어 남은 횟수를 같이 보여준다 (성공한 답변만 차감)
export default function AskAi({ questionId }) {
  const [messages, setMessages] = useState([]) // [{ role: 'user'|'assistant', content }]
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [quota, setQuota] = useState(null) // { used, limit, remaining }
  const abortRef = useRef(null)

  const loadQuota = () =>
    getAiQuota()
      .then(setQuota)
      .catch(() => {})

  // 처음 열 때 남은 횟수 조회, 화면을 떠나면 진행 중인 답변 요청을 끊는다
  useEffect(() => {
    if (supabase) {
      getAiQuota()
        .then(setQuota)
        .catch(() => {})
    }
    return () => abortRef.current?.abort()
  }, [])

  if (!supabase || questionId == null) return null

  const noQuota = quota?.remaining === 0
  const canSend = input.trim() !== '' && !streaming && !noQuota

  const send = async (e) => {
    e.preventDefault()
    if (!canSend) return
    const message = input.trim()
    const history = messages // 이번 질문 이전까지의 대화
    setInput('')
    setError('')
    setStreaming(true)
    // 내 질문 + 비어 있는 AI 답변 자리를 먼저 추가하고, 조각이 올 때마다 마지막 답변에 붙인다
    setMessages([
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ])
    const appendToLast = (text) =>
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        next[next.length - 1] = { ...last, content: last.content + text }
        return next
      })

    const controller = new AbortController()
    abortRef.current = controller
    try {
      await askQuestion(questionId, {
        message,
        history,
        onDelta: appendToLast,
        signal: controller.signal,
      })
      loadQuota()
    } catch (err) {
      if (controller.signal.aborted) return
      // 실패한 질문은 대화에서 빼고 입력창에 되돌려 다시 보낼 수 있게 한다
      setMessages(history)
      setInput(message)
      setError(errorMessage(err, 'AI가 답하지 못했어요. 잠시 후 다시 시도해 주세요.'))
    } finally {
      if (!controller.signal.aborted) setStreaming(false)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-body font-bold text-ink">AI에게 질문하기</p>
        {quota && (
          <p className="text-caption text-muted">
            오늘 남은 횟수 {quota.remaining}/{quota.limit}
          </p>
        )}
      </div>

      {messages.length > 0 && (
        <ul className="mt-3 space-y-2">
          {messages.map((m, i) => (
            <li
              key={i}
              className={
                m.role === 'user'
                  ? 'ml-8 rounded-xl bg-primary px-3 py-2 text-caption text-white'
                  : 'mr-8 rounded-xl bg-background px-3 py-2 text-caption whitespace-pre-wrap text-ink'
              }
            >
              {m.content || (streaming && i === messages.length - 1 ? '생각하는 중…' : '')}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={send} className="mt-3 flex gap-2">
        <div className="min-w-0 flex-1">
          <TextField
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming || noQuota}
            placeholder={noQuota ? '오늘 질문을 모두 썼어요' : '스택과 큐의 차이가 헷갈려요'}
          />
        </div>
        <button
          type="submit"
          disabled={!canSend}
          className="h-13 shrink-0 rounded-xl bg-primary px-4 text-caption font-bold text-white disabled:opacity-40"
        >
          {streaming ? '답변 중' : '질문'}
        </button>
      </form>
      {error && <p className="mt-2 text-caption text-danger">{error}</p>}
    </div>
  )
}
