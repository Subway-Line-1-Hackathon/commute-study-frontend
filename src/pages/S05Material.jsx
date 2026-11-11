import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import TextField from '../components/TextField'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { errorMessage } from '../lib/api'
import { ROUTES, SUBJECT_NAME } from '../lib/constants'
import { kstDateKey } from '../lib/date'
import { useMaterialStore } from '../store/useMaterialStore'

// S05 과목 등록: 과목명(필수)과 시험일(선택)을 입력하고, 등록 후 자료 업로드 화면으로 간다
export default function S05Material() {
  const navigate = useNavigate()
  const addSubject = useMaterialStore((s) => s.addSubject)

  const [name, setName] = useState('')
  const [examDate, setExamDate] = useState('')

  const trimmed = name.trim()
  const valid = trimmed.length > 0 && trimmed.length <= SUBJECT_NAME.MAX

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const save = async () => {
    if (!valid || saving) return
    setSaving(true)
    setSaveError('')
    try {
      const subject = await addSubject(trimmed, examDate)
      // replace: 업로드 화면에서 뒤로가기 했을 때 과목 등록 화면으로 돌아오지 않게
      navigate(`${ROUTES.MATERIAL_UPLOAD}?subjectId=${subject.id}`, { replace: true })
    } catch (err) {
      setSaveError(errorMessage(err, '과목을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.'))
      setSaving(false)
    }
  }

  const bottomCta = (
    <>
      {saveError && <p className="mb-2 text-center text-caption text-danger">{saveError}</p>}
      <Button onClick={save} disabled={!valid || saving}>
        등록하고 자료 올리기
      </Button>
    </>
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
          min={kstDateKey()} // 오늘 이전 날짜는 고를 수 없다
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          placeholder="연도-월-일"
          className="min-w-0 appearance-none [&::-webkit-date-and-time-value]:text-left"
        />
      </div>
    </Screen>
  )
}
