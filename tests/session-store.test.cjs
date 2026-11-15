const assert = require('node:assert/strict')
const test = require('node:test')
const { create } = require('zustand')
const loadSessionStore = require('./helpers/loadSessionStore.cjs')

function setup(overrides = {}) {
  const calls = []
  let options
  let sequence = 0
  const deps = {
    create,
    persist: (init, config) => {
      options = config
      return init
    },
    createJSONStorage: () => ({}),
    zustandStorage: {},
    S: { READY: 'READY', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', ENDED: 'ENDED' },
    PHASE: { LISTEN: 'LISTEN', QUIZ: 'QUIZ' },
    SOLVE_MODE: { READ: 'READ', LISTEN: 'LISTEN' },
    T: { OX: 'OX', MCQ: 'MCQ', SHORT: 'SHORT' },
    WRONG_STATUS: { OPEN: 'OPEN', RESOLVED: 'RESOLVED' },
    WARNING_SEC: 300,
    ROUTES: { HOME: '/home', LISTEN: '/study/listen', PLAYER: '/study/play' },
    ApiError: class ApiError extends Error {
      constructor(status, body) {
        super()
        this.status = status
        this.body = body
      }
    },
    uid: () => String(++sequence),
    kstDateKey: () => '2026-11-14',
    DIFFICULTY_LEVEL: { NORMAL: 2 },
    toServerTypes: (types) => types.map((t) => (t === 'MCQ' ? 'MC' : t)),
    fromServerQuestion: (q) => q,
    summaryToScript: () => [],
    toServerAnswer: (_q, value) => value,
    apiCreateSession: async (body) => {
      calls.push(['create', body])
      return { sessionId: 42, studyMin: 20, questions: [{ id: 1, type: 'OX', answer: 'O' }] }
    },
    apiStartSession: async (id) => {
      calls.push(['start', id])
    },
    apiEndSession: async (id, reason) => {
      calls.push(['end', id, reason])
    },
    saveAttempts: async (body) => {
      calls.push(['save', body])
    },
    getCurrentSession: async () => null,
    getWrongNotes: async () => ({ items: [] }),
    useMaterialStore: { getState: () => ({ subjects: [], categories: {} }) },
    getTimePlan: (minutes) => ({ totalSec: minutes * 60, conceptSec: 0, quizSec: minutes * 60 }),
    getOpenNotes: (notes) => notes.filter((n) => n.status === 'OPEN'),
    pickReviewNotes: (notes) => ({ picked: notes }),
    MAX_SESSION_QUESTIONS: 30,
    ...overrides,
  }
  const loaded = loadSessionStore(deps)
  loaded.useSessionStore.setState({ accountId: 'user-1' })
  return { ...loaded, calls, options }
}

const input = {
  draft: { source: 'categories', categoryIds: [7], unitId: '7', unitTitle: 'unit', subjectId: '3' },
  types: ['MCQ'],
  difficulty: 'NORMAL',
  studyMin: 20,
}

test('persistence keeps the existing storage key, version, fields and migrations', () => {
  const { useSessionStore: store, options } = setup()
  assert.equal(options.name, 'cs:session')
  assert.equal(options.version, 5)
  const state = store.getState()
  assert.deepEqual(
    Object.keys(options.partialize(state)).sort(),
    [
      'accountId',
      'current',
      'history',
      'wrongNotes',
      'dailyStats',
      'pendingAttempts',
      'pendingEnds',
      'continuing',
    ].sort(),
  )
  assert.equal(options.migrate({ current: { id: 'old' } }, 3).current, null)
  const current = { id: 'saved', serverId: 42 }
  assert.equal(options.migrate({ current }, 4).current, current)
})

test('server session creation sends the same request and starts before exposing current', async () => {
  const { useSessionStore: store, calls, getSessionRoute } = setup()
  const session = await store.getState().createSession(input)
  assert.deepEqual(calls, [
    ['create', { source: 'categories', categoryIds: [7], questionTypes: ['MC'], difficulty: 2 }],
    ['start', 42],
  ])
  assert.equal(session.serverId, 42)
  assert.equal(session.status, 'IN_PROGRESS')
  assert.equal(session.phase, 'QUIZ')
  assert.equal(getSessionRoute(session), '/study/play')
})

test('summary sessions retain listening, skip and timer transitions', async () => {
  const script = [{ id: 'p', text: 'summary' }]
  const { useSessionStore: store, getSessionRoute } = setup({ summaryToScript: () => script })
  await store.getState().createSession(input)
  assert.equal(getSessionRoute(store.getState().current), '/study/listen')
  assert.equal(store.getState().current.conceptRemainingSec, 180)
  store.getState().setListenIndex(1)
  store.getState().tick()
  store.getState().skipListening()
  assert.equal(store.getState().current.listenIndex, 1)
  assert.equal(store.getState().current.phase, 'QUIZ')
  assert.equal(store.getState().current.quizRemainingSec, 1199)
})

test('review sessions request the selected categories and resolve a correct old mistake', async () => {
  const question = { id: 1, type: 'OX', answer: 'O' }
  let requested
  const { useSessionStore: store } = setup({
    apiCreateSession: async (body) => {
      requested = body
      return { sessionId: 42, studyMin: 20, questions: [question] }
    },
  })
  store.setState({
    wrongNotes: [
      { id: 'n1', unitId: 7, questionId: 1, question, status: 'OPEN' },
      { id: 'n2', unitId: 8, questionId: 2, question: { ...question, id: 2 }, status: 'OPEN' },
    ],
  })
  await store
    .getState()
    .createSession({ ...input, types: ['OX'], draft: { source: 'wrongNotes', categoryIds: [7] } })
  assert.deepEqual(requested.categoryIds, [7])
  assert.deepEqual(store.getState().current.questions, [question])
  const result = await store.getState().submitAnswer('O')
  assert.equal(result.completed, true)
  assert.equal(store.getState().wrongNotes[0].status, 'RESOLVED')
  assert.equal(store.getState().wrongNotes[1].status, 'OPEN')
  assert.equal(store.getState().history.length, 1)
})

test('timer expiration still ends a session once and preserves history', async () => {
  const { useSessionStore: store, calls } = setup()
  await store.getState().createSession(input)
  store.setState({
    current: {
      ...store.getState().current,
      quizRemainingSec: 1,
      answers: [{ questionId: 1, correct: true }],
    },
  })
  store.getState().tick()
  store.getState().endSession()
  await store.getState().flushAttempts()
  assert.equal(store.getState().current.status, 'ENDED')
  assert.equal(store.getState().history.length, 1)
  assert.deepEqual(
    calls.filter(([name]) => name === 'end'),
    [['end', 42, 'ARRIVED']],
  )
})

test('concurrent flush calls serialize and send 101 attempts in two batches only', async () => {
  const { useSessionStore: store, calls } = setup()
  store.setState({
    pendingAttempts: Array.from({ length: 101 }, (_, i) => ({
      key: String(i),
      sessionId: 42,
      questionId: i + 1,
      answer: 'O',
    })),
  })
  await Promise.all([store.getState().flushAttempts(), store.getState().flushAttempts()])
  const batches = calls.filter(([name]) => name === 'save')
  assert.deepEqual(
    batches.map(([, body]) => body.attempts.length),
    [100, 1],
  )
  assert.equal('key' in batches[0][1].attempts[0], false)
  assert.equal('sessionId' in batches[0][1].attempts[0], false)
  assert.equal(store.getState().pendingAttempts.length, 0)
})

test('syncing wrong notes preserves server-to-display conversions', async () => {
  const { useSessionStore: store } = setup({
    useMaterialStore: {
      getState: () => ({
        subjects: [{ id: '3' }],
        categories: { 3: [{ categoryId: 7, title: 'unit' }] },
      }),
    },
    getWrongNotes: async () => ({
      items: [
        {
          questionId: 1,
          categoryId: 7,
          type: 'MCQ',
          choices: ['A', 'B'],
          answer: '2',
          lastAnswer: '1',
          status: 'OPEN',
        },
      ],
    }),
  })
  await store.getState().syncWrongNotes()
  assert.equal(store.getState().wrongNotes[0].unitTitle, 'unit')
  assert.equal(store.getState().wrongNotes[0].lastAnswer, 'A')
  assert.equal(store.getState().wrongNotes[0].subjectId, '3')
})

test('failed answer saving retains both queues and never ends the session before retry', async () => {
  let failing = true
  const events = []
  const { useSessionStore: store } = setup({
    saveAttempts: async () => {
      events.push('save')
      if (failing) throw new Error('offline')
    },
    apiEndSession: async () => {
      events.push('end')
    },
  })
  store.setState({ pendingAttempts: [{ key: 'a', sessionId: 42, questionId: 1, answer: 'O' }] })
  await assert.rejects(store.getState().queueSessionEnd(42, 'QUIT'))
  assert.deepEqual(events, ['save'])
  assert.equal(store.getState().pendingAttempts.length, 1)
  assert.equal(store.getState().pendingEnds.length, 1)
  failing = false
  await store.getState().flushAttempts()
  assert.deepEqual(events, ['save', 'save', 'end'])
  assert.equal(store.getState().pendingAttempts.length, 0)
  assert.equal(store.getState().pendingEnds.length, 0)
})

test('404 does not discard a whole session of unsent answers', async () => {
  const { useSessionStore: store } = setup({
    saveAttempts: async () => {
      throw Object.assign(new Error('not found'), { status: 404 })
    },
  })
  const pendingAttempts = [{ key: 'a', sessionId: 42, questionId: 1, answer: 'O' }]
  store.setState({ pendingAttempts })
  await assert.rejects(store.getState().flushAttempts())
  assert.deepEqual(store.getState().pendingAttempts, pendingAttempts)
})

test('failed end request is retried after reload without resending saved answers', async () => {
  let failing = true
  const { useSessionStore: store, options } = setup({
    apiEndSession: async () => {
      if (failing) throw new Error('offline')
    },
  })
  await assert.rejects(store.getState().queueSessionEnd(42, 'ARRIVED'))
  const persisted = options.partialize(store.getState())
  const reloaded = setup({
    apiEndSession: async (id, reason, { accountId }) => {
      assert.equal(id, 42)
      assert.equal(reason, 'ARRIVED')
      assert.equal(accountId, 'user-1')
    },
  }).useSessionStore
  reloaded.setState(persisted)
  failing = false
  await reloaded.getState().flushAttempts()
  assert.equal(reloaded.getState().pendingEnds.length, 0)
})

test('account switch during saving cannot remove the new account queue or send the next batch', async () => {
  let finish
  let calls = 0
  const { useSessionStore: store } = setup({
    saveAttempts: async (_body, { accountId }) => {
      calls += 1
      assert.equal(accountId, 'user-1')
      await new Promise((resolve) => {
        finish = resolve
      })
    },
  })
  store.setState({
    pendingAttempts: Array.from({ length: 101 }, (_, i) => ({
      key: String(i),
      sessionId: 42,
      questionId: i + 1,
      answer: 'O',
    })),
  })
  const pending = store.getState().flushAttempts()
  while (!finish) await Promise.resolve()
  const otherQueue = [{ key: '0', sessionId: 99, questionId: 1, answer: 'X' }]
  store.setState({ accountId: 'user-2', pendingAttempts: otherQueue })
  finish()
  await pending
  assert.equal(calls, 1)
  assert.deepEqual(store.getState().pendingAttempts, otherQueue)
})

test('deleted subject notes are refreshed using retained IDs even with no active subjects', async () => {
  const ids = []
  const { useSessionStore: store } = setup({
    useMaterialStore: {
      getState: () => ({
        subjects: [],
        archivedSubjects: [{ id: '3', name: '삭제한 과목' }],
        categories: {},
      }),
    },
    getWrongNotes: async (id) => {
      ids.push(id)
      return { items: [{ questionId: 1, categoryId: 7, status: 'OPEN', type: 'OX', stem: '문제' }] }
    },
  })
  await store.getState().syncWrongNotes()
  assert.deepEqual(ids, ['3'])
  assert.equal(store.getState().wrongNotes.length, 1)
  assert.equal(store.getState().wrongNotes[0].subjectName, '삭제한 과목')
})

test('failed deleted subject lookup preserves all existing notes', async () => {
  const { useSessionStore: store } = setup({
    getWrongNotes: async () => {
      throw new Error('offline')
    },
  })
  const notes = [{ questionId: 1, subjectId: 3, question: { id: 1 } }]
  store.setState({ wrongNotes: notes })
  await store.getState().syncWrongNotes()
  assert.deepEqual(store.getState().wrongNotes, notes)
})

test('continuation is available only for finished sessions with at least one minute remaining', () => {
  const { useSessionStore: store, canContinue } = setup()
  const current = { id: 'old', status: 'COMPLETED', conceptRemainingSec: 0, quizRemainingSec: 60 }
  assert.equal(canContinue(null), false)
  assert.equal(canContinue({ ...current, status: 'IN_PROGRESS' }), false)
  assert.equal(canContinue({ ...current, quizRemainingSec: 59 }), false)
  assert.equal(canContinue(current), true)
  store.setState({ current })
  assert.equal(store.getState().startContinue(), true)
  assert.equal(store.getState().getContinueFrom(), current)
  store.getState().cancelContinue()
  assert.equal(store.getState().getContinueFrom(), null)
})

test('server continuation sends remaining minutes and skips summary while preserving cumulative time', async () => {
  const {
    useSessionStore: store,
    calls,
    getElapsedSec,
    getRemainingSec,
    options,
  } = setup({
    summaryToScript: () => [{ id: 'unused-summary', text: 'summary' }],
  })
  const previous = {
    id: 'old',
    status: 'ENDED',
    plan: { totalSec: 1200, conceptSec: 180, quizSec: 1020 },
    conceptRemainingSec: 25,
    quizRemainingSec: 400,
    warned: true,
  }
  store.setState({ current: previous })
  store.getState().startContinue()
  assert.equal(options.partialize(store.getState()).continuing, true)
  const session = await store
    .getState()
    .createSession({ ...input, studyMin: 7, continueFrom: store.getState().getContinueFrom() })
  assert.deepEqual(calls[0], [
    'create',
    {
      source: 'categories',
      categoryIds: [7],
      questionTypes: ['MC'],
      difficulty: 2,
      studyMinOverride: 7,
      skipSummary: true,
    },
  ])
  assert.equal(session.phase, 'QUIZ')
  assert.deepEqual(session.script, [])
  assert.equal(session.conceptRemainingSec, 0)
  assert.equal(session.plan.totalSec, 1200)
  assert.equal(getRemainingSec(session), 425)
  assert.equal(session.prevElapsedSec, 775)
  assert.equal(getElapsedSec(session), 775)
  assert.equal(session.warned, true)
  assert.equal(store.getState().continuing, false)
  store.getState().tick()
  assert.equal(getElapsedSec(store.getState().current), 776)
})

test('continuation retains exact remaining seconds after requesting a server session', async () => {
  const { useSessionStore: store, getElapsedSec, calls } = setup()
  const previous = {
    status: 'COMPLETED',
    plan: { totalSec: 1200, conceptSec: 180, quizSec: 1020 },
    conceptRemainingSec: 0,
    quizRemainingSec: 180,
  }
  const session = await store.getState().createSession({ ...input, continueFrom: previous })
  assert.equal(calls[0][1].studyMinOverride, 3)
  assert.equal(calls[0][1].skipSummary, true)
  assert.equal(session.plan.totalSec, 1200)
  assert.equal(session.quizRemainingSec, 180)
  assert.equal(session.conceptRemainingSec, 0)
  assert.equal(getElapsedSec(session), 1020)
})

test('failed continuation leaves the previous session and unsent queues intact', async () => {
  const { useSessionStore: store } = setup({
    apiCreateSession: async () => {
      throw new Error('offline')
    },
  })
  const previous = {
    id: 'old',
    status: 'COMPLETED',
    plan: { totalSec: 1200 },
    conceptRemainingSec: 0,
    quizRemainingSec: 120,
  }
  const pendingAttempts = [{ key: 'a', sessionId: 1, answer: 'O' }]
  const pendingEnds = [{ key: 'e', sessionId: 1, reason: 'QUIT' }]
  store.setState({ current: previous, continuing: true, pendingAttempts, pendingEnds })
  await assert.rejects(store.getState().createSession({ ...input, continueFrom: previous }))
  assert.equal(store.getState().current, previous)
  assert.equal(store.getState().continuing, true)
  assert.deepEqual(store.getState().pendingAttempts, pendingAttempts)
  assert.deepEqual(store.getState().pendingEnds, pendingEnds)
})
