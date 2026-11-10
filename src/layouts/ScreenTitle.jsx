export default function ScreenTitle({ title, description }) {
  return (
    <div>
      <h1 className="text-title whitespace-pre-line text-ink">{title}</h1>

      {description && <p className="mt-2 text-caption text-muted">{description}</p>}
    </div>
  )
}
