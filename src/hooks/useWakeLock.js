import { useEffect } from 'react'

// active가 true인 동안 화면이 자동으로 꺼지지 않게 한다 (Screen Wake Lock API)
// 학습 중 휴대폰 화면이 꺼져서 타이머·음성이 멈추는 것을 막는 용도
// 다른 앱에 갔다 오면 lock이 풀리므로, 화면이 다시 보이면(visibilitychange) 다시 요청한다
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock = null
    let cancelled = false

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        // 요청하는 사이에 화면을 떠났으면 바로 풀어 준다
        if (cancelled) lock.release()
      } catch {
        // 지원하지 않거나 거부되면 그냥 넘어간다
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') request()
    }

    request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      if (lock) lock.release()
    }
  }, [active])
}
