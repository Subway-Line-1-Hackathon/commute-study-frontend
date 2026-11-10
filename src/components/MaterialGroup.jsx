import UnitItem from './UnitItem'

export default function MaterialGroup({
  group,
  open,
  onToggleOpen,
  selectedIds,
  onToggleUnit,
  onToggleAll,
}) {
  const selectedCount = group.units.filter((unit) => selectedIds.includes(unit.id)).length
  const allSelected = selectedCount === group.units.length

  let arrow = '▸'
  if (open) {
    arrow = '▾'
  }

  return (
    <li className="rounded-xl border-2 border-line bg-surface">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="text-muted">{arrow}</span>
          <span className="min-w-0">
            <span className="block text-caption font-bold text-primary">{group.subjectName}</span>
            <span className="block truncate text-body font-bold text-ink">{group.fileName}</span>
          </span>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-caption text-muted">
            단원 {group.units.length}개{selectedCount > 0 && ` · ${selectedCount}개 선택`}
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
          {group.units.map((unit, index) => (
            <UnitItem
              key={unit.id}
              number={index + 1}
              unit={unit}
              showSubject={false}
              checkable
              checked={selectedIds.includes(unit.id)}
              onToggle={() => onToggleUnit(unit.id)}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
