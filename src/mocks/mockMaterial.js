import { uid } from '../lib/storage'

// 자료 하나가 곧 학습 항목이다. 단원으로 나누지 않는다.
export function generateUnitsAndSummary(fileName) {
  const title = fileName.replace(/\.[^.]+$/, '')
  const summary = `${title}의 핵심 내용을 정리한 요약이에요. (Mock)`
  return { units: [{ id: uid(), title, summary }], summary }
}
