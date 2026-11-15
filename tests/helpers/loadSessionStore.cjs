const loadSource = require('./loadSource.cjs')

// Keep browser/API dependencies replaceable while exercising the real action modules.
module.exports = function loadSessionStore(deps) {
  deps = {
    storage: { get: () => null },
    ApiError: class ApiError extends Error {
      constructor(status, body) {
        super(body?.message)
        this.status = status
        this.body = body
      }
    },
    ...deps,
  }
  const files = [
    '../lib/answer.js',
    '../lib/recordSubjects.js',
    'session/time.js',
    'session/wrongNotes.js',
    'session/sync.js',
    'session/creation.js',
    'session/answers.js',
    'session/lifecycle.js',
    'useSessionStore.js',
  ]
  const source = loadSource(files.map((file) => `store/${file}`))
  return new Function(
    ...Object.keys(deps),
    `${source}\nreturn { useSessionStore, getSessionRoute, resumeMessage, canContinue, getRemainingSec, getElapsedSec }`,
  )(...Object.values(deps))
}
