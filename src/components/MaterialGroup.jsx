import { useEffect, useRef, useState } from 'react'
import { isUnitPreparing } from '../lib/constants'
import UnitItem from './UnitItem'

// 단원 선택 화면의 접고 펼 수 있는 묶음 (자료 또는 과목 하나 = 묶음 하나)
// - group: { key, title, subjectName, units, isNew } (useMaterialStore의 getUnitGroups 결과)
// - open/onToggleOpen: 펼침 상태 / selectedIds, onToggleUnit, onToggleAll: 단원 체크 상태
// 상태는 부모(화면)가 가지고 있고, 이 컴포넌트는 보여주기만 한다
export default function MaterialGroup({
  group,
  open,
  onToggleOpen,
  selectedIds,
  onToggleUnit,
  onToggleAll,
  onRemove,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const menuButtonRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const closeOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  // 문제 준비 중인 단원은 전체 선택에서도 뺀다
  const selectable = group.units.filter((unit) => !isUnitPreparing(unit))
  const selectedCount = selectable.filter((unit) => selectedIds.includes(unit.id)).length
  const allSelected = selectable.length > 0 && selectedCount === selectable.length

  let arrow = '▸'
  if (open) {
    arrow = '▾'
  }

  return (
    <li className="rounded-card border-2 border-line bg-surface">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="text-muted">{arrow}</span>
          <span className="min-w-0">
            {group.subjectName && (
              <span className="block text-caption font-bold text-primary">{group.subjectName}</span>
            )}
            <span className="block truncate text-body font-bold text-ink">{group.title}</span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <span className="text-label font-normal text-muted">
            단원 {group.units.length}개{selectedCount > 0 && ` · ${selectedCount}개 선택`}
          </span>
          {onRemove && (
            <div
              ref={menuRef}
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
              }}
            >
              <button
                ref={menuButtonRef}
                type="button"
                aria-label={`${group.title} 자료 메뉴`}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <circle cx="5" cy="12" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="19" cy="12" r="1.8" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute top-full right-0 z-20 mt-1 w-36 rounded-card border border-line bg-surface p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onRemove()
                    }}
                    className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-caption text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
                    </svg>
                    자료 삭제
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-line/60 px-3 pb-3">
          <div className="flex items-center justify-between px-1 py-2">
            <span className="text-label font-normal text-muted">
              {selectedCount > 0 ? `${selectedCount}개 단원 선택됨` : '공부할 단원을 선택해 주세요'}
            </span>
            <button
              type="button"
              onClick={onToggleAll}
              disabled={selectable.length === 0}
              className="min-h-11 px-2 text-caption font-bold text-primary disabled:opacity-40"
            >
              {allSelected ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <ul className="space-y-2">
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
        </div>
      )}
    </li>
  )
}
