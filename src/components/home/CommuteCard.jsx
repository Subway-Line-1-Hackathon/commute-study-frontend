import { Link } from 'react-router-dom'
import Card from '../Card'
import { ROUTES } from '../../lib/constants'

export default function CommuteCard({ commute }) {
  const departure = commute?.departure
  const arrival = commute?.arrival
  const hasStations = Boolean(departure || arrival)

  return (
    <Card title="오늘의 통학">
      {hasStations ? (
        <div className="mt-1">
          <div className="flex items-center">
            <span className="h-3 w-3 rounded-full bg-primary" />
            <span className="h-1 flex-1 bg-primary" />
            <span className="h-3 w-3 rounded-full border-2 border-primary bg-surface" />
          </div>
          <div className="mt-2 flex justify-between text-body font-bold text-ink">
            <span>{departure || '출발역'}</span>
            <span>{arrival || '도착역'}</span>
          </div>
        </div>
      ) : (
        <Link to={ROUTES.SETTINGS} className="block text-caption text-primary">
          출발역·도착역을 입력하면 노선이 보여요 ›
        </Link>
      )}

      <span className="mt-3 inline-block rounded-lg bg-primary/10 px-2.5 py-1 text-caption font-bold text-primary">
        학습 가능 {commute?.studyMin ?? 0}분
      </span>
    </Card>
  )
}
