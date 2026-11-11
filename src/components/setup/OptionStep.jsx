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
      <SetupTitle title={`${modeTitle}, 어떤 문제로 풀까요?`} studyMin={studyMin} />

      <section className="mt-5">
        <h2 className="mb-1 font-semibold text-slate-800">문제 양식</h2>
        <p className="mb-3 text-xs text-slate-400">여러 개를 골라도 돼요.</p>
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
          <p className="mt-2 text-sm text-red-500">양식을 한 개 이상 선택해 주세요.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-slate-800">난이도</h2>
        <SegmentedToggle
          options={DIFFICULTY_OPTIONS}
          value={difficulty}
          onChange={onChangeDifficulty}
        />
      </section>

      <p className="mt-8 text-xs text-slate-500">
        문제 수는 학습 시간 {studyMin}분에 맞춰 정해져요.
      </p>
    </>
  )
}
