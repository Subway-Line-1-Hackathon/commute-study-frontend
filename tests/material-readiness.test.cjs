const assert = require('node:assert/strict')
const test = require('node:test')

const load = () => import('../src/lib/materialReadiness.js')
const upload = { id: 'local', serverId: 8, subjectId: '3', fileName: 'new.pdf', status: 'READY', notifyWhenReady: true }
const state = (patch = {}) => ({ materials: [upload], categories: {}, subjects: [{ id: '3', name: '교육학' }], ...patch })

test('READY before categories arrive keeps polling instead of disappearing', async () => {
  const { getUploadReadiness } = await load()
  const result = getUploadReadiness(state(), true)
  assert.equal(result.readyMaterials.length, 0)
  assert.equal(result.waitingMaterials.length, 1)
})

test('PREPARING transitions to a completion card without waiting for the server materials list', async () => {
  const { getUploadReadiness } = await load()
  const data = state({ categories: { 3: [{ id: '11', materialId: '8', questionStatus: 'PREPARING' }] } })
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
  const result = getUploadReadiness(state({ categories: { 3: [
    { materialId: '8', questionStatus: 'AVAILABLE' },
    { materialId: '8', questionStatus: 'PREPARING' },
    { materialId: '9', questionStatus: 'AVAILABLE' },
  ] } }), true)
  assert.equal(result.waitingMaterials.length, 1)
  assert.equal(result.readyMaterials.length, 0)
})

test('mock uploads also support ready cards and dismissal', async () => {
  const { getUploadReadiness } = await load()
  const data = state({ materials: [{ ...upload, serverId: null, units: [{ id: 'u' }] }] })
  assert.equal(getUploadReadiness(data, false).readyMaterials[0].key, 'local')
  assert.equal(getUploadReadiness({ ...data, dismissedReadyIds: ['local'] }, false).readyMaterials.length, 0)
})
