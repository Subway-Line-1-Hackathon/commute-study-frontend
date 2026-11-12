import { useEffect } from 'react'
import { SESSION_STATUS as S, WARNING_SEC } from '../lib/constants'
import { announce } from '../lib/speaker'
import { useSessionStore } from '../store/useSessionStore'

export function useQuizTimer(running, onTimeUp) {
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const wasWarned = useSessionStore.getState().current?.warned
      useSessionStore.getState().tick()
      const next = useSessionStore.getState().current

      if (!wasWarned && next?.warned) {
        announce(`학습 종료까지 ${WARNING_SEC / 60}분 남았어요. 곧 끝나요.`)
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
      }
      if (next?.status === S.ENDED) onTimeUp()
    }, 1000)
    return () => clearInterval(id)
  }, [running, onTimeUp])
}
