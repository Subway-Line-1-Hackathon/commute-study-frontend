const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const read = (file) => fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8')
const withoutImports = (code) => code.replace(/^import[\s\S]*?from\s+['"][^'"]+['"]\s*$/gm, '')

function materialStore(overrides = {}) {
  const calls = []
  const M = Object.fromEntries(['UPLOADING', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'EXPIRED'].map((s) => [s, s]))
  class ApiError extends Error {
    constructor(status, body) { super(body?.message); this.status = status; this.body = body }
  }
  const create = (init) => {
    let state
    const get = () => state
    const set = (patch) => { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) } }
    state = init(set, get)
    return { getState: get, setState: set }
  }
  const deps = {
    create, persist: (init) => init, createJSONStorage: () => ({}), zustandStorage: {},
    M, ApiError, UPLOAD: { MAX_VISIBLE: 10 }, supabase: {},
    apiDeleteMaterial: async (id) => calls.push(['deleteMaterial', id]),
    apiDeleteSubject: async (id) => calls.push(['deleteSubject', id]),
    apiUpdateSubject: async (id, body) => { calls.push(['updateSubject', id, body]); return { id, name: 'updated', examDate: null, dDay: null } },
    errorMessage: (e) => e.message,
    ...overrides,
  }
  const code = withoutImports(read('store/useMaterialStore.js')).replace(/export const useMaterialStore/, 'const useMaterialStore').replace(/export function /g, 'function ')
  const store = new Function(...Object.keys(deps), `${code}\nreturn useMaterialStore`)(...Object.values(deps))
  return { store, calls, ApiError }
}

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

test('R9: PATCH preserves null examDate and uses the authoritative server response', async () => {
  const { store, calls } = materialStore()
  store.setState({ subjects: [{ id: '3', name: 'old', examDate: '2026-12-15' }] })
  await store.getState().updateSubject('3', { examDate: null })
  assert.deepEqual(calls, [['updateSubject', '3', { examDate: null }]])
  assert.deepEqual(store.getState().subjects[0], { id: '3', name: 'updated', examDate: null, dDay: null })
})

test('R9: rejected subject deletion keeps all local data', async () => {
  const { store, ApiError } = materialStore({ apiDeleteSubject: async () => { throw new ApiError(409) } })
  store.setState({ subjects: [{ id: '3' }], materials: [{ id: 'm', subjectId: '3' }], categories: { 3: [{ id: 'c' }] } })
  const before = store.getState()
  await assert.rejects(before.removeSubject('3'), { status: 409 })
  assert.equal(store.getState(), before)
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
