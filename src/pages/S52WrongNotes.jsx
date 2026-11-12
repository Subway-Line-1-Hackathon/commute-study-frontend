import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AskAi from '../components/AskAi'
import BackButton from '../components/BackButton'
import SegmentedToggle from '../components/SegmentedToggle'
import { useExplanation } from '../hooks/useExplanation'
import { QUESTION_TYPE as T, ROUTES, WRONG_STATUS } from '../lib/constants'
import { WRONG_LIMIT, getOpenNotes, getResolvedNotes } from '../lib/review'
import { useSessionStore } from '../store/useSessionStore'

// S52 오답노트 탭: 미해결/해결 탭으로 나눠 틀린 문제를 보여주고, '정답 보기'로 정답·해설을 펼친다

const TYPE_LABEL = { [T.OX]: 'O/X', [T.MCQ]: '객관식', [T.SHORT]: '단답형' }

// 타임스탬프 -> "11. 10." 같은 월·일 표시
const formatDate = (ts) =>
  new Date(ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })

// 정답·해설. 서버 오답노트에는 정답이 없어서 해설을 조회한다
function AnswerDetail({ question }) {
  const { explanation, sourcePage, loaded } = useExplanation(question)
  return (
    <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
      {question.answer && <p className="font-semibold text-green-600">정답: {question.answer}</p>}
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        {explanation ?? (loaded ? '해설이 없어요.' : '해설을 불러오고 있어요…')}
      </p>
      {sourcePage != null && <p className="mt-1 text-xs text-slate-400">자료 {sourcePage}쪽</p>}
      <AskAi questionId={question.id} />
    </div>
  )
}

export default function S52WrongNotes() {
  const navigate = useNavigate()
  const wrongNotes = useSessionStore((s) => s.wrongNotes)
  const [tab, setTab] = useState(WRONG_STATUS.OPEN) // 지금 보는 탭
  const [shownIds, setShownIds] = useState([]) // '정답 보기'를 펼친 오답 id

  // 들어올 때 서버 오답노트로 갱신
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

  // 정답 펼치기/접기
  const toggleAnswer = (id) =>
    setShownIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    // 높이에서 하단 탭바(h-16 = 4rem)를 빼야 맨 아래 문구가 탭바에 가려지지 않는다
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col bg-slate-50 px-5 py-4">
      <BackButton to={ROUTES.HOME} />
      <h1 className="mt-2 text-2xl font-bold text-slate-900">오답노트</h1>

      <button
        onClick={() => navigate(ROUTES.REVIEW)}
        disabled={open.length === 0}
        className="mt-4 w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white disabled:bg-slate-300"
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
              {/* 펼쳤을 때만 그려서, 해설 조회도 이때 처음 일어난다 */}
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
