import Tag from './Tag'

export default function SourceTag({ page, className = '' }) {
  if (page == null) return null

  return (
    <Tag pill className={className}>
      자료 p.{page} 참고
    </Tag>
  )
}
