import { uid } from '../lib/storage'

const MOCK_UNIT_TITLES = ['개념 정리', '핵심 원리', '응용과 예제']

export function generateUnitsAndSummary(fileName) {
  const title = fileName.replace(/\.[^.]+$/, '')
  const summary = `${title}의 핵심 내용을 정리한 요약이에요. (Mock)`

  const units = MOCK_UNIT_TITLES.map((unitTitle, index) => ({
    id: uid(),
    title: `${title} ${unitTitle}`,
    summary: `${title} ${unitTitle} 요약이에요. (Mock)`,
    pages: 10 + index * 6,
  }))

  return { units, summary }
}

export const MOCK_FAIL_MESSAGE = '글자를 인식하지 못했어요. 글자가 선명한 파일로 다시 올려주세요.'
export const shouldMockFail = (fileName) => /fail|실패/i.test(fileName)
