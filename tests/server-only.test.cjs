const assert = require('node:assert/strict')
const test = require('node:test')
const { create } = require('zustand')
const loadSource = require('./helpers/loadSource.cjs')
const materialStore = require('./helpers/loadMaterialStore.cjs')

test('missing authentication client never opens the authenticated app', () => {
  const createAuthController = new Function(
    loadSource(['lib/authController.js']) + '\nreturn createAuthController',
  )()
  const controller = createAuthController({ client: null })
  const stop = controller.start()
  assert.equal(controller.getSnapshot().ready, false)
  assert.ok(controller.getSnapshot().error instanceof Error)
  stop()
})

test('Google login without a configured provider cannot manufacture a user', async () => {
  const code = loadSource(['store/useAuthStore.js'])
  const store = new Function(
    'create',
    'persist',
    'createJSONStorage',
    'zustandStorage',
    'supabase',
    'AUTH_STATUS',
    code + '\nreturn useAuthStore',
  )(
    create,
    (init) => init,
    () => ({}),
    {},
    null,
    { ANONYMOUS: 'ANONYMOUS', AUTHENTICATED: 'AUTHENTICATED', ACTIVE: 'ACTIVE' },
  )
  await assert.rejects(store.getState().loginWithGoogle())
  assert.equal(store.getState().status, 'ANONYMOUS')
  assert.equal(store.getState().user, null)
})

test('failed real upload cannot turn into a generated READY material', async () => {
  const { store } = materialStore({
    uid: () => 'upload',
    apiUploadMaterial: async () => {
      throw new Error('API unavailable')
    },
  })
  store.getState().uploadMaterial('3', [{ name: 'lecture.pdf', size: 10 }])
  await new Promise(setImmediate)
  const material = store.getState().materials[0]
  assert.equal(material.status, 'FAILED')
  assert.equal(material.serverId, null)
  assert.equal(material.uploadFailed, true)
})
