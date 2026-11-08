import Card from '../Card'

export default function FeedbackCard({ message, className = '' }) {
  return (
    <Card title="AI 피드백" tone="primary" className={className}>
      <p className="text-caption text-ink">{message}</p>
    </Card>
  )
}
