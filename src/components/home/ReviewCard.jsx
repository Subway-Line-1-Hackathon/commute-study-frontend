import Card from '../Card'

export default function ReviewCard({ count, onClick }) {
  return (
    <Card>
      <button type="button" onClick={onClick} className="flex w-full items-center justify-between">
        <span className="text-body font-bold text-ink">복습할 문제 {count}개</span>
        <span className="text-caption font-bold text-primary">복습하기 ›</span>
      </button>
    </Card>
  )
}
