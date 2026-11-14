// Swagger(/v3/api-docs) 기준 엔드포인트 모음
// 화면·스토어는 fetch를 직접 쓰지 않고 여기 함수를 부른다. 각 함수 위 주석은 요청 body 또는 응답 형태
// 아직 화면에서 안 쓰는 것: getSettings (getMe 응답에 settings가 들어 있어서)
import { api, ApiError, apiUrl, authHeader } from './api'

// 사용자
export const getMe = () => api('/api/users/me')
export const getSettings = () => api('/api/users/me/settings')
// { nickname, oneWayMin, fromStation, toStation }
export const saveSettings = (body) => api('/api/users/me/settings', { method: 'PUT', body })
// 회원 탈퇴. 계정과 모든 학습 기록을 즉시 삭제한다 (204, 되돌릴 수 없음). 502면 다시 시도
export const withdraw = () => api('/api/users/me', { method: 'DELETE' })

// 과목
export const getSubjects = () => api('/api/subjects')
// { name, examDate }
export const createSubject = (body) => api('/api/subjects', { method: 'POST', body })
// { categories: [{ id, name, pageStart, pageEnd, progress, accuracy, lastStudiedAt, state, questionStatus }], recommendedId }
export const getCategories = (subjectId) => api(`/api/subjects/${subjectId}/categories`)
// { name, examDate } 보낸 필드만 바뀐다. examDate: null이면 시험일 삭제 -> { id, name, examDate, dDay }
export const updateSubject = (subjectId, body) =>
  api(`/api/subjects/${subjectId}`, { method: 'PATCH', body })
// 과목과 그 자료를 지운다(학습 기록은 남음). 204. 분석 중인 자료가 있으면 409
export const deleteSubject = (subjectId) => api(`/api/subjects/${subjectId}`, { method: 'DELETE' })
// { items: [{ questionId, categoryId, stem, wrongCount, status, lastWrongAt }] }
export const getWrongNotes = (subjectId, categoryId) =>
  api(`/api/subjects/${subjectId}/wrong-notes`, { query: { categoryId } })
// scope: 'session'(sessionId 필수) -> { today, feedback } | 'all' -> { accuracyTrend, byCategory, average }
export const getReport = (subjectId, { scope, sessionId } = {}) =>
  api(`/api/subjects/${subjectId}/report`, { query: { scope, sessionId } })

// 자료
// { materials: [{ id, subjectId, fileName, status, createdAt }] } 최신순
export const getMaterials = () => api('/api/materials')
// 확장자별 정확한 Content-Type. 백엔드는 확장자와 Content-Type이 맞아야 받아 준다
const MIME_BY_EXT = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
}

// 브라우저가 붙인 파일 type은 OS 설정에 따라 다르다.
// (예: Office가 없는 Windows에서는 .pptx가 빈 값 -> application/octet-stream으로 전송돼 400)
// 그래서 확장자로 type을 다시 정해서 보낸다
function withMime(file) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const mime = MIME_BY_EXT[ext]
  if (!mime || file.type === mime) return file
  return new File([file], file.name, { type: mime, lastModified: file.lastModified })
}

// PDF/PPTX 1개 또는 사진(PNG·JPG 섞어도 됨) 1~20장 -> { materialId, status }
export const uploadMaterial = (subjectId, files, kind = 'LECTURE') => {
  const fd = new FormData()
  for (const f of [].concat(files)) fd.append('file', withMime(f))
  return api(`/api/subjects/${subjectId}/materials`, { method: 'POST', body: fd, query: { kind } })
}
// { status: UPLOADED|PROCESSING|READY|FAILED|EXPIRED, categoryCount, error }
export const getMaterialStatus = (materialId) => api(`/api/materials/${materialId}/status`)
export const retryMaterial = (materialId) =>
  api(`/api/materials/${materialId}/retry`, { method: 'POST' })
// 자료를 지운다(학습 기록은 남음). 204. 업로드·분석 중이면 409
export const deleteMaterial = (materialId) =>
  api(`/api/materials/${materialId}`, { method: 'DELETE' })

// 세션
// { source: 'categories'|'wrongNotes', categoryIds, questionTypes: ['OX'|'MC'|'SHORT'],
//   difficulty: 1~3, studyMinOverride, skipSummary }
export const createSession = (body) => api('/api/sessions', { method: 'POST', body })
// 진행 중 없으면 null(204) | { sessionId, categoryNames, answered, total }
export const getCurrentSession = () => api('/api/sessions/current')
export const startSession = (id) => api(`/api/sessions/${id}/start`, { method: 'POST' })
// 과목 구분 없이 세션 전체 결과
// { sessionId, today: { answered, correct, accuracy }, feedback, feedbackStatus: PENDING|READY|SKIPPED|FAILED }
export const getSessionReport = (id) => api(`/api/sessions/${id}/report`)
// reason: 'QUIT' | 'ARRIVED' | 'NEW_START' | 'NEXT_DAY'
export const endSession = (id, reason) =>
  api(`/api/sessions/${id}/end`, { method: 'POST', body: { reason } })

// 답안
// { sessionId, attempts: [{ questionId, answer, correct, selfJudged, answeredAt }] }
export const saveAttempts = (body) => api('/api/attempts', { method: 'POST', body })
// { correct: true|false|null, reason, timeout }
export const judgeAnswer = (questionId, answer) =>
  api('/api/answers/judge', { method: 'POST', body: { questionId, answer } })
// { explanation, sourcePage }
export const getExplanation = (questionId) => api(`/api/questions/${questionId}/explanation`)

// AI 질문
// { used, limit, remaining }
export const getAiQuota = () => api('/api/users/me/ai-quota')

// SSE 스트림이라 api()가 아닌 fetch로 직접 읽는다. history는 최근 6개만 보낸다
// onDelta(text)로 조각을 받고, 끝나면 done 이벤트의 data를 돌려준다
export async function askQuestion(questionId, { message, history = [], onDelta, signal } = {}) {
  const res = await fetch(apiUrl(`/api/questions/${questionId}/ask`), {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(await authHeader()),
    },
    body: JSON.stringify({ message, history: history.slice(-6) }),
  })

  // 스트림 시작 전 오류는 JSON으로 온다
  if (!res.ok) {
    let body = null
    try {
      body = await res.json()
    } catch {
      /* 본문 없음 */
    }
    throw new ApiError(res.status, body)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let done = null

  // SSE 이벤트 하나("event: 이름\ndata: 내용" 줄 묶음)를 처리한다
  // delta: 답변 조각 / done: 끝(최종 데이터) / error: 서버 오류
  const handle = (raw) => {
    let event = 'message'
    const dataLines = []
    for (const line of raw.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
    }
    const text = dataLines.join('\n')
    let data = text
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      /* 문자열 그대로 */
    }
    if (event === 'delta') onDelta?.(typeof data === 'string' ? data : (data?.text ?? ''))
    else if (event === 'done') done = data ?? {}
    else if (event === 'error') throw new ApiError(502, data)
  }

  // 스트림을 조금씩 읽어 buffer에 붙이고, 빈 줄(\n\n)로 구분된 이벤트가 완성될 때마다 처리한다
  for (;;) {
    const { value, done: end } = await reader.read()
    if (end) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx).replace(/^\r?\n\r?\n/, '')
      if (raw.trim()) handle(raw)
    }
  }
  if (buffer.trim()) handle(buffer)
  return done
}
