import { useSyncExternalStore } from 'react'
import { getStorageStatus, retryStorage, subscribeStorageStatus } from '../lib/storage'

export default function StorageNotice() {
  const degraded = useSyncExternalStore(subscribeStorageStatus, getStorageStatus)
  if (!degraded) return null
  return (
    <div
      role="alert"
      className="sticky top-0 z-60 mx-auto max-w-md border-b border-warning/20 bg-warning-soft px-4 py-3 text-caption text-warning"
    >
      <p>
        이 기기에 기록을 저장하지 못하고 있어요. 화면을 닫거나 새로고침하면 저장되지 않은 기록이
        사라질 수 있어요.
      </p>
      <button type="button" onClick={retryStorage} className="mt-2 min-h-11 font-bold underline">
        저장 다시 시도
      </button>
    </div>
  )
}
