import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import TextField from '../components/TextField'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { ROUTES, SUBJECT_NAME } from '../lib/constants'
import { kstDateKey } from '../lib/date'
import { useMaterialStore } from '../store/useMaterialStore'

export default function S05Material() {
  const navigate = useNavigate()
  const addSubject = useMaterialStore((s) => s.addSubject)

  const [name, setName] = useState('')
  const [examDate, setExamDate] = useState('')

  const trimmed = name.trim()
  const valid = trimmed.length > 0 && trimmed.length <= SUBJECT_NAME.MAX

  const save = () => {
    if (!valid) return
    const subject = addSubject(trimmed, examDate)
    navigate(`${ROUTES.MATERIAL_UPLOAD}?subjectId=${subject.id}`, { replace: true })
  }

  const bottomCta = (
    <Button onClick={save} disabled={!valid}>
      등록하고 자료 올리기
    </Button>
  )

  return (
    <Screen back bottomCta={bottomCta}>
      <ScreenTitle title="공부할 과목을 등록해요" />
      <p className="mt-2 text-caption text-muted">
        <span className="text-danger">*</span> 표시는 필수 입력
      </p>

      <div className="mt-8 space-y-4">
        <div>
          <TextField
            label="과목명"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={SUBJECT_NAME.MAX}
            placeholder="예: 자료구조"
            autoFocus
          />
          <p className="mt-2 text-right text-caption text-muted">
            {trimmed.length}/{SUBJECT_NAME.MAX}
          </p>
        </div>

        <TextField
          label="시험일"
          type="date"
          min={kstDateKey()}
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          placeholder="연도-월-일"
          className="min-w-0 appearance-none [&::-webkit-date-and-time-value]:text-left"
        />
      </div>
    </Screen>
  )
}
