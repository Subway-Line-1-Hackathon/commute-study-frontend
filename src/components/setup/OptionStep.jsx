import { SOLVE_MODE_TYPES } from '../../lib/constants'
import Chip from '../Chip'
import SegmentedToggle from '../SegmentedToggle'
import { DIFFICULTY_OPTIONS, MODE_OPTIONS, TYPE_LABEL } from './options'
import SetupTitle from './SetupTitle'

export default function OptionStep({
  mode,
  studyMin,
  types,
  difficulty,
  onToggleType,
  onChangeDifficulty,
}) {
  const modeTitle = MODE_OPTIONS.find((o) => o.value === mode).title
  const typeOptions = SOLVE_MODE_TYPES[mode].map((value) => ({
    value,
    label: TYPE_LABEL[mode][value],
  }))

  return (
    <>
      <SetupTitle
        title="문제 양식과 난이도를 설정해주세요"
        studyMin={studyMin}
        modeTitle={modeTitle}
      />

      <section className="mt-5">
        <h2 className="mb-1 text-body font-bold text-ink">문제 양식</h2>
        <p className="mb-3 text-label font-normal text-muted">복수 선택 가능</p>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={types.includes(opt.value)}
              onClick={() => onToggleType(opt.value)}
            />
          ))}
        </div>
        {types.length === 0 && (
          <p className="mt-2 text-caption text-danger">양식을 한 개 이상 선택해 주세요.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-body font-bold text-ink">난이도</h2>
        <SegmentedToggle
          options={DIFFICULTY_OPTIONS}
          value={difficulty}
          onChange={onChangeDifficulty}
        />
      </section>
    </>
  )
}
