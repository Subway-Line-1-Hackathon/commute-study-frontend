// 인증 공급자의 이벤트를 앱 초기화와 연결한다. React와 분리해 계정 전환도 검증한다.
export function createAuthController({
  client,
  getAuth,
  switchData,
  suspendData,
  syncSubjects,
  resumePending,
}) {
  let snapshot = { ready: !client, error: null }
  let generation = 0
  let active = false
  let accountId
  const listeners = new Set()
  const publish = (next) => {
    snapshot = next
    listeners.forEach((listener) => listener())
  }

  const reconcile = async (session, request) => {
    const current = () => active && request === generation
    if (!current()) return
    const nextId = session?.user.id ?? null
    try {
      if (nextId) switchData(getAuth().user?.id, nextId)
      else suspendData()
      getAuth().applySession(session)
      accountId = nextId
      if (session) {
        await Promise.all([getAuth().syncMe(), syncSubjects()])
        if (!current()) return
        resumePending()
      }
      if (current()) publish({ ready: true, error: null })
    } catch (error) {
      if (!current()) return
      if (error.status === 401) {
        getAuth().applySession(null)
        suspendData()
        publish({ ready: true, error: null })
      } else {
        publish({ ready: false, error })
      }
    }
  }

  const initialize = async () => {
    const request = ++generation
    publish({ ready: false, error: null })
    try {
      const { data, error } = await client.auth.getSession()
      if (error) throw error
      await reconcile(data.session, request)
    } catch (error) {
      if (active && request === generation) publish({ ready: false, error })
    }
  }

  return {
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    retry: () => initialize(),
    start: () => {
      active = true
      if (!client)
        return () => {
          active = false
        }
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        const nextId = session?.user.id ?? null
        if (snapshot.ready && nextId === accountId) return
        const request = ++generation
        suspendData()
        publish({ ready: false, error: null })
        // 공급자의 인증 콜백 안에서는 getSession을 다시 호출하지 않는다.
        queueMicrotask(() => {
          void reconcile(session, request)
        })
      })
      void initialize()
      return () => {
        active = false
        generation += 1
        suspendData()
        data.subscription.unsubscribe()
      }
    },
  }
}
