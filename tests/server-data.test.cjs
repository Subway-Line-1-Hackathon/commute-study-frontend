const assert = require('node:assert/strict')
const test = require('node:test')

test('material cleanup preserves API records and active uploads while removing generated entries', async () => {
  const { cleanMaterialData } = await import('../src/lib/serverData.js')
  const real = { id: 'local-upload', serverId: 8, subjectId: '3', status: 'READY' }
  const active = { id: 'uploading', subjectId: '3', status: 'UPLOADING' }
  const failed = { id: 'failed', subjectId: '3', status: 'FAILED', uploadFailed: true }
  const cleaned = cleanMaterialData({
    subjects: [{ id: 'generated' }, { id: '3' }],
    archivedSubjects: [{ id: 'old-generated' }, { id: '4' }],
    materials: [{ id: 'generated', status: 'READY' }, real, active, failed],
    categories: { generated: [{ id: 'generated' }], 3: [{ categoryId: 11 }, { id: 'generated' }] },
    serverMaterials: [{ id: 8 }],
    dismissedReadyIds: ['generated', '8'],
  })
  assert.deepEqual(cleaned.subjects, [{ id: '3' }])
  assert.deepEqual(cleaned.archivedSubjects, [{ id: '4' }])
  assert.deepEqual(cleaned.materials, [real, active, failed])
  assert.deepEqual(cleaned.categories, { 3: [{ categoryId: 11 }] })
  assert.deepEqual(cleaned.dismissedReadyIds, ['8'])
})

test('session cleanup preserves the real current session, history and unsent queues', async () => {
  const { cleanSessionData } = await import('../src/lib/serverData.js')
  const current = { serverId: 42, answers: [{ questionId: 11, value: 'O' }] }
  const real = { serverId: 41 }
  const attempt = { key: 'pending', sessionId: 42, questionId: 11, answer: 'O' }
  const end = { key: 'end', sessionId: 42, reason: 'QUIT' }
  const cleaned = cleanSessionData({
    current,
    continuing: true,
    history: [{ id: 'generated' }, real],
    wrongNotes: [{ questionId: 'generated' }, { questionId: 11 }],
    pendingAttempts: [attempt],
    pendingEnds: [end],
    dailyStats: { today: { answered: 1 } },
  })
  assert.equal(cleaned.current, current)
  assert.deepEqual(cleaned.history, [real])
  assert.deepEqual(cleaned.wrongNotes, [{ questionId: 11 }])
  assert.deepEqual(cleaned.pendingAttempts, [attempt])
  assert.deepEqual(cleaned.pendingEnds, [end])
  assert.equal(cleaned.continuing, true)
})

test('generated sessions cannot resume and their standalone aggregates are removed', async () => {
  const { cleanSessionData } = await import('../src/lib/serverData.js')
  const cleaned = cleanSessionData({
    current: { id: 'generated' },
    history: [{ id: 'generated' }],
    continuing: true,
    dailyStats: { today: { answered: 20 } },
  })
  assert.equal(cleaned.current, null)
  assert.equal(cleaned.continuing, false)
  assert.deepEqual(cleaned.history, [])
  assert.deepEqual(cleaned.dailyStats, {})
})

test('server identifiers support both numeric API IDs and persisted strings', async () => {
  const { isServerId } = await import('../src/lib/serverData.js')
  for (const id of [1, '42', '9223372036854775807']) assert.equal(isServerId(id), true)
  for (const id of [null, undefined, '', 'generated', -1, 0]) assert.equal(isServerId(id), false)
})
