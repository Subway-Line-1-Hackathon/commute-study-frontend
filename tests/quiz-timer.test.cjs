const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')

test('expiration opens the time-up dialog and stops the timer', () => {
  let callback, cleared, timeUp = false, ticks = 0
  const source = fs.readFileSync(path.join(__dirname, '../src/hooks/useQuizTimer.js'), 'utf8')
    .replace(/^import .*$/gm, '').replace('export function', 'function')
  const hook = new Function('useEffect', 'setInterval', 'clearInterval', 'useSessionStore', 'S',
    source + '\nreturn useQuizTimer')(
      (effect) => effect(),
      (fn) => { callback = fn; return 7 },
      (id) => { cleared = id },
      { getState: () => ({ tick() { ticks += 1 }, current: { status: 'ENDED' } }) },
      { ENDED: 'ENDED' },
    )
  hook(true, (value) => { timeUp = value })
  callback()
  assert.equal(timeUp, true)
  assert.equal(cleared, 7)
  assert.equal(ticks, 1)
})
