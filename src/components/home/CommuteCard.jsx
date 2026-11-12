import { Link } from 'react-router-dom'
import pencil from '../../assets/icons/pencil.svg'
import Card from '../Card'
import Tag from '../Tag'
import { ROUTES } from '../../lib/constants'

export default function CommuteCard({ commute }) {
  const departure = commute?.departure
  const arrival = commute?.arrival
  const hasStations = Boolean(departure || arrival)

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-caption text-muted">오늘의 통학</h2>
        <Link to={ROUTES.SETTINGS} aria-label="통학 정보 수정" className="-m-1 p-1">
          <img src={pencil} alt="" className="h-4 w-4" />
        </Link>
      </div>

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
        <Link to={ROUTES.SETTINGS} className="block text-caption text-muted">
          출발역·도착역을 입력하면 노선이 보여요 ›
        </Link>
      )}

      <Tag className="mt-3">학습 가능 {commute?.studyMin ?? 0}분</Tag>
    </Card>
  )
}
