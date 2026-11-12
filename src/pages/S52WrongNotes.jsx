import { useEffect, useState } from 'react'
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

export default function S52WrongNotes() {
  const navigate = useNavigate()
  const wrongNotes = useSessionStore((s) => s.wrongNotes)
  const [filter, setFilter] = useState(FILTER.ALL)
  const [shownIds, setShownIds] = useState([]) // 정답·해설을 펼친 오답 id

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

      <ul className="mt-4 space-y-3">
        {list.length === 0 && (
          <li className="rounded-card border border-line bg-surface p-6 text-center text-caption text-muted">
            {emptyText}
          </li>
        )}
        {list.map((note) => (
          <NoteItem
            key={note.id}
            note={note}
            shown={shownIds.includes(note.id)}
            onToggle={() => toggle(note.id)}
          />
        ))}
      </ul>

      <p className="mt-4 text-label font-normal text-muted">
        미해결은 최대 {WRONG_LIMIT.OPEN}개, 해결은 최대 {WRONG_LIMIT.RESOLVED}개까지 보관돼요.
      </p>
    </Screen>
  )
}
