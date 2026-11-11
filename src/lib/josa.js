const NUMBER_HAS_FINAL = { 0: true, 1: true, 3: true, 6: true, 7: true, 8: true }

function hasFinalConsonant(word) {
  const last = word.trim().at(-1) ?? ''
  const code = last.charCodeAt(0)

  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0
  if (/[0-9]/.test(last)) return Boolean(NUMBER_HAS_FINAL[last])
  return null
}

export function withObject(word) {
  const final = hasFinalConsonant(word)
  if (final === null) return `${word}을(를)`
  return `${word}${final ? '을' : '를'}`
}
