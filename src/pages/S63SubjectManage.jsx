import { useEffect } from 'react'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { ROUTES } from '../lib/constants'
import { useMaterialStore } from '../store/useMaterialStore'

// S63 설정 > 과목 목록: 등록한 과목과 시험일 조회
export default function S63SubjectManage() {
  const subjects = useMaterialStore((s) => s.subjects)

  useEffect(() => {
    useMaterialStore
      .getState()
      .syncSubjects()
      .catch(() => {})
  }, [])

  return (
    <Screen back={ROUTES.SETTINGS}>
      <ScreenTitle title="과목 목록" description="등록한 과목과 시험일을 확인할 수 있어요." />

      {subjects.length === 0 && (
        <p className="mt-8 rounded-card border border-line bg-surface p-6 text-center text-caption text-muted">
          아직 과목이 없어요.
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {subjects.map((subject) => (
          <li key={subject.id} className="rounded-card border border-line bg-surface px-4 py-3.5">
            <p className="text-body font-bold break-words text-ink">{subject.name}</p>
            <p className="mt-0.5 text-caption text-muted">
              {subject.examDate ? `시험일 ${subject.examDate}` : '시험일 미설정'}
            </p>
          </li>
        ))}
      </ul>
    </Screen>
  )
}
