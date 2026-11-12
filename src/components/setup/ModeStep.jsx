import ModeCard from './ModeCard'
import { MODE_OPTIONS } from './options'
import SetupTitle from './SetupTitle'

export default function ModeStep({ studyMin, onSelect }) {
  return (
    <>
      <SetupTitle title="어떻게 풀까요?" studyMin={studyMin} />

      <div className="mt-5 space-y-3">
        {MODE_OPTIONS.map((option) => (
          <ModeCard key={option.value} option={option} onClick={() => onSelect(option.value)} />
        ))}
      </div>
    </>
  )
}
