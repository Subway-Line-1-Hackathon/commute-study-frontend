import Tag from '../Tag'

export default function SetupTitle({ title, studyMin, modeTitle }) {
  return (
    <div>
      <h1 className="text-title text-ink">{title}</h1>
      <div className="mt-3 flex gap-2">
        {modeTitle && <Tag>{modeTitle}</Tag>}
        <Tag>학습 가능 {studyMin}분</Tag>
      </div>
    </div>
  )
}
