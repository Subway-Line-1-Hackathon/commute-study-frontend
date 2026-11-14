const fs = require('node:fs')
const path = require('node:path')

// Keep browser/API dependencies replaceable while exercising the real action modules.
module.exports = function loadSessionStore(deps) {
  deps = { storage: { get: () => null }, ...deps }
  const files = [
    '../lib/recordSubjects.js',
    'session/time.js',
    'session/wrongNotes.js',
    'session/sync.js',
    'session/creation.js',
    'session/answers.js',
    'session/lifecycle.js',
    'useSessionStore.js',
  ]
  const source = files.map((file) =>
    fs.readFileSync(path.join(__dirname, '../../src/store', file), 'utf8')
      .replace(/^import[\s\S]*?from\s+['"][^'"]+['"]\s*$/gm, '')
      .replace(/^export\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"]\s*$/gm, '')
      .replace(/export const /g, 'const ')
      .replace(/export function /g, 'function '),
  ).join('\n')
  return new Function(...Object.keys(deps), `${source}\nreturn { useSessionStore, getSessionRoute, resumeMessage, canContinue, getRemainingSec, getElapsedSec }`)(...Object.values(deps))
}
