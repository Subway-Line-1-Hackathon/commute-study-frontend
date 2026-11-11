export default function SetupTitle({ title, studyMin }) {
  return (
    <div>
      <h1 className="text-title text-ink">{title}</h1>
      <span className="mt-3 inline-block rounded-lg bg-primary/10 px-2.5 py-1 text-caption font-bold text-primary">
        학습 가능 {studyMin}분
      </span>
    </div>
  )
}
