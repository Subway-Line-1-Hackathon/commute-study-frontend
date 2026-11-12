// 둥근 박스 카드. title이 있으면 위에 작은 제목을 붙인다
// tone: default(흰 배경+테두리) | primary(연한 파란 배경, 강조용)
export default function Card({ title, tone = 'default', className = '', children }) {
  let toneClass = 'border border-line bg-surface'
  if (tone === 'primary') {
    toneClass = 'bg-primary/10'
  }

  return (
    <section className={`rounded-card p-4 ${toneClass} ${className}`}>
      {title && <h2 className="mb-2 text-caption text-muted">{title}</h2>}
      {children}
    </section>
  )
}
