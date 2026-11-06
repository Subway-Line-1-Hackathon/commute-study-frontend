import { useEffect } from 'react'

export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock = null
    let cancelled = false

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
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
