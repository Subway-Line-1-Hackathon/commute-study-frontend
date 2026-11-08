import { buildReport } from '../lib/report'
import { useSessionStore } from '../store/useSessionStore'

export function useReport() {
  const dailyStats = useSessionStore((s) => s.dailyStats)
  const history = useSessionStore((s) => s.history)
  const wrongNotes = useSessionStore((s) => s.wrongNotes)

  return buildReport({ dailyStats, history, wrongNotes })
}
