// 한국 시간 기준 날짜 키 (YYYY-MM-DD). 하루의 경계는 한국 시간 자정이다.
// UTC 시각에 9시간을 더한 뒤 ISO 문자열의 날짜 부분만 잘라서, 브라우저 시간대와 상관없이 KST 날짜를 얻는다
export function kstDateKey(ts = Date.now()) {
  return new Date(ts + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function getDDay(examDate) {
  if (!examDate) return null

  const today = new Date(`${kstDateKey()}T00:00:00+09:00`)
  const exam = new Date(`${examDate}T00:00:00+09:00`)
  const days = Math.round((exam - today) / 86400000)

  if (days < 0) return null
  if (days === 0) return 'D-Day'
  return `D-${days}`
}
