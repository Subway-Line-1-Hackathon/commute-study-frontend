import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AskAi from '../components/AskAi'
import Button from '../components/Button'
import Chip from '../components/Chip'
import Tag from '../components/Tag'
import { useExplanation } from '../hooks/useExplanation'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { ROUTES, WRONG_STATUS } from '../lib/constants'
import { choiceLabel } from '../lib/question'
import { WRONG_LIMIT, getOpenNotes, getResolvedNotes } from '../lib/review'
import { useSessionStore } from '../store/useSessionStore'
import { useMaterialStore } from '../store/useMaterialStore'

// S52 오답노트 탭: 전체/오답 대기(미해결)/오답 완료(해결)로 나눠 틀린 문제를 보여주고, 누르면 정답·해설을 펼친다

const FILTER = { ALL: 'ALL', OPEN: WRONG_STATUS.OPEN, RESOLVED: WRONG_STATUS.RESOLVED }

const FILTER_OPTIONS = [
  { value: FILTER.ALL, label: '전체' },
  { value: FILTER.OPEN, label: '오답 대기' },
  { value: FILTER.RESOLVED, label: '오답 완료' },
]

// 정답·해설. 정답은 오답노트에 같이 오고, 해설은 따로 조회한다
function AnswerDetail({ question, lastAnswer }) {
  const { explanation, sourcePage, loaded } = useExplanation(question)
  const mine = choiceLabel(question, lastAnswer)
  const answer = choiceLabel(question, question.answer)

  return (
    <div className="space-y-5 border-t border-line px-4 pt-4 pb-4">
      {(mine || answer) && (
        <div className="space-y-2">
          {mine && <AnswerRow label="내 답" tone="danger" text={mine} />}
          {answer && <AnswerRow label="정답" tone="success" text={answer} />}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-caption font-bold text-ink">해설</p>
          {sourcePage != null && (
            <span className="text-label font-normal text-muted">자료 p.{sourcePage}</span>
          )}
        </div>
        <p className="mt-1.5 text-caption leading-relaxed text-ink">
          {explanation ?? (loaded ? '해설이 없어요.' : '해설을 불러오고 있어요…')}
        </p>
      </div>

      <AskAi questionId={question.id} flat />
    </div>
  )
}

function AnswerRow({ label, tone, text }) {
  return (
    <div className="flex items-start gap-2">
      <Tag tone={tone} size="sm" className="mt-0.5 w-11 shrink-0 text-center">
        {label}
      </Tag>
      <p className="min-w-0 text-caption leading-relaxed text-ink">{text}</p>
    </div>
  )
}

function NoteItem({ note, shown, onToggle }) {
  const resolved = note.status === WRONG_STATUS.RESOLVED
  const meta = [note.unitTitle, `${note.wrongCount}회 오답`].filter(Boolean).join(' · ')

  return (
    <li className="overflow-hidden rounded-card border border-line bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={shown}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className={`text-body font-bold text-ink ${shown ? '' : 'truncate'}`}>
            {note.question.prompt}
          </p>
          <p className="mt-0.5 truncate text-caption text-muted">{meta}</p>
        </div>
        <Tag tone={resolved ? 'success' : 'danger'} size="sm" pill className="shrink-0">
          {resolved ? '오답 완료' : '오답 대기'}
        </Tag>
      </button>

      {shown && <AnswerDetail question={note.question} lastAnswer={note.lastAnswer} />}
    </li>
  )
}

function UnitGroup({ group, expanded, onToggle, shownIds, onToggleNote }) {
  const contentId = useId()
  const pending = group.notes.filter((note) => note.status === WRONG_STATUS.OPEN).length

  return (
    <li className="overflow-hidden rounded-card border border-line bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="relative flex w-full flex-col gap-0.5 py-2.5 pr-24 pl-3.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        {group.subjectName && (
          <p className="max-w-full truncate text-label font-normal text-muted">
            {group.subjectName}
          </p>
        )}
        <div className="flex w-full items-center gap-2">
          <h2
            className="min-w-0 flex-1 truncate text-caption leading-snug font-bold text-ink"
            title={group.title}
          >
            {group.title}
          </h2>
          <span className="absolute top-1/2 right-3.5 flex -translate-y-1/2 items-center gap-2">
            <Tag
              tone="neutral"
              size="sm"
              pill
              className="shrink-0 px-2.5 py-1 text-[13px] font-bold text-ink"
            >
              {group.notes.length}개
            </Tag>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={`shrink-0 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </div>
      </button>
      <div id={contentId} hidden={!expanded}>
        {expanded && (
          <div className="border-t border-line bg-background/50 p-2.5">
            <p className="mb-2 px-1 text-label font-normal text-muted">
              오답 대기 {pending}개 · 오답 완료 {group.notes.length - pending}개
            </p>
            <ul className="space-y-2">
              {group.notes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  shown={shownIds.includes(note.id)}
                  onToggle={() => onToggleNote(note.id)}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </li>
  )
}

export default function S52WrongNotes() {
  const navigate = useNavigate()
  const wrongNotes = useSessionStore((s) => s.wrongNotes)
  const subjects = useMaterialStore((s) => s.subjects)
  const [filter, setFilter] = useState(FILTER.ALL)
  const [shownIds, setShownIds] = useState([]) // 정답·해설을 펼친 오답 id
  const [expandedUnits, setExpandedUnits] = useState([])

  // 들어올 때 서버 오답노트로 갱신
  useEffect(() => {
    useSessionStore
      .getState()
      .syncWrongNotes()
      .catch(() => {})
  }, [])

  const open = getOpenNotes(wrongNotes)
  const resolved = getResolvedNotes(wrongNotes)

  let list = [...open, ...resolved]
  if (filter === FILTER.OPEN) list = open
  if (filter === FILTER.RESOLVED) list = resolved

  const byUnit = new Map()
  for (const note of list) {
    const key = JSON.stringify([note.subjectId ?? null, note.unitId ?? note.unitTitle ?? null])
    if (!byUnit.has(key)) {
      byUnit.set(key, {
        key,
        title: note.unitTitle || '단원 미지정',
        subjectName:
          subjects.find((subject) => String(subject.id) === String(note.subjectId))?.name ?? '',
        notes: [],
      })
    }
    byUnit.get(key).notes.push(note)
  }
  const groups = [...byUnit.values()]
  const allExpanded =
    groups.length > 0 && groups.every((group) => expandedUnits.includes(group.key))

  const toggle = (id) => {
    if (shownIds.includes(id)) {
      setShownIds(shownIds.filter((x) => x !== id))
    } else {
      setShownIds([...shownIds, id])
    }
  }

  let emptyText = '아직 틀린 문제가 없어요.'
  if (filter === FILTER.OPEN) emptyText = '오답 대기 중인 문제가 없어요. 잘하고 있어요!'
  if (filter === FILTER.RESOLVED) emptyText = '아직 오답 완료한 문제가 없어요.'

  const bottomCta = (
    <Button onClick={() => navigate(ROUTES.REVIEW)} disabled={open.length === 0}>
      틀린 문제 다시 풀기
    </Button>
  )

  return (
    <Screen withTabBar bottomCta={bottomCta}>
      <ScreenTitle title={`틀린 문제 ${open.length + resolved.length}개`} />

      <div className="mt-5 flex gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={filter === opt.value}
            onClick={() => setFilter(opt.value)}
          />
        ))}
      </div>

      {groups.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-caption text-muted">
            단원 {groups.length}개 · 문제 {list.length}개
          </p>
          <button
            type="button"
            onClick={() => setExpandedUnits(allExpanded ? [] : groups.map((group) => group.key))}
            className="min-h-11 px-2 text-caption font-bold text-primary"
          >
            {allExpanded ? '모두 접기' : '모두 펼치기'}
          </button>
        </div>
      )}

      <ul className="mt-2 space-y-2">
        {list.length === 0 && (
          <li className="rounded-card border border-line bg-surface p-6 text-center text-caption text-muted">
            {emptyText}
          </li>
        )}
        {groups.map((group) => (
          <UnitGroup
            key={group.key}
            group={group}
            expanded={expandedUnits.includes(group.key)}
            onToggle={() =>
              setExpandedUnits((ids) =>
                ids.includes(group.key)
                  ? ids.filter((id) => id !== group.key)
                  : [...ids, group.key],
              )
            }
            shownIds={shownIds}
            onToggleNote={toggle}
          />
        ))}
      </ul>

      <p className="mt-4 text-label font-normal text-muted">
        미해결은 최대 {WRONG_LIMIT.OPEN}개, 해결은 최대 {WRONG_LIMIT.RESOLVED}개까지 보관돼요.
      </p>
    </Screen>
  )
}
