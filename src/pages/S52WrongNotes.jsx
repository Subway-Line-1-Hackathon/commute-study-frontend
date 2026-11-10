import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'
import SegmentedToggle from '../components/SegmentedToggle'
import { useExplanation } from '../hooks/useExplanation'
import { QUESTION_TYPE as T, ROUTES, WRONG_STATUS } from '../lib/constants'
import { WRONG_LIMIT, getOpenNotes, getResolvedNotes } from '../lib/review'
import { useSessionStore } from '../store/useSessionStore'

const TYPE_LABEL = { [T.OX]: 'O/X', [T.MCQ]: '객관식', [T.SHORT]: '단답형' }

const formatDate = (ts) =>
  new Date(ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })

// 정답·해설. 서버 오답노트에는 정답이 없어서 해설을 조회한다
function AnswerDetail({ question }) {
  const { explanation, loaded } = useExplanation(question)
  return (
    <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
      {question.answer && <p className="font-semibold text-green-600">정답: {question.answer}</p>}
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        {explanation ?? (loaded ? '해설이 없어요.' : '해설을 불러오고 있어요…')}
      </p>
    </div>
  )
}

export default function S52WrongNotes() {
  const navigate = useNavigate()
  const wrongNotes = useSessionStore((s) => s.wrongNotes)
  const [tab, setTab] = useState(WRONG_STATUS.OPEN)
  const [shownIds, setShownIds] = useState([])

  useEffect(() => {
    useSessionStore
      .getState()
      .syncWrongNotes()
      .catch(() => {})
  }, [])

  const open = getOpenNotes(wrongNotes)
  const resolved = getResolvedNotes(wrongNotes)
  const list = tab === WRONG_STATUS.OPEN ? open : resolved

  const tabOptions = [
    { value: WRONG_STATUS.OPEN, label: `미해결 ${open.length}` },
    { value: WRONG_STATUS.RESOLVED, label: `해결 ${resolved.length}` },
  ]

  const toggleAnswer = (id) =>
    setShownIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 px-5 py-4">
      <BackButton to={ROUTES.HOME} />
      <h1 className="mt-2 text-2xl font-bold text-slate-900">오답노트</h1>

      <button
        onClick={() => navigate(ROUTES.REVIEW)}
        disabled={open.length === 0}
        className="mt-4 w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white active:bg-blue-700 disabled:bg-slate-300"
      >
        미해결 오답 복습하기{open.length > 0 && ` (${open.length})`}
      </button>

      <div className="mt-4">
        <SegmentedToggle options={tabOptions} value={tab} onChange={setTab} />
      </div>

      <ul className="mt-4 flex-1 space-y-3">
        {list.length === 0 && (
          <li className="rounded-xl bg-white p-6 text-center text-sm text-slate-400">
            {tab === WRONG_STATUS.OPEN
              ? '미해결 오답이 없어요. 잘하고 있어요!'
              : '아직 해결한 오답이 없어요.'}
          </li>
        )}
        {list.map((n) => {
          const shown = shownIds.includes(n.id)
          return (
            <li key={n.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  {[TYPE_LABEL[n.question.type], n.unitTitle].filter(Boolean).join(' · ')}
                </span>
                <span>
                  {tab === WRONG_STATUS.OPEN
                    ? `${n.wrongCount}회 틀림 · ${formatDate(n.lastWrongAt)}`
                    : `해결 ${formatDate(n.resolvedAt)}`}
                </span>
              </div>
              <p className="mt-2 font-medium text-slate-900">{n.question.prompt}</p>

              <button
                onClick={() => toggleAnswer(n.id)}
                className="mt-3 text-sm font-medium text-blue-600"
              >
                {shown ? '정답 숨기기' : '정답 보기'}
              </button>
              {shown && <AnswerDetail question={n.question} />}
            </li>
          )
        })}
      </ul>

      <p className="mt-6 text-center text-xs text-slate-400">
        미해결 최대 {WRONG_LIMIT.OPEN}개, 해결 최대 {WRONG_LIMIT.RESOLVED}개까지 보여줘요. 정답률
        기록은 그대로 남아요.
      </p>
    </div>
  )
}
