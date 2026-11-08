export default function UnitItem({ number, unit, checkable = false, checked = false, onToggle }) {
  const meta = []

  if (unit.pages) {
    meta.push(`${unit.pages}쪽`)
  }

  if (unit.summary) {
    meta.push('요약본 있음')
  }

  const content = (
    <div className="min-w-0">
      <p className="truncate text-body font-bold text-ink">
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
        aria-pressed={checked}
        className={`flex w-full items-center gap-3 rounded-xl border-2 bg-surface px-4 py-3.5 text-left ${
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
