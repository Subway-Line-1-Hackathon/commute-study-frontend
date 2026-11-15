const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const read = (file) => fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8')
const withoutImports = (code) => code.replace(/^import[\s\S]*?from\s+['"][^'"]+['"]\s*$/gm, '')

const materialStore = require('./helpers/loadMaterialStore.cjs')

test('returning home preserves active uploads and removes only stale interrupted uploads', () => {
  const { store } = materialStore({ uid: () => 'live', apiUploadMaterial: () => new Promise(() => {}) })
  store.setState({ materials: [{ id: 'stale', status: 'UPLOADING' }, { id: 'old', status: 'READY' }] })
  store.getState().uploadMaterial('3', [{ name: 'new.pdf', size: 10 }])
  store.getState().resumePending()
  assert.deepEqual(store.getState().materials.map((m) => m.id), ['old', 'live'])
  assert.equal(store.getState().materials[1].notifyWhenReady, true)
  assert.equal(store.getState().materials[0].notifyWhenReady, undefined)
})

test('R8: deleting a server material removes its local copy and categories, preserving other materials', async () => {
  const { store, calls } = materialStore()
  store.setState({ materials: [{ id: 'temp', serverId: 8, status: 'READY' }], serverMaterials: [{ id: '8', status: 'READY' }, { id: '9' }], categories: { 1: [{ id: 'a', materialId: '8' }, { id: 'b', materialId: '9' }] } })
  await store.getState().removeMaterial('8')
  assert.deepEqual(calls, [['deleteMaterial', '8']])
  assert.equal(store.getState().materials.length, 0)
  assert.deepEqual(store.getState().serverMaterials, [{ id: '9' }])
  assert.deepEqual(store.getState().categories[1], [{ id: 'b', materialId: '9' }])
})

test('R8: temporary IDs send the server ID, and processing materials are not deleted', async () => {
  const { store, calls } = materialStore()
  store.setState({ materials: [{ id: 'temp', serverId: 8, status: 'FAILED' }] })
  await store.getState().removeMaterial('temp')
  assert.deepEqual(calls, [['deleteMaterial', 8]])
  store.setState({ materials: [{ id: 'busy', status: 'PROCESSING' }] })
  await assert.rejects(store.getState().removeMaterial('busy'), { status: 409 })
  assert.equal(store.getState().materials.length, 1)
  assert.equal(calls.length, 1)
})

test('R8: server rejection preserves the material; already absent 404 removes stale local state', async () => {
  const { store, ApiError } = materialStore({ apiDeleteMaterial: async () => { throw new ApiError(409) } })
  store.setState({ materials: [{ id: 'temp', serverId: 8, status: 'READY' }] })
  await assert.rejects(store.getState().removeMaterial('temp'), { status: 409 })
  assert.equal(store.getState().materials.length, 1)
  const absentContext = materialStore({ apiDeleteMaterial: async () => { throw new absentContext.ApiError(404) } })
  const absent = absentContext.store
  absent.setState({ materials: [{ id: 'temp', serverId: 8, status: 'FAILED' }] })
  await absent.getState().removeMaterial('temp')
  assert.equal(absent.getState().materials.length, 0)
})

test('subjects removed on another device are retained for local history lookup', async () => {
  const { store } = materialStore({ getSubjects: async () => ({ subjects: [{ id: 4, name: '남은 과목' }] }) })
  store.setState({ subjects: [{ id: '3', name: '삭제된 과목' }, { id: '4', name: '남은 과목' }] })
  await store.getState().syncSubjects()
  assert.deepEqual(store.getState().subjects.map((s) => s.id), ['4'])
  assert.deepEqual(store.getState().archivedSubjects.map((s) => s.id), ['3'])
})

