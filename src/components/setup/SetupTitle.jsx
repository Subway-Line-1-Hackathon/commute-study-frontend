const TAG = 'rounded-lg bg-primary/10 px-2.5 py-1 text-caption font-bold text-primary'

export default function SetupTitle({ title, studyMin, modeTitle }) {
  return (
    <div>
      <h1 className="text-title text-ink">{title}</h1>
      <div className="mt-3 flex gap-2">
        {modeTitle && <span className={TAG}>{modeTitle}</span>}
        <span className={TAG}>학습 가능 {studyMin}분</span>
      </div>
    </div>
  )
}
