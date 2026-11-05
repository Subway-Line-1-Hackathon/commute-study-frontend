import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { MATERIAL_STATUS as M, ROUTES } from '../lib/constants'
import { useMaterialStore } from '../store/useMaterialStore'

const STATUS_UI = {
  [M.UPLOADED]: { label: '업로드 완료', cls: 'bg-slate-100 text-slate-600' },
  [M.PROCESSING]: { label: '처리 중', cls: 'bg-amber-50 text-amber-700', spinner: true },
  [M.READY]: { label: '준비 완료', cls: 'bg-green-50 text-green-700' },
}

function StatusBadge({ status }) {
  const ui = STATUS_UI[status]
  return (
    <span
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ui.cls}`}
    >
      {ui.spinner && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
      )}
      {ui.label}
    </span>
  )
}

function SubjectCard({ subject, materials, onUpload }) {
  const fileRef = useRef(null)

  const handleChange = (e) => {
    Array.from(e.target.files || []).forEach((file) => onUpload(subject.id, file))
    e.target.value = '' // 같은 파일을 다시 선택할 수 있게 초기화
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">{subject.name}</h3>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 active:bg-blue-100"
        >
          + 자료 추가
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.hwp"
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {materials.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">아직 등록된 자료가 없어요.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {materials.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5"
            >
              <span className="truncate text-sm text-slate-700">{m.fileName}</span>
              <StatusBadge status={m.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function S05Material() {
  const navigate = useNavigate()
  const subjects = useMaterialStore((s) => s.subjects)
  const materials = useMaterialStore((s) => s.materials)
  const addSubject = useMaterialStore((s) => s.addSubject)
  const uploadMaterial = useMaterialStore((s) => s.uploadMaterial)

  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleAddSubject = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (subjects.some((s) => s.name === trimmed)) {
      setError('이미 등록된 과목이에요.')
      return
    }
    addSubject(trimmed)
    setName('')
    setError('')
  }

  const canNext = materials.length > 0

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 px-5 py-6">
      <TopBar backTo={ROUTES.COMMUTE} />

      <h1 className="mt-2 text-2xl font-bold text-slate-900">
        과목과 학습 자료를
        <br />
        등록해 주세요
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        자료를 올리면 단원과 요약본이 자동으로 만들어져요.
      </p>

      <div className="mt-6 flex gap-2">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
          maxLength={30}
          placeholder="과목명 (예: 머신러닝)"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          onClick={handleAddSubject}
          disabled={!name.trim()}
          className="shrink-0 rounded-xl bg-slate-800 px-4 font-medium text-white disabled:bg-slate-300"
        >
          추가
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <div className="mt-5 space-y-3">
        {subjects.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">과목을 먼저 추가해 주세요.</p>
        )}
        {subjects.map((s) => (
          <SubjectCard
            key={s.id}
            subject={s}
            materials={materials.filter((m) => m.subjectId === s.id)}
            onUpload={uploadMaterial}
          />
        ))}
      </div>

      <div className="mt-auto pt-8">
        {!canNext && subjects.length > 0 && (
          <p className="mb-2 text-center text-xs text-slate-400">
            자료를 한 개 이상 올려야 다음으로 갈 수 있어요.
          </p>
        )}
        <button
          onClick={() => navigate(ROUTES.WAITING)}
          disabled={!canNext}
          className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white disabled:bg-slate-300"
        >
          다음
        </button>
      </div>
    </div>
  )
}
