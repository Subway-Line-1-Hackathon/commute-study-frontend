import { useEffect, useState } from 'react'
import { getExplanation } from '../lib/endpoints'
import { supabase } from '../lib/supabase'
import { stripMarkdown } from '../lib/text'

// 문제 해설. 문제에 해설이 없으면(서버 단답형·오답노트) 서버에서 조회한다
// enabled가 false면 조회하지 않는다 (정답 보기를 누르기 전 등)
export function useExplanation(question, enabled = true) {
  const own = question?.explanation ?? null // 문제에 이미 들어 있는 해설
  const id = question?.id
  // 서버에서 받은 해설. 어느 문제의 해설인지 id도 같이 저장해서, 문제가 바뀌면 다시 조회한다
  const [fetched, setFetched] = useState({ id: null, explanation: null, sourcePage: null })

  useEffect(() => {
    // 조회할 필요가 없는 경우: 비활성, 이미 해설 있음, Mock 모드, 문제 없음, 이미 받아 옴
    if (!enabled || own || !supabase || id == null || fetched.id === id) return
    // 응답 전에 문제가 바뀌거나 화면을 떠나면 늦게 온 응답을 무시한다
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

  // 반환: { explanation, sourcePage(근거 페이지), loaded(조회가 끝났는지 -> 로딩 표시용) }
  // 해설에 섞인 **굵게** 같은 마크다운 기호는 지워서 돌려준다
  if (own)
    return {
      explanation: stripMarkdown(own),
      sourcePage: question.sourcePage ?? null,
      loaded: true,
    }
  if (fetched.id === id) {
    return {
      explanation: stripMarkdown(fetched.explanation),
      sourcePage: fetched.sourcePage,
      loaded: true,
    }
  }
  return { explanation: null, sourcePage: null, loaded: !supabase }
}
