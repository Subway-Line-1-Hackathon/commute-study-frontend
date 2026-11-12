import { useSwipe } from '../../hooks/useSwipe'
import { stripMarkdown, stripPageRefs } from '../../lib/text'
import SourceTag from '../SourceTag'

const THRESHOLD = 80

function splitTerm(text) {
  const at = text.indexOf(':')
  if (at > 0 && at <= 30 && text.slice(at + 1).trim()) {
    const termText = text.slice(0, at)
    let body = text.slice(at + 1).trim()
    const termOpensBold = (termText.match(/\*\*/g) ?? []).length % 2 === 1
    if (termOpensBold) body = body.replace(/^\*\*\s*/, '').trim()

    return { term: stripMarkdown(termText).replace(/\*/g, '').trim(), body }
  }
  return { term: null, body: text }
}

function withBold(text) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-bold text-primary">
        {part.replace(/\*/g, '')}
      </strong>
    ) : (
      stripMarkdown(part).replace(/\*/g, '')
    ),
  )
}

function NoteBody({ text }) {
  const clean = stripPageRefs(text ?? '')
    .replace(/^\s*(?:[-*•]|#{1,6})\s*/, '')
    .trim()
  const { term, body } = splitTerm(clean)

  if (!term) {
    return (
      <p className="mt-4 flex-1 overflow-y-auto text-question leading-8 font-medium text-ink">
        {withBold(body)}
      </p>
    )
  }

  return (
    <div className="mt-4 flex-1 overflow-y-auto">
      <h3 className="text-title text-ink">{term}</h3>
      <p className="mt-3 text-body leading-7 text-ink">{withBold(body)}</p>
    </div>
  )
}

function cardStyle(offset, dx, dragging) {
  let transform = `translateY(${offset * 14}px) scale(${1 - offset * 0.05})`
  let opacity = offset > 2 ? 0 : 1 - offset * 0.15

  if (offset < 0) {
    transform = 'translateX(-130%) rotate(-12deg)'
    opacity = 0
  }
  if (offset === 0) {
    transform = `translateX(${dx}px) rotate(${dx / 20}deg)`
  }

  return {
    transform,
    opacity,
    zIndex: 10 - offset,
    transformOrigin: 'center bottom',
    touchAction: 'pan-y',
    transition: offset === 0 && dragging ? 'none' : 'transform 0.3s ease-out, opacity 0.3s',
  }
}

export default function NoteDeck({ script, index, playing, onChange }) {
  const { dx, dragging, handlers } = useSwipe({
    threshold: THRESHOLD,
    onLeft: () => index < script.length - 1 && onChange(index + 1),
    onRight: () => index > 0 && onChange(index - 1),
  })

  const visible = script
    .map((seg, i) => ({ seg, i }))
    .filter(({ i }) => i >= index - 1 && i <= index + 3)

  return (
    <div>
      <div className="relative h-[20.5rem]">
        {visible.map(({ seg, i }) => {
          const offset = i - index
          const top = offset === 0

          return (
            <article
              key={seg.id ?? i}
              {...(top ? handlers : {})}
              style={cardStyle(offset, dx, dragging)}
              className={`absolute inset-x-5 top-0 flex h-[18rem] flex-col rounded-2xl bg-surface p-6 select-none ${
                top
                  ? 'cursor-grab shadow-[0_10px_30px_-12px_rgba(36,87,245,0.35)]'
                  : 'border border-line'
              }`}
            >
              <SourceTag page={seg.sourcePage} className="self-end" />

              <NoteBody text={seg.text} />

              <div className="mt-3 flex items-center justify-end gap-1.5">
                {top && playing && (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                )}
                <span className="text-label font-normal text-muted tabular-nums">
                  {i + 1} / {script.length}
                </span>
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-2 flex justify-center gap-1.5">
        {script.map((seg, i) => (
          <span
            key={seg.id ?? i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? 'w-5 bg-primary' : 'w-1.5 bg-line-strong'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
