// 인증 공급자의 이벤트를 앱 초기화와 연결한다. React와 분리해 계정 전환도 검증한다.
export function createAuthController({
  client,
  getAuth,
  switchData,
  suspendData,
  syncSubjects,
  syncCategories = async () => {},
  resumePending,
}) {
  let snapshot = { ready: false, error: null }
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
        await getAuth().syncMe()
        if (!current()) return
        resumePending()
      }
      if (current()) publish({ ready: true, error: null })
      if (session && current()) {
        // 화면 데이터는 인증 완료를 막지 않는다. 새 계정의 과목을 받은 뒤 단원을 갱신한다.
        const syncLearningData = async () => {
          await syncSubjects()
          if (current()) await syncCategories()
        }
        void syncLearningData().catch(() => {
          // 조회 실패 시 기기에 남은 데이터를 유지한다. 각 화면에서 다시 조회할 수 있다.
        })
      }
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
      if (!client) {
        publish({ ready: false, error: new Error('로그인 설정을 확인해 주세요.') })
        return () => {
          active = false
        }
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
