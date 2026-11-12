import Card from '../Card'

export default function ReviewCard({ count, onClick }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-caption text-muted">오답 노트</h2>
        <button type="button" onClick={onClick} className="text-caption font-bold text-primary">
          전체 보기 ›
        </button>
      </div>

      <p className="mt-2 text-body font-bold text-ink">복습할 문제 {count}개</p>
    </Card>
  )
}
