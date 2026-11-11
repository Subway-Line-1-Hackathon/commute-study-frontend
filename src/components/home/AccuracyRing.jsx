const RADIUS = 24
const LENGTH = 2 * Math.PI * RADIUS

export default function AccuracyRing({ percent }) {
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
        <circle cx="28" cy="28" r={RADIUS} fill="none" strokeWidth="6" className="stroke-surface" />
        <circle
          cx="28"
          cy="28"
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={LENGTH}
          strokeDashoffset={LENGTH * (1 - percent / 100)}
          className="stroke-primary"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-caption font-bold text-ink">
        {percent}%
      </span>
    </div>
  )
}
