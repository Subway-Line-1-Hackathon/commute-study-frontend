const loadSource = require('./loadSource.cjs')

function materialStore(overrides = {}) {
  const calls = []
  const M = Object.fromEntries(
    ['UPLOADING', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'EXPIRED'].map((s) => [s, s]),
  )
  class ApiError extends Error {
    constructor(status, body) {
      super(body?.message)
      this.status = status
      this.body = body
    }
  }
  const create = (init) => {
    let state
    const get = () => state
    const set = (patch) => {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
    }
    state = init(set, get)
    return { getState: get, setState: set }
  }
  const deps = {
    create,
    persist: (init) => init,
    createJSONStorage: () => ({}),
    zustandStorage: {},
    M,
    ApiError,
    UPLOAD: { MAX_VISIBLE: 10 },
    isServerMode: true,
    apiDeleteMaterial: async (id) => calls.push(['deleteMaterial', id]),
    errorMessage: (e) => e.message,
    ...overrides,
  }
  const code = loadSource([
    'store/material/selectors.js',
    'store/material/queries.js',
    'store/useMaterialStore.js',
  ])
  const store = new Function(...Object.keys(deps), `${code}\nreturn useMaterialStore`)(
    ...Object.values(deps),
  )
  return { store, calls, ApiError }
}

module.exports = materialStore
