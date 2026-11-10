import { useEffect, useState } from 'react'
import { getExplanation } from '../lib/endpoints'
import { supabase } from '../lib/supabase'

// 문제 해설. 문제에 해설이 없으면(서버 단답형·오답노트) 서버에서 조회한다
// enabled가 false면 조회하지 않는다 (정답 보기를 누르기 전 등)
export function useExplanation(question, enabled = true) {
  const own = question?.explanation ?? null
  const id = question?.id
  const [fetched, setFetched] = useState({ id: null, explanation: null, sourcePage: null })

  useEffect(() => {
    if (!enabled || own || !supabase || id == null || fetched.id === id) return
    let cancelled = false
    getExplanation(id)
      .then((res) => {
        if (cancelled) return
        setFetched({
          id,
          explanation: res?.explanation ?? null,
          sourcePage: res?.sourcePage ?? null,
        })
      })
      .catch(() => {
        if (!cancelled) setFetched({ id, explanation: null, sourcePage: null })
      })
    return () => {
      cancelled = true
    }
  }, [enabled, own, id, fetched.id])

  if (own) return { explanation: own, sourcePage: question.sourcePage ?? null, loaded: true }
  if (fetched.id === id) {
    return { explanation: fetched.explanation, sourcePage: fetched.sourcePage, loaded: true }
  }
  return { explanation: null, sourcePage: null, loaded: !supabase }
}
