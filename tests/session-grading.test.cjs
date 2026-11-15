const assert = require('node:assert/strict')
const test = require('node:test')
const { create } = require('zustand')
const loadSessionStore = require('./helpers/loadSessionStore.cjs')

// 실제 스토어를 실행하되 API와 브라우저 저장소만 대체한다.
function setup() {
  const requests = []
  const saved = []
  const deps = {
    create,
    persist: (init) => init,
    createJSONStorage: () => ({}),
    zustandStorage: {},
    isServerMode: true,
    S: { IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', ENDED: 'ENDED' },
    PHASE: { QUIZ: 'QUIZ', LISTEN: 'LISTEN' },
    T: { SHORT: 'SHORT' },
    WRONG_STATUS: { OPEN: 'OPEN', RESOLVED: 'RESOLVED' },
    kstDateKey: () => '2026-11-14',
    uid: (() => { let id = 0; return () => String(++id) })(),
    toServerAnswer: (_question, value) => value,
    judgeAnswer: (questionId, answer) => new Promise((resolve, reject) => requests.push({ questionId, answer, resolve, reject })),
    saveAttempts: async (body) => { saved.push(body) },
  }
  const { useSessionStore: store } = loadSessionStore(deps)
  const current = {
    id: 'session-1', serverId: 1, status: 'IN_PROGRESS', phase: 'QUIZ', mode: 'curriculum',
    unitId: 'unit-1', questions: [{ id: 10, type: 'SHORT' }, { id: 11, type: 'SHORT' }], answers: [],
  }
  store.setState({ current, accountId: 'user-1' })
  return { store, requests, saved, current }
}

test('normal short-answer grading still records and sends the original answer', async () => {
  const { store, requests, saved } = setup()
  const pending = store.getState().submitAnswer('answer')
  requests[0].resolve({ correct: false, reason: 'wrong' })
  const result = await pending
  await store.getState().flushAttempts()
  assert.equal(result.question.id, 10)
  assert.equal(result.correct, false)
  assert.equal(store.getState().current.answers.length, 1)
  assert.equal(store.getState().wrongNotes.length, 1)
  assert.equal(saved[0].sessionId, 1)
  assert.equal(saved[0].attempts[0].questionId, 10)
})

test('grading, recorded answers and uploads use the same trimmed 30-character answer', async () => {
  const { store, requests, saved } = setup()
  const answer = '가'.repeat(30)
  const pending = store.getState().submitAnswer(`  ${answer}  `)
  assert.equal(requests[0].answer, answer)
  requests[0].resolve({ correct: true })
  await pending
  await store.getState().flushAttempts()
  assert.equal(store.getState().current.answers[0].value, answer)
  assert.equal(saved[0].attempts[0].answer, answer)
})

for (const answer of ['', '   ', '가'.repeat(31)]) {
  test(`invalid short answer of length ${answer.length} is rejected before grading or saving`, async () => {
    const { store, requests } = setup()
    const before = store.getState()
    await assert.rejects(store.getState().submitAnswer(answer), { status: 400 })
    assert.equal(requests.length, 0)
    assert.equal(store.getState(), before)
    assert.throws(() => store.getState().selfJudge(answer, true), { status: 400 })
    assert.equal(store.getState(), before)
  })
}

test('self-judged answers obey the same normalization as server-judged answers', async () => {
  const { store, requests, saved } = setup()
  const pending = store.getState().submitAnswer('  answer  ')
  requests[0].resolve({ correct: null })
  assert.equal((await pending).needsSelfJudge, true)
  store.getState().selfJudge('  answer  ', true)
  await store.getState().flushAttempts()
  assert.equal(saved[0].attempts[0].answer, 'answer')
  assert.equal(saved[0].attempts[0].selfJudged, true)
})

for (const outcome of ['correct', 'selfJudge', 'networkError']) {
  test(`stale ${outcome} response cannot affect a new session, even with the same question`, async () => {
    const { store, requests, saved, current } = setup()
    const pending = store.getState().submitAnswer('old answer')
    store.setState({ current: { ...current, id: 'session-2', serverId: 2 } })
    const before = store.getState()
    if (outcome === 'networkError') requests[0].reject(new Error('offline'))
    else requests[0].resolve({ correct: outcome === 'correct' ? true : null, answer: 'stale answer' })
    assert.equal(await pending, null)
    assert.equal(store.getState(), before)
    assert.equal(saved.length, 0)
  })
}

for (const change of ['ended', 'cleared', 'nextQuestion', 'differentPhase']) {
  test(`late grading is ignored after ${change}`, async () => {
    const { store, requests, current } = setup()
    const pending = store.getState().submitAnswer('old answer')
    const next = {
      ended: { ...current, status: 'ENDED' },
      cleared: null,
      nextQuestion: { ...current, answers: [{ questionId: 10, value: 'already answered', correct: true }] },
      differentPhase: { ...current, phase: 'LISTEN' },
    }[change]
    store.setState({ current: next })
    const before = store.getState()
    requests[0].resolve({ correct: true })
    assert.equal(await pending, null)
    assert.equal(store.getState(), before)
  })
}

test('duplicate requests resolving out of order do not answer the next question', async () => {
  const { store, requests, saved } = setup()
  const first = store.getState().submitAnswer('first')
  const second = store.getState().submitAnswer('second')
  requests[1].resolve({ correct: true })
  assert.equal((await second).question.id, 10)
  requests[0].resolve({ correct: false })
  assert.equal(await first, null)
  await store.getState().flushAttempts()
  assert.equal(store.getState().current.answers.length, 1)
  assert.equal(store.getState().wrongNotes.length, 0)
  assert.equal(saved.length, 1)
})

