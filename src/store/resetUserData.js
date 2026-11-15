import { useMaterialStore } from './useMaterialStore'
import { useSessionStore } from './useSessionStore'
import { zustandStorage } from '../lib/storage'

const emptyMaterials = () => ({
  subjects: [],
  archivedSubjects: [],
  materials: [],
  categories: {},
  serverMaterials: [],
  dismissedReadyIds: [],
})
const emptySession = () => ({
  accountId: null,
  current: null,
  history: [],
  wrongNotes: [],
  unitProgress: {},
  dailyStats: {},
  pendingAttempts: [],
  pendingEnds: [],
  continuing: false,
})
const accountKey = (id) => `cs:user-data:${encodeURIComponent(id)}`
const pick = (state, defaults) =>
  Object.fromEntries(Object.keys(defaults).map((key) => [key, state[key] ?? defaults[key]]))

// 전환 전에 이전 계정 데이터를 보관한다. 저장이 실패하면 초기화하지 않는다.
// 진행 중이던 API의 응답은 session.accountId 검사로 새 계정에 반영되지 않는다.
export function switchUserData(previousId, nextId) {
  suspendUserData()
  const session = useSessionStore.getState()
  const owner = session.accountId ?? previousId
  if (owner === nextId) {
    useSessionStore.setState({ accountId: nextId })
    return
  }
  if (owner) {
    zustandStorage.setItem(
      accountKey(owner),
      JSON.stringify({
        session: pick(session, emptySession()),
        materials: pick(useMaterialStore.getState(), emptyMaterials()),
      }),
    )
  }
  const raw = zustandStorage.getItem(accountKey(nextId))
  const saved = raw ? JSON.parse(raw) : null
  useMaterialStore.setState(pick(saved?.materials ?? {}, emptyMaterials()))
  useSessionStore.setState({ ...pick(saved?.session ?? {}, emptySession()), accountId: nextId })
}

export function suspendUserData() {
  useMaterialStore.getState().invalidateRequests()
}

// 탈퇴가 성공한 계정만 기기에서도 지운다. 다른 계정의 미전송 답안은 유지한다.
export function resetUserData() {
  suspendUserData()
  const owner = useSessionStore.getState().accountId
  if (owner) zustandStorage.removeItem(accountKey(owner))
  useMaterialStore.setState(emptyMaterials())
  useSessionStore.setState(emptySession())
}
