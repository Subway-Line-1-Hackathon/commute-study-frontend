import { uid } from '../lib/storage'

// 자료 하나가 곧 학습 항목이다. 단원으로 나누지 않는다.
export function generateUnitsAndSummary(fileName) {
  const title = fileName.replace(/\.[^.]+$/, '')
  const summary = `${title}의 핵심 내용을 정리한 요약이에요. (Mock)`
  return { units: [{ id: uid(), title, summary }], summary }
}

export const MOCK_FAIL_MESSAGE = '글자를 인식하지 못했어요. 글자가 선명한 파일로 다시 올려주세요.'
export const shouldMockFail = (fileName) => /fail|실패/i.test(fileName)
