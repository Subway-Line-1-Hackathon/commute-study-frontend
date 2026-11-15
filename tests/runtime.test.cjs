const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const source = fs
  .readFileSync(path.join(__dirname, '../src/lib/runtime.js'), 'utf8')
  .split('export const configurationError')[0]
const getConfigurationError = new Function(
  source.replace('export function', 'function') + '\nreturn getConfigurationError',
)()

test('missing authentication settings report a configuration error', () => {
  assert.equal(typeof getConfigurationError({}), 'string')
  assert.equal(
    typeof getConfigurationError({ VITE_SUPABASE_URL: 'https://example.test' }),
    'string',
  )
})

test('complete authentication settings enable the real client', () => {
  assert.equal(
    getConfigurationError({
      VITE_SUPABASE_URL: 'https://example.test',
      VITE_SUPABASE_ANON_KEY: 'public-test-key',
    }),
    null,
  )
})
