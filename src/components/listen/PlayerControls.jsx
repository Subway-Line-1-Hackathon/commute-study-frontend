function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <rect x="6" y="4" width="4" height="16" rx="1.5" />
      <rect x="14" y="4" width="4" height="16" rx="1.5" />
    </svg>
  )
}

function SkipIcon({ flip = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${flip ? 'rotate-180' : ''}`}
      fill="currentColor"
      aria-hidden
    >
      <path d="M5 5.5v13a1 1 0 0 0 1.55.83L15 13.7V18a1 1 0 0 0 2 0V6a1 1 0 0 0-2 0v4.3L6.55 4.67A1 1 0 0 0 5 5.5z" />
    </svg>
  )
}

const SIDE = 'flex h-10 w-10 items-center justify-center rounded-full text-ink disabled:opacity-25'

export default function PlayerControls({ playing, index, total, onPrev, onToggle, onNext }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={onPrev}
        disabled={index === 0}
        aria-label="이전 노트"
        className={SIDE}
      >
        <SkipIcon flip />
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? '일시정지' : '재생'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white"
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={index >= total - 1}
        aria-label="다음 노트"
        className={SIDE}
      >
        <SkipIcon />
      </button>
    </div>
  )
}
