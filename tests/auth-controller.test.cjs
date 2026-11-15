const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const source = fs.readFileSync(path.join(__dirname, '../src/lib/authController.js'), 'utf8')
const createAuthController = new Function(source.replace('export function', 'function') + '\nreturn createAuthController')()
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const settle = () => new Promise(setImmediate)

function setup({ session = null, initial, syncMe = async () => {} } = {}) {
  let callback
  let unsubscribed = false
  let suspended = 0
  const switches = []
  const auth = {
    user: { id: 'previous' },
    status: 'ACTIVE',
    applySession(value) { this.user = value?.user ?? null; this.status = value ? 'ACTIVE' : 'ANONYMOUS' },
    syncMe,
  }
  const controller = createAuthController({
    client: { auth: {
      getSession: async () => ({ data: { session: initial ? await initial.promise : session } }),
      onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe() { unsubscribed = true } } } } },
    } },
    getAuth: () => auth,
    switchData: (before, after) => switches.push([before, after]),
    suspendData: () => { suspended += 1 },
    syncSubjects: async () => {},
    resumePending() {},
  })
  return { controller, auth, switches, event: (...args) => callback(...args), get unsubscribed() { return unsubscribed }, get suspended() { return suspended } }
}

test('persisted ACTIVE state remains gated until the real session is checked', async () => {
  const initial = deferred()
  const { controller, auth } = setup({ initial })
  const stop = controller.start()
  assert.equal(controller.getSnapshot().ready, false)
  initial.resolve(null)
  await settle()
  assert.equal(auth.status, 'ANONYMOUS')
  assert.equal(controller.getSnapshot().ready, true)
  stop()
})

test('direct entry restores the actual account and waits for profile synchronization', async () => {
  const profile = deferred()
  const { controller, switches } = setup({ session: { user: { id: 'B' } }, syncMe: () => profile.promise })
  const stop = controller.start()
  await settle()
  assert.deepEqual(switches, [['previous', 'B']])
  assert.equal(controller.getSnapshot().ready, false)
  profile.resolve()
  await settle()
  assert.equal(controller.getSnapshot().ready, true)
  stop()
})

test('a new auth event wins over a late initial session response', async () => {
  const initial = deferred()
  const { controller, auth, event } = setup({ initial })
  const stop = controller.start()
  event('SIGNED_IN', { user: { id: 'B' } })
  await settle()
  initial.resolve({ user: { id: 'stale' } })
  await settle()
  assert.equal(auth.user.id, 'B')
  assert.equal(controller.getSnapshot().ready, true)
  stop()
})

test('account changes and sign-out are observed without returning to the splash route', async () => {
  const state = setup({ session: { user: { id: 'A' } } })
  const stop = state.controller.start()
  await settle()
  state.event('SIGNED_IN', { user: { id: 'B' } })
  assert.equal(state.controller.getSnapshot().ready, false)
  await settle()
  assert.equal(state.auth.user.id, 'B')
  state.event('SIGNED_OUT', null)
  await settle()
  assert.equal(state.auth.status, 'ANONYMOUS')
  assert.equal(state.controller.getSnapshot().ready, true)
  stop()
  assert.equal(state.unsubscribed, true)
})

test('refreshing a token for the same user does not remount the app', async () => {
  const state = setup({ session: { user: { id: 'A' } } })
  const stop = state.controller.start()
  await settle()
  const before = state.controller.getSnapshot()
  state.event('TOKEN_REFRESHED', { user: { id: 'A' } })
  assert.equal(state.controller.getSnapshot(), before)
  assert.equal(state.switches.length, 1)
  stop()
})

test('initialization failure can be retried rather than leaving a permanent splash', async () => {
  let fail = true
  const state = setup({ session: { user: { id: 'A' } }, syncMe: async () => { if (fail) throw new Error('offline') } })
  const stop = state.controller.start()
  await settle()
  assert.equal(state.controller.getSnapshot().ready, false)
  assert.equal(state.controller.getSnapshot().error.message, 'offline')
  fail = false
  await state.controller.retry()
  assert.equal(state.controller.getSnapshot().ready, true)
  stop()
})

test('the controller supports StrictMode stop/start without stale initialization', async () => {
  const state = setup({ session: { user: { id: 'A' } } })
  state.controller.start()()
  const stop = state.controller.start()
  await settle()
  assert.equal(state.controller.getSnapshot().ready, true)
  assert.deepEqual(state.switches, [['previous', 'A']])
  stop()
})
