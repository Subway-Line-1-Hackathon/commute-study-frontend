import { COMMUTE } from '../lib/constants'
import { isReviewOnly } from '../lib/time'
import { useAuthStore } from '../store/useAuthStore'

export function useReviewOnly() {
  return useAuthStore((s) => isReviewOnly(s.commute?.studyMin ?? COMMUTE.DEFAULT))
}
