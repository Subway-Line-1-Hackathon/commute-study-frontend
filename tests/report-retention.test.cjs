const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const read = (name) => fs.readFileSync(path.join(__dirname, '../src', name), 'utf8')

function setup(flush = async () => {}) {
  const materials = { subjects: [{ id: '1' }, { id: '2' }], archivedSubjects: [] }
  const session = { accountId: 'A', current: null, history: [], wrongNotes: [], flushAttempts: flush }
  const calls = []
  let slots = []
  let index = 0
  let effect
  const useSessionStore = (selector) => selector(session)
  useSessionStore.getState = () => session
  const helpers = read('lib/recordSubjects.js').replace(/export function /g, 'function ')
  const source = read('hooks/useReport.js').replace(/^import .*$/gm, '')
    .replace(/export const /g, 'const ').replace(/export function /g, 'function ')
  const hook = new Function('useState', 'useEffect', 'useMaterialStore', 'useSessionStore',
    'getReport', 'kstDateKey', 'dayLabel', 'TREND_DAYS', helpers + '\n' + source + '\nreturn useServerReport')(
    (initial) => { const slot = index++; if (!(slot in slots)) slots[slot] = initial;
      return [slots[slot], (value) => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value }] },
    (fn) => { effect = fn }, (selector) => selector(materials), useSessionStore,
    async (id) => { calls.push(id); return { accuracyTrend: [{ date: '2026-11-14', accuracy: id === '1' ? 1 : 0, answers: 5 }], average: id === '1' ? 1 : 0 } },
    () => '2026-11-14', (date) => date, 7,
  )
  const render = () => { index = 0; return hook() }
  return { materials, calls, render, run: async () => { effect(); for (let i = 0; i < 20; i++) await Promise.resolve() } }
}

test('deleting all subjects preserves the same report requests, graph point and accuracy', async () => {
  const { materials, render, run, calls } = setup()
  render()
  await run()
  const before = render()
  assert.deepEqual(before.trend, [{ label: '2026-11-14', accuracy: 50 }])
  materials.archivedSubjects = materials.subjects
  materials.subjects = []
  render()
  await run()
  const after = render()
  assert.deepEqual(calls, ['1', '2', '1', '2'])
  assert.deepEqual(after.trend, before.trend)
  assert.deepEqual(after.today, before.today)
  assert.equal(after.average, before.average)
})

test('report does not fetch incomplete server totals after answer saving fails', async () => {
  const { render, run, calls } = setup(async () => { throw new Error('offline') })
  render()
  await run()
  assert.equal(render().status, 'error')
  assert.deepEqual(calls, [])
})
