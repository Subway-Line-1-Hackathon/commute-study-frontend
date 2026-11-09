export default function Card({ title, tone = 'default', className = '', children }) {
  let toneClass = 'border border-line bg-surface'
  if (tone === 'primary') {
    toneClass = 'bg-primary/10'
  }

  return (
    <section className={`rounded-xl p-4 ${toneClass} ${className}`}>
      {title && <h2 className="mb-2 text-caption font-bold text-ink">{title}</h2>}
      {children}
    </section>
  )
}
