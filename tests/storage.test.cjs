const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const { create } = require('zustand')
const { persist, createJSONStorage } = require('zustand/middleware')

function setup() {
  const disk = new Map()
  let blocked = false
  const check = () => { if (blocked) throw new Error('QuotaExceededError') }
  const localStorage = {
    getItem(key) { check(); return disk.get(key) ?? null },
    setItem(key, value) { check(); disk.set(key, value) },
    removeItem(key) { check(); disk.delete(key) },
  }
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/storage.js'), 'utf8')
    .replace(/export (const|function)/g, '$1')
  const adapter = new Function('localStorage', source + '\nreturn { zustandStorage, storage, getStorageStatus, subscribeStorageStatus, retryStorage }')(localStorage)
  return { ...adapter, disk, block() { blocked = true }, recover() { blocked = false } }
}

test('blocked reads and writes fall back to memory and notify the UI', () => {
  const state = setup()
  const changes = []
  const unsubscribe = state.subscribeStorageStatus(() => changes.push(state.getStorageStatus()))
  state.block()
  assert.equal(state.zustandStorage.getItem('cs:session'), null)
  state.zustandStorage.setItem('cs:session', 'pending answers')
  assert.equal(state.zustandStorage.getItem('cs:session'), 'pending answers')
  assert.deepEqual(changes, [true])
  unsubscribe()
})

test('pending in-memory writes take precedence over stale disk data until retry succeeds', () => {
  const state = setup()
  state.zustandStorage.setItem('cs:session', 'old')
  state.block()
  state.zustandStorage.setItem('cs:session', 'new')
  state.recover()
  assert.equal(state.zustandStorage.getItem('cs:session'), 'new')
  assert.equal(state.disk.get('cs:session'), 'old')
  state.retryStorage()
  assert.equal(state.disk.get('cs:session'), 'new')
  assert.equal(state.getStorageStatus(), false)
})

test('failed deletion never resurrects an old account backup and is retried on recovery', () => {
  const state = setup()
  state.zustandStorage.setItem('cs:user-data:A', 'old backup')
  state.block()
  state.zustandStorage.removeItem('cs:user-data:A')
  state.recover()
  assert.equal(state.zustandStorage.getItem('cs:user-data:A'), null)
  state.retryStorage()
  assert.equal(state.disk.has('cs:user-data:A'), false)
})

test('account backups remain isolated in memory while browser storage is unavailable', () => {
  const state = setup()
  state.block()
  state.zustandStorage.setItem('cs:user-data:A', 'A answers')
  state.zustandStorage.setItem('cs:user-data:B', 'B answers')
  assert.equal(state.zustandStorage.getItem('cs:user-data:A'), 'A answers')
  assert.equal(state.zustandStorage.getItem('cs:user-data:B'), 'B answers')
})

test('a failed persist write does not interrupt the action after set, and retry restores hydration', () => {
  const state = setup()
  let sent = 0
  const createStore = () => create(persist((set) => ({
    pending: [],
    answer() { set({ pending: ['answer'] }); sent += 1 },
  }), { name: 'cs:test', storage: createJSONStorage(() => state.zustandStorage) }))
  const store = createStore()
  state.block()
  assert.doesNotThrow(() => store.getState().answer())
  assert.equal(sent, 1)
  assert.deepEqual(store.getState().pending, ['answer'])
  assert.equal(state.getStorageStatus(), true)
  state.recover()
  state.retryStorage()
  assert.deepEqual(createStore().getState().pending, ['answer'])
})
