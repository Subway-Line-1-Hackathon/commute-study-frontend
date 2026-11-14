import { useEffect, useState } from 'react'
import Button from '../components/Button'
import ConfirmModal from '../components/ConfirmModal'
import TextField from '../components/TextField'
import XIcon from '../components/XIcon'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { ApiError, errorMessage } from '../lib/api'
import { ROUTES, SUBJECT_NAME } from '../lib/constants'
import { kstDateKey } from '../lib/date'
import { useMaterialStore } from '../store/useMaterialStore'

// S63 설정 > 과목 관리: 과목 이름 바꾸기와 지우기
export default function S63SubjectManage() {
  const subjects = useMaterialStore((s) => s.subjects)
  const [editingId, setEditingId] = useState(null)
  const [name, setName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    useMaterialStore
      .getState()
      .syncSubjects()
      .catch(() => {})
  }, [])

  const trimmed = name.trim()
  const valid = trimmed.length > 0 && trimmed.length <= SUBJECT_NAME.MAX

  const startEdit = (subject) => {
    setEditingId(subject.id)
    setName(subject.name)
    setExamDate(subject.examDate ?? '')
    setError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setError('')
  }

  const saveName = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError('')
    try {
      const original = subjects.find((s) => s.id === editingId)
      const changes = {}
      if (trimmed !== original?.name) changes.name = trimmed
      if (examDate !== (original?.examDate ?? '')) changes.examDate = examDate || null
      if (Object.keys(changes).length > 0) {
        await useMaterialStore.getState().updateSubject(editingId, changes)
      }
      setEditingId(null)
    } catch (err) {
      setError(errorMessage(err, '이름을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.'))
    } finally {
      setBusy(false)
    }
  }

  const removeTarget = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await useMaterialStore.getState().removeSubject(target.id)
    } catch (err) {
      let message = errorMessage(err, '과목을 지우지 못했어요. 잠시 후 다시 시도해 주세요.')
      if (err instanceof ApiError && err.status === 409) {
        message = '분석 중인 자료가 있어서 지금은 지울 수 없어요.'
      }
      setError(message)
    } finally {
      setTarget(null)
      setBusy(false)
    }
  }

  return (
    <Screen back={ROUTES.SETTINGS}>
      <ScreenTitle
        title="과목 관리"
        description="과목 이름을 바꾸거나 지울 수 있어요. 지워도 지금까지 푼 기록은 남아요."
      />

      {subjects.length === 0 && (
        <p className="mt-8 rounded-card border border-line bg-surface p-6 text-center text-caption text-muted">
          아직 과목이 없어요.
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {subjects.map((subject) =>
          editingId === subject.id ? (
            <li key={subject.id} className="rounded-card border border-primary bg-surface p-4">
              <TextField
                label="과목명"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                maxLength={SUBJECT_NAME.MAX}
                invalid={name !== '' && !valid}
                autoFocus
              />
              <p className="mt-2 text-right text-caption text-muted">
                {trimmed.length}/{SUBJECT_NAME.MAX}
              </p>
              <TextField
                label="시험일 (비우면 삭제)"
                type="date"
                value={examDate}
                min={kstDateKey()}
                onChange={(e) => setExamDate(e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" onClick={cancelEdit} className="flex-1">
                  취소
                </Button>
                <Button onClick={saveName} disabled={!valid || busy} className="flex-1">
                  저장
                </Button>
              </div>
            </li>
          ) : (
            <li
              key={subject.id}
              className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-bold text-ink">{subject.name}</p>
                {subject.examDate && (
                  <p className="mt-0.5 text-caption text-muted">시험일 {subject.examDate}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => startEdit(subject)}
                className="shrink-0 rounded-chip border border-line px-3 py-1.5 text-caption font-bold text-ink"
              >
                수정
              </button>
              <button
                type="button"
                onClick={() => {
                  setTarget(subject)
                  setError('')
                }}
                aria-label={`${subject.name} 지우기`}
                className="-m-1 shrink-0 p-1 text-muted"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </li>
          ),
        )}
      </ul>

      {error && <p className="mt-3 text-caption text-danger">{error}</p>}

      {target && (
        <ConfirmModal
          title={`'${target.name}' 과목을 지울까요?`}
          message="이 과목의 자료와 단원이 목록에서 사라져요. 지금까지 푼 기록은 남아요."
          confirmLabel="지우기"
          onConfirm={removeTarget}
          onCancel={() => setTarget(null)}
        />
      )}
    </Screen>
  )
}
