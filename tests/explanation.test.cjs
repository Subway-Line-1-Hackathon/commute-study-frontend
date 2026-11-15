const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')

// 해설 훅을 실행해 비동기 응답과 문제 전환을 검증한다.
function setup() {
  let state
  let effect
  const requests = []
  const source = fs.readFileSync(path.join(__dirname, '../src/hooks/useExplanation.js'), 'utf8')
    .replace(/^import .*$/gm, '')
    .replace('export function', 'function')
  const hook = new Function('useState', 'useEffect', 'getExplanation', 'stripMarkdown', 'T',
    source + '\nreturn useExplanation')(
    (initial) => { state ??= initial; return [state, (next) => { state = next }] },
    (callback) => { effect = callback },
    (id) => new Promise((resolve, reject) => requests.push({ id, resolve, reject })),
    (value) => value, { SHORT: 'SHORT' },
  )
  return { render: hook, runEffect: () => effect(), requests }
}

test('short-answer explanation response exposes the canonical answer', async () => {
  const { render, runEffect, requests } = setup()
  const question = { id: 1, type: 'SHORT' }
  assert.equal(render(question, true, { includeAnswer: true }).loaded, false)
  runEffect()
  requests[0].resolve({ answer: '정답', explanation: '해설', sourcePage: 3 })
  await Promise.resolve()
  assert.deepEqual(render(question, true, { includeAnswer: true }), { answer: '정답', explanation: '해설', sourcePage: 3, loaded: true })
  assert.equal(render({ id: 2, type: 'SHORT' }, true, { includeAnswer: true }).answer, null)
})

test('missing short answer is fetched even if the question already has explanation', async () => {
  const { render, runEffect, requests } = setup()
  const question = { id: 1, type: 'SHORT', explanation: '기존 해설' }
  render(question, true, { includeAnswer: true })
  runEffect()
  assert.equal(requests.length, 1)
  requests[0].resolve({ answer: '정답', explanation: '서버 해설' })
  await Promise.resolve()
  assert.equal(render(question, true, { includeAnswer: true }).answer, '정답')
  assert.equal(render(question, true, { includeAnswer: true }).explanation, '기존 해설')
})

test('existing answer takes precedence and disabled hook does not fetch', () => {
  const { render, runEffect, requests } = setup()
  assert.equal(render({ id: 1, type: 'SHORT', answer: '기존 정답' }, false, { includeAnswer: true }).answer, '기존 정답')
  runEffect()
  assert.equal(requests.length, 0)
})

test('late explanation response is ignored after cleanup', async () => {
  const { render, runEffect, requests } = setup()
  render({ id: 1, type: 'SHORT' }, true, { includeAnswer: true })
  const cleanup = runEffect()
  cleanup()
  requests[0].resolve({ answer: '이전 정답' })
  await Promise.resolve()
  assert.equal(render({ id: 2, type: 'SHORT' }, true, { includeAnswer: true }).answer, null)
})

test('ordinary explanation consumers keep the original behavior without answer lookup', () => {
  const { render, runEffect, requests } = setup()
  assert.deepEqual(render({ id: 1, type: 'SHORT', explanation: '기존 해설' }), {
    explanation: '기존 해설', sourcePage: null, loaded: true,
  })
  runEffect()
  assert.equal(requests.length, 0)
})
