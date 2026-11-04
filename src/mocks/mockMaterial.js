import { uid } from '../lib/storage'

export function generateUnitsAndSummary(fileName) {
  const base = fileName.replace(/\.[^.]+$/, '')
  const units = ['1단원. 개요', '2단원. 핵심 개념', '3단원. 응용', '4단원. 정리'].map((title) => ({
    id: uid(),
    title,
    summary: `${base}의 "${title}" 요약본 (Mock)`,
  }))
  return { units, summary: `${base} 전체 요약본 (Mock)` }
}
