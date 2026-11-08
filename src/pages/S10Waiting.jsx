import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import TopBar from '../components/TopBar'
import { MATERIAL_STATUS as M, ROUTES, UPLOAD } from '../lib/constants'
import { useMaterialStore } from '../store/useMaterialStore'

const FORMAT_ERROR = '지원하지 않는 파일 형식입니다 (PDF, PPTX, PNG만 가능)'
const SIZE_ERROR = `${UPLOAD.MAX_MB}MB 이하 파일만 올릴 수 있어요`
const COUNT_ERROR = `과목당 ${UPLOAD.MAX_PER_SUBJECT}개까지 올릴 수 있어요`

const BADGE = {
  [M.UPLOADING]: { label: '업로드 중', cls: 'bg-slate-100 text-slate-600' },
  [M.UPLOADED]: { label: '분석 대기', cls: 'bg-warning-soft text-warning' },
  [M.PROCESSING]: { label: '분석 중', cls: 'bg-warning-soft text-warning' },
  [M.READY]: { label: '준비 완료', cls: 'bg-success-soft text-success' },
  [M.FAILED]: { label: '실패', cls: 'bg-danger-soft text-danger' },
}

const formatSize = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.round(bytes / 1024))}KB`

function MaterialCard({ material, onRetry }) {
  const { status } = material

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{material.fileName}</p>
          {material.fileSize != null && (
            <p className="mt-0.5 text-xs text-slate-400">{formatSize(material.fileSize)}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE[status].cls}`}
        >
          {status === M.UPLOADING
            ? `${BADGE[status].label} ${material.progress ?? 0}%`
            : BADGE[status].label}
        </span>
      </div>

      {status === M.UPLOADING && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${material.progress ?? 0}%` }}
          />
        </div>
      )}

      {(status === M.UPLOADED || status === M.PROCESSING) && (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
          단원 나누고 요약본 만드는 중이에요
        </p>
      )}

      {status === M.READY && <p className="mt-3 text-xs text-slate-500">학습할 준비가 됐어요</p>}

      {status === M.FAILED && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-danger">
            {material.retried
              ? '다시 시도해도 처리하지 못했어요. 다른 파일로 올려 주세요.'
              : material.errorMessage}
          </p>
          {!material.retried && (
            <button
              type="button"
              onClick={() => onRetry(material.id)}
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 active:bg-slate-50"
            >
              다시 시도
            </button>
          )}
        </div>
      )}
    </li>
  )
}

export default function S10Waiting() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fileRef = useRef(null)

  const subjects = useMaterialStore((s) => s.subjects)
  const allMaterials = useMaterialStore((s) => s.materials)
  const uploadMaterial = useMaterialStore((s) => s.uploadMaterial)
  const retryMaterial = useMaterialStore((s) => s.retryMaterial)
  const resumePending = useMaterialStore((s) => s.resumePending)

  const [errors, setErrors] = useState([])

  const subject = subjects.find((s) => s.id === params.get('subjectId')) ?? subjects.at(-1)
  const materials = allMaterials.filter((m) => m.subjectId === subject?.id)
  const room = UPLOAD.MAX_PER_SUBJECT - materials.length
  const hasReady = materials.some((m) => m.status === M.READY)

  useEffect(() => {
    resumePending()
  }, [resumePending])

  if (!subject) return <Navigate to={ROUTES.SUBJECT_NEW} replace />

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''

    const next = []
    const accepted = []
    picked.forEach((file) => {
      const ext = file.name.split('.').pop().toLowerCase()
      if (!UPLOAD.EXTENSIONS.includes(ext)) next.push(FORMAT_ERROR)
      else if (file.size > UPLOAD.MAX_MB * 1024 * 1024) next.push(SIZE_ERROR)
      else accepted.push(file)
    })
    if (accepted.length > room) next.push(COUNT_ERROR)

    accepted.slice(0, Math.max(0, room)).forEach((file) => uploadMaterial(subject.id, file))
    setErrors([...new Set(next)])
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 px-5 py-6">
      <TopBar backTo={ROUTES.HOME} />

      <h1 className="mt-4 text-2xl font-bold text-slate-900">학습 자료를 올려주세요</h1>
      <p className="mt-2 text-sm text-slate-500">
        {subject.name} · {materials.length}/{UPLOAD.MAX_PER_SUBJECT}
      </p>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={room <= 0}
        className="mt-6 flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-primary/40 bg-white px-4 py-8 text-center active:bg-slate-50 disabled:opacity-40"
      >
        <span className="font-semibold text-primary">파일 선택</span>
        <span className="text-xs text-slate-500">
          PDF · PPTX · PNG · 파일당 최대 {UPLOAD.MAX_MB}MB
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={UPLOAD.EXTENSIONS.map((ext) => `.${ext}`).join(',')}
        onChange={handleFiles}
        className="hidden"
      />

      {errors.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {materials.length > 0 && (
        <ul className="mt-4 space-y-3">
          {materials.map((m) => (
            <MaterialCard key={m.id} material={m} onRetry={retryMaterial} />
          ))}
        </ul>
      )}

      <div className="mt-auto pt-10">
        {materials.length > 0 && !hasReady && (
          <p className="mb-2 text-center text-xs text-slate-500">
            분석이 끝나면 단원 목록을 볼 수 있어요. 몇 분 걸릴 수 있어요.
          </p>
        )}
        <Button
          onClick={() => navigate(`${ROUTES.UNIT_PREVIEW}?subjectId=${subject.id}`)}
          disabled={!hasReady}
        >
          단원 목록 보러 가기
        </Button>
        {materials.length > 0 && !hasReady && (
          <button
            type="button"
            onClick={() => navigate(ROUTES.HOME)}
            className="mt-3 w-full py-2 text-sm text-slate-500"
          >
            홈에서 기다릴게요
          </button>
        )}
      </div>
    </div>
  )
}
