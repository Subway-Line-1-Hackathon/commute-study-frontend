export default function ModeCard({ option, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border-2 border-line bg-surface p-5 text-left"
    >
      <div className="flex items-center gap-3">
        <img src={option.icon} alt="" className="h-11 w-11 shrink-0" />
        <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-question text-ink">{option.title}</span>
          <div className="ml-auto flex gap-1">
            {option.types.map((type) => (
              <span
                key={type}
                className="rounded-full bg-background px-2 py-0.5 text-label text-muted"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-caption text-muted">{option.desc}</p>
    </button>
  )
}
