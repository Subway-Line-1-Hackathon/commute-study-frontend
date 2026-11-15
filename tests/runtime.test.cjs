const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const source = fs.readFileSync(path.join(__dirname, '../src/lib/runtime.js'), 'utf8').split('export const dataMode')[0]
const resolveDataMode = new Function(source.replace('export function', 'function') + '\nreturn resolveDataMode')()
const configured = { VITE_SUPABASE_URL: 'https://example.test', VITE_SUPABASE_ANON_KEY: 'public-test-key' }

test('existing deployments keep their implicit server/mock mode', () => {
  assert.equal(resolveDataMode({}), 'mock')
  assert.equal(resolveDataMode(configured), 'server')
})

test('explicit mock mode does not depend on the presence of authentication settings', () => {
  assert.equal(resolveDataMode({ ...configured, VITE_DATA_MODE: 'mock' }), 'mock')
})

test('invalid modes and incomplete explicit server configurations fail clearly', () => {
  assert.throws(() => resolveDataMode({ VITE_DATA_MODE: 'typo' }), /server or mock/)
  assert.throws(() => resolveDataMode({ VITE_DATA_MODE: 'server' }), /requires/)
  assert.equal(resolveDataMode({ ...configured, VITE_DATA_MODE: 'server' }), 'server')
})
