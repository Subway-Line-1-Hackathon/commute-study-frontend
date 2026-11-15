const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')

function setup() {
  const makeStore = (initial) => {
    let state = initial
    return { getState: () => state, setState: (patch) => { state = { ...state, ...patch } } }
  }
  const materials = makeStore({ subjects: [{ id: '3', name: 'A 과목' }], materials: [], invalidateRequests() {} })
  const session = makeStore({ accountId: 'A', current: null, history: [], wrongNotes: [],
    pendingAttempts: [{ key: 'a', sessionId: 42 }], pendingEnds: [{ key: 'e', sessionId: 42, reason: 'QUIT' }] })
  const data = new Map()
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) }
  const source = fs.readFileSync(path.join(__dirname, '../src/store/resetUserData.js'), 'utf8')
    .replace(/^import .*$/gm, '').replace(/export function /g, 'function ')
  const actions = new Function('useMaterialStore', 'useSessionStore', 'zustandStorage',
    source + '\nreturn { switchUserData, resetUserData }')(materials, session, storage)
  return { ...actions, materials, session, data, storage }
}

test('A → B → A restores unsent answers and end requests only for their owner', () => {
  const { switchUserData, session, materials } = setup()
  switchUserData('A', 'B')
  assert.equal(session.getState().accountId, 'B')
  assert.deepEqual(session.getState().pendingAttempts, [])
  assert.deepEqual(session.getState().pendingEnds, [])
  assert.deepEqual(materials.getState().subjects, [])
  session.setState({ pendingAttempts: [{ key: 'b', sessionId: 99 }] })
  switchUserData('B', 'A')
  assert.deepEqual(session.getState().pendingAttempts, [{ key: 'a', sessionId: 42 }])
  assert.deepEqual(session.getState().pendingEnds, [{ key: 'e', sessionId: 42, reason: 'QUIT' }])
  assert.equal(materials.getState().subjects[0].name, 'A 과목')
  switchUserData('A', 'B')
  assert.deepEqual(session.getState().pendingAttempts, [{ key: 'b', sessionId: 99 }])
})

test('legacy data is assigned to the same logged-in account without clearing its queue', () => {
  const { switchUserData, session } = setup()
  session.setState({ accountId: null })
  switchUserData('A', 'A')
  assert.equal(session.getState().accountId, 'A')
  assert.equal(session.getState().pendingAttempts.length, 1)
})

test('continuation state is isolated and restored along with its account session', () => {
  const { switchUserData, session } = setup()
  session.setState({ continuing: true })
  switchUserData('A', 'B')
  assert.equal(session.getState().continuing, false)
  switchUserData('B', 'A')
  assert.equal(session.getState().continuing, true)
})

test('failed account backup leaves the old queue intact', () => {
  const { switchUserData, session, storage } = setup()
  storage.setItem = () => { throw new Error('quota') }
  assert.throws(() => switchUserData('A', 'B'))
  assert.equal(session.getState().accountId, 'A')
  assert.equal(session.getState().pendingAttempts.length, 1)
})

test('withdrawal removes only the active account backup', () => {
  const { switchUserData, resetUserData, session, data } = setup()
  switchUserData('A', 'B')
  switchUserData('B', 'A')
  resetUserData()
  assert.equal(data.has('cs:user-data:A'), false)
  assert.equal(data.has('cs:user-data:B'), true)
  assert.deepEqual(session.getState().pendingAttempts, [])
})

test('queued requests cannot acquire another account token', async () => {
  let provider
  let current = 'B'
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/authToken.js'), 'utf8')
    .replace(/^import .*$/gm, '').replace('export function', 'function')
  class ApiError extends Error { constructor(status) { super(); this.status = status } }
  provider = new Function('client', 'ApiError', source + '\nreturn createTokenProvider(client)')(
    { auth: { getSession: async () => ({ data: { session: current ? { user: { id: current }, access_token: current + '-token' } : null } }) } },
    ApiError,
  )
  await assert.rejects(provider('A'), { status: 401 })
  current = 'A'
  assert.equal(await provider('A'), 'A-token')
  current = null
  await assert.rejects(provider('A'), { status: 401 })
})

test('ordinary API calls capture the expected account before awaiting token lookup', async () => {
  let finish
  let current = 'A'
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/authToken.js'), 'utf8')
    .replace(/^import .*$/gm, '').replace('export function', 'function')
  class ApiError extends Error { constructor(status) { super(); this.status = status } }
  const provider = new Function('client', 'getAccountId', 'ApiError', source + '\nreturn createTokenProvider(client, getAccountId)')(
    { auth: { getSession: () => new Promise((resolve) => { finish = resolve }) } },
    () => current, ApiError,
  )
  const pending = provider()
  current = 'B'
  finish({ data: { session: { user: { id: 'B' }, access_token: 'B-token' } } })
  await assert.rejects(pending, { status: 401 })
})
