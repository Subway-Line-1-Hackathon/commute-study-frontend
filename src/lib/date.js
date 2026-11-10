// 한국 시간 기준 날짜 키 (YYYY-MM-DD). 하루의 경계는 한국 시간 자정이다.
export function kstDateKey(ts = Date.now()) {
  return new Date(ts + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