const deferred = () => {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

for (const action of ['syncSubjects', 'syncMaterials', 'syncCategories']) {
  test(`${action} ignores responses started before an account switch, including A to B to A`, async () => {
    const pending = deferred()
    const { store } = materialStore({
      getSubjects: () => pending.promise,
      getMaterials: async () => ({ materials: [] }),
      getCategories: () => pending.promise,
    })
    if (action === 'syncMaterials') {
      // This endpoint is also used in the background by syncCategories.
      const separate = materialStore({ getMaterials: () => pending.promise }).store
      const request = separate.getState().syncMaterials()
      separate.getState().invalidateRequests()
      separate.setState({ serverMaterials: [{ id: 'B' }] })
      pending.resolve({ materials: [{ id: 'A', createdAt: '2026-11-15' }] })
      await request
      assert.equal(separate.getState().serverMaterials[0].id, 'B')
      return
    }
    store.setState({ subjects: [{ id: 'A' }] })
    const request = store.getState()[action]()
    store.getState().invalidateRequests()
    store.getState().invalidateRequests()
    store.setState({ subjects: [{ id: 'restored' }], categories: { A: [{ id: 'restored' }] } })
    pending.resolve({ subjects: [{ id: 'stale' }], categories: [{ id: 'stale' }] })
    await request
    assert.equal(store.getState().subjects[0].id, 'restored')
    assert.equal(store.getState().categories.A[0].id, 'restored')
  })
}

test('queued uploads from the previous account never start with the new account token', async () => {
  let sequence = 0
  const uploaded = []
  const first = deferred()
  const { store } = materialStore({
    uid: () => String(++sequence),
    apiUploadMaterial: async (subjectId) => { uploaded.push(subjectId); return first.promise },
  })
  const files = [{ name: 'lecture.pdf', size: 10 }]
  store.getState().uploadMaterial('A1', files)
  store.getState().uploadMaterial('A2', files)
  await new Promise(setImmediate)
  store.getState().invalidateRequests()
  store.setState({ materials: [] })
  first.resolve({ materialId: 1, status: 'READY' })
  await new Promise(setImmediate)
  assert.deepEqual(uploaded, ['A1'])
  assert.deepEqual(store.getState().materials, [])
})

test('late deletion cannot remove a restored material after switching accounts', async () => {
  const pending = deferred()
  const { store } = materialStore({ apiDeleteMaterial: () => pending.promise })
  store.setState({ materials: [{ id: 'temp', serverId: 8, status: 'READY' }] })
  const request = store.getState().removeMaterial('temp')
  store.getState().invalidateRequests()
  store.setState({ materials: [{ id: 'temp', serverId: 8, status: 'READY', restored: true }] })
  pending.resolve()
  await request
  assert.equal(store.getState().materials[0].restored, true)
})

async function sessionReport(responses) {
  let result = null
  let effect
  let calls = 0
  let finish
  const done = new Promise((resolve) => { finish = resolve })
  const code = read('pages/S50Summary.jsx').split('function useSessionFeedback(cur) {')[1].split('\nfunction withStation')[0]
  const deps = {
    useState: () => [null, (value) => { result = typeof value === 'function' ? value(result) : value }],
    useEffect: (fn) => { effect = fn },
    useSessionStore: { getState: () => ({ flushAttempts: async () => {} }) },
    getSessionReport: async () => {
      const response = responses[calls++]
      if (!response) throw new Error('unexpected poll')
      if (response instanceof Error) throw response
      return response
    },
    wait: async () => {},
  }
  // Expose completion from the hook's async run without changing production behavior.
  const body = code.replace('    run()', '    run().then(finish, finish)')
  new Function(...Object.keys(deps), 'finish', `function hook(cur) {${body}\nhook({serverId: 42})`)(...Object.values(deps), finish)
  effect()
  await done
  return { result, calls }
}

for (const status of ['READY', 'SKIPPED', 'FAILED']) {
  test(`R7: polling stops at ${status} and retains whole-session totals`, async () => {
    const today = { answered: 30, correct: 24, accuracy: 0.8, wrong: 6, minutes: 24 }
    const { result, calls } = await sessionReport([{ today, feedbackStatus: 'PENDING' }, { today, feedbackStatus: status, feedback: status === 'READY' ? 'feedback' : null }])
    assert.equal(calls, 2)
    assert.equal(result.feedbackStatus, status)
    assert.deepEqual(result.today, today)
  })
}

test('R7: a failed request is not retried as PENDING', async () => {
  const { result, calls } = await sessionReport([new Error('offline')])
  assert.equal(calls, 1)
  assert.equal(result.unavailable, true)
})

test('R7: polling limit preserves PENDING rather than inventing an AI failure', async () => {
  const { result, calls } = await sessionReport(Array.from({ length: 10 }, () => ({ feedbackStatus: 'PENDING', today: { answered: 1 } })))
  assert.equal(calls, 10)
  assert.equal(result.feedbackStatus, 'PENDING')
  assert.equal(result.timedOut, true)
})
