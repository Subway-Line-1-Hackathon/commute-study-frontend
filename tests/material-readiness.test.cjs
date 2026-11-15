const assert = require('node:assert/strict')
const test = require('node:test')

const load = () => import('../src/lib/materialReadiness.js')
const upload = {
  id: 'local',
  serverId: 8,
  subjectId: '3',
  fileName: 'new.pdf',
  status: 'READY',
  notifyWhenReady: true,
}
const state = (patch = {}) => ({
  materials: [upload],
  categories: {},
  subjects: [{ id: '3', name: '교육학' }],
  ...patch,
})

test('READY before categories arrive is checking, never reported as question generation', async () => {
  const { getUploadReadiness } = await load()
  const result = getUploadReadiness(state(), true)
  assert.equal(result.readyMaterials.length, 0)
  assert.equal(result.waitingMaterials.length, 0)
  assert.equal(result.checkingMaterials.length, 1)
})

test('PREPARING transitions to a completion card without waiting for the server materials list', async () => {
  const { getUploadReadiness } = await load()
  const data = state({
    categories: { 3: [{ id: '11', materialId: '8', questionStatus: 'PREPARING' }] },
  })
  assert.equal(getUploadReadiness(data, true).waitingMaterials.length, 1)
  data.categories[3][0].questionStatus = 'AVAILABLE'
  const result = getUploadReadiness(data, true)
  assert.equal(result.waitingMaterials.length, 0)
  assert.equal(result.readyMaterials.length, 1)
  assert.equal(result.readyMaterials[0].key, '8')
  assert.equal(result.readyMaterials[0].subjectName, '교육학')
})

test('old uploads, dismissed cards, and failed uploads do not show completion', async () => {
  const { getUploadReadiness } = await load()
  const categories = { 3: [{ materialId: 8, questionStatus: 'AVAILABLE' }] }
  for (const patch of [
    { materials: [{ ...upload, notifyWhenReady: undefined }] },
    { dismissedReadyIds: [8] },
    { materials: [{ ...upload, status: 'FAILED' }] },
  ]) {
    assert.equal(getUploadReadiness(state({ categories, ...patch }), true).readyMaterials.length, 0)
  }
})

test('one unfinished unit keeps the material pending; other materials cannot complete it', async () => {
  const { getUploadReadiness } = await load()
  const result = getUploadReadiness(
    state({
      categories: {
        3: [
          { materialId: '8', questionStatus: 'AVAILABLE' },
          { materialId: '8', questionStatus: 'PREPARING' },
          { materialId: '9', questionStatus: 'AVAILABLE' },
        ],
      },
    }),
    true,
  )
  assert.equal(result.waitingMaterials.length, 1)
  assert.equal(result.readyMaterials.length, 0)
})

test('missing or mismatched material links cannot claim preparation or completion', async () => {
  const { getUploadReadiness } = await load()
  for (const materialId of [null, undefined, 'another-material']) {
    const result = getUploadReadiness(
      state({ categories: { 3: [{ materialId, questionStatus: 'AVAILABLE' }] } }),
      true,
    )
    assert.equal(result.readyMaterials.length, 0)
    assert.equal(result.waitingMaterials.length, 0)
    assert.equal(result.checkingMaterials.length, 1)
  }
})

test('a matching material in another subject cannot complete the upload', async () => {
  const { getUploadReadiness } = await load()
  const result = getUploadReadiness(
    state({ categories: { 4: [{ materialId: 8, questionStatus: 'AVAILABLE' }] } }),
    true,
  )
  assert.equal(result.readyMaterials.length, 0)
  assert.equal(result.checkingMaterials.length, 1)
})

test('failed category refresh hides READY upload notices without an error or completion card', async () => {
  const { getUploadReadiness } = await load()
  for (const questionStatus of ['PREPARING', 'AVAILABLE']) {
    const data = state({
      categories: { 3: [{ materialId: 8, questionStatus }] },
      categoryQueries: { 3: { loading: false, error: true } },
    })
    const failed = getUploadReadiness(data, true)
    assert.equal(failed.waitingMaterials.length, 0)
    assert.equal(failed.readyMaterials.length, 0)
    assert.equal(failed.checkingMaterials.length, 0)
    data.categoryQueries[3].loading = true
    assert.equal(getUploadReadiness(data, true).checkingMaterials.length, 0)
    data.categoryQueries[3] = { loading: false, error: false }
    data.categories[3][0].questionStatus = 'AVAILABLE'
    const recovered = getUploadReadiness(data, true)
    assert.equal(recovered.readyMaterials.length, 1)
  }
})

test('unrecognized question states stay checking instead of incorrectly claiming completion', async () => {
  const { getUploadReadiness } = await load()
  for (const questionStatus of [null, undefined, 'FAILED']) {
    const result = getUploadReadiness(
      state({ categories: { 3: [{ materialId: 8, questionStatus }] } }),
      true,
    )
    assert.equal(result.readyMaterials.length, 0)
    assert.equal(result.checkingMaterials.length, 1)
  }
})
