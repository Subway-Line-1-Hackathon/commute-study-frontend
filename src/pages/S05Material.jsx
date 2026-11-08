import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import TextField from '../components/TextField'
import TopBar from '../components/TopBar'
import { ROUTES, SUBJECT_NAME } from '../lib/constants'
import { kstDateKey } from '../lib/date'
import { useMaterialStore } from '../store/useMaterialStore'

export default function S05Material() {
  const navigate = useNavigate()
  const subjects = useMaterialStore((s) => s.subjects)
  const addSubject = useMaterialStore((s) => s.addSubject)

  const [name, setName] = useState('')
  const [examDate, setExamDate] = useState('')

  const trimmed = name.trim()
  const duplicated = subjects.some((s) => s.name === trimmed)
  const valid = trimmed.length > 0 && trimmed.length <= SUBJECT_NAME.MAX && !duplicated

  const save = () => {
    if (!valid) return
    const subject = addSubject(trimmed, examDate)
    navigate(`${ROUTES.MATERIAL_UPLOAD}?subjectId=${subject.id}`, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white px-6 py-6">
      <TopBar backTo={ROUTES.HOME} />

      <h1 className="mt-4 text-2xl font-bold text-slate-900">공부할 과목을 등록해요</h1>
      <p className="mt-2 text-xs text-slate-500">
        <span className="text-red-500">*</span> 표시는 필수 입력
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <TextField
            label="과목명"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={SUBJECT_NAME.MAX}
            placeholder="예: 자료구조"
            invalid={duplicated}
            autoFocus
          />
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-red-500">{duplicated ? '이미 등록된 과목이에요.' : ''}</span>
            <span className="text-slate-400">
              {trimmed.length}/{SUBJECT_NAME.MAX}
            </span>
          </div>
        </div>

        <TextField
          label="시험일"
          type="date"
          min={kstDateKey()}
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          className={examDate ? '' : 'text-ink/50'}
        />
      </div>

      <div className="mt-auto pt-10">
        <Button onClick={save} disabled={!valid}>
          등록하고 자료 올리기
        </Button>
      </div>
    </div>
  )
}
