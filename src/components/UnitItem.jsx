import { isUnitPreparing } from '../lib/constants'

// 단원 목록의 한 줄
// - checkable이면 체크박스가 있는 버튼(단원 선택 화면), 아니면 보기 전용
// - showSubject면 제목 앞에 [과목명]을 붙인다
// 아래 회색 줄(meta)에는 쪽수, 요약본 여부, 문제 준비 중 안내를 ' · '로 이어서 보여준다
export default function UnitItem({
  number,
  unit,
  showSubject = true,
  checkable = false,
  checked = false,
  onToggle,
}) {
  const meta = []

  if (unit.pages) {
    meta.push(`${unit.pages}쪽`)
  }

  if (unit.summary) {
    meta.push('요약본 있음')
  }

  // 문제를 만드는 중인 단원은 고를 수 없다
  const preparing = isUnitPreparing(unit)
  if (preparing) {
    meta.push('문제 준비 중이에요. 잠시 후 고를 수 있어요')
  }

  const content = (
    <div className="min-w-0">
      <p className="truncate text-body font-bold text-ink">
        {showSubject && unit.subjectName && (
          <span className="text-primary">[{unit.subjectName}] </span>
        )}
        {number}. {unit.title}
      </p>

      {meta.length > 0 && <p className="mt-0.5 text-caption text-muted">{meta.join(' · ')}</p>}
    </div>
  )

  if (!checkable) {
    return <li className="rounded-xl border-2 border-line bg-surface px-4 py-3.5">{content}</li>
  }

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        disabled={preparing}
        aria-pressed={checked}
        className={`flex w-full items-center gap-3 rounded-xl border-2 bg-surface px-4 py-3.5 text-left disabled:opacity-50 ${
          checked ? 'border-primary' : 'border-line'
        }`}
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[2.5px] text-caption text-white ${
            checked ? 'border-primary bg-primary' : 'border-primary bg-surface'
          }`}
        >
          {checked && '✓'}
        </span>

        {content}
      </button>
    </li>
  )
}
