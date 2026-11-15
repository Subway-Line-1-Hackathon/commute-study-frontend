const assert = require('node:assert/strict')
const test = require('node:test')
const materialStore = require('./helpers/loadMaterialStore.cjs')

const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const ready = { categories: [{ id: 11, materialId: 8, questionStatus: 'AVAILABLE' }] }
const setup = (getCategories) => {
  const { store } = materialStore({
    getCategories,
    getMaterials: async () => ({ materials: [] }),
  })
  store.setState({
    subjects: [{ id: '3' }],
    categories: { 3: [{ id: '11', materialId: '8', questionStatus: 'PREPARING' }] },
  })
  return store
}

test('failed category lookup preserves units but records an error, and retry clears it', async () => {
  let fail = true
  const store = setup(async () => {
    if (fail) throw new Error('offline')
    return ready
  })
  await store.getState().syncCategories('3')
  assert.deepEqual(store.getState().categoryQueries[3], { loading: false, error: true })
  assert.equal(store.getState().categories[3][0].questionStatus, 'PREPARING')
  fail = false
  await store.getState().syncCategories('3')
  assert.deepEqual(store.getState().categoryQueries[3], { loading: false, error: false })
  assert.equal(store.getState().categories[3][0].questionStatus, 'AVAILABLE')
})

test('polling and manual retries share an in-flight request instead of racing', async () => {
  const pending = deferred()
  let calls = 0
  const store = setup(() => {
    calls += 1
    return pending.promise
  })
  const first = store.getState().syncCategories('3')
  const second = store.getState().syncCategories('3')
  await Promise.resolve()
  assert.equal(calls, 1)
  assert.equal(store.getState().categoryQueries[3].loading, true)
  pending.resolve(ready)
  await Promise.all([first, second])
  assert.equal(store.getState().categories[3][0].questionStatus, 'AVAILABLE')
  assert.equal(store.getState().categoryQueries[3].loading, false)
})

test('one failed subject does not block a different subject from becoming ready', async () => {
  const store = setup(async (id) => {
    if (id === '3') throw new Error('offline')
    return ready
  })
  store.setState({ subjects: [{ id: '3' }, { id: '4' }] })
  await store.getState().syncCategories()
  assert.equal(store.getState().categoryQueries[3].error, true)
  assert.equal(store.getState().categoryQueries[4].error, false)
  assert.equal(store.getState().categories[4][0].questionStatus, 'AVAILABLE')
})

test('an account switch releases the old request without accepting its late result or error', async () => {
  for (const fail of [true, false]) {
    const old = deferred()
    let calls = 0
    const store = setup(() => (++calls === 1 ? old.promise : Promise.resolve(ready)))
    const request = store.getState().syncCategories('3')
    await Promise.resolve()
    store.getState().invalidateRequests()
    await store.getState().syncCategories('3')
    if (fail) old.reject(new Error('old account'))
    else old.resolve({ categories: [{ id: 11, materialId: 8, questionStatus: 'PREPARING' }] })
    await request
    assert.equal(store.getState().categoryQueries[3].error, false)
    assert.equal(store.getState().categories[3][0].questionStatus, 'AVAILABLE')
  }
})

test('query failure dismisses a READY upload notice and successful retry does not resurrect it', async () => {
  const { getUploadReadiness } = await import('../src/lib/materialReadiness.js')
  let fail = true
  const store = setup(async () => {
    if (fail) throw new Error('offline')
    return ready
  })
  store.setState({
    materials: [
      { id: 'local', serverId: 8, subjectId: '3', status: 'READY', notifyWhenReady: true },
    ],
  })
  await store.getState().syncCategories('3')
  const failed = getUploadReadiness(store.getState(), true)
  assert.equal(failed.waitingMaterials.length, 0)
  assert.equal(failed.readyMaterials.length, 0)
  assert.equal(failed.checkingMaterials.length, 0)
  assert.deepEqual(store.getState().dismissedReadyIds, ['8'])
  fail = false
  await store.getState().syncCategories('3')
  const recovered = getUploadReadiness(store.getState(), true)
  assert.equal(recovered.waitingMaterials.length, 0)
  assert.equal(recovered.checkingMaterials.length, 0)
  assert.equal(recovered.readyMaterials.length, 0)
})

test('query failure dismisses only READY notices in the affected subject', async () => {
  const store = setup(async () => {
    throw new Error('offline')
  })
  store.setState({
    dismissedReadyIds: ['previous'],
    materials: [
      { id: 'done', serverId: 8, subjectId: '3', status: 'READY', notifyWhenReady: true },
      {
        id: 'processing',
        serverId: 9,
        subjectId: '3',
        status: 'PROCESSING',
        notifyWhenReady: true,
      },
      { id: 'other', serverId: 10, subjectId: '4', status: 'READY', notifyWhenReady: true },
    ],
  })
  await store.getState().syncCategories('3')
  assert.deepEqual(store.getState().dismissedReadyIds, ['previous', '8'])
  assert.equal(store.getState().materials[1].status, 'PROCESSING')
})

test('query errors are not persisted and are cleared when account requests are invalidated', () => {
  const { store, options } = materialStore()
  store.setState({ categoryQueries: { 3: { loading: false, error: true } } })
  assert.equal(Object.hasOwn(options.partialize(store.getState()), 'categoryQueries'), false)
  store.getState().invalidateRequests()
  assert.deepEqual(store.getState().categoryQueries, {})
})
