// Swagger(/v3/api-docs) 기준 엔드포인트 모음
import { api } from './api'

// 사용자
export const getMe = () => api('/api/users/me')
export const getSettings = () => api('/api/users/me/settings')
// { nickname, oneWayMin, fromStation, toStation }
export const saveSettings = (body) => api('/api/users/me/settings', { method: 'PUT', body })

// 과목
export const getSubjects = () => api('/api/subjects')
// { name, examDate }
export const createSubject = (body) => api('/api/subjects', { method: 'POST', body })
export const getCategories = (subjectId) => api(`/api/subjects/${subjectId}/categories`)
export const getWrongNotes = (subjectId, categoryId) =>
  api(`/api/subjects/${subjectId}/wrong-notes`, { query: { categoryId } })
// scope: 'session' | 'subject'
export const getReport = (subjectId, { scope, sessionId } = {}) =>
  api(`/api/subjects/${subjectId}/report`, { query: { scope, sessionId } })

// 자료
export const uploadMaterial = (subjectId, files, kind) => {
  const fd = new FormData()
  for (const f of [].concat(files)) fd.append('file', f)
  return api(`/api/subjects/${subjectId}/materials`, { method: 'POST', body: fd, query: { kind } })
}
export const getMaterialStatus = (materialId) => api(`/api/materials/${materialId}/status`)
export const retryMaterial = (materialId) =>
  api(`/api/materials/${materialId}/retry`, { method: 'POST' })

// 세션
// { source, categoryIds, questionTypes, difficulty, studyMinOverride, skipSummary }
export const createSession = (body) => api('/api/sessions', { method: 'POST', body })
export const getCurrentSession = () => api('/api/sessions/current') // 진행 중 없으면 null(204)
export const startSession = (id) => api(`/api/sessions/${id}/start`, { method: 'POST' })
export const endSession = (id, reason) =>
  api(`/api/sessions/${id}/end`, { method: 'POST', body: { reason } })

// 답안
// { sessionId, attempts: [{ questionId, answer, correct, selfJudged, answeredAt }] }
export const saveAttempts = (body) => api('/api/attempts', { method: 'POST', body })
export const judgeAnswer = (questionId, answer) =>
  api('/api/answers/judge', { method: 'POST', body: { questionId, answer } })
export const getExplanation = (questionId) => api(`/api/questions/${questionId}/explanation`)

// AI 질문 (SSE 스트림이라 api()가 아닌 fetch로 직접 읽어야 함)
export const getAiQuota = () => api('/api/users/me/ai-quota')
