import Card from '../Card'

// 리포트·결과 화면의 "AI 피드백" 강조 카드
export default function FeedbackCard({ message, className = '' }) {
  return (
    <Card title="AI 피드백" tone="primary" className={className}>
      <p className="text-caption text-ink">{message}</p>
    </Card>
  )
}
