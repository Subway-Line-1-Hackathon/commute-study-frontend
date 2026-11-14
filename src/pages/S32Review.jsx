import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Tag from '../components/Tag'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { ROUTES } from '../lib/constants'
import { getOpenNotes, pickReviewNotes } from '../lib/review'
import { useAuthStore } from '../store/useAuthStore'
import { useSessionStore } from '../store/useSessionStore'

// S32 오답 복습 미리보기: 학습 시간 안에 풀 수 있는 오답을 골라 보여주고 '복습 출발'로 문제 설정(S30)에 간다
const PREVIEW_COUNT = 5

// 오답이 있는 단원과 단원별 오답 개수 -> [{ id, title, count }]
function getUnits(notes) {
  const units = []
  for (const n of notes) {
    const found = units.find((u) => u.id === n.unitId)
    if (found) {
      found.count += 1
    } else {
      units.push({ id: n.unitId, title: n.unitTitle || '단원', count: 1 })
    }
  }
  return units
}

function UnitPicker({ units, offIds, onToggleUnit, onToggleAll }) {
  const [open, setOpen] = useState(false)
  const selectedCount = units.filter((u) => !offIds.includes(u.id)).length
  const allSelected = offIds.length === 0

  return (
    <div className="mt-5 rounded-card border-2 border-line bg-surface">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="text-muted">{open ? '▾' : '▸'}</span>
          <span className="truncate text-body font-bold text-ink">복습 범위</span>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-caption text-muted">
            단원 {units.length}개 · {selectedCount}개 선택
          </span>
          <button
            type="button"
            onClick={onToggleAll}
            className="text-caption font-bold text-primary"
          >
            {allSelected ? '전체 해제' : '전체 선택'}
          </button>
        </div>
      </div>

      {open && (
        <ul className="space-y-2 px-3 pb-3">
          {units.map((u) => {
            const checked = !offIds.includes(u.id)
            return (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => onToggleUnit(u.id)}
                  aria-pressed={checked}
                  className={`flex w-full items-center gap-3 rounded-card border-2 bg-surface px-4 py-3.5 text-left ${
                    checked ? 'border-primary' : 'border-line'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[2.5px] border-primary text-caption text-white ${
                      checked ? 'bg-primary' : 'bg-surface'
                    }`}
                  >
                    {checked && '✓'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body font-bold text-ink">
                    {u.title}
                  </span>
                  <span className="shrink-0 text-caption text-muted">오답 {u.count}개</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function EmptyReview({ onHome }) {
  return (
    <Card className="mt-8 p-6 text-center">
      <p className="text-body font-bold text-ink">복습할 오답이 없어요</p>
      <p className="mt-2 text-caption text-muted">문제를 풀다가 틀린 문제가 여기에 모여요.</p>
      <Button onClick={onHome} className="mt-6">
        홈으로
      </Button>
    </Card>
  )
}

export default function S32Review() {
  const navigate = useNavigate()
  const commute = useAuthStore((s) => s.commute)
  const wrongNotes = useSessionStore((s) => s.wrongNotes)

  const [offIds, setOffIds] = useState([]) // 체크를 푼 단원 (비어 있으면 전체)

  const studyMin = commute?.studyMin ?? 20
  const open = getOpenNotes(wrongNotes) // 아직 못 맞힌 오답
  const units = getUnits(open)
  const targets = open.filter((n) => !offIds.includes(n.unitId))
  // 화면에 보여줄 예상 목록 (실제 출제는 세션을 만들 때 다시 정해진다)
  const { picked, usedSec } = pickReviewNotes(targets, studyMin * 60)
  const expectedMin = Math.max(1, Math.ceil(usedSec / 60))

  const toggleUnit = (id) => {
    if (offIds.includes(id)) {
      setOffIds(offIds.filter((x) => x !== id))
    } else {
      setOffIds([...offIds, id])
    }
  }

  const toggleAll = () => {
    if (offIds.length === 0) {
      setOffIds(units.map((u) => u.id))
    } else {
      setOffIds([])
    }
  }

  // 들어올 때 서버 오답노트로 갱신
  useEffect(() => {
    useSessionStore
      .getState()
      .syncWrongNotes()
      .catch(() => {})
  }, [])

  // 문제 설정 화면으로. 실제 문제는 세션을 만들 때 정해진다
  const handleStart = () => {
    let unitIds = []
    if (offIds.length > 0) {
      unitIds = units.filter((u) => !offIds.includes(u.id)).map((u) => u.id)
    }
    const draft = {
      source: 'wrongNotes',
      unitTitle: '오답 복습',
      categoryIds: unitIds,
      unitIds,
    }
    navigate(ROUTES.SETUP, { state: { draft } })
  }

  let bottomCta = null
  if (open.length > 0) {
    bottomCta = (
      <Button onClick={handleStart} disabled={targets.length === 0}>
        복습 출발
      </Button>
    )
  }

  return (
    <Screen back={ROUTES.HOME} bottomCta={bottomCta}>
      <ScreenTitle title="오답 복습" description="틀렸던 문제를 다시 풀어서 내 것으로 만들어요." />

      {open.length === 0 && <EmptyReview onHome={() => navigate(ROUTES.HOME)} />}

      {open.length > 0 && (
        <>
          <Card tone="primary" className="mt-5">
            <p className="text-caption text-muted">이번 복습</p>
            <p className="mt-1 text-title text-primary">{picked.length}문제</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Tag tone="white">예상 {expectedMin}분</Tag>
              <Tag tone="white">학습 가능 {studyMin}분</Tag>
            </div>
          </Card>

          <p className="mt-3 text-label font-normal text-muted">
            오답 대기 {targets.length}문제 중, 많이 틀린 문제부터 골랐어요.
          </p>

          {units.length > 1 && (
            <UnitPicker
              units={units}
              offIds={offIds}
              onToggleUnit={toggleUnit}
              onToggleAll={toggleAll}
            />
          )}

          <ul className="mt-4 space-y-3">
            {picked.slice(0, PREVIEW_COUNT).map((n) => (
              <li key={n.id} className="rounded-card border border-line bg-surface px-4 py-3.5">
                <p className="line-clamp-2 text-body font-bold text-ink">{n.question.prompt}</p>
                <p className="mt-0.5 truncate text-caption text-muted">
                  {[n.unitTitle, `${n.wrongCount}회 오답`].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
            {picked.length > PREVIEW_COUNT && (
              <li className="text-center text-caption text-muted">
                외 {picked.length - PREVIEW_COUNT}문제
              </li>
            )}
          </ul>
        </>
      )}
    </Screen>
  )
}
